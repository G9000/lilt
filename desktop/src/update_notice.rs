//! Desktop update status for the local practice window, which shows it in Settings and the
//! notifications and asks for each step through `lilt://update/…` links.

use crate::update_state::{Phase, Snapshot};
use serde::Serialize;
use tauri::{AppHandle, Manager, Url};

#[derive(Debug, PartialEq, Eq, Serialize)]
pub struct Notice {
    current: String,
    phase: Phase,
    version: Option<String>,
    failed: bool,
    /// What went wrong, in words, so the window can say it (Lilt's own sentence).
    error: Option<String>,
    /// The release's notes while an update is on offer.
    notes: Option<String>,
    /// Whole percent downloaded, once the size is known; changes at most a hundred times.
    progress: Option<u8>,
}

/// Long enough for any release note; a hostile feed can't flood the page.
const NOTES_MAX: usize = 4000;

impl From<&Snapshot> for Notice {
    fn from(snapshot: &Snapshot) -> Self {
        let offered = matches!(
            snapshot.phase,
            Phase::Available | Phase::Downloading | Phase::Ready | Phase::Installing
        );
        Self {
            current: snapshot.current.clone(),
            phase: snapshot.phase,
            version: if offered {
                snapshot.version.clone()
            } else {
                None
            },
            failed: snapshot.error.is_some(),
            error: snapshot.error.clone(),
            notes: (offered && !snapshot.notes.trim().is_empty())
                .then(|| snapshot.notes.chars().take(NOTES_MAX).collect()),
            progress: match (snapshot.phase, snapshot.total) {
                (Phase::Downloading, Some(total)) if total > 0 => {
                    Some((snapshot.downloaded.min(total) * 100 / total) as u8)
                }
                _ => None,
            },
        }
    }
}

pub(crate) fn trusted_page(label: &str, url: &Url, port: u16) -> bool {
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

/// Open Settings at Updates in the practice window (from the app menu).
pub fn show_updates(app: &AppHandle) {
    let Some((window, port)) = practice_window(app) else {
        return;
    };
    let _ = window.set_focus();
    let _ = window.eval(format!(
        "if (window.location.origin === \"http://127.0.0.1:{port}\") {{\n\
         window.dispatchEvent(new CustomEvent('lilt:settings', {{ detail: 'updates' }}));\n\
         }}"
    ));
}

/// Lilt's own practice page in the main window, with the port it was served from.
fn practice_window(app: &AppHandle) -> Option<(tauri::WebviewWindow, u16)> {
    let port = app
        .state::<crate::Server>()
        .connection
        .lock()
        .expect("server connection lock poisoned")
        .port?;
    let window = app.get_webview_window("main")?;
    window
        .url()
        .is_ok_and(|url| trusted_page(window.label(), &url, port))
        .then_some((window, port))
}

pub fn publish(app: &AppHandle, notice: &Notice) {
    if let Some((window, port)) = practice_window(app)
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
    fn the_offered_version_and_notes_show_only_while_an_update_is_on_offer() {
        let mut snapshot = Snapshot::new("0.2.1", Some("key"));
        snapshot.version = Some("0.2.2".into());
        snapshot.notes = "A quiet update.".into();
        snapshot.error = Some("Couldn't check for updates.".into());
        snapshot.downloaded = 20;
        snapshot.total = Some(100);
        for (phase, offered, progress) in [
            (Phase::Idle, false, None),
            (Phase::Checking, false, None),
            (Phase::UpToDate, false, None),
            (Phase::Unconfigured, false, None),
            (Phase::Available, true, None),
            (Phase::Downloading, true, Some(20)),
            (Phase::Ready, true, None),
            (Phase::Installing, true, None),
        ] {
            snapshot.phase = phase;
            assert_eq!(
                serde_json::to_value(Notice::from(&snapshot)).unwrap(),
                serde_json::json!({"current": "0.2.1", "phase": phase,
                    "version": offered.then_some("0.2.2"), "failed": true,
                    "error": "Couldn't check for updates.",
                    "notes": offered.then_some("A quiet update."), "progress": progress}),
                "phase {phase:?}",
            );
        }
        snapshot.error = None;
        assert!(!Notice::from(&snapshot).failed);
        snapshot.phase = Phase::Available;
        snapshot.notes = "x".repeat(NOTES_MAX * 2);
        assert_eq!(
            Notice::from(&snapshot).notes.unwrap().chars().count(),
            NOTES_MAX
        );
    }

    #[test]
    fn download_progress_changes_the_notice_once_per_whole_percent() {
        let mut snapshot = Snapshot::new("0.2.1", Some("key"));
        snapshot.phase = Phase::Downloading;
        snapshot.version = Some("0.2.2".into());
        assert_eq!(Notice::from(&snapshot).progress, None, "size not known yet");
        snapshot.total = Some(1000);
        snapshot.downloaded = 123;
        let at = Notice::from(&snapshot);
        assert_eq!(at.progress, Some(12));
        snapshot.downloaded = 129;
        assert_eq!(
            Notice::from(&snapshot),
            at,
            "same whole percent, no new notice"
        );
        snapshot.downloaded = 5000;
        assert_eq!(Notice::from(&snapshot).progress, Some(100));
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
        assert_eq!(value.as_object().unwrap().len(), 7);
    }
}
