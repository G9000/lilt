//! Acceptance-scenario tests (PRD §14) against a temporary data root, using the real
//! Python analysis helper and fixed fixture audio from analysis/tests/fixtures.

use crate::app::{App, Config, Shared};
use crate::model::*;
use crate::recordings::{self, ChunkOutcome, FinalizeReq, NewSession, NewTake, SessionUpdate, ComfortInput, TakeUpdate, UploadError};
use crate::{coach, analysis::compare, analysis, practice::progress, store, coach::validate};
use std::collections::BTreeMap;
use std::path::PathBuf;

fn root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).parent().unwrap().to_path_buf()
}

fn fixture(name: &str) -> Vec<u8> {
    std::fs::read(root().join("analysis/tests/fixtures").join(name)).unwrap()
}

fn config(data: &std::path::Path) -> Config {
    Config {
        data_dir: data.to_path_buf(),
        content_dir: root().join("content"),
        web_dir: root().join("web/dist"),
        bind: "127.0.0.1:0".into(),
        python: root().join("analysis/.venv/bin/python").to_string_lossy().into(),
        analysis_dir: root().join("analysis"),
        mcp_token: None,
    }
}

fn app() -> (tempfile::TempDir, Shared) {
    let dir = tempfile::tempdir().unwrap();
    let a = App::open(config(dir.path())).unwrap();
    (dir, a)
}

fn session(app: &App) -> Session {
    recordings::create_session(app, NewSession { kind: SessionKind::Full }).unwrap()
}

struct T<'a> {
    role: TakeRole,
    prompt: &'a str,
    exercise: Option<&'a str>,
    device: &'a str,
    retry_of: Option<String>,
}

impl Default for T<'_> {
    fn default() -> Self {
        T { role: TakeRole::Exercise, prompt: "nhsfife.forward-hum.m-words", exercise: Some("nhsfife.forward-hum"), device: "Mic A", retry_of: None }
    }
}

fn new_take(app: &App, sid: &str, t: T, mime: &str) -> String {
    let id = uuid::Uuid::new_v4().to_string();
    recordings::create_take(app, NewTake {
        take_id: id.clone(),
        session_id: sid.into(),
        role: t.role,
        phase: Phase::None,
        prompt_id: t.prompt.into(),
        prompt_text: t.prompt.into(),
        exercise_id: t.exercise.map(String::from),
        exercise_version: t.exercise.map(|_| 1),
        cue_id: None,
        retry_of: t.retry_of,
        triggered_by_review: None,
        triggered_by_pointer: None,
        mime: mime.into(),
        capture: serde_json::json!({"settings": {"sampleRate": 48000}}),
        device_label: Some(t.device.into()),
    }).unwrap();
    id
}

/// Upload bytes in chunks, finalize, and run analysis synchronously.
fn upload(app: &App, sid: &str, t: T, file: &str) -> Take {
    let mime = if file.ends_with(".webm") { "audio/webm;codecs=opus" } else if file.ends_with(".wav") { "audio/wav" } else { "audio/aiff" };
    let id = new_take(app, sid, t, mime);
    let bytes = fixture(file);
    let chunks: Vec<&[u8]> = bytes.chunks(8192).collect();
    for (i, c) in chunks.iter().enumerate() {
        recordings::put_chunk(app, &id, i as u32, c, Some(&store::sha256_hex(c))).unwrap();
    }
    recordings::finalize(app, &id, FinalizeReq { chunk_count: chunks.len() as u32, interrupted: false }).unwrap();
    analysis::run_pending(app);
    app.take(&id).unwrap()
}

fn report(app: &App, tid: &str, q: &str, a: &str) {
    let mut m = BTreeMap::new();
    m.insert(q.to_string(), a.to_string());
    recordings::update_take(app, tid, TakeUpdate { favourite: None, note: None, self_report: Some(m), read_along: None }).unwrap();
}

fn comfort(app: &App, sid: &str, c: Comfort, effort: u8, hoarse: bool) {
    recordings::update_session(app, sid, SessionUpdate {
        comfort: Some(ComfortInput { comfort: c, effort: Some(effort), hoarseness: hoarse, likes_sound: None, note: None }),
        notes: None,
        complete: Some(true),
    }).unwrap();
}

// ---------- persistence ----------

#[test]
fn chunk_upload_is_idempotent_and_rejects_conflicts() {
    let (_d, app) = app();
    let s = session(&app);
    let id = new_take(&app, &s.id, T::default(), "audio/webm");
    let c = b"hello chunk".to_vec();
    assert!(matches!(recordings::put_chunk(&app, &id, 0, &c, None).unwrap(), ChunkOutcome::Stored));
    assert!(matches!(recordings::put_chunk(&app, &id, 0, &c, None).unwrap(), ChunkOutcome::AlreadyStored));
    assert!(matches!(recordings::put_chunk(&app, &id, 0, b"different", None), Err(UploadError::Conflict(0))));
    assert!(matches!(recordings::put_chunk(&app, &id, 1, &c, Some("00")), Err(UploadError::BadChecksum(1))));
    // Same take id again returns the same record rather than a duplicate.
    let again = recordings::create_take(&app, NewTake {
        take_id: id.clone(), session_id: s.id.clone(), role: TakeRole::Exercise, phase: Phase::None,
        prompt_id: "x".into(), prompt_text: "x".into(), exercise_id: None, exercise_version: None, cue_id: None,
        retry_of: None, triggered_by_review: None, triggered_by_pointer: None, mime: "audio/webm".into(),
        capture: serde_json::Value::Null, device_label: None,
    }).unwrap();
    assert_eq!(again.prompt_id, "nhsfife.forward-hum.m-words");
}

#[test]
fn finalize_twice_and_missing_tail_are_labelled() {
    let (_d, app) = app();
    let s = session(&app);
    let id = new_take(&app, &s.id, T::default(), "audio/webm;codecs=opus");
    let bytes = fixture("harmonic_240.webm");
    let chunks: Vec<&[u8]> = bytes.chunks(4000).collect();
    for (i, c) in chunks.iter().enumerate().take(chunks.len() - 2) {
        recordings::put_chunk(&app, &id, i as u32, c, None).unwrap();
    }
    let t1 = recordings::finalize(&app, &id, FinalizeReq { chunk_count: chunks.len() as u32, interrupted: false }).unwrap();
    let t2 = recordings::finalize(&app, &id, FinalizeReq { chunk_count: chunks.len() as u32, interrupted: false }).unwrap();
    assert_eq!(t1.completeness, Some(Completeness::MissingTail));
    assert_eq!(t1.original.as_ref().unwrap().sha256, t2.original.as_ref().unwrap().sha256);
    assert_eq!(analysis::jobs(&app).len(), 1, "duplicate finalisation must not queue a second job");
    analysis::run_pending(&app);
    let t = app.take(&id).unwrap();
    assert_eq!(t.status, TakeStatus::ReviewReady, "the confirmed prefix should still decode");
}

#[test]
fn interrupted_take_is_recovered_on_restart_and_hashes_survive_reopen() {
    let dir = tempfile::tempdir().unwrap();
    let (sid, id, bytes) = {
        let app = App::open(config(dir.path())).unwrap();
        let s = session(&app);
        let id = new_take(&app, &s.id, T::default(), "audio/webm;codecs=opus");
        let bytes = fixture("mixed_voiced_unvoiced.webm");
        for (i, c) in bytes.chunks(4000).enumerate().take(3) {
            recordings::put_chunk(&app, &id, i as u32, c, None).unwrap();
        }
        (s.id, id, bytes)
    }; // "crash": no finalize
    let app = App::open(config(dir.path())).unwrap();
    assert_eq!(recordings::reconcile_interrupted(&app).unwrap(), 1);
    let t = app.take(&id).unwrap();
    assert_eq!(t.completeness, Some(Completeness::Interrupted));
    let orig = std::fs::read(app.paths.take_dir(&sid, &id).join(&t.original.as_ref().unwrap().file)).unwrap();
    assert_eq!(orig, bytes[..orig.len()].to_vec(), "recovered original is the confirmed prefix");
    // Container recreation: reopening the same data root yields the same hash.
    let sha = t.original.unwrap().sha256;
    let app2 = App::open(config(dir.path())).unwrap();
    assert_eq!(app2.take(&id).unwrap().original.unwrap().sha256, sha);
    assert_eq!(store::sha256_file(&app2.paths.take_dir(&sid, &id).join("original.webm")).unwrap(), sha);
}

