//! Coaching scenarios (PRD §14): the rules' decisions, pausing on pain, disagreement, and agent review validation.

use crate::coach::{self, model::*, validate};
use crate::practice::progress;
use crate::recordings::model::*;
use crate::test_support::*;

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
    assert_eq!(
        res.state, "recording_issue",
        "a recording fault is not a low skill score"
    );
}

#[test]
fn useful_coaching_selects_a_cue_and_matched_retry_updates() {
    let (_d, app) = app();
    let s = session(&app);
    let t = upload(&app, &s.id, T::default(), "mixed_voiced_unvoiced.webm");
    report(&app, &t.id, "brighter_easy", "effort");
    comfort(&app, &s.id, Comfort::Comfortable, 3, false);
    let r = coach::review_session(&app, &s.id).unwrap();
    let p = r.active_pointer.clone().unwrap();
    assert_eq!(p.kind, PointerKind::PracticeFocus);
    let na = p.next_action.clone().unwrap();
    assert_eq!(na.exercise_id, "nhsfife.forward-hum");
    let ex = app
        .registry
        .read()
        .unwrap()
        .get("nhsfife.forward-hum", 1)
        .unwrap()
        .clone();
    let cue = ex.cue(na.cue_id.as_deref().unwrap()).unwrap();
    assert_eq!(cue.use_when, "target_not_met");
    assert!(
        p.evidence[0].segment.is_none(),
        "self-report evidence has no invented timestamp"
    );
    assert_eq!(
        app.current_plan().unwrap().cue_id,
        na.cue_id,
        "plan keeps the task with the new cue"
    );
    // Idempotent review.
    assert_eq!(coach::review_session(&app, &s.id).unwrap().id, r.id);
    // Matched retry.
    let retry = upload(
        &app,
        &s.id,
        T {
            role: TakeRole::Retry,
            retry_of: Some(t.id.clone()),
            ..T::default()
        },
        "mixed_voiced_unvoiced.webm",
    );
    assert_eq!(retry.retry_of.as_deref(), Some(t.id.as_str()));
    report(&app, &retry.id, "brighter_easy", "brighter_easy");
    let r2 = coach::review_session(&app, &s.id).unwrap();
    assert_ne!(r2.id, r.id);
    let p2 = r2.active_pointer.unwrap();
    assert!(p2.observation.contains("brighter, and easy"));
    assert!(
        r2.other_observations
            .iter()
            .any(|o| o.observation.starts_with("Original and retry"))
    );
    // Original take untouched.
    assert_eq!(
        app.take(&t.id).unwrap().original.unwrap().sha256,
        t.original.unwrap().sha256
    );
}

#[test]
fn pain_report_pauses_and_overrides_a_favourable_report() {
    let (_d, app) = app();
    let s = session(&app);
    let t = upload(&app, &s.id, T::default(), "harmonic_240.webm");
    report(&app, &t.id, "brighter_easy", "brighter_easy");
    comfort(&app, &s.id, Comfort::Pain, 5, true);
    let r = coach::review_session(&app, &s.id).unwrap();
    let p = r.active_pointer.unwrap();
    assert_eq!(p.kind, PointerKind::Pause);
    assert!(r.proposed_plan.is_none(), "no escalation offered");
    let plan = app.current_plan().unwrap();
    assert!(plan.paused);
    assert_eq!(plan.exercise_id, "nhsfife.forward-hum");
}

/// An automatic plan change keeps a pause the learner set; only resuming lifts it.
#[test]
fn automatic_review_keeps_a_learners_pause() {
    let (_d, app) = app();
    let cur = app.ensure_plan().unwrap();
    let v = cur.version;
    app.write_plan(
        crate::practice::model::Plan {
            paused: true,
            author: "learner".into(),
            ..cur
        },
        Some(v),
    )
    .unwrap();
    let s = session(&app);
    let t = upload(&app, &s.id, T::default(), "mixed_voiced_unvoiced.webm");
    report(&app, &t.id, "brighter_easy", "effort");
    comfort(&app, &s.id, Comfort::Comfortable, 3, false);
    let r = coach::review_session(&app, &s.id).unwrap();
    let plan = app.current_plan().unwrap();
    assert_eq!(
        plan.cue_id,
        r.active_pointer.unwrap().next_action.unwrap().cue_id,
        "the change itself still applies"
    );
    assert!(plan.paused, "the learner's pause stays");
}

