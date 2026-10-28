//! Shared application state and record access.

use crate::exercises::Registry;
use crate::model::*;
use crate::store::{self, Paths};
use crate::util;
use anyhow::{Context, Result, anyhow};
use serde_json::Value;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::{Arc, Mutex, RwLock};
use tokio::sync::Notify;

#[derive(Clone, Debug)]
pub struct Config {
    pub data_dir: PathBuf,
    pub content_dir: PathBuf,
    pub web_dir: PathBuf,
    pub bind: String,
    pub python: String,
    pub analysis_dir: PathBuf,
    pub mcp_token: Option<String>,
}

impl Config {
    pub fn from_env() -> Self {
        let env = |k: &str, d: &str| std::env::var(k).unwrap_or_else(|_| d.to_string());
        let home = std::env::var("HOME").unwrap_or_else(|_| ".".into());
        Config {
            data_dir: env("LILT_DATA_DIR", &format!("{home}/Lilt/data")).into(),
            content_dir: env("LILT_CONTENT_DIR", "content").into(),
            web_dir: env("LILT_WEB_DIR", "web/dist").into(),
            bind: env("LILT_BIND", "127.0.0.1:7878"),
            python: env("LILT_PYTHON", "analysis/.venv/bin/python"),
            analysis_dir: env("LILT_ANALYSIS_DIR", "analysis").into(),
            mcp_token: std::env::var("LILT_MCP_TOKEN").ok().filter(|s| !s.is_empty()),
        }
    }
}

pub struct App {
    pub config: Config,
    pub paths: Paths,
    pub registry: RwLock<Registry>,
    pub prompts: Value,
    pub texts: Value,
    /// take_id -> session_id
    take_index: RwLock<HashMap<String, String>>,
    /// Serialises read-modify-write of JSON records.
    pub write_lock: Mutex<()>,
    pub job_notify: Notify,
}

pub type Shared = Arc<App>;

impl App {
    pub fn open(config: Config) -> Result<Shared> {
        let paths = Paths::new(&config.data_dir);
        paths.ensure_layout()?;
        let registry =
            crate::exercises::seed_and_load(&paths, &config.content_dir.join("exercises"))?;
        let prompts: Value = store::read_json(&config.content_dir.join("prompts/prompts.json"))
            .context("loading content/prompts/prompts.json")?;
        let texts = crate::texts::load(&config.content_dir.join("texts")).context("loading content/texts")?;
        let app = Arc::new(App {
            config,
            texts,
            paths,
            registry: RwLock::new(registry),
            prompts,
            take_index: RwLock::new(HashMap::new()),
            write_lock: Mutex::new(()),
            job_notify: Notify::new(),
        });
        app.rebuild_index();
        if !app.paths.profile().exists() {
            store::write_json(&app.paths.profile(), &Profile::default())?;
        }
        Ok(app)
    }

    pub fn rebuild_index(&self) {
        let mut idx = HashMap::new();
        for sid in store::list_dirs(&self.paths.sessions()) {
            for tid in store::list_dirs(&self.paths.session_dir(&sid).join("recordings")) {
                idx.insert(tid, sid.clone());
            }
        }
        *self.take_index.write().unwrap() = idx;
    }

    pub fn index_take(&self, tid: &str, sid: &str) {
        self.take_index
            .write()
            .unwrap()
            .insert(tid.to_string(), sid.to_string());
    }

    pub fn unindex_take(&self, tid: &str) {
        self.take_index.write().unwrap().remove(tid);
    }

    pub fn session_of_take(&self, tid: &str) -> Option<String> {
        self.take_index.read().unwrap().get(tid).cloned()
    }

    pub fn profile(&self) -> Profile {
        store::read_json(&self.paths.profile()).unwrap_or_default()
    }

    pub fn session(&self, sid: &str) -> Result<Session> {
        store::check_id(sid)?;
        store::read_json(&self.paths.session_file(sid)).map_err(|_| anyhow!("session not found"))
    }

    pub fn save_session(&self, s: &Session) -> Result<()> {
        store::write_json(&self.paths.session_file(&s.id), s)
    }

    pub fn sessions(&self) -> Vec<Session> {
        let mut v: Vec<Session> = store::list_dirs(&self.paths.sessions())
            .iter()
            .filter_map(|sid| self.session(sid).ok())
            .collect();
        v.sort_by(|a, b| a.started_utc.cmp(&b.started_utc));
        v
    }

    pub fn take_path(&self, tid: &str) -> Result<PathBuf> {
        store::check_id(tid)?;
        let sid = self.session_of_take(tid).ok_or_else(|| anyhow!("take not found"))?;
        Ok(self.paths.take_dir(&sid, tid))
    }

    pub fn take(&self, tid: &str) -> Result<Take> {
        let dir = self.take_path(tid)?;
        store::read_json(&dir.join("take.json")).map_err(|_| anyhow!("take not found"))
    }

    pub fn save_take(&self, t: &Take) -> Result<()> {
        store::write_json(&self.paths.take_dir(&t.session_id, &t.id).join("take.json"), t)
    }

    pub fn takes_in(&self, sid: &str) -> Vec<Take> {
        let dir = self.paths.session_dir(sid).join("recordings");
        let mut v: Vec<Take> = store::list_dirs(&dir)
            .iter()
            .filter_map(|tid| store::read_json(&dir.join(tid).join("take.json")).ok())
            .collect();
        v.sort_by(|a, b| a.created_utc.cmp(&b.created_utc));
        v
    }