#[test]
fn analysis_crash_keeps_audio_and_restart_resumes() {
    let dir = tempfile::tempdir().unwrap();
    let mut cfg = config(dir.path());
    cfg.python = "/nonexistent/python".into();
    let app = App::open(cfg).unwrap();
    let s = session(&app);
    let t = upload(&app, &s.id, T::default(), "harmonic_240.webm");
    for _ in 0..3 { analysis::run_pending(&app); }
    let t = app.take(&t.id).unwrap();
    assert_eq!(t.status, TakeStatus::AnalysisFailed);
    assert!(t.original.is_some() && app.paths.take_dir(&s.id, &t.id).join("original.webm").exists());
    // Simulate a crash mid-job, then restart with a working helper.
    let mut j: Job = store::read_json(&app.paths.jobs().join(format!("analyze-{}.json", t.id))).unwrap();
    j.status = "running".into();
    store::write_json(&app.paths.jobs().join(format!("analyze-{}.json", t.id)), &j).unwrap();
    let app = App::open(config(dir.path())).unwrap();
    assert_eq!(analysis::reconcile(&app).unwrap(), 1);
    analysis::run_pending(&app);
    analysis::run_pending(&app);
    let t = app.take(&t.id).unwrap();
    assert_eq!(t.status, TakeStatus::ReviewReady);
    let runs = store::list_files_with_ext(&app.paths.analyses_dir(&s.id), "json");
    assert_eq!(runs.len(), 1, "no duplicate analysis results");
}

// ---------- analysis and comparisons ----------

#[test]
fn silence_gives_no_pitch_and_a_capture_pointer() {
    let (_d, app) = app();
    let s = session(&app);
    let t = upload(&app, &s.id, T::default(), "silence.wav");
    let an = app.take_analysis(&t).unwrap();
    assert!(an["measures"]["f0_median_hz"]["value"].is_null());
    comfort(&app, &s.id, Comfort::Comfortable, 2, false);
    let r = coach::review_session(&app, &s.id).unwrap();
    let p = r.active_pointer.unwrap();
    assert_eq!(p.kind, PointerKind::Capture);
    assert!(p.observation.contains("signal") || p.observation.contains("voiced"));
    let skills = progress::skill_cards(&app);
    let res = skills.iter().find(|c| c.area == "resonance").unwrap();
    assert_eq!(res.state, "recording_issue", "a recording fault is not a low skill score");
}

#[test]
fn same_audio_twice_is_stable_and_device_change_is_not_comparable() {
    let (_d, app) = app();
    let s = session(&app);
    let a = upload(&app, &s.id, T::default(), "harmonic_240.webm");
    let b = upload(&app, &s.id, T::default(), "harmonic_240.webm");
    let c = compare::compare(&app, &a.id, &b.id).unwrap();
    assert_eq!(c.outcome, "stable");
    assert_eq!(c.measures[0].delta.unwrap().abs() < 1e-9, true, "identical analysis");
    let d = upload(&app, &s.id, T { device: "Mic B", ..T::default() }, "harmonic_240.webm");
    assert_eq!(compare::compare(&app, &a.id, &d.id).unwrap().outcome, "not_comparable");
    let e = upload(&app, &s.id, T { prompt: "ref.count-1-10", role: TakeRole::Reference, exercise: None, ..T::default() }, "harmonic_240.webm");
    assert_eq!(compare::compare(&app, &a.id, &e.id).unwrap().outcome, "not_comparable");
}

// ---------- coaching ----------

#[test]
fn useful_coaching_selects_a_cue_and_matched_retry_updates() {
    let (_d, app) = app();
    let s = session(&app);
    let t = upload(&app, &s.id, T::default(), "mixed_voiced_unvoiced.webm");
    report(&app, &t.id, "where_felt", "throat_chest");
    comfort(&app, &s.id, Comfort::Comfortable, 3, false);
    let r = coach::review_session(&app, &s.id).unwrap();
    let p = r.active_pointer.clone().unwrap();
    assert_eq!(p.kind, PointerKind::PracticeFocus);
    let na = p.next_action.clone().unwrap();
    assert_eq!(na.exercise_id, "nhsfife.forward-hum");
    let ex = app.registry.read().unwrap().get("nhsfife.forward-hum", 1).unwrap().clone();
    let cue = ex.cue(na.cue_id.as_deref().unwrap()).unwrap();
    assert_eq!(cue.use_when, "target_not_met");
    assert!(p.evidence[0].segment.is_none(), "self-report evidence has no invented timestamp");
    assert_eq!(app.current_plan().unwrap().cue_id, na.cue_id, "plan keeps the task with the new cue");
    // Idempotent review.
    assert_eq!(coach::review_session(&app, &s.id).unwrap().id, r.id);
    // Matched retry.
    let retry = upload(&app, &s.id, T { role: TakeRole::Retry, retry_of: Some(t.id.clone()), ..T::default() }, "mixed_voiced_unvoiced.webm");
    assert_eq!(retry.retry_of.as_deref(), Some(t.id.as_str()));
    report(&app, &retry.id, "where_felt", "lips_face_nose");
    let r2 = coach::review_session(&app, &s.id).unwrap();
    assert_ne!(r2.id, r.id);
    let p2 = r2.active_pointer.unwrap();
    assert!(p2.observation.contains("lips, face or nose"));
    assert!(r2.other_observations.iter().any(|o| o.observation.starts_with("Original and retry")));
    // Original take untouched.
    assert_eq!(app.take(&t.id).unwrap().original.unwrap().sha256, t.original.unwrap().sha256);
}

#[test]
fn pain_report_pauses_and_overrides_a_favourable_report() {
    let (_d, app) = app();
    let s = session(&app);
    let t = upload(&app, &s.id, T::default(), "harmonic_240.webm");
    report(&app, &t.id, "where_felt", "lips_face_nose");
    comfort(&app, &s.id, Comfort::Pain, 5, true);
    let r = coach::review_session(&app, &s.id).unwrap();
    let p = r.active_pointer.unwrap();
    assert_eq!(p.kind, PointerKind::Pause);
    assert!(r.proposed_plan.is_none(), "no escalation offered");
    let plan = app.current_plan().unwrap();
    assert!(plan.paused);
    assert_eq!(plan.exercise_id, "nhsfife.forward-hum");
}

#[test]
fn stable_and_next_context_need_repeated_sessions() {
    let (_d, app) = app();
    let mut last = None;
    for effort in [4u8, 3, 2] {
        let s = session(&app);
        let t = upload(&app, &s.id, T::default(), "harmonic_240.webm");
        report(&app, &t.id, "where_felt", "lips_face_nose");
        comfort(&app, &s.id, Comfort::Comfortable, effort, false);
        last = Some(coach::review_session(&app, &s.id).unwrap());
        if effort == 4 {
            assert_eq!(last.as_ref().unwrap().active_pointer.as_ref().unwrap().kind, PointerKind::MoreEvidence, "one session is not a pattern");
        }
        if effort == 3 {
            assert_eq!(last.as_ref().unwrap().active_pointer.as_ref().unwrap().kind, PointerKind::Stable);
        }
    }
    let r = last.unwrap();
    assert_eq!(r.active_pointer.as_ref().unwrap().kind, PointerKind::Progress, "easier across 3 matched sessions");
    let pp = r.proposed_plan.expect("next context offered, not imposed");
    assert_eq!(pp.exercise_id, "nhsfife.smile-brighten");
    assert_eq!(app.current_plan().unwrap().exercise_id, "nhsfife.forward-hum", "plan unchanged until accepted");
    let cards = progress::skill_cards(&app);
    assert_eq!(cards.iter().find(|c| c.area == "resonance").unwrap().state, "progress");
    assert_eq!(cards.iter().find(|c| c.area == "pitch").unwrap().state, "not_assessed", "no pitch claim from F0");
}

