use super::*;
use crate::{store, test_support};

#[test]
fn practice_data_round_trips_without_credentials() {
    let (_data, app) = test_support::app();
    let session = test_support::session(&app);
    let take = test_support::new_take(&app, &session.id, test_support::T::default(), "audio/wav");
    let photo = crate::photos::add(&app, "A plant", &[0x89, b'P', b'N', b'G', 1]).unwrap();
    for name in [".private/key", "oauth.json", "agents.json", ".tmp/scratch"] {
        store::write_atomic(&app.paths.root.join(name), b"private").unwrap();
    }
    let scratch = tempfile::tempdir().unwrap();
    let archive = scratch.path().join("backup.zip");
    let saved = create(&app.paths.root, &archive).unwrap();
    assert_eq!(saved.recordings, 1);
    let stage = scratch.path().join("stage");
    let restored = unpack(&archive, &stage).unwrap();
    assert_eq!(saved.files, restored.files);
    assert!(
        stage
            .join(format!(
                "sessions/{}/recordings/{take}/take.json",
                session.id
            ))
            .exists()
    );
    assert!(stage.join("photos").join(photo.file).exists());
    for name in [
        ".private",
        "oauth.json",
        "agents.json",
        ".tmp",
        "_lilt-backup.json",
    ] {
        assert!(!stage.join(name).exists(), "excluded {name}");
    }
    assert!(unpack(&archive, &stage).is_err(), "never reuse a stage");
}

#[test]
fn paths_reject_windows_aliases_and_traversal_on_every_platform() {
    for name in [
        "../profile.json",
        "/profile.json",
        "C:/profile.json",
        "photos\\x",
        "photos/x:secret",
        "photos/NUL.png",
        "photos/COM1",
        "photos/com¹.txt",
        "photos/a.",
        "photos/a ",
        "photos//a",
        "photos/./a",
        "photos/a\0b",
        "photos/.private/key",
        "oauth.json",
        "unknown/x",
    ] {
        assert!(safe_path(name).is_err(), "accepted {name:?}");
    }
    for name in [
        "profile.json",
        "courses/voice/.history/0001/.base/index.md",
        "photos/café.png",
    ] {
        assert!(safe_path(name).is_ok(), "rejected {name}");
    }
}

#[test]
fn source_records_cannot_redirect_restored_audio() {
    let (_data, app) = test_support::app();
    let session = test_support::session(&app);
    let id = test_support::new_take(&app, &session.id, test_support::T::default(), "audio/wav");
    let path = app.paths.take_dir(&session.id, &id).join("take.json");
    let mut value: serde_json::Value = store::read_json(&path).unwrap();
    value["original"] = serde_json::json!({"file":"../../../../oauth.json", "bytes":0, "sha256":"", "chunk_count":0});
    store::write_json(&path, &value).unwrap();
    assert!(validate(&app.paths.root).is_err());
}

