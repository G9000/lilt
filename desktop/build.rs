fn main() {
    println!("cargo:rerun-if-env-changed=LILT_UPDATER_PUBLIC_KEY");
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "update_status",
            "update_check",
            "update_download",
            "update_install",
        ]),
    ))
    .expect("could not build desktop permissions");
}
