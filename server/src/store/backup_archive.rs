//! Portable practice-data archives, validated before they can replace live data.

use anyhow::{Context, Result, bail, ensure};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};
use std::fs::{self, File, OpenOptions};
use std::io::{BufRead, BufReader, Read, Seek, SeekFrom, Write};
use std::path::Path;

/// Maximum compressed archive or individual expanded file size.
pub const MAX_ARCHIVE_BYTES: u64 = 2 << 30;
/// Maximum total expanded practice data size.
pub const MAX_EXPANDED_BYTES: u64 = 8 << 30;
/// Maximum number of practice files (excluding the manifest).
pub const MAX_FILES: usize = 100_000;
const MAX_JSON_BYTES: u64 = 32 << 20;
const MANIFEST: &str = "_lilt-backup.json";
const ROOTS: &[&str] = &[
    "profile.json",
    "deletions.jsonl",
    "sessions",
    "exercises",
    "plans",
    "jobs",
    "photos",
    "cards",
    "courses",
    "syllabus",
];

/// Counts describe practice files only, excluding archive metadata and local credentials.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Summary {
    pub created_utc: String,
    pub files: u64,
    pub bytes: u64,
    pub recordings: u64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Entry {
    path: String,
    bytes: u64,
    sha256: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Manifest {
    schema: String,
    #[serde(flatten)]
    summary: Summary,
    entries: Vec<Entry>,
}

fn component(name: &str) -> Result<()> {
    ensure!(
        !name.is_empty() && name.len() <= 255,
        "invalid path component"
    );
    ensure!(
        name != "." && name != ".." && !name.ends_with([' ', '.']),
        "ambiguous path component"
    );
    ensure!(
        !name
            .chars()
            .any(|c| c.is_control() || "\\/:*?\"<>|~".contains(c)),
        "unsafe path character"
    );
    let lower = name.to_lowercase();
    ensure!(
        !matches!(
            lower.as_str(),
            ".private" | ".tmp" | "oauth.json" | "agents.json"
        ) && !lower.ends_with(".tmp"),
        "private or temporary path"
    );
    let device = lower.split('.').next().unwrap_or_default().trim_end();
    ensure!(
        !matches!(
            device,
            "con" | "prn" | "aux" | "nul" | "clock$" | "conin$" | "conout$"
        ) && !(device.starts_with("com") || device.starts_with("lpt"))
            .then(|| &device[3..])
            .is_some_and(|n| matches!(
                n,
                "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "¹" | "²" | "³"
            )),
        "reserved Windows path"
    );
    Ok(())
}

fn safe_path(name: &str) -> Result<()> {
    ensure!(name.len() <= 1024, "path is too long");
    let parts: Vec<_> = name.split('/').collect();
    ensure!(
        parts.len() <= 32 && ROOTS.contains(&parts[0]),
        "unknown practice-data root"
    );
    for part in parts {
        component(part)?;
    }
    Ok(())
}

fn id(value: &str) -> Result<()> {
    super::check_id(value)?;
    component(value)
}

fn ordinary(metadata: &fs::Metadata) -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::fs::MetadataExt;
        // Junctions and other reparse points must not be followed either.
        if metadata.file_attributes() & 0x400 != 0 {
            return false;
        }
    }
    !metadata.file_type().is_symlink() && (metadata.is_file() || metadata.is_dir())
}

