//! Portable backups and a stable dispatcher for recoverable whole-App replacement.

pub mod admission;
#[cfg(test)]
mod tests;
mod transaction;

use crate::app::{App, Config, Shared};
use crate::store::{self, backup_archive};
use anyhow::{Context, Result, ensure};
use axum::{
    Json, Router,
    body::Body,
    extract::{Request, State},
    http::{StatusCode, header},
    middleware,
    response::{IntoResponse, Response},
};
use futures::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::{Arc, Mutex, atomic::Ordering},
    time::{Duration, Instant},
};
use tokio::io::AsyncWriteExt;
use tower::ServiceExt;
pub(crate) use transaction::ProcessLease;
use uuid::Uuid;

const GENERATION_HEADER: &str = "x-lilt-generation";
const PREVIEW_LIFETIME: Duration = Duration::from_secs(30 * 60);

#[derive(Clone, Debug, Deserialize, Serialize)]
struct Generation {
    id: String,
    required: bool,
}
impl Generation {
    fn restored() -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            required: true,
        }
    }
}

#[derive(Deserialize, Serialize)]
struct Journal {
    id: String,
    old_generation: Generation,
    new_generation: Generation,
    committed: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
struct Backup {
    id: String,
    created_utc: String,
    files: u64,
    bytes: u64,
    recordings: u64,
    download_url: String,
}
impl Backup {
    fn new(id: String, summary: backup_archive::Summary) -> Self {
        Self {
            download_url: format!("/api/backups/{id}/download"),
            id,
            created_utc: summary.created_utc,
            files: summary.files,
            bytes: summary.bytes,
            recordings: summary.recordings,
        }
    }
}

struct Preview {
    id: String,
    generation: String,
    expires: Instant,
}
struct Live {
    app: Shared,
    router: Router,
    generation: Generation,
}

pub struct Controller {
    config: Config,
    control: PathBuf,
    live: Mutex<Live>,
    activity: Arc<admission::Admission>,
    lease: Arc<ProcessLease>,
    operation: Arc<tokio::sync::Mutex<()>>,
    preview: Mutex<Option<Preview>>,
    #[cfg(test)]
    fail_at: Mutex<Option<&'static str>>,
}

impl Controller {
    pub fn open(mut config: Config) -> Result<Arc<Self>> {
        let absolute = std::path::absolute(&config.data_dir)?;
        let parent = absolute.parent().context("data folder needs a parent")?;
        fs::create_dir_all(parent).context("creating the data parent")?;
        let parent = parent.canonicalize().context("resolving the data parent")?;
        let name = absolute.file_name().context("data folder needs a name")?;
        config.data_dir = parent.join(name);
        if config.data_dir.exists() {
            ensure!(
                transaction::ordinary(&fs::symlink_metadata(&config.data_dir)?),
                "data root must not be a link"
            );
        }
        let control = parent.join(format!(".{}.lilt-backups", name.to_string_lossy()));
        fs::create_dir_all(&control).context("creating the backup control directory")?;
        ensure!(
            transaction::ordinary(&fs::symlink_metadata(&control)?),
            "backup control directory must not be a link"
        );
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            fs::set_permissions(&control, fs::Permissions::from_mode(0o700))?;
        }
        let _transition = transaction::transition(&control)?;
        let lease = Arc::new(ProcessLease::open(&control)?);
        if control.join("transaction.json").exists() {
            lease.exclusive(|| transaction::recover(&config.data_dir, &control))?;
        }
        if let Err(error) = lease.exclusive(|| transaction::clean_orphans(&control)) {
            tracing::debug!("leaving temporary backup files in place: {error:#}");
        }
        let generation =
            transaction::generation(&control).context("opening the data generation")?;
        let activity = Arc::new(admission::Admission::default());
        let app = App::open_with_activity(config.clone(), activity.clone(), Some(lease.clone()))
            .context("opening practice data")?;
        let router = crate::build_router(app.clone(), &config);
        Ok(Arc::new(Self {
            config,
            control,
            live: Mutex::new(Live {
                app,
                router,
                generation,
            }),
            activity,
            lease,
            operation: Arc::new(tokio::sync::Mutex::new(())),
            preview: Mutex::new(None),
            #[cfg(test)]
            fail_at: Mutex::new(None),
        }))
    }

