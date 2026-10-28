//! Sessions, takes and the chunked upload protocol. Original bytes are written once
//! and never modified; take.json carries mutable status and annotations.

use crate::app::App;
use crate::model::*;
use crate::store;
use crate::util;
use anyhow::{Result, anyhow, bail};
use serde::Deserialize;
use serde_json::{Value, json};
use std::fs;
use std::io::Write;

#[derive(Debug)]
pub enum ChunkOutcome {
    Stored,
    AlreadyStored,
}

#[derive(Debug, thiserror::Error)]
pub enum UploadError {
    #[error("chunk {0} already stored with different content")]
    Conflict(u32),
    #[error("checksum mismatch for chunk {0}")]
    BadChecksum(u32),
    #[error("{0}")]
    Other(#[from] anyhow::Error),
}

#[derive(Debug, Deserialize)]
pub struct NewSession {
    pub kind: SessionKind,
}

/// Today's Studio session, created on first use.
pub fn studio_session(app: &App) -> Result<Session> {
    let (today, _) = util::local_now(&app.profile().timezone);
    if let Some(s) = app.sessions().into_iter().rev().find(|s| s.kind == SessionKind::Studio && s.local_date == today) {
        return Ok(s);
    }
    create_session(app, NewSession { kind: SessionKind::Studio })
}

/// Today's deck session, created on first use.
pub fn deck_session(app: &App) -> Result<Session> {
    let (today, _) = util::local_now(&app.profile().timezone);
    if let Some(s) = app.sessions().into_iter().rev().find(|s| s.kind == SessionKind::Deck && s.local_date == today) {
        return Ok(s);
    }
    create_session(app, NewSession { kind: SessionKind::Deck })
}

pub fn create_session(app: &App, req: NewSession) -> Result<Session> {
    let profile = app.profile();
    let plan = app.ensure_plan()?;
    let (local_date, local_ts) = util::local_now(&profile.timezone);
    let studio = !req.kind.is_guided();
    let s = Session {
        schema: "lilt.session/1".into(),
        id: util::new_id("s"),
        kind: req.kind,
        state: SessionState::InProgress,
        plan_version: Some(plan.version),
        exercise_id: (!studio).then(|| plan.exercise_id.clone()),
        exercise_version: (!studio).then_some(plan.exercise_version),
        focus_area: (!studio).then(|| plan.focus_area.clone()),
        ladder_step: if studio { None } else { plan.ladder_step },
        local_date,
        timezone: profile.timezone.clone(),
        started_utc: util::now_utc(),
        started_local: local_ts,
        completed_utc: None,
        comfort: None,
        notes: None,
    };
    app.save_session(&s)?;
    Ok(s)
}

#[derive(Debug, Deserialize)]
pub struct NewTake {
    pub take_id: String,
    pub session_id: String,
    pub role: TakeRole,
    #[serde(default = "phase_none")]
    pub phase: Phase,
    pub prompt_id: String,
    pub prompt_text: String,
    pub exercise_id: Option<String>,
    pub exercise_version: Option<u32>,
    pub cue_id: Option<String>,
    pub retry_of: Option<String>,
    pub triggered_by_review: Option<String>,
    pub triggered_by_pointer: Option<String>,
    pub mime: String,
    #[serde(default)]
    pub capture: Value,
    pub device_label: Option<String>,
}

fn phase_none() -> Phase {
    Phase::None
}

pub fn ext_for_mime(mime: &str) -> &'static str {
    let m = mime.to_ascii_lowercase();
    if m.starts_with("audio/webm") || m.starts_with("video/webm") {
        "webm"
    } else if m.starts_with("audio/mp4") || m.starts_with("video/mp4") || m.contains("aac") {
        "m4a"
    } else if m.starts_with("audio/ogg") {
        "ogg"
    } else if m.starts_with("audio/wav") || m.starts_with("audio/x-wav") || m.starts_with("audio/wave") {
        "wav"
    } else {
        "bin"
    }
}