fn collect(root: &Path) -> Result<Vec<String>> {
    ensure!(
        ordinary(&fs::symlink_metadata(root)?) && root.is_dir(),
        "unsafe data root"
    );
    let mut files = Vec::new();
    let mut names = BTreeMap::new();
    for name in ROOTS {
        let path = root.join(name);
        match fs::symlink_metadata(&path) {
            Ok(metadata) => {
                ensure!(
                    metadata.is_file() == name.contains('.'),
                    "invalid practice-data root type"
                );
                walk(root, name, &mut files, &mut names)?;
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
            Err(error) => return Err(error.into()),
        }
    }
    files.sort();
    Ok(files)
}

fn register(name: &str, names: &mut BTreeMap<String, String>) -> Result<()> {
    let mut prefix = String::new();
    for part in name.split('/') {
        if !prefix.is_empty() {
            prefix.push('/');
        }
        prefix.push_str(part);
        if let Some(previous) = names.insert(case_key(&prefix), prefix.clone()) {
            ensure!(previous == prefix, "case-colliding paths");
        }
    }
    Ok(())
}

fn case_key(name: &str) -> String {
    // Include Unicode aliases such as long s (ſ), which Windows can compare as S.
    name.to_lowercase().to_uppercase()
}

fn walk(
    root: &Path,
    name: &str,
    files: &mut Vec<String>,
    names: &mut BTreeMap<String, String>,
) -> Result<()> {
    safe_path(name)?;
    register(name, names)?;
    let metadata = fs::symlink_metadata(root.join(name))?;
    ensure!(ordinary(&metadata), "linked or special source file");
    if metadata.is_dir() {
        for entry in fs::read_dir(root.join(name))? {
            let entry = entry?;
            let child = entry
                .file_name()
                .into_string()
                .map_err(|_| anyhow::anyhow!("non-UTF-8 filename"))?;
            if child == ".tmp" || child.ends_with(".tmp") {
                continue;
            }
            walk(root, &format!("{name}/{child}"), files, names)?;
        }
    } else {
        ensure!(
            metadata.len() <= MAX_ARCHIVE_BYTES,
            "practice file is too large"
        );
        ensure!(files.len() < MAX_FILES, "too many practice files");
        files.push(name.to_owned());
    }
    Ok(())
}

struct LimitedFile(File);
impl Write for LimitedFile {
    fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
        let position = self.0.stream_position()?;
        if position.saturating_add(bytes.len() as u64) > MAX_ARCHIVE_BYTES {
            return Err(std::io::Error::other("backup exceeds 2 GiB"));
        }
        self.0.write(bytes)
    }
    fn flush(&mut self) -> std::io::Result<()> {
        self.0.flush()
    }
}
impl Seek for LimitedFile {
    fn seek(&mut self, position: SeekFrom) -> std::io::Result<u64> {
        self.0.seek(position)
    }
}

fn copy_hash(reader: &mut impl Read, writer: &mut impl Write, limit: u64) -> Result<(u64, String)> {
    let mut bytes = 0;
    let mut hash = Sha256::new();
    let mut buffer = [0; 65_536];
    loop {
        let count = reader.read(&mut buffer)?;
        if count == 0 {
            break;
        }
        bytes += count as u64;
        ensure!(bytes <= limit, "expanded file exceeds its limit");
        hash.update(&buffer[..count]);
        writer.write_all(&buffer[..count])?;
    }
    Ok((bytes, hex::encode(hash.finalize())))
}

/// Create a consistent portable archive while the caller holds exclusive data admission.
///
/// Fails on unsafe source records, unreadable files or limits. `out` must not exist.
pub fn create(root: &Path, out: &Path) -> Result<Summary> {
    validate(root)?;
    let files = collect(root)?;
    ensure!(!out.try_exists()?, "backup destination already exists");
    let parent = out.parent().context("backup destination has no parent")?;
    let temp = parent.join(format!(".backup-{}.tmp", uuid::Uuid::new_v4().simple()));
    let result = (|| {
        let file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp)?;
        let mut zip = zip::ZipWriter::new(LimitedFile(file));
        let options = zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated);
        let mut manifest = Manifest {
            schema: "lilt.backup/1".into(),
            summary: Summary {
                created_utc: crate::util::now_utc(),
                files: files.len() as u64,
                bytes: 0,
                recordings: 0,
            },
            entries: Vec::with_capacity(files.len()),
        };
        for path in files {
            zip.start_file(&path, options)?;
            let (bytes, sha256) = copy_hash(
                &mut File::open(root.join(&path))?,
                &mut zip,
                MAX_ARCHIVE_BYTES.min(MAX_EXPANDED_BYTES - manifest.summary.bytes),
            )?;
            manifest.summary.bytes += bytes;
            if path.ends_with("/take.json") && path.starts_with("sessions/") {
                manifest.summary.recordings += 1;
            }
            manifest.entries.push(Entry {
                path,
                bytes,
                sha256,
            });
        }
        let encoded = serde_json::to_vec(&manifest)?;
        ensure!(
            encoded.len() as u64 <= MAX_JSON_BYTES,
            "backup manifest is too large"
        );
        zip.start_file(MANIFEST, options)?;
        zip.write_all(&encoded)?;
        zip.finish()?.0.sync_all()?;
        fs::rename(&temp, out)?;
        super::fsync_dir(parent);
        Ok(manifest.summary)
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temp);
    }
    result
}