#[test]
fn skipped_and_missing_evidence_never_becomes_a_low_state() {
    let (_d, app) = app();
    let cards = progress::skill_cards(&app);
    assert!(cards.iter().filter(|c| c.area != "listening").all(|c| c.state == "not_assessed"));
    let s = session(&app);
    upload(&app, &s.id, T::default(), "harmonic_240.webm"); // no self-report
    comfort(&app, &s.id, Comfort::Comfortable, 2, false);
    let r = coach::review_session(&app, &s.id).unwrap();
    assert!(r.active_pointer.is_none() && r.abstention.is_some());
    let res = progress::skill_cards(&app).into_iter().find(|c| c.area == "resonance").unwrap();
    assert_eq!(res.state, "more_evidence");
    let carry = progress::skill_cards(&app).into_iter().find(|c| c.area == "carryover").unwrap();
    assert_eq!(carry.state, "not_assessed");
    assert!(r.other_observations.iter().any(|o| o.area == "carryover" && o.observation.contains("unscripted")));
}

#[test]
fn disagreement_is_kept_and_carried_forward() {
    let (_d, app) = app();
    let s = session(&app);
    let t = upload(&app, &s.id, T::default(), "harmonic_240.webm");
    report(&app, &t.id, "where_felt", "throat_chest");
    comfort(&app, &s.id, Comfort::Comfortable, 3, false);
    let r = coach::review_session(&app, &s.id).unwrap();
    let before = std::fs::read(app.paths.reviews_dir(&s.id).join(format!("{}.json", r.id))).unwrap();
    coach::respond(&app, &r.id, ReviewResponse { review_id: r.id.clone(), pointer_id: Some("p1".into()), response: "disagree".into(), note: Some("felt it in my lips".into()), chosen_exercise_id: None, created_utc: String::new() }).unwrap();
    let after = std::fs::read(app.paths.reviews_dir(&s.id).join(format!("{}.json", r.id))).unwrap();
    assert_eq!(before, after, "the review itself is not rewritten");
    assert_eq!(app.review_responses(&r)[0].note.as_deref(), Some("felt it in my lips"));
    let s2 = session(&app);
    let t2 = upload(&app, &s2.id, T::default(), "harmonic_240.webm");
    report(&app, &t2.id, "where_felt", "throat_chest");
    comfort(&app, &s2.id, Comfort::Comfortable, 3, false);
    let r2 = coach::review_session(&app, &s2.id).unwrap();
    assert!(r2.active_pointer.unwrap().confidence_basis.uncertainty.contains("felt it in my lips"));
}

// ---------- agent review validation ----------

fn agent_input(sid: &str, key: &str, p: Pointer) -> validate::AgentReviewInput {
    validate::AgentReviewInput {
        session_id: sid.into(), idempotency_key: key.into(), author_name: "test-agent".into(), model: None,
        received_audio: false, active_pointer: Some(p), other_observations: vec![], abstention: None, summary: None,
    }
}

fn measured_pointer(t: &Take, value: f64, obs: &str) -> Pointer {
    Pointer {
        id: "p1".into(), kind: PointerKind::Descriptive, area: "pitch".into(), observation: obs.into(),
        evidence: vec![Evidence {
            class: EvidenceClass::Measured, session_id: t.session_id.clone(), take_id: Some(t.id.clone()), segment: Some([0.1, 0.5]),
            analysis_run: t.analysis_run.clone(), measure: Some(QuotedMeasure { name: "f0_median_hz".into(), value, unit: Some("Hz".into()) }),
            self_report: None, comparison_take_id: None, comparison_segment: None, description: "median".into(),
        }],
        goal_connection: "Pitch is one part of the goal.".into(),
        confidence_basis: ConfidenceBasis { data_quality: "ok".into(), comparability: "single".into(), method_status: "descriptive".into(), uncertainty: "unvalidated".into() },
        next_action: None, recheck: None,
    }
}

#[test]
fn invalid_agent_reviews_are_rejected_and_valid_ones_are_idempotent() {
    let (_d, app) = app();
    let s = session(&app);
    let t = upload(&app, &s.id, T::default(), "harmonic_240.webm");
    let v = app.take_analysis(&t).unwrap()["measures"]["f0_median_hz"]["value"].as_f64().unwrap();
    let shown = (v * 10.0).round() / 10.0;
    let ok = measured_pointer(&t, shown, &format!("Median pitch was {shown} Hz in this take."));
    let (r1, created) = validate::save_agent_review(&app, agent_input(&s.id, "k1", ok.clone())).unwrap();
    assert!(created);
    let (r2, created2) = validate::save_agent_review(&app, agent_input(&s.id, "k1", ok.clone())).unwrap();
    assert!(!created2 && r1.id == r2.id);

    let err = |p: Pointer| format!("{:#}", validate::save_agent_review(&app, agent_input(&s.id, &uuid::Uuid::new_v4().to_string(), p)).unwrap_err());
    assert!(err(measured_pointer(&t, 999.0, "Median 999 Hz.")).contains("does not match stored value"));
    assert!(err(measured_pointer(&t, shown, &format!("I hear your resonance at {shown} Hz."))).contains("hearing claim"));
    assert!(err(measured_pointer(&t, shown, "Your larynx position is high and you are 80% feminine.")).contains("prohibited claim"));
    assert!(err(measured_pointer(&t, shown, &format!("Median was {shown} Hz but range was 12 st."))).contains("not backed"));
    let mut ghost = measured_pointer(&t, shown, "x");
    ghost.evidence[0].take_id = Some("nonexistent-take".into());
    assert!(err(ghost).contains("does not exist"));
    let mut bad_ex = measured_pointer(&t, shown, "Descriptive only.");
    bad_ex.next_action = Some(NextAction { exercise_id: "made.up".into(), exercise_version: 1, cue_id: None, cue_text: None, summary: "do it".into() });
    assert!(err(bad_ex).contains("not in the registry"));
    let mut bad_cue = measured_pointer(&t, shown, "Descriptive only.");
    bad_cue.next_action = Some(NextAction { exercise_id: "nhsfife.forward-hum".into(), exercise_version: 1, cue_id: Some("push-harder".into()), cue_text: None, summary: "do it".into() });
    assert!(err(bad_cue).contains("cue push-harder"));
    let mut model = measured_pointer(&t, shown, "Descriptive only.");
    model.evidence[0].class = EvidenceClass::ModelPerceived;
    assert!(err(model).contains("model-perceived evidence is disabled"));
}

#[test]
fn stale_plan_writes_are_rejected() {
    let (_d, app) = app();
    let p = app.ensure_plan().unwrap();
    let mut next = p.clone();
    next.exercise_id = "nhsfife.smile-brighten".into();
    app.write_plan(next.clone(), Some(p.version)).unwrap();
    assert!(format!("{:#}", app.write_plan(next, Some(p.version)).unwrap_err()).contains("stale plan"));
}

// ---------- deletion and privacy ----------

#[test]
fn owner_deletion_removes_derived_files_and_marks_dependents() {
    let (_d, app) = app();
    let s1 = session(&app);
    let keep = upload(&app, &s1.id, T::default(), "harmonic_240.webm");
    let s2 = session(&app);
    let gone = upload(&app, &s2.id, T::default(), "harmonic_240.webm");
    let v = app.take_analysis(&gone).unwrap()["measures"]["f0_median_hz"]["value"].as_f64().unwrap();
    let (r, _) = validate::save_agent_review(&app, agent_input(&s1.id, "dep", measured_pointer(&gone, v, "Descriptive only."))).unwrap();
    let dir = app.paths.take_dir(&s2.id, &gone.id);
    assert!(dir.join("analysis.wav").exists());
    let summary = recordings::delete_take(&app, &gone.id, false).unwrap();
    assert!(!dir.exists());
    assert!(store::list_files_with_ext(&app.paths.analyses_dir(&s2.id), "json").is_empty());
    assert_eq!(summary["reviews_marked_evidence_deleted"][0], r.id.as_str());
    assert!(app.review(&r.id).is_ok(), "dependent review kept, read side marks evidence deleted");
    assert!(app.take(&keep.id).is_ok(), "unrelated session intact");
    recordings::delete_session(&app, &s1.id, true).unwrap();
    assert!(app.session(&s1.id).is_err());
    assert!(std::fs::read_to_string(app.paths.deletions_log()).unwrap().lines().count() == 2);
}