#[test]
fn course_audio_and_task_round_trip_and_cross_course_restores_are_rejected() {
    use crate::recordings::{self, model::*};
    let (_data, app) = test_support::app();
    let mut session = test_support::session(&app);
    session.course = "reading".into();
    session.kind = SessionKind::CourseGuided;
    session.task = Some(CourseTask {
        prompt_id: "reading/text.chapter.first".into(),
        title: "Read aloud".into(),
        text: "A saved passage.".into(),
        hint: "Take your time.".into(),
    });
    session.exercise_id = None;
    session.exercise_version = None;
    app.save_session(&session).unwrap();
    let take = recordings::create_take(&app, serde_json::from_value(serde_json::json!({
        "take_id": "course-take", "session_id": session.id, "role": "free",
        "prompt_id": "reading/text.chapter.first", "prompt_text": "A saved passage.", "mime": "audio/webm"
    })).unwrap()).unwrap();
    let audio = b"untouched course audio";
    recordings::put_chunk(&app, &take.id, 0, audio, None).unwrap();
    recordings::finalize(
        &app,
        &take.id,
        recordings::FinalizeReq {
            chunk_count: 1,
            interrupted: false,
        },
    )
    .unwrap();
    let scratch = tempfile::tempdir().unwrap();
    let archive = scratch.path().join("course.zip");
    create(&app.paths.root, &archive).unwrap();
    let stage = scratch.path().join("stage");
    unpack(&archive, &stage).unwrap();
    let session_name = format!("sessions/{}/session.json", session.id);
    let take_name = format!("sessions/{}/recordings/{}/take.json", session.id, take.id);
    let audio_name = format!(
        "sessions/{}/recordings/{}/original.webm",
        session.id, take.id
    );
    let restored: Session = json(&stage.join(&session_name)).unwrap();
    assert_eq!(restored.course, "reading");
    assert_eq!(restored.task.unwrap().text, "A saved passage.");
    let restored: Take = json(&stage.join(&take_name)).unwrap();
    assert_eq!(restored.status, TakeStatus::Saved);
    assert_eq!(restored.course, "reading");
    assert_eq!(fs::read(stage.join(&audio_name)).unwrap(), audio);
    assert!(crate::analysis::jobs(&app).is_empty());

    let saved_session: Value = json(&stage.join(&session_name)).unwrap();
    let saved_take: Value = json(&stage.join(&take_name)).unwrap();
    for case in 0..5 {
        let mut session = saved_session.clone();
        let mut take = saved_take.clone();
        match case {
            0 => take["course"] = serde_json::json!("voice"),
            1 => session["course"] = serde_json::json!("../reading"),
            2 => session["task"]["prompt_id"] = serde_json::json!("language/text.chapter.first"),
            3 => session["task"] = Value::Null,
            _ => take["prompt_id"] = serde_json::json!("reading/text.chapter.second"),
        }
        let session_bytes = serde_json::to_vec(&session).unwrap();
        let take_bytes = serde_json::to_vec(&take).unwrap();
        let archive = scratch.path().join(format!("bad-{case}.zip"));
        crafted(
            &archive,
            &[
                (&session_name, &session_bytes),
                (&take_name, &take_bytes),
                (&audio_name, audio),
            ],
            |manifest| manifest.summary.recordings = 1,
        );
        let rejected_stage = scratch.path().join(format!("bad-stage-{case}"));
        assert!(
            unpack(&archive, &rejected_stage).is_err(),
            "accepted course mismatch {case}"
        );
        assert!(!rejected_stage.exists());
    }
}

fn crafted(path: &Path, entries: &[(&str, &[u8])], edit: impl FnOnce(&mut Manifest)) {
    let mut manifest = Manifest {
        schema: "lilt.backup/1".into(),
        summary: Summary {
            created_utc: crate::util::now_utc(),
            files: entries.len() as u64,
            bytes: entries.iter().map(|(_, bytes)| bytes.len() as u64).sum(),
            recordings: 0,
        },
        entries: entries
            .iter()
            .map(|(path, bytes)| Entry {
                path: (*path).into(),
                bytes: bytes.len() as u64,
                sha256: store::sha256_hex(bytes),
            })
            .collect(),
    };
    edit(&mut manifest);
    let mut zip = zip::ZipWriter::new(File::create(path).unwrap());
    let options = zip::write::SimpleFileOptions::default();
    for (name, bytes) in entries {
        zip.start_file(*name, options).unwrap();
        zip.write_all(bytes).unwrap();
    }
    zip.start_file(MANIFEST, options).unwrap();
    zip.write_all(&serde_json::to_vec(&manifest).unwrap())
        .unwrap();
    zip.finish().unwrap();
}

#[test]
fn archives_reject_hostile_paths_and_remove_failed_stages() {
    let temp = tempfile::tempdir().unwrap();
    for (i, name) in [
        "../escape",
        "C:/escape",
        "courses/voice/../escape",
        "photos/NUL.png",
        "photos/a:stream",
        "photos/a\\b",
        "oauth.json",
        ".private/key",
        "unknown/file",
        "courses/voice/a~1.md",
    ]
    .iter()
    .enumerate()
    {
        let archive = temp.path().join(format!("{i}.zip"));
        let stage = temp.path().join(format!("stage{i}"));
        crafted(&archive, &[(name, b"abc")], |_| {});
        assert!(unpack(&archive, &stage).is_err(), "accepted {name}");
        assert!(!stage.exists(), "left rejected stage {name}");
    }
}

