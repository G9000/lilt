//! Shared helpers for the acceptance-scenario tests (PRD §14): a temporary data root, the real
//! Python analysis helper, and fixed fixture audio from analysis/tests/fixtures.

use crate::analysis;
use crate::app::{App, Config, Shared};
use crate::coach::{model::*, validate};
use crate::recordings::model::*;
use crate::recordings::{self, ComfortInput, FinalizeReq, NewSession, NewTake, SessionUpdate, TakeUpdate};
use crate::store;
use std::collections::BTreeMap;
use std::path::PathBuf;

pub fn root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).parent().unwrap().to_path_buf()
}

pub fn fixture(name: &str) -> Vec<u8> {
    std::fs::read(root().join("analysis/tests/fixtures").join(name)).unwrap()
}

pub fn config(data: &std::path::Path) -> Config {
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

pub fn app() -> (tempfile::TempDir, Shared) {
    let dir = tempfile::tempdir().unwrap();
    let a = App::open(config(dir.path())).unwrap();
    (dir, a)
}

pub fn session(app: &App) -> Session {
    recordings::create_session(app, NewSession { kind: SessionKind::Full }).unwrap()
}

pub struct T<'a> {
    pub role: TakeRole,
    pub prompt: &'a str,
    pub exercise: Option<&'a str>,
    pub device: &'a str,
    pub retry_of: Option<String>,
}

impl Default for T<'_> {
    fn default() -> Self {
        T { role: TakeRole::Exercise, prompt: "nhsfife.forward-hum.m-words", exercise: Some("nhsfife.forward-hum"), device: "Mic A", retry_of: None }
    }
}

pub fn new_take(app: &App, sid: &str, t: T, mime: &str) -> String {
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
pub fn upload(app: &App, sid: &str, t: T, file: &str) -> Take {
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

pub fn report(app: &App, tid: &str, q: &str, a: &str) {
    let mut m = BTreeMap::new();
    m.insert(q.to_string(), a.to_string());
    recordings::update_take(app, tid, TakeUpdate { favourite: None, note: None, self_report: Some(m), read_along: None }).unwrap();
}

pub fn comfort(app: &App, sid: &str, c: Comfort, effort: u8, hoarse: bool) {
    recordings::update_session(app, sid, SessionUpdate {
        comfort: Some(ComfortInput { comfort: c, effort: Some(effort), hoarseness: hoarse, likes_sound: None, note: None }),
        notes: None,
        complete: Some(true),
    }).unwrap();
}

pub fn agent_input(sid: &str, key: &str, p: Pointer) -> validate::AgentReviewInput {
    validate::AgentReviewInput {
        session_id: sid.into(), idempotency_key: key.into(), author_name: "test-agent".into(), model: None,
        received_audio: false, active_pointer: Some(p), other_observations: vec![], abstention: None, summary: None,
    }
}

pub fn measured_pointer(t: &Take, value: f64, obs: &str) -> Pointer {
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
