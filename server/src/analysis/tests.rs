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

#[test]
fn resonance_change_is_measured_between_takes_of_the_same_text() {
    let (_d, app) = app();
    let s = session(&app);
    // Synthetic /a/ at 120 Hz, then the same vowel from a 12 % shorter tract (+1.96 st).
    let a = upload(&app, &s.id, T::default(), "vowel_a_120_100.wav");
    let b = upload(&app, &s.id, T::default(), "vowel_a_120_112.wav");
    let c = compare::compare(&app, &a.id, &b.id).unwrap();
    let r = c.measures.iter().find(|m| m.name == "resonance_f2_f3_st").unwrap();
    let d = r.delta.unwrap();
    assert!((d - 1.96).abs() < 0.5, "brighter by about 1.96 st, got {d}");
    let same = compare::compare(&app, &a.id, &a.id).unwrap();
    let r = same.measures.iter().find(|m| m.name == "resonance_f2_f3_st").unwrap();
    assert!(r.delta.unwrap().abs() < 1e-9);
}

/// A take deleted while the helper runs doesn't get its analysis run (or job) written back.
#[test]
fn take_deleted_mid_analysis_leaves_no_run_behind() {
    use std::os::unix::fs::PermissionsExt;
    let dir = tempfile::tempdir().unwrap();
    let mut cfg = config(dir.path());
    // The real helper, then the take goes away (as `delete_take` would) before the result is saved.
    let script = dir.path().join("python-then-delete.sh");
    std::fs::write(&script, format!(
        "#!/bin/sh\n\"{}\" \"$@\"\nwhile [ $# -gt 0 ]; do [ \"$1\" = --input ] && rm -rf \"$(dirname \"$2\")\"; shift; done\n",
        cfg.python
    )).unwrap();
    std::fs::set_permissions(&script, std::fs::Permissions::from_mode(0o755)).unwrap();
    cfg.python = script.to_string_lossy().into();
    let app = App::open(cfg).unwrap();
    let s = session(&app);
    let id = new_take(&app, &s.id, T::default(), "audio/webm;codecs=opus");
    let bytes = fixture("harmonic_240.webm");
    crate::recordings::put_chunk(&app, &id, 0, &bytes, None).unwrap();
    crate::recordings::finalize(&app, &id, crate::recordings::FinalizeReq { chunk_count: 1, interrupted: false }).unwrap();
    analysis::run_pending(&app);
    assert!(app.take(&id).is_err());
    assert!(store::list_files_with_ext(&app.paths.analyses_dir(&s.id), "json").is_empty(), "no analysis run recreated");
    assert!(!app.paths.jobs().join(format!("analyze-{id}.json")).exists(), "no job left behind");
}

/// A helper that runs too long is killed and reaped, and its log doesn't stay in .tmp.
#[test]
fn timed_out_helper_is_reaped_and_its_log_removed() {
    let dir = tempfile::tempdir().unwrap();
    let log = dir.path().join("run.stderr.log");
    let pid_file = dir.path().join("pid");
    let mut cmd = std::process::Command::new("sh");
    cmd.arg("-c").arg(format!("echo $$ > '{}'; exec sleep 30", pid_file.display()));
    let start = std::time::Instant::now();
    let err = analysis::run_with_timeout(cmd, &log, std::time::Duration::from_millis(300)).unwrap_err();
    assert!(err.to_string().contains("timed out"));
    assert!(start.elapsed() < std::time::Duration::from_secs(10));
    assert!(!log.exists(), "log removed");
    let pid = std::fs::read_to_string(&pid_file).unwrap();
    let ps = std::process::Command::new("ps").args(["-o", "stat=", "-p", pid.trim()]).output().unwrap();
    assert!(String::from_utf8_lossy(&ps.stdout).trim().is_empty(), "no zombie left: {:?}", String::from_utf8_lossy(&ps.stdout));
}
