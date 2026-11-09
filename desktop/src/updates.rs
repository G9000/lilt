//! Signed whole-app updates. Lilt's own practice window asks for each step (check, download,
//! install) through `lilt://update/…` links and shows the status the app publishes to it.

use crate::update_lifecycle::{self, Lifecycle};
use crate::update_notice::{self, Notice};
use crate::update_policy;
use crate::update_state::{Action, Phase, Snapshot};
use std::sync::{Mutex, OnceLock};
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tauri_plugin_updater::{Update, UpdaterExt};

const ENDPOINT: &str = "https://github.com/G9000/lilt/releases/latest/download/latest.json";
// The Mac and Windows release feeds publish signed whole-app updates. A build without the key
// (any local build) has no updater and says so.
pub const PUBLIC_KEY: Option<&str> = if cfg!(any(target_os = "macos", windows)) {
    option_env!("LILT_UPDATER_PUBLIC_KEY")
} else {
    None
};

struct Pending {
    update: Update,
    bytes: Option<Vec<u8>>,
}

pub struct Updates {
    operation: tokio::sync::Mutex<()>,
    snapshot: Mutex<Snapshot>,
    pending: Mutex<Option<Pending>>,
    publisher: OnceLock<AppHandle>,
}

impl Updates {
    pub fn new(version: &str) -> Self {
        Self {
            operation: tokio::sync::Mutex::new(()),
            snapshot: Mutex::new(Snapshot::new(version, PUBLIC_KEY)),
            pending: Mutex::new(None),
            publisher: OnceLock::new(),
        }
    }

    fn snapshot(&self) -> Snapshot {
        self.snapshot
            .lock()
            .expect("update snapshot lock poisoned")
            .clone()
    }

    pub fn set_publisher(&self, app: AppHandle) {
        let _ = self.publisher.set(app);
    }

    pub fn publish(&self) {
        if let Some(app) = self.publisher.get() {
            let handle = app.clone();
            let _ = app.run_on_main_thread(move || {
                // Read the latest state on delivery, so queued changes cannot replay stale status.
                let notice = Notice::from(&handle.state::<Updates>().snapshot());
                update_notice::publish(&handle, &notice);
            });
        }
    }

    fn change<T>(&self, change: impl FnOnce(&mut Snapshot) -> T) -> T {
        let (result, changed) = {
            let mut snapshot = self.snapshot.lock().expect("update snapshot lock poisoned");
            let before = Notice::from(&*snapshot);
            let result = change(&mut snapshot);
            (result, Notice::from(&*snapshot) != before)
        };
        if changed {
            self.publish();
        }
        result
    }

    fn begin(&self, action: Action) -> Result<tokio::sync::MutexGuard<'_, ()>, String> {
        let operation = self
            .operation
            .try_lock()
            .map_err(|_| "An update step is already in progress.")?;
        self.change(|snapshot| snapshot.begin(action))?;
        Ok(operation)
    }

    fn fail(&self, phase: Phase, message: String) -> Snapshot {
        self.change(|state| {
            state.phase = phase;
            state.error = Some(message);
        });
        self.snapshot()
    }

    pub fn installing(&self) -> bool {
        self.snapshot().phase == Phase::Installing
    }

    /// Say why a step couldn't start, keeping where things stand.
    fn note(&self, message: String) {
        self.change(|state| state.error = Some(message));
    }
}

/// A step Lilt's practice window asked for (`lilt://update/check`, `download` or `install`), run in
/// the background. A step that can't run says why in the status the window shows.
pub fn request(app: &AppHandle, action: &str) {
    let handle = app.clone();
    let action = action.to_string();
    tauri::async_runtime::spawn(async move {
        let result = match action.as_str() {
            "check" => check(&handle).await,
            "download" => download(&handle).await,
            "install" => install(&handle).await,
            _ => return,
        };
        if let Err(message) = result {
            handle.state::<Updates>().note(message);
        }
    });
}