    pub fn app(&self) -> Shared {
        self.live
            .lock()
            .expect("live app lock poisoned")
            .app
            .clone()
    }
    fn generation(&self) -> Generation {
        self.live
            .lock()
            .expect("live app lock poisoned")
            .generation
            .clone()
    }
    pub fn router(self: &Arc<Self>) -> Router {
        Router::new().fallback(dispatch).with_state(self.clone())
    }

    fn archive_path(&self, id: &str) -> Result<PathBuf> {
        ensure!(Uuid::parse_str(id).is_ok(), "unknown backup");
        let path = self.control.join(format!("backup-{id}.zip"));
        ensure!(path.is_file(), "unknown backup");
        Ok(path)
    }

    fn check_idle(&self, app: &App) -> Result<()> {
        let state = app.write_lock.lock().expect("write lock poisoned");
        ensure!(
            !state.desktop_update_pending,
            "Lilt is preparing a desktop update. Finish or cancel it first."
        );
        ensure!(
            !crate::desktop_update::unfinished_take(app)?,
            "Finish recording and let your take finish saving before backing up or restoring."
        );
        for entry in fs::read_dir(app.paths.jobs())? {
            let entry = entry?;
            ensure!(
                entry.file_type()?.is_file(),
                "unable to check analysis jobs"
            );
            let job: crate::analysis::Job = store::read_json(&entry.path())?;
            ensure!(
                !matches!(job.status.as_str(), "pending" | "running"),
                "Let Lilt finish measuring your recordings, then try again."
            );
        }
        Ok(())
    }

    fn create_backup(&self) -> Result<Backup> {
        let _transition = transaction::transition(&self.control)?;
        self.lease.exclusive(|| {
            let app = self.app();
            self.check_idle(&app)?;
            self.make_backup(&app.paths.root)
        })
    }

    fn recover_failed(&self) -> Result<()> {
        #[cfg(test)]
        self.fail("rollback")?;
        transaction::recover(&self.config.data_dir, &self.control)
    }

    #[cfg(test)]
    fn fail(&self, point: &str) -> Result<()> {
        ensure!(
            *self.fail_at.lock().unwrap() != Some(point),
            "injected restore failure at {point}"
        );
        Ok(())
    }

    fn make_backup(&self, root: &Path) -> Result<Backup> {
        let id = Uuid::new_v4().to_string();
        let path = self.control.join(format!("backup-{id}.zip"));
        let summary = match backup_archive::create(root, &path) {
            Ok(summary) => summary,
            Err(error) => {
                let _ = fs::remove_file(path);
                return Err(error);
            }
        };
        let backup = Backup::new(id, summary);
        store::write_json(
            &self.control.join(format!("backup-{}.json", backup.id)),
            &backup,
        )?;
        store::write_json(&self.control.join("last-backup.json"), &backup)?;
        Ok(backup)
    }

