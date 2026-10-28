//! Your own version of the practice texts. The chapters that ship with Lilt (`content/texts`) are
//! the original and are never changed; the first edit copies them to `<data>/syllabus`, and from
//! then on the app reads that copy. Edits come from AI agents over MCP, one Markdown file at a time:
//!
//! - every edit is checked by loading the whole syllabus as it would be after the change, so a
//!   file Lilt can't read is refused and nothing is written;
//! - "Be gentle with your voice" on the home page stays word for word;
//! - before each change the files are kept in `.history/NNNN`, so any change can be undone;
//! - `.base` keeps the original as it was when the copy was made, to compare against later
//!   updates of the original.
//!
//! Progress is kept by chapter and text id (`text.<chapter>.<text>`), so rewording a text keeps
//! its history; removing or renaming an id leaves its past takes in Recordings only.

use crate::app::App;
use crate::store;
use crate::texts;
use anyhow::{Context, Result, anyhow, bail, ensure};
use serde_json::{Value, json};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

/// The home page section an agent may not change.
const PROTECTED: &str = "Be gentle with your voice";
const MAX_FILE: usize = 200_000;

fn original(app: &App) -> PathBuf {
    app.config.content_dir.join("texts")
}

fn mine(app: &App) -> PathBuf {
    app.paths.root.join("syllabus")
}

pub type Files = BTreeMap<String, String>;

pub fn has_mine(app: &App) -> bool {
    mine(app).join("_about.md").exists()
}

/// The folder the app reads from: your version once there is one, else the original.
pub fn active_dir(app: &App) -> PathBuf {
    if has_mine(app) { mine(app) } else { original(app) }
}

pub fn load_active(app: &App) -> Result<Value> {
    let dir = active_dir(app);
    let mut t = texts::load(&dir).with_context(|| format!("loading {}", dir.display()))?;
    let updates = if has_mine(app) { crate::updates::waiting(app) } else { 0 };
    t["edition"] = json!({ "mine": has_mine(app), "changes": history_ids(app).len(), "updates": updates });
    Ok(t)
}

/// `index.md`, `_about.md`, `_pitch.md` or a chapter `NN-name.md` (lowercase letters, digits, dashes).
fn editable(name: &str) -> bool {
    if matches!(name, "index.md" | "_about.md" | "_pitch.md") {
        return true;
    }
    let Some(stem) = name.strip_suffix(".md") else { return false };
    let b = stem.as_bytes();
    b.len() > 3 && b[0].is_ascii_digit() && b[1].is_ascii_digit() && b[2] == b'-'
        && stem[3..].bytes().all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == b'-')
}

fn check_name(name: &str) -> Result<()> {
    ensure!(editable(name), "`{name}` isn't a syllabus file: use index.md, _about.md, _pitch.md or a chapter named like 09-my-chapter.md");
    Ok(())
}

pub fn original_files(app: &App) -> Files {
    files(&original(app))
}

pub fn mine_files(app: &App) -> Files {
    files(&mine(app))
}

/// The original as it was when your copy was made, or last brought up to date.
pub fn base_files(app: &App) -> Files {
    files(&mine(app).join(".base"))
}

/// The editable Markdown files in a folder, by name.
fn files(dir: &Path) -> Files {
    std::fs::read_dir(dir).into_iter().flatten().filter_map(|e| e.ok())
        .filter_map(|e| {
            let name = e.file_name().to_str()?.to_string();
            editable(&name).then(|| std::fs::read_to_string(e.path()).ok().map(|s| (name, s))).flatten()
        })
        .collect()
}

fn write_files(dir: &Path, files: &Files) -> Result<()> {
    std::fs::create_dir_all(dir)?;
    for (name, _) in self::files(dir) {
        std::fs::remove_file(dir.join(name))?;
    }
    for (name, src) in files {
        store::write_atomic(&dir.join(name), src.as_bytes())?;
    }
    Ok(())
}

fn history_dir(app: &App) -> PathBuf {
    mine(app).join(".history")
}

fn history_ids(app: &App) -> Vec<String> {
    store::list_dirs(&history_dir(app)).into_iter().filter(|d| d.len() == 4 && d.bytes().all(|c| c.is_ascii_digit())).collect()
}

