//! Course scenarios: your own copy of a syllabus, updates from the original, separate courses, the mixtape.

use super::{parse_text_id, read, text_id, valid_id};
use crate::app::App;
use crate::test_support::*;
use std::collections::BTreeMap;

#[test]
fn ids() {
    for ok in ["voice", "mandarin", "spanish-2"] { assert!(valid_id(ok), "{ok}"); }
    for bad in ["", "Voice", "../voice", "a/b", "a b", "x".repeat(41).as_str()] { assert!(!valid_id(bad), "{bad}"); }
}

#[test]
fn text_ids_keep_voice_as_it_was_and_name_other_courses() {
    assert_eq!(text_id("voice", "warmup", "hum"), "text.warmup.hum");
    assert_eq!(text_id("mandarin", "greetings", "nihao"), "mandarin/text.greetings.nihao");
    assert_eq!(parse_text_id("text.warmup.hum"), Some(("voice", "warmup", "hum")));
    assert_eq!(parse_text_id("mandarin/text.greetings.nihao"), Some(("mandarin", "greetings", "nihao")));
    assert_eq!(parse_text_id("ref.count-1-10"), None);
}

#[test]
fn the_voice_course_describes_itself() {
    let c = read(std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../content/courses/voice")).unwrap();
    assert_eq!((c.id.as_str(), c.kind.as_str()), ("voice", "voice"));
    assert_eq!(c.locked, ["Be gentle with your voice"]);
    assert!(c.source.is_none());
}

#[test]
fn syllabus_edits_go_to_your_own_version_and_can_be_undone() {
    use crate::{practice::cards, ai::mcp, courses::syllabus};
    let (dir, app) = app();
    let v = crate::courses::get(&app, "voice").unwrap();
    let call = |name: &str, args: serde_json::Value| mcp::call(&app, name, args.as_object().unwrap());
    let shipped = std::fs::read_to_string(root().join("content/courses/voice/02-m-words.md")).unwrap();
    let has_card = |id: &str| cards::all_cards(&app).iter().any(|c| c.id == id);
    assert_eq!(syllabus::list(&app, &v)["using"], "original");

    // A file Lilt can't read, a non-syllabus name, or a change to the safety section is refused.
    assert!(syllabus::write(&app, &v, "02-m-words.md", "no front matter", "break it").is_err());
    assert!(syllabus::write(&app, &v, "../02-m-words.md", &shipped, "escape").is_err());
    let home = std::fs::read_to_string(root().join("content/courses/voice/index.md")).unwrap();
    let pushy = home.replace("It should never hurt.", "Push through it.");
    assert!(syllabus::write(&app, &v, "index.md", &pushy, "be tougher").unwrap_err().to_string().contains("Be gentle"));
    assert!(!dir.path().join("courses/voice/_about.md").exists(), "refused edits leave no copy");

    // Reword a text and add one: your version, with the original untouched, and new cards.
    let edited = shipped.replacen("meet · many · maybe · Mary · magic", "me · my · may", 1) + "\n## mine-extra\n\nmorning, mum\n\n> Easy.\n";
    let r = syllabus::write(&app, &v, "02-m-words.md", &edited, "shorter first line, one more text").unwrap();
    assert_eq!(r["using"], "mine");
    assert_eq!(std::fs::read_to_string(root().join("content/courses/voice/02-m-words.md")).unwrap(), shipped);
    assert!(has_card("text.m-words.mine-extra"));
    let cmp = call("syllabus_compare", serde_json::json!({})).unwrap().structured_content.unwrap();
    let d = &cmp["differences_from_original"][0];
    assert_eq!((d["file"].as_str(), d["texts_added"][0].as_str()), (Some("02-m-words.md"), Some("mine-extra")));
    assert_eq!(d["texts_changed"].as_array().unwrap().len(), 1);

    // A new chapter, removed again, then undo brings it back.
    let template = std::fs::read_to_string(root().join("content/courses/voice/_template.md")).unwrap();
    syllabus::write(&app, &v, "09-my-chapter.md", &template, "add my own chapter").unwrap();
    assert!(has_card("text.my-chapter.first-text"));
    syllabus::delete(&app, &v, "09-my-chapter.md", "not needed").unwrap();
    assert!(!has_card("text.my-chapter.first-text"));
    syllabus::undo(&app, &v).unwrap();
    assert!(has_card("text.my-chapter.first-text"));
    assert_eq!(syllabus::history(&app, &v)["changes"].as_array().unwrap().len(), 2);

    // Reset goes back to the original and can be undone too; undoing everything ends on the original.
    syllabus::reset(&app, &v, "start over").unwrap();
    assert!(!has_card("text.m-words.mine-extra"));
    syllabus::undo(&app, &v).unwrap();
    assert!(has_card("text.m-words.mine-extra"));
    syllabus::undo(&app, &v).unwrap();
    syllabus::undo(&app, &v).unwrap();
    assert_eq!(syllabus::list(&app, &v)["using"], "original");
    assert!(!has_card("text.m-words.mine-extra"));
    assert!(syllabus::undo(&app, &v).is_err());

    // Your version survives a restart.
    syllabus::write(&app, &v, "02-m-words.md", &edited, "again").unwrap();
    drop(app);
    let again = App::open(config(dir.path())).unwrap();
    assert!(cards::all_cards(&again).iter().any(|c| c.id == "text.m-words.mine-extra"));
    assert_eq!(again.texts.read().unwrap()["edition"]["mine"], true);
}

#[test]
fn syllabus_changes_from_another_process_are_picked_up() {
    use crate::{practice::cards, courses::syllabus};
    let (dir, app) = app();
    let other = App::open(config(dir.path())).unwrap();
    let v = crate::courses::get(&app, "voice").unwrap();
    let src = std::fs::read_to_string(root().join("content/courses/voice/02-m-words.md")).unwrap() + "\n## from-elsewhere\n\nmm\n\n> Easy.\n";
    syllabus::write(&other, &v, "02-m-words.md", &src, "from the stdio server").unwrap();
    assert!(cards::all_cards(&app).iter().any(|c| c.id == "text.m-words.from-elsewhere"));
    let e = syllabus::write(&app, &v, "02-m-words.md", "oops", "break it").unwrap_err().to_string();
    assert!(e.contains("in 02-m-words.md:"), "{e}");
}

fn copy_dir(from: &std::path::Path, to: &std::path::Path) {
    std::fs::create_dir_all(to).unwrap();
    for e in std::fs::read_dir(from).unwrap().flatten() {
        let p = e.path();
        if p.is_dir() { copy_dir(&p, &to.join(e.file_name())) } else { std::fs::copy(&p, to.join(e.file_name())).unwrap(); }
    }
}

#[test]
fn updates_to_the_original_come_in_piece_by_piece() {
    use crate::{practice::cards, courses::syllabus, courses::updates};
    let dir = tempfile::tempdir().unwrap();
    let content = dir.path().join("content");
    copy_dir(&root().join("content"), &content);
    let mut cfg = config(&dir.path().join("data"));
    cfg.content_dir = content.clone();
    let app = App::open(cfg).unwrap();
    let v = crate::courses::get(&app, "voice").unwrap();
    let texts = content.join("courses/voice");
    let read = |n: &str| std::fs::read_to_string(texts.join(n)).unwrap();
    let words = read("02-m-words.md");
    let first = words.lines().skip_while(|l| *l != "## m1").nth(2).unwrap().to_string();
    let second = words.lines().skip_while(|l| *l != "## m2").nth(2).unwrap().to_string();
    assert_eq!(updates::list(&app, &v)["using"], "original");

    // You reword m1; then Lilt's original rewords m1 and m2, adds a chapter and softens the safety section.
    syllabus::write(&app, &v, "02-m-words.md", &words.replace(&first, "my own first line"), "mine").unwrap();
    std::fs::write(texts.join("02-m-words.md"), words.replace(&first, "lilt's new first line").replace(&second, "lilt's new second line")).unwrap();
    std::fs::write(texts.join("09-new.md"), read("_template.md").replace("id: my-chapter", "id: brand-new")).unwrap();
    let home = read("index.md");
    std::fs::write(texts.join("index.md"), home.replace("It should never hurt.", "It should never hurt, not even a little.")).unwrap();

    let l = updates::list(&app, &v);
    assert_eq!(l["available"], true);
    let handling = |id: &str| l["changes"].as_array().unwrap().iter().find(|c| c["id"] == id).map(|c| c["handling"].as_str().unwrap().to_string());
    assert_eq!(handling("02-m-words.md### m1").as_deref(), Some("choose"));
    assert_eq!(handling("02-m-words.md### m2").as_deref(), Some("take"));
    assert_eq!(handling("09-new.md").as_deref(), Some("take"));
    assert_eq!(handling("index.md### Be gentle with your voice").as_deref(), Some("take"));

    // A choice is needed for m1; keep yours.
    assert!(updates::apply(&app, &v, &BTreeMap::new(), "").unwrap_err().to_string().contains("choose"));
    let r = updates::apply(&app, &v, &BTreeMap::from([("02-m-words.md### m1".to_string(), "yours".to_string())]), "").unwrap();
    assert_eq!((r["updates_taken"].as_u64(), r["kept_yours"].as_u64()), (Some(3), Some(1)));
    let mine = syllabus::read(&app, &v, "02-m-words.md", "mine").unwrap()["markdown"].as_str().unwrap().to_string();
    assert!(mine.contains("my own first line") && mine.contains("lilt's new second line"));
    assert!(cards::all_cards(&app).iter().any(|c| c.id == "text.brand-new.first-text"));
    assert!(syllabus::read(&app, &v, "index.md", "mine").unwrap()["markdown"].as_str().unwrap().contains("not even a little"));
    assert_eq!(updates::list(&app, &v)["available"], false, "nothing left to bring in");

    // Undo puts back your version and the base it followed, so the updates show again.
    syllabus::undo(&app, &v).unwrap();
    assert!(!cards::all_cards(&app).iter().any(|c| c.id == "text.brand-new.first-text"));
    assert_eq!(updates::list(&app, &v)["available"], true);
    // Your version still follows the old safety wording until you bring the update in, and you can keep editing.
    syllabus::write(&app, &v, "01-warmup.md", &read("01-warmup.md").replace("title: Warm-ups", "title: Warm-ups, my way"), "rename").unwrap();
}

/// Courses: a second one beside voice, kept apart; `locked` from its course.md; pictures served per
/// course; and an older `<data>/syllabus` copy moved to `<data>/courses/voice` on start.
#[tokio::test]
async fn courses_are_kept_apart_and_old_copies_move_over() {
    use crate::{courses, courses::syllabus};
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;
    let dir = tempfile::tempdir().unwrap();
    let content = dir.path().join("content");
    copy_dir(&root().join("content"), &content);
    let zh = content.join("courses/mandarin");
    std::fs::create_dir_all(zh.join("images")).unwrap();
    std::fs::write(zh.join("course.md"), "---\nid: mandarin\ntitle: Mandarin basics\nkind: language\nversion: 1\nlocked: Tones matter\n---\n\nFirst words and tones.\n").unwrap();
    std::fs::write(zh.join("_about.md"), "---\nversion: 1\n---\n\nA tiny sample.\n").unwrap();
    std::fs::write(zh.join("index.md"), "---\ntitle: Mandarin\n---\n\n# Mandarin\n\n## Tones matter\n\nSay each tone slowly.\n\n## Start\n\nHello.\n").unwrap();
    std::fs::write(zh.join("01-greetings.md"), "---\nid: greetings\ntitle: Greetings\nkind: phrases\n---\n\nSay them slowly.\n\n## nihao\n\nnǐ hǎo\n\n> Hello.\n").unwrap();
    std::fs::write(zh.join("images/tones.webp"), b"RIFF").unwrap();

    // An older copy of the voice course, from before courses.
    let data = dir.path().join("data");
    std::fs::create_dir_all(data.join("syllabus")).unwrap();
    copy_dir(&content.join("courses/voice"), &data.join("syllabus"));
    let mut cfg = config(&data);
    cfg.content_dir = content.clone();
    let app = App::open(cfg.clone()).unwrap();
    assert!(!data.join("syllabus").exists() && data.join("courses/voice/_about.md").exists(), "moved to courses/voice");

    let list = courses::list(&app);
    let ids: Vec<&str> = list["courses"].as_array().unwrap().iter().map(|c| c["id"].as_str().unwrap()).collect();
    assert_eq!(ids, ["voice", "mandarin"], "the app's course first");
    assert_eq!(list["courses"][1]["kind"], "language");
    assert_eq!(list["courses"][0]["using"], "mine");

    // Editing Mandarin makes its own copy; voice and the app's texts are untouched.
    let m = courses::get(&app, "mandarin").unwrap();
    let before = syllabus::texts(&app);
    let ch = std::fs::read_to_string(zh.join("01-greetings.md")).unwrap() + "\n## xiexie\n\nxiè xie\n\n> Thank you.\n";
    syllabus::write(&app, &m, "01-greetings.md", &ch, "add thank you").unwrap();
    assert!(data.join("courses/mandarin/01-greetings.md").exists());
    assert_eq!(syllabus::texts(&app), before);
    assert_eq!(syllabus::list(&app, &m)["using"], "mine");
    // Its locked section, from course.md, stays.
    let idx = std::fs::read_to_string(zh.join("index.md")).unwrap().replace("Say each tone slowly.", "Tones don't matter.");
    assert!(syllabus::write(&app, &m, "index.md", &idx, "skip tones").unwrap_err().to_string().contains("Tones matter"));
    // The tools take the course by id; an unknown one is refused.
    let call = |name: &str, args: serde_json::Value| crate::ai::mcp::call(&app, name, args.as_object().unwrap());
    assert_eq!(call("syllabus_history", serde_json::json!({"course": "mandarin"})).unwrap().structured_content.unwrap()["changes"].as_array().unwrap().len(), 1);
    assert!(call("syllabus_list", serde_json::json!({"course": "../voice"})).is_err());
    assert!(call("courses_list", serde_json::json!({})).unwrap().structured_content.unwrap()["courses"].as_array().unwrap().len() == 2);

    // Pictures per course, and the app's course still at /texts/images.
    let router = crate::build_router(app.clone(), &cfg);
    let get = |uri: &str| Request::builder().uri(uri).header("host", "127.0.0.1:7878").body(Body::empty()).unwrap();
    assert_eq!(router.clone().oneshot(get("/courses/mandarin/images/tones.webp")).await.unwrap().status(), StatusCode::OK);
    assert_eq!(router.clone().oneshot(get("/texts/images/cover.webp")).await.unwrap().status(), StatusCode::OK);
    assert_eq!(router.clone().oneshot(get("/courses/voice/images/cover.webp")).await.unwrap().status(), StatusCode::OK);

    // The Courses app: a course's files, then going back to its original, which history can undo.
    use http_body_util::BodyExt;
    let json = |r: axum::response::Response| async move { serde_json::from_slice::<serde_json::Value>(&r.into_body().collect().await.unwrap().to_bytes()).unwrap() };
    let files = json(router.clone().oneshot(get("/api/syllabus?course=mandarin")).await.unwrap()).await;
    assert_eq!((files["using"].as_str(), files["files"].as_array().unwrap().iter().any(|f| f["status"] == "changed")), (Some("mine"), true));
    let post = Request::builder().method("POST").uri("/api/syllabus/reset?course=mandarin").header("host", "127.0.0.1:7878").header("content-type", "application/json")
        .body(Body::from(r#"{"note":"Went back to the original from Courses"}"#)).unwrap();
    assert_eq!(router.clone().oneshot(post).await.unwrap().status(), StatusCode::OK);
    assert_eq!(syllabus::list(&app, &m)["using"], "original");
    assert_eq!(json(router.clone().oneshot(get("/api/syllabus/history?course=mandarin")).await.unwrap()).await["changes"][0]["action"], "reset");
    let zh_texts = json(router.clone().oneshot(get("/api/texts?course=mandarin")).await.unwrap()).await;
    assert_eq!((zh_texts["levels"][0]["id"].as_str(), zh_texts["edition"]["course"].as_str()), (Some("greetings"), Some("mandarin")));
    assert_eq!(json(router.clone().oneshot(get("/api/texts")).await.unwrap()).await["edition"]["course"], "voice");
    assert_eq!(router.oneshot(get("/api/syllabus?course=nope")).await.unwrap().status(), StatusCode::BAD_REQUEST);
}

/// A remix saves its files as one change (one undo), with the usual checks; without a ChatGPT
/// account it asks you to connect one.
#[tokio::test]
async fn a_remix_is_one_change_and_needs_chatgpt() {
    use crate::{courses, courses::syllabus};
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use http_body_util::BodyExt;
    use tower::ServiceExt;
    let (dir, app) = app();
    let v = courses::get(&app, "voice").unwrap();
    let read = |n: &str| std::fs::read_to_string(root().join("content/courses/voice").join(n)).unwrap();
    let a = read("01-warmup.md").replace("title: Warm-ups", "title: Short warm-ups");
    let b = read("02-m-words.md").replace("title: M and N words", "title: M words");
    syllabus::write_many(&app, &v, vec![("01-warmup.md".into(), a), ("02-m-words.md".into(), b)], "Shorter titles").unwrap();
    let h = syllabus::history(&app, &v);
    assert_eq!((h["changes"].as_array().unwrap().len(), h["changes"][0]["action"].as_str()), (1, Some("remix")));
    let locked = read("index.md").replace("It should never hurt.", "Push through it.");
    assert!(syllabus::write_many(&app, &v, vec![("index.md".into(), locked)], "tougher").is_err());
    syllabus::undo(&app, &v).unwrap();
    assert_eq!(syllabus::list(&app, &v)["using"], "original");

    let router = crate::build_router(app.clone(), &config(dir.path()));
    let req = Request::builder().method("POST").uri("/api/mixtape/remix").header("host", "127.0.0.1:7878").header("content-type", "application/json")
        .body(Body::from(r#"{"request":"Make the warm-ups shorter"}"#)).unwrap();
    let res = router.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::BAD_REQUEST);
    let body = String::from_utf8(res.into_body().collect().await.unwrap().to_bytes().to_vec()).unwrap();
    assert!(body.contains("Connect ChatGPT"), "{body}");
}

/// "New chapter" adds a blank one to your mixtape that Lilt can read, numbered after the last.
#[tokio::test]
async fn a_blank_chapter_lands_in_your_mixtape() {
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use http_body_util::BodyExt;
    use tower::ServiceExt;
    let (dir, app) = app();
    let router = crate::build_router(app.clone(), &config(dir.path()));
    let post = || Request::builder().method("POST").uri("/api/mixtape/chapter").header("host", "127.0.0.1:7878").header("content-type", "application/json").body(Body::from("{}")).unwrap();
    let res = router.clone().oneshot(post()).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let v: serde_json::Value = serde_json::from_slice(&res.into_body().collect().await.unwrap().to_bytes()).unwrap();
    assert_eq!((v["chapter"].as_str(), v["file"].as_str()), (Some("my-chapter-1"), Some("09-my-chapter-1.md")));
    let res = router.oneshot(post()).await.unwrap();
    let v: serde_json::Value = serde_json::from_slice(&res.into_body().collect().await.unwrap().to_bytes()).unwrap();
    assert_eq!(v["file"].as_str(), Some("10-my-chapter-2.md"));
    let t = crate::courses::syllabus::texts(&app);
    assert_eq!(t["levels"].as_array().unwrap().last().unwrap()["title"], "New chapter");
}

/// A blank chapter is a draft: Practice lists it, but Today's cards skip its placeholder texts.
#[test]
fn draft_chapters_make_no_cards() {
    let (_dir, app) = app();
    let v = crate::courses::get(&app, "voice").unwrap();
    let blank = "---\nid: my-chapter-1\ntitle: New chapter\nkind: phrases\ndraft: true\n---\n\nSay what this chapter is for.\n\n## first\n\nYour first text goes here.\n\n> A hint goes here.\n";
    crate::courses::syllabus::write(&app, &v, "09-my-chapter-1.md", blank, "Added a blank chapter").unwrap();
    assert!(crate::courses::syllabus::texts(&app)["levels"].as_array().unwrap().iter().any(|l| l["id"] == "my-chapter-1"));
    assert!(!crate::practice::cards::all_cards(&app).iter().any(|c| c.id.contains("my-chapter-1")));
    crate::courses::syllabus::write(&app, &v, "09-my-chapter-1.md", &blank.replace("draft: true\n", ""), "Filled in").unwrap();
    assert!(crate::practice::cards::all_cards(&app).iter().any(|c| c.id == "text.my-chapter-1.first"));
}