#[test]
fn checksums_schema_and_counts_are_enforced() {
    let temp = tempfile::tempdir().unwrap();
    for i in 0..5 {
        let archive = temp.path().join(format!("{i}.zip"));
        let stage = temp.path().join(format!("stage{i}"));
        crafted(
            &archive,
            &[("courses/voice/note.md", b"abc")],
            |m| match i {
                0 => m.schema = "lilt.backup/2".into(),
                1 => m.entries[0].sha256 = "0".repeat(64),
                2 => m.summary.files += 1,
                3 => m.summary.bytes += 1,
                _ => m.entries[0].path = "courses/voice/missing.md".into(),
            },
        );
        assert!(
            unpack(&archive, &stage).is_err(),
            "accepted malformed manifest {i}"
        );
    }
}

#[test]
fn legacy_exports_case_aliases_symlinks_and_encryption_are_rejected() {
    let temp = tempfile::tempdir().unwrap();
    let archive = temp.path().join("archive.zip");
    let stage = temp.path().join("stage");
    let mut zip = zip::ZipWriter::new(File::create(&archive).unwrap());
    zip.start_file(
        "courses/voice/note.md",
        zip::write::SimpleFileOptions::default(),
    )
    .unwrap();
    zip.write_all(b"abc").unwrap();
    zip.finish().unwrap();
    assert!(unpack(&archive, &stage).is_err());
    crafted(
        &archive,
        &[
            ("courses/Voice/a.md", b"abc"),
            ("courses/voice/b.md", b"def"),
        ],
        |_| {},
    );
    assert!(unpack(&archive, &stage).is_err());
    let mut zip = zip::ZipWriter::new(File::create(&archive).unwrap());
    zip.add_symlink(
        "courses/voice/link",
        "../../outside",
        zip::write::SimpleFileOptions::default(),
    )
    .unwrap();
    zip.finish().unwrap();
    assert!(unpack(&archive, &stage).is_err());
    crafted(&archive, &[("courses/voice/note.md", b"abc")], |_| {});
    let mut bytes = fs::read(&archive).unwrap();
    bytes[6] |= 1;
    let central = bytes.windows(4).position(|s| s == b"PK\x01\x02").unwrap();
    bytes[central + 8] |= 1;
    fs::write(&archive, bytes).unwrap();
    assert!(unpack(&archive, &stage).is_err());
}

#[test]
fn forged_sizes_and_duplicate_names_are_rejected_before_expansion() {
    let temp = tempfile::tempdir().unwrap();
    let archive = temp.path().join("archive.zip");
    let stage = temp.path().join("stage");
    crafted(&archive, &[("courses/voice/a.md", b"abc")], |_| {});
    let mut bytes = fs::read(&archive).unwrap();
    let central = bytes.windows(4).position(|s| s == b"PK\x01\x02").unwrap();
    bytes[central + 24..central + 28]
        .copy_from_slice(&((MAX_ARCHIVE_BYTES + 1) as u32).to_le_bytes());
    fs::write(&archive, bytes).unwrap();
    assert!(unpack(&archive, &stage).is_err());
    crafted(
        &archive,
        &[
            ("courses/voice/a.md", b"abc"),
            ("courses/voice/b.md", b"def"),
        ],
        |_| {},
    );
    let mut bytes = fs::read(&archive).unwrap();
    let from = b"courses/voice/b.md";
    for index in 0..=bytes.len() - from.len() {
        if &bytes[index..index + from.len()] == from {
            bytes[index + 14] = b'a';
        }
    }
    fs::write(&archive, bytes).unwrap();
    assert!(unpack(&archive, &stage).is_err());
}

#[test]
fn finalized_audio_and_jobs_round_trip_and_unsafe_jobs_do_not() {
    let (_data, app) = test_support::app();
    let session = test_support::session(&app);
    let tid = test_support::new_take(&app, &session.id, test_support::T::default(), "audio/wav");
    let audio = test_support::fixture("sine_220.wav");
    crate::recordings::put_chunk(&app, &tid, 0, &audio, None).unwrap();
    crate::recordings::finalize(
        &app,
        &tid,
        crate::recordings::FinalizeReq {
            chunk_count: 1,
            interrupted: false,
        },
    )
    .unwrap();
    let scratch = tempfile::tempdir().unwrap();
    let archive = scratch.path().join("backup.zip");
    create(&app.paths.root, &archive).unwrap();
    let stage = scratch.path().join("stage");
    unpack(&archive, &stage).unwrap();
    assert_eq!(
        fs::read(stage.join(format!(
            "sessions/{}/recordings/{tid}/original.wav",
            session.id
        )))
        .unwrap(),
        audio
    );
    let job_path = app.paths.jobs().join(format!("analyze-{tid}.json"));
    let mut job: crate::analysis::Job = store::read_json(&job_path).unwrap();
    job.run_id = "../../outside".into();
    store::write_json(&job_path, &job).unwrap();
    assert!(validate(&app.paths.root).is_err());
}

