use crate::app::App;
use anyhow::Result;
use std::fs::File;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};

/// Zip the data root (skipping the scratch `.tmp` folder) into a temp file.
pub fn write_zip(app: &App) -> Result<PathBuf> {
    let out = std::env::temp_dir().join(format!("lilt-export-{}.zip", uuid::Uuid::new_v4().simple()));
    let mut zip = zip::ZipWriter::new(File::create(&out)?);
    let opts = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);
    add_dir(&mut zip, &app.paths.root, &app.paths.root, opts)?;
    zip.finish()?.sync_all()?;
    Ok(out)
}

fn add_dir(
    zip: &mut zip::ZipWriter<File>,
    root: &Path,
    dir: &Path,
    opts: zip::write::SimpleFileOptions,
) -> Result<()> {
    let mut entries: Vec<_> = std::fs::read_dir(dir)?.flatten().collect();
    entries.sort_by_key(|e| e.file_name());
    for e in entries {
        let p = e.path();
        let name = e.file_name().to_string_lossy().into_owned();
        if (dir == root && name == ".private") || name == ".tmp" || name.ends_with(".tmp") {
            continue;
        }
        let rel = p.strip_prefix(root)?.to_string_lossy().replace('\\', "/");
        if e.file_type()?.is_dir() {
            zip.add_directory(format!("{rel}/"), opts)?;
            add_dir(zip, root, &p, opts)?;
        } else {
            zip.start_file(rel, opts)?;
            let mut f = File::open(&p)?;
            let mut buf = vec![0u8; 1 << 16];
            loop {
                let n = f.read(&mut buf)?;
                if n == 0 {
                    break;
                }
                zip.write_all(&buf[..n])?;
            }
        }
    }
    Ok(())
}