    fn restore(&self, request: Restore) -> Result<(Value, Shared)> {
        ensure!(
            request.confirm,
            "Confirm replacing your current practice data before restoring."
        );
        let old_generation = self.generation();
        ensure!(request.generation == old_generation.id, "stale_generation");
        let _transition = transaction::transition(&self.control)?;
        self.lease.exclusive(|| {
            let old_app = self.app();
            self.check_idle(&old_app)?;
            let mut slot = self.preview.lock().expect("preview lock poisoned");
            let preview = slot.as_ref().context("preview_expired")?;
            ensure!(preview.id == request.id && preview.generation == old_generation.id && preview.expires > Instant::now(), "preview_expired");
            let stage = self.control.join(format!("stage-{}", preview.id));
            backup_archive::validate(&stage)?;
            let safety = self.make_backup(&old_app.paths.root)?;
            transaction::preserve_local(&old_app.paths.root, &stage)?;
            let id = preview.id.clone();
            slot.take();
            drop(slot);
            let previous = self.control.join(format!("previous-{id}"));
            let mut journal = Journal { id, old_generation, new_generation: Generation::restored(), committed: false };
            let journal_path = self.control.join("transaction.json");
            store::write_json(&journal_path, &journal)?;
            let replacement = (|| -> Result<(Shared, Router)> {
                #[cfg(test)] self.fail("before_rename")?;
                fs::rename(&self.config.data_dir, &previous).context("keeping the previous practice data")?;
                #[cfg(test)] self.fail("after_previous")?;
                #[cfg(test)] self.fail("rollback")?;
                fs::rename(&stage, &self.config.data_dir).context("installing the restored practice data")?;
                #[cfg(test)] self.fail("before_open")?;
                let app = App::open_with_activity(self.config.clone(), self.activity.clone(), Some(self.lease.clone()))?;
                crate::analysis::reconcile(&app)?;
                crate::recordings::reconcile_interrupted(&app)?;
                let router = crate::build_router(app.clone(), &self.config);
                #[cfg(test)] self.fail("after_open")?;
                store::write_json(&self.control.join("generation.json"), &journal.new_generation)?;
                journal.committed = true;
                store::write_json(&journal_path, &journal)?;
                Ok((app, router))
            })();
            let (app, router) = match replacement {
                Ok(replacement) => replacement,
                Err(error) => {
                    if let Err(recovery) = self.recover_failed() {
                        old_app.retired.store(true, Ordering::Release);
                        return Err(recovery.context("Restore failed and rollback needs attention; restart Lilt only after checking the saved previous data"));
                    }
                    return Err(error.context("Your previous practice data was put back; restore did not complete"));
                }
            };
            old_app.retired.store(true, Ordering::Release);
            old_app.job_notify.notify_waiters();
            let generation = journal.new_generation.id.clone();
            *self.live.lock().expect("live app lock poisoned") = Live { app: app.clone(), router, generation: journal.new_generation };
            // A committed journal is safe to finish on startup if cleanup is interrupted.
            if let Err(error) = transaction::recover(&self.config.data_dir, &self.control) {
                tracing::warn!("restored data is active; old restore files need cleanup: {error:#}");
            }
            Ok((json!({"restored":true,"generation":generation,"safety_backup":safety}), app))
        })
    }
}

#[derive(Deserialize)]
struct Restore {
    id: String,
    generation: String,
    confirm: bool,
}

fn refused(status: StatusCode, code: &str, message: impl ToString) -> Response {
    (
        status,
        Json(json!({"error":message.to_string(),"code":code})),
    )
        .into_response()
}
fn busy(error: impl ToString) -> Response {
    refused(StatusCode::CONFLICT, "busy", error)
}

