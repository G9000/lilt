//! A course's texts, written as Markdown in `content/courses/<id>` so they can be edited without code
//! (in any editor, or as an Obsidian vault). `index.md` is the Practice home page, served as raw
//! Markdown, with an optional `cover: images/<file>` banner in its front matter; `_pitch.md`
//! holds the typical speaking pitch references (numbers in front matter, the source as its body); `_about.md` holds the version and the closing note; each `NN-<id>.md` is one chapter,
//! in file-name order:
//!
//! ```markdown
//! ---
//! id: warmup
//! title: Warm-ups
//! subtitle: Hums and gentle glides
//! kind: hum
//! source_url: https://…
//! written_by: Instructions paraphrased from the source.
//! ---
//!
//! How to do it, in a paragraph.
//!
//! ## hum-comfortable
//!
//! mmmmmmm
//!
//! > The hint shown under the text.
//!
//! example: audio/hum-comfortable.mp3
//! ```
//!
//! The `example:` line is optional: a recording of someone saying the text, from the course's `audio` folder.
//!
//! The result has the same shape the app has always served from `/api/texts`.

use anyhow::{Context, Result, anyhow, bail};
use serde_json::{Map, Value, json};
use std::path::Path;

/// `key: value` lines between `---` fences, and the text after them.
pub(crate) fn front_matter(src: &str) -> Result<(Map<String, Value>, &str)> {
    let rest = src.strip_prefix("---\n").ok_or_else(|| anyhow!("must start with a --- front matter block"))?;
    let end = rest.find("\n---").ok_or_else(|| anyhow!("front matter is not closed with ---"))?;
    let mut meta = Map::new();
    for line in rest[..end].lines().filter(|l| !l.trim().is_empty()) {
        let (k, v) = line.split_once(':').ok_or_else(|| anyhow!("front matter line has no `key: value`: {line}"))?;
        meta.insert(k.trim().into(), Value::String(v.trim().into()));
    }
    let body = rest[end + 4..].trim_start_matches(|c| c != '\n').trim_start_matches('\n');
    Ok((meta, body))
}

/// The skills a chapter can say it trains (`area:`), as Progress shows them.
pub const AREAS: [&str; 6] = ["recording", "resonance", "pitch", "lightness", "intonation", "carryover"];

/// Non-empty lines joined into one line of text.
fn joined<'a>(lines: impl Iterator<Item = &'a str>) -> String {
    lines.map(str::trim).filter(|l| !l.is_empty()).collect::<Vec<_>>().join(" ")
}

pub(crate) fn chapter(src: &str, level: usize) -> Result<Value> {
    let (mut meta, body) = front_matter(src)?;
    for key in ["id", "title", "kind"] {
        if meta.get(key).and_then(Value::as_str).unwrap_or("").is_empty() {
            bail!("front matter needs `{key}`");
        }
    }
    let mut sections = body.split("\n## ");
    let basis = sections.next().unwrap_or("");
    let (basis, first) = match basis.strip_prefix("## ") { Some(s) => ("", Some(s)), None => (basis, None) };
    let mut items = Vec::new();
    for section in first.into_iter().chain(sections) {
        let (id, rest) = section.split_once('\n').unwrap_or((section, ""));
        let id = id.trim();
        let example = rest.lines().find_map(|l| l.trim().strip_prefix("example:")).map(str::trim);
        let text = joined(rest.lines().filter(|l| !l.trim_start().starts_with('>') && !l.trim_start().starts_with("example:")));
        let hint = joined(rest.lines().filter_map(|l| l.trim_start().strip_prefix('>')));
        if id.is_empty() || text.is_empty() {
            bail!("text `{id}` needs an id after ## and a line of text");
        }
        if items.iter().any(|i: &Value| i["id"] == id) {
            bail!("text id `{id}` is used twice");
        }
        let mut item = json!({ "id": id, "text": text, "hint": hint });
        if let Some(src) = example.filter(|s| !s.is_empty()) {
            if !src.starts_with("audio/") || src.contains("..") {
                bail!("text `{id}`: an example must be a file in audio/, like `example: audio/{id}.mp3`");
            }
            item["example"] = Value::String(src.into());
        }
        items.push(item);
    }
    if items.is_empty() {
        bail!("has no texts (each starts with `## <id>`)");
    }
    // Optional course keys: the area it trains, built-in exercises that join it, its check-in text
    // (recorded every visit), and `today: false` to keep its texts out of Today's cards.
    let text = |k: &str| meta.get(k).and_then(Value::as_str).map(str::trim).filter(|v| !v.is_empty()).map(String::from);
    let check_in = text("check_in");
    if let Some(c) = &check_in {
        if !items.iter().any(|i| i["id"] == c.as_str()) {
            bail!("check_in `{c}` is not a text in this chapter");
        }
    }
    let area = text("area");
    if let Some(a) = &area {
        if !AREAS.contains(&a.as_str()) {
            bail!("area `{a}` isn't one of {}", AREAS.join(", "));
        }
    }
    // An optional video for the chapter: `video: <YouTube link or id>`, with `video_title` and
    // `video_by`. Practice loads nothing from YouTube until you press play.
    let mut video = None;
    if let Some(v) = text("video") {
        // watch?v=ID&…, youtu.be/ID?…, embed/ID, or the bare id.
        let id = match v.split_once("v=") {
            Some((_, rest)) => rest,
            None => v.trim_end_matches('/').rsplit('/').next().unwrap_or(""),
        };
        let id = id.split(['&', '?', '#']).next().unwrap_or("");
        if id.len() != 11 || !id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_') {
            bail!("video `{v}` isn't a YouTube link (like https://www.youtube.com/watch?v=xxxxxxxxxxx)");
        }
        video = Some(json!({ "id": id, "title": text("video_title").unwrap_or_default(), "by": text("video_by").unwrap_or_default() }));
    }
    let today = text("today").as_deref() != Some("false");
    // Present but empty means none; absent means the built-in table applies (older copies).
    if let Some(ex) = meta.get("exercises").and_then(Value::as_str).map(String::from) {
        meta.insert("exercises".into(), json!(ex.split(',').map(str::trim).filter(|e| !e.is_empty()).collect::<Vec<_>>()));
    }
    if let Some(v) = video {
        meta.insert("video".into(), v);
    }
    meta.insert("area".into(), json!(area));
    meta.insert("check_in".into(), json!(check_in));
    meta.insert("today".into(), json!(today));
    // Optional: no source link, or no subtitle or credit line.
    meta.entry("source_url").or_insert(Value::Null);
    for key in ["subtitle", "written_by"] {
        meta.entry(key).or_insert_with(|| Value::String(String::new()));
    }
    meta.insert("level".into(), json!(level));
    // The intro keeps its paragraphs (blank lines); lines within one are joined.
    let paragraphs: Vec<String> = basis.split("\n\n").map(|p| joined(p.lines())).filter(|p| !p.is_empty()).collect();
    meta.insert("basis".into(), Value::String(paragraphs.join("\n\n")));
    meta.insert("items".into(), Value::Array(items));
    Ok(Value::Object(meta))
}