#[test]
fn external_processing_stays_off() {
    let (_d, app) = app();
    assert!(!app.profile().external_processing);
    assert!(!validate::MODEL_PERCEIVED_ENABLED);
}

// ---- Voice cards (spaced repetition) ----

use crate::practice::cards::{self, CardState, RateReq};

fn rate(app: &App, card: &str, take: Option<String>, rating: &str) -> serde_json::Value {
    cards::rate(app, RateReq { card_id: card.into(), take_id: take, rating: rating.into() }).unwrap()
}

fn queue_ids(app: &App) -> Vec<(String, String, bool)> {
    let q = cards::today_queue(app).unwrap();
    q["items"].as_array().unwrap().iter()
        .map(|i| (i["card"]["id"].as_str().unwrap().to_string(), i["kind"].as_str().unwrap().to_string(), i["done_today"].as_bool().unwrap()))
        .collect()
}

#[test]
fn card_intervals_grow_and_stay_bounded() {
    let new = CardState::default();
    assert_eq!(cards::next_interval(&new, "again").0, 0);
    assert_eq!(cards::next_interval(&new, "good").0, 1);
    assert_eq!(cards::next_interval(&new, "easy").0, 4);
    let review = CardState { reps: 2, interval_days: 3, ease: 2.5, ..Default::default() };
    let (hard, _) = cards::next_interval(&review, "hard");
    let (good, _) = cards::next_interval(&review, "good");
    let (easy, _) = cards::next_interval(&review, "easy");
    assert!(hard < good && good < easy, "{hard} {good} {easy}");
    assert_eq!(good, 8);
    let long = CardState { reps: 9, interval_days: 50, ease: 2.8, ..Default::default() };
    assert_eq!(cards::next_interval(&long, "easy").0, 60, "intervals are capped");
    let weak = CardState { reps: 3, interval_days: 2, ease: 1.35, ..Default::default() };
    assert!(cards::next_interval(&weak, "again").1 >= 1.3, "ease has a floor");
}

#[test]
fn first_deck_is_reference_plus_new_cards_from_first_stage() {
    let (_d, app) = app();
    let q = queue_ids(&app);
    assert_eq!(q[0].0, cards::REFERENCE_CARD);
    let new: Vec<_> = q.iter().filter(|x| x.1 == "new").collect();
    assert_eq!(new.len(), 2, "default two new cards a day: {q:?}");
    let all = cards::all_cards(&app);
    for (id, _, _) in &new {
        assert_eq!(all.iter().find(|c| &c.id == id).unwrap().stage, 1, "only stage-1 cards at the start");
    }
}

#[test]
fn rating_schedules_card_is_idempotent_and_again_returns_today() {
    let (_d, app) = app();
    let s = recordings::deck_session(&app).unwrap();
    assert_eq!(recordings::deck_session(&app).unwrap().id, s.id, "one deck session a day");
    let q = queue_ids(&app);
    let (first, second) = (q[1].0.clone(), q[2].0.clone());
    let take = new_take(&app, &s.id, T::default(), "audio/wav");
    let r = rate(&app, &first, Some(take.clone()), "good");
    assert_eq!(r["next"], "tomorrow");
    assert_eq!(rate(&app, &first, Some(take.clone()), "easy")["duplicate"], true, "same take rated twice is ignored");
    assert_eq!(app.take(&take).unwrap().card.unwrap()["rating"], "good");
    rate(&app, &second, None, "again");
    let q = queue_ids(&app);
    assert!(q.iter().any(|x| x.0 == first && x.2), "rated card is ticked done: {q:?}");
    assert!(q.iter().any(|x| x.0 == second && x.1 == "again" && !x.2), "again card comes back today: {q:?}");
    rate(&app, &second, None, "good");
    let q = queue_ids(&app);
    assert!(q.iter().any(|x| x.0 == second && x.2), "{q:?}");
    let log = cards::reviews(&app);
    assert_eq!(log.len(), 3);
}

#[test]
fn missed_days_never_become_a_backlog() {
    let (_d, app) = app();
    let all = cards::all_cards(&app);
    let mut state = BTreeMap::new();
    for c in all.iter().filter(|c| c.id != cards::REFERENCE_CARD) {
        state.insert(c.id.clone(), CardState { due: Some("2020-01-01".into()), interval_days: 3, ease: 2.5, reps: 2, ..Default::default() });
    }
    store::write_json(&app.paths.root.join("cards/state.json"), &state).unwrap();
    let q = cards::today_queue(&app).unwrap();
    let cap = q["cap"].as_u64().unwrap() as usize;
    assert!(q["items"].as_array().unwrap().len() <= cap, "overdue cards wait instead of piling up");
    assert_eq!(q["counts"]["new"], 0);
}

#[test]
fn hurt_card_is_suspended_pauses_plan_and_resume_brings_it_back() {
    let (_d, app) = app();
    app.ensure_plan().unwrap();
    let q = queue_ids(&app);
    let card = q[1].0.clone();
    rate(&app, &card, None, "good");
    rate(&app, &card, None, "ouch");
    assert!(app.current_plan().unwrap().paused, "plan pauses after a comfort report");
    let st = cards::load_state(&app);
    assert!(st[&card].suspended);
    let q = cards::today_queue(&app).unwrap();
    assert_eq!(q["paused"], true);
    assert!(q["items"].as_array().unwrap().is_empty(), "nothing to practise while paused");
    cards::resume_suspended(&app).unwrap();
    assert!(!cards::load_state(&app)[&card].suspended);
}

#[test]
fn remeasure_keeps_the_earlier_run_and_points_at_the_new_one() {
    let (_d, app) = app();
    let s = session(&app);
    let t = upload(&app, &s.id, T::default(), "harmonic_240.webm");
    let first = t.analysis_run.clone().unwrap();
    let first_doc = app.analysis(&s.id, &first).unwrap();
    // The bundled helper reports the method version the server expects.
    assert_eq!(first_doc["method"]["method_version"], analysis::ANALYSIS_METHOD);
    assert_eq!(analysis::remeasure_stale(&app).unwrap(), 0, "a current measurement is not re-measured");

    // Pretend it came from an older method: it is now stale and gets a new run.
    let mut old = first_doc.clone();
    old["method"]["method_version"] = serde_json::json!("lilt-analysis/1");
    store::write_json(&app.paths.analyses_dir(&s.id).join(format!("{first}.json")), &old).unwrap();
    assert_eq!(analysis::remeasure_stale(&app).unwrap(), 1);
    assert!(matches!(app.take(&t.id).unwrap().status, TakeStatus::AnalysisPending));
    assert!(analysis::remeasure(&app, &t.id).is_err(), "already being measured");
    analysis::run_pending(&app);

    let after = app.take(&t.id).unwrap();
    let second = after.analysis_run.clone().unwrap();
    assert_eq!(second, format!("run-{}-a2", t.id));
    assert!(matches!(after.status, TakeStatus::ReviewReady));
    assert!(app.analysis(&s.id, &first).is_ok(), "the earlier run stays on disk");
    assert_eq!(app.analysis(&s.id, &second).unwrap()["method"]["method_version"], analysis::ANALYSIS_METHOD);
    assert_eq!(analysis::remeasure_stale(&app).unwrap(), 0);
}


