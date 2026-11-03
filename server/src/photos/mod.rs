//! Your photos: pictures you add for the room's clock and the Photos app, kept in `<data>/photos`
//! beside an index (`photos.json`), plus which of Lilt's own pictures you've hidden. Lilt's own
//! pictures ship with the web app, so the server only remembers their ids.

pub mod routes;

use crate::app::App;
use crate::{store, util};
use anyhow::{Result, anyhow, bail};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::path::PathBuf;

/// The largest photo accepted. The web app shrinks photos before sending them, so this is generous.
pub const MAX_BYTES: usize = 8 << 20;

#[derive(Serialize, Deserialize, Default, Clone, Debug, PartialEq)]
pub struct Index {
    /// Photos you added, oldest first.
    #[serde(default)]
    pub uploaded: Vec<Photo>,
    /// Ids of Lilt's own pictures you deleted; Restore brings them back.
    #[serde(default)]
    pub hidden: Vec<String>,
}

#[derive(Serialize, Deserialize, Clone, Debug, PartialEq)]
pub struct Photo {
    pub id: String,
    pub name: String,
    pub file: String,
    pub mime: String,
    pub added_utc: String,
}

fn dir(app: &App) -> PathBuf {
    app.paths.root.join("photos")
}

fn index_path(app: &App) -> PathBuf {
    dir(app).join("photos.json")
}

pub fn index(app: &App) -> Result<Index> {
    Ok(store::read_json_opt(&index_path(app))?.unwrap_or_default())
}

/// What an image is, by its first bytes (not its name): its media type and file extension.
fn kind(bytes: &[u8]) -> Option<(&'static str, &'static str)> {
    if bytes.starts_with(&[0xFF, 0xD8, 0xFF]) {
        Some(("image/jpeg", "jpg"))
    } else if bytes.starts_with(&[0x89, b'P', b'N', b'G']) {
        Some(("image/png", "png"))
    } else if bytes.len() >= 12 && &bytes[..4] == b"RIFF" && &bytes[8..12] == b"WEBP" {
        Some(("image/webp", "webp"))
    } else if bytes.starts_with(b"GIF8") {
        Some(("image/gif", "gif"))
    } else {
        None
    }
}

/// Add a photo: a JPEG, PNG, WebP or GIF of at most 8 MB, named as you like (or "Your photo").
pub fn add(app: &App, name: &str, bytes: &[u8]) -> Result<Photo> {
    if bytes.is_empty() {
        bail!("the photo is empty");
    }
    if bytes.len() > MAX_BYTES {
        bail!("the photo is larger than 8 MB");
    }
    let (mime, ext) = kind(bytes).ok_or_else(|| anyhow!("not a JPEG, PNG, WebP or GIF image"))?;
    let name: String = name.trim().chars().take(80).collect();
    let id = uuid::Uuid::now_v7().simple().to_string();
    let photo = Photo {
        file: format!("{id}.{ext}"),
        id,
        name: if name.is_empty() {
            "Your photo".into()
        } else {
            name
        },
        mime: mime.into(),
        added_utc: util::now_utc(),
    };
    let _g = app.write_lock.lock().unwrap();
    store::write_atomic(&dir(app).join(&photo.file), bytes)?;
    let mut idx = index(app)?;
    idx.uploaded.push(photo.clone());
    store::write_json(&index_path(app), &idx)?;
    Ok(photo)
}

/// Delete a photo you added (its file goes, and the deletion is logged), or hide one of Lilt's own.
pub fn remove(app: &App, id: &str) -> Result<Index> {
    store::check_id(id)?;
    let _g = app.write_lock.lock().unwrap();
    let mut idx = index(app)?;
    if let Some(i) = idx.uploaded.iter().position(|p| p.id == id) {
        let p = idx.uploaded.remove(i);
        store::write_json(&index_path(app), &idx)?;
        let _ = std::fs::remove_file(dir(app).join(&p.file));
        store::append_line(
            &app.paths.deletions_log(),
            &json!({"kind": "photo", "id": p.id, "name": p.name, "deleted_utc": util::now_utc()})
                .to_string(),
        )?;
    } else if !idx.hidden.iter().any(|h| h == id) {
        idx.hidden.push(id.into());
        store::write_json(&index_path(app), &idx)?;
    }
    Ok(idx)
}

/// Bring back every one of Lilt's own pictures you hid.
pub fn restore(app: &App) -> Result<Index> {
    let _g = app.write_lock.lock().unwrap();
    let mut idx = index(app)?;
    idx.hidden.clear();
    store::write_json(&index_path(app), &idx)?;
    Ok(idx)
}

/// A photo you added: where its file is, and its media type.
pub fn file(app: &App, id: &str) -> Result<(PathBuf, String)> {
    store::check_id(id)?;
    let p = index(app)?
        .uploaded
        .into_iter()
        .find(|p| p.id == id)
        .ok_or_else(|| anyhow!("photo not found"))?;
    Ok((dir(app).join(&p.file), p.mime))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_support::app;

    const PNG: &[u8] = &[0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0, 0, 0];

    #[test]
    fn a_photo_is_added_named_and_kept_on_disk() {
        let (_d, app) = app();
        let p = add(&app, "  My plant  ", PNG).unwrap();
        assert_eq!(p.name, "My plant");
        assert_eq!(p.mime, "image/png");
        assert!(p.file.ends_with(".png"));
        assert_eq!(index(&app).unwrap().uploaded, vec![p.clone()]);
        let (path, mime) = file(&app, &p.id).unwrap();
        assert_eq!(std::fs::read(path).unwrap(), PNG);
        assert_eq!(mime, "image/png");
        assert_eq!(add(&app, "", PNG).unwrap().name, "Your photo");
    }

    #[test]
    fn only_images_of_a_sensible_size_are_accepted() {
        let (_d, app) = app();
        assert!(add(&app, "x", b"").is_err());
        assert!(add(&app, "x", b"#!/bin/sh\necho hi").is_err());
        let mut big = PNG.to_vec();
        big.resize(MAX_BYTES + 1, 0);
        assert!(add(&app, "x", &big).is_err());
        assert!(index(&app).unwrap().uploaded.is_empty());
    }

    #[test]
    fn deleting_your_photo_removes_it_and_logs_it_and_lilts_own_are_hidden_until_restored() {
        let (_d, app) = app();
        let p = add(&app, "Mine", PNG).unwrap();
        let (path, _) = file(&app, &p.id).unwrap();
        let idx = remove(&app, &p.id).unwrap();
        assert!(idx.uploaded.is_empty());
        assert!(!path.exists());
        assert!(file(&app, &p.id).is_err());
        let log = std::fs::read_to_string(app.paths.deletions_log()).unwrap();
        assert!(log.contains("\"kind\":\"photo\"") && log.contains(&p.id));

        remove(&app, "cat-kitten").unwrap();
        let idx = remove(&app, "cat-kitten").unwrap();
        assert_eq!(idx.hidden, vec!["cat-kitten".to_string()]);
        assert!(restore(&app).unwrap().hidden.is_empty());
        assert!(remove(&app, "../profile.json").is_err());
    }
}
