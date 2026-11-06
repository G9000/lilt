//! Visible update state; only explicit actions advance toward installation.

use serde::Serialize;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum Phase {
    Idle,
    Checking,
    UpToDate,
    Available,
    Downloading,
    Ready,
    Installing,
    Unconfigured,
}

#[derive(Clone, Copy, Debug)]
pub enum Action {
    Check,
    Download,
    Install,
}

#[derive(Clone, Debug, Serialize)]
pub struct Snapshot {
    pub phase: Phase,
    pub current: String,
    pub version: Option<String>,
    pub notes: String,
    pub downloaded: u64,
    pub total: Option<u64>,
    pub error: Option<String>,
}

impl Snapshot {
    pub fn new(current: &str, public_key: Option<&str>) -> Self {
        Self {
            phase: if public_key.is_some_and(|key| !key.trim().is_empty()) {
                Phase::Idle
            } else {
                Phase::Unconfigured
            },
            current: current.into(),
            version: None,
            notes: String::new(),
            downloaded: 0,
            total: None,
            error: None,
        }
    }

    pub fn begin(&mut self, action: Action) -> Result<(), String> {
        self.phase = match (action, self.phase) {
            (Action::Check, Phase::Idle | Phase::UpToDate | Phase::Available) => Phase::Checking,
            (Action::Download, Phase::Available) => Phase::Downloading,
            (Action::Install, Phase::Ready) => Phase::Installing,
            (_, Phase::Unconfigured) => {
                return Err("Updates aren't configured for this build.".into());
            }
            _ => return Err("Finish the current update step first.".into()),
        };
        self.error = None;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn missing_key_never_claims_to_be_up_to_date() {
        for key in [None, Some(""), Some("  ")] {
            let mut state = Snapshot::new("0.2.1", key);
            assert_eq!(state.phase, Phase::Unconfigured);
            assert!(state.begin(Action::Check).is_err());
        }
    }

    #[test]
    fn check_download_and_install_are_separate_actions() {
        let mut state = Snapshot::new("0.2.1", Some("public key"));
        assert!(state.begin(Action::Install).is_err());
        state.begin(Action::Check).unwrap();
        assert_eq!(state.phase, Phase::Checking);
        assert!(state.begin(Action::Check).is_err());
        state.phase = Phase::Available;
        assert!(state.begin(Action::Install).is_err());
        state.begin(Action::Download).unwrap();
        assert_eq!(state.phase, Phase::Downloading);
        assert!(state.begin(Action::Download).is_err());
        state.phase = Phase::Ready;
        state.begin(Action::Install).unwrap();
        assert_eq!(state.phase, Phase::Installing);
        assert!(state.begin(Action::Check).is_err());
    }

    #[test]
    fn a_ready_download_is_not_discarded_by_another_check() {
        let mut state = Snapshot::new("0.2.1", Some("public key"));
        state.phase = Phase::Ready;
        state.version = Some("0.2.2".into());
        state.error = Some("Finish saving your take first.".into());
        assert!(state.begin(Action::Check).is_err());
        assert_eq!(state.phase, Phase::Ready);
        state.begin(Action::Install).unwrap();
        assert_eq!(state.error, None);
        assert_eq!(state.version.as_deref(), Some("0.2.2"));
    }
}