#[test]
fn syllabus_edits_go_to_your_own_version_and_can_be_undone() {
    use crate::{practice::cards, ai::mcp, courses::syllabus};
    let (dir, app) = app();
    let v = crate::courses::get(&app, "voice").unwrap();
    let call = |name: &str, args: serde_json::Value| mcp::call(&app, name, args.as_object().unwrap());
    let shipped = std::fs::read_to_string(root().join("content/courses/voice/02-m-words.md")).unwrap();
    let has_card = |id: &str| cards::all_cards(&app).iter().any(|c| c.id == id);
    assert_eq!(syllabus::list(&app, &v)["using"], "original");

    // A file Lilt can't read, a non-syllabus name, or a change to the safety section is refused.
    assert!(syllabus::write(&app, &v, "02-m-words.md", "no front matter", "break it").is_err());
    assert!(syllabus::write(&app, &v, "../02-m-words.md", &shipped, "escape").is_err());
    let home = std::fs::read_to_string(root().join("content/courses/voice/index.md")).unwrap();
    let pushy = home.replace("It should never hurt.", "Push through it.");
    assert!(syllabus::write(&app, &v, "index.md", &pushy, "be tougher").unwrap_err().to_string().contains("Be gentle"));
    assert!(!dir.path().join("courses/voice/_about.md").exists(), "refused edits leave no copy");

    // Reword a text and add one: your version, with the original untouched, and new cards.
    let edited = shipped.replacen("meet · many · maybe · Mary · magic", "me · my · may", 1) + "\n## mine-extra\n\nmorning, mum\n\n> Easy.\n";
    let r = syllabus::write(&app, &v, "02-m-words.md", &edited, "shorter first line, one more text").unwrap();
    assert_eq!(r["using"], "mine");
    assert_eq!(std::fs::read_to_string(root().join("content/courses/voice/02-m-words.md")).unwrap(), shipped);
    assert!(has_card("text.m-words.mine-extra"));
    let cmp = call("syllabus_compare", serde_json::json!({})).unwrap().structured_content.unwrap();
    let d = &cmp["differences_from_original"][0];
    assert_eq!((d["file"].as_str(), d["texts_added"][0].as_str()), (Some("02-m-words.md"), Some("mine-extra")));
    assert_eq!(d["texts_changed"].as_array().unwrap().len(), 1);

    // A new chapter, removed again, then undo brings it back.
    let template = std::fs::read_to_string(root().join("content/courses/voice/_template.md")).unwrap();
    syllabus::write(&app, &v, "09-my-chapter.md", &template, "add my own chapter").unwrap();
    assert!(has_card("text.my-chapter.first-text"));
    syllabus::delete(&app, &v, "09-my-chapter.md", "not needed").unwrap();
    assert!(!has_card("text.my-chapter.first-text"));
    syllabus::undo(&app, &v).unwrap();
    assert!(has_card("text.my-chapter.first-text"));
    assert_eq!(syllabus::history(&app, &v)["changes"].as_array().unwrap().len(), 2);

    // Reset goes back to the original and can be undone too; undoing everything ends on the original.
    syllabus::reset(&app, &v, "start over").unwrap();
    assert!(!has_card("text.m-words.mine-extra"));
    syllabus::undo(&app, &v).unwrap();
    assert!(has_card("text.m-words.mine-extra"));
    syllabus::undo(&app, &v).unwrap();
    syllabus::undo(&app, &v).unwrap();
    assert_eq!(syllabus::list(&app, &v)["using"], "original");
    assert!(!has_card("text.m-words.mine-extra"));
    assert!(syllabus::undo(&app, &v).is_err());

    // Your version survives a restart.
    syllabus::write(&app, &v, "02-m-words.md", &edited, "again").unwrap();
    drop(app);
    let again = App::open(config(dir.path())).unwrap();
    assert!(cards::all_cards(&again).iter().any(|c| c.id == "text.m-words.mine-extra"));
    assert_eq!(again.texts.read().unwrap()["edition"]["mine"], true);
}

#[test]
fn syllabus_changes_from_another_process_are_picked_up() {
    use crate::{practice::cards, courses::syllabus};
    let (dir, app) = app();
    let other = App::open(config(dir.path())).unwrap();
    let v = crate::courses::get(&app, "voice").unwrap();
    let src = std::fs::read_to_string(root().join("content/courses/voice/02-m-words.md")).unwrap() + "\n## from-elsewhere\n\nmm\n\n> Easy.\n";
    syllabus::write(&other, &v, "02-m-words.md", &src, "from the stdio server").unwrap();
    assert!(cards::all_cards(&app).iter().any(|c| c.id == "text.m-words.from-elsewhere"));
    let e = syllabus::write(&app, &v, "02-m-words.md", "oops", "break it").unwrap_err().to_string();
    assert!(e.contains("in 02-m-words.md:"), "{e}");
}

fn copy_dir(from: &std::path::Path, to: &std::path::Path) {
    std::fs::create_dir_all(to).unwrap();
    for e in std::fs::read_dir(from).unwrap().flatten() {
        let p = e.path();
        if p.is_dir() { copy_dir(&p, &to.join(e.file_name())) } else { std::fs::copy(&p, to.join(e.file_name())).unwrap(); }
    }
}

#[test]
fn updates_to_the_original_come_in_piece_by_piece() {
    use crate::{practice::cards, courses::syllabus, courses::updates};
    let dir = tempfile::tempdir().unwrap();
    let content = dir.path().join("content");
    copy_dir(&root().join("content"), &content);
    let mut cfg = config(&dir.path().join("data"));
    cfg.content_dir = content.clone();
    let app = App::open(cfg).unwrap();
    let v = crate::courses::get(&app, "voice").unwrap();
    let texts = content.join("courses/voice");
    let read = |n: &str| std::fs::read_to_string(texts.join(n)).unwrap();
    let words = read("02-m-words.md");
    let first = words.lines().skip_while(|l| *l != "## m1").nth(2).unwrap().to_string();
    let second = words.lines().skip_while(|l| *l != "## m2").nth(2).unwrap().to_string();
    assert_eq!(updates::list(&app, &v)["using"], "original");

    // You reword m1; then Lilt's original rewords m1 and m2, adds a chapter and softens the safety section.
    syllabus::write(&app, &v, "02-m-words.md", &words.replace(&first, "my own first line"), "mine").unwrap();
    std::fs::write(texts.join("02-m-words.md"), words.replace(&first, "lilt's new first line").replace(&second, "lilt's new second line")).unwrap();
    std::fs::write(texts.join("09-new.md"), read("_template.md").replace("id: my-chapter", "id: brand-new")).unwrap();
    let home = read("index.md");
    std::fs::write(texts.join("index.md"), home.replace("It should never hurt.", "It should never hurt, not even a little.")).unwrap();

    let l = updates::list(&app, &v);
    assert_eq!(l["available"], true);
    let handling = |id: &str| l["changes"].as_array().unwrap().iter().find(|c| c["id"] == id).map(|c| c["handling"].as_str().unwrap().to_string());
    assert_eq!(handling("02-m-words.md### m1").as_deref(), Some("choose"));
    assert_eq!(handling("02-m-words.md### m2").as_deref(), Some("take"));
    assert_eq!(handling("09-new.md").as_deref(), Some("take"));
    assert_eq!(handling("index.md### Be gentle with your voice").as_deref(), Some("take"));

    // A choice is needed for m1; keep yours.
    assert!(updates::apply(&app, &v, &BTreeMap::new(), "").unwrap_err().to_string().contains("choose"));
    let r = updates::apply(&app, &v, &BTreeMap::from([("02-m-words.md### m1".to_string(), "yours".to_string())]), "").unwrap();
    assert_eq!((r["updates_taken"].as_u64(), r["kept_yours"].as_u64()), (Some(3), Some(1)));
    let mine = syllabus::read(&app, &v, "02-m-words.md", "mine").unwrap()["markdown"].as_str().unwrap().to_string();
    assert!(mine.contains("my own first line") && mine.contains("lilt's new second line"));
    assert!(cards::all_cards(&app).iter().any(|c| c.id == "text.brand-new.first-text"));
    assert!(syllabus::read(&app, &v, "index.md", "mine").unwrap()["markdown"].as_str().unwrap().contains("not even a little"));
    assert_eq!(updates::list(&app, &v)["available"], false, "nothing left to bring in");

    // Undo puts back your version and the base it followed, so the updates show again.
    syllabus::undo(&app, &v).unwrap();
    assert!(!cards::all_cards(&app).iter().any(|c| c.id == "text.brand-new.first-text"));
    assert_eq!(updates::list(&app, &v)["available"], true);
    // Your version still follows the old safety wording until you bring the update in, and you can keep editing.
    syllabus::write(&app, &v, "01-warmup.md", &read("01-warmup.md").replace("title: Warm-ups", "title: Warm-ups, my way"), "rename").unwrap();
}

