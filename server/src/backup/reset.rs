//! A reset shares the restore exclusion, but never keeps a safety backup after commit.
use super::{Controller, Generation, Live, transaction};
use crate::app::{App, Shared};
use crate::store;
use anyhow::{Context, Result, ensure};
use axum::Router;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{fs, path::Path, sync::atomic::Ordering};
use uuid::Uuid;

pub const JOURNAL: &str = "reset-transaction.json";
const MARKER: &str = "reset-marker.json";
pub const CONFIRMATION: &str = "DELETE ALL DATA";

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Request {
    pub generation: String,
    pub confirmation: String,
}

#[derive(Serialize, Deserialize)]
struct ResetJournal {
    id: String,
    old_generation: Generation,
    new_generation: Generation,
    created_utc: String,
    committed: bool,
}

pub fn marker(control: &Path) -> Result<Option<String>> {
    let value: Option<String> = store::read_json_opt(&control.join(MARKER))?;
    if let Some(id) = &value {
        ensure!(Uuid::parse_str(id).is_ok(), "invalid reset marker");
    }
    Ok(value)
}

fn ordinary_tree(path: &Path) -> Result<()> {
    let metadata = fs::symlink_metadata(path)?;
    ensure!(
        transaction::ordinary(&metadata),
        "Reset cannot remove linked or special files. Remove the link from Lilt's folders first."
    );
    if metadata.is_dir() {
        for entry in fs::read_dir(path)? {
            ordinary_tree(&entry?.path())?;
        }
    }
    Ok(())
}

fn remove_entry(path: &Path) -> Result<()> {
    let metadata = match fs::symlink_metadata(path) {
        Ok(value) => value,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(()),
        Err(error) => return Err(error.into()),
    };
    ensure!(
        transaction::ordinary(&metadata),
        "Refusing to follow a linked reset path"
    );
    if metadata.is_dir() {
        // std's recursive removal does not follow links; preflight also rejects nested links.
        ordinary_tree(path)?;
        fs::remove_dir_all(path)?;
    } else {
        fs::remove_file(path)?;
    }
    Ok(())
}

/// Returns whether an already-committed reset was completed. Never rolls one back.
pub fn recover(root: &Path, control: &Path) -> Result<bool> {
    let Some(journal) = store::read_json_opt::<ResetJournal>(&control.join(JOURNAL))? else {
        return Ok(false);
    };
    ensure!(
        Uuid::parse_str(&journal.id).is_ok(),
        "invalid reset journal identity"
    );
    ensure!(
        Uuid::parse_str(&journal.new_generation.id).is_ok(),
        "invalid reset generation"
    );
    let previous = control.join(format!("reset-previous-{}", journal.id));
    let stage = control.join(format!("reset-stage-{}", journal.id));
    for path in [root, control, &previous, &stage] {
        match fs::symlink_metadata(path) {
            Ok(metadata) => ensure!(
                metadata.is_dir() && transaction::ordinary(&metadata),
                "unsafe reset directory"
            ),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(error.into()),
        }
    }
    if !journal.committed {
        if previous.exists() {
            remove_entry(root)?;
            fs::rename(&previous, root).context("putting back data after an unfinished reset")?;
        }
        ensure!(
            root.is_dir(),
            "previous data is missing; reset recovery needs attention"
        );
        store::write_json(&control.join("generation.json"), &journal.old_generation)?;
        remove_entry(&stage)?;
        fs::remove_file(control.join(JOURNAL))?;
        return Ok(false);
    }
    ensure!(root.is_dir(), "fresh reset data is missing");
    store::write_json(&control.join("generation.json"), &journal.new_generation)?;
    store::write_json(&control.join(MARKER), &journal.new_generation.id)?;
    // Keep only coordination metadata, never recordings, credentials, ZIPs or recovery copies.
    for entry in fs::read_dir(control)? {
        let entry = entry?;
        if matches!(
            entry.file_name().to_str(),
            Some("transition.lock" | "data-use.lock" | "generation.json" | MARKER | JOURNAL)
        ) {
            continue;
        }
        remove_entry(&entry.path())?;
    }
    let audit =
        json!({"action":"reset_all_data","id":journal.new_generation.id,"at":journal.created_utc});
    store::write_atomic(
        &root.join("deletions.jsonl"),
        format!("{audit}\n").as_bytes(),
    )?;
    fs::remove_file(control.join(JOURNAL))?;
    Ok(true)
}

