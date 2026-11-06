//! Own the server's process tree without racing its first Python subprocess.

use std::io;
use std::os::windows::io::{AsRawHandle, FromRawHandle, OwnedHandle};
use std::os::windows::process::CommandExt;
use std::process::{Child, Command};
use windows_sys::Win32::Foundation::INVALID_HANDLE_VALUE;
use windows_sys::Win32::System::Diagnostics::ToolHelp::{
    CreateToolhelp32Snapshot, TH32CS_SNAPTHREAD, THREADENTRY32, Thread32First, Thread32Next,
};
use windows_sys::Win32::System::JobObjects::{
    AssignProcessToJobObject, CreateJobObjectW, JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JobObjectExtendedLimitInformation,
    SetInformationJobObject, TerminateJobObject,
};
use windows_sys::Win32::System::Threading::{
    CREATE_NO_WINDOW, CREATE_SUSPENDED, OpenThread, ResumeThread, THREAD_SUSPEND_RESUME,
};

#[derive(Debug)]
pub struct Job(OwnedHandle);

impl Job {
    pub fn spawn(command: &mut Command) -> io::Result<(Child, Self)> {
        // SAFETY: Null attributes create a non-inheritable, unnamed job owned by this call.
        let raw = unsafe { CreateJobObjectW(std::ptr::null(), std::ptr::null()) };
        if raw.is_null() {
            return Err(io::Error::last_os_error());
        }
        // SAFETY: CreateJobObjectW returned a valid, uniquely owned handle.
        let job = Self(unsafe { OwnedHandle::from_raw_handle(raw) });
        let mut limits = JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();
        limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        // SAFETY: The live job and correctly sized, initialized limits remain valid for the call.
        if unsafe {
            SetInformationJobObject(
                job.0.as_raw_handle(),
                JobObjectExtendedLimitInformation,
                (&limits as *const JOBOBJECT_EXTENDED_LIMIT_INFORMATION).cast(),
                std::mem::size_of_val(&limits) as u32,
            )
        } == 0
        {
            return Err(io::Error::last_os_error());
        }
        let mut child = command
            .creation_flags(CREATE_NO_WINDOW | CREATE_SUSPENDED)
            .spawn()?;
        let attach = || {
            // SAFETY: Both handles are live. The suspended child cannot create unowned descendants.
            if unsafe { AssignProcessToJobObject(job.0.as_raw_handle(), child.as_raw_handle()) }
                == 0
            {
                return Err(io::Error::last_os_error());
            }
            resume(child.id())
        };
        if let Err(error) = attach() {
            // The child is still ours even if assignment failed; never leave it suspended.
            let _ = child.kill();
            let _ = child.wait();
            return Err(error);
        }
        Ok((child, job))
    }

    pub fn terminate(&self) -> io::Result<()> {
        // SAFETY: This non-inherited handle refers only to the process tree we started.
        if unsafe { TerminateJobObject(self.0.as_raw_handle(), 1) } == 0 {
            return Err(io::Error::last_os_error());
        }
        Ok(())
    }
}