pub async fn check(app: &AppHandle) -> Result<Snapshot, String> {
    let state = app.state::<Updates>();
    let _operation = state.begin(Action::Check)?;
    let result = async {
        let endpoint = ENDPOINT
            .parse()
            .map_err(|e| format!("Invalid update address: {e}"))?;
        let updater = app
            .updater_builder()
            .endpoints(vec![endpoint])
            .map_err(|e| e.to_string())?
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(|e| e.to_string())?;
        updater.check().await.map_err(|e| e.to_string())
    }
    .await;
    match result {
        Ok(Some(mut update)) => {
            if !update_policy::trusted_download(&update.download_url, &update.version) {
                return Ok(state.fail(Phase::Idle, "The update download address isn't a Lilt release. Try checking again later.".into()));
            }
            update.timeout = Some(Duration::from_secs(600));
            state.change(|s| {
                s.phase = Phase::Available;
                s.version = Some(update.version.clone());
                s.notes = update.body.clone().unwrap_or_default();
                s.downloaded = 0;
                s.total = None;
            });
            *state.pending.lock().expect("pending update lock poisoned") = Some(Pending { update, bytes: None });
        }
        Ok(None) => {
            *state.pending.lock().expect("pending update lock poisoned") = None;
            state.change(|s| { s.phase = Phase::UpToDate; s.version = None; s.notes.clear(); });
        }
        Err(error) => return Ok(state.fail(Phase::Idle, format!("Couldn't check for updates. Your app still works. Try again when you're online. ({error})"))),
    }
    Ok(state.snapshot())
}

pub async fn download(app: &AppHandle) -> Result<Snapshot, String> {
    let state = app.state::<Updates>();
    let _operation = state.begin(Action::Download)?;
    let pending = state
        .pending
        .lock()
        .expect("pending update lock poisoned")
        .take();
    let Some(mut pending) = pending else {
        return Ok(state.fail(
            Phase::Idle,
            "Check for updates again before downloading.".into(),
        ));
    };
    state.change(|s| {
        s.downloaded = 0;
        s.total = None;
    });
    // The plugin verifies the signature and its signed version before returning these bytes.
    let result = pending
        .update
        .download(
            |length, total| {
                state.change(|s| {
                    s.downloaded = s.downloaded.saturating_add(length as u64);
                    s.total = total;
                });
            },
            || {},
        )
        .await;
    match result {
        Ok(bytes) => {
            pending.bytes = Some(bytes);
            state.change(|s| s.phase = Phase::Ready);
        }
        Err(error) => {
            state.fail(Phase::Available, format!("Couldn't download and verify the update. Nothing was installed. Try again. ({error})"));
        }
    }
    *state.pending.lock().expect("pending update lock poisoned") = Some(pending);
    Ok(state.snapshot())
}

async fn control(port: u16, token: &str, action: &str) -> Result<(), String> {
    let client = reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;
    let response = client
        .post(format!(
            "http://127.0.0.1:{port}/api/desktop/update/{action}"
        ))
        .bearer_auth(token)
        .send()
        .await
        .map_err(|_| {
            "Couldn't reach Lilt to check that your takes are saved. Try again.".to_string()
        })?;
    if response.status() == reqwest::StatusCode::NO_CONTENT {
        return Ok(());
    }
    let body: serde_json::Value = response.json().await.unwrap_or_default();
    Err(body["error"]
        .as_str()
        .unwrap_or("Lilt couldn't prepare for the update. Try again after your take is saved.")
        .to_string())
}

struct NativeLifecycle<'a> {
    app: &'a AppHandle,
    port: u16,
    token: String,
    pending: Option<Pending>,
}

