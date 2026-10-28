//! Your own version of a course. A course's folder (`content/courses/<id>`, see `courses`) is the
//! original and is never changed; the first edit copies it to `<data>/courses/<id>`, and from then
//! on that copy is used. Edits come from AI agents over MCP, one Markdown file at a time:
//!
//! - every edit is checked by loading the whole course as it would be after the change, so a
//!   file Lilt can't read is refused and nothing is written;
//! - the sections the course locks (`locked:` in its course.md, such as "Be gentle with your
//!   voice") stay word for word;
//! - before each change the files are kept in `.history/NNNN`, so any change can be undone;
//! - `.base` keeps the original as it was when the copy was made, to compare against later
//!   updates of the original.
//!
//! Progress is kept by chapter and text id (`text.<chapter>.<text>`), so rewording a text keeps
//! its history; removing or renaming an id leaves its past takes in Recordings only.

use crate::app::App;
use crate::courses::{self, Course};
use crate::store;
use crate::courses::texts;
use anyhow::{Context, Result, anyhow, bail, ensure};
use serde_json::{Value, json};
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

const MAX_FILE: usize = 200_000;

fn mine(app: &App, c: &Course) -> PathBuf {
    app.paths.root.join("courses").join(&c.id)
}

pub type Files = BTreeMap<String, String>;

pub fn has_mine(app: &App, c: &Course) -> bool {
    mine(app, c).join("_about.md").exists()
}

/// The folder a course is read from: your version once there is one, else the original.
pub fn active_dir(app: &App, c: &Course) -> PathBuf {
    if has_mine(app, c) { mine(app, c) } else { c.dir.clone() }
}

fn using(app: &App, c: &Course) -> &'static str {
    if has_mine(app, c) { "mine" } else { "original" }
}

pub fn load_active(app: &App, c: &Course) -> Result<Value> {
    let dir = active_dir(app, c);
    let mut t = texts::load(&dir).with_context(|| format!("loading {}", dir.display()))?;
    let updates = if has_mine(app, c) { crate::courses::updates::waiting(app, c) } else { 0 };
    t["edition"] = json!({ "course": c.id, "title": c.title, "mine": has_mine(app, c), "changes": change_count(app, c), "updates": updates });
    Ok(t)
}