async fn dispatch(State(controller): State<Arc<Controller>>, req: Request) -> Response {
    let is_backup =
        req.uri().path() == "/api/backups" || req.uri().path().starts_with("/api/backups/");
    let is_control = is_backup || req.uri().path() == "/api/storage";
    let permit = if is_control {
        None
    } else {
        match controller.app().enter() {
            Ok(permit) => Some(permit),
            Err(error) => return with_generation(busy(error), &controller.generation().id),
        }
    };
    let generation = controller.generation();
    let mutation = req.uri().path().starts_with("/api/")
        && !matches!(
            *req.method(),
            axum::http::Method::GET | axum::http::Method::HEAD | axum::http::Method::OPTIONS
        );
    let native = req.uri().path().starts_with("/api/desktop/update/");
    let mcp = req.uri().path() == "/mcp" || req.uri().path().starts_with("/mcp/");
    let supplied = req
        .headers()
        .get(GENERATION_HEADER)
        .and_then(|v| v.to_str().ok());
    if mutation
        && !native
        && !mcp
        && (supplied.is_some_and(|v| v != generation.id)
            || (generation.required && supplied.is_none()))
    {
        return with_generation(
            refused(
                StatusCode::CONFLICT,
                "stale_generation",
                "Your practice data has changed. Reload Lilt before making changes.",
            ),
            &generation.id,
        );
    }
    let result = if is_control {
        let app = controller.app();
        Router::new()
            .fallback(control_request)
            .with_state(controller.clone())
            .layer(middleware::from_fn(crate::http::same_origin_only))
            .layer(middleware::from_fn_with_state(app, crate::ai::oauth::gate))
            .oneshot(req)
            .await
            .expect("router is infallible")
    } else {
        let router = controller
            .live
            .lock()
            .expect("live app lock poisoned")
            .router
            .clone();
        match tokio::spawn(async move {
            let response = router.oneshot(req).await.expect("router is infallible");
            hold_body(
                response,
                permit.expect("regular requests have an admission permit"),
            )
        })
        .await
        {
            Ok(response) => response,
            Err(error) => refused(StatusCode::INTERNAL_SERVER_ERROR, "request_failed", error),
        }
    };
    with_generation(result, &controller.generation().id)
}

fn with_generation(mut response: Response, generation: &str) -> Response {
    response.headers_mut().insert(
        GENERATION_HEADER,
        generation.parse().expect("UUID is a valid header"),
    );
    response
}

fn hold_body(response: Response, permit: admission::Permit) -> Response {
    let (parts, body) = response.into_parts();
    let stream = futures::stream::unfold(
        (body.into_data_stream(), permit),
        |(mut stream, permit)| async move { stream.next().await.map(|item| (item, (stream, permit))) },
    );
    Response::from_parts(parts, Body::from_stream(stream))
}

