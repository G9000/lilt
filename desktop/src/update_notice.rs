//! Read-only desktop update status for the local practice window.

use crate::update_state::{Phase, Snapshot};
use serde::Serialize;
use tauri::{AppHandle, Manager, Url};

#[derive(Debug, PartialEq, Eq, Serialize)]
pub struct Notice {
    current: String,
    phase: Phase,
    version: Option<String>,
    failed: bool,
}

impl From<&Snapshot> for Notice {
    fn from(snapshot: &Snapshot) -> Self {
        Self {
            current: snapshot.current.clone(),
            phase: snapshot.phase,
            version: match snapshot.phase {
                Phase::Available | Phase::Downloading | Phase::Ready | Phase::Installing => {
                    snapshot.version.clone()
                }
                _ => None,
            },
            failed: snapshot.error.is_some(),
        }
    }
}

fn trusted_page(label: &str, url: &Url, port: u16) -> bool {
    label == "main"
        && url.scheme() == "http"
        && url.host_str() == Some("127.0.0.1")
        && url.port_or_known_default() == Some(port)
        && url.username().is_empty()
        && url.password().is_none()
}

fn script(notice: &Notice, port: u16) -> Result<String, serde_json::Error> {
    let json = serde_json::to_string(notice)?
        .replace('<', "\\u003c")
        .replace('>', "\\u003e")
        .replace('&', "\\u0026")
        .replace('\u{2028}', "\\u2028")
        .replace('\u{2029}', "\\u2029");
    Ok(format!(
        "if (window.location.origin === \"http://127.0.0.1:{port}\") {{\n\
         window.__LILT_APP_UPDATE__ = {json};\n\
         window.dispatchEvent(new Event('lilt:app-update'));\n\
         }}"
    ))
}

pub fn publish(app: &AppHandle, notice: &Notice) {
    let port = app
        .state::<crate::Server>()
        .connection
        .lock()
        .expect("server connection lock poisoned")
        .port;
    let Some(port) = port else { return };
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    if window
        .url()
        .is_ok_and(|url| trusted_page(window.label(), &url, port))
        && let Ok(script) = script(notice, port)
    {
        // Navigation may happen between reading the URL and evaluating the script.
        let _ = window.eval(script);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn projection_exposes_only_visible_fields_and_hides_stale_versions() {
        let mut snapshot = Snapshot::new("0.2.1", Some("key"));
        snapshot.version = Some("0.2.2".into());
        snapshot.notes = "private notes".into();
        snapshot.error = Some("private failure details".into());
        snapshot.downloaded = 20;
        snapshot.total = Some(100);
        for (phase, version) in [
            (Phase::Idle, None),
            (Phase::Checking, None),
            (Phase::UpToDate, None),
            (Phase::Unconfigured, None),
            (Phase::Available, Some("0.2.2")),
            (Phase::Downloading, Some("0.2.2")),
            (Phase::Ready, Some("0.2.2")),
            (Phase::Installing, Some("0.2.2")),
        ] {
            snapshot.phase = phase;
            assert_eq!(
                serde_json::to_value(Notice::from(&snapshot)).unwrap(),
                serde_json::json!({"current": "0.2.1", "phase": phase, "version": version, "failed": true}),
                "phase {phase:?}",
            );
        }
        snapshot.error = None;
        assert!(!Notice::from(&snapshot).failed);
    }

    #[test]
    fn byte_progress_and_error_details_do_not_change_the_notice() {
        let mut snapshot = Snapshot::new("0.2.1", Some("key"));
        snapshot.phase = Phase::Downloading;
        snapshot.version = Some("0.2.2".into());
        let notice = Notice::from(&snapshot);
        snapshot.downloaded = 123;
        snapshot.total = Some(456);
        snapshot.notes = "new notes".into();
        assert_eq!(Notice::from(&snapshot), notice);
        snapshot.error = Some("network failure".into());
        assert_ne!(Notice::from(&snapshot), notice);
        let failed = Notice::from(&snapshot);
        snapshot.error = Some("different failure details".into());
        assert_eq!(Notice::from(&snapshot), failed);
    }

    #[test]
    fn only_the_main_exact_http_loopback_origin_receives_status() {
        for path in ["/", "/settings", "/?tab=updates#current"] {
            let url = format!("http://127.0.0.1:7979{path}").parse().unwrap();
            assert!(trusted_page("main", &url, 7979), "{url}");
            assert!(!trusted_page("updates", &url, 7979), "{url}");
            assert!(!trusted_page("main", &url, 7878), "{url}");
        }
        for address in [
            "http://127.0.0.1/",
            "https://127.0.0.1:7979/",
            "http://localhost:7979/",
            "http://[::1]:7979/",
            "http://127.0.0.2:7979/",
            "http://127.0.0.1.evil.example:7979/",
            "http://user:password@127.0.0.1:7979/",
            "http://evil.example:7979/",
            "tauri://localhost/",
            "about:blank",
            "data:text/html,hello",
            "blob:http://127.0.0.1:7979/id",
        ] {
            assert!(
                !trusted_page("main", &address.parse().unwrap(), 7979),
                "{address}"
            );
        }
    }

    #[test]
    fn script_preserves_strings_as_data_and_checks_origin_again() {
        let mut snapshot = Snapshot::new("0.2.1", Some("key"));
        snapshot.phase = Phase::Available;
        let hostile = "</script>\";alert(1);//\n\u{2028}\u{2029}";
        snapshot.version = Some(hostile.into());
        let script = script(&Notice::from(&snapshot), 7979).unwrap();
        assert!(script.contains("window.location.origin === \"http://127.0.0.1:7979\""));
        assert!(script.contains("window.dispatchEvent(new Event('lilt:app-update'))"));
        assert!(!script.contains("</script>"));
        assert!(!script.contains('\u{2028}'));
        assert!(!script.contains('\u{2029}'));
        let json = script
            .split("window.__LILT_APP_UPDATE__ = ")
            .nth(1)
            .unwrap()
            .split(";\n")
            .next()
            .unwrap();
        let value: serde_json::Value = serde_json::from_str(json).unwrap();
        assert_eq!(value["version"], hostile);
        assert_eq!(value.as_object().unwrap().len(), 4);
    }
}
