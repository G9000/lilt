//! The native updater downloads only Lilt's own release assets.

use tauri::Url;

/// A Lilt release asset of exactly the announced version: the Mac app archive, or on Windows the
/// signed installer the app runs quietly. The signature is checked separately by the updater.
pub fn trusted_download(url: &Url, version: &str) -> bool {
    let asset = if cfg!(windows) {
        format!("/Lilt-{version}-x64-setup.exe")
    } else {
        ".app.tar.gz".to_string()
    };
    url.scheme() == "https"
        && url.host_str() == Some("github.com")
        && url.port().is_none()
        && url.username().is_empty()
        && url.password().is_none()
        && url
            .path()
            .starts_with(&format!("/G9000/lilt/releases/download/v{version}/"))
        && url.path().ends_with(&asset)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(windows)]
    fn windows_downloads_are_the_installer_of_the_announced_release() {
        assert!(trusted_download(
            &Url::parse(
                "https://github.com/G9000/lilt/releases/download/v0.1.2/Lilt-0.1.2-x64-setup.exe"
            )
            .unwrap(),
            "0.1.2"
        ));
        for url in [
            "https://github.com/G9000/lilt/releases/download/v0.1.2/Lilt-0.1.1-x64-setup.exe",
            "https://github.com/G9000/lilt/releases/download/v0.1.2/Lilt-0.1.2-aarch64.app.tar.gz",
            "https://github.com/G9000/lilt/releases/download/v0.1.2/other.exe",
            "https://github.com/other/lilt/releases/download/v0.1.2/Lilt-0.1.2-x64-setup.exe",
            "http://github.com/G9000/lilt/releases/download/v0.1.2/Lilt-0.1.2-x64-setup.exe",
        ] {
            assert!(
                !trusted_download(&Url::parse(url).unwrap(), "0.1.2"),
                "{url}"
            );
        }
    }

    #[test]
    #[cfg(not(windows))]
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
