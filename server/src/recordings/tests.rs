//! Recording and upload scenarios (PRD §14): chunked upload, finalising, recovery after a restart, deletion.

use crate::analysis;
use crate::app::App;
use crate::coach::validate;
use crate::recordings::model::*;
use crate::recordings::{self, ChunkOutcome, FinalizeReq, NewTake, UploadError};
use crate::store;
use crate::test_support::*;

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
