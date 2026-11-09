//! Lilt as a desktop app: a window around the Lilt server. On launch it starts the bundled server
//! (with its own Python for measuring takes) on this computer, shows "Opening Lilt…" until it
//! answers, then loads it. Quitting stops the server. Your data lives where `./lilt.sh` keeps it,
//! `~/Lilt/data` (or `LILT_DATA_DIR`), so the app and a Lilt started from the repo share one desk;
//! if a Lilt is already running on port 7878, the window simply opens that one.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::{Read, Write};
use std::net::TcpStream;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::webview::{
    DownloadEvent, NewWindowResponse, PageLoadEvent, PermissionKind, PermissionResponse,
};
use tauri::{Manager, RunEvent, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

mod platform;
mod storage;
mod update_lifecycle;
mod update_notice;
mod update_policy;
mod update_state;
mod updates;
#[cfg(windows)]
mod windows_process;

use platform::PORT;

/// The server this app started (none when it opened one that was already running).
struct Server {
    connection: Mutex<Connection>,
    token: String,
}

#[derive(Default)]
struct Connection {
    child: Option<Child>,
    #[cfg(windows)]
    job: Option<windows_process::Job>,
    port: Option<u16>,
    stopping: bool,
}

#[derive(Debug, PartialEq)]
enum StopOutcome {
    Stopped,
    AlreadyExited,
}

impl Connection {
    fn launch(&mut self, command: &mut Command) -> Result<(), String> {
        if self.stopping {
            return Err("Lilt is closing.".into());
        }
        if self.child.is_some() {
            return Err("Lilt's background work is already running.".into());
        }
        #[cfg(windows)]
        {
            let (child, job) = windows_process::Job::spawn(command)
                .map_err(|e| format!("The Lilt server wouldn't start ({e})."))?;
            self.child = Some(child);
            self.job = Some(job);
        }
        #[cfg(not(windows))]
        {
            self.child = Some(
                command
                    .spawn()
                    .map_err(|e| format!("The Lilt server wouldn't start ({e})."))?,
            );
        }
        self.port = None;
        Ok(())
    }

    fn check_running(&mut self) -> Result<(), String> {
        let child = self
            .child
            .as_mut()
            .ok_or("Lilt's background work is not running.")?;
        if let Some(status) = child.try_wait().map_err(|e| e.to_string())? {
            // Closing the job also cleans up Python when its parent has already exited.
            #[cfg(windows)]
            self.job.take();
            self.child = None;
            self.port = None;
            return Err(format!(
                "Lilt's background work stopped ({status}). Quit and reopen Lilt."
            ));
        }
        Ok(())
    }

    fn stop(&mut self) -> Result<StopOutcome, String> {
        #[cfg(windows)]
        if let Some(job) = &self.job {
            job.terminate().map_err(|e| e.to_string())?;
        }
        let outcome = match self.child.as_mut() {
            Some(child) => stop_child(child)?,
            None => StopOutcome::AlreadyExited,
        };
        self.child = None;
        #[cfg(windows)]
        self.job.take();
        self.port = None;
        Ok(outcome)
    }

    fn stop_for_update(&mut self) -> Result<(), String> {
        match self.stop()? {
            StopOutcome::Stopped => Ok(()),
            // A crashed server may have left Python running. Its reaped id is unsafe to signal.
            StopOutcome::AlreadyExited => Err("The background server stopped before Lilt could close its analysis work. Quit and reopen Lilt before updating.".into()),
        }
    }
}

enum StartMode {
    ReuseIfRunning,
    OwnedOnly,
}

fn home() -> PathBuf {
    platform::home_from(std::env::var_os("HOME"), std::env::var_os("USERPROFILE"))
}

fn isolated_data() -> Option<PathBuf> {
    std::env::var_os("LILT_DATA_DIR").map(PathBuf::from)
}

fn log_path() -> PathBuf {
    isolated_data()
        .map(|data| data.join("logs"))
        .unwrap_or_else(|| home().join("Lilt/logs"))
        .join("lilt-app.log")
}

fn webview_data() -> Option<PathBuf> {
    isolated_data().map(|data| data.join("desktop-webview"))
}

/// Whether a Lilt answers on this port.
fn lilt_at(port: u16) -> bool {
    let Ok(mut s) =
        TcpStream::connect_timeout(&([127, 0, 0, 1], port).into(), Duration::from_millis(400))
    else {
        return false;
    };
    let _ = s.set_read_timeout(Some(Duration::from_secs(2)));
    if s.write_all(b"GET /healthz HTTP/1.0\r\nHost: 127.0.0.1\r\n\r\n")
        .is_err()
    {
        return false;
    }
    let mut body = String::new();
    let _ = s.read_to_string(&mut body);
    body.starts_with("HTTP/1.")
        && body[..body.len().min(16)].contains(" 200")
        && body.contains("\"ok\":true")
        && body.contains("\"version\"")
}

/// Start the bundled server; `Ok` once it answers.
fn start(runtime: &Path, log: &Path, server: &Server, mode: StartMode) -> Result<u16, String> {
    // Another Lilt on your desk (say, ./lilt.sh): open that one rather than run two on one folder.
    // With LILT_DATA_DIR set (a different folder), always run this app's own.
    if matches!(mode, StartMode::ReuseIfRunning)
        && std::env::var_os("LILT_DATA_DIR").is_none()
        && lilt_at(PORT)
    {
        let mut connection = server
            .connection
            .lock()
            .expect("server connection lock poisoned");
        if connection.stopping {
            return Err("Lilt is closing.".into());
        }
        connection.port = Some(PORT);
        return Ok(PORT);
    }
    let port = platform::free_port(
        isolated_data().is_some(),
        std::env::var("LILT_BIND").ok().as_deref(),
    )
    .map_err(|e| format!("No free port to run on ({e})."))?;
    let _ = std::fs::create_dir_all(log.parent().unwrap());
    let out = std::fs::File::create(log).map_err(|e| format!("Couldn't write the log ({e})."))?;
    let err = out.try_clone().map_err(|e| e.to_string())?;
    let mut command = Command::new(platform::server_path(runtime));
    command
        .arg("serve")
        .current_dir(runtime)
        .env("LILT_BIND", format!("127.0.0.1:{port}"))
        .env("LILT_WEB_DIR", runtime.join("web"))
        .env("LILT_CONTENT_DIR", runtime.join("content"))
        .env("LILT_PYTHON", platform::python_path(runtime))
        .env("LILT_ANALYSIS_DIR", runtime.join("analysis"))
        .env("LILT_DESKTOP_TOKEN", &server.token)
        .env("PYTHONDONTWRITEBYTECODE", "1")
        .stdin(Stdio::null())
        .stdout(out)
        .stderr(err);
    // Python analysis inherits this group, so no old runtime survives app replacement.
    #[cfg(target_os = "macos")]
    {
        use std::os::unix::process::CommandExt;
        command.process_group(0);
    }
    // Register ownership while holding the shutdown lock, before waiting for readiness.
    server
        .connection
        .lock()
        .expect("server connection lock poisoned")
        .launch(&mut command)?;
    let began = Instant::now();
    while began.elapsed() < Duration::from_secs(60) {
        server
            .connection
            .lock()
            .expect("server connection lock poisoned")
            .check_running()?;
        if lilt_at(port) {
            let mut connection = server
                .connection
                .lock()
                .expect("server connection lock poisoned");
            connection.check_running()?;
            connection.port = Some(port);
            return Ok(port);
        }
        std::thread::sleep(Duration::from_millis(150));
    }
    server
        .connection
        .lock()
        .expect("server connection lock poisoned")
        .stop()?;
    Err("The Lilt server didn't answer within a minute.".into())
}

fn stop_child(child: &mut Child) -> Result<StopOutcome, String> {
    // Once reaped, the numeric process/group id may belong to another process.
    if child.try_wait().map_err(|e| e.to_string())?.is_some() {
        return Ok(StopOutcome::AlreadyExited);
    }
    #[cfg(target_os = "macos")]
    {
        use nix::sys::signal::{Signal, killpg};
        use nix::unistd::Pid;
        let group = i32::try_from(child.id()).map_err(|_| "Invalid server process group.")?;
        match killpg(Pid::from_raw(group), Signal::SIGKILL) {
            Ok(()) | Err(nix::errno::Errno::ESRCH) => {}
            Err(error) => return Err(error.to_string()),
        }
    }
    #[cfg(not(target_os = "macos"))]
    child.kill().map_err(|e| e.to_string())?;
    child.wait().map_err(|e| e.to_string())?;
    Ok(StopOutcome::Stopped)
}

fn owned_server(app: &tauri::AppHandle) -> Result<(u16, String), String> {
    let server = app.state::<Server>();
    let mut connection = server
        .connection
        .lock()
        .expect("server connection lock poisoned");
    if connection.child.is_none() {
        return Err("This window is using a separately started Lilt. Quit both, then open the installed app to update.".into());
    }
    connection.check_running()?;
    let port = connection
        .port
        .ok_or("Lilt is still opening. Try again in a moment.")?;
    Ok((port, server.token.clone()))
}

fn stop_owned_server(app: &tauri::AppHandle) -> Result<(), String> {
    let server = app.state::<Server>();
    let mut connection = server
        .connection
        .lock()
        .expect("server connection lock poisoned");
    connection.stop_for_update()
}

fn recover_server(app: &tauri::AppHandle) -> Result<(), String> {
    let server = app.state::<Server>();
    let runtime = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?
        .join("runtime");
    let log = log_path();
    let port = start(&runtime, &log, &server, StartMode::OwnedOnly)?;
    let win = match app.get_webview_window("main") {
        Some(win) => win,
        None => window(app).map_err(|e| e.to_string())?,
    };
    let url = format!("http://127.0.0.1:{port}/")
        .parse()
        .map_err(|e| format!("Invalid local address: {e}"))?;
    win.navigate(url).map_err(|e| e.to_string())
}

fn is_local(url: &Url) -> bool {
    matches!(url.scheme(), "tauri" | "about" | "blob" | "data")
        || matches!(
            url.host_str(),
            Some("127.0.0.1" | "localhost" | "tauri.localhost")
        )
}

/// In Lilt's page (not its embedded videos): a link to another site opens in your browser. Links
/// that already open a new tab come through `on_new_window`; this catches the plain ones, after
/// the page's own handlers have had their say. Spotify's sign-in stays in the window, because the
/// page keeps its half of that handshake.
const LINKS_OUTSIDE: &str = r#"
window.__LILT_DESKTOP__ = true;
window.addEventListener("click", (e) => {
  if (e.defaultPrevented || e.button !== 0) return;
  const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
  if (!a || a.hasAttribute("download")) return;
  const u = new URL(a.href, location.href);
  if (!/^https?:$/.test(u.protocol) || u.origin === location.origin || u.hostname === "accounts.spotify.com") return;
  e.preventDefault();
  window.open(u.href, "_blank");
});
"#;

/// The ChatGPT sign-in happens in your browser, where your password manager and Google or Apple
/// sign-in work; OpenAI sends it back to this Lilt, and the window notices when you return.
fn signs_in_outside(url: &Url) -> bool {
    url.host_str() == Some("auth.openai.com")
}

fn open_outside(url: &Url) {
    let _ = tauri_plugin_opener::open_url(url.as_str(), None::<&str>);
}

/// "Lilt export.zip", or "Lilt export 2.zip" when that's taken.
fn unused(dir: &Path, name: &str) -> PathBuf {
    let p = Path::new(name);
    let (stem, ext) = (
        p.file_stem().and_then(|s| s.to_str()).unwrap_or("download"),
        p.extension().and_then(|s| s.to_str()),
    );
    (1..)
        .map(|i| {
            let n = if i == 1 {
                stem.to_string()
            } else {
                format!("{stem} {i}")
            };
            dir.join(match ext {
                Some(e) => format!("{n}.{e}"),
                None => n,
            })
        })
        .find(|p| !p.exists())
        .unwrap()
}

/// The update step a `lilt://update/<step>` link asks for (`lilt://updates`, from older pages, checks).
fn update_action(url: &tauri::Url) -> Option<&'static str> {
    match url.as_str().trim_end_matches('/') {
        "lilt://update/check" | "lilt://updates" => Some("check"),
        "lilt://update/download" => Some("download"),
        "lilt://update/install" => Some("install"),
        _ => None,
    }
}

