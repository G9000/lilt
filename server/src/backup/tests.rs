use super::*;
use axum::body::{Body, to_bytes};
use axum::http::Request;
use tower::ServiceExt;

fn fixture() -> (tempfile::TempDir, Arc<Controller>) {
    let dir = tempfile::tempdir().unwrap();
    let cfg = crate::test_support::config(&dir.path().join("data"));
    let controller = Controller::open(cfg).unwrap();
    (dir, controller)
}

async fn request(
    c: &Arc<Controller>,
    method: &str,
    path: &str,
    body: impl Into<Body>,
    generation: Option<&str>,
) -> (StatusCode, Value) {
    let mut req = Request::builder()
        .method(method)
        .uri(path)
        .header("host", "127.0.0.1:7979")
        .header("content-type", "application/json");
    if let Some(g) = generation {
        req = req.header(GENERATION_HEADER, g);
    }
    let response = c
        .router()
        .oneshot(req.body(body.into()).unwrap())
        .await
        .unwrap();
    let status = response.status();
    let bytes = to_bytes(response.into_body(), 1024 * 1024).await.unwrap();
    (
        status,
        serde_json::from_slice(&bytes).unwrap_or(Value::Null),
    )
}

#[tokio::test]
async fn backup_restore_reopens_profile_preserves_auth_and_rejects_stale_writes() {
    let (_dir, c) = fixture();
    let app = c.app();
    let original = app.profile();
    store::write_atomic(&app.paths.root.join("oauth.json"), b"{\"local\":true}").unwrap();
    let (status, backup) = request(&c, "POST", "/api/backups", "{}", None).await;
    assert_eq!(status, StatusCode::OK, "{backup}");
    let bytes = fs::read(c.archive_path(backup["id"].as_str().unwrap()).unwrap()).unwrap();
    let mut changed = original.clone();
    changed.timezone = "Europe/London".into();
    store::write_json(&app.paths.profile(), &changed).unwrap();
    let (_, preview) = request(&c, "POST", "/api/backups/restore-preview", bytes, None).await;
    let old = c.generation().id;
    let restore = json!({"id":preview["id"],"generation":old,"confirm":true}).to_string();
    let (status, result) = request(
        &c,
        "POST",
        "/api/backups/restore",
        restore.clone(),
        Some(&old),
    )
    .await;
    assert_eq!(status, StatusCode::OK, "{result}");
    assert_eq!(c.app().profile().timezone, original.timezone);
    assert_eq!(
        fs::read(c.app().paths.root.join("oauth.json")).unwrap(),
        b"{\"local\":true}"
    );
    assert!(
        app.enter().is_err(),
        "retired App must reject lingering MCP work"
    );
    assert_ne!(c.generation().id, old);
    for generation in [None, Some(old.as_str())] {
        let (status, _) = request(
            &c,
            "PUT",
            "/api/profile",
            serde_json::to_string(&changed).unwrap(),
            generation,
        )
        .await;
        assert_eq!(status, StatusCode::CONFLICT);
    }
    let current = c.generation().id;
    let (status, _) = request(&c, "POST", "/api/backups/restore", restore, Some(&current)).await;
    assert_eq!(status, StatusCode::CONFLICT);
}

#[tokio::test]
async fn requests_and_recordings_block_backup_without_consuming_preview() {
    let (_dir, c) = fixture();
    let app = c.app();
    let permit = app.enter().unwrap();
    assert_eq!(
        request(&c, "POST", "/api/backups", "{}", None).await.0,
        StatusCode::CONFLICT
    );
    drop(permit);
    let session = crate::test_support::session(&app);
    crate::test_support::new_take(
        &app,
        &session.id,
        crate::test_support::T::default(),
        "audio/wav",
    );
    assert_eq!(
        request(&c, "POST", "/api/backups", "{}", None).await.0,
        StatusCode::CONFLICT
    );
}

#[tokio::test]
async fn another_process_lease_prevents_replacement_and_backup() {
    let (_dir, c) = fixture();
    let other = ProcessLease::open(&c.control).unwrap();
    assert_eq!(
        request(&c, "POST", "/api/backups", "{}", None).await.0,
        StatusCode::CONFLICT
    );
    drop(other);
    assert_eq!(
        request(&c, "POST", "/api/backups", "{}", None).await.0,
        StatusCode::OK
    );
}

