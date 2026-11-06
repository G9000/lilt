//! Logical file sizes, collected without opening saved file contents.

use serde::Serialize;
use std::{
    fs,
    path::Path,
    time::{Duration, Instant},
};

#[derive(Debug, Serialize)]
pub(crate) struct Overview {
    data_path: String,
    backup_path: String,
    scanned_utc: String,
    complete: bool,
    skipped_entries: u64,
    total_bytes: u64,
    categories: [Category; 4],
}

#[derive(Debug, Serialize)]
struct Category {
    id: &'static str,
    bytes: u64,
    files: u64,
}

struct Limits {
    entries: usize,
    depth: usize,
    time: Duration,
}

pub(crate) fn scan(data: &Path, backup: &Path) -> Overview {
    scan_with_limits(
        data,
        backup,
        Limits {
            entries: 100_000,
            depth: 64,
            time: Duration::from_secs(5),
        },
    )
}

fn scan_with_limits(data: &Path, backup: &Path, limits: Limits) -> Overview {
    let started = Instant::now();
    let mut remaining = limits.entries;
    let mut overview = Overview {
        data_path: data.to_string_lossy().into_owned(),
        backup_path: backup.to_string_lossy().into_owned(),
        scanned_utc: crate::util::now_utc(),
        complete: true,
        skipped_entries: 0,
        total_bytes: 0,
        categories: ["recordings", "photos", "backups", "other"].map(|id| Category {
            id,
            bytes: 0,
            files: 0,
        }),
    };
    for (root, category) in [(data, None), (backup, Some(2))] {
        if remaining == 0 || started.elapsed() >= limits.time {
            overview.skip(1);
            continue;
        }
        remaining -= 1;
        match fs::symlink_metadata(root) {
            Ok(metadata) if ordinary(&metadata) && metadata.is_dir() => {}
            _ => {
                overview.skip(1);
                continue;
            }
        }
        let entries = match fs::read_dir(root) {
            Ok(entries) => entries,
            Err(_) => {
                overview.skip(1);
                continue;
            }
        };
        // Iterators keep memory and open directories bounded by depth, even for wide trees.
        let mut stack = vec![(entries, 0)];
        while let Some((entries, depth)) = stack.last_mut() {
            if remaining == 0 || started.elapsed() >= limits.time {
                // A skipped subtree is one entry; its unseen descendants cannot be counted.
                overview.skip(stack.len() as u64);
                break;
            }
            let depth = *depth + 1;
            let Some(entry) = entries.next() else {
                stack.pop();
                continue;
            };
            remaining -= 1;
            let entry = match entry {
                Ok(entry) => entry,
                Err(_) => {
                    overview.skip(1);
                    continue;
                }
            };
            let path = entry.path();
            let metadata = match fs::symlink_metadata(&path) {
                Ok(metadata) if ordinary(&metadata) => metadata,
                _ => {
                    overview.skip(1);
                    continue;
                }
            };
            if metadata.is_dir() {
                if depth >= limits.depth {
                    overview.skip(1);
                    continue;
                }
                match fs::read_dir(&path) {
                    Ok(entries) => stack.push((entries, depth)),
                    Err(_) => overview.skip(1),
                }
            } else {
                let index = category.unwrap_or_else(|| {
                    category_for(path.strip_prefix(data).expect("entry is below scan root"))
                });
                let Some(total) = overview.total_bytes.checked_add(metadata.len()) else {
                    overview.skip(1);
                    continue;
                };
                overview.categories[index].bytes += metadata.len();
                overview.categories[index].files += 1;
                overview.total_bytes = total;
            }
        }
    }
    overview.scanned_utc = crate::util::now_utc();
    overview
}

impl Overview {
    fn skip(&mut self, entries: u64) {
        self.complete = false;
        self.skipped_entries += entries;
    }
}

fn ordinary(metadata: &fs::Metadata) -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        if metadata.file_attributes() & 0x400 != 0 {
            return false;
        }
    }
    !metadata.file_type().is_symlink() && (metadata.is_file() || metadata.is_dir())
}

