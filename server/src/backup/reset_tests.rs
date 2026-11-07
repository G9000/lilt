use super::*;
use axum::body::to_bytes;
use axum::http::{HeaderMap, Request};

fn fixture() -> (tempfile::TempDir, Arc<Controller>) {
    let dir = tempfile::tempdir().unwrap();
    let controller =
        Controller::open(crate::test_support::config(&dir.path().join("data"))).unwrap();
    (dir, controller)
}

async fn request(
    controller: &Arc<Controller>,
    method: &str,
    path: &str,
    body: impl Into<Body>,
    generation: Option<&str>,
) -> (StatusCode, HeaderMap, Value) {
    let mut request = Request::builder()
        .method(method)
        .uri(path)
        .header("host", "localhost:7979")
        .header("content-type", "application/json");
    if let Some(generation) = generation {
        request = request.header(GENERATION_HEADER, generation);
    }
    let response = controller
        .router()
        .oneshot(request.body(body.into()).unwrap())
        .await
        .unwrap();
    let status = response.status();
    let headers = response.headers().clone();
    let bytes = to_bytes(response.into_body(), 1024 * 1024).await.unwrap();
    (
        status,
        headers,
        serde_json::from_slice(&bytes).unwrap_or(Value::Null),
    )
}

async fn reset(controller: &Arc<Controller>) -> (StatusCode, HeaderMap, Value) {
    let generation = controller.generation().id;
    request(
        controller,
        "POST",
        "/api/reset",
        json!({"generation": generation, "confirmation": "DELETE ALL DATA"}).to_string(),
        Some(&generation),
    )
    .await
}

async fn shutdown(controller: Arc<Controller>) {
    let lease = Arc::downgrade(&controller.lease);
    let app = controller.app();
    app.retired.store(true, Ordering::Release);
    // Keep a notification permit if the worker is still checking for pending jobs.
    app.job_notify.notify_one();
    drop(app);
    drop(controller);
    let started = Instant::now();
    while lease.strong_count() != 0 {
        assert!(
            started.elapsed() < Duration::from_secs(5),
            "scratch worker did not release its data lease"
        );
        tokio::time::sleep(Duration::from_millis(10)).await;
    }
}

#[tokio::test]
async fn reset_requires_exact_confirmation_and_current_generation() {
    let (_dir, c) = fixture();
    let generation = c.generation().id;
    let (status, headers, state) = request(&c, "GET", "/api/reset", "", None).await;
    assert_eq!(status, StatusCode::OK, "{state}");
    assert_eq!(state["generation"], generation);
    assert!(state["reset_id"].is_null());
    assert!(!headers.contains_key("x-lilt-reset"));
    let personal = c.config.data_dir.join("personal-note.txt");
    fs::write(&personal, b"keep until explicitly confirmed").unwrap();
    for body in [
        json!({"generation": generation}),
        json!({"generation": generation, "confirmation": "delete all data"}),
        json!({"generation": generation, "confirmation": "DELETE ALL DATA "}),
        json!({"generation": generation, "confirmation": true}),
    ] {
        let (status, _, result) = request(
            &c,
            "POST",
            "/api/reset",
            body.to_string(),
            Some(&generation),
        )
        .await;
        assert_eq!(status, StatusCode::BAD_REQUEST, "{body}: {result}");
        assert!(personal.exists());
    }
    let stale = Uuid::new_v4().to_string();
    for (body_generation, header_generation) in [
        (stale.as_str(), Some(generation.as_str())),
        (generation.as_str(), Some(stale.as_str())),
        (generation.as_str(), None),
    ] {
        let body = json!({"generation": body_generation, "confirmation": "DELETE ALL DATA"});
        let (status, _, result) = request(
            &c,
            "POST",
            "/api/reset",
            body.to_string(),
            header_generation,
        )
        .await;
        assert_eq!(status, StatusCode::CONFLICT, "{result}");
        assert_eq!(c.generation().id, generation);
        assert!(personal.exists());
    }
}

