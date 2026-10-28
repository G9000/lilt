//! Analysis scenarios (PRD §14) with the real Python helper: crashes and restarts, comparability, re-measuring.

use crate::analysis::{self, Job, compare};
use crate::app::App;
use crate::recordings::model::*;
use crate::store;
use crate::test_support::*;

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
