//! The native updater is available only to its bundled page and Lilt release assets.

use tauri::Url;

pub fn trusted_page(label: &str, url: &Url) -> bool {
    label == "updates"
        && url.path() == "/updates.html"
        && url.port().is_none()
        && url.username().is_empty()
        && url.password().is_none()
        && matches!(
            (url.scheme(), url.host_str()),
            ("tauri", Some("localhost")) | ("http" | "https", Some("tauri.localhost"))
        )
}

pub fn trusted_download(url: &Url, version: &str) -> bool {
    url.scheme() == "https"
        && url.host_str() == Some("github.com")
        && url.port().is_none()
        && url.username().is_empty()
        && url.password().is_none()
        && url
            .path()
            .starts_with(&format!("/G9000/lilt/releases/download/v{version}/"))
        && url.path().ends_with(".app.tar.gz")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_the_bundled_updates_window_can_control_updates() {
        for page in [
            "tauri://localhost/updates.html",
            "http://tauri.localhost/updates.html",
            "https://tauri.localhost/updates.html",
        ] {
            assert!(
                trusted_page("updates", &Url::parse(page).unwrap()),
                "{page}"
            );
            assert!(!trusted_page("main", &Url::parse(page).unwrap()), "{page}");
        }
        for page in [
            "http://127.0.0.1:7878/updates.html",
            "https://example.com/updates.html",
            "tauri://localhost/index.html",
            "http://tauri.localhost:3000/updates.html",
            "tauri://other/updates.html",
        ] {
            assert!(
                !trusted_page("updates", &Url::parse(page).unwrap()),
                "{page}"
            );
        }
    }

    #[test]
    fn downloads_belong_to_the_announced_lilt_release() {
        assert!(trusted_download(&Url::parse("https://github.com/G9000/lilt/releases/download/v0.2.2/Lilt-0.2.2-aarch64.app.tar.gz").unwrap(), "0.2.2"));
        for url in [
            "http://github.com/G9000/lilt/releases/download/v0.2.2/Lilt.app.tar.gz",
            "https://github.com/other/lilt/releases/download/v0.2.2/Lilt.app.tar.gz",
            "https://github.com/G9000/lilt/releases/download/v0.2.1/Lilt.app.tar.gz",
            "https://github.com:444/G9000/lilt/releases/download/v0.2.2/Lilt.app.tar.gz",
            "https://user@github.com/G9000/lilt/releases/download/v0.2.2/Lilt.app.tar.gz",
        ] {
            assert!(
                !trusted_download(&Url::parse(url).unwrap(), "0.2.2"),
                "{url}"
            );
        }
    }
}
