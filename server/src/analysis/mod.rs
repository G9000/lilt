//! Persisted analysis jobs. Job and run IDs are derived from the take, so repeated
//! finalisation or a restart mid-job cannot produce duplicate results.

pub mod compare;
pub mod routes;

use crate::app::{App, Shared};
use crate::recordings::model::*;
use crate::store;
use crate::util;
use anyhow::{Result, anyhow};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::time::Duration;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Job {
    pub schema: String,
    pub id: String,
    pub kind: String,
    pub session_id: String,
    pub take_id: String,
    pub status: String,
    pub attempts: u32,
    pub run_id: String,
    pub created_utc: String,
    pub updated_utc: String,
    pub error: Option<String>,
}

pub const ANALYSIS_MAJOR: &str = "a1";
const MAX_ATTEMPTS: u32 = 3;
/// The analysis method the bundled helper reports (`method.method_version`). Takes measured with
/// another version can be re-measured; `tests` checks this matches the helper.
pub const ANALYSIS_METHOD: &str = "lilt-analysis/2";

pub fn run_id_for(tid: &str) -> String {
    format!("run-{tid}-{ANALYSIS_MAJOR}")
}

fn job_path(app: &App, tid: &str) -> std::path::PathBuf {
    app.paths.jobs().join(format!("analyze-{tid}.json"))
}

pub fn enqueue_analysis(app: &App, t: &Take) -> Result<()> {
    let path = job_path(app, &t.id);
    if !path.exists() {
        let now = util::now_utc();
        let job = Job {
            schema: "lilt.job/1".into(),
            id: format!("analyze-{}", t.id),
            kind: "analyze".into(),
            session_id: t.session_id.clone(),
            take_id: t.id.clone(),
            status: "pending".into(),
            attempts: 0,
            run_id: run_id_for(&t.id),
            created_utc: now.clone(),
            updated_utc: now,
            error: None,
        };
        store::write_json(&path, &job)?;
    }
    set_take_status(app, &t.id, TakeStatus::AnalysisPending, None, None)?;
    app.job_notify.notify_one();
    Ok(())
}

fn set_take_status(
    app: &App,
    tid: &str,
    status: TakeStatus,
    run: Option<String>,
    err: Option<String>,
) -> Result<()> {
    let _g = app.write_lock.lock().unwrap();
    let mut t = app.take(tid)?;
    t.status = status;
    if run.is_some() {
        t.analysis_run = run;
    }
    t.analysis_error = err;
    app.save_take(&t)
}

pub fn jobs(app: &App) -> Vec<Job> {
    store::list_files_with_ext(&app.paths.jobs(), "json")
        .iter()
        .filter_map(|p| store::read_json(p).ok())
        .collect()
}

/// Jobs left `running` by a crash go back to `pending`.
pub fn reconcile(app: &App) -> Result<usize> {
    let mut n = 0;
    for mut j in jobs(app) {
        if j.status == "running" {
            j.status = "pending".into();
            j.updated_utc = util::now_utc();
            store::write_json(&job_path(app, &j.take_id), &j)?;
            n += 1;
        }
    }
    Ok(n)
}

pub fn retry_failed(app: &App, tid: &str) -> Result<()> {
    let path = job_path(app, tid);
    let mut j: Job = store::read_json(&path).map_err(|_| anyhow!("no analysis job for take"))?;
    j.status = "pending".into();
    j.attempts = 0;
    j.error = None;
    store::write_json(&path, &j)?;
    set_take_status(app, tid, TakeStatus::AnalysisPending, None, None)?;
    app.job_notify.notify_one();
    Ok(())
}