/// Idempotent: the same take_id returns the existing record.
pub fn create_take(app: &App, req: NewTake) -> Result<Take> {
    store::check_id(&req.take_id)?;
    let _g = app.write_lock.lock().unwrap();
    if let Ok(existing) = app.take(&req.take_id) {
        if existing.session_id != req.session_id {
            bail!("take id already used in another session");
        }
        return Ok(existing);
    }
    let session = app.session(&req.session_id)?;
    if let Some(r) = &req.retry_of {
        app.take(r).map_err(|_| anyhow!("retry_of refers to an unknown take"))?;
    }
    if let (Some(id), Some(v)) = (&req.exercise_id, req.exercise_version) {
        app.registry.read().unwrap().eligible(id, v)?;
    }
    let t = Take {
        schema: "lilt.take/1".into(),
        id: req.take_id.clone(),
        session_id: session.id.clone(),
        role: req.role,
        phase: req.phase,
        prompt_id: req.prompt_id,
        prompt_text: req.prompt_text,
        exercise_id: req.exercise_id,
        exercise_version: req.exercise_version,
        cue_id: req.cue_id,
        retry_of: req.retry_of,
        triggered_by_review: req.triggered_by_review,
        triggered_by_pointer: req.triggered_by_pointer,
        ext: ext_for_mime(&req.mime).into(),
        mime: req.mime,
        capture: req.capture,
        device_label: req.device_label,
        status: TakeStatus::Recording,
        completeness: None,
        original: None,
        created_utc: util::now_utc(),
        finalized_utc: None,
        favourite: false,
        note: None,
        self_report: None,
        analysis_run: None,
        analysis_error: None,
        read_along: None,
        card: None,
    };
    fs::create_dir_all(app.paths.take_dir(&t.session_id, &t.id).join("chunks"))?;
    app.save_take(&t)?;
    app.index_take(&t.id, &t.session_id);
    Ok(t)
}

fn chunk_path(app: &App, t: &Take, seq: u32) -> std::path::PathBuf {
    app.paths
        .take_dir(&t.session_id, &t.id)
        .join("chunks")
        .join(format!("{seq:06}.part"))
}

pub fn put_chunk(
    app: &App,
    tid: &str,
    seq: u32,
    bytes: &[u8],
    claimed_sha: Option<&str>,
) -> Result<ChunkOutcome, UploadError> {
    let t = app.take(tid)?;
    let actual = store::sha256_hex(bytes);
    if let Some(c) = claimed_sha {
        if !c.eq_ignore_ascii_case(&actual) {
            return Err(UploadError::BadChecksum(seq));
        }
    }
    let path = chunk_path(app, &t, seq);
    if path.exists() {
        let existing = store::sha256_file(&path).map_err(UploadError::Other)?;
        return if existing == actual {
            Ok(ChunkOutcome::AlreadyStored)
        } else {
            Err(UploadError::Conflict(seq))
        };
    }
    if t.original.is_some() {
        return Err(UploadError::Other(anyhow!("take is already finalized")));
    }
    store::write_atomic(&path, bytes).map_err(UploadError::Other)?;
    Ok(ChunkOutcome::Stored)
}

#[derive(Debug, Deserialize)]
pub struct FinalizeReq {
    /// Number of chunks the client produced. Missing trailing chunks are labelled.
    pub chunk_count: u32,
    #[serde(default)]
    pub interrupted: bool,
}

/// Assemble the contiguous prefix of chunks into the original file. Idempotent.
pub fn finalize(app: &App, tid: &str, req: FinalizeReq) -> Result<Take> {
    let _g = app.write_lock.lock().unwrap();
    let mut t = app.take(tid)?;
    if t.original.is_some() {
        return Ok(t);
    }
    t.status = TakeStatus::Saving;
    app.save_take(&t)?;

    let dir = app.paths.take_dir(&t.session_id, &t.id);
    let mut present = 0u32;
    while chunk_path(app, &t, present).exists() {
        present += 1;
    }
    if present == 0 {
        t.status = TakeStatus::Recording;
        app.save_take(&t)?;
        bail!("no audio chunks have been received for this take");
    }
    let orig_name = format!("original.{}", t.ext);
    let orig_path = dir.join(&orig_name);
    let tmp = dir.join(format!(".{orig_name}.tmp"));
    {
        let mut out = fs::File::create(&tmp)?;
        for seq in 0..present {
            out.write_all(&fs::read(chunk_path(app, &t, seq))?)?;
        }
        out.sync_all()?;
    }
    fs::rename(&tmp, &orig_path)?;
    if let Ok(d) = fs::File::open(&dir) {
        let _ = d.sync_all();
    }
    let sha = store::sha256_file(&orig_path)?;
    let bytes = fs::metadata(&orig_path)?.len();
    store::write_atomic(&dir.join("original.sha256"), format!("{sha}  {orig_name}\n").as_bytes())?;

    t.completeness = Some(if present < req.chunk_count {
        Completeness::MissingTail
    } else if req.interrupted {
        Completeness::Interrupted
    } else {
        Completeness::Complete
    });
    t.original = Some(OriginalFile {
        file: orig_name,
        bytes,
        sha256: sha,
        chunk_count: present,
    });
    t.finalized_utc = Some(util::now_utc());
    t.status = TakeStatus::Saved;
    app.save_take(&t)?;
    // Chunks are redundant once the original is durable.
    let _ = fs::remove_dir_all(dir.join("chunks"));
    drop(_g);
    crate::analysis::enqueue_analysis(app, &t)?;
    app.take(tid)
}

