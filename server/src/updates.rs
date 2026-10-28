//! Bringing updates to Lilt's original syllabus into your own version, piece by piece.
//!
//! Three versions of each file are compared: the original as it was when your copy was made (or
//! last updated; kept in `<data>/syllabus/.base`), the original now, and yours. Each file is split
//! into pieces: everything before the first `## ` heading (a chapter's details and "How to do
//! it"), then one piece per `## ` section (a chapter's texts, by id, or a home page section, by
//! heading). For every piece the original changed:
//!
//! - if you hadn't changed it, the update comes in;
//! - if you had made the same change, nothing to do;
//! - if you both changed it, you choose: keep yours, or take the original's.
//!
//! Pieces only you changed stay as they are. Whole files work the same way (a new chapter in the
//! original comes in; a chapter you removed that the original then changed is yours to decide).

use crate::app::App;
use crate::syllabus::{self, Files};
use crate::texts;
use anyhow::{Result, anyhow, bail, ensure};
use serde_json::{Value, json};
use std::collections::BTreeMap;

/// A file's pieces in order: ("", the part before the first `## `), then ("## heading", section).
fn pieces(src: &str) -> Vec<(String, String)> {
    let mut out = Vec::new();
    let mut rest = src;
    let head_end = if rest.starts_with("## ") { 0 } else { rest.find("\n## ").map(|i| i + 1).unwrap_or(rest.len()) };
    out.push((String::new(), rest[..head_end].trim_end().to_string()));
    rest = &rest[head_end..];
    while !rest.is_empty() {
        let end = rest[3..].find("\n## ").map(|i| i + 4).unwrap_or(rest.len());
        let section = rest[..end].trim_end().to_string();
        let key = section.lines().next().unwrap_or_default().trim_end().to_string();
        out.push((key, section));
        rest = &rest[end..];
    }
    out
}

fn join(pieces: &[(String, String)]) -> String {
    let parts: Vec<&str> = pieces.iter().map(|(_, s)| s.as_str()).filter(|s| !s.is_empty()).collect();
    format!("{}\n", parts.join("\n\n"))
}

/// Same piece, ignoring spacing.
fn same(a: Option<&String>, b: Option<&String>) -> bool {
    let norm = |s: &String| s.split_whitespace().collect::<Vec<_>>().join(" ");
    a.map(norm) == b.map(norm)
}

/// What happens to one piece the original changed.
#[derive(Clone, Copy, PartialEq)]
enum Outcome { Take, Keep, Choose }

fn outcome(base: Option<&String>, orig: Option<&String>, mine: Option<&String>) -> Option<Outcome> {
    if same(base, orig) {
        return None; // the original didn't change it
    }
    Some(if same(mine, orig) { Outcome::Keep } else if same(mine, base) { Outcome::Take } else { Outcome::Choose })
}

/// How a piece reads to a person: a chapter text as its words and hint, anything else as Markdown.
fn show(file: &str, key: &str, piece: Option<&String>) -> Value {
    let Some(p) = piece else { return Value::Null };
    if key.is_empty() || !file.starts_with(|c: char| c.is_ascii_digit()) {
        return json!({ "markdown": p });
    }
    let doc = format!("---\nid: x\ntitle: x\nkind: x\n---\n\n{p}\n");
    match texts::chapter(&doc, 0) {
        Ok(c) => json!({ "markdown": p, "text": c["items"][0]["text"], "hint": c["items"][0]["hint"] }),
        Err(_) => json!({ "markdown": p }),
    }
}

fn label(file: &str, key: &str, titles: &BTreeMap<String, String>) -> String {
    let what = titles.get(file).cloned().unwrap_or_else(|| match file {
        "index.md" => "Home page".into(),
        "_about.md" => "About".into(),
        "_pitch.md" => "Pitch reference".into(),
        f => f.into(),
    });
    match key.strip_prefix("## ") {
        None => what,
        Some(_) if file.starts_with(|c: char| c.is_ascii_digit()) => what,
        Some(h) => format!("{what}: {}", h.trim()),
    }
}

/// Which part of the file a change is about, in words.
fn part(c: &Change) -> &'static str {
    let chapter = c.file.starts_with(|ch: char| ch.is_ascii_digit());
    match (c.key.is_empty(), chapter) {
        (true, _) if c.base.is_none() || c.orig.is_none() || c.mine.is_none() => if chapter { "The whole chapter" } else { "The whole page" },
        (true, true) => "The chapter's title and how to do it",
        (true, false) => "The top of the page",
        (false, true) => "A text",
        (false, false) => "",
    }
}

/// One change of the original, how it will be handled, and the versions to choose between.
struct Change { id: String, file: String, key: String, outcome: Outcome, base: Option<String>, orig: Option<String>, mine: Option<String> }