/// Every feature's routes are mounted on the one router, behind the cross-origin guard.
#[tokio::test]
async fn every_api_route_is_mounted() {
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;
    let (dir, app) = app();
    let router = crate::build_router(app.clone(), &config(dir.path()));
    let send = |method: &str, uri: &str| {
        let req = Request::builder().method(method).uri(uri).header("host", "127.0.0.1:7878").body(Body::empty()).unwrap();
        let r = router.clone();
        async move { r.oneshot(req).await.unwrap().status() }
    };
    for uri in ["/healthz", "/api/today", "/api/profile", "/api/exercises", "/api/deck/today", "/api/plan", "/api/plan/history",
        "/api/progress", "/api/sessions", "/api/history", "/api/jobs", "/api/courses", "/api/texts", "/api/syllabus",
        "/api/syllabus/updates", "/api/syllabus/history", "/api/connect", "/api/export"] {
        assert_eq!(send("GET", uri).await, StatusCode::OK, "GET {uri}");
    }
    // Routes that need an ID or a body answer from their handler, not the static-file fallback.
    for (method, uri) in [("GET", "/api/sessions/nope"), ("GET", "/api/takes/nope"), ("GET", "/api/takes/nope/analysis"),
        ("GET", "/api/reviews/nope"), ("GET", "/api/exercises/nope"), ("GET", "/api/compare?a=x&b=y")] {
        assert_eq!(send(method, uri).await, StatusCode::NOT_FOUND, "{method} {uri}");
    }
    for uri in ["/api/takes", "/api/deck/review", "/api/plan/choose", "/api/mixtape/remix", "/api/reviews/x/respond"] {
        let s = send("POST", uri).await;
        assert!(s.is_client_error() && s != StatusCode::NOT_FOUND && s != StatusCode::METHOD_NOT_ALLOWED, "POST {uri} answered {s}");
    }
    let cross = Request::builder().method("POST").uri("/api/studio/session").header("host", "127.0.0.1:7878").header("origin", "http://evil.example").body(Body::empty()).unwrap();
    assert_eq!(router.clone().oneshot(cross).await.unwrap().status(), StatusCode::FORBIDDEN);
}