fn category_for(relative: &Path) -> usize {
    let mut components = relative.iter();
    match components.next().and_then(|part| part.to_str()) {
        Some("photos") if components.next().is_some() => 1,
        Some("sessions") => {
            let _session = components.next();
            match components.next().and_then(|part| part.to_str()) {
                Some("recordings" | "analyses") if components.next().is_some() => 0,
                _ => 3,
            }
        }
        _ => 3,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn roots() -> (tempfile::TempDir, std::path::PathBuf, std::path::PathBuf) {
        let dir = tempfile::tempdir().unwrap();
        let data = dir.path().join("data");
        let backup = dir.path().join("control");
        fs::create_dir(&data).unwrap();
        fs::create_dir(&backup).unwrap();
        (dir, data, backup)
    }

    fn file(root: &Path, path: &str, bytes: u64) {
        let path = root.join(path);
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::File::create(path).unwrap().set_len(bytes).unwrap();
    }

    #[test]
    fn sizes_include_private_unknown_and_all_recovery_files_in_exact_categories() {
        let (_dir, data, backup) = roots();
        for (path, bytes) in [
            ("sessions/s/recordings/t/original.wav", 10),
            ("sessions/s/analyses/t.json", 20),
            ("photos/nested/p.jpg", 30),
            ("oauth.json", 40),
            ("private/unknown", 50),
            ("sessions/s/recordings-lookalike/other", 60),
        ] {
            file(&data, path, bytes);
        }
        for (path, bytes) in [
            ("backup.zip", 70),
            ("stage-a/private/a", 80),
            ("previous-b/sessions/s/recordings/t.wav", 90),
            ("transition.lock", 0),
        ] {
            file(&backup, path, bytes);
        }
        let result = scan(&data, &backup);
        assert!(result.complete);
        assert_eq!(result.total_bytes, 450);
        assert_eq!(
            result.categories.each_ref().map(|c| (c.bytes, c.files)),
            [(30, 2), (30, 1), (240, 4), (150, 3)]
        );
        assert_eq!(
            result.total_bytes,
            result.categories.iter().map(|c| c.bytes).sum::<u64>()
        );
    }

    #[test]
    fn empty_roots_are_complete_and_large_lengths_are_not_truncated() {
        let (_dir, data, backup) = roots();
        let empty = scan(&data, &backup);
        assert!(empty.complete);
        assert_eq!(empty.total_bytes, 0);
        file(&data, "large", 5 * 1024 * 1024 * 1024);
        assert_eq!(scan(&data, &backup).total_bytes, 5 * 1024 * 1024 * 1024);
    }

    #[test]
    fn missing_roots_and_each_budget_return_honest_partial_totals() {
        let (_dir, data, backup) = roots();
        file(&data, "deep/a/b/file", 10);
        for limits in [
            Limits {
                entries: 0,
                depth: 64,
                time: Duration::from_secs(5),
            },
            Limits {
                entries: 100,
                depth: 1,
                time: Duration::from_secs(5),
            },
            Limits {
                entries: 100,
                depth: 64,
                time: Duration::ZERO,
            },
        ] {
            let result = scan_with_limits(&data, &backup, limits);
            assert!(!result.complete);
            assert!(result.skipped_entries > 0);
            assert_eq!(result.total_bytes, 0);
        }
        fs::remove_dir(&backup).unwrap();
        let result = scan(&data, &backup);
        assert!(!result.complete);
        assert_eq!(result.skipped_entries, 1);
        assert_eq!(result.total_bytes, 10);
    }

    #[cfg(any(unix, windows))]
    #[test]
    fn linked_roots_outside_directories_and_cycles_are_skipped() {
        let (dir, data, backup) = roots();
        let outside = dir.path().join("outside");
        file(&outside, "private", 999);
        file(&data, "local", 7);
        let linked = data.join("linked");
        let cycle = data.join("cycle");
        for (link, destination) in [(&linked, &outside), (&cycle, &data)] {
            #[cfg(unix)]
            std::os::unix::fs::symlink(destination, link).unwrap();
            #[cfg(windows)]
            {
                // Junctions need no developer-mode or administrator symlink privilege.
                let output = std::process::Command::new("cmd")
                    .args(["/C", "mklink", "/J"])
                    .arg(link)
                    .arg(destination)
                    .output()
                    .unwrap();
                assert!(
                    output.status.success(),
                    "{}",
                    String::from_utf8_lossy(&output.stderr)
                );
            }
        }
        let result = scan(&data, &backup);
        assert!(!result.complete);
        assert_eq!(result.skipped_entries, 2);
        assert_eq!(result.total_bytes, 7);
        assert_eq!(scan(&linked, &backup).total_bytes, 0);
        #[cfg(windows)]
        {
            fs::remove_dir(linked).unwrap();
            fs::remove_dir(cycle).unwrap();
        }
    }

    #[cfg(unix)]
    #[test]
    fn special_entries_are_skipped_without_opening_them() {
        let (_dir, data, backup) = roots();
        let _socket = std::os::unix::net::UnixListener::bind(data.join("socket")).unwrap();
        let result = scan(&data, &backup);
        assert!(!result.complete);
        assert_eq!(result.skipped_entries, 1);
        assert_eq!(result.total_bytes, 0);
    }
}