// Bound allocation before ZipArchive parses its central directory. ZIP64 is needed above 65535 files.
fn preflight(file: &mut File) -> Result<usize> {
    let length = file.metadata()?.len();
    ensure!(
        (22..=MAX_ARCHIVE_BYTES).contains(&length),
        "invalid archive size"
    );
    let tail_len = length.min(65_557) as usize;
    file.seek(SeekFrom::End(-(tail_len as i64)))?;
    let mut tail = vec![0; tail_len];
    file.read_exact(&mut tail)?;
    let offset = (0..=tail_len - 22)
        .rev()
        .find(|&i| {
            tail[i..i + 4] == *b"PK\x05\x06"
                && i + 22 + u16::from_le_bytes([tail[i + 20], tail[i + 21]]) as usize == tail_len
        })
        .context("missing ZIP directory")?;
    let eocd = &tail[offset..];
    let u16at = |i| u16::from_le_bytes([eocd[i], eocd[i + 1]]);
    ensure!(
        u16at(4) == 0 && u16at(6) == 0 && u16at(8) == u16at(10),
        "multi-disk ZIP is unsupported"
    );
    let mut count = u16at(10) as u64;
    let mut size = u32::from_le_bytes(eocd[12..16].try_into()?) as u64;
    let mut directory = u32::from_le_bytes(eocd[16..20].try_into()?) as u64;
    let end = length - tail_len as u64 + offset as u64;
    let mut locator = [0; 20];
    if end >= 20 {
        file.seek(SeekFrom::Start(end - 20))?;
        file.read_exact(&mut locator)?;
    }
    if &locator[..4] == b"PK\x06\x07"
        || count == 65535
        || size == u32::MAX as u64
        || directory == u32::MAX as u64
    {
        ensure!(
            &locator[..4] == b"PK\x06\x07"
                && locator[4..8] == [0; 4]
                && locator[16..20] == [1, 0, 0, 0],
            "invalid ZIP64 locator"
        );
        let position = u64::from_le_bytes(locator[8..16].try_into()?);
        ensure!(position < end - 20, "invalid ZIP64 position");
        file.seek(SeekFrom::Start(position))?;
        let mut header = [0; 56];
        file.read_exact(&mut header)?;
        ensure!(
            &header[..4] == b"PK\x06\x06" && header[16..24] == [0; 8],
            "invalid ZIP64 directory"
        );
        count = u64::from_le_bytes(header[32..40].try_into()?);
        ensure!(
            u64::from_le_bytes(header[24..32].try_into()?) == count,
            "multi-disk ZIP64 is unsupported"
        );
        size = u64::from_le_bytes(header[40..48].try_into()?);
        directory = u64::from_le_bytes(header[48..56].try_into()?);
    }
    ensure!(
        count <= MAX_FILES as u64 + 1 && size <= 64 << 20,
        "archive directory exceeds limits"
    );
    let directory_end = directory
        .checked_add(size)
        .context("directory size overflow")?;
    ensure!(directory_end <= end, "directory outside archive");
    file.seek(SeekFrom::Start(directory))?;
    for _ in 0..count {
        ensure!(
            file.stream_position()?.saturating_add(46) <= directory_end,
            "truncated directory"
        );
        let mut header = [0; 46];
        file.read_exact(&mut header)?;
        ensure!(
            &header[..4] == b"PK\x01\x02",
            "invalid central directory entry"
        );
        let extra = [28, 30, 32]
            .into_iter()
            .map(|i| u16::from_le_bytes([header[i], header[i + 1]]) as u64)
            .sum::<u64>();
        ensure!(
            file.stream_position()?.saturating_add(extra) <= directory_end,
            "directory entry exceeds bounds"
        );
        file.seek(SeekFrom::Current(extra as i64))?;
    }
    ensure!(
        file.stream_position()? == directory_end,
        "directory count mismatch"
    );
    file.seek(SeekFrom::Start(0))?;
    Ok(count as usize)
}