fn window(app: &tauri::AppHandle) -> tauri::Result<WebviewWindow> {
    let handle = app.clone();
    let mut builder = WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()));
    if let Some(data) = webview_data() {
        builder = builder.data_directory(data);
    }
    builder
        .title("Lilt")
        .inner_size(1280.0, 820.0)
        .min_inner_size(820.0, 560.0)
        .center()
        // Links to other sites open in your browser, not in Lilt's window. (Navigation is also
        // asked for every embedded video and player, so only the sign-in is sent out here.)
        .initialization_script(LINKS_OUTSIDE)
        .on_page_load(|window, payload| {
            if payload.event() == PageLoadEvent::Finished {
                window.state::<updates::Updates>().publish();
            }
        })
        .on_navigation(move |url| {
            if url.as_str() == "lilt://data-folder" || url.as_str() == "lilt://data-folder/" {
                storage::open(&handle);
                return false;
            }
            // Updates happen in this window: Settings and the notice ask for each step.
            if let Some(action) = update_action(url) {
                updates::request(&handle, action);
                return false;
            }
            if signs_in_outside(url) {
                open_outside(url);
                return false;
            }
            true
        })
        .on_new_window(|url, _| {
            open_outside(&url);
            NewWindowResponse::Deny
        })
        // Respect redirected Downloads folders, including Windows known folders.
        .on_download(|webview, event| {
            if let DownloadEvent::Requested { url, destination } = event {
                let name = destination
                    .file_name()
                    .and_then(|n| n.to_str())
                    .filter(|n| !n.is_empty())
                    .map(str::to_string)
                    .or_else(|| {
                        url.path_segments()
                            .and_then(|mut s| s.next_back())
                            .map(str::to_string)
                    })
                    .unwrap_or_else(|| "Lilt download".into());
                let downloads = webview
                    .app_handle()
                    .path()
                    .download_dir()
                    .unwrap_or_else(|_| home().join("Downloads"));
                *destination = unused(&downloads, &name);
                let shown = destination.clone();
                std::thread::spawn(move || {
                    // macOS doesn't say when it's done; reveal it once it appears.
                    for _ in 0..600 {
                        if shown.exists() {
                            let _ = tauri_plugin_opener::reveal_item_in_dir(&shown);
                            break;
                        }
                        std::thread::sleep(Duration::from_millis(500));
                    }
                });
            }
            true
        })
        // The microphone, for Lilt's own pages only; macOS asks you once.
        .on_permission_request(|webview, kind| match kind {
            PermissionKind::Microphone if webview.url().map(|u| is_local(&u)).unwrap_or(false) => {
                PermissionResponse::Allow
            }
            _ => PermissionResponse::Deny,
        })
        .build()
}

fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_updater::Builder::new()
                .pubkey(updates::PUBLIC_KEY.unwrap_or_default())
                .build(),
        )
        .manage(Server {
            connection: Mutex::new(Connection::default()),
            token: uuid::Uuid::new_v4().to_string(),
        })
        .manage(updates::Updates::new(env!("CARGO_PKG_VERSION")))
        .on_menu_event(|app, event| {
            if event.id().as_ref() == "check-updates" {
                update_notice::show_updates(app);
                updates::request(app, "check");
            }
        })
        .setup(|app| {
            app.state::<updates::Updates>()
                .set_publisher(app.handle().clone());
            let menu = tauri::menu::Menu::default(app.handle())?;
            let item = tauri::menu::MenuItem::with_id(
                app,
                "check-updates",
                "Check for updates…",
                true,
                None::<&str>,
            )?;
            if let Some(submenu) = menu.items()?.first().and_then(|item| item.as_submenu()) {
                submenu.insert(&item, 1)?;
            }
            app.set_menu(menu)?;
            let win = window(app.handle())?;
            let runtime = app.path().resource_dir()?.join("runtime");
            let log = log_path();
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                let result = start(
                    &runtime,
                    &log,
                    &handle.state::<Server>(),
                    StartMode::ReuseIfRunning,
                );
                match result {
                    Ok(port) => {
                        let _ = win.navigate(format!("http://127.0.0.1:{port}/").parse().unwrap());
                        tauri::async_runtime::spawn(async move {
                            let _ = updates::check(&handle).await;
                        });
                    }
                    Err(why) => {
                        let js = format!(
                            "window.liltFailed({why:?}, {:?})",
                            log.display().to_string()
                        );
                        // The page may still be loading; try for a few seconds.
                        for _ in 0..20 {
                            if win.eval(&js).is_ok() {
                                break;
                            }
                            std::thread::sleep(Duration::from_millis(250));
                        }
                    }
                }
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("Lilt couldn't open its window");
    app.run(|app, event| {
        // Closing the window quits the Windows app and its server.
        #[cfg(windows)]
        if let RunEvent::WindowEvent {
            label,
            event: tauri::WindowEvent::CloseRequested { api, .. },
            ..
        } = &event
            && label == "main"
        {
            api.prevent_close();
            app.exit(0);
        }
        if let RunEvent::ExitRequested { api, code, .. } = &event
            && *code != Some(tauri::RESTART_EXIT_CODE)
            && app.state::<updates::Updates>().installing()
        {
            api.prevent_exit();
        }
        if let RunEvent::Exit = event {
            let server = app.state::<Server>();
            let mut connection = server
                .connection
                .lock()
                .expect("server connection lock poisoned");
            connection.stopping = true;
            let _ = connection.stop();
        }
    });
}

#[cfg(test)]
mod server_lifecycle_tests {
    use super::*;

    fn test_process() -> Command {
        let mut command = Command::new(std::env::current_exe().unwrap());
        command
            .arg("--list")
            .stdout(Stdio::null())
            .stderr(Stdio::null());
        #[cfg(target_os = "macos")]
        {
            use std::os::unix::process::CommandExt;
            command.process_group(0);
        }
        command
    }

    #[test]
    fn shutdown_owns_child_before_readiness_and_prevents_late_launch() {
        let mut connection = Connection::default();
        connection.launch(&mut test_process()).unwrap();
        assert!(connection.child.is_some());
        assert!(connection.port.is_none());
        connection.stopping = true;
        connection.stop().unwrap();
        assert!(connection.child.is_none());
        assert_eq!(
            connection.launch(&mut test_process()).unwrap_err(),
            "Lilt is closing."
        );
    }

    #[test]
    fn reaped_child_is_forgotten_and_never_signalled_again() {
        let mut connection = Connection::default();
        connection.launch(&mut test_process()).unwrap();
        connection.port = Some(12345);
        connection.child.as_mut().unwrap().wait().unwrap();
        assert!(connection.check_running().is_err());
        assert!(connection.child.is_none());
        assert!(connection.port.is_none());
        connection.stop().unwrap();
        let mut child = test_process().spawn().unwrap();
        child.wait().unwrap();
        assert_eq!(stop_child(&mut child).unwrap(), StopOutcome::AlreadyExited);
    }

    #[test]
    fn update_refuses_a_server_that_exited_before_group_shutdown() {
        let mut connection = Connection::default();
        connection.launch(&mut test_process()).unwrap();
        connection.child.as_mut().unwrap().wait().unwrap();
        assert!(
            connection
                .stop_for_update()
                .unwrap_err()
                .contains("stopped before")
        );
        assert!(connection.child.is_none());
        assert!(connection.port.is_none());
    }

    #[test]
    fn stopping_an_attached_connection_leaves_the_external_process_alone() {
        let mut external = test_process().spawn().unwrap();
        let mut connection = Connection {
            port: Some(12345),
            ..Connection::default()
        };
        assert_eq!(connection.stop().unwrap(), StopOutcome::AlreadyExited);
        assert!(external.wait().unwrap().success());
    }
}

#[cfg(test)]
mod update_link_tests {
    use super::update_action;

    #[test]
    fn only_the_three_update_steps_are_links_and_older_pages_still_check() {
        for (link, step) in [
            ("lilt://update/check", Some("check")),
            ("lilt://update/download/", Some("download")),
            ("lilt://update/install", Some("install")),
            ("lilt://updates", Some("check")),
            ("lilt://update/delete", None),
            ("lilt://update/install?version=9.9.9", None),
            ("lilt://data-folder", None),
            ("http://127.0.0.1:7878/update/install", None),
        ] {
            assert_eq!(update_action(&link.parse().unwrap()), step, "{link}");
        }
    }
}
