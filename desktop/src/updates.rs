//! Signed whole-app updates, controlled only by the bundled update window.

use crate::update_lifecycle::{self, Lifecycle};
use crate::update_policy;
use crate::update_state::{Action, Phase, Snapshot};
use std::sync::Mutex;
use std::time::Duration;
use tauri::webview::NewWindowResponse;
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_updater::{Update, UpdaterExt};

const ENDPOINT: &str = "https://github.com/G9000/lilt/releases/latest/download/latest.json";
pub const PUBLIC_KEY: Option<&str> = option_env!("LILT_UPDATER_PUBLIC_KEY");

struct Pending {
    update: Update,
    bytes: Option<Vec<u8>>,
}

pub struct Updates {
    operation: tokio::sync::Mutex<()>,
    snapshot: Mutex<Snapshot>,
    pending: Mutex<Option<Pending>>,
}

impl Updates {
    pub fn new(version: &str) -> Self {
        Self {
            operation: tokio::sync::Mutex::new(()),
            snapshot: Mutex::new(Snapshot::new(version, PUBLIC_KEY)),
            pending: Mutex::new(None),
        }
    }

    fn snapshot(&self) -> Snapshot {
        self.snapshot
            .lock()
            .expect("update snapshot lock poisoned")
            .clone()
    }

    fn change(&self, change: impl FnOnce(&mut Snapshot)) {
        change(&mut self.snapshot.lock().expect("update snapshot lock poisoned"));
    }

    fn begin(&self, action: Action) -> Result<tokio::sync::MutexGuard<'_, ()>, String> {
        let operation = self
            .operation
            .try_lock()
            .map_err(|_| "An update step is already in progress.")?;
        self.snapshot
            .lock()
            .expect("update snapshot lock poisoned")
            .begin(action)?;
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
}

fn trusted(window: &WebviewWindow) -> Result<(), String> {
    if window
        .url()
        .is_ok_and(|url| update_policy::trusted_page(window.label(), &url))
    {
        Ok(())
    } else {
        Err("Open Updates from Lilt's menu.".into())
    }
}

pub fn open(app: &AppHandle) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window("updates") {
        window.show()?;
        return window.set_focus();
    }
    let window = WebviewWindowBuilder::new(app, "updates", WebviewUrl::App("updates.html".into()))
        .title("Lilt updates")
        .inner_size(500.0, 550.0)
        .min_inner_size(360.0, 400.0)
        .center()
        .on_navigation(|url| update_policy::trusted_page("updates", url))
        .on_new_window(|_, _| NewWindowResponse::Deny)
        .build()?;
    let handle = app.clone();
    window.on_window_event(move |event| {
        if let tauri::WindowEvent::CloseRequested { api, .. } = event {
            // Keep native work alive even when this is the last visible window.
            api.prevent_close();
            if let Some(window) = handle.get_webview_window("updates") {
                let _ = window.hide();
            }
        }
    });
    Ok(())
}

#[tauri::command]
pub fn update_status(window: WebviewWindow, app: AppHandle) -> Result<Snapshot, String> {
    trusted(&window)?;
    Ok(app.state::<Updates>().snapshot())
}

#[tauri::command]
pub async fn update_check(window: WebviewWindow, app: AppHandle) -> Result<Snapshot, String> {
    trusted(&window)?;
    check(&app).await
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

#[tauri::command]
pub async fn update_download(window: WebviewWindow, app: AppHandle) -> Result<Snapshot, String> {
    trusted(&window)?;
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

#[tauri::command]
pub async fn update_install(window: WebviewWindow, app: AppHandle) -> Result<Snapshot, String> {
    trusted(&window)?;
    let state = app.state::<Updates>();
    if !cfg!(target_os = "macos") {
        return Err("App installation is available in the packaged Mac app.".into());
    }
    // An app attached to a separately started server must never stop that server.
    let (port, token) = crate::owned_server(&app)?;
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
        app: &app,
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