/// A cloud app signing in through the public address: registration, the pairing code, PKCE,
/// refresh, and what the tunnel can and can't reach.
#[tokio::test]
async fn remote_apps_sign_in_with_a_pairing_code_and_only_reach_mcp() {
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use base64::Engine;
    use http_body_util::BodyExt;
    use sha2::{Digest, Sha256};
    use tower::ServiceExt;
    let (dir, app) = app();
    let router = crate::build_router(app.clone(), &config(dir.path()));
    let send = |req: Request<Body>| { let r = router.clone(); async move {
        let res = r.oneshot(req).await.unwrap();
        let status = res.status();
        let headers = res.headers().clone();
        let body = res.into_body().collect().await.unwrap().to_bytes();
        (status, headers, String::from_utf8_lossy(&body).to_string())
    } };
    let public = |method: &str, uri: &str, body: Body| Request::builder().method(method).uri(uri).header("host", "lilt.example.com").header("content-type", "application/x-www-form-urlencoded").body(body).unwrap();

    // Before an address is saved: no sign-in metadata. Locally everything still works.
    assert_eq!(send(public("GET", "/.well-known/oauth-authorization-server", Body::empty())).await.0, StatusCode::NOT_FOUND);
    crate::ai::oauth::set_public_url(&app, "https://lilt.example.com/").unwrap();
    assert!(crate::ai::oauth::set_public_url(&app, "http://lilt.example.com").is_err());

    // Through the tunnel only MCP and sign-in are reachable, and MCP asks for sign-in.
    assert_eq!(send(public("GET", "/api/profile", Body::empty())).await.0, StatusCode::NOT_FOUND);
    assert_eq!(send(public("GET", "/", Body::empty())).await.0, StatusCode::NOT_FOUND);
    let cf = Request::builder().uri("/api/profile").header("host", "127.0.0.1:7878").header("cf-connecting-ip", "1.2.3.4").body(Body::empty()).unwrap();
    assert_eq!(send(cf).await.0, StatusCode::NOT_FOUND, "Cloudflare's header marks the tunnel too");
    let (s, h, _) = send(public("POST", "/mcp", Body::from("{}"))).await;
    assert_eq!(s, StatusCode::UNAUTHORIZED);
    assert!(h["www-authenticate"].to_str().unwrap().contains("https://lilt.example.com/.well-known/oauth-protected-resource/mcp"));
    let (_, _, meta) = send(public("GET", "/.well-known/oauth-authorization-server", Body::empty())).await;
    let meta: serde_json::Value = serde_json::from_str(&meta).unwrap();
    assert_eq!((meta["issuer"].as_str(), meta["code_challenge_methods_supported"][0].as_str()), (Some("https://lilt.example.com"), Some("S256")));

    // Register, then sign in: a wrong code is refused, the right one sends the app back with a code.
    let reg = Request::builder().method("POST").uri("/oauth/register").header("host", "lilt.example.com").header("content-type", "application/json")
        .body(Body::from(r#"{"client_name":"ChatGPT","redirect_uris":["https://chatgpt.com/connector/oauth/x1"]}"#)).unwrap();
    let (s, _, body) = send(reg).await;
    assert_eq!(s, StatusCode::CREATED);
    let client_id = serde_json::from_str::<serde_json::Value>(&body).unwrap()["client_id"].as_str().unwrap().to_string();
    let verifier = "a".repeat(50);
    let challenge = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(Sha256::digest(verifier.as_bytes()));
    let q = format!("response_type=code&client_id={client_id}&redirect_uri=https%3A%2F%2Fchatgpt.com%2Fconnector%2Foauth%2Fx1&code_challenge={challenge}&code_challenge_method=S256&state=s1&resource=https%3A%2F%2Flilt.example.com%2Fmcp");
    let (s, _, html) = send(public("GET", &format!("/oauth/authorize?{q}"), Body::empty())).await;
    assert!(s.is_success() && html.contains("Connect ChatGPT to Lilt?"));
    let bad = send(public("GET", &format!("/oauth/authorize?{}", q.replace("x1", "evil")), Body::empty())).await.2;
    assert!(bad.contains("return address doesn&#39;t match"));
    let code = crate::ai::oauth::new_pairing_code(&app)["code"].as_str().unwrap().to_string();
    let (s, _, html) = send(public("POST", "/oauth/authorize", Body::from(format!("{q}&pairing_code=WRONG-CODE&decision=allow")))).await;
    assert!(s.is_success() && html.contains("isn&#39;t right"));
    let (s, h, _) = send(public("POST", "/oauth/authorize", Body::from(format!("{q}&pairing_code={}&decision=allow", code.to_lowercase())))).await;
    assert!(s.is_redirection());
    let to = h["location"].to_str().unwrap().to_string();
    assert!(to.starts_with("https://chatgpt.com/connector/oauth/x1?code=") && to.ends_with("&state=s1"));
    let auth_code = to.split("code=").nth(1).unwrap().split('&').next().unwrap().to_string();
    let used = send(public("POST", "/oauth/authorize", Body::from(format!("{q}&pairing_code={code}&decision=allow")))).await.2;
    assert!(used.contains("isn&#39;t right"), "a pairing code works once");

    // Exchange the code (PKCE checked), call MCP with the token, refresh it.
    let form = |extra: &str| Body::from(format!("grant_type=authorization_code&code={auth_code}&client_id={client_id}&redirect_uri=https%3A%2F%2Fchatgpt.com%2Fconnector%2Foauth%2Fx1{extra}"));
    assert_eq!(send(public("POST", "/oauth/token", form(&format!("&code_verifier={}", "b".repeat(50))))).await.0, StatusCode::BAD_REQUEST);
    let (s, _, body) = send(public("POST", "/oauth/token", form(&format!("&code_verifier={verifier}")))).await;
    assert_eq!(s, StatusCode::BAD_REQUEST, "a failed exchange uses the code up");
    assert!(body.contains("invalid_grant"));
    // Sign in again for a fresh code.
    let code = crate::ai::oauth::new_pairing_code(&app)["code"].as_str().unwrap().to_string();
    let to = send(public("POST", "/oauth/authorize", Body::from(format!("{q}&pairing_code={code}&decision=allow")))).await.1["location"].to_str().unwrap().to_string();
    let auth_code = to.split("code=").nth(1).unwrap().split('&').next().unwrap().to_string();
    let form = Body::from(format!("grant_type=authorization_code&code={auth_code}&client_id={client_id}&redirect_uri=https%3A%2F%2Fchatgpt.com%2Fconnector%2Foauth%2Fx1&code_verifier={verifier}"));
    let (s, _, body) = send(public("POST", "/oauth/token", form)).await;
    assert_eq!(s, StatusCode::OK, "{body}");
    let tok: serde_json::Value = serde_json::from_str(&body).unwrap();
    let access = tok["access_token"].as_str().unwrap().to_string();
    let init = |t: &str| Request::builder().method("POST").uri("/mcp").header("host", "lilt.example.com").header("authorization", format!("Bearer {t}"))
        .header("content-type", "application/json").header("accept", "application/json, text/event-stream")
        .body(Body::from(r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}"#)).unwrap();
    assert_eq!(send(init(&access)).await.0, StatusCode::OK);
    assert_eq!(send(init("nope")).await.0, StatusCode::UNAUTHORIZED);
    let refresh = Body::from(format!("grant_type=refresh_token&refresh_token={}&client_id={client_id}", tok["refresh_token"].as_str().unwrap()));
    let (s, _, body) = send(public("POST", "/oauth/token", refresh)).await;
    assert_eq!(s, StatusCode::OK);
    let new_access = serde_json::from_str::<serde_json::Value>(&body).unwrap()["access_token"].as_str().unwrap().to_string();
    assert_eq!(send(init(&access)).await.0, StatusCode::UNAUTHORIZED, "the old token is replaced");
    assert_eq!(send(init(&new_access)).await.0, StatusCode::OK);
    assert!(!std::fs::read_to_string(dir.path().join("oauth.json")).unwrap().contains(&new_access), "only hashes are kept");

    // Disconnecting in Settings ends it.
    let conns = crate::ai::oauth::connections(&app);
    assert_eq!((conns.len(), conns[0]["client_name"].as_str()), (1, Some("ChatGPT")));
    crate::ai::oauth::disconnect(&app, conns[0]["id"].as_str().unwrap()).unwrap();
    assert_eq!(send(init(&new_access)).await.0, StatusCode::UNAUTHORIZED);

    // From this computer: MCP answers local host names only.
    let local = |host: &str| Request::builder().method("POST").uri("/mcp").header("host", host).header("content-type", "application/json").header("accept", "application/json, text/event-stream")
        .body(Body::from(r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}"#)).unwrap();
    assert_eq!(send(local("127.0.0.1:7878")).await.0, StatusCode::OK);
    assert_eq!(send(local("attacker.example")).await.0, StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn chatgpt_signin_is_local_same_origin_and_callback_is_bound_to_browser() {
    use axum::{body::{Body, to_bytes}, http::{Request, StatusCode}};
    use tower::ServiceExt;
    let (_dir, a) = app();
    let router = crate::build_router(a.clone(), &a.config);
    for (host, origin) in [("attacker.example:7878", "http://attacker.example:7878"), ("127.0.0.1:7878", "https://attacker.example")] {
        let res = router.clone().oneshot(Request::builder().method("POST").uri("/api/chatgpt/login").header("host", host).header("origin", origin).body(Body::empty()).unwrap()).await.unwrap();
        assert_eq!(res.status(), StatusCode::FORBIDDEN);
    }
    let res = router.clone().oneshot(Request::builder().method("POST").uri("/api/chatgpt/login").header("host", "127.0.0.1:7878").header("origin", "http://127.0.0.1:7878").body(Body::empty()).unwrap()).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    assert_eq!(res.headers()["cache-control"], "no-store");
    let cookie = res.headers()["set-cookie"].to_str().unwrap().split(';').next().unwrap().to_owned();
    let body: serde_json::Value = serde_json::from_slice(&to_bytes(res.into_body(), 16384).await.unwrap()).unwrap();
    let url = url::Url::parse(body["url"].as_str().unwrap()).unwrap();
    let params: std::collections::HashMap<_, _> = url.query_pairs().into_owned().collect();
    assert_eq!(params["client_id"], "dynamic_agent_client");
    assert_eq!(params["redirect_uri"], "http://127.0.0.1:7878/auth/callback");
    assert!(params["scope"].contains("chatgpt.tokens.use.direct"));
    let wrong = format!("/auth/callback?state={}&error=access_denied", params["state"]);
    let res = router.clone().oneshot(Request::builder().uri(&wrong).header("host", "127.0.0.1:7878").body(Body::empty()).unwrap()).await.unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);
    let res = router.oneshot(Request::builder().uri(&wrong).header("host", "127.0.0.1:7878").header("cookie", cookie).body(Body::empty()).unwrap()).await.unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);
    assert!(!a.chatgpt.lock().await.pending_for_test());
}

#[test]
fn chatgpt_private_data_is_never_in_practice_export() {
    let (_dir, a) = app();
    std::fs::create_dir(a.paths.root.join(".private")).unwrap();
    std::fs::write(a.paths.root.join(".private/chatgpt.json"), b"secret").unwrap();
    let path = crate::store::export::write_zip(&a).unwrap();
    let zip = zip::ZipArchive::new(std::fs::File::open(&path).unwrap()).unwrap();
    assert!(!zip.file_names().any(|name| name.unwrap().contains(".private")));
    std::fs::remove_file(path).unwrap();
}

/// Courses: a second one beside voice, kept apart; `locked` from its course.md; pictures served per
/// course; and an older `<data>/syllabus` copy moved to `<data>/courses/voice` on start.
#[tokio::test]
async fn courses_are_kept_apart_and_old_copies_move_over() {
    use crate::{courses, courses::syllabus};
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;
    let dir = tempfile::tempdir().unwrap();
    let content = dir.path().join("content");
    copy_dir(&root().join("content"), &content);
    let zh = content.join("courses/mandarin");
    std::fs::create_dir_all(zh.join("images")).unwrap();
    std::fs::write(zh.join("course.md"), "---\nid: mandarin\ntitle: Mandarin basics\nkind: language\nversion: 1\nlocked: Tones matter\n---\n\nFirst words and tones.\n").unwrap();
    std::fs::write(zh.join("_about.md"), "---\nversion: 1\n---\n\nA tiny sample.\n").unwrap();
    std::fs::write(zh.join("index.md"), "---\ntitle: Mandarin\n---\n\n# Mandarin\n\n## Tones matter\n\nSay each tone slowly.\n\n## Start\n\nHello.\n").unwrap();
    std::fs::write(zh.join("01-greetings.md"), "---\nid: greetings\ntitle: Greetings\nkind: phrases\n---\n\nSay them slowly.\n\n## nihao\n\nnǐ hǎo\n\n> Hello.\n").unwrap();
    std::fs::write(zh.join("images/tones.webp"), b"RIFF").unwrap();

    // An older copy of the voice course, from before courses.
    let data = dir.path().join("data");
    std::fs::create_dir_all(data.join("syllabus")).unwrap();
    copy_dir(&content.join("courses/voice"), &data.join("syllabus"));
    let mut cfg = config(&data);
    cfg.content_dir = content.clone();
    let app = App::open(cfg.clone()).unwrap();
    assert!(!data.join("syllabus").exists() && data.join("courses/voice/_about.md").exists(), "moved to courses/voice");

    let list = courses::list(&app);
    let ids: Vec<&str> = list["courses"].as_array().unwrap().iter().map(|c| c["id"].as_str().unwrap()).collect();
    assert_eq!(ids, ["voice", "mandarin"], "the app's course first");
    assert_eq!(list["courses"][1]["kind"], "language");
    assert_eq!(list["courses"][0]["using"], "mine");

    // Editing Mandarin makes its own copy; voice and the app's texts are untouched.
    let m = courses::get(&app, "mandarin").unwrap();
    let before = syllabus::texts(&app);
    let ch = std::fs::read_to_string(zh.join("01-greetings.md")).unwrap() + "\n## xiexie\n\nxiè xie\n\n> Thank you.\n";
    syllabus::write(&app, &m, "01-greetings.md", &ch, "add thank you").unwrap();
    assert!(data.join("courses/mandarin/01-greetings.md").exists());
    assert_eq!(syllabus::texts(&app), before);
    assert_eq!(syllabus::list(&app, &m)["using"], "mine");
    // Its locked section, from course.md, stays.
    let idx = std::fs::read_to_string(zh.join("index.md")).unwrap().replace("Say each tone slowly.", "Tones don't matter.");
    assert!(syllabus::write(&app, &m, "index.md", &idx, "skip tones").unwrap_err().to_string().contains("Tones matter"));
    // The tools take the course by id; an unknown one is refused.
    let call = |name: &str, args: serde_json::Value| crate::ai::mcp::call(&app, name, args.as_object().unwrap());
    assert_eq!(call("syllabus_history", serde_json::json!({"course": "mandarin"})).unwrap().structured_content.unwrap()["changes"].as_array().unwrap().len(), 1);
    assert!(call("syllabus_list", serde_json::json!({"course": "../voice"})).is_err());
    assert!(call("courses_list", serde_json::json!({})).unwrap().structured_content.unwrap()["courses"].as_array().unwrap().len() == 2);

    // Pictures per course, and the app's course still at /texts/images.
    let router = crate::build_router(app.clone(), &cfg);
    let get = |uri: &str| Request::builder().uri(uri).header("host", "127.0.0.1:7878").body(Body::empty()).unwrap();
    assert_eq!(router.clone().oneshot(get("/courses/mandarin/images/tones.webp")).await.unwrap().status(), StatusCode::OK);
    assert_eq!(router.clone().oneshot(get("/texts/images/cover.webp")).await.unwrap().status(), StatusCode::OK);
    assert_eq!(router.clone().oneshot(get("/courses/voice/images/cover.webp")).await.unwrap().status(), StatusCode::OK);

    // The Courses app: a course's files, then going back to its original, which history can undo.
    use http_body_util::BodyExt;
    let json = |r: axum::response::Response| async move { serde_json::from_slice::<serde_json::Value>(&r.into_body().collect().await.unwrap().to_bytes()).unwrap() };
    let files = json(router.clone().oneshot(get("/api/syllabus?course=mandarin")).await.unwrap()).await;
    assert_eq!((files["using"].as_str(), files["files"].as_array().unwrap().iter().any(|f| f["status"] == "changed")), (Some("mine"), true));
    let post = Request::builder().method("POST").uri("/api/syllabus/reset?course=mandarin").header("host", "127.0.0.1:7878").header("content-type", "application/json")
        .body(Body::from(r#"{"note":"Went back to the original from Courses"}"#)).unwrap();
    assert_eq!(router.clone().oneshot(post).await.unwrap().status(), StatusCode::OK);
    assert_eq!(syllabus::list(&app, &m)["using"], "original");
    assert_eq!(json(router.clone().oneshot(get("/api/syllabus/history?course=mandarin")).await.unwrap()).await["changes"][0]["action"], "reset");
    let zh_texts = json(router.clone().oneshot(get("/api/texts?course=mandarin")).await.unwrap()).await;
    assert_eq!((zh_texts["levels"][0]["id"].as_str(), zh_texts["edition"]["course"].as_str()), (Some("greetings"), Some("mandarin")));
    assert_eq!(json(router.clone().oneshot(get("/api/texts")).await.unwrap()).await["edition"]["course"], "voice");
    assert_eq!(router.oneshot(get("/api/syllabus?course=nope")).await.unwrap().status(), StatusCode::BAD_REQUEST);
}

/// A remix saves its files as one change (one undo), with the usual checks; without a ChatGPT
/// account it asks you to connect one.
#[tokio::test]
async fn a_remix_is_one_change_and_needs_chatgpt() {
    use crate::{courses, courses::syllabus};
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use http_body_util::BodyExt;
    use tower::ServiceExt;
    let (dir, app) = app();
    let v = courses::get(&app, "voice").unwrap();
    let read = |n: &str| std::fs::read_to_string(root().join("content/courses/voice").join(n)).unwrap();
    let a = read("01-warmup.md").replace("title: Warm-ups", "title: Short warm-ups");
    let b = read("02-m-words.md").replace("title: M and N words", "title: M words");
    syllabus::write_many(&app, &v, vec![("01-warmup.md".into(), a), ("02-m-words.md".into(), b)], "Shorter titles").unwrap();
    let h = syllabus::history(&app, &v);
    assert_eq!((h["changes"].as_array().unwrap().len(), h["changes"][0]["action"].as_str()), (1, Some("remix")));
    let locked = read("index.md").replace("It should never hurt.", "Push through it.");
    assert!(syllabus::write_many(&app, &v, vec![("index.md".into(), locked)], "tougher").is_err());
    syllabus::undo(&app, &v).unwrap();
    assert_eq!(syllabus::list(&app, &v)["using"], "original");

    let router = crate::build_router(app.clone(), &config(dir.path()));
    let req = Request::builder().method("POST").uri("/api/mixtape/remix").header("host", "127.0.0.1:7878").header("content-type", "application/json")
        .body(Body::from(r#"{"request":"Make the warm-ups shorter"}"#)).unwrap();
    let res = router.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);
    let body = String::from_utf8(res.into_body().collect().await.unwrap().to_bytes().to_vec()).unwrap();
    assert!(body.contains("Connect ChatGPT"), "{body}");
}

/// "New chapter" adds a blank one to your mixtape that Lilt can read, numbered after the last.
#[tokio::test]
async fn a_blank_chapter_lands_in_your_mixtape() {
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use http_body_util::BodyExt;
    use tower::ServiceExt;
    let (dir, app) = app();
    let router = crate::build_router(app.clone(), &config(dir.path()));
    let post = || Request::builder().method("POST").uri("/api/mixtape/chapter").header("host", "127.0.0.1:7878").header("content-type", "application/json").body(Body::from("{}")).unwrap();
    let res = router.clone().oneshot(post()).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let v: serde_json::Value = serde_json::from_slice(&res.into_body().collect().await.unwrap().to_bytes()).unwrap();
    assert_eq!((v["chapter"].as_str(), v["file"].as_str()), (Some("my-chapter-1"), Some("09-my-chapter-1.md")));
    let res = router.oneshot(post()).await.unwrap();
    let v: serde_json::Value = serde_json::from_slice(&res.into_body().collect().await.unwrap().to_bytes()).unwrap();
    assert_eq!(v["file"].as_str(), Some("10-my-chapter-2.md"));
    let t = crate::courses::syllabus::texts(&app);
    assert_eq!(t["levels"].as_array().unwrap().last().unwrap()["title"], "New chapter");
}

/// A blank chapter is a draft: Practice lists it, but Today's cards skip its placeholder texts.
#[test]
fn draft_chapters_make_no_cards() {
    let (_dir, app) = app();
    let v = crate::courses::get(&app, "voice").unwrap();
    let blank = "---\nid: my-chapter-1\ntitle: New chapter\nkind: phrases\ndraft: true\n---\n\nSay what this chapter is for.\n\n## first\n\nYour first text goes here.\n\n> A hint goes here.\n";
    crate::courses::syllabus::write(&app, &v, "09-my-chapter-1.md", blank, "Added a blank chapter").unwrap();
    assert!(crate::courses::syllabus::texts(&app)["levels"].as_array().unwrap().iter().any(|l| l["id"] == "my-chapter-1"));
    assert!(!crate::practice::cards::all_cards(&app).iter().any(|c| c.id.contains("my-chapter-1")));
    crate::courses::syllabus::write(&app, &v, "09-my-chapter-1.md", &blank.replace("draft: true\n", ""), "Filled in").unwrap();
    assert!(crate::practice::cards::all_cards(&app).iter().any(|c| c.id == "text.my-chapter-1.first"));
}