/// Measure a take again with the current analysis, as a new run (`…-a2`, `…-a3`, …). Earlier runs
/// stay on disk, so reviews that cite them keep their evidence; the take points at the new run
/// once it succeeds, and keeps its old measurement if it fails. Returns the new run id.
pub fn remeasure(app: &App, tid: &str) -> Result<String> {
    let t = app.take(tid)?;
    if t.original.is_none() {
        return Err(anyhow!("take has no recording to measure"));
    }
    if matches!(t.status, TakeStatus::AnalysisPending) {
        return Err(anyhow!("take is already being measured"));
    }
    let prefix = format!("run-{tid}-a");
    let latest = store::list_files_with_ext(&app.paths.analyses_dir(&t.session_id), "json")
        .iter()
        .filter_map(|p| p.file_stem()?.to_str()?.strip_prefix(&prefix)?.parse::<u32>().ok())
        .max()
        .unwrap_or(1);
    let run_id = format!("{prefix}{}", latest + 1);
    let now = util::now_utc();
    let job = Job {
        schema: "lilt.job/1".into(),
        id: format!("analyze-{tid}"),
        kind: "remeasure".into(),
        session_id: t.session_id.clone(),
        take_id: tid.into(),
        status: "pending".into(),
        attempts: 0,
        run_id: run_id.clone(),
        created_utc: now.clone(),
        updated_utc: now,
        error: None,
    };
    store::write_json(&job_path(app, tid), &job)?;
    set_take_status(app, tid, TakeStatus::AnalysisPending, None, None)?;
    app.job_notify.notify_one();
    Ok(run_id)
}

/// Re-measure every take whose current analysis came from an older method. Returns how many.
pub fn remeasure_stale(app: &App) -> Result<usize> {
    let stale: Vec<String> = app
        .all_takes()
        .into_iter()
        .filter(|t| t.original.is_some() && matches!(t.status, TakeStatus::ReviewReady))
        .filter(|t| {
            let run = t.analysis_run.as_deref().unwrap_or_default();
            app.analysis(&t.session_id, run).map(|a| a["method"]["method_version"] != ANALYSIS_METHOD).unwrap_or(false)
        })
        .map(|t| t.id)
        .collect();
    for id in &stale {
        remeasure(app, id)?;
    }
    Ok(stale.len())
}

/// Run every pending job once (blocking). Used by the worker and by tests.
pub fn run_pending(app: &App) {
    let pending: Vec<Job> = jobs(app).into_iter().filter(|j| j.status == "pending").collect();
    for job in pending {
        if let Err(e) = run_job(app, job) {
            tracing::warn!("analysis job error: {e:#}");
        }
    }
}

pub async fn worker(app: Shared) {
    loop {
        let a = app.clone();
        let _ = tokio::task::spawn_blocking(move || run_pending(&a)).await;
        tokio::select! {
            _ = app.job_notify.notified() => {}
            _ = tokio::time::sleep(Duration::from_secs(30)) => {}
        }
    }
}

fn run_job(app: &App, mut job: Job) -> Result<()> {
    let Ok(t) = app.take(&job.take_id) else {
        // Take deleted while queued.
        let _ = std::fs::remove_file(job_path(app, &job.take_id));
        return Ok(());
    };
    let out_path = app
        .paths
        .analyses_dir(&t.session_id)
        .join(format!("{}.json", job.run_id));
    // A completed run from before a crash is reused, not duplicated.
    if let Ok(existing) = store::read_json::<Value>(&out_path) {
        if existing["status"] == "ok" {
            job.status = "done".into();
            job.updated_utc = util::now_utc();
            store::write_json(&job_path(app, &job.take_id), &job)?;
            set_take_status(app, &t.id, TakeStatus::ReviewReady, Some(job.run_id.clone()), None)?;
            return Ok(());
        }
    }
    job.status = "running".into();
    job.attempts += 1;
    job.updated_utc = util::now_utc();
    store::write_json(&job_path(app, &job.take_id), &job)?;

    let result = run_analyzer(app, &t, &job.run_id);
    match result {
        Ok(()) => {
            job.status = "done".into();
            job.error = None;
            set_take_status(app, &t.id, TakeStatus::ReviewReady, Some(job.run_id.clone()), None)?;
        }
        Err(e) => {
            let msg = format!("{e:#}");
            job.error = Some(msg.clone());
            job.status = if job.attempts >= MAX_ATTEMPTS { "failed" } else { "pending" }.into();
            if job.status == "failed" {
                // A failed re-measure leaves the earlier measurement in place.
                let status = if job.kind == "remeasure" && t.analysis_run.is_some() { TakeStatus::ReviewReady } else { TakeStatus::AnalysisFailed };
                set_take_status(app, &t.id, status, None, Some(msg))?;
            }
        }
    }
    job.updated_utc = util::now_utc();
    store::write_json(&job_path(app, &job.take_id), &job)?;

    // A finished analysis can change what the session's review may say. Re-measuring doesn't
    // rewrite feedback someone has already read; it only refreshes the numbers.
    if job.status == "done" && job.kind != "remeasure" {
        if let Ok(s) = app.session(&t.session_id) {
            if s.state == SessionState::Completed && s.kind.is_guided() {
                if let Err(e) = crate::coach::review_session(app, &s.id) {
                    tracing::warn!("auto review failed: {e:#}");
                }
            }
        }
    }
    Ok(())
}