/// Validate and extract an archive into a new, isolated stage directory.
///
/// Fails closed on invalid archives, removing the stage on failure. Never reuses an existing stage.
pub fn unpack(archive: &Path, stage: &Path) -> Result<Summary> {
    fs::create_dir(stage).context("restore stage must be new")?;
    let result = unpack_new(archive, stage);
    if result.is_err() {
        let _ = fs::remove_dir_all(stage);
    }
    result
}

fn unpack_new(archive: &Path, stage: &Path) -> Result<Summary> {
    let mut file = File::open(archive)?;
    let count = preflight(&mut file)?;
    let mut zip = zip::ZipArchive::with_config(
        zip::read::Config {
            archive_offset: zip::read::ArchiveOffset::Known(0),
        },
        file,
    )?;
    ensure!(
        zip.len() == count && zip.len() <= MAX_FILES + 1,
        "duplicate entries or too many archive entries"
    );
    let mut seen = BTreeSet::new();
    let mut names = BTreeMap::new();
    let mut observed = BTreeMap::new();
    let mut manifest = None;
    let mut total = 0;
    let mut recordings = 0;
    for index in 0..zip.len() {
        let mut entry = zip.by_index(index)?;
        let name = entry.name()?.into_owned();
        ensure!(
            !entry.encrypted() && !entry.is_symlink() && !entry.is_dir(),
            "encrypted, linked or directory entry"
        );
        if let Some(mode) = entry.unix_mode() {
            ensure!(matches!(mode & 0o170000, 0 | 0o100000), "special ZIP entry");
        }
        ensure!(seen.insert(case_key(&name)), "duplicate archive entry");
        ensure!(
            entry.size() <= MAX_ARCHIVE_BYTES,
            "expanded file exceeds limit"
        );
        if name == MANIFEST {
            ensure!(entry.size() <= MAX_JSON_BYTES, "manifest exceeds limit");
            let mut bytes = Vec::new();
            let declared = entry.size();
            let (size, _) = copy_hash(&mut entry, &mut bytes, declared)?;
            ensure!(size == declared, "manifest size mismatch");
            manifest = Some(serde_json::from_slice::<Manifest>(&bytes)?);
        } else {
            safe_path(&name)?;
            register(&name, &mut names)?;
            ensure!(
                entry.size() <= MAX_EXPANDED_BYTES - total,
                "expanded archive exceeds limit"
            );
            let path = stage.join(&name);
            let parent = path.parent().context("missing file parent")?;
            fs::create_dir_all(parent)?;
            let temp = parent.join(format!(".unpack-{}.tmp", uuid::Uuid::new_v4().simple()));
            let mut output = OpenOptions::new()
                .create_new(true)
                .write(true)
                .open(&temp)?;
            let declared = entry.size();
            let (bytes, hash) = copy_hash(&mut entry, &mut output, declared)?;
            ensure!(bytes == declared, "entry size mismatch");
            output.sync_all()?;
            drop(output);
            fs::rename(temp, &path)?;
            super::fsync_dir(parent);
            total += bytes;
            if name.ends_with("/take.json") && name.starts_with("sessions/") {
                recordings += 1;
            }
            observed.insert(name, (bytes, hash));
        }
    }
    let manifest = manifest.context("this is not a Lilt backup: manifest missing")?;
    ensure!(
        manifest.schema == "lilt.backup/1",
        "unsupported backup schema"
    );
    chrono::DateTime::parse_from_rfc3339(&manifest.summary.created_utc)
        .context("invalid backup date")?;
    ensure!(
        manifest.summary.files == observed.len() as u64
            && manifest.summary.bytes == total
            && manifest.summary.recordings == recordings
            && manifest.entries.len() == observed.len(),
        "backup counts do not match"
    );
    for entry in manifest.entries {
        let (bytes, hash) = observed
            .remove(&entry.path)
            .context("missing or repeated manifest file")?;
        ensure!(
            bytes == entry.bytes && hash == entry.sha256,
            "backup checksum mismatch"
        );
    }
    ensure!(observed.is_empty(), "unlisted backup files");
    validate(stage)?;
    Ok(manifest.summary)
}

