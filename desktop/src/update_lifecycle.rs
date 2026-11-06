//! Installation order and recovery, independent of windows and the filesystem.

use std::future::Future;

pub(crate) trait Lifecycle {
    fn prepare(&mut self) -> impl Future<Output = Result<(), String>> + Send;
    fn cancel(&mut self) -> impl Future<Output = Result<(), String>> + Send;
    fn stop(&mut self) -> impl Future<Output = Result<(), String>> + Send;
    fn install(&mut self) -> impl Future<Output = Result<(), String>> + Send;
    fn recover(&mut self) -> impl Future<Output = Result<(), String>> + Send;
}

pub(crate) async fn run(lifecycle: &mut impl Lifecycle) -> Result<(), String> {
    if let Err(error) = lifecycle.prepare().await {
        // A lost response can still mean the server accepted the preparation.
        return Err(if lifecycle.cancel().await.is_err() {
            format!("{error} If recording stays unavailable, quit and reopen Lilt.")
        } else {
            error
        });
    }
    if let Err(error) = lifecycle.stop().await {
        let _ = lifecycle.cancel().await;
        return Err(format!(
            "Couldn't close Lilt's background work: {error}. Quit and reopen Lilt before trying again."
        ));
    }
    if let Err(error) = lifecycle.install().await {
        return Err(match lifecycle.recover().await {
            Ok(()) => format!(
                "Couldn't install the update. Lilt is running again; you can retry. ({error})"
            ),
            Err(why) => format!(
                "Couldn't install the update or reopen Lilt's background work. Quit and reopen Lilt. Your recordings remain in your data folder. ({error}; {why})"
            ),
        });
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Default)]
    struct Fake {
        calls: Vec<&'static str>,
        failures: Vec<&'static str>,
    }

    impl Fake {
        fn step(&mut self, name: &'static str) -> Result<(), String> {
            self.calls.push(name);
            if self.failures.contains(&name) {
                Err(format!("{name} failed"))
            } else {
                Ok(())
            }
        }
    }

    impl Lifecycle for Fake {
        async fn prepare(&mut self) -> Result<(), String> {
            self.step("prepare")
        }
        async fn cancel(&mut self) -> Result<(), String> {
            self.step("cancel")
        }
        async fn stop(&mut self) -> Result<(), String> {
            self.step("stop")
        }
        async fn install(&mut self) -> Result<(), String> {
            self.step("install")
        }
        async fn recover(&mut self) -> Result<(), String> {
            self.step("recover")
        }
    }

    fn exercise(failures: Vec<&'static str>) -> (Fake, Result<(), String>) {
        let mut fake = Fake {
            failures,
            ..Default::default()
        };
        let result = tauri::async_runtime::block_on(run(&mut fake));
        (fake, result)
    }

    #[test]
    fn installation_waits_for_prepare_and_stop() {
        let (fake, result) = exercise(vec![]);
        assert!(result.is_ok());
        assert_eq!(fake.calls, ["prepare", "stop", "install"]);
    }

    #[test]
    fn failed_prepare_cancels_even_when_its_reply_was_lost() {
        let (fake, result) = exercise(vec!["prepare"]);
        assert_eq!(fake.calls, ["prepare", "cancel"]);
        assert_eq!(result.unwrap_err(), "prepare failed");
    }

    #[test]
    fn failed_cancel_explains_how_to_restore_recording() {
        let (fake, result) = exercise(vec!["prepare", "cancel"]);
        assert_eq!(fake.calls, ["prepare", "cancel"]);
        let error = result.unwrap_err();
        assert!(error.contains("prepare failed"));
        assert!(error.contains("quit and reopen"));
    }

    #[test]
    fn failed_stop_cancels_and_never_installs_or_starts_a_second_server() {
        for failures in [vec!["stop"], vec!["stop", "cancel"]] {
            let (fake, result) = exercise(failures);
            assert_eq!(fake.calls, ["prepare", "stop", "cancel"]);
            let error = result.unwrap_err();
            assert!(error.contains("stop failed"));
            assert!(error.contains("Quit and reopen"));
        }
    }

    #[test]
    fn failed_install_recovers_service_before_offering_retry() {
        let (fake, result) = exercise(vec!["install"]);
        assert_eq!(fake.calls, ["prepare", "stop", "install", "recover"]);
        let error = result.unwrap_err();
        assert!(error.contains("install failed"));
        assert!(error.contains("Lilt is running again"));
    }

    #[test]
    fn failed_recovery_never_claims_lilt_is_running() {
        let (fake, result) = exercise(vec!["install", "recover"]);
        assert_eq!(fake.calls, ["prepare", "stop", "install", "recover"]);
        let error = result.unwrap_err();
        assert!(error.contains("install failed"));
        assert!(error.contains("recover failed"));
        assert!(error.contains("Quit and reopen"));
        assert!(!error.contains("Lilt is running again"));
    }
}
