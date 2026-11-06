# Windows desktop implementation plan

**Goal:** Open Lilt as a Windows Tauri app with a self-contained per-user installer.

**Architecture:** Keep the shared React UI, Rust server and Tauri window. Package the Windows server, managed Python distribution, locked analysis dependencies, web assets and courses under `runtime`. Use Windows paths and owned process-tree cleanup; retain Mac behavior. Windows updates remain manual until signed Windows releases exist.

**Tech stack:** Tauri 2, Rust, Windows Job Objects, PowerShell, Bun, uv, NSIS.

## Scope and acceptance

The user approved adding the Windows build/installer, runtime bundling, platform paths, shutdown behavior and recording/playback/analysis verification. Use a current-user NSIS installer. Never restart the owner's server, write their data, or build over their active server/web output. Preserve concurrent styling edits. Commit only this task's finished changes on main; do not push.

## Tasks

- [x] Add focused regression tests for Windows runtime paths, HOME/USERPROFILE fallback and owned server/descendant cleanup.
- [x] Adapt `desktop/src/main.rs`, a focused Windows process module and `desktop/Cargo.toml`/lockfile. Hide console windows, stop owned analysis descendants, leave reused servers alone, and use a scratch port when a scratch data directory is supplied.
- [x] Add `desktop/build.ps1` and a Windows installer configuration. Stage everything under ignored desktop build directories, check native failures, bundle Python and dependencies, build NSIS and copy a clearly named installer to `desktop/dist`. Keep the Mac script intact.
- [x] Keep Windows automatic updating explicitly unconfigured; adjust desktop wording where it inaccurately says Mac only.
- [x] Add Windows instructions to `docs/guide.md`, README/AGENTS where needed, and the top `web/src/release.ts` entry.
- [x] Run desktop unit tests, formatting, strict Clippy and the installer build. Run web types/tests/scratch production build, server formatting/Clippy/tests in a separate target directory, and Python tests as required by AGENTS.
- [x] Exercise the packaged runtime with scratch data, validate analysis using a fixture, and inspect the real Windows window if available. Record separately any native microphone/playback or installer validation that cannot be performed.
- [x] Review the changes and validation evidence; commit only Windows-support files/hunks.

## Important checks

- Windows `runtime/lilt.exe` and `runtime/python/python.exe` must be chosen; the Mac runtime keeps `lilt` and `python/bin/python3`.
- Closing the owned app must terminate descendants even if the server already exited. An attached external server must never be killed.
- Installer resources must preserve nested Python and course paths and work without Rust, Bun or uv on the destination PC.
- Build scripts resolve paths independently of the caller's working directory, avoid deleting external paths, and fail on nonzero native exit status.
- Windows local builds must not claim to support the Mac updater feed.
