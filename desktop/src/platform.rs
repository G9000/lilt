use std::ffi::OsString;
use std::io;
use std::net::{Ipv4Addr, SocketAddrV4, TcpListener};
use std::path::{Path, PathBuf};

pub const PORT: u16 = 7878;

pub fn home_from(home: Option<OsString>, profile: Option<OsString>) -> PathBuf {
    home.filter(|value| !value.is_empty())
        .or_else(|| profile.filter(|value| !value.is_empty()))
        .map(PathBuf::from)
        .unwrap_or_else(|| ".".into())
}

pub fn server_path(runtime: &Path) -> PathBuf {
    runtime.join(if cfg!(windows) { "lilt.exe" } else { "lilt" })
}

pub fn python_path(runtime: &Path) -> PathBuf {
    runtime.join(if cfg!(windows) {
        "python/python.exe"
    } else {
        "python/bin/python3"
    })
}

pub fn free_port(isolated: bool, explicit: Option<&str>) -> io::Result<u16> {
    if let Some(address) = explicit.and_then(|value| value.parse::<SocketAddrV4>().ok())
        && address.ip() == &Ipv4Addr::LOCALHOST
        && address.port() != 0
        && (!isolated || address.port() != PORT)
        && TcpListener::bind(address).is_ok()
    {
        return Ok(address.port());
    }
    if !isolated && TcpListener::bind((Ipv4Addr::LOCALHOST, PORT)).is_ok() {
        return Ok(PORT);
    }
    Ok(TcpListener::bind((Ipv4Addr::LOCALHOST, 0))?
        .local_addr()?
        .port())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn home_falls_back_to_userprofile_when_home_is_missing_or_empty() {
        let profile = OsString::from("C:/Users/Voice Practice");
        assert_eq!(
            home_from(None, Some(profile.clone())),
            PathBuf::from(&profile)
        );
        assert_eq!(
            home_from(Some(OsString::new()), Some(profile.clone())),
            PathBuf::from(profile)
        );
        assert_eq!(
            home_from(Some("/home/voice".into()), Some("ignored".into())),
            PathBuf::from("/home/voice")
        );
    }

    #[test]
    fn bundled_paths_match_the_host_platform() {
        let runtime = Path::new("runtime with spaces");
        if cfg!(windows) {
            assert_eq!(server_path(runtime), runtime.join("lilt.exe"));
            assert_eq!(python_path(runtime), runtime.join("python/python.exe"));
        } else {
            assert_eq!(server_path(runtime), runtime.join("lilt"));
            assert_eq!(python_path(runtime), runtime.join("python/bin/python3"));
        }
    }

    #[test]
    fn isolated_launch_never_uses_the_owners_port() {
        assert_ne!(free_port(true, None).unwrap(), PORT);
        assert_ne!(free_port(true, Some("127.0.0.1:7878")).unwrap(), PORT);
    }

    #[test]
    fn isolated_launch_uses_a_free_explicit_loopback_port() {
        let listener = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
        let port = listener.local_addr().unwrap().port();
        drop(listener);
        assert_eq!(
            free_port(true, Some(&format!("127.0.0.1:{port}"))).unwrap(),
            port
        );
        let busy = TcpListener::bind((Ipv4Addr::LOCALHOST, 0)).unwrap();
        let busy_port = busy.local_addr().unwrap().port();
        assert_ne!(
            free_port(true, Some(&format!("127.0.0.1:{busy_port}"))).unwrap(),
            busy_port
        );
    }
}