impl Lifecycle for NativeLifecycle<'_> {
    async fn prepare(&mut self) -> Result<(), String> {
        control(self.port, &self.token, "prepare").await
    }

    async fn cancel(&mut self) -> Result<(), String> {
        control(self.port, &self.token, "cancel").await
    }

    async fn stop(&mut self) -> Result<(), String> {
        let handle = self.app.clone();
        tauri::async_runtime::spawn_blocking(move || crate::stop_owned_server(&handle))
            .await
            .map_err(|e| e.to_string())?
    }

    async fn install(&mut self) -> Result<(), String> {
        let pending = self.pending.take().expect("verified download present");
        let (pending, result) = tauri::async_runtime::spawn_blocking(move || {
            let result = pending
                .update
                .install(pending.bytes.as_deref().expect("verified download present"));
            (pending, result)
        })
        .await
        .map_err(|e| e.to_string())?;
        if result.is_err() {
            self.pending = Some(pending);
        }
        result.map_err(|e| e.to_string())
    }

    async fn recover(&mut self) -> Result<(), String> {
        let handle = self.app.clone();
        tauri::async_runtime::spawn_blocking(move || crate::recover_server(&handle))
            .await
            .map_err(|e| e.to_string())?
    }
}

pub async fn install(app: &AppHandle) -> Result<Snapshot, String> {
    let state = app.state::<Updates>();
    if !cfg!(any(target_os = "macos", windows)) {
        return Err("App installation is available in the packaged Mac and Windows apps.".into());
    }
    // An app attached to a separately started server must never stop that server.
    let (port, token) = crate::owned_server(app)?;
    let _operation = state.begin(Action::Install)?;
    let pending = state
        .pending
        .lock()
        .expect("pending update lock poisoned")
        .take();
    let Some(pending) = pending.filter(|p| p.bytes.is_some()) else {
        return Ok(state.fail(
            Phase::Idle,
            "Download the update again before installing.".into(),
        ));
    };
    let mut lifecycle = NativeLifecycle {
        app,
        port,
        token,
        pending: Some(pending),
    };
    match update_lifecycle::run(&mut lifecycle).await {
        Ok(()) => {
            app.request_restart();
            Ok(state.snapshot())
        }
        Err(message) => {
            let phase = if lifecycle.pending.is_some() {
                Phase::Ready
            } else {
                Phase::Idle
            };
            *state.pending.lock().expect("pending update lock poisoned") = lifecycle.pending;
            Ok(state.fail(phase, message))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_build_without_the_updater_key_stays_unconfigured() {
        // Local and test builds never carry the release key, so they can't check or install.
        if PUBLIC_KEY.is_some_and(|key| !key.trim().is_empty()) {
            return;
        }
        let updates = Updates::new("0.2.1");
        assert_eq!(updates.snapshot().phase, Phase::Unconfigured);
        assert!(updates.begin(Action::Check).is_err());
    }

    #[test]
    fn operation_guard_blocks_all_actions_even_after_the_phase_becomes_ready() {
        let updates = Updates::new("0.2.1");
        updates.change(|s| s.phase = Phase::Idle);
        let operation = updates.begin(Action::Check).unwrap();
        for (phase, action) in [
            (Phase::Idle, Action::Check),
            (Phase::Available, Action::Download),
            (Phase::Ready, Action::Install),
        ] {
            updates.change(|s| s.phase = phase);
            let error = updates.begin(action).unwrap_err();
            assert!(error.contains("already in progress"));
            assert_eq!(updates.snapshot().phase, phase);
        }
        drop(operation);
        let _next = updates.begin(Action::Install).unwrap();
        assert!(updates.installing());
    }

    #[test]
    fn rejected_action_releases_operation_guard_for_the_valid_next_action() {
        let updates = Updates::new("0.2.1");
        updates.change(|s| s.phase = Phase::Available);
        assert!(updates.begin(Action::Install).is_err());
        let _next = updates.begin(Action::Download).unwrap();
        assert_eq!(updates.snapshot().phase, Phase::Downloading);
    }
}