fn run_analyzer(app: &App, t: &Take, run_id: &str) -> Result<()> {
    let orig = t.original.as_ref().ok_or_else(|| anyhow!("take has no original"))?;
    let dir = app.paths.take_dir(&t.session_id, &t.id);
    let input = dir.join(&orig.file);
    // Integrity check before analysis: the original must match its recorded hash.
    let sha = store::sha256_file(&input)?;
    if sha != orig.sha256 {
        return Err(anyhow!("original audio hash mismatch; refusing to analyse"));
    }
    let helper_out = app.paths.tmp().join(format!("{run_id}.helper.json"));
    let wav_out = dir.join("analysis.wav");
    let mut cmd = std::process::Command::new(&app.config.python);
    cmd.arg("-m")
        .arg("lilt_analysis")
        .arg("--input")
        .arg(&input)
        .arg("--wav-out")
        .arg(&wav_out)
        .arg("--out")
        .arg(&helper_out)
        .arg("--source-sha256")
        .arg(&orig.sha256)
        .arg("--run-id")
        .arg(run_id)
        .env("PYTHONPATH", &app.config.analysis_dir);
    let log_path = app.paths.tmp().join(format!("{run_id}.stderr.log"));
    let status = run_with_timeout(cmd, &log_path, Duration::from_secs(180))?;
    let stderr = std::fs::read_to_string(&log_path).unwrap_or_default();
    let _ = std::fs::remove_file(&log_path);
    let helper: Option<Value> = store::read_json_opt(&helper_out).ok().flatten();
    let _ = std::fs::remove_file(&helper_out);
    let Some(mut v) = helper else {
        return Err(anyhow!(
            "analysis helper produced no output (exit {:?}): {}",
            status.code(),
            stderr.chars().rev().take(600).collect::<String>().chars().rev().collect::<String>()
        ));
    };
    v["run_id"] = json!(run_id);
    v["take_id"] = json!(t.id);
    v["session_id"] = json!(t.session_id);
    v["prompt_id"] = json!(t.prompt_id);
    let out_path = app.paths.analyses_dir(&t.session_id).join(format!("{run_id}.json"));
    store::write_json(&out_path, &v)?;
    if v["status"] != "ok" {
        return Err(anyhow!(
            "analysis failed: {}",
            v["error"]["message"].as_str().unwrap_or("unknown error")
        ));
    }
    Ok(())
}

fn run_with_timeout(
    mut cmd: std::process::Command,
    log_path: &std::path::Path,
    limit: Duration,
) -> Result<std::process::ExitStatus> {
    use std::process::Stdio;
    let log = std::fs::File::create(log_path)?;
    let mut child = cmd
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::from(log))
        .spawn()
        .map_err(|e| anyhow!("could not start analysis helper ({e}); is the Python environment installed?"))?;
    let start = std::time::Instant::now();
    loop {
        if let Some(status) = child.try_wait()? {
            return Ok(status);
        }
        if start.elapsed() > limit {
            let _ = child.kill();
            return Err(anyhow!("analysis helper timed out"));
        }
        std::thread::sleep(Duration::from_millis(100));
    }
}