#[test]
fn stable_and_next_context_need_repeated_sessions() {
    let (_d, app) = app();
    let mut last = None;
    for effort in [4u8, 3, 2] {
        let s = session(&app);
        let t = upload(&app, &s.id, T::default(), "harmonic_240.webm");
        report(&app, &t.id, "brighter_easy", "brighter_easy");
        comfort(&app, &s.id, Comfort::Comfortable, effort, false);
        last = Some(coach::review_session(&app, &s.id).unwrap());
        if effort == 4 {
            assert_eq!(
                last.as_ref().unwrap().active_pointer.as_ref().unwrap().kind,
                PointerKind::MoreEvidence,
                "one session is not a pattern"
            );
        }
        if effort == 3 {
            assert_eq!(
                last.as_ref().unwrap().active_pointer.as_ref().unwrap().kind,
                PointerKind::Stable
            );
        }
    }
    let r = last.unwrap();
    assert_eq!(
        r.active_pointer.as_ref().unwrap().kind,
        PointerKind::Progress,
        "easier across 3 matched sessions"
    );
    let pp = r.proposed_plan.expect("next context offered, not imposed");
    assert_eq!(pp.exercise_id, "nhsfife.smile-brighten");
    assert_eq!(
        app.current_plan().unwrap().exercise_id,
        "nhsfife.forward-hum",
        "plan unchanged until accepted"
    );
    let cards = progress::skill_cards(&app);
    assert_eq!(
        cards.iter().find(|c| c.area == "resonance").unwrap().state,
        "progress"
    );
    assert_eq!(
        cards.iter().find(|c| c.area == "pitch").unwrap().state,
        "not_assessed",
        "no pitch claim from F0"
    );
}

#[test]
fn skipped_and_missing_evidence_never_becomes_a_low_state() {
    let (_d, app) = app();
    let cards = progress::skill_cards(&app);
    assert!(
        cards
            .iter()
            .filter(|c| c.area != "listening")
            .all(|c| c.state == "not_assessed")
    );
    let s = session(&app);
    upload(&app, &s.id, T::default(), "harmonic_240.webm"); // no self-report
    comfort(&app, &s.id, Comfort::Comfortable, 2, false);
    let r = coach::review_session(&app, &s.id).unwrap();
    assert!(r.active_pointer.is_none() && r.abstention.is_some());
    let res = progress::skill_cards(&app)
        .into_iter()
        .find(|c| c.area == "resonance")
        .unwrap();
    assert_eq!(res.state, "more_evidence");
    let carry = progress::skill_cards(&app)
        .into_iter()
        .find(|c| c.area == "carryover")
        .unwrap();
    assert_eq!(carry.state, "not_assessed");
    assert!(
        r.other_observations
            .iter()
            .any(|o| o.area == "carryover" && o.observation.contains("unscripted"))
    );
}

#[test]
fn disagreement_is_kept_and_carried_forward() {
    let (_d, app) = app();
    let s = session(&app);
    let t = upload(&app, &s.id, T::default(), "harmonic_240.webm");
    report(&app, &t.id, "brighter_easy", "effort");
    comfort(&app, &s.id, Comfort::Comfortable, 3, false);
    let r = coach::review_session(&app, &s.id).unwrap();
    let before =
        std::fs::read(app.paths.reviews_dir(&s.id).join(format!("{}.json", r.id))).unwrap();
    coach::respond(
        &app,
        &r.id,
        ReviewResponse {
            review_id: r.id.clone(),
            pointer_id: Some("p1".into()),
            response: "disagree".into(),
            note: Some("felt it in my lips".into()),
            chosen_exercise_id: None,
            created_utc: String::new(),
        },
    )
    .unwrap();
    let after = std::fs::read(app.paths.reviews_dir(&s.id).join(format!("{}.json", r.id))).unwrap();
    assert_eq!(before, after, "the review itself is not rewritten");
    assert_eq!(
        app.review_responses(&r)[0].note.as_deref(),
        Some("felt it in my lips")
    );
    let s2 = session(&app);
    let t2 = upload(&app, &s2.id, T::default(), "harmonic_240.webm");
    report(&app, &t2.id, "brighter_easy", "effort");
    comfort(&app, &s2.id, Comfort::Comfortable, 3, false);
    let r2 = coach::review_session(&app, &s2.id).unwrap();
    assert!(
        r2.active_pointer
            .unwrap()
            .confidence_basis
            .uncertainty
            .contains("felt it in my lips")
    );
}

// ---------- agent review validation ----------