/// Every change of the original since your copy's base, file by file and piece by piece.
fn changes(base: &Files, orig: &Files, mine: &Files) -> Vec<Change> {
    let mut out = Vec::new();
    let names: std::collections::BTreeSet<&String> = base.keys().chain(orig.keys()).collect();
    for name in names {
        let (b, o, m) = (base.get(name), orig.get(name), mine.get(name));
        if same(b, o) {
            continue;
        }
        // A whole file added or removed on one side is decided as one change.
        if b.is_none() || o.is_none() || m.is_none() {
            if let Some(oc) = outcome(b, o, m) {
                out.push(Change { id: name.clone(), file: name.clone(), key: String::new(), outcome: oc, base: b.cloned(), orig: o.cloned(), mine: m.cloned() });
            }
            continue;
        }
        let (pb, po, pm): (BTreeMap<_, _>, BTreeMap<_, _>, BTreeMap<_, _>) =
            (pieces(b.unwrap()).into_iter().collect(), pieces(o.unwrap()).into_iter().collect(), pieces(m.unwrap()).into_iter().collect());
        let mut keys: Vec<&String> = pieces(o.unwrap()).iter().map(|(k, _)| k).filter_map(|k| po.get_key_value(k).map(|(k, _)| k)).collect();
        keys.extend(pb.keys().filter(|k| !po.contains_key(*k)));
        for key in keys {
            if let Some(oc) = outcome(pb.get(key), po.get(key), pm.get(key)) {
                out.push(Change { id: format!("{name}#{key}"), file: name.clone(), key: key.clone(), outcome: oc,
                    base: pb.get(key).cloned(), orig: po.get(key).cloned(), mine: pm.get(key).cloned() });
            }
        }
    }
    out
}

/// Your file with some of the original's pieces taken in: replaced where they are, new ones placed
/// after the piece they follow in the original, removed ones dropped.
fn merge_file(mine: &str, orig: &str, take: &[&String]) -> String {
    let po = pieces(orig);
    let mut out = pieces(mine);
    for key in take {
        let new = po.iter().find(|(k, _)| k == *key).map(|(_, s)| s.clone());
        match (out.iter().position(|(k, _)| k == *key), new) {
            (Some(i), Some(s)) => out[i].1 = s,
            (Some(i), None) => { out.remove(i); }
            (None, Some(s)) => {
                let at = po.iter().position(|(k, _)| k == *key).unwrap();
                let after = po[..at].iter().rev().find_map(|(k, _)| out.iter().position(|(m, _)| m == k));
                out.insert(after.map_or(out.len(), |i| i + 1), ((*key).clone(), s));
            }
            (None, None) => {}
        }
    }
    join(&out)
}

/// How many of the original's changes are waiting to come in (or to be chosen).
pub fn waiting(app: &App) -> usize {
    changes(&syllabus::base_files(app), &syllabus::original_files(app), &syllabus::mine_files(app)).iter().filter(|c| c.outcome != Outcome::Keep).count()
}

/// What the original changed since your copy's base, and how each change would be handled.
pub fn list(app: &App) -> Value {
    if !syllabus::has_mine(app) {
        return json!({ "using": "original", "available": false, "changes": [],
            "note": "You're using Lilt's original, so its updates already apply." });
    }
    let (base, orig, mine) = (syllabus::base_files(app), syllabus::original_files(app), syllabus::mine_files(app));
    let titles: BTreeMap<String, String> = mine.iter().chain(orig.iter())
        .filter_map(|(n, s)| texts::chapter(s, 0).ok().map(|c| (n.clone(), c["title"].as_str().unwrap_or_default().to_string())))
        .collect();
    let rows: Vec<Value> = changes(&base, &orig, &mine).iter().map(|c| json!({
        "id": c.id, "file": c.file, "title": label(&c.file, &c.key, &titles), "part": part(c),
        "kind": match (&c.base, &c.orig) { (None, _) => "added", (_, None) => "removed", _ => "changed" },
        "handling": match c.outcome { Outcome::Take => "take", Outcome::Keep => "already", Outcome::Choose => "choose" },
        "yours": show(&c.file, &c.key, c.mine.as_ref()),
        "original": show(&c.file, &c.key, c.orig.as_ref()),
        "before": show(&c.file, &c.key, c.base.as_ref()),
    })).collect();
    let version = |f: &Files| f.get("_about.md").and_then(|s| s.lines().find_map(|l| l.strip_prefix("version:"))).map(|v| v.trim().to_string());
    json!({
        "using": "mine",
        "available": rows.iter().any(|r| r["handling"] != "already"),
        "to_choose": rows.iter().filter(|r| r["handling"] == "choose").count(),
        "original_version": version(&orig), "your_base_version": version(&base),
        "changes": rows,
        "how": "\"take\": the original changed it and you hadn't, so the update comes in. \"choose\": you both changed it; pass yours or original for its id. \"already\": you'd made the same change.",
    })
}

