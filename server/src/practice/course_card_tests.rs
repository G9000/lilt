use crate::app::{App, Shared};
use crate::{courses, recordings, store, test_support};
use axum::body::{Body, to_bytes};
use axum::http::Request;
use serde_json::{Value, json};
use std::path::Path;
use tower::ServiceExt;

fn copy_dir(from: &Path, to: &Path) {
    std::fs::create_dir_all(to).unwrap();
    for entry in std::fs::read_dir(from).unwrap() {
        let entry = entry.unwrap();
        if entry.path().is_dir() {
            copy_dir(&entry.path(), &to.join(entry.file_name()));
        } else {
            std::fs::copy(entry.path(), to.join(entry.file_name())).unwrap();
        }
    }
}

fn fixture() -> (tempfile::TempDir, Shared) {
    let dir = tempfile::tempdir().unwrap();
    let content = dir.path().join("content");
    copy_dir(&test_support::root().join("content"), &content);
    for id in ["reading", "language", "empty"] {
        let course = content.join("courses").join(id);
        std::fs::create_dir_all(&course).unwrap();
        std::fs::write(course.join("course.md"), format!("---\nid: {id}\ntitle: {id}\nkind: reading\nversion: 1\n---\n\nPractice in your own way.\n")).unwrap();
        std::fs::write(course.join("_about.md"), "---\nversion: 1\n---\n").unwrap();
        std::fs::write(
            course.join("index.md"),
            "---\ntitle: Practice\n---\n\n# Practice\n",
        )
        .unwrap();
        for (file, chapter, meta) in [
            ("01-start.md", "start-here", ""),
            ("02-warmup.md", "warmup", "exercises: nhsfife.forward-hum\n"),
            ("03-hidden.md", "hidden", "today: false\n"),
            ("04-draft.md", "draft", "draft: true\n"),
        ] {
            let excluded = if id == "empty" { "today: false\n" } else { "" };
            std::fs::write(course.join(file), format!("---\nid: {chapter}\ntitle: {chapter}\nkind: phrases\n{meta}{excluded}---\n\n## same\n\nA text from {id}.\n\n> Try recalling it.\n")).unwrap();
        }
    }
    let mut cfg = test_support::config(&dir.path().join("data"));
    cfg.content_dir = content;
    (dir, App::open(cfg).unwrap())
}