/// A home page section's text, from its `## ` heading to the next one, spacing ignored.
fn section(src: &str, heading: &str) -> Option<String> {
    let start = src.find(&format!("## {heading}"))?;
    let rest = &src[start..];
    let end = rest[3..].find("\n## ").map(|i| i + 3).unwrap_or(rest.len());
    Some(rest[..end].split_whitespace().collect::<Vec<_>>().join(" "))
}

/// Ids, texts and hints of a chapter file, or None for files that aren't chapters.
fn chapter_texts(name: &str, src: &str) -> Option<(String, BTreeMap<String, (String, String)>)> {
    if !name.starts_with(|c: char| c.is_ascii_digit()) {
        return None;
    }
    let c = texts::chapter(src, 0).ok()?;
    let items = c["items"].as_array()?.iter()
        .map(|i| (i["id"].as_str().unwrap_or_default().to_string(), (i["text"].as_str().unwrap_or_default().to_string(), i["hint"].as_str().unwrap_or_default().to_string())))
        .collect();
    Some((c["id"].as_str().unwrap_or_default().to_string(), items))
}

/// How one file differs between two versions; for chapters, text by text.
fn diff_file(name: &str, old: Option<&String>, new: Option<&String>) -> Value {
    let status = match (old, new) {
        (None, Some(_)) => "added",
        (Some(_), None) => "removed",
        (Some(a), Some(b)) if a == b => "same",
        _ => "changed",
    };
    let mut out = json!({ "file": name, "status": status });
    if status == "changed" {
        if let (Some((_, a)), Some((_, b))) = (chapter_texts(name, old.unwrap()), chapter_texts(name, new.unwrap())) {
            out["texts_added"] = json!(b.keys().filter(|k| !a.contains_key(*k)).collect::<Vec<_>>());
            out["texts_removed"] = json!(a.keys().filter(|k| !b.contains_key(*k)).collect::<Vec<_>>());
            out["texts_changed"] = json!(a.iter().filter(|(k, v)| b.get(*k).is_some_and(|w| w != *v)).map(|(k, _)| k).collect::<Vec<_>>());
        }
    }
    out
}

fn diff(old: &Files, new: &Files) -> Vec<Value> {
    let names: std::collections::BTreeSet<_> = old.keys().chain(new.keys()).collect();
    names.into_iter().map(|n| diff_file(n, old.get(n), new.get(n))).collect()
}

/// Every file in your version (or the original, if you have none yet) and how it differs from the original.
pub fn list(app: &App) -> Value {
    let orig = files(&original(app));
    let active = files(&active_dir(app));
    let rows: Vec<Value> = diff(&orig, &active).into_iter().filter(|d| d["status"] != "removed").map(|mut d| {
        let name = d["file"].as_str().unwrap_or_default().to_string();
        if let Some(c) = active.get(&name).and_then(|s| texts::chapter(s, 0).ok()) {
            d["chapter_id"] = c["id"].clone();
            d["title"] = c["title"].clone();
            d["texts"] = json!(c["items"].as_array().map_or(0, Vec::len));
        }
        d
    }).collect();
    let removed: Vec<Value> = orig.keys().filter(|n| !active.contains_key(*n)).map(|n| json!(n)).collect();
    json!({
        "using": if has_mine(app) { "mine" } else { "original" },
        "files": rows,
        "removed_from_original": removed,
        "changes_saved": history_ids(app).len(),
        "chapter_format": std::fs::read_to_string(original(app).join("_template.md")).unwrap_or_default(),
        "rules": format!("Chapters are read in file-name order. Keep text ids (## id) when rewording a text so its progress stays with it. The home page section \"{PROTECTED}\" can't be changed."),
    })
}

pub fn read(app: &App, name: &str, which: &str) -> Result<Value> {
    check_name(name)?;
    let dir = match which {
        "mine" | "" => active_dir(app),
        "original" => original(app),
        _ => bail!("`from` is \"mine\" or \"original\""),
    };
    let src = std::fs::read_to_string(dir.join(name)).map_err(|_| anyhow!("there is no {name} in {which}"))?;
    Ok(json!({ "file": name, "from": if dir == original(app) { "original" } else { "mine" }, "markdown": src }))
}