async fn control_request(State(controller): State<Arc<Controller>>, req: Request) -> Response {
    let path = req.uri().path();
    if path == "/api/storage" {
        if req.method() != axum::http::Method::GET {
            return StatusCode::METHOD_NOT_ALLOWED.into_response();
        }
        let app = controller.app();
        let permit = match app.enter() {
            Ok(permit) => permit,
            Err(error) => return busy(error),
        };
        // The blocking task owns both App and admission even if the HTTP caller disconnects.
        return match tokio::task::spawn_blocking(move || {
            let _permit = permit;
            crate::storage::scan(&app.paths.root, &controller.control)
        })
        .await
        {
            Ok(overview) => Json(overview).into_response(),
            Err(error) => refused(StatusCode::INTERNAL_SERVER_ERROR, "storage_failed", error),
        };
    }
    if req.method() == axum::http::Method::GET {
        if path == "/api/backups" {
            let last: Option<Backup> =
                match store::read_json_opt(&controller.control.join("last-backup.json")) {
                    Ok(last) => last,
                    Err(error) => {
                        return refused(StatusCode::INTERNAL_SERVER_ERROR, "backup_state", error);
                    }
                };
            return Json(json!({"generation":controller.generation().id,"last_backup":last,"max_upload_bytes":backup_archive::MAX_ARCHIVE_BYTES})).into_response();
        }
        if let Some(id) = path
            .strip_prefix("/api/backups/")
            .and_then(|s| s.strip_suffix("/download"))
        {
            let permit = match controller.activity.enter() {
                Ok(p) => p,
                Err(e) => return busy(e),
            };
            let path = match controller.archive_path(id) {
                Ok(p) => p,
                Err(_) => {
                    return refused(
                        StatusCode::NOT_FOUND,
                        "unknown_backup",
                        "This backup is no longer available.",
                    );
                }
            };
            let file = match tokio::fs::File::open(path).await {
                Ok(f) => f,
                Err(e) => return refused(StatusCode::NOT_FOUND, "unknown_backup", e),
            };
            let response = Response::builder()
                .header(header::CONTENT_TYPE, "application/zip")
                .header(
                    header::CONTENT_DISPOSITION,
                    format!("attachment; filename=\"lilt-backup-{id}.zip\""),
                )
                .body(Body::from_stream(tokio_util::io::ReaderStream::new(file)))
                .expect("valid response");
            return hold_body(response, permit);
        }
        return StatusCode::NOT_FOUND.into_response();
    }
    if req.method() != axum::http::Method::POST {
        return StatusCode::METHOD_NOT_ALLOWED.into_response();
    }
    if controller.app().retired.load(Ordering::Acquire) {
        return refused(
            StatusCode::SERVICE_UNAVAILABLE,
            "recovery_required",
            "Lilt could not finish recovering your previous data. Restart Lilt to retry recovery before making changes.",
        );
    }
    let operation = match controller.operation.clone().try_lock_owned() {
        Ok(p) => p,
        Err(_) => return busy("A backup or restore is already in progress."),
    };
    if controller.app().retired.load(Ordering::Acquire) {
        return refused(
            StatusCode::SERVICE_UNAVAILABLE,
            "recovery_required",
            "Lilt could not finish recovering your previous data. Restart Lilt to retry recovery before making changes.",
        );
    }
    let generation = controller.generation();
    let supplied = req
        .headers()
        .get(GENERATION_HEADER)
        .and_then(|v| v.to_str().ok());
    if supplied.is_some_and(|v| v != generation.id) || (generation.required && supplied.is_none()) {
        return refused(
            StatusCode::CONFLICT,
            "stale_generation",
            "Your practice data has changed. Reload Lilt before making changes.",
        );
    }
    if path == "/api/backups/restore-preview" {
        return match tokio::spawn(preview(controller, req, operation)).await {
            Ok(response) => response,
            Err(error) => refused(StatusCode::INTERNAL_SERVER_ERROR, "upload_failed", error),
        };
    }
    let restore = path == "/api/backups/restore";
    if !restore && path != "/api/backups" {
        return StatusCode::NOT_FOUND.into_response();
    }
    let bytes = match axum::body::to_bytes(req.into_body(), 4096).await {
        Ok(bytes) => bytes,
        Err(_) => {
            return refused(
                StatusCode::BAD_REQUEST,
                "invalid_request",
                "The request is too large.",
            );
        }
    };
    let restore_request = if restore {
        match serde_json::from_slice::<Restore>(&bytes) {
            Ok(request) => Some(request),
            Err(_) => {
                return refused(
                    StatusCode::BAD_REQUEST,
                    "invalid_request",
                    "Choose a backup and confirm replacement first.",
                );
            }
        }
    } else {
        None
    };
    let permit = match controller.activity.exclusive() {
        Ok(p) => p,
        Err(e) => return busy(e),
    };
    // The detached task owns every permit: disconnecting the caller cannot release maintenance.
    let handle = tokio::runtime::Handle::current();
    let failure_controller = controller.clone();
    match tokio::task::spawn_blocking(move || {
        let _operation = operation;
        let _permit = permit;
        if let Some(request) = restore_request {
            controller.restore(request).map(|(value, app)| {
                handle.spawn(crate::analysis::worker(app));
                value
            })
        } else {
            controller.create_backup().map(|backup| json!(backup))
        }
    })
    .await
    {
        Ok(Ok(value)) => Json(value).into_response(),
        Ok(Err(error)) => {
            let message = format!("{error:#}");
            if message.contains("stale_generation") {
                refused(
                    StatusCode::CONFLICT,
                    "stale_generation",
                    "Reload Lilt before restoring this backup.",
                )
            } else if message.contains("preview_expired") {
                refused(
                    StatusCode::CONFLICT,
                    "preview_expired",
                    "Choose the backup again before restoring it.",
                )
            } else {
                busy(message)
            }
        }
        Err(error) => {
            if failure_controller.control.join("transaction.json").exists() {
                failure_controller
                    .app()
                    .retired
                    .store(true, Ordering::Release);
            }
            refused(StatusCode::INTERNAL_SERVER_ERROR, "backup_failed", error)
        }
    }
}