pub fn change_count(app: &App, c: &Course) -> usize {
    history_ids(app, c).len()
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

pub fn original_files(c: &Course) -> Files {
    files(&c.dir)
}

pub fn mine_files(app: &App, c: &Course) -> Files {
    files(&mine(app, c))
}

/// The original as it was when your copy was made, or last brought up to date.
pub fn base_files(app: &App, c: &Course) -> Files {
    files(&mine(app, c).join(".base"))
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

fn history_dir(app: &App, c: &Course) -> PathBuf {
    mine(app, c).join(".history")
}

fn history_ids(app: &App, c: &Course) -> Vec<String> {
    store::list_dirs(&history_dir(app, c)).into_iter().filter(|d| d.len() == 4 && d.bytes().all(|c| c.is_ascii_digit())).collect()
}

/// A section's text, from its `## ` heading to the next one, spacing ignored.
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
pub fn list(app: &App, c: &Course) -> Value {
    let orig = files(&c.dir);
    let active = files(&active_dir(app, c));
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
    let locked = if c.locked.is_empty() { String::new() } else { format!(" These sections can't be changed: {}.", c.locked.iter().map(|h| format!("\"{h}\"")).collect::<Vec<_>>().join(", ")) };
    json!({
        "course": c.id,
        "title": c.title,
        "using": using(app, c),
        "files": rows,
        "removed_from_original": removed,
        "changes_saved": history_ids(app, c).len(),
        "chapter_format": std::fs::read_to_string(c.dir.join("_template.md")).unwrap_or_default(),
        "rules": format!("Chapters are read in file-name order. Keep text ids (## id) when rewording a text so its progress stays with it.{locked}"),
    })
}

pub fn read(app: &App, c: &Course, name: &str, which: &str) -> Result<Value> {
    check_name(name)?;
    let dir = match which {
        "mine" | "" => active_dir(app, c),
        "original" => c.dir.clone(),
        _ => bail!("`from` is \"mine\" or \"original\""),
    };
    let src = std::fs::read_to_string(dir.join(name)).map_err(|_| anyhow!("there is no {name} in {which}"))?;
    Ok(json!({ "course": c.id, "file": name, "from": if dir == c.dir { "original" } else { "mine" }, "markdown": src }))
}

pub fn compare(app: &App, c: &Course, name: Option<&str>) -> Result<Value> {
    if let Some(n) = name {
        check_name(n)?;
    }
    let (orig, active) = (files(&c.dir), files(&active_dir(app, c)));
    let rows: Vec<Value> = diff(&orig, &active).into_iter()
        .filter(|d| name.map_or(d["status"] != "same", |n| d["file"] == n)).collect();
    Ok(json!({ "course": c.id, "using": using(app, c), "differences_from_original": rows }))
}

/// Each locked section must read as in the original now, or as in the original your copy follows
/// (until you bring its update in), in the same file.
fn check_locked(app: &App, c: &Course, next: &Files) -> Result<()> {
    let (orig, base) = (files(&c.dir), base_files(app, c));
    for heading in &c.locked {
        for name in orig.keys().chain(base.keys()) {
            let allowed: Vec<String> = [&orig, &base].iter().filter_map(|f| f.get(name).and_then(|s| section(s, heading))).collect();
            if allowed.is_empty() {
                continue;
            }
            ensure!(next.get(name).and_then(|s| section(s, heading)).is_some_and(|s| allowed.contains(&s)),
                "the \"{heading}\" section of {name} must stay exactly as it is, so nothing was saved");
        }
    }
    Ok(())
}

fn commit(app: &App, c: &Course, next: Files, action: &str, file: &str, note: &str) -> Result<Value> {
    commit_with_base(app, c, next, action, file, note, None)
}

/// Check, keep the current files in history, then write `next` as your version and reload the app.
/// Bringing in updates also moves the base to the original it came from (`new_base`); the old
/// base is kept with the history, so undo puts it back.
pub fn commit_with_base(app: &App, c: &Course, next: Files, action: &str, file: &str, note: &str, new_base: Option<Files>) -> Result<Value> {
    ensure!(note.trim().len() >= 3, "say in a few words what this change is (`note`)");
    let _g = app.write_lock.lock().unwrap();
    let fresh = !has_mine(app, c);
    let current = if fresh { files(&c.dir) } else { files(&mine(app, c)) };
    if current == next {
        bail!("nothing changed");
    }
    // Check the whole course as it would be, in a scratch folder.
    let staging = app.paths.tmp().join(format!("course-check-{}", c.id));
    let _ = std::fs::remove_dir_all(&staging);
    write_files(&staging, &next)?;
    let checked = texts::load(&staging);
    let _ = std::fs::remove_dir_all(&staging);
    if let Err(e) = checked {
        let why = format!("{e:#}").replace(&format!("{}/", staging.display()), "");
        bail!("the course would not load after this change, so nothing was saved: {why}");
    }
    check_locked(app, c, &next)?;

    let n = history_ids(app, c).last().and_then(|s| s.parse::<u32>().ok()).unwrap_or(0) + 1;
    let snap = history_dir(app, c).join(format!("{n:04}"));
    write_files(&snap, &if fresh { BTreeMap::new() } else { current.clone() })?;
    store::write_json(&snap.join("change.json"), &json!({
        "time": crate::util::now_utc(), "action": action, "file": file, "note": note.trim(), "first_change": fresh }))?;
    if fresh {
        write_files(&mine(app, c).join(".base"), &current)?;
    }
    if let Some(b) = new_base {
        write_files(&snap.join(".base"), &base_files(app, c))?;
        write_files(&mine(app, c).join(".base"), &b)?;
    }
    write_files(&mine(app, c), &next)?;
    reload_course(app, c)?;
    Ok(json!({ "course": c.id, "saved": true, "change": n, "using": "mine", "differences_from_before": diff(&current, &next).into_iter().filter(|d| d["status"] != "same").collect::<Vec<_>>() }))
}

/// Read the app's course (Practice) again from disk.
pub fn reload(app: &App) -> Result<()> {
    let c = courses::get(app, courses::DEFAULT)?;
    let t = load_active(app, &c)?;
    *app.texts.write().unwrap() = t;
    *app.texts_stamp.lock().unwrap() = stamp(app, &c);
    Ok(())
}

/// After a change: the app's course is kept loaded; other courses are read when asked for.
fn reload_course(app: &App, c: &Course) -> Result<()> {
    if c.id == courses::DEFAULT { reload(app) } else { Ok(()) }
}

/// When your version last changed on disk (its folder and its history).
fn stamp(app: &App, c: &Course) -> String {
    let m = |p: PathBuf| std::fs::metadata(p).and_then(|m| m.modified()).map(|t| format!("{t:?}")).unwrap_or_default();
    format!("{}|{}|{}", has_mine(app, c), m(mine(app, c)), m(history_dir(app, c)))
}

/// The app's course as Practice shows it, read again if another process (an agent over `lilt
/// mcp-stdio`) changed your version since it was loaded.
pub fn texts(app: &App) -> Value {
    let Ok(c) = courses::get(app, courses::DEFAULT) else { return app.texts.read().unwrap().clone() };
    if *app.texts_stamp.lock().unwrap() != stamp(app, &c) {
        if let Err(e) = reload(app) {
            tracing::warn!("keeping the loaded texts: {e:#}");
            *app.texts_stamp.lock().unwrap() = stamp(app, &c);
        }
    }
    app.texts.read().unwrap().clone()
}

/// Any course's texts as the app would show them: the app's own is kept loaded, others are read now.
pub fn course_texts(app: &App, c: &Course) -> Result<Value> {
    if c.id == courses::DEFAULT { Ok(texts(app)) } else { load_active(app, c) }
}

fn current(app: &App, c: &Course) -> Files {
    files(&active_dir(app, c))
}

pub fn write(app: &App, c: &Course, name: &str, markdown: &str, note: &str) -> Result<Value> {
    check_name(name)?;
    ensure!(markdown.len() <= MAX_FILE, "{name} is too long (over {MAX_FILE} bytes)");
    let mut next = current(app, c);
    next.insert(name.to_string(), format!("{}\n", markdown.trim_end()));
    commit(app, c, next, "write", name, note)
}

/// The course's files as they are now: your mixtape, or the original.
pub fn active_files(app: &App, c: &Course) -> Files {
    current(app, c)
}

/// Create or replace several files as one change (a remix): one entry in the history, one undo.
pub fn write_many(app: &App, c: &Course, changed: Vec<(String, String)>, note: &str) -> Result<Value> {
    let mut next = current(app, c);
    for (name, markdown) in &changed {
        check_name(name)?;
        ensure!(markdown.len() <= MAX_FILE, "{name} is too long (over {MAX_FILE} bytes)");
        next.insert(name.clone(), format!("{}\n", markdown.trim_end()));
    }
    let names: Vec<&str> = changed.iter().map(|(n, _)| n.as_str()).collect();
    commit(app, c, next, "remix", &names.join(", "), note)
}

pub fn delete(app: &App, c: &Course, name: &str, note: &str) -> Result<Value> {
    check_name(name)?;
    ensure!(name.starts_with(|ch: char| ch.is_ascii_digit()), "only chapters can be removed, not {name}");
    let mut next = current(app, c);
    ensure!(next.remove(name).is_some(), "there is no {name} in your version");
    commit(app, c, next, "delete", name, note)
}

pub fn history(app: &App, c: &Course) -> Value {
    let rows: Vec<Value> = history_ids(app, c).iter().rev().map(|id| {
        let h: Value = store::read_json(&history_dir(app, c).join(id).join("change.json")).unwrap_or(Value::Null);
        json!({ "change": id.parse::<u32>().unwrap_or(0), "time": h["time"], "action": h["action"], "file": h["file"], "note": h["note"] })
    }).collect();
    json!({ "course": c.id, "using": using(app, c), "changes": rows })
}

/// Put back the files as they were before the latest change.
pub fn undo(app: &App, c: &Course) -> Result<Value> {
    let _g = app.write_lock.lock().unwrap();
    let id = history_ids(app, c).pop().ok_or_else(|| anyhow!("there is no change to undo"))?;
    let snap = history_dir(app, c).join(&id);
    let h: Value = store::read_json(&snap.join("change.json"))?;
    let before = files(&snap);
    if snap.join(".base").exists() {
        write_files(&mine(app, c).join(".base"), &files(&snap.join(".base")))?;
    }
    // The first change made the copy: undoing it goes back to the original.
    write_files(&mine(app, c), &before)?;
    std::fs::remove_dir_all(&snap)?;
    reload_course(app, c)?;
    Ok(json!({ "course": c.id, "undone": id.parse::<u32>().unwrap_or(0), "note": h["note"], "using": using(app, c) }))
}

/// Go back to the original. It is kept in history like any change, so it can be undone too.
pub fn reset(app: &App, c: &Course, note: &str) -> Result<Value> {
    ensure!(has_mine(app, c), "you're already using the original");
    ensure!(note.trim().len() >= 3, "say in a few words why (`note`)");
    let _g = app.write_lock.lock().unwrap();
    let current = files(&mine(app, c));
    let n = history_ids(app, c).last().and_then(|s| s.parse::<u32>().ok()).unwrap_or(0) + 1;
    let snap = history_dir(app, c).join(format!("{n:04}"));
    write_files(&snap, &current)?;
    store::write_json(&snap.join("change.json"), &json!({ "time": crate::util::now_utc(), "action": "reset", "file": null, "note": note.trim() }))?;
    write_files(&mine(app, c), &BTreeMap::new())?;
    reload_course(app, c)?;
    Ok(json!({ "course": c.id, "reset": true, "change": n, "using": "original" }))
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
        let h = "Be gentle with your voice";
        assert_eq!(section(a, h), section(b, h));
        assert_ne!(section(a, h), section("## Be gentle with your voice\n\nPush through it.", h));
    }
}