async fn request(app: &Shared, method: &str, path: &str, body: Value) -> (u16, Value) {
    let response = crate::practice::routes::router()
        .with_state(app.clone())
        .oneshot(
            Request::builder()
                .method(method)
                .uri(path)
                .header("content-type", "application/json")
                .body(Body::from(body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status().as_u16();
    let bytes = to_bytes(response.into_body(), 1024 * 1024).await.unwrap();
    (status, serde_json::from_slice(&bytes).unwrap())
}

async fn queue(app: &Shared, course: &str) -> Value {
    let (status, body) = request(
        app,
        "GET",
        &format!("/api/deck/today?course={course}"),
        Value::Null,
    )
    .await;
    assert_eq!(status, 200, "{body}");
    body
}

async fn rate(app: &Shared, course: &str, card: &str, rating: &str) -> Value {
    let (status, body) = request(
        app,
        "POST",
        &format!("/api/deck/review?course={course}"),
        json!({"card_id": card, "rating": rating}),
    )
    .await;
    assert_eq!(status, 200, "{body}");
    body
}

#[tokio::test]
async fn generic_deck_excludes_voice_tasks_and_ignores_voice_pause() {
    let (_dir, app) = fixture();
    let session = recordings::deck_session(&app).unwrap();
    let id = test_support::new_take(&app, &session.id, test_support::T::default(), "audio/wav");
    let mut take = app.take(&id).unwrap();
    take.original = Some(recordings::model::OriginalFile {
        file: "original.wav".into(),
        bytes: 0,
        sha256: String::new(),
        chunk_count: 0,
    });
    app.save_take(&take).unwrap();
    let mut plan = app.ensure_plan().unwrap();
    let version = plan.version;
    plan.paused = true;
    app.write_plan(plan, Some(version)).unwrap();
    let voice = queue(&app, "voice").await;
    assert_eq!(voice["paused"], true);
    assert_eq!(voice["participation"]["practised_today"], true);
    let q = queue(&app, "reading").await;
    assert_eq!(q["paused"], false);
    assert_eq!(
        q["total_cards"], 2,
        "draft and opted-out chapters are excluded"
    );
    assert_eq!(
        q["items"].as_array().unwrap().len(),
        1,
        "only the first stage opens"
    );
    assert_eq!(q["items"][0]["card"]["id"], "reading/text.start-here.same");
    assert_eq!(q["items"][0]["kind"], "new");
    assert_eq!(q["items"][0]["eyes_off"], false);
    assert_eq!(q["participation"]["practised_today"], false);
    assert!(
        courses::list(&app)["courses"]
            .as_array()
            .unwrap()
            .iter()
            .all(|c| c["shown_in_app"] == true)
    );
}

#[tokio::test]
async fn generic_ratings_are_course_local_and_survive_reopening_and_backup() {
    let (dir, app) = fixture();
    let id = "reading/text.start-here.same";
    let voice_before = queue(&app, "voice").await;
    rate(&app, "reading", id, "again").await;
    assert_eq!(queue(&app, "reading").await["items"][0]["kind"], "again");
    let result = rate(&app, "reading", id, "good").await;
    assert_eq!(result["state"]["reps"], 1);
    assert!(
        result["state"]["introduced_date"].is_string(),
        "a generic start-here chapter uses the daily allowance"
    );
    let q = queue(&app, "reading").await;
    assert_eq!(q["items"][0]["done_today"], true);
    assert_eq!(q["participation"]["practised_today"], true);
    assert_eq!(q["participation"]["days_this_week"], 1);
    let other = queue(&app, "language").await;
    assert_eq!(
        other["items"][0]["card"]["id"],
        "language/text.start-here.same"
    );
    assert_eq!(other["items"][0]["state"]["reps"], 0);
    assert_eq!(other["participation"]["practised_today"], false);
    assert_eq!(queue(&app, "voice").await, voice_before);
    assert!(
        app.sessions().is_empty(),
        "generic ratings create no voice session"
    );
    assert!(!app.paths.root.join("cards/state.json").exists());
    assert!(app.paths.root.join("cards/reading/state.json").exists());
    let archive = dir.path().join("backup.zip");
    let restored = dir.path().join("restored");
    store::backup_archive::create(&app.paths.root, &archive).unwrap();
    store::backup_archive::unpack(&archive, &restored).unwrap();
    let mut cfg = test_support::config(&restored);
    cfg.content_dir = dir.path().join("content");
    let reopened = App::open(cfg).unwrap();
    assert_eq!(queue(&reopened, "reading").await, q);
    assert_eq!(queue(&reopened, "language").await, other);
}

#[tokio::test]
async fn generic_empty_deck_has_no_voice_fallback() {
    let (_dir, app) = fixture();
    let q = queue(&app, "empty").await;
    assert_eq!(q["items"], json!([]));
    assert_eq!(q["total_cards"], 0);
    assert_eq!(q["all_done"], false);
    assert!(q["open_chapter"].is_null());
}

#[tokio::test]
async fn deck_rejects_unknown_courses_foreign_cards_and_foreign_takes() {
    let (_dir, app) = fixture();
    for course in ["", "missing", "..%2Fvoice", "Voice"] {
        for method in ["GET", "POST"] {
            let action = if method == "GET" { "today" } else { "review" };
            let (status, _) = request(
                &app,
                method,
                &format!("/api/deck/{action}?course={course}"),
                json!({"card_id": "ref.daily", "rating": "good"}),
            )
            .await;
            assert_eq!(status, 400, "{method} {course}");
        }
    }
    for (course, card, rating) in [
        ("reading", "ref.daily", "good"),
        ("reading", "language/text.start-here.same", "good"),
        ("voice", "reading/text.start-here.same", "good"),
        ("reading", "reading/text.start-here.same", "ouch"),
        ("reading", "reading/text.start-here.same", "later"),
    ] {
        let (status, _) = request(
            &app,
            "POST",
            &format!("/api/deck/review?course={course}"),
            json!({"card_id": card, "rating": rating}),
        )
        .await;
        assert!(
            (400..500).contains(&status),
            "{course}: {card}, {rating}: {status}"
        );
    }
    let session = recordings::deck_session(&app).unwrap();
    let take = test_support::new_take(&app, &session.id, test_support::T::default(), "audio/wav");
    for (course, card) in [
        ("reading", "reading/text.start-here.same"),
        ("voice", "ref.daily"),
    ] {
        let (status, _) = request(
            &app,
            "POST",
            &format!("/api/deck/review?course={course}"),
            json!({"card_id": card, "rating": "good", "take_id": take}),
        )
        .await;
        assert_eq!(status, 400, "a take from another prompt cannot rate {card}");
    }
    assert!(!app.paths.root.join("cards/reading/state.json").exists());
    assert!(app.take(&take).unwrap().card.is_none());
}

#[tokio::test]
async fn omitted_course_keeps_voice_cards_and_existing_state_paths() {
    let (_dir, app) = fixture();
    let (status, omitted) = request(&app, "GET", "/api/deck/today", Value::Null).await;
    assert_eq!(status, 200);
    assert_eq!(omitted, queue(&app, "voice").await);
    let (status, _) = request(
        &app,
        "POST",
        "/api/deck/review",
        json!({"card_id": "ref.daily", "rating": "good"}),
    )
    .await;
    assert_eq!(status, 200);
    assert!(app.paths.root.join("cards/state.json").exists());
    assert!(app.paths.root.join("cards/reviews.jsonl").exists());
    assert!(!app.paths.root.join("cards/voice").exists());
}

#[tokio::test]
async fn generic_rating_retries_do_not_change_the_schedule_twice() {
    let (dir, app) = fixture();
    let path = "/api/deck/review?course=reading";
    let card = "reading/text.start-here.same";
    let body = json!({"card_id": card, "rating": "good", "request_id": "rating-1"});
    let (status, first) = request(&app, "POST", path, body.clone()).await;
    assert_eq!(status, 200);
    assert_eq!(first["state"]["reps"], 1);
    let mut cfg = test_support::config(&app.paths.root);
    cfg.content_dir = dir.path().join("content");
    drop(app);
    let app = App::open(cfg).unwrap();
    let (status, retried) = request(&app, "POST", path, body.clone()).await;
    assert_eq!(status, 200);
    assert_eq!(retried["duplicate"], true);
    let q = queue(&app, "reading").await;
    assert_eq!(q["items"][0]["state"], first["state"]);
    let log_path = app.paths.root.join("cards/reading/reviews.jsonl");
    assert_eq!(
        std::fs::read_to_string(&log_path).unwrap().lines().count(),
        1
    );

    for changed in [
        json!({"card_id": card, "rating": "easy", "request_id": "rating-1"}),
        json!({"card_id": "reading/text.warmup.same", "rating": "good", "request_id": "rating-1"}),
    ] {
        let (status, _) = request(&app, "POST", path, changed).await;
        assert_eq!(
            status, 400,
            "a request id cannot be reused for another rating or card"
        );
    }
    assert_eq!(queue(&app, "reading").await, q);
    for (rating, request_id) in [("again", "rating-2"), ("good", "rating-3")] {
        let (status, result) = request(
            &app,
            "POST",
            path,
            json!({"card_id": card, "rating": rating, "request_id": request_id}),
        )
        .await;
        assert_eq!(status, 200);
        assert_ne!(result["duplicate"], true);
    }
    assert_eq!(queue(&app, "reading").await["items"][0]["state"]["reps"], 2);
    assert_eq!(
        std::fs::read_to_string(&log_path).unwrap().lines().count(),
        3
    );
    for request_id in ["".to_string(), "bad id".to_string(), "a".repeat(101)] {
        let (status, _) = request(
            &app,
            "POST",
            path,
            json!({"card_id": card, "rating": "good", "request_id": request_id}),
        )
        .await;
        assert_eq!(status, 400, "invalid request ids are rejected");
    }
}