struct Upload(PathBuf);
impl Drop for Upload {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.0);
    }
}

async fn preview(
    controller: Arc<Controller>,
    req: Request,
    operation: tokio::sync::OwnedMutexGuard<()>,
) -> Response {
    let permit = match controller.activity.enter() {
        Ok(p) => p,
        Err(e) => return busy(e),
    };
    if req
        .headers()
        .get(header::CONTENT_LENGTH)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.parse::<u64>().ok())
        .is_some_and(|bytes| bytes > backup_archive::MAX_ARCHIVE_BYTES)
    {
        return refused(
            StatusCode::PAYLOAD_TOO_LARGE,
            "backup_too_large",
            "Choose a backup smaller than 2 GiB.",
        );
    }
    let id = Uuid::new_v4().to_string();
    let upload = Upload(controller.control.join(format!("upload-{id}.zip")));
    let mut file = match tokio::fs::File::create(&upload.0).await {
        Ok(file) => file,
        Err(e) => return refused(StatusCode::INTERNAL_SERVER_ERROR, "upload_failed", e),
    };
    let mut stream = req.into_body().into_data_stream();
    let mut bytes = 0u64;
    while let Some(chunk) = stream.next().await {
        let chunk = match chunk {
            Ok(chunk) => chunk,
            Err(e) => return refused(StatusCode::BAD_REQUEST, "upload_failed", e),
        };
        bytes = bytes.saturating_add(chunk.len() as u64);
        if bytes > backup_archive::MAX_ARCHIVE_BYTES {
            return refused(
                StatusCode::PAYLOAD_TOO_LARGE,
                "backup_too_large",
                "Choose a backup smaller than 2 GiB.",
            );
        }
        if let Err(e) = file.write_all(&chunk).await {
            return refused(StatusCode::INTERNAL_SERVER_ERROR, "upload_failed", e);
        }
    }
    if let Err(e) = file.sync_all().await {
        return refused(StatusCode::INTERNAL_SERVER_ERROR, "upload_failed", e);
    }
    drop(file);
    match tokio::task::spawn_blocking(move || -> Result<Value> {
        let _operation = operation;
        let _permit = permit;
        let stage = controller.control.join(format!("stage-{id}"));
        let summary = match backup_archive::unpack(&upload.0, &stage) {
            Ok(summary) => summary,
            Err(error) => { let _ = fs::remove_dir_all(&stage); return Err(error); }
        };
        let summary = Backup::new(id.clone(), summary);
        let value = json!({"id":id,"created_utc":summary.created_utc,"files":summary.files,"bytes":summary.bytes,"recordings":summary.recordings});
        let preview = Preview { id, generation: controller.generation().id, expires: Instant::now() + PREVIEW_LIFETIME };
        let previous = controller.preview.lock().expect("preview lock poisoned").replace(preview);
        if let Some(previous) = previous { let _ = fs::remove_dir_all(controller.control.join(format!("stage-{}", previous.id))); }
        Ok(value)
    }).await {
        Ok(Ok(value)) => Json(value).into_response(),
        Ok(Err(error)) => refused(StatusCode::UNPROCESSABLE_ENTITY, "invalid_backup", format!("This backup could not be validated: {error:#}")),
        Err(error) => refused(StatusCode::INTERNAL_SERVER_ERROR, "upload_failed", error),
    }
}

#[cfg(test)]
mod storage_tests {
    use super::*;
    use axum::body::to_bytes;
    use axum::http::Request;