/// Load `_about.md` and every chapter file from `dir`.
pub fn load(dir: &Path) -> Result<Value> {
    let read = |p: &Path| std::fs::read_to_string(p).with_context(|| format!("reading {}", p.display()));
    let about = dir.join("_about.md");
    let about_src = read(&about)?;
    let (mut out, note) = front_matter(&about_src).with_context(|| format!("in {}", about.display()))?;
    out.insert("version".into(), json!(out.get("version").and_then(Value::as_str).and_then(|v| v.parse::<u64>().ok()).unwrap_or(1)));
    out.insert("note".into(), Value::String(joined(note.lines())));
    let pitch = dir.join("_pitch.md");
    if pitch.exists() {
        let src = read(&pitch)?;
        let (meta, source) = front_matter(&src).with_context(|| format!("in {}", pitch.display()))?;
        let mut reference = Map::new();
        for key in ["men_mean", "men_sd", "women_mean", "women_sd", "overlap_low", "overlap_high"] {
            let v = meta.get(key).and_then(Value::as_str).and_then(|v| v.parse::<f64>().ok())
                .ok_or_else(|| anyhow!("{} needs a number for `{key}`", pitch.display()))?;
            reference.insert(key.into(), json!(v));
        }
        reference.insert("source".into(), Value::String(joined(source.lines())));
        out.insert("pitch_reference".into(), Value::Object(reference));
    }
    let index = dir.join("index.md");
    if index.exists() {
        let src = read(&index)?;
        let (meta, home) = front_matter(&src).with_context(|| format!("in {}", index.display()))?;
        out.insert("home".into(), Value::String(home.trim().into()));
        if let Some(cover) = meta.get("cover") {
            out.insert("home_cover".into(), cover.clone());
        }
    }

    let mut files: Vec<_> = std::fs::read_dir(dir).with_context(|| format!("reading {}", dir.display()))?
        .filter_map(|e| e.ok().map(|e| e.path()))
        .filter(|p| p.extension().is_some_and(|x| x == "md") && p.file_name().and_then(|n| n.to_str()).is_some_and(|n| n.starts_with(|c: char| c.is_ascii_digit())))
        .collect();
    files.sort();
    let mut levels = Vec::new();
    for (i, path) in files.iter().enumerate() {
        let level = chapter(&read(path)?, i + 1).with_context(|| format!("in {}", path.display()))?;
        if levels.iter().any(|l: &Value| l["id"] == level["id"]) {
            bail!("chapter id `{}` is used twice (in {})", level["id"], path.display());
        }
        levels.push(level);
    }
    if levels.is_empty() {
        bail!("no chapter files (NN-name.md) in {}", dir.display());
    }
    out.insert("levels".into(), Value::Array(levels));
    Ok(Value::Object(out))
}

#[cfg(test)]
mod tests {
    use super::*;

