use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

static OPENING: AtomicBool = AtomicBool::new(false);

struct Opening;

impl Opening {
    fn begin() -> Option<Self> {
        OPENING
            .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
            .ok()
            .map(|_| Self)
    }
}

impl Drop for Opening {
    fn drop(&mut self) {
        OPENING.store(false, Ordering::Release);
    }
}

#[derive(serde::Deserialize)]
struct Folder {
    path: String,
}

fn valid_directory(path: &Path) -> Result<(), &'static str> {
    if !path.is_absolute() || !path.is_dir() {
        return Err("The data folder is unavailable. Use Copy folder path to find it yourself.");
    }
    Ok(())
}

fn trusted_window(app: &AppHandle, port: u16) -> Option<tauri::WebviewWindow> {
    let window = app.get_webview_window("main")?;
    window
        .url()
        .is_ok_and(|url| crate::update_notice::trusted_page(window.label(), &url, port))
        .then_some(window)
}

fn owned_connection(app: &AppHandle, port: u16) -> Result<String, &'static str> {
    let server = app.state::<crate::Server>();
    let mut connection = server
        .connection
        .lock()
        .expect("server connection lock poisoned");
    if connection.child.is_none() {
        return Err(
            "This window is using a separately started Lilt. Use Copy folder path to open its data folder.",
        );
    }
    if connection.stopping || connection.check_running().is_err() || connection.port != Some(port) {
        return Err(
            "Lilt's background work has stopped. Use Copy folder path to open the data folder.",
        );
    }
    Ok(server.token.clone())
}

async fn open_folder(app: &AppHandle, port: u16) -> Result<(), &'static str> {
    let token = owned_connection(app, port)?;
    if trusted_window(app, port).is_none() {
        return Err("Return to Lilt's Settings to open the data folder.");
    }
    let client = reqwest::Client::builder()
        .no_proxy()
        .redirect(reqwest::redirect::Policy::none())
        .timeout(Duration::from_secs(5))
        .build()
        .map_err(|_| "Lilt couldn't request the data folder. Use Copy folder path instead.")?;
    let folder: Folder = client
        .get(format!("http://127.0.0.1:{port}/api/desktop/data-folder"))
        .bearer_auth(token)
        .send()
        .await
        .and_then(reqwest::Response::error_for_status)
        .map_err(|_| "The background server couldn't provide its folder. Use Copy folder path instead.")?
        .json()
        .await
        .map_err(|_| "The background server returned an unreadable folder. Use Copy folder path instead.")?;
    owned_connection(app, port)?;
    if trusted_window(app, port).is_none() {
        return Err("Return to Lilt's Settings to open the data folder.");
    }
    valid_directory(Path::new(&folder.path))?;
    app.opener()
        .open_path(folder.path, None::<&str>)
        .map_err(|_| "Your computer couldn't open the data folder. Use Copy folder path instead.")
}

fn result_script(error: Option<&str>, port: u16) -> Result<String, serde_json::Error> {
    let json = serde_json::to_string(&serde_json::json!({"error": error}))?
        .replace('<', "\\u003c")
        .replace('>', "\\u003e")
        .replace('&', "\\u0026")
        .replace('\u{2028}', "\\u2028")
        .replace('\u{2029}', "\\u2029");
    Ok(format!(
        "if (window.location.origin === \"http://127.0.0.1:{port}\") {{\n\
         window.dispatchEvent(new CustomEvent('lilt:data-folder', {{detail: {json}}}));\n\
         }}"
    ))
}

fn publish(app: &AppHandle, port: u16, error: Option<&str>) {
    let current_port = {
        let server = app.state::<crate::Server>();
        let mut connection = server
            .connection
            .lock()
            .expect("server connection lock poisoned");
        if connection.stopping
            || (connection.child.is_some() && connection.check_running().is_err())
        {
            return;
        }
        connection.port
    };
    if current_port == Some(port)
        && let Some(window) = trusted_window(app, port)
        && let Ok(script) = result_script(error, port)
    {
        let _ = window.eval(script);
    }
}

pub(crate) fn open(app: &AppHandle) {
    let port = app
        .state::<crate::Server>()
        .connection
        .lock()
        .expect("server connection lock poisoned")
        .port;
    let Some(port) = port else { return };
    if trusted_window(app, port).is_none() {
        return;
    }
    let Some(opening) = Opening::begin() else {
        return;
    };
    let app = app.clone();
    tauri::async_runtime::spawn(async move {
        let _opening = opening;
        let result = open_folder(&app, port).await;
        publish(&app, port, result.err());
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn opening_guard_blocks_overlap_and_releases_on_drop() {
        let first = Opening::begin().unwrap();
        assert!(Opening::begin().is_none());
        drop(first);
        assert!(Opening::begin().is_some());
    }

    #[test]
    fn only_an_absolute_existing_directory_can_be_opened() {
        let directory = std::env::temp_dir();
        assert!(valid_directory(&directory).is_ok());
        for path in [
            std::path::PathBuf::from("relative/folder"),
            std::path::PathBuf::new(),
            std::path::PathBuf::from("https://example.com"),
            std::env::current_exe().unwrap(),
            directory.join(format!("lilt-missing-{}", uuid::Uuid::new_v4())),
        ] {
            assert!(valid_directory(&path).is_err(), "{path:?}");
        }
    }

    #[test]
    fn result_script_preserves_errors_as_data_and_rechecks_origin() {
        let hostile = "</script>\";alert(1);//\n\u{2028}\u{2029}";
        for error in [None, Some(hostile)] {
            let script = result_script(error, 7979).unwrap();
            assert!(script.contains("window.location.origin === \"http://127.0.0.1:7979\""));
            assert!(script.contains("new CustomEvent('lilt:data-folder'"));
            assert!(!script.contains("</script>"));
            assert!(!script.contains('\u{2028}'));
            assert!(!script.contains('\u{2029}'));
            let json = script
                .split("detail: ")
                .nth(1)
                .unwrap()
                .split("}));")
                .next()
                .unwrap();
            let detail: serde_json::Value = serde_json::from_str(json).unwrap();
            assert_eq!(detail, serde_json::json!({"error": error}));
        }
    }
}
