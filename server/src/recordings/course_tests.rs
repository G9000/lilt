use super::*;
use crate::app::Shared;
use crate::test_support;
use axum::body::{Body, to_bytes};
use axum::http::Request;
use tower::ServiceExt;

fn copy_dir(from: &std::path::Path, to: &std::path::Path) {
    fs::create_dir_all(to).unwrap();
    for entry in fs::read_dir(from).unwrap() {
        let entry = entry.unwrap();
        if entry.path().is_dir() {
            copy_dir(&entry.path(), &to.join(entry.file_name()));
        } else {
            fs::copy(entry.path(), to.join(entry.file_name())).unwrap();
        }
    }
}

fn fixture() -> (tempfile::TempDir, Shared) {
    let dir = tempfile::tempdir().unwrap();
    let content = dir.path().join("content");
    copy_dir(&test_support::root().join("content"), &content);
    for id in ["reading", "language"] {
        let course = content.join("courses").join(id);
        fs::create_dir_all(&course).unwrap();
        fs::write(
            course.join("course.md"),
            format!("---\nid: {id}\ntitle: {id}\nkind: reading\nversion: 1\n---\n"),
        )
        .unwrap();
        fs::write(course.join("_about.md"), "---\nversion: 1\n---\n").unwrap();
        fs::write(course.join("01-start.md"), format!("---\nid: start\ntitle: Getting started\nkind: reading\n---\n\n## first\n\nRead from {id}.\n\n> Notice the rhythm.\n\n## second\n\nTry something else.\n")).unwrap();
    }
    let mut cfg = test_support::config(&dir.path().join("data"));
    cfg.content_dir = content;
    (dir, App::open(cfg).unwrap())
}