fn json<T: DeserializeOwned>(path: &Path) -> Result<T> {
    ensure!(
        fs::metadata(path)?.len() <= MAX_JSON_BYTES,
        "record is too large"
    );
    super::read_json(path)
}

fn references(value: &Value) -> Result<()> {
    match value {
        Value::Object(fields) => {
            for (key, value) in fields {
                if matches!(
                    key.as_str(),
                    "session_id"
                        | "take_id"
                        | "run_id"
                        | "analysis_run"
                        | "review_id"
                        | "exercise_id"
                        | "chosen_exercise_id"
                        | "retry_of"
                        | "triggered_by_review"
                        | "comparison_take_id"
                        | "compare_with_take"
                ) && !value.is_null()
                {
                    id(value.as_str().context("invalid record reference")?)?;
                }
                if matches!(key.as_str(), "take_ids" | "preferred_take_ids") {
                    for value in value.as_array().context("invalid reference list")? {
                        id(value.as_str().context("invalid reference")?)?;
                    }
                }
                references(value)?;
            }
        }
        Value::Array(values) => {
            for value in values {
                references(value)?;
            }
        }
        _ => {}
    }
    Ok(())
}

fn validate_log(path: &Path) -> Result<()> {
    let mut reader = BufReader::new(File::open(path)?);
    loop {
        let mut bytes = Vec::new();
        let count = reader
            .by_ref()
            .take(MAX_JSON_BYTES + 1)
            .read_until(b'\n', &mut bytes)?;
        if count == 0 {
            break;
        }
        ensure!(count as u64 <= MAX_JSON_BYTES, "log record is too large");
        if !bytes.iter().all(u8::is_ascii_whitespace) {
            references(&serde_json::from_slice::<Value>(&bytes)?)?;
        }
    }
    Ok(())
}

