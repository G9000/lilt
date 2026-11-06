//! Sibling locks and a rollback journal protect replacement across process exits.

use super::{Generation, Journal};
use crate::store;
use anyhow::{Context, Result, ensure};
use std::fs::{self, File, OpenOptions};
use std::path::Path;
use std::sync::Mutex;

pub struct ProcessLease {
    file: Mutex<File>,
}

fn lock_file(path: &Path) -> Result<File> {
    if path.exists() {
        ensure!(ordinary(&fs::symlink_metadata(path)?), "unsafe lock file");
    }
    Ok(OpenOptions::new()
        .read(true)
        .write(true)
        .create(true)
        .truncate(false)
        .open(path)?)
}

pub fn ordinary(metadata: &fs::Metadata) -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if metadata.file_attributes() & 0x400 != 0 {
            return false;
        }
    }
    !metadata.file_type().is_symlink() && (metadata.is_file() || metadata.is_dir())
}

pub fn transition(control: &Path) -> Result<File> {
    let file = lock_file(&control.join("transition.lock"))?;
    file.try_lock()
        .context("Another Lilt process is opening or replacing this data. Try again shortly.")?;
    Ok(file)
}

impl ProcessLease {
    pub fn open(control: &Path) -> Result<Self> {
        let file = lock_file(&control.join("data-use.lock"))?;
        file.try_lock_shared()
            .context("Another Lilt process is restoring this data. Try again shortly.")?;
        Ok(Self {
            file: Mutex::new(file),
        })
    }

    pub fn exclusive<T>(&self, operation: impl FnOnce() -> Result<T>) -> Result<T> {
        let file = self.file.lock().expect("process lease lock poisoned");
        file.unlock()?;
        if let Err(error) = file.try_lock() {
            file.lock_shared().context("restoring the data-use lease")?;
            return Err(anyhow::anyhow!(
                "Close other Lilt windows or MCP processes using this data before continuing: {error}"
            ));
        }
        let result = operation();
        file.unlock()?;
        file.lock_shared().context("restoring the data-use lease")?;
        result
    }
}

pub fn recover(root: &Path, control: &Path) -> Result<()> {
    let path = control.join("transaction.json");
    if !path.exists() {
        return Ok(());
    }
    let journal: Journal =
        store::read_json(&path).context("reading the unfinished restore journal")?;
    ensure!(
        uuid::Uuid::parse_str(&journal.id).is_ok(),
        "invalid restore journal identity"
    );
    let previous = control.join(format!("previous-{}", journal.id));
    let stage = control.join(format!("stage-{}", journal.id));
    for p in [&previous, &stage, root] {
        if p.exists() {
            ensure!(
                fs::symlink_metadata(p)?.is_dir() && ordinary(&fs::symlink_metadata(p)?),
                "unsafe restore directory"
            );
        }
    }
    if journal.committed {
        ensure!(root.is_dir(), "committed restore data is missing");
        store::write_json(&control.join("generation.json"), &journal.new_generation)?;
    } else {
        if previous.exists() {
            if root.exists() {
                fs::remove_dir_all(root).context("removing the uncommitted restored data")?;
            }
            fs::rename(&previous, root).context("putting the previous practice data back")?;
        }
        ensure!(
            root.is_dir(),
            "previous practice data is missing; recovery needs attention"
        );
        store::write_json(&control.join("generation.json"), &journal.old_generation)?;
    }
    if stage.exists() {
        fs::remove_dir_all(stage)?;
    }
    if previous.exists() {
        fs::remove_dir_all(previous)?;
    }
    fs::remove_file(path)?;
    Ok(())
}

pub fn preserve_local(root: &Path, stage: &Path) -> Result<()> {
    for name in [".private", "oauth.json", "agents.json"] {
        let source = root.join(name);
        match fs::symlink_metadata(&source) {
            Ok(_) => copy_local(&source, &stage.join(name))?,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(error.into()),
        }
    }
    Ok(())
}

fn copy_local(source: &Path, destination: &Path) -> Result<()> {
    let meta = fs::symlink_metadata(source)?;
    ensure!(ordinary(&meta), "local credentials contain an unsafe link");
    ensure!(
        !destination.exists(),
        "backup contains local authentication files"
    );
    if meta.is_dir() {
        fs::create_dir(destination)?;
        for entry in fs::read_dir(source)? {
            let entry = entry?;
            copy_local(&entry.path(), &destination.join(entry.file_name()))?;
        }
    } else {
        ensure!(meta.is_file(), "local credentials contain a special file");
        fs::copy(source, destination)?;
        OpenOptions::new()
            .write(true)
            .open(destination)?
            .sync_all()?;
    }
    fs::set_permissions(destination, meta.permissions())?;
    Ok(())
}

pub fn generation(control: &Path) -> Result<Generation> {
    let path = control.join("generation.json");
    if path.exists() {
        let generation: Generation = store::read_json(&path).context("reading data generation")?;
        ensure!(
            uuid::Uuid::parse_str(&generation.id).is_ok(),
            "invalid data generation"
        );
        return Ok(generation);
    }
    let generation = Generation {
        id: uuid::Uuid::new_v4().to_string(),
        required: false,
    };
    store::write_json(&path, &generation)?;
    Ok(generation)
}

/// Only an exclusive process lease makes another process's preview an orphan.
pub fn clean_orphans(control: &Path) -> Result<()> {
    for entry in fs::read_dir(control)? {
        let entry = entry?;
        let name = entry.file_name();
        let Some(name) = name.to_str() else {
            continue;
        };
        let stage = name.strip_prefix("stage-");
        let upload = name
            .strip_prefix("upload-")
            .and_then(|name| name.strip_suffix(".zip"));
        let Some(id) = stage.or(upload) else {
            continue;
        };
        if uuid::Uuid::parse_str(id).is_err() {
            continue;
        }
        let metadata = fs::symlink_metadata(entry.path())?;
        ensure!(ordinary(&metadata), "unsafe orphan backup path");
        if stage.is_some() {
            ensure!(metadata.is_dir(), "orphan stage is not a directory");
            fs::remove_dir_all(entry.path())?;
        } else {
            ensure!(metadata.is_file(), "orphan upload is not a file");
            fs::remove_file(entry.path())?;
        }
    }
    Ok(())
}