impl Controller {
    pub(super) fn reset_all(&self, request: Request) -> Result<(Value, Shared)> {
        ensure!(
            request.confirmation == CONFIRMATION,
            "Type DELETE ALL DATA to confirm."
        );
        let old_generation = self.generation();
        ensure!(request.generation == old_generation.id, "stale_generation");
        let _transition = transaction::transition(&self.control)?;
        self.lease.exclusive(|| {
            let old_app = self.app();
            self.check_idle(&old_app)?;
            ensure!(!self.control.join("transaction.json").exists() && !self.control.join(JOURNAL).exists(), "Finish recovery before resetting data.");
            ordinary_tree(&self.config.data_dir)?;
            ordinary_tree(&self.control)?;
            let id = Uuid::new_v4().to_string();
            let stage = self.control.join(format!("reset-stage-{id}"));
            let previous = self.control.join(format!("reset-previous-{id}"));
            let mut journal = ResetJournal { id, old_generation, new_generation: Generation::restored(), created_utc: chrono::Utc::now().to_rfc3339(), committed: false };
            store::write_json(&self.control.join(JOURNAL), &journal)?;
            let replacement = (|| -> Result<(Shared, Router)> {
                let mut staged_config = self.config.clone(); staged_config.data_dir = stage.clone();
                drop(App::open_with_activity(staged_config, self.activity.clone(), Some(self.lease.clone()))?);
                #[cfg(test)] self.fail("reset_before_rename")?;
                fs::rename(&self.config.data_dir, &previous).context("moving the old data out of use")?;
                #[cfg(test)] self.fail("reset_after_previous")?;
                fs::rename(&stage, &self.config.data_dir).context("installing fresh data")?;
                #[cfg(test)] self.fail("reset_before_open")?;
                let app = App::open_with_activity(self.config.clone(), self.activity.clone(), Some(self.lease.clone()))?;
                let router = crate::build_router(app.clone(), &self.config);
                #[cfg(test)] self.fail("reset_after_open")?;
                store::write_json(&self.control.join("generation.json"), &journal.new_generation)?;
                journal.committed = true;
                store::write_json(&self.control.join(JOURNAL), &journal)?;
                Ok((app, router))
            })();
            let (app, router) = match replacement {
                Ok(value) => value,
                Err(error) => match recover(&self.config.data_dir, &self.control) {
                    Ok(false) => return Err(error.context("Reset did not complete; your previous data was put back")),
                    Ok(true) => {
                        // A commit write may report an error after reaching disk. Honour its journal.
                        old_app.retired.store(true, Ordering::Release);
                        let app = App::open_with_activity(self.config.clone(), self.activity.clone(), Some(self.lease.clone()))?;
                        let router = crate::build_router(app.clone(), &self.config);
                        (app, router)
                    }
                    Err(recovery) => {
                        old_app.retired.store(true, Ordering::Release);
                        if let Ok(generation) = transaction::generation(&self.control) {
                            self.live.lock().expect("live app lock poisoned").generation = generation;
                        }
                        *self.reset_id.lock().expect("reset marker lock poisoned") = marker(&self.control)?;
                        return Err(recovery.context("Reset recovery needs attention. Restart Lilt to finish; some files may remain"));
                    }
                },
            };
            old_app.retired.store(true, Ordering::Release);
            old_app.job_notify.notify_waiters();
            self.preview.lock().expect("preview lock poisoned").take();
            let id = journal.new_generation.id.clone();
            *self.live.lock().expect("live app lock poisoned") = Live { app: app.clone(), router, generation: journal.new_generation };
            // Publish the marker even if final deletion is interrupted; old browser stores are stale.
            let cleanup = (|| -> Result<()> {
                store::write_json(&self.control.join(MARKER), &id)?;
                *self.reset_id.lock().expect("reset marker lock poisoned") = Some(id.clone());
                #[cfg(test)] self.fail("reset_cleanup")?;
                recover(&self.config.data_dir, &self.control)?;
                Ok(())
            })();
            if let Err(error) = cleanup {
                app.retired.store(true, Ordering::Release);
                return Err(error.context("Fresh data is active, but deletion is incomplete. Restart Lilt to finish removing old data and backups"));
            }
            Ok((json!({"reset":true,"generation":id,"reset_id":id}), app))
        })
    }
}
