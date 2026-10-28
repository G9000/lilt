//! Filesystem persistence: atomic writes, ID validation and data-root paths.
//! Files under the data root are the canonical record; nothing else is.

pub mod export;

use anyhow::{Context, Result, bail};
use serde::{Serialize, de::DeserializeOwned};
use sha2::{Digest, Sha256};
use std::fs::{self, File, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};

#[derive(Clone, Debug)]
pub struct Paths {
    pub root: PathBuf,
}

impl Paths {
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self { root: root.into() }
    }
    pub fn profile(&self) -> PathBuf {
        self.root.join("profile.json")
    }
    pub fn exercises(&self) -> PathBuf {
        self.root.join("exercises")
    }
    pub fn sessions(&self) -> PathBuf {
        self.root.join("sessions")
    }
    pub fn session_dir(&self, sid: &str) -> PathBuf {
        self.sessions().join(sid)
    }
    pub fn session_file(&self, sid: &str) -> PathBuf {
        self.session_dir(sid).join("session.json")
    }
    pub fn take_dir(&self, sid: &str, tid: &str) -> PathBuf {
        self.session_dir(sid).join("recordings").join(tid)
    }
    pub fn analyses_dir(&self, sid: &str) -> PathBuf {
        self.session_dir(sid).join("analyses")
    }
    pub fn reviews_dir(&self, sid: &str) -> PathBuf {
        self.session_dir(sid).join("reviews")
    }
    pub fn plans(&self) -> PathBuf {
        self.root.join("plans")
    }
    pub fn jobs(&self) -> PathBuf {
        self.root.join("jobs")
    }
    pub fn deletions_log(&self) -> PathBuf {
        self.root.join("deletions.jsonl")
    }
    pub fn tmp(&self) -> PathBuf {
        self.root.join(".tmp")
    }

    pub fn ensure_layout(&self) -> Result<()> {
        for d in [
            self.root.clone(),
            self.exercises(),
            self.sessions(),
            self.plans().join("history"),
            self.jobs(),
            self.tmp(),
        ] {
            fs::create_dir_all(&d).with_context(|| format!("creating {}", d.display()))?;
        }
        Ok(())
    }
}

/// IDs become path components, so only a conservative alphabet is accepted.
pub fn valid_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 80
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '.')
        && !id.starts_with('.')
        && !id.contains("..")
}

pub fn check_id(id: &str) -> Result<()> {
    if !valid_id(id) {
        bail!("invalid id");
    }
    Ok(())
}

pub fn sha256_hex(bytes: &[u8]) -> String {
    hex::encode(Sha256::digest(bytes))
}

pub fn sha256_file(path: &Path) -> Result<String> {
    use std::io::Read;
    let mut f = File::open(path)?;
    let mut h = Sha256::new();
    let mut buf = vec![0u8; 1 << 16];
    loop {
        let n = f.read(&mut buf)?;
        if n == 0 {
            break;
        }
        h.update(&buf[..n]);
    }
    Ok(hex::encode(h.finalize()))
}

fn fsync_dir(dir: &Path) {
    // Directory fsync makes the rename durable; not supported on every platform.
    if let Ok(d) = File::open(dir) {
        let _ = d.sync_all();
    }
}

/// Write bytes atomically: temp file in the same directory, fsync, rename, fsync dir.
pub fn write_atomic(path: &Path, bytes: &[u8]) -> Result<()> {
    let dir = path.parent().context("path has no parent")?;
    fs::create_dir_all(dir)?;
    let tmp = dir.join(format!(
        ".{}.{}.tmp",
        path.file_name().unwrap().to_string_lossy(),
        uuid::Uuid::new_v4().simple()
    ));
    {
        let mut f = OpenOptions::new().write(true).create_new(true).open(&tmp)?;
        f.write_all(bytes)?;
        f.sync_all()?;
    }
    fs::rename(&tmp, path)?;
    fsync_dir(dir);
    Ok(())
}

pub fn write_json<T: Serialize>(path: &Path, value: &T) -> Result<()> {
    let mut bytes = serde_json::to_vec_pretty(value)?;
    bytes.push(b'\n');
    write_atomic(path, &bytes)
}

pub fn read_json<T: DeserializeOwned>(path: &Path) -> Result<T> {
    let bytes = fs::read(path).with_context(|| format!("reading {}", path.display()))?;
    serde_json::from_slice(&bytes).with_context(|| format!("parsing {}", path.display()))
}

pub fn read_json_opt<T: DeserializeOwned>(path: &Path) -> Result<Option<T>> {
    if !path.exists() {
        return Ok(None);
    }
    read_json(path).map(Some)
}

pub fn append_line(path: &Path, line: &str) -> Result<()> {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir)?;
    }
    let mut f = OpenOptions::new().create(true).append(true).open(path)?;
    f.write_all(line.as_bytes())?;
    f.write_all(b"\n")?;
    f.sync_all()?;
    Ok(())
}

pub fn list_dirs(dir: &Path) -> Vec<String> {
    let mut out: Vec<String> = fs::read_dir(dir)
        .into_iter()
        .flatten()
        .flatten()
        .filter(|e| e.file_type().map(|t| t.is_dir()).unwrap_or(false))
        .map(|e| e.file_name().to_string_lossy().into_owned())
        .filter(|n| valid_id(n))
        .collect();
    out.sort();
    out
}

pub fn list_files_with_ext(dir: &Path, ext: &str) -> Vec<PathBuf> {
    let mut out: Vec<PathBuf> = fs::read_dir(dir)
        .into_iter()
        .flatten()
        .flatten()
        .map(|e| e.path())
        .filter(|p| {
            p.extension().map(|e| e == ext).unwrap_or(false)
                && !p
                    .file_name()
                    .map(|n| n.to_string_lossy().starts_with('.'))
                    .unwrap_or(true)
        })
        .collect();
    out.sort();
    out
}
