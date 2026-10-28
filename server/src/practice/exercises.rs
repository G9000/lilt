//! Versioned exercise registry. Content is seeded from `content/exercises` into the
//! data root; an existing version is never overwritten, so edits need a new version.

use crate::app::App;
use crate::store::{self, Paths};
use anyhow::{Context, Result, bail};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;
use std::path::Path;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Cue {
    pub id: String,
    pub text: String,
    pub use_when: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct QOption {
    pub id: String,
    pub label: String,
    pub signal: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct CheckQuestion {
    pub id: String,
    pub text: String,
    pub options: Vec<QOption>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PracticeTask {
    pub prompt_id: String,
    pub prompt_text: String,
    pub duration_hint_s: u32,
    #[serde(default)]
    pub variants: Vec<Value>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LadderStep {
    pub id: String,
    pub text: String,
    pub recordable: bool,
    pub spontaneous: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Exercise {
    pub id: String,
    pub version: u32,
    pub title: String,
    pub areas: Vec<String>,
    pub primary_area: String,
    pub stage: String,
    pub purpose: String,
    pub primary_cue: Cue2,
    pub cues: Vec<Cue>,
    pub practice_task: PracticeTask,
    pub check_questions: Vec<CheckQuestion>,
    #[serde(default)]
    pub ladder: Vec<LadderStep>,
    #[serde(default)]
    pub next: Vec<String>,
    pub review: Value,
    /// Full record as stored, for display and MCP.
    #[serde(skip)]
    pub raw: Value,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Cue2 {
    pub id: String,
    pub text: String,
}

impl Exercise {
    pub fn cue(&self, id: &str) -> Option<&Cue> {
        self.cues.iter().find(|c| c.id == id)
    }
    pub fn cues_for(&self, when: &str) -> Vec<&Cue> {
        self.cues.iter().filter(|c| c.use_when == when).collect()
    }
    pub fn review_status(&self) -> &str {
        self.review
            .get("status")
            .and_then(|s| s.as_str())
            .unwrap_or("experimental")
    }
    /// Signal for an answer to a check question, e.g. "target_met".
    pub fn signal(&self, question_id: &str, answer: &str) -> Option<&str> {
        self.check_questions
            .iter()
            .find(|q| q.id == question_id)?
            .options
            .iter()
            .find(|o| o.id == answer)
            .map(|o| o.signal.as_str())
    }
}

#[derive(Clone, Debug, Default)]
pub struct Registry {
    /// id -> version -> exercise
    pub by_id: BTreeMap<String, BTreeMap<u32, Exercise>>,
}

impl Registry {
    pub fn get(&self, id: &str, version: u32) -> Option<&Exercise> {
        self.by_id.get(id)?.get(&version)
    }
    pub fn latest(&self, id: &str) -> Option<&Exercise> {
        self.by_id.get(id)?.values().next_back()
    }
    pub fn all_latest(&self) -> Vec<&Exercise> {
        self.by_id.values().filter_map(|v| v.values().next_back()).collect()
    }
    /// Eligible for assignment: present in the registry with a non-draft review status.
    pub fn eligible(&self, id: &str, version: u32) -> Result<&Exercise> {
        let Some(ex) = self.get(id, version) else {
            bail!("exercise {id} v{version} is not in the registry");
        };
        match ex.review_status() {
            "source_checked" | "clinician_reviewed" => Ok(ex),
            other => bail!("exercise {id} v{version} has status {other} and is not assignable"),
        }
    }
}

fn parse(raw: Value) -> Result<Exercise> {
    let mut ex: Exercise = serde_json::from_value(raw.clone())?;
    ex.raw = raw;
    Ok(ex)
}

/// Copy any missing versions from the content dir into the data root, then load.
pub fn seed_and_load(paths: &Paths, content_dir: &Path) -> Result<Registry> {
    for file in store::list_files_with_ext(content_dir, "json") {
        let raw: Value = store::read_json(&file)?;
        let id = raw["id"].as_str().context("exercise without id")?.to_string();
        let version = raw["version"].as_u64().context("exercise without version")?;
        store::check_id(&id)?;
        let target = paths.exercises().join(&id).join(format!("v{version}.json"));
        if !target.exists() {
            store::write_json(&target, &raw)?;
        }
    }
    load(paths)
}

/// An exercise version as the web UI and MCP see it, or null if that version is unknown.
pub fn json(app: &App, id: &str, version: u32) -> Value {
    app.registry.read().unwrap().get(id, version).map(|e| e.raw.clone()).unwrap_or(Value::Null)
}

pub fn load(paths: &Paths) -> Result<Registry> {
    let mut reg = Registry::default();
    for id in store::list_dirs(&paths.exercises()) {
        for file in store::list_files_with_ext(&paths.exercises().join(&id), "json") {
            let raw: Value = store::read_json(&file)?;
            let ex = parse(raw).with_context(|| format!("exercise {}", file.display()))?;
            reg.by_id
                .entry(ex.id.clone())
                .or_default()
                .insert(ex.version, ex);
        }
    }
    Ok(reg)
}