    const WARMUP: &str = "---\nid: warmup\ntitle: Warm-ups\nsubtitle: Hums\nkind: hum\nsource_url: https://example.org/a:b\nwritten_by: Lilt.\n---\n\nHum gently,\non a comfortable pitch.\n\n## hum\n\nmmmmmmm\n\n> Notice where\n> you feel it.\n\nexample: audio/hum.mp3\n\n## glide\n\nmmm ↗ ↘\n\n> Easy.\n";

    #[test]
    fn parses_a_chapter() {
        let c = chapter(WARMUP, 3).unwrap();
        assert_eq!(c["id"], "warmup");
        assert_eq!(c["level"], 3);
        assert_eq!(c["source_url"], "https://example.org/a:b");
        assert_eq!(c["basis"], "Hum gently, on a comfortable pitch.");
        assert_eq!(c["items"][0], json!({ "id": "hum", "text": "mmmmmmm", "hint": "Notice where you feel it.", "example": "audio/hum.mp3" }));
        assert!(c["items"][1].get("example").is_none());
        assert_eq!(c["items"][1]["text"], "mmm ↗ ↘");
    }

    #[test]
    fn reads_the_course_keys_and_keeps_intro_paragraphs() {
        let src = "---\nid: pitch\ntitle: Pitch\nkind: hum\narea: pitch\nexercises: a.one, b.two\ncheck_in: two\ntoday: false\n---\n\nFirst paragraph,\nstill first.\n\nSecond **paragraph**.\n\n## one\n\nmm\n\n## two\n\naa\n";
        let c = chapter(src, 1).unwrap();
        assert_eq!(c["area"], "pitch");
        assert_eq!(c["exercises"], json!(["a.one", "b.two"]));
        assert_eq!(c["check_in"], "two");
        assert_eq!(c["today"], false);
        assert_eq!(c["basis"], "First paragraph, still first.\n\nSecond **paragraph**.");
        let plain = chapter(WARMUP, 1).unwrap();
        assert_eq!((plain["area"].clone(), plain["check_in"].clone(), plain["today"].clone()), (Value::Null, Value::Null, json!(true)));
        assert!(plain.get("exercises").is_none(), "absent, so older copies fall back to the built-in table");
        let e = chapter(&src.replace("check_in: two", "check_in: three"), 1).unwrap_err().to_string();
        assert!(e.contains("check_in"), "{e}");
        assert!(chapter(&src.replace("area: pitch", "area: singing"), 1).unwrap_err().to_string().contains("area"));
        assert_eq!(chapter(&src.replace("exercises: a.one, b.two", "exercises:"), 1).unwrap()["exercises"], json!([]), "empty means none");
        let with_video = src.replace("today: false", "video: https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10\nvideo_title: A video\nvideo_by: A channel");
        assert_eq!(chapter(&with_video, 1).unwrap()["video"], json!({ "id": "dQw4w9WgXcQ", "title": "A video", "by": "A channel" }));
        assert_eq!(chapter(&src.replace("today: false", "video: https://youtu.be/dQw4w9WgXcQ"), 1).unwrap()["video"]["id"], "dQw4w9WgXcQ");
        assert!(chapter(&src.replace("today: false", "video: https://evil.example/x"), 1).is_err());
    }

    #[test]
    fn rejects_broken_chapters() {
        assert!(chapter("id: x\n", 1).is_err(), "no front matter");
        assert!(chapter("---\nid: x\ntitle: X\nkind: hum\n---\n\nNo texts.\n", 1).is_err(), "no texts");
        assert!(chapter("---\nid: x\ntitle: X\nkind: hum\n---\n\n## a\n\none\n\n## a\n\ntwo\n", 1).is_err(), "duplicate id");
        assert!(chapter("---\ntitle: X\nkind: hum\n---\n\n## a\n\none\n", 1).is_err(), "missing id");
        assert!(chapter("---\nid: x\ntitle: X\nkind: hum\n---\n\n## a\n\none\n\nexample: ../secret\n", 1).is_err(), "example outside audio/");
    }

    #[test]
    fn loads_the_shipped_texts() {
        let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../content/courses/voice");
        let t = load(&dir).unwrap();
        assert_eq!(t["schema"], "lilt.texts/1");
        assert!(t["home"].as_str().unwrap().contains("## Sources"));
        assert_eq!(t["pitch_reference"]["women_mean"], 199.0);
        assert!(t["pitch_reference"]["source"].as_str().unwrap().contains("Leung"));
        let cover = t["home_cover"].as_str().unwrap();
        assert!(dir.join(cover).exists(), "cover {cover} is missing");
        let levels = t["levels"].as_array().unwrap();
        assert_eq!(levels.len(), 11);
        for (i, l) in levels.iter().enumerate() {
            assert_eq!(l["level"], i + 1);
            // Every chapter of the shipped course says what it trains and names its check-in.
            assert!(l["area"].is_string() && l["check_in"].is_string(), "{}", l["id"]);
            for it in l["items"].as_array().unwrap() {
                assert!(!it["text"].as_str().unwrap().is_empty() && !it["hint"].as_str().unwrap().is_empty(), "{} {}", l["id"], it["id"]);
            }
        }
    }
}