    pub fn all_takes(&self) -> Vec<Take> {
        let mut v: Vec<Take> = self
            .sessions()
            .iter()
            .flat_map(|s| self.takes_in(&s.id))
            .collect();
        v.sort_by(|a, b| a.created_utc.cmp(&b.created_utc));
        v
    }

    pub fn analysis(&self, sid: &str, run_id: &str) -> Result<Value> {
        store::check_id(run_id)?;
        store::read_json(&self.paths.analyses_dir(sid).join(format!("{run_id}.json")))
            .map_err(|_| anyhow!("analysis not found"))
    }

    /// Find an analysis run anywhere (run IDs embed the take ID).
    pub fn analysis_by_run(&self, run_id: &str) -> Result<(String, Value)> {
        store::check_id(run_id)?;
        for s in self.sessions() {
            let p = self.paths.analyses_dir(&s.id).join(format!("{run_id}.json"));
            if p.exists() {
                return Ok((s.id.clone(), store::read_json(&p)?));
            }
        }
        Err(anyhow!("analysis not found"))
    }

    pub fn take_analysis(&self, t: &Take) -> Option<Value> {
        let run = t.analysis_run.as_ref()?;
        self.analysis(&t.session_id, run).ok()
    }

    pub fn reviews_in(&self, sid: &str) -> Vec<Review> {
        let mut v: Vec<Review> = store::list_files_with_ext(&self.paths.reviews_dir(sid), "json")
            .iter()
            .filter_map(|p| store::read_json(p).ok())
            .collect();
        v.sort_by(|a, b| a.created_utc.cmp(&b.created_utc));
        v
    }

    pub fn all_reviews(&self) -> Vec<Review> {
        let mut v: Vec<Review> = self
            .sessions()
            .iter()
            .flat_map(|s| self.reviews_in(&s.id))
            .collect();
        v.sort_by(|a, b| a.created_utc.cmp(&b.created_utc));
        v
    }

    pub fn review(&self, rid: &str) -> Result<Review> {
        store::check_id(rid)?;
        for s in self.sessions() {
            let p = self.paths.reviews_dir(&s.id).join(format!("{rid}.json"));
            if p.exists() {
                return store::read_json(&p);
            }
        }
        Err(anyhow!("review not found"))
    }

    pub fn review_responses(&self, r: &Review) -> Vec<ReviewResponse> {
        let p = self
            .paths
            .reviews_dir(&r.session_id)
            .join(format!("{}.responses.jsonl", r.id));
        std::fs::read_to_string(p)
            .unwrap_or_default()
            .lines()
            .filter_map(|l| serde_json::from_str(l).ok())
            .collect()
    }

    pub fn current_plan(&self) -> Option<Plan> {
        store::read_json_opt(&self.paths.plans().join("current.json"))
            .ok()
            .flatten()
    }

    pub fn plan_history(&self) -> Vec<Plan> {
        store::list_files_with_ext(&self.paths.plans().join("history"), "json")
            .iter()
            .filter_map(|p| store::read_json(p).ok())
            .collect::<Vec<Plan>>()
    }

    /// Install a new plan version. `expected` guards against stale writers.
    pub fn write_plan(&self, mut plan: Plan, expected: Option<u32>) -> Result<Plan> {
        let current = self.current_plan();
        let cur_v = current.as_ref().map(|p| p.version);
        if let Some(exp) = expected {
            if Some(exp) != cur_v {
                return Err(anyhow!(
                    "stale plan version: expected {exp}, current is {}",
                    cur_v.map(|v| v.to_string()).unwrap_or("none".into())
                ));
            }
        }
        plan.version = cur_v.unwrap_or(0) + 1;
        plan.created_utc = util::now_utc();
        store::write_json(
            &self
                .paths
                .plans()
                .join("history")
                .join(format!("v{:05}.json", plan.version)),
            &plan,
        )?;
        store::write_json(&self.paths.plans().join("current.json"), &plan)?;
        Ok(plan)
    }

    /// The initial plan when none exists: forward resonance (also part of the
    /// source's lighten/brighten activities), matching the stated goal.
    pub fn ensure_plan(&self) -> Result<Plan> {
        if let Some(p) = self.current_plan() {
            return Ok(p);
        }
        let reg = self.registry.read().unwrap();
        let ex = reg
            .latest("nhsfife.forward-hum")
            .ok_or_else(|| anyhow!("starter exercise missing from registry"))?;
        let plan = Plan {
            schema: "lilt.plan/1".into(),
            version: 0,
            created_utc: String::new(),
            author: "lilt-rules/1".into(),
            exercise_id: ex.id.clone(),
            exercise_version: ex.version,
            focus_area: "resonance".into(),
            cue_id: Some(ex.primary_cue.id.clone()),
            ladder_step: None,
            rationale: "Starting point for your goal of a lighter, more feminine voice: feeling resonance move up and forward. NHS Fife lists this under lightening and brightening a voice. There is no evidence about your voice yet; this is where the plan begins.".into(),
            evidence_refs: vec![],
            paused: false,
        };
        drop(reg);
        self.write_plan(plan, None)
    }
}