pub fn compare(app: &App, name: Option<&str>) -> Result<Value> {
    if let Some(n) = name {
        check_name(n)?;
    }
    let (orig, active) = (files(&original(app)), files(&active_dir(app)));
    let rows: Vec<Value> = diff(&orig, &active).into_iter()
        .filter(|d| name.map_or(d["status"] != "same", |n| d["file"] == n)).collect();
    Ok(json!({ "using": if has_mine(app) { "mine" } else { "original" }, "differences_from_original": rows }))
}

fn commit(app: &App, next: Files, action: &str, file: &str, note: &str) -> Result<Value> {
    commit_with_base(app, next, action, file, note, None)
}

/// Check, keep the current files in history, then write `next` as your version and reload the app.
/// Bringing in updates also moves the base to the original it came from (`new_base`); the old
/// base is kept with the history, so undo puts it back.
pub fn commit_with_base(app: &App, next: Files, action: &str, file: &str, note: &str, new_base: Option<Files>) -> Result<Value> {
    ensure!(note.trim().len() >= 3, "say in a few words what this change is (`note`)");
    let _g = app.write_lock.lock().unwrap();
    let fresh = !has_mine(app);
    let current = if fresh { files(&original(app)) } else { files(&mine(app)) };
    if current == next {
        bail!("nothing changed");
    }
    // Check the whole syllabus as it would be, in a scratch folder.
    let staging = app.paths.tmp().join("syllabus-check");
    let _ = std::fs::remove_dir_all(&staging);
    write_files(&staging, &next)?;
    let checked = texts::load(&staging);
    let _ = std::fs::remove_dir_all(&staging);
    if let Err(e) = checked {
        let why = format!("{e:#}").replace(&format!("{}/", staging.display()), "");
        bail!("the syllabus would not load after this change, so nothing was saved: {why}");
    }
    // As in the original now, or as in the original your copy follows (until you bring its update in).
    let allowed: Vec<String> = [files(&original(app)), base_files(app)].iter().filter_map(|f| f.get("index.md").and_then(|s| section(s, PROTECTED))).collect();
    if !allowed.is_empty() {
        ensure!(next.get("index.md").and_then(|s| section(s, PROTECTED)).is_some_and(|s| allowed.contains(&s)),
            "the home page's \"{PROTECTED}\" section must stay exactly as it is, so nothing was saved");
    }

    let n = history_ids(app).last().and_then(|s| s.parse::<u32>().ok()).unwrap_or(0) + 1;
    let snap = history_dir(app).join(format!("{n:04}"));
    write_files(&snap, &if fresh { BTreeMap::new() } else { current.clone() })?;
    store::write_json(&snap.join("change.json"), &json!({
        "time": crate::util::now_utc(), "action": action, "file": file, "note": note.trim(), "first_change": fresh }))?;
    if fresh {
        write_files(&mine(app).join(".base"), &current)?;
    }
    if let Some(b) = new_base {
        write_files(&snap.join(".base"), &base_files(app))?;
        write_files(&mine(app).join(".base"), &b)?;
    }
    write_files(&mine(app), &next)?;
    reload(app)?;
    Ok(json!({ "saved": true, "change": n, "using": "mine", "differences_from_before": diff(&current, &next).into_iter().filter(|d| d["status"] != "same").collect::<Vec<_>>() }))
}

pub fn reload(app: &App) -> Result<()> {
    let t = load_active(app)?;
    *app.texts.write().unwrap() = t;
    *app.texts_stamp.lock().unwrap() = stamp(app);
    Ok(())
}

/// When your version last changed on disk (its folder and its history).
fn stamp(app: &App) -> String {
    let m = |p: PathBuf| std::fs::metadata(p).and_then(|m| m.modified()).map(|t| format!("{t:?}")).unwrap_or_default();
    format!("{}|{}|{}", has_mine(app), m(mine(app)), m(history_dir(app)))
}

/// The texts as the app shows them, read again if another process (an agent over `lilt
/// mcp-stdio`) changed your version since they were loaded.
pub fn texts(app: &App) -> Value {
    if *app.texts_stamp.lock().unwrap() != stamp(app) {
        if let Err(e) = reload(app) {
            tracing::warn!("keeping the loaded texts: {e:#}");
            *app.texts_stamp.lock().unwrap() = stamp(app);
        }
    }
    app.texts.read().unwrap().clone()
}