#[test]
fn recovery_rolls_back_both_rename_windows() {
    for installed in [false, true] {
        let (dir, c) = fixture();
        let root = c.config.data_dir.clone();
        let control = c.control.clone();
        let old_generation = c.generation();
        let journal = Journal {
            id: Uuid::new_v4().to_string(),
            old_generation: old_generation.clone(),
            new_generation: Generation::restored(),
            committed: false,
        };
        let stage = control.join(format!("stage-{}", journal.id));
        let previous = control.join(format!("previous-{}", journal.id));
        fs::create_dir(&stage).unwrap();
        store::write_atomic(&stage.join("foreign"), b"new").unwrap();
        store::write_json(&control.join("transaction.json"), &journal).unwrap();
        fs::rename(&root, &previous).unwrap();
        if installed {
            fs::rename(&stage, &root).unwrap();
        }
        drop(c);
        let reopened =
            Controller::open(crate::test_support::config(&dir.path().join("data"))).unwrap();
        assert!(!root.join("foreign").exists());
        assert!(root.join("profile.json").exists());
        assert_eq!(reopened.generation().id, old_generation.id);
    }
}

#[tokio::test]
async fn response_body_and_cancelled_blocking_work_keep_admission() {
    let (_dir, c) = fixture();
    let response = c
        .router()
        .oneshot(
            Request::builder()
                .uri("/api/profile")
                .header("host", "localhost:7979")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(
        request(&c, "POST", "/api/backups", "{}", None).await.0,
        StatusCode::CONFLICT
    );
    drop(response);
    let permit = c.app().enter().unwrap();
    let (release, wait) = std::sync::mpsc::channel();
    let (started, ready) = tokio::sync::oneshot::channel();
    let (finished, done) = tokio::sync::oneshot::channel();
    let task = tokio::task::spawn_blocking(move || {
        let _permit = permit;
        started.send(()).unwrap();
        wait.recv().unwrap();
        drop(_permit);
        finished.send(()).unwrap();
    });
    ready.await.unwrap();
    task.abort();
    assert_eq!(
        request(&c, "POST", "/api/backups", "{}", None).await.0,
        StatusCode::CONFLICT
    );
    release.send(()).unwrap();
    done.await.unwrap();
    assert_eq!(
        request(&c, "POST", "/api/backups", "{}", None).await.0,
        StatusCode::OK
    );
}

async fn ready_preview(c: &Arc<Controller>) -> Value {
    let (_, backup) = request(c, "POST", "/api/backups", "{}", None).await;
    let bytes = fs::read(c.archive_path(backup["id"].as_str().unwrap()).unwrap()).unwrap();
    let (status, preview) = request(c, "POST", "/api/backups/restore-preview", bytes, None).await;
    assert_eq!(status, StatusCode::OK, "{preview}");
    preview
}

#[tokio::test]
async fn failures_before_commit_keep_original_data_and_generation() {
    for point in [
        "before_rename",
        "after_previous",
        "before_open",
        "after_open",
    ] {
        let (_dir, c) = fixture();
        let preview = ready_preview(&c).await;
        let app = c.app();
        let mut profile = app.profile();
        profile.timezone = "Europe/London".into();
        store::write_json(&app.paths.profile(), &profile).unwrap();
        let generation = c.generation().id;
        *c.fail_at.lock().unwrap() = Some(point);
        let body = json!({"id":preview["id"],"generation":generation,"confirm":true});
        let (status, result) =
            request(&c, "POST", "/api/backups/restore", body.to_string(), None).await;
        assert_eq!(status, StatusCode::CONFLICT, "{point}: {result}");
        assert_eq!(c.app().profile().timezone, "Europe/London", "{point}");
        assert_eq!(c.generation().id, generation, "{point}");
        assert!(app.enter().is_ok(), "{point}");
        assert!(!c.control.join("transaction.json").exists(), "{point}");
    }
}

#[tokio::test]
async fn invalid_expired_and_unconfirmed_previews_never_replace_live_data() {
    let (_dir, c) = fixture();
    let preview = ready_preview(&c).await;
    let generation = c.generation().id;
    assert_eq!(
        request(
            &c,
            "POST",
            "/api/backups/restore-preview",
            b"not a zip".to_vec(),
            None
        )
        .await
        .0,
        StatusCode::UNPROCESSABLE_ENTITY
    );
    assert_eq!(
        c.preview.lock().unwrap().as_ref().unwrap().id,
        preview["id"]
    );
    for (id, confirm) in [
        ("unknown".to_string(), true),
        (preview["id"].as_str().unwrap().to_string(), false),
    ] {
        let body = json!({"id":id,"generation":generation,"confirm":confirm});
        assert_eq!(
            request(&c, "POST", "/api/backups/restore", body.to_string(), None)
                .await
                .0,
            StatusCode::CONFLICT
        );
        assert_eq!(c.generation().id, generation);
    }
    c.preview.lock().unwrap().as_mut().unwrap().expires = Instant::now() - Duration::from_secs(1);
    let body = json!({"id":preview["id"],"generation":generation,"confirm":true});
    assert_eq!(
        request(&c, "POST", "/api/backups/restore", body.to_string(), None)
            .await
            .0,
        StatusCode::CONFLICT
    );
    assert_eq!(c.generation().id, generation);
    assert!(!c.control.join("transaction.json").exists());
}

#[tokio::test]
async fn generation_is_durable_and_does_not_break_oauth_protocol() {
    let (_dir, c) = fixture();
    let restored = Generation::restored();
    store::write_json(&c.control.join("generation.json"), &restored).unwrap();
    c.live.lock().unwrap().generation = restored.clone();
    let reopened = Controller::open(c.config.clone()).unwrap();
    assert_eq!(reopened.generation().id, restored.id);
    assert_eq!(
        request(&reopened, "PUT", "/api/profile", "{}", None)
            .await
            .0,
        StatusCode::CONFLICT
    );
    let (status, body) = request(&c, "POST", "/oauth/token", "{}", None).await;
    assert_ne!(status, StatusCode::CONFLICT, "{body}");
}

#[test]
fn subprocess_fixture() {
    let Ok(root) = std::env::var("LILT_BACKUP_TEST_ROOT") else {
        return;
    };
    let c = Controller::open(crate::test_support::config(Path::new(&root))).unwrap();
    let mode = std::env::var("LILT_BACKUP_TEST_MODE").unwrap();
    if mode == "lease" {
        fs::write(c.control.join("child-ready"), b"ready").unwrap();
        let mut byte = [0];
        std::io::Read::read_exact(&mut std::io::stdin(), &mut byte).unwrap();
        return;
    }
    let journal = Journal {
        id: Uuid::new_v4().to_string(),
        old_generation: c.generation(),
        new_generation: Generation::restored(),
        committed: mode == "committed",
    };
    let stage = c.control.join(format!("stage-{}", journal.id));
    let previous = c.control.join(format!("previous-{}", journal.id));
    fs::create_dir(&stage).unwrap();
    store::write_json(
        &stage.join("profile.json"),
        &crate::practice::model::Profile::default(),
    )
    .unwrap();
    store::write_atomic(&stage.join("replacement-marker"), b"restored").unwrap();
    store::write_json(&c.control.join("transaction.json"), &journal).unwrap();
    fs::rename(&c.config.data_dir, previous).unwrap();
    if mode != "previous" {
        fs::rename(stage, &c.config.data_dir).unwrap();
    }
    std::process::exit(55);
}

fn child(root: &Path, mode: &str) -> std::process::Command {
    let mut cmd = std::process::Command::new(std::env::current_exe().unwrap());
    cmd.args([
        "--exact",
        "backup::tests::subprocess_fixture",
        "--nocapture",
    ])
    .env("LILT_BACKUP_TEST_ROOT", root)
    .env("LILT_BACKUP_TEST_MODE", mode)
    .stdin(std::process::Stdio::piped())
    .stdout(std::process::Stdio::null());
    cmd
}

#[test]
fn process_exit_at_each_rename_recovers_before_app_open() {
    for mode in ["previous", "installed", "committed"] {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path().join("data");
        assert_eq!(
            child(&root, mode).status().unwrap().code(),
            Some(55),
            "{mode}"
        );
        let c = Controller::open(crate::test_support::config(&root)).unwrap();
        assert_eq!(
            root.join("replacement-marker").exists(),
            mode == "committed",
            "{mode}"
        );
        assert!(c.app().paths.profile().exists(), "{mode}");
        assert_eq!(c.generation().required, mode == "committed");
        assert!(!c.control.join("transaction.json").exists());
    }
}

#[tokio::test]
async fn another_real_process_holds_its_data_lease_until_exit() {
    let (_dir, c) = fixture();
    let mut process = child(&c.config.data_dir, "lease").spawn().unwrap();
    let started = Instant::now();
    while !c.control.join("child-ready").exists() {
        assert!(
            started.elapsed() < Duration::from_secs(10),
            "child did not acquire lease"
        );
        tokio::time::sleep(Duration::from_millis(10)).await;
    }
    assert_eq!(
        request(&c, "POST", "/api/backups", "{}", None).await.0,
        StatusCode::CONFLICT
    );
    std::io::Write::write_all(process.stdin.as_mut().unwrap(), b"x").unwrap();
    assert!(process.wait().unwrap().success());
    assert_eq!(
        request(&c, "POST", "/api/backups", "{}", None).await.0,
        StatusCode::OK
    );
}

#[tokio::test]
async fn failed_rollback_preserves_journal_and_refuses_every_mutation_until_recovery() {
    let (dir, c) = fixture();
    let preview = ready_preview(&c).await;
    *c.fail_at.lock().unwrap() = Some("rollback");
    let body = json!({"id":preview["id"],"generation":c.generation().id,"confirm":true});
    assert_eq!(
        request(&c, "POST", "/api/backups/restore", body.to_string(), None)
            .await
            .0,
        StatusCode::CONFLICT
    );
    let journal = fs::read(c.control.join("transaction.json")).unwrap();
    for path in [
        "/api/backups",
        "/api/backups/restore-preview",
        "/api/backups/restore",
    ] {
        assert_eq!(
            request(&c, "POST", path, "{}", None).await.0,
            StatusCode::SERVICE_UNAVAILABLE
        );
    }
    assert_eq!(
        request(&c, "GET", "/api/profile", Body::empty(), None)
            .await
            .0,
        StatusCode::CONFLICT
    );
    assert_eq!(
        fs::read(c.control.join("transaction.json")).unwrap(),
        journal
    );
    assert_eq!(
        request(&c, "GET", "/api/backups", Body::empty(), None)
            .await
            .0,
        StatusCode::OK
    );
    drop(c);
    let recovered =
        Controller::open(crate::test_support::config(&dir.path().join("data"))).unwrap();
    assert!(recovered.app().enter().is_ok());
    assert!(recovered.app().paths.profile().exists());
}

#[tokio::test]
async fn interrupted_and_oversized_uploads_leave_no_partial_files() {
    let (_dir, c) = fixture();
    let stream = futures::stream::iter([
        Ok(bytes::Bytes::from_static(b"partial")),
        Err(std::io::Error::other("client disconnected")),
    ]);
    assert_eq!(
        request(
            &c,
            "POST",
            "/api/backups/restore-preview",
            Body::from_stream(stream),
            None
        )
        .await
        .0,
        StatusCode::BAD_REQUEST
    );
    let response = c
        .router()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/backups/restore-preview")
                .header("host", "localhost:7979")
                .header(
                    "content-length",
                    (backup_archive::MAX_ARCHIVE_BYTES + 1).to_string(),
                )
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::PAYLOAD_TOO_LARGE);
    let names: Vec<_> = fs::read_dir(&c.control)
        .unwrap()
        .map(|entry| entry.unwrap().file_name().to_string_lossy().into_owned())
        .collect();
    assert!(
        names
            .iter()
            .all(|name| !name.starts_with("upload-") && !name.starts_with("stage-")),
        "{names:?}"
    );
}