#[test]
fn photo_index_cannot_read_or_delete_outside_its_folder() {
    let (_data, app) = test_support::app();
    crate::photos::add(&app, "A plant", &[0x89, b'P', b'N', b'G', 1]).unwrap();
    let path = app.paths.root.join("photos/photos.json");
    let mut index: crate::photos::Index = store::read_json(&path).unwrap();
    index.uploaded[0].file = "../profile.json".into();
    store::write_json(&path, &index).unwrap();
    assert!(validate(&app.paths.root).is_err());
}

#[test]
fn case_variants_cannot_hide_path_bearing_records_from_validation() {
    let temp = tempfile::tempdir().unwrap();
    let archive = temp.path().join("archive.zip");
    let payload = br#"{"uploaded":[{"id":"photo","name":"photo","file":"../profile.json","mime":"image/png","added_utc":"2026-11-07T00:00:00Z"}],"original":{"file":"../../../../oauth.json"}}"#;
    for (index, name) in [
        "photos/PHOTOS.JSON",
        "photos/Photos.json",
        "photos/photos.Json",
        "photos/photos.jſon",
        "sessions/session/recordings/take/TAKE.JSON",
        "sessions/session/recordings/take/Take.json",
        "sessions/session/Recordings/take/take.JSON",
        "jobs/analyze-take.JSON",
        "cards/REVIEWS.JSONL",
        "cards/Reviews.jsonl",
        "cards/reviews.jſonl",
    ]
    .iter()
    .enumerate()
    {
        crafted(&archive, &[(name, payload)], |_| {});
        let stage = temp.path().join(format!("stage-{index}"));
        assert!(
            unpack(&archive, &stage).is_err(),
            "accepted noncanonical record {name}"
        );
        assert!(!stage.exists());
    }
}

#[test]
fn zip64_directory_is_bounded_before_the_zip_reader_allocates() {
    let temp = tempfile::tempdir().unwrap();
    let archive = temp.path().join("archive.zip");
    crafted(&archive, &[("courses/voice/a.md", b"abc")], |_| {});
    let mut bytes = fs::read(&archive).unwrap();
    let end = bytes.len() - 22;
    let old = bytes.split_off(end);
    let directory_size = u32::from_le_bytes(old[12..16].try_into().unwrap()) as u64;
    let directory_offset = u32::from_le_bytes(old[16..20].try_into().unwrap()) as u64;
    let mut record = Vec::new();
    record.extend_from_slice(b"PK\x06\x06");
    record.extend_from_slice(&44u64.to_le_bytes());
    record.extend_from_slice(&[45, 0, 45, 0]);
    record.extend_from_slice(&[0; 8]);
    record.extend_from_slice(&2u64.to_le_bytes());
    record.extend_from_slice(&2u64.to_le_bytes());
    record.extend_from_slice(&directory_size.to_le_bytes());
    record.extend_from_slice(&directory_offset.to_le_bytes());
    record.extend_from_slice(b"PK\x06\x07");
    record.extend_from_slice(&0u32.to_le_bytes());
    record.extend_from_slice(&(end as u64).to_le_bytes());
    record.extend_from_slice(&1u32.to_le_bytes());
    bytes.extend_from_slice(&record);
    bytes.extend_from_slice(&old);
    fs::write(&archive, &bytes).unwrap();
    unpack(&archive, &temp.path().join("valid")).unwrap();
    bytes[end + 24..end + 32].copy_from_slice(&u64::MAX.to_le_bytes());
    bytes[end + 32..end + 40].copy_from_slice(&u64::MAX.to_le_bytes());
    fs::write(&archive, bytes).unwrap();
    assert!(unpack(&archive, &temp.path().join("invalid")).is_err());
}
