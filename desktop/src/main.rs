//! Lilt as a Mac app: a window around the Lilt server. On launch it starts the bundled server
//! (with its own Python for measuring takes) on this computer, shows "Opening Lilt…" until it
//! answers, then loads it. Quitting stops the server. Your data lives where `./lilt.sh` keeps it,
//! `~/Lilt/data` (or `LILT_DATA_DIR`), so the app and a Lilt started from the repo share one desk;
//! if a Lilt is already running on port 7878, the window simply opens that one.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::webview::{DownloadEvent, NewWindowResponse, PermissionKind, PermissionResponse};
use tauri::{Manager, RunEvent, Url, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

const PORT: u16 = 7878;

/// The server this app started (none when it opened one that was already running).
struct Server(Mutex<Option<Child>>);

fn home() -> PathBuf {
    std::env::var_os("HOME")
        .map(PathBuf::from)
        .unwrap_or_else(|| ".".into())
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

/// 7878 when it's free (so links, MCP and other devices work as the guide says), else any free port.
fn free_port() -> std::io::Result<u16> {
    if TcpListener::bind(("127.0.0.1", PORT)).is_ok() {
        return Ok(PORT);
    }
    Ok(TcpListener::bind(("127.0.0.1", 0))?.local_addr()?.port())
}

/// Start the bundled server; `Ok` once it answers.
fn start(runtime: &Path, log: &Path) -> Result<(u16, Option<Child>), String> {
    // Another Lilt on your desk (say, ./lilt.sh): open that one rather than run two on one folder.
    // With LILT_DATA_DIR set (a different folder), always run this app's own.
    if std::env::var_os("LILT_DATA_DIR").is_none() && lilt_at(PORT) {
        return Ok((PORT, None));
    }
    let port = free_port().map_err(|e| format!("No free port to run on ({e})."))?;
    let _ = std::fs::create_dir_all(log.parent().unwrap());
    let out = std::fs::File::create(log).map_err(|e| format!("Couldn't write the log ({e})."))?;
    let err = out.try_clone().map_err(|e| e.to_string())?;
    let mut child = Command::new(runtime.join("lilt"))
        .arg("serve")
        .current_dir(runtime)
        .env("LILT_BIND", format!("127.0.0.1:{port}"))
        .env("LILT_WEB_DIR", runtime.join("web"))
        .env("LILT_CONTENT_DIR", runtime.join("content"))
        .env("LILT_PYTHON", runtime.join("python/bin/python3"))
        .env("LILT_ANALYSIS_DIR", runtime.join("analysis"))
        .env("PYTHONDONTWRITEBYTECODE", "1")
        .stdin(Stdio::null())
        .stdout(out)
        .stderr(err)
        .spawn()
        .map_err(|e| format!("The Lilt server wouldn't start ({e})."))?;
    let began = Instant::now();
    while began.elapsed() < Duration::from_secs(60) {
        if let Ok(Some(status)) = child.try_wait() {
            return Err(format!("The Lilt server stopped as it started ({status})."));
        }
        if lilt_at(port) {
            return Ok((port, Some(child)));
        }
        std::thread::sleep(Duration::from_millis(150));
    }
    let _ = child.kill();
    Err("The Lilt server didn't answer within a minute.".into())
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

fn window(app: &tauri::AppHandle) -> tauri::Result<WebviewWindow> {
    WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
        .title("Lilt")
        .inner_size(1280.0, 820.0)
        .min_inner_size(820.0, 560.0)
        .center()
        // Links to other sites open in your browser, not in Lilt's window. (Navigation is also
        // asked for every embedded video and player, so only the sign-in is sent out here.)
        .initialization_script(LINKS_OUTSIDE)
        .on_navigation(|url| {
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
        // Export all (and any other download) lands in Downloads and is shown in Finder.
        .on_download(|_, event| {
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
                *destination = unused(&home().join("Downloads"), &name);
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
        .manage(Server(Mutex::new(None)))
        .setup(|app| {
            let win = window(app.handle())?;
            let runtime = app.path().resource_dir()?.join("runtime");
            let log = home().join("Lilt/logs/lilt-app.log");
            let handle = app.handle().clone();
            std::thread::spawn(move || match start(&runtime, &log) {
                Ok((port, child)) => {
                    *handle.state::<Server>().0.lock().unwrap() = child;
                    let _ = win.navigate(format!("http://127.0.0.1:{port}/").parse().unwrap());
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
            });
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("Lilt couldn't open its window");
    app.run(|app, event| {
        if let RunEvent::Exit = event
            && let Some(mut child) = app.state::<Server>().0.lock().unwrap().take()
        {
            let _ = child.kill();
            let _ = child.wait();
        }
    });
}