#[tokio::test]
async fn backup_controls_keep_host_origin_and_remote_gates() {
    let (_dir, c) = fixture();
    for (host, origin, remote) in [
        ("attacker.example", "http://attacker.example", false),
        ("localhost:7979", "https://attacker.example", false),
        ("localhost:7979", "http://localhost:7979", true),
    ] {
        let mut req = Request::builder()
            .method("POST")
            .uri("/api/backups")
            .header("host", host)
            .header("origin", origin);
        if remote {
            req = req.header("cf-connecting-ip", "203.0.113.1");
        }
        let response = c
            .router()
            .oneshot(req.body(Body::from("{}")).unwrap())
            .await
            .unwrap();
        assert!(
            matches!(
                response.status(),
                StatusCode::FORBIDDEN | StatusCode::NOT_FOUND
            ),
            "{host}, {origin}: {}",
            response.status()
        );
    }
}

#[test]
fn startup_cleans_only_abandoned_uploads_and_stages_without_another_process_lease() {
    let (_dir, c) = fixture();
    let id = Uuid::new_v4();
    let stage = c.control.join(format!("stage-{id}"));
    let upload = c.control.join(format!("upload-{id}.zip"));
    let saved = c.control.join(format!("backup-{id}.zip"));
    let previous = c.control.join(format!("previous-{id}"));
    fs::create_dir(&stage).unwrap();
    fs::create_dir(&previous).unwrap();
    fs::write(&upload, b"partial upload").unwrap();
    fs::write(&saved, b"saved backup").unwrap();
    let config = c.config.clone();
    let concurrent = Controller::open(config.clone()).unwrap();
    assert!(
        stage.exists() && upload.exists(),
        "another process may own this preview"
    );
    drop(concurrent);
    drop(c);
    let _reopened = Controller::open(config).unwrap();
    assert!(!stage.exists() && !upload.exists());
    assert!(
        saved.exists() && previous.exists(),
        "saved backups and recovery roots are retained"
    );
}