#[tokio::test]
async fn reset_removes_personal_files_credentials_and_every_managed_backup() {
    let (dir, c) = fixture();
    let old_app = c.app();
    let old_generation = c.generation().id;
    let original_profile = old_app.profile();
    let (status, _, backup) = request(&c, "POST", "/api/backups", "{}", None).await;
    assert_eq!(status, StatusCode::OK, "{backup}");
    let saved_backup = c.archive_path(backup["id"].as_str().unwrap()).unwrap();
    let mut changed = original_profile.clone();
    changed.timezone = "Europe/London".into();
    store::write_json(&old_app.paths.profile(), &changed).unwrap();
    let personal_files = [
        "oauth.json",
        "agents.json",
        ".private/provider-key",
        "unknown/nested/personal.txt",
        "photos/private-photo.png",
        "notes/private-note.md",
        "courses/custom-course/private.md",
    ];
    for name in personal_files {
        let path = old_app.paths.root.join(name);
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(path, b"private sentinel").unwrap();
    }
    fs::write(old_app.paths.deletions_log(), b"old private audit\n").unwrap();
    let session = crate::test_support::session(&old_app);
    let id = Uuid::new_v4();
    let recovery = c.control.join(format!("previous-{id}"));
    fs::create_dir_all(&recovery).unwrap();
    fs::write(recovery.join("old-secret"), b"private sentinel").unwrap();
    let upload = c.control.join(format!("upload-{id}.zip"));
    fs::write(&upload, b"private sentinel").unwrap();
    let unknown_backup = c.control.join("unknown-private-backup.dat");
    fs::write(&unknown_backup, b"private sentinel").unwrap();
    let external_copy = dir.path().join("downloaded-copy.zip");
    fs::write(&external_copy, b"external export").unwrap();

    let (status, headers, result) = reset(&c).await;
    assert_eq!(status, StatusCode::OK, "{result}");
    assert_eq!(result["reset"], true);
    let reset_id = result["reset_id"].as_str().unwrap();
    assert!(Uuid::parse_str(reset_id).is_ok());
    assert_eq!(headers["x-lilt-reset"], reset_id);
    assert_eq!(
        headers[GENERATION_HEADER],
        result["generation"].as_str().unwrap()
    );
    assert_ne!(c.generation().id, old_generation);
    assert!(
        old_app.enter().is_err(),
        "old App must reject lingering work"
    );
    assert_eq!(c.app().profile().timezone, original_profile.timezone);
    assert!(c.app().sessions().is_empty());
    assert!(!old_app.paths.session_dir(&session.id).exists());
    for name in personal_files {
        assert!(!c.config.data_dir.join(name).exists(), "retained {name}");
    }
    for path in [saved_backup, recovery, upload, unknown_backup] {
        assert!(!path.exists(), "retained {}", path.display());
    }
    let remaining: Vec<_> = fs::read_dir(&c.control)
        .unwrap()
        .map(|entry| entry.unwrap().file_name().to_string_lossy().into_owned())
        .collect();
    assert!(
        remaining.iter().all(|name| matches!(
            name.as_str(),
            "transition.lock" | "data-use.lock" | "generation.json" | "reset-marker.json"
        )),
        "unexpected retained control files: {remaining:?}"
    );
    assert_eq!(fs::read(&external_copy).unwrap(), b"external export");
    let audit = fs::read_to_string(c.app().paths.deletions_log()).unwrap();
    assert!(!audit.contains("old private audit"));
    assert!(
        !audit.trim().is_empty(),
        "reset must leave a fresh deletion audit"
    );
    for line in audit.lines() {
        serde_json::from_str::<Value>(line).unwrap();
    }
    for generation in [None, Some(old_generation.as_str())] {
        let (status, headers, result) = request(
            &c,
            "PUT",
            "/api/profile",
            serde_json::to_string(&changed).unwrap(),
            generation,
        )
        .await;
        assert_eq!(status, StatusCode::CONFLICT, "{result}");
        assert_eq!(headers["x-lilt-reset"], reset_id);
    }
    let (status, headers, _) = request(&c, "GET", "/api/profile", "", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(headers["x-lilt-reset"], reset_id);
    assert!(
        c.app()
            .paths
            .exercises()
            .read_dir()
            .unwrap()
            .next()
            .is_some(),
        "bundled exercises must remain available"
    );
}

#[tokio::test]
async fn reset_marker_survives_restart_and_restoring_an_older_export() {
    let (_dir, c) = fixture();
    let (status, _, backup) = request(&c, "POST", "/api/backups", "{}", None).await;
    assert_eq!(status, StatusCode::OK, "{backup}");
    let bytes = fs::read(c.archive_path(backup["id"].as_str().unwrap()).unwrap()).unwrap();
    let (status, _, result) = reset(&c).await;
    assert_eq!(status, StatusCode::OK, "{result}");
    let reset_id = result["reset_id"].as_str().unwrap().to_owned();
    let generation = c.generation().id;
    let config = c.config.clone();
    shutdown(c).await;
    let c = Controller::open(config.clone()).unwrap();
    let (status, headers, state) = request(&c, "GET", "/api/reset", "", None).await;
    assert_eq!(status, StatusCode::OK, "{state}");
    assert_eq!(state["reset_id"], reset_id);
    assert_eq!(state["generation"], generation);
    assert_eq!(headers["x-lilt-reset"], reset_id);
    let (status, _, preview) = request(
        &c,
        "POST",
        "/api/backups/restore-preview",
        bytes,
        Some(&generation),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{preview}");
    let body = json!({"id": preview["id"], "generation": generation, "confirm": true});
    let (status, headers, restored) = request(
        &c,
        "POST",
        "/api/backups/restore",
        body.to_string(),
        Some(&generation),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{restored}");
    assert_eq!(headers["x-lilt-reset"], reset_id);
    shutdown(c).await;
    let reopened = Controller::open(config).unwrap();
    let (status, headers, state) = request(&reopened, "GET", "/api/reset", "", None).await;
    assert_eq!(status, StatusCode::OK, "{state}");
    assert_eq!(state["reset_id"], reset_id);
    assert_eq!(headers["x-lilt-reset"], reset_id);
}

#[tokio::test]
async fn reset_refuses_readers_recordings_jobs_updates_and_other_process_leases() {
    for activity in [
        "reader",
        "recording",
        "pending",
        "running",
        "update",
        "lease",
    ] {
        let (_dir, c) = fixture();
        let app = c.app();
        let generation = c.generation().id;
        let permit = (activity == "reader").then(|| app.enter().unwrap());
        let lease = (activity == "lease").then(|| ProcessLease::open(&c.control).unwrap());
        if activity == "recording" {
            let session = crate::test_support::session(&app);
            crate::test_support::new_take(
                &app,
                &session.id,
                crate::test_support::T::default(),
                "audio/wav",
            );
        }
        if matches!(activity, "pending" | "running") {
            store::write_json(&app.paths.jobs().join("busy.json"), &json!({
                "schema": "lilt.job/1", "id": "busy", "kind": "analysis", "session_id": "session",
                "take_id": "take", "status": activity, "attempts": 0, "run_id": "run",
                "created_utc": "2026-11-07T00:00:00Z", "updated_utc": "2026-11-07T00:00:00Z", "error": null
            })).unwrap();
        }
        if activity == "update" {
            app.write_lock.lock().unwrap().desktop_update_pending = true;
        }
        let (status, _, result) = reset(&c).await;
        assert_eq!(status, StatusCode::CONFLICT, "{activity}: {result}");
        assert_eq!(c.generation().id, generation, "{activity}");
        assert!(app.paths.profile().exists(), "{activity}");
        assert!(!c.control.join("reset-marker.json").exists(), "{activity}");
        drop(permit);
        drop(lease);
    }
}

#[tokio::test]
async fn reset_keeps_host_origin_and_remote_access_gates() {
    let (_dir, c) = fixture();
    let generation = c.generation().id;
    for (host, origin, remote, expected) in [
        (
            "public.example",
            "https://public.example",
            false,
            StatusCode::FORBIDDEN,
        ),
        (
            "localhost:7979",
            "https://attacker.example",
            false,
            StatusCode::FORBIDDEN,
        ),
        (
            "localhost:7979",
            "http://localhost:7979",
            true,
            StatusCode::NOT_FOUND,
        ),
    ] {
        let mut req = Request::builder()
            .method("POST")
            .uri("/api/reset")
            .header("host", host)
            .header("origin", origin)
            .header("content-type", "application/json")
            .header(GENERATION_HEADER, &generation);
        if remote {
            req = req.header("cf-connecting-ip", "203.0.113.1");
        }
        let body = json!({"generation": generation, "confirmation": "DELETE ALL DATA"}).to_string();
        let response = c
            .router()
            .oneshot(req.body(Body::from(body)).unwrap())
            .await
            .unwrap();
        assert_eq!(
            response.status(),
            expected,
            "{host}, {origin}, remote={remote}"
        );
        assert_eq!(c.generation().id, generation);
    }
}

#[tokio::test]
async fn reset_failure_before_commit_keeps_data_auth_generation_and_backups() {
    for point in [
        "reset_before_rename",
        "reset_after_previous",
        "reset_before_open",
        "reset_after_open",
    ] {
        let (_dir, c) = fixture();
        let app = c.app();
        let generation = c.generation().id;
        fs::write(app.paths.root.join("oauth.json"), b"local credentials").unwrap();
        fs::write(
            app.paths.root.join("personal-note"),
            b"original private data",
        )
        .unwrap();
        let (status, _, backup) = request(&c, "POST", "/api/backups", "{}", None).await;
        assert_eq!(status, StatusCode::OK, "{backup}");
        let archive = c.archive_path(backup["id"].as_str().unwrap()).unwrap();
        *c.fail_at.lock().unwrap() = Some(point);
        let (status, _, result) = reset(&c).await;
        assert!(!status.is_success(), "{point}: {result}");
        assert_eq!(c.generation().id, generation, "{point}");
        assert_eq!(
            fs::read(app.paths.root.join("oauth.json")).unwrap(),
            b"local credentials",
            "{point}"
        );
        assert_eq!(
            fs::read(app.paths.root.join("personal-note")).unwrap(),
            b"original private data",
            "{point}"
        );
        assert!(archive.exists(), "{point}");
        assert!(app.enter().is_ok(), "{point}");
        assert!(
            !c.control.join("reset-transaction.json").exists(),
            "{point}"
        );
        assert!(!c.control.join("reset-marker.json").exists(), "{point}");
    }
}

#[tokio::test]
async fn reset_cleanup_failure_retires_app_and_restart_finishes_deletion() {
    let dir = tempfile::tempdir().unwrap();
    let web = dir.path().join("web");
    fs::create_dir_all(web.join("assets")).unwrap();
    fs::write(
        web.join("index.html"),
        b"<html>scratch reset recovery</html>",
    )
    .unwrap();
    fs::write(
        web.join("assets/recovery.js"),
        b"window.scratchRecovery = true;",
    )
    .unwrap();
    let mut config = crate::test_support::config(&dir.path().join("data"));
    config.web_dir = web;
    let c = Controller::open(config).unwrap();
    let old_app = c.app();
    let old_generation = c.generation().id;
    fs::write(
        old_app.paths.root.join("personal-note"),
        b"erase permanently",
    )
    .unwrap();
    let config = c.config.clone();
    let control = c.control.clone();
    *c.fail_at.lock().unwrap() = Some("reset_cleanup");
    let (status, _, result) = reset(&c).await;
    assert!(
        !status.is_success(),
        "cleanup failure must not report success: {result}"
    );
    assert!(old_app.enter().is_err());
    assert!(
        c.app().enter().is_err(),
        "incomplete cleanup must block current writes"
    );
    assert!(control.join("reset-transaction.json").exists());
    let (status, headers, pending) = request(&c, "GET", "/api/reset", "", None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(pending["pending_cleanup"], true);
    assert_ne!(pending["reset_id"], old_generation);
    assert_eq!(
        headers["x-lilt-reset"],
        pending["reset_id"].as_str().unwrap()
    );
    for (path, expected) in [
        ("/", "<html>scratch reset recovery</html>"),
        ("/index.html", "<html>scratch reset recovery</html>"),
        ("/assets/recovery.js", "window.scratchRecovery = true;"),
    ] {
        let response = c
            .router()
            .oneshot(
                Request::builder()
                    .uri(path)
                    .header("host", "localhost:7979")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(
            response.status(),
            StatusCode::OK,
            "recovery bootstrap {path}"
        );
        let body = to_bytes(response.into_body(), 1024).await.unwrap();
        assert_eq!(
            body.as_ref(),
            expected.as_bytes(),
            "recovery bootstrap {path}"
        );
    }
    let (status, _, _) = request(&c, "GET", "/api/profile", "", None).await;
    assert_eq!(
        status,
        StatusCode::CONFLICT,
        "retired data API must remain blocked"
    );
    for (host, remote, expected) in [
        ("public.example", false, StatusCode::FORBIDDEN),
        ("localhost:7979", true, StatusCode::NOT_FOUND),
    ] {
        let mut req = Request::builder().uri("/index.html").header("host", host);
        if remote {
            req = req.header("cf-connecting-ip", "203.0.113.1");
        }
        let response = c
            .router()
            .oneshot(req.body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(
            response.status(),
            expected,
            "recovery bootstrap gate {host}, remote={remote}"
        );
    }
    drop(old_app);
    drop(c);
    let reopened = Controller::open(config).unwrap();
    assert!(reopened.app().enter().is_ok());
    assert_ne!(reopened.generation().id, old_generation);
    assert!(!reopened.config.data_dir.join("personal-note").exists());
    assert!(!control.join("reset-transaction.json").exists());
    let (status, headers, state) = request(&reopened, "GET", "/api/reset", "", None).await;
    assert_eq!(status, StatusCode::OK, "{state}");
    let reset_id = state["reset_id"].as_str().unwrap();
    assert_eq!(headers["x-lilt-reset"], reset_id);
    for entry in fs::read_dir(&control).unwrap() {
        let name = entry.unwrap().file_name().to_string_lossy().into_owned();
        assert!(
            matches!(
                name.as_str(),
                "transition.lock" | "data-use.lock" | "generation.json" | "reset-marker.json"
            ),
            "retained {name}"
        );
    }
}

#[cfg(any(unix, windows))]
#[tokio::test]
async fn reset_never_deletes_files_outside_its_roots_through_links() {
    for location in ["data", "control"] {
        let (dir, c) = fixture();
        let external = dir.path().join("external");
        fs::create_dir(&external).unwrap();
        let sentinel = external.join("keep.txt");
        fs::write(&sentinel, b"outside reset scope").unwrap();
        let parent = if location == "data" {
            &c.config.data_dir
        } else {
            &c.control
        };
        let link = parent.join("linked-private-folder");
        #[cfg(unix)]
        std::os::unix::fs::symlink(&external, &link).unwrap();
        #[cfg(windows)]
        {
            // Junctions exercise reparse-point handling without administrator privileges.
            let output = std::process::Command::new("cmd")
                .args(["/C", "mklink", "/J"])
                .arg(&link)
                .arg(&external)
                .output()
                .unwrap();
            assert!(
                output.status.success(),
                "creating scratch junction failed: {}",
                String::from_utf8_lossy(&output.stderr)
            );
        }
        let generation = c.generation().id;
        let (status, _, result) = reset(&c).await;
        assert_eq!(status, StatusCode::CONFLICT, "{location}: {result}");
        assert_eq!(c.generation().id, generation, "{location}");
        assert_eq!(
            fs::read(&sentinel).unwrap(),
            b"outside reset scope",
            "{location}"
        );
        #[cfg(windows)]
        fs::remove_dir(&link).unwrap();
    }
}