    #[tokio::test]
    async fn storage_preserves_local_origin_remote_and_maintenance_guards() {
        let dir = tempfile::tempdir().unwrap();
        let controller =
            Controller::open(crate::test_support::config(&dir.path().join("data"))).unwrap();
        crate::ai::oauth::set_public_url(&controller.app(), "https://lilt.example.com").unwrap();
        for (host, extra, expected) in [
            ("untrusted.example:7979", None, StatusCode::FORBIDDEN),
            (
                "localhost:7979",
                Some(("origin", "https://untrusted.example")),
                StatusCode::FORBIDDEN,
            ),
            ("lilt.example.com", None, StatusCode::NOT_FOUND),
            (
                "localhost:7979",
                Some(("cf-connecting-ip", "1.2.3.4")),
                StatusCode::NOT_FOUND,
            ),
        ] {
            let mut request = Request::builder().uri("/api/storage").header("host", host);
            if let Some((key, value)) = extra {
                request = request.header(key, value);
            }
            assert_eq!(
                controller
                    .router()
                    .oneshot(request.body(Body::empty()).unwrap())
                    .await
                    .unwrap()
                    .status(),
                expected
            );
        }
        let _exclusive = controller.activity.exclusive().unwrap();
        let response = controller
            .router()
            .oneshot(
                Request::builder()
                    .uri("/api/storage")
                    .header("host", "localhost:7979")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::CONFLICT);
    }

    #[test]
    fn cancelled_storage_request_keeps_admission_until_blocking_scan_finishes() {
        let runtime = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .max_blocking_threads(1)
            .build()
            .unwrap();
        runtime.block_on(async {
            let dir = tempfile::tempdir().unwrap();
            let controller =
                Controller::open(crate::test_support::config(&dir.path().join("data"))).unwrap();
            let (release, wait) = std::sync::mpsc::channel();
            let (started, ready) = tokio::sync::oneshot::channel();
            let blocker = tokio::task::spawn_blocking(move || {
                started.send(()).unwrap();
                wait.recv().unwrap();
            });
            ready.await.unwrap();
            let router = controller.router();
            let task = tokio::spawn(async move {
                router
                    .oneshot(
                        Request::builder()
                            .uri("/api/storage")
                            .header("host", "localhost:7979")
                            .body(Body::empty())
                            .unwrap(),
                    )
                    .await
                    .unwrap()
            });
            tokio::time::timeout(Duration::from_secs(2), async {
                while controller.activity.exclusive().is_ok() {
                    tokio::task::yield_now().await;
                }
            })
            .await
            .unwrap();
            task.abort();
            assert!(task.await.unwrap_err().is_cancelled());
            assert!(
                controller.activity.exclusive().is_err(),
                "queued scan retains admission after its caller disconnects"
            );
            release.send(()).unwrap();
            blocker.await.unwrap();
            tokio::time::timeout(Duration::from_secs(2), async {
                while controller.activity.exclusive().is_err() {
                    tokio::task::yield_now().await;
                }
            })
            .await
            .unwrap();
        });
    }

    #[tokio::test]
    async fn storage_reports_the_controllers_actual_roots_and_all_control_files() {
        let dir = tempfile::tempdir().unwrap();
        let controller =
            Controller::open(crate::test_support::config(&dir.path().join("practice"))).unwrap();
        fs::create_dir_all(controller.control.join("previous-recovery/private")).unwrap();
        fs::write(
            controller.control.join("previous-recovery/private/unknown"),
            b"12345",
        )
        .unwrap();
        let response = controller
            .router()
            .oneshot(
                Request::builder()
                    .uri("/api/storage")
                    .header("host", "localhost:7979")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let bytes = to_bytes(response.into_body(), 16384).await.unwrap();
        let value: Value = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(value["complete"], true);
        assert_eq!(
            value["data_path"],
            controller.app().paths.root.to_string_lossy().as_ref()
        );
        assert_eq!(
            value["backup_path"],
            controller.control.to_string_lossy().as_ref()
        );
        assert!(value["categories"][2]["bytes"].as_u64().unwrap() >= 5);
        assert_eq!(
            value["total_bytes"].as_u64().unwrap(),
            value["categories"]
                .as_array()
                .unwrap()
                .iter()
                .map(|c| c["bytes"].as_u64().unwrap())
                .sum::<u64>()
        );
        assert!(
            !String::from_utf8(bytes.to_vec())
                .unwrap()
                .contains("unknown")
        );
    }
}