fn current(app: &App) -> Files {
    files(&active_dir(app))
}

pub fn write(app: &App, name: &str, markdown: &str, note: &str) -> Result<Value> {
    check_name(name)?;
    ensure!(markdown.len() <= MAX_FILE, "{name} is too long (over {MAX_FILE} bytes)");
    let mut next = current(app);
    next.insert(name.to_string(), format!("{}\n", markdown.trim_end()));
    commit(app, next, "write", name, note)
}

pub fn delete(app: &App, name: &str, note: &str) -> Result<Value> {
    check_name(name)?;
    ensure!(name.starts_with(|c: char| c.is_ascii_digit()), "only chapters can be removed, not {name}");
    let mut next = current(app);
    ensure!(next.remove(name).is_some(), "there is no {name} in your version");
    commit(app, next, "delete", name, note)
}

pub fn history(app: &App) -> Value {
    let rows: Vec<Value> = history_ids(app).iter().rev().map(|id| {
        let c: Value = store::read_json(&history_dir(app).join(id).join("change.json")).unwrap_or(Value::Null);
        json!({ "change": id.parse::<u32>().unwrap_or(0), "time": c["time"], "action": c["action"], "file": c["file"], "note": c["note"] })
    }).collect();
    json!({ "using": if has_mine(app) { "mine" } else { "original" }, "changes": rows })
}

/// Put back the files as they were before the latest change.
pub fn undo(app: &App) -> Result<Value> {
    let _g = app.write_lock.lock().unwrap();
    let id = history_ids(app).pop().ok_or_else(|| anyhow!("there is no change to undo"))?;
    let snap = history_dir(app).join(&id);
    let c: Value = store::read_json(&snap.join("change.json"))?;
    let before = files(&snap);
    if snap.join(".base").exists() {
        write_files(&mine(app).join(".base"), &files(&snap.join(".base")))?;
    }
    // The first change made the copy: undoing it goes back to the original.
    write_files(&mine(app), &before)?;
    std::fs::remove_dir_all(&snap)?;
    reload(app)?;
    Ok(json!({ "undone": id.parse::<u32>().unwrap_or(0), "note": c["note"], "using": if has_mine(app) { "mine" } else { "original" } }))
}

/// Go back to the original. It is kept in history like any change, so it can be undone too.
pub fn reset(app: &App, note: &str) -> Result<Value> {
    ensure!(has_mine(app), "you're already using the original");
    ensure!(note.trim().len() >= 3, "say in a few words why (`note`)");
    let _g = app.write_lock.lock().unwrap();
    let current = files(&mine(app));
    let n = history_ids(app).last().and_then(|s| s.parse::<u32>().ok()).unwrap_or(0) + 1;
    let snap = history_dir(app).join(format!("{n:04}"));
    write_files(&snap, &current)?;
    store::write_json(&snap.join("change.json"), &json!({ "time": crate::util::now_utc(), "action": "reset", "file": null, "note": note.trim() }))?;
    write_files(&mine(app), &BTreeMap::new())?;
    reload(app)?;
    Ok(json!({ "reset": true, "change": n, "using": "original" }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names() {
        for ok in ["index.md", "_about.md", "_pitch.md", "09-my-chapter.md", "01-warmup.md"] {
            assert!(editable(ok), "{ok}");
        }
        for bad in ["README.md", "_template.md", "../01-x.md", "9-x.md", "01-X.md", "01-x.txt", "01-a/b.md", "01-.md"] {
            assert!(!editable(bad), "{bad}");
        }
    }

    #[test]
    fn protected_section_ignores_spacing_only() {
        let a = "# Hi\n\n## Be gentle with your voice\n\nIt should\nnever hurt.\n\n## Next\n\nx";
        let b = "# Changed\n\n## Be gentle with your voice\n\nIt should never   hurt.\n\n## Other\n\ny";
        assert_eq!(section(a, PROTECTED), section(b, PROTECTED));
        assert_ne!(section(a, PROTECTED), section("## Be gentle with your voice\n\nPush through it.", PROTECTED));
    }
}