/// Check restored records before any App loads them or follows their path-bearing references.
///
/// Fails on unsafe paths, malformed records, mismatched identities and missing original media.
pub fn validate(root: &Path) -> Result<()> {
    use crate::recordings::model::{Session, SessionKind, Take, TakeStatus};
    let files = collect(root)?;
    let mut takes = BTreeSet::new();
    for name in &files {
        let parts: Vec<_> = name.split('/').collect();
        let path = root.join(name);
        // Windows opens these records case-insensitively; every spelling must reach validation.
        let folded_name = case_key(name);
        if folded_name.ends_with(".JSON") {
            ensure!(name.ends_with(".json"), "noncanonical JSON record name");
            let value: Value = json(&path)?;
            references(&value).with_context(|| format!("unsafe references in {name}"))?;
            match parts.as_slice() {
                ["profile.json"] => {
                    let profile: crate::practice::model::Profile = serde_json::from_value(value)?;
                    ensure!(
                        profile.schema == "lilt.profile/1",
                        "unsupported profile schema"
                    );
                    profile
                        .timezone
                        .parse::<chrono_tz::Tz>()
                        .context("invalid profile timezone")?;
                }
                ["sessions", sid, "session.json"] => {
                    let session: Session = serde_json::from_value(value)?;
                    id(sid)?;
                    ensure!(
                        session.schema == "lilt.session/1" && session.id == *sid,
                        "session identity mismatch"
                    );
                    ensure!(
                        crate::courses::valid_id(&session.course),
                        "invalid session course"
                    );
                    if session.kind == SessionKind::CourseGuided {
                        ensure!(
                            session.course != crate::courses::DEFAULT,
                            "course guided session belongs to voice"
                        );
                        let task = session
                            .task
                            .context("course guided session has no saved task")?;
                        let (course, chapter, text) =
                            crate::courses::parse_text_id(&task.prompt_id)
                                .context("saved task does not name a course text")?;
                        ensure!(
                            course == session.course
                                && !chapter.is_empty()
                                && !text.is_empty()
                                && crate::courses::text_id(course, chapter, text) == task.prompt_id,
                            "saved task belongs to another course"
                        );
                    }
                }
                ["sessions", sid, "recordings", tid, "take.json"] => {
                    let take: Take = serde_json::from_value(value)?;
                    id(sid)?;
                    id(tid)?;
                    ensure!(takes.insert(take.id.clone()), "duplicate take id");
                    ensure!(
                        take.schema == "lilt.take/1" && take.id == *tid && take.session_id == *sid,
                        "take identity mismatch"
                    );
                    ensure!(
                        root.join(format!("sessions/{sid}/session.json")).is_file(),
                        "take session missing"
                    );
                    let session: Session =
                        json(&root.join(format!("sessions/{sid}/session.json")))?;
                    ensure!(
                        take.course == session.course,
                        "take course does not match its session"
                    );
                    if session.kind == SessionKind::CourseGuided {
                        ensure!(
                            session
                                .task
                                .as_ref()
                                .is_some_and(|task| task.prompt_id == take.prompt_id),
                            "take does not match its saved guided task"
                        );
                    }
                    ensure!(
                        take.ext == crate::recordings::ext_for_mime(&take.mime),
                        "invalid audio extension"
                    );
                    ensure!(
                        take.original.is_some()
                            || matches!(take.status, TakeStatus::Recording | TakeStatus::Saving),
                        "saved take has no original audio"
                    );
                    if let Some(original) = take.original {
                        ensure!(
                            original.file == format!("original.{}", take.ext),
                            "unsafe original audio path"
                        );
                        let audio = path
                            .parent()
                            .context("take parent missing")?
                            .join(&original.file);
                        ensure!(
                            fs::metadata(&audio)?.len() == original.bytes
                                && super::sha256_file(&audio)? == original.sha256,
                            "original audio checksum mismatch"
                        );
                    }
                }
                ["jobs", filename] => {
                    let job: crate::analysis::Job = serde_json::from_value(value)?;
                    id(&job.id)?;
                    ensure!(
                        job.schema == "lilt.job/1"
                            && *filename == format!("{}.json", job.id)
                            && job.id == format!("analyze-{}", job.take_id),
                        "job identity mismatch"
                    );
                    ensure!(
                        matches!(job.kind.as_str(), "analyze" | "remeasure")
                            && matches!(
                                job.status.as_str(),
                                "pending" | "running" | "done" | "failed"
                            ),
                        "invalid analysis job"
                    );
                    let prefix = format!("run-{}-a", job.take_id);
                    ensure!(
                        job.run_id
                            .strip_prefix(&prefix)
                            .and_then(|version| version.parse::<u32>().ok())
                            .is_some_and(|version| version > 0),
                        "job run does not belong to its take"
                    );
                    ensure!(
                        root.join(format!(
                            "sessions/{}/recordings/{}/take.json",
                            job.session_id, job.take_id
                        ))
                        .is_file(),
                        "job take missing"
                    );
                }
                ["photos", "photos.json"] => {
                    let photos: crate::photos::Index = serde_json::from_value(value)?;
                    let mut ids = BTreeSet::new();
                    for photo in photos.uploaded {
                        id(&photo.id)?;
                        component(&photo.file)?;
                        ensure!(ids.insert(photo.id.clone()), "duplicate photo id");
                        let extension = match photo.mime.as_str() {
                            "image/jpeg" => "jpg",
                            "image/png" => "png",
                            "image/webp" => "webp",
                            "image/gif" => "gif",
                            _ => bail!("invalid photo type"),
                        };
                        ensure!(
                            photo.file == format!("{}.{}", photo.id, extension)
                                && root.join("photos").join(photo.file).is_file(),
                            "invalid photo file"
                        );
                    }
                }
                ["exercises", exercise_id, filename] => {
                    let exercise: crate::practice::exercises::Exercise =
                        serde_json::from_value(value)?;
                    id(&exercise.id)?;
                    ensure!(
                        exercise.id == *exercise_id
                            && *filename == format!("v{}.json", exercise.version),
                        "exercise identity mismatch"
                    );
                }
                ["plans", "current.json"] | ["plans", "history", _] => {
                    let plan: crate::practice::model::Plan = serde_json::from_value(value)?;
                    ensure!(plan.schema == "lilt.plan/1", "unsupported plan schema");
                }
                ["sessions", sid, "reviews", filename] => {
                    let review: crate::coach::model::Review = serde_json::from_value(value)?;
                    id(&review.id)?;
                    ensure!(
                        review.schema == "lilt.review/1"
                            && review.session_id == *sid
                            && *filename == format!("{}.json", review.id),
                        "review identity mismatch"
                    );
                }
                ["sessions", sid, "analyses", filename] => {
                    let run = value["run_id"].as_str().context("analysis run missing")?;
                    ensure!(
                        value["session_id"] == *sid && *filename == format!("{run}.json"),
                        "analysis identity mismatch"
                    );
                }
                ["cards", "state.json"] => {
                    let _: BTreeMap<String, crate::practice::cards::CardState> =
                        serde_json::from_value(value)?;
                }
                ["cards", course, "state.json"] => {
                    ensure!(
                        crate::courses::valid_id(course) && *course != crate::courses::DEFAULT,
                        "invalid card course"
                    );
                    let states: BTreeMap<String, crate::practice::cards::CardState> =
                        serde_json::from_value(value)?;
                    ensure!(
                        states.keys().all(|id| crate::courses::parse_text_id(id)
                            .is_some_and(|(owner, _, _)| owner == *course)),
                        "card belongs to another course"
                    );
                }
                ["courses" | "syllabus", ..] => {}
                _ => bail!("unrecognized practice record {name}"),
            }
        } else if folded_name.ends_with(".JSONL") {
            ensure!(name.ends_with(".jsonl"), "noncanonical JSONL record name");
            match parts.as_slice() {
                ["deletions.jsonl"] | ["cards", "reviews.jsonl"] | ["courses" | "syllabus", ..] => {
                }
                ["cards", course, "reviews.jsonl"] => {
                    ensure!(
                        crate::courses::valid_id(course) && *course != crate::courses::DEFAULT,
                        "invalid card course"
                    );
                }
                ["sessions", sid, "reviews", filename] => {
                    id(sid)?;
                    id(filename
                        .strip_suffix(".responses.jsonl")
                        .context("unrecognized review log")?)?;
                }
                _ => bail!("unrecognized practice log {name}"),
            }
            validate_log(&path)?;
        }
    }
    Ok(())
}

#[cfg(test)]
#[path = "backup_archive_tests.rs"]
mod tests;