/// At startup: any take still `recording`/`saving` with chunks is finalized from its
/// confirmed prefix and marked interrupted.
pub fn reconcile_interrupted(app: &App) -> Result<u32> {
    let mut n = 0;
    for t in app.all_takes() {
        if t.original.is_none() && matches!(t.status, TakeStatus::Recording | TakeStatus::Saving) {
            let has_chunk = chunk_path(app, &t, 0).exists();
            if has_chunk {
                let count = fs::read_dir(app.paths.take_dir(&t.session_id, &t.id).join("chunks"))
                    .map(|d| d.count() as u32)
                    .unwrap_or(0);
                finalize(app, &t.id, FinalizeReq { chunk_count: count, interrupted: true })?;
                n += 1;
            }
        }
    }
    Ok(n)
}

#[derive(Debug, Deserialize)]
pub struct TakeUpdate {
    pub favourite: Option<bool>,
    pub note: Option<String>,
    pub self_report: Option<std::collections::BTreeMap<String, String>>,
    #[serde(default)]
    pub read_along: Option<Value>,
}

pub fn update_take(app: &App, tid: &str, upd: TakeUpdate) -> Result<Take> {
    let _g = app.write_lock.lock().unwrap();
    let mut t = app.take(tid)?;
    if let Some(f) = upd.favourite {
        t.favourite = f;
    }
    if let Some(n) = upd.note {
        t.note = if n.trim().is_empty() { None } else { Some(n) };
    }
    if let Some(ra) = upd.read_along {
        let starts = ra.get("starts").and_then(|s| s.as_array()).ok_or_else(|| anyhow!("read_along.starts must be an array"))?;
        if starts.len() > 5000 || !starts.iter().all(|v| v.is_null() || v.as_f64().map(|x| (0.0..=36_000.0).contains(&x)).unwrap_or(false)) {
            bail!("read_along.starts must be up to 5000 times in seconds (or null)");
        }
        t.read_along = Some(json!({
            "starts": starts,
            "text": ra.get("text").and_then(|v| v.as_str()).map(|s| s.chars().take(4000).collect::<String>()),
            "method": "browser syllable-beat estimate (approximate; display only)",
        }));
    }
    if let Some(answers) = upd.self_report {
        if let (Some(id), Some(v)) = (&t.exercise_id, t.exercise_version) {
            let reg = app.registry.read().unwrap();
            let ex = reg.get(id, v).ok_or_else(|| anyhow!("exercise missing"))?;
            for (q, a) in &answers {
                if ex.signal(q, a).is_none() {
                    bail!("unknown answer {a} for question {q}");
                }
            }
        }
        t.self_report = Some(TakeSelfReport {
            answers,
            reported_utc: util::now_utc(),
        });
    }
    app.save_take(&t)?;
    Ok(t)
}