async fn request(app: &Shared, method: &str, path: &str, body: Value) -> (u16, Value) {
    let response = crate::http::router(app.clone())
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

fn take_request(session: &Session, prompt: &str) -> NewTake {
    serde_json::from_value(json!({
        "take_id": util::new_id("t"), "session_id": session.id, "role": "free",
        "prompt_id": prompt, "prompt_text": "Client text must not replace the saved task.", "mime": "audio/webm"
    })).unwrap()
}

#[tokio::test]
async fn course_guided_audio_and_reflection_survive_reload_without_voice_work() {
    let (_dir, app) = fixture();
    let (status, created) = request(
        &app,
        "POST",
        "/api/sessions",
        json!({
            "kind": "course_guided", "course": "reading", "prompt_id": "reading/text.start.first"
        }),
    )
    .await;
    assert_eq!(status, 200, "{created}");
    let session: Session = serde_json::from_value(created).unwrap();
    assert!(session.plan_version.is_none());
    let task = session.task.as_ref().unwrap();
    assert_eq!(task.title, "Getting started");
    assert_eq!(task.hint, "Notice the rhythm.");
    let course = courses::get(&app, "reading").unwrap();
    let path = course.dir.join("01-start.md");
    fs::write(
        &path,
        fs::read_to_string(&path)
            .unwrap()
            .replace("Read from reading.", "Changed later."),
    )
    .unwrap();
    let take = create_take(&app, take_request(&session, &task.prompt_id)).unwrap();
    assert_eq!(take.prompt_text, "Read from reading.");
    let bytes = test_support::fixture("harmonic_240.webm");
    put_chunk(&app, &take.id, 0, &bytes, None).unwrap();
    for _ in 0..2 {
        let saved = finalize(
            &app,
            &take.id,
            FinalizeReq {
                chunk_count: 1,
                interrupted: false,
            },
        )
        .unwrap();
        assert_eq!(saved.status, TakeStatus::Saved);
        assert_eq!(
            saved.original.as_ref().unwrap().sha256,
            store::sha256_hex(&bytes)
        );
        assert_eq!(
            fs::read(
                app.paths
                    .take_dir(&saved.session_id, &saved.id)
                    .join(&saved.original.unwrap().file)
            )
            .unwrap(),
            bytes
        );
    }
    let (status, completed) = request(
        &app,
        "PATCH",
        &format!("/api/sessions/{}", session.id),
        json!({"notes": "The rhythm felt familiar.", "complete": true}),
    )
    .await;
    assert_eq!(status, 200, "{completed}");
    assert_eq!(completed["state"], "completed");
    assert!(crate::analysis::enqueue_analysis(&app, &take).is_err());
    assert!(crate::analysis::remeasure(&app, &take.id).is_err());
    assert!(crate::analysis::retry_failed(&app, &take.id).is_err());
    assert!(crate::coach::review_session(&app, &session.id).is_err());
    assert!(crate::analysis::jobs(&app).is_empty());
    assert!(app.reviews_in(&session.id).is_empty());
    assert!(!crate::desktop_update::unfinished_take(&app).unwrap());
    assert_eq!(
        crate::practice::progress::participation(&app, &session.local_date)["practised_today"],
        false
    );
    let reopened = App::open(app.config.clone()).unwrap();
    let restored = reopened.session(&session.id).unwrap();
    assert_eq!(restored.notes.as_deref(), Some("The rhythm felt familiar."));
    assert_eq!(restored.task.unwrap().text, "Read from reading.");
    assert_eq!(reopened.take(&take.id).unwrap().status, TakeStatus::Saved);
    let (_, history) = request(&reopened, "GET", "/api/history?course=reading", Value::Null).await;
    assert_eq!(history["takes"][0]["id"], take.id);
    assert!(history["takes"][0]["analysis_summary"].is_null());
    let (_, voice) = request(&reopened, "GET", "/api/history", Value::Null).await;
    assert!(voice["takes"].as_array().unwrap().is_empty());
    let (_, voice) = request(&reopened, "GET", "/api/sessions", Value::Null).await;
    assert_eq!(voice["total"], 0);
    let (_, sessions) = request(
        &reopened,
        "GET",
        "/api/sessions?course=reading",
        Value::Null,
    )
    .await;
    assert_eq!(sessions["total"], 1);
    assert_eq!(
        sessions["sessions"][0]["task"]["text"],
        "Read from reading."
    );
}

#[tokio::test]
async fn course_recordings_validate_ownership_and_saved_card_evidence() {
    let (_dir, app) = fixture();
    let reading = studio_session_for_course(&app, "reading").unwrap();
    assert_eq!(
        reading.id,
        studio_session_for_course(&app, "reading").unwrap().id
    );
    let language = studio_session_for_course(&app, "language").unwrap();
    assert_ne!(reading.id, language.id);
    assert_ne!(reading.id, studio_session(&app).unwrap().id);
    for bad in ["", "../voice", "missing"] {
        for path in [
            format!("/api/studio/session?course={bad}"),
            format!("/api/sessions?course={bad}"),
            format!("/api/history?course={bad}"),
        ] {
            let method = if path.contains("studio") {
                "POST"
            } else {
                "GET"
            };
            assert!(
                request(&app, method, &path, Value::Null).await.0 >= 400,
                "{path}"
            );
        }
    }
    for prompt in [
        "text.warmup.lip-trill",
        "language/text.start.first",
        "reading/text.start.missing",
    ] {
        assert!(create_take(&app, take_request(&reading, prompt)).is_err());
    }
    let mut wrong = take_request(&reading, "free");
    wrong.exercise_id = Some("nhsfife.forward-hum".into());
    assert!(create_take(&app, wrong).is_err());
    let take = create_take(&app, take_request(&reading, "reading/text.start.first")).unwrap();
    let card = json!({"card_id": "reading/text.start.first", "rating": "good", "take_id": take.id});
    assert_eq!(
        request(
            &app,
            "POST",
            "/api/deck/review?course=reading",
            card.clone()
        )
        .await
        .0,
        400
    );
    put_chunk(&app, &take.id, 0, b"original bytes", None).unwrap();
    assert_eq!(reconcile_interrupted(&app).unwrap(), 1);
    assert_eq!(
        app.take(&take.id).unwrap().completeness,
        Some(Completeness::Interrupted)
    );
    let (status, result) = request(&app, "POST", "/api/deck/review?course=reading", card).await;
    assert_eq!(status, 200, "{result}");
    assert!(app.take(&take.id).unwrap().card.is_some());
    for (course, prompt) in [
        ("language", "language/text.start.first"),
        ("reading", "reading/text.start.second"),
    ] {
        assert_eq!(
            request(
                &app,
                "POST",
                &format!("/api/deck/review?course={course}"),
                json!({"card_id": prompt, "rating": "good", "take_id": take.id})
            )
            .await
            .0,
            400
        );
    }
    let mut wrong = take_request(&language, "free");
    wrong.retry_of = Some(take.id.clone());
    assert!(create_take(&app, wrong).is_err());
    assert!(crate::analysis::jobs(&app).is_empty());
}

#[test]
fn course_legacy_session_and_take_files_default_to_voice() {
    let (_dir, app) = test_support::app();
    let session = test_support::session(&app);
    let id = test_support::new_take(&app, &session.id, test_support::T::default(), "audio/webm");
    let mut old = serde_json::to_value(&session).unwrap();
    old.as_object_mut().unwrap().remove("course");
    old.as_object_mut().unwrap().remove("task");
    let restored: Session = serde_json::from_value(old).unwrap();
    assert_eq!(restored.course, "voice");
    assert!(restored.task.is_none());
    let mut old = serde_json::to_value(app.take(&id).unwrap()).unwrap();
    old.as_object_mut().unwrap().remove("course");
    let restored: Take = serde_json::from_value(old).unwrap();
    assert_eq!(restored.course, "voice");
}

#[test]
fn course_guided_can_finish_without_audio_and_recovery_rejects_voice_jobs() {
    let (_dir, app) = fixture();
    for (course, kind, prompt) in [
        ("voice", "course_guided", "text.warmup.lip-trill"),
        ("reading", "full", "reading/text.start.first"),
        ("reading", "course_guided", "language/text.start.first"),
        ("reading", "course_guided", "reading/text.start.unknown"),
    ] {
        let req =
            serde_json::from_value(json!({"course": course, "kind": kind, "prompt_id": prompt}))
                .unwrap();
        assert!(create_session(&app, req).is_err());
    }
    let session = create_session(
        &app,
        serde_json::from_value(json!({
            "kind": "course_guided", "course": "reading", "prompt_id": "reading/text.start.first"
        }))
        .unwrap(),
    )
    .unwrap();
    assert!(create_take(&app, take_request(&session, "free")).is_err());
    let completed = update_session(
        &app,
        &session.id,
        SessionUpdate {
            comfort: None,
            notes: Some("Practised away from the microphone.".into()),
            complete: Some(true),
        },
    )
    .unwrap();
    assert_eq!(completed.state, SessionState::Completed);
    assert!(app.takes_in(&session.id).is_empty());
    let input = serde_json::from_value(json!({"session_id": session.id, "idempotency_key": "generic-review", "author_name": "test"})).unwrap();
    assert!(crate::coach::validate::save_agent_review(&app, input).is_err());

    let studio = studio_session_for_course(&app, "reading").unwrap();
    let take = create_take(&app, take_request(&studio, "free")).unwrap();
    put_chunk(&app, &take.id, 0, b"saved original", None).unwrap();
    finalize(
        &app,
        &take.id,
        FinalizeReq {
            chunk_count: 1,
            interrupted: false,
        },
    )
    .unwrap();
    let path = app.paths.jobs().join(format!("analyze-{}.json", take.id));
    let mut job = json!({"schema": "lilt.job/1", "id": format!("analyze-{}", take.id), "kind": "analyze",
        "session_id": session.id, "take_id": take.id, "status": "running", "attempts": 0,
        "run_id": "should-never-run", "created_utc": util::now_utc(), "updated_utc": util::now_utc(), "error": null});
    store::write_json(&path, &job).unwrap();
    crate::analysis::reconcile(&app).unwrap();
    assert!(!path.exists());
    job["status"] = json!("pending");
    store::write_json(&path, &job).unwrap();
    crate::analysis::run_pending(&app);
    assert!(!path.exists());
    assert_eq!(app.take(&take.id).unwrap().status, TakeStatus::Saved);
    assert!(app.take(&take.id).unwrap().analysis_run.is_none());
    assert!(app.reviews_in(&studio.id).is_empty());
}