/// Bring the original's updates in. Every "choose" change needs a choice: "yours" or "original".
pub fn apply(app: &App, choices: &BTreeMap<String, String>, note: &str) -> Result<Value> {
    ensure!(syllabus::has_mine(app), "you're using Lilt's original, so its updates already apply");
    let (base, orig, mine) = (syllabus::base_files(app), syllabus::original_files(app), syllabus::mine_files(app));
    let all = changes(&base, &orig, &mine);
    for id in choices.keys() {
        ensure!(all.iter().any(|c| &c.id == id), "`{id}` isn't one of the updates");
    }
    let mut take: BTreeMap<&String, Vec<&String>> = BTreeMap::new();
    let mut whole: BTreeMap<&String, Option<&String>> = BTreeMap::new();
    let (mut taken, mut kept) = (0, 0);
    for c in &all {
        let wants = match c.outcome {
            Outcome::Keep => continue,
            Outcome::Take => true,
            Outcome::Choose => match choices.get(&c.id).map(String::as_str) {
                Some("original") => true,
                Some("yours") => false,
                Some(x) => bail!("choose \"yours\" or \"original\" for `{}`, not \"{x}\"", c.id),
                None => bail!("you both changed `{}`: choose \"yours\" or \"original\"", c.id),
            },
        };
        if !wants {
            kept += 1;
            continue;
        }
        taken += 1;
        if c.key.is_empty() && (c.base.is_none() || c.orig.is_none() || c.mine.is_none()) {
            whole.insert(&c.file, c.orig.as_ref());
        } else {
            take.entry(&c.file).or_default().push(&c.key);
        }
    }
    let mut next = mine.clone();
    for (file, keys) in take {
        let m = next.get(file).cloned().ok_or_else(|| anyhow!("{file} is missing"))?;
        next.insert(file.clone(), merge_file(&m, &orig[file], &keys));
    }
    for (file, src) in whole {
        match src {
            Some(s) => next.insert(file.clone(), s.clone()),
            None => next.remove(file),
        };
    }
    let note = if note.trim().is_empty() { "Brought in updates from Lilt's original" } else { note };
    let mut r = syllabus::commit_with_base(app, next, "update", "", note, Some(orig))?;
    r["updates_taken"] = json!(taken);
    r["kept_yours"] = json!(kept);
    Ok(r)
}

#[cfg(test)]
mod tests {
    use super::*;

    const BASE: &str = "---\nid: c\ntitle: C\nkind: hum\n---\n\nHow.\n\n## a\n\none\n\n> h\n\n## b\n\ntwo\n\n> h\n\n## c\n\nthree\n\n> h\n";

    fn files(s: &str) -> Files { BTreeMap::from([("01-c.md".to_string(), s.to_string())]) }

    #[test]
    fn splits_and_joins_back() {
        let p = pieces(BASE);
        assert_eq!(p.iter().map(|(k, _)| k.as_str()).collect::<Vec<_>>(), ["", "## a", "## b", "## c"]);
        assert_eq!(join(&p), BASE);
    }

    #[test]
    fn three_way_by_piece() {
        // The original rewords a, removes c and adds d after b; you reworded b, and also a.
        let orig = BASE.replace("one", "ONE").replace("## c\n\nthree\n\n> h\n", "## d\n\nfour\n\n> h\n");
        let mine_same_a = BASE.replace("two", "my two");
        let ch = changes(&files(BASE), &files(&orig), &files(&mine_same_a));
        let o: Vec<_> = ch.iter().map(|c| (c.key.as_str(), c.outcome as u8)).collect();
        assert_eq!(o, [("## a", Outcome::Take as u8), ("## d", Outcome::Take as u8), ("## c", Outcome::Take as u8)]);
        let merged = merge_file(&mine_same_a, &orig, &ch.iter().map(|c| &c.key).collect::<Vec<_>>());
        assert_eq!(merged, BASE.replace("one", "ONE").replace("two", "my two").replace("## c\n\nthree\n\n> h\n", "## d\n\nfour\n\n> h\n"));

        let mine_both = BASE.replace("one", "my one");
        let ch = changes(&files(BASE), &files(&orig), &files(&mine_both));
        assert!(ch.iter().any(|c| c.key == "## a" && c.outcome == Outcome::Choose));
        let mine_already = BASE.replace("one", "ONE");
        assert!(changes(&files(BASE), &files(&orig), &files(&mine_already)).iter().any(|c| c.key == "## a" && c.outcome == Outcome::Keep));
    }

    #[test]
    fn whole_files() {
        let base = files(BASE);
        let mut orig = base.clone();
        orig.insert("02-new.md".into(), BASE.replace("id: c", "id: n"));
        let ch = changes(&base, &orig, &base);
        assert_eq!((ch.len(), ch[0].file.as_str(), ch[0].outcome == Outcome::Take), (1, "02-new.md", true));
        // You removed a chapter the original then changed: yours to decide.
        let orig2 = files(&BASE.replace("one", "ONE"));
        let ch = changes(&base, &orig2, &BTreeMap::new());
        assert!(ch.len() == 1 && ch[0].outcome == Outcome::Choose && ch[0].key.is_empty());
    }
}
