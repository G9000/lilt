//! Data-use permits outlive request cancellation and are retained by streamed bodies.

use anyhow::{Result, bail};
use std::sync::{Arc, Mutex};

#[derive(Debug, Default)]
pub struct Admission {
    state: Mutex<State>,
}

#[derive(Debug, Default)]
struct State {
    readers: usize,
    exclusive: bool,
}

#[derive(Debug)]
pub struct Permit {
    admission: Arc<Admission>,
    exclusive: bool,
}

impl Admission {
    pub fn enter(self: &Arc<Self>) -> Result<Permit> {
        let mut state = self.state.lock().expect("admission lock poisoned");
        if state.exclusive {
            bail!("Lilt is backing up or restoring your practice. Please try again shortly.");
        }
        state.readers += 1;
        Ok(Permit {
            admission: self.clone(),
            exclusive: false,
        })
    }

    pub fn exclusive(self: &Arc<Self>) -> Result<Permit> {
        let mut state = self.state.lock().expect("admission lock poisoned");
        if state.exclusive || state.readers != 0 {
            bail!(
                "Lilt is busy. Let recordings, downloads and other requests finish, then try again."
            );
        }
        state.exclusive = true;
        Ok(Permit {
            admission: self.clone(),
            exclusive: true,
        })
    }
}

impl Drop for Permit {
    fn drop(&mut self) {
        let mut state = self
            .admission
            .state
            .lock()
            .expect("admission lock poisoned");
        if self.exclusive {
            state.exclusive = false;
        } else {
            state.readers -= 1;
        }
    }
}