#[derive(Debug, Deserialize)]
pub struct SessionUpdate {
    pub comfort: Option<ComfortInput>,
    pub notes: Option<String>,
    pub complete: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct ComfortInput {
    pub comfort: Comfort,
    pub effort: Option<u8>,
    #[serde(default)]
    pub hoarseness: bool,
    pub likes_sound: Option<String>,
    pub note: Option<String>,
}

pub fn update_session(app: &App, sid: &str, upd: SessionUpdate) -> Result<Session> {
    let _g = app.write_lock.lock().unwrap();
    let mut s = app.session(sid)?;
    if let Some(c) = upd.comfort {
        if let Some(e) = c.effort {
            if !(1..=5).contains(&e) {
                bail!("effort must be 1-5");
            }
        }
        s.comfort = Some(ComfortReport {
            comfort: c.comfort,
            effort: c.effort,
            hoarseness: c.hoarseness,
            likes_sound: c.likes_sound,
            note: c.note,
            reported_utc: util::now_utc(),
        });
    }
    if let Some(n) = upd.notes {
        s.notes = Some(n);
    }
    if upd.complete == Some(true) && s.state != SessionState::Completed {
        s.state = SessionState::Completed;
        s.completed_utc = Some(util::now_utc());
    }
    app.save_session(&s)?;
    Ok(s)
}

fn log_deletion(app: &App, what: Value) -> Result<()> {
    let mut v = what;
    v["deleted_utc"] = json!(util::now_utc());
    store::append_line(&app.paths.deletions_log(), &v.to_string())
}

/// Reviews whose evidence references the take, other than in the take's own session.
pub fn dependent_reviews(app: &App, tid: &str) -> Vec<Review> {
    app.all_reviews()
        .into_iter()
        .filter(|r| {
            r.take_ids.iter().any(|t| t == tid)
                || r.active_pointer
                    .iter()
                    .chain(r.other_observations.iter())
                    .flat_map(|p| p.evidence.iter())
                    .any(|e| {
                        e.take_id.as_deref() == Some(tid)
                            || e.comparison_take_id.as_deref() == Some(tid)
                    })
        })
        .collect()
}

/// Delete one take, its derived copies and analyses. Dependent reviews are either
/// deleted or left in place; reads mark their missing evidence as deleted.
pub fn delete_take(app: &App, tid: &str, delete_reviews: bool) -> Result<Value> {
    let _g = app.write_lock.lock().unwrap();
    let t = app.take(tid)?;
    let deps = dependent_reviews(app, tid);
    let mut removed_runs = vec![];
    for p in store::list_files_with_ext(&app.paths.analyses_dir(&t.session_id), "json") {
        if let Ok(v) = store::read_json::<Value>(&p) {
            if v["take_id"].as_str() == Some(tid) {
                fs::remove_file(&p)?;
                removed_runs.push(p.file_stem().unwrap().to_string_lossy().into_owned());
            }
        }
    }
    fs::remove_dir_all(app.paths.take_dir(&t.session_id, tid))?;
    let _ = fs::remove_file(app.paths.jobs().join(format!("analyze-{tid}.json")));
    app.unindex_take(tid);
    let mut removed_reviews = vec![];
    if delete_reviews {
        for r in &deps {
            let dir = app.paths.reviews_dir(&r.session_id);
            for suffix in [".json", ".md", ".responses.jsonl"] {
                let _ = fs::remove_file(dir.join(format!("{}{suffix}", r.id)));
            }
            removed_reviews.push(r.id.clone());
        }
    }
    let summary = json!({
        "kind": "take", "take_id": tid, "session_id": t.session_id,
        "removed_analysis_runs": removed_runs,
        "removed_reviews": removed_reviews,
        "reviews_marked_evidence_deleted": if delete_reviews { vec![] } else { deps.iter().map(|r| r.id.clone()).collect::<Vec<_>>() },
    });
    log_deletion(app, summary.clone())?;
    Ok(summary)
}

pub fn delete_session(app: &App, sid: &str, delete_reviews: bool) -> Result<Value> {
    let s = app.session(sid)?;
    let tids: Vec<String> = app.takes_in(sid).into_iter().map(|t| t.id).collect();
    let mut external = vec![];
    for tid in &tids {
        for r in dependent_reviews(app, tid) {
            if r.session_id != sid && !external.contains(&r.id) {
                external.push(r.id.clone());
            }
        }
    }
    let _g = app.write_lock.lock().unwrap();
    if delete_reviews {
        for rid in &external {
            if let Ok(r) = app.review(rid) {
                let dir = app.paths.reviews_dir(&r.session_id);
                for suffix in [".json", ".md", ".responses.jsonl"] {
                    let _ = fs::remove_file(dir.join(format!("{}{suffix}", r.id)));
                }
            }
        }
    }
    fs::remove_dir_all(app.paths.session_dir(&s.id))?;
    for tid in &tids {
        app.unindex_take(tid);
        let _ = fs::remove_file(app.paths.jobs().join(format!("analyze-{tid}.json")));
    }
    let summary = json!({
        "kind": "session", "session_id": sid, "take_ids": tids,
        "other_reviews": external, "other_reviews_deleted": delete_reviews,
    });
    log_deletion(app, summary.clone())?;
    Ok(summary)
}