#[test]
fn invalid_agent_reviews_are_rejected_and_valid_ones_are_idempotent() {
    let (_d, app) = app();
    let s = session(&app);
    let t = upload(&app, &s.id, T::default(), "harmonic_240.webm");
    let v = app.take_analysis(&t).unwrap()["measures"]["f0_median_hz"]["value"]
        .as_f64()
        .unwrap();
    let shown = (v * 10.0).round() / 10.0;
    let ok = measured_pointer(
        &t,
        shown,
        &format!("Median pitch was {shown} Hz in this take."),
    );
    let (r1, created) =
        validate::save_agent_review(&app, agent_input(&s.id, "k1", ok.clone())).unwrap();
    assert!(created);
    let (r2, created2) =
        validate::save_agent_review(&app, agent_input(&s.id, "k1", ok.clone())).unwrap();
    assert!(!created2 && r1.id == r2.id);

    let err = |p: Pointer| {
        format!(
            "{:#}",
            validate::save_agent_review(
                &app,
                agent_input(&s.id, &uuid::Uuid::new_v4().to_string(), p)
            )
            .unwrap_err()
        )
    };
    assert!(
        err(measured_pointer(&t, 999.0, "Median 999 Hz.")).contains("does not match stored value")
    );
    assert!(
        err(measured_pointer(
            &t,
            shown,
            &format!("I hear your resonance at {shown} Hz.")
        ))
        .contains("hearing claim")
    );
    assert!(
        err(measured_pointer(
            &t,
            shown,
            "Your larynx position is high and you are 80% feminine."
        ))
        .contains("prohibited claim")
    );
    assert!(
        err(measured_pointer(
            &t,
            shown,
            &format!("Median was {shown} Hz but range was 12 st.")
        ))
        .contains("not backed")
    );
    let mut ghost = measured_pointer(&t, shown, "x");
    ghost.evidence[0].take_id = Some("nonexistent-take".into());
    assert!(err(ghost).contains("does not exist"));
    let mut bad_ex = measured_pointer(&t, shown, "Descriptive only.");
    bad_ex.next_action = Some(NextAction {
        exercise_id: "made.up".into(),
        exercise_version: 1,
        cue_id: None,
        cue_text: None,
        summary: "do it".into(),
    });
    assert!(err(bad_ex).contains("not in the registry"));
    let mut bad_cue = measured_pointer(&t, shown, "Descriptive only.");
    bad_cue.next_action = Some(NextAction {
        exercise_id: "nhsfife.forward-hum".into(),
        exercise_version: 1,
        cue_id: Some("push-harder".into()),
        cue_text: None,
        summary: "do it".into(),
    });
    assert!(err(bad_cue).contains("cue push-harder"));
    let mut model = measured_pointer(&t, shown, "Descriptive only.");
    model.evidence[0].class = EvidenceClass::ModelPerceived;
    assert!(err(model).contains("model-perceived evidence is disabled"));
}

/// Forward hum v2 is judged by what you hear (brighter and easy). Where you felt the buzz is kept as
/// information only, so "throat or chest" is no longer a miss. Version 1 still scores old takes as before.
#[test]
fn forward_hum_v2_scores_what_you_hear_not_where_you_feel_it() {
    let (_d, app) = app();
    let s = session(&app);
    let id = new_take(&app, &s.id, T::default(), "audio/wav");
    let mut t = app.take(&id).unwrap();
    let reg = app.registry.read().unwrap();
    let (v1, v2) = (
        reg.get("nhsfife.forward-hum", 1).unwrap(),
        reg.get("nhsfife.forward-hum", 2).unwrap(),
    );
    let answers = |pairs: &[(&str, &str)]| {
        Some(TakeSelfReport {
            answers: pairs
                .iter()
                .map(|(q, a)| (q.to_string(), a.to_string()))
                .collect(),
            reported_utc: "2026-11-01T00:00:00Z".into(),
        })
    };
    t.self_report = answers(&[("where_felt", "throat_chest")]);
    assert_eq!(
        coach::take_signal(v1, &t).map(|x| x.0).as_deref(),
        Some("target_not_met"),
        "v1 unchanged"
    );
    t.exercise_version = Some(2);
    assert_eq!(
        coach::take_signal(v2, &t),
        None,
        "where you felt it alone isn't a result"
    );
    t.self_report = answers(&[
        ("brighter_easy", "brighter_easy"),
        ("where_felt", "throat_chest"),
    ]);
    assert_eq!(
        coach::take_signal(v2, &t).map(|x| x.0).as_deref(),
        Some("target_met")
    );
    t.self_report = answers(&[
        ("brighter_easy", "effort"),
        ("where_felt", "lips_face_nose"),
    ]);
    assert_eq!(
        coach::take_signal(v2, &t).map(|x| x.0).as_deref(),
        Some("target_not_met")
    );
    assert_eq!(reg.latest("nhsfife.forward-hum").unwrap().version, 2);
    assert_eq!(reg.latest("nhsfife.smile-brighten").unwrap().version, 2);
}
