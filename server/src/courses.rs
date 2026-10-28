//! Courses: each a folder in `content/courses/<id>` holding Markdown (a home page, chapters,
//! pictures, audio) and a `course.md` that says what it is:
//!
//! ```markdown
//! ---
//! id: voice
//! title: Voice practice
//! kind: voice
//! version: 1
//! source: https://github.com/…   (where updates come from; optional)
//! locked: Be gentle with your voice, Another heading
//! ---
//!
//! One paragraph on what the course is for.
//! ```
//!
//! `kind` names the kind of practice (voice: record, then pitch and comfort). `locked` lists `## `
//! sections an AI may never change in your copy. The folder is the original; your own copy of a
//! course lives in `<data>/courses/<id>` (see `syllabus`). Voice is the course the app shows today.

use crate::app::App;
use anyhow::{Context, Result, anyhow, ensure};
use serde_json::{Value, json};
use std::path::PathBuf;

/// The course the app shows (Practice), and the one tools use when none is named.
pub const DEFAULT: &str = "voice";

#[derive(Clone, Debug)]
pub struct Course {
    pub id: String,
    pub title: String,
    pub kind: String,
    pub version: String,
    pub source: Option<String>,
    pub locked: Vec<String>,
    pub summary: String,
    /// The original's folder.
    pub dir: PathBuf,
}

pub fn valid_id(id: &str) -> bool {
    !id.is_empty() && id.len() <= 40 && id.bytes().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == b'-')
}

fn root(app: &App) -> PathBuf {
    app.config.content_dir.join("courses")
}

fn read(dir: PathBuf) -> Result<Course> {
    let path = dir.join("course.md");
    let src = std::fs::read_to_string(&path).with_context(|| format!("reading {}", path.display()))?;
    let (meta, body) = crate::texts::front_matter(&src).with_context(|| format!("in {}", path.display()))?;
    let get = |k: &str| meta.get(k).and_then(Value::as_str).map(str::trim).unwrap_or("").to_string();
    let id = get("id");
    let folder = dir.file_name().and_then(|n| n.to_str()).unwrap_or_default();
    ensure!(valid_id(&id) && id == folder, "{}: `id` must match the folder name ({folder}) in lowercase letters, digits and dashes", path.display());
    for k in ["title", "kind"] {
        ensure!(!get(k).is_empty(), "{}: needs `{k}`", path.display());
    }
    Ok(Course {
        title: get("title"), kind: get("kind"), version: get("version"),
        source: Some(get("source")).filter(|s| !s.is_empty()),
        locked: get("locked").split(',').map(str::trim).filter(|s| !s.is_empty()).map(str::to_string).collect(),
        summary: body.split_whitespace().collect::<Vec<_>>().join(" "),
        id, dir,
    })
}

/// Every course, the app's own first, then by id.
pub fn all(app: &App) -> Vec<Course> {
    let mut out: Vec<Course> = std::fs::read_dir(root(app)).into_iter().flatten().filter_map(|e| e.ok())
        .filter(|e| e.path().join("course.md").exists())
        .filter_map(|e| read(e.path()).map_err(|err| tracing::warn!("skipping a course: {err:#}")).ok())
        .collect();
    out.sort_by_key(|c| (c.id != DEFAULT, c.id.clone()));
    out
}

pub fn get(app: &App, id: &str) -> Result<Course> {
    ensure!(valid_id(id), "`{id}` isn't a course id");
    let dir = root(app).join(id);
    ensure!(dir.join("course.md").exists(), "there is no course `{id}`; courses_list shows them");
    read(dir)
}

/// The course named in a request, or the default one.
pub fn pick(app: &App, id: Option<&str>) -> Result<Course> {
    get(app, id.filter(|s| !s.is_empty()).unwrap_or(DEFAULT))
}

/// For the course list: what each course is, and whether you're using your own copy of it.
pub fn list(app: &App) -> Value {
    let rows: Vec<Value> = all(app).iter().map(|c| {
        let mine = crate::syllabus::has_mine(app, c);
        json!({
            "id": c.id, "title": c.title, "kind": c.kind, "version": c.version, "source": c.source, "summary": c.summary,
            "locked_sections": c.locked, "using": if mine { "mine" } else { "original" },
            "changes": crate::syllabus::change_count(app, c),
            "updates_waiting": if mine { crate::updates::waiting(app, c) } else { 0 },
            "shown_in_app": c.id == DEFAULT,
        })
    }).collect();
    json!({ "courses": rows })
}

/// Earlier versions kept your copy of the voice course in `<data>/syllabus`; it now lives in
/// `<data>/courses/voice`. Moved once, at start-up, only if the new place is empty.
pub fn migrate(app: &App) -> Result<()> {
    let old = app.paths.root.join("syllabus");
    let new = app.paths.root.join("courses").join(DEFAULT);
    if old.exists() && !new.exists() {
        std::fs::create_dir_all(app.paths.root.join("courses"))?;
        std::fs::rename(&old, &new).map_err(|e| anyhow!("moving {} to {}: {e}", old.display(), new.display()))?;
        tracing::info!("moved your copy of the voice course to {}", new.display());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ids() {
        for ok in ["voice", "mandarin", "spanish-2"] { assert!(valid_id(ok), "{ok}"); }
        for bad in ["", "Voice", "../voice", "a/b", "a b", "x".repeat(41).as_str()] { assert!(!valid_id(bad), "{bad}"); }
    }

    #[test]
    fn the_voice_course_describes_itself() {
        let c = read(std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../content/courses/voice")).unwrap();
        assert_eq!((c.id.as_str(), c.kind.as_str()), ("voice", "voice"));
        assert_eq!(c.locked, ["Be gentle with your voice"]);
        assert!(c.source.is_none());
    }
}