fn resume(process_id: u32) -> io::Result<()> {
    // std::process owns the process handle but doesn't expose the initial thread handle.
    // The suspended process has exactly one thread and cannot exit or reuse its id here.
    // SAFETY: The snapshot API has no pointer arguments and returns an owned handle.
    let raw = unsafe { CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0) };
    if raw == INVALID_HANDLE_VALUE {
        return Err(io::Error::last_os_error());
    }
    // SAFETY: The successful snapshot handle has unique ownership.
    let snapshot = unsafe { OwnedHandle::from_raw_handle(raw) };
    let mut entry = THREADENTRY32 {
        dwSize: std::mem::size_of::<THREADENTRY32>() as u32,
        ..Default::default()
    };
    // SAFETY: The initialized entry and snapshot are valid throughout enumeration.
    let mut found = unsafe { Thread32First(snapshot.as_raw_handle(), &mut entry) };
    while found != 0 {
        if entry.th32OwnerProcessID == process_id {
            // SAFETY: The thread belongs to the still-suspended owned process. No handle inheritance.
            let raw = unsafe { OpenThread(THREAD_SUSPEND_RESUME, 0, entry.th32ThreadID) };
            if raw.is_null() {
                return Err(io::Error::last_os_error());
            }
            // SAFETY: OpenThread returned a valid, uniquely owned handle.
            let thread = unsafe { OwnedHandle::from_raw_handle(raw) };
            // SAFETY: The owned thread handle has THREAD_SUSPEND_RESUME access.
            if unsafe { ResumeThread(thread.as_raw_handle()) } == u32::MAX {
                return Err(io::Error::last_os_error());
            }
            return Ok(());
        }
        // SAFETY: The initialized entry and snapshot remain valid.
        found = unsafe { Thread32Next(snapshot.as_raw_handle(), &mut entry) };
    }
    Err(io::Error::new(
        io::ErrorKind::NotFound,
        "The server's startup thread was unavailable.",
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::process::Stdio;
    use std::time::{Duration, Instant};
    use windows_sys::Win32::Foundation::WAIT_OBJECT_0;
    use windows_sys::Win32::System::Threading::{
        OpenProcess, PROCESS_SYNCHRONIZE, WaitForSingleObject,
    };

    fn helper(name: &str) -> Command {
        let mut command = Command::new(std::env::current_exe().unwrap());
        command
            .args(["--exact", name, "--ignored", "--nocapture"])
            .stdout(Stdio::null())
            .stderr(Stdio::null());
        command
    }

    #[test]
    #[ignore = "subprocess fixture, invoked only by the job ownership tests"]
    fn descendant_helper() {
        if std::env::var_os("LILT_JOB_TEST_CHILD").is_none() {
            return;
        }
        std::thread::sleep(Duration::from_secs(60));
    }

    #[test]
    #[ignore = "subprocess fixture, invoked only by the job ownership tests"]
    #[expect(
        clippy::zombie_processes,
        reason = "the regression deliberately exits the parent before the job cleans up its descendant"
    )]
    fn parent_helper() {
        let Some(marker) = std::env::var_os("LILT_JOB_TEST_MARKER") else {
            return;
        };
        let mut child = helper("windows_process::tests::descendant_helper")
            .env("LILT_JOB_TEST_CHILD", "1")
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .unwrap();
        std::fs::write(marker, child.id().to_string()).unwrap();
        if std::env::var_os("LILT_JOB_TEST_PARENT_EXITS").is_some() {
            // Intentionally leave the child alive to exercise cleanup after the parent is gone.
            return;
        }
        child.wait().unwrap();
    }

    fn owned_tree(parent_exits: bool) -> (Child, Job, OwnedHandle, std::path::PathBuf) {
        let marker = std::env::temp_dir().join(format!("lilt-job-{}.txt", uuid::Uuid::new_v4()));
        let mut command = helper("windows_process::tests::parent_helper");
        command.env("LILT_JOB_TEST_MARKER", &marker);
        if parent_exits {
            command.env("LILT_JOB_TEST_PARENT_EXITS", "1");
        }
        let (mut child, job) = Job::spawn(&mut command).unwrap();
        let deadline = Instant::now() + Duration::from_secs(15);
        let id = loop {
            if let Ok(text) = std::fs::read_to_string(&marker)
                && let Ok(id) = text.parse::<u32>()
            {
                break id;
            }
            assert!(
                Instant::now() < deadline,
                "helper did not create its descendant"
            );
            std::thread::sleep(Duration::from_millis(20));
        };
        // SAFETY: Opening a process for synchronization does not mutate it; null is checked.
        let raw = unsafe { OpenProcess(PROCESS_SYNCHRONIZE, 0, id) };
        assert!(!raw.is_null(), "descendant must still be alive");
        // SAFETY: OpenProcess returned a unique owned handle.
        let descendant = unsafe { OwnedHandle::from_raw_handle(raw) };
        if parent_exits {
            assert!(child.wait().unwrap().success());
        }
        (child, job, descendant, marker)
    }

    #[test]
    fn job_termination_stops_a_live_server_and_its_descendant() {
        let (mut child, job, descendant, marker) = owned_tree(false);
        job.terminate().unwrap();
        child.wait().unwrap();
        // SAFETY: The synchronization handle remains live throughout the bounded wait.
        assert_eq!(
            unsafe { WaitForSingleObject(descendant.as_raw_handle(), 5000) },
            WAIT_OBJECT_0
        );
        std::fs::remove_file(marker).unwrap();
    }

    #[test]
    fn closing_the_job_stops_descendants_after_the_server_exits() {
        let (_child, job, descendant, marker) = owned_tree(true);
        drop(job);
        // SAFETY: The synchronization handle remains live throughout the bounded wait.
        assert_eq!(
            unsafe { WaitForSingleObject(descendant.as_raw_handle(), 5000) },
            WAIT_OBJECT_0
        );
        std::fs::remove_file(marker).unwrap();
    }
}
