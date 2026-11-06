# Windows desktop validation — 7 November 2026

## Automated checks

- Web: typecheck and 153 unit tests passed; production assets built into `desktop/target/web`.
- Server: formatting, strict all-target/all-feature Clippy and 117 tests passed using
  `server/target/yarn-check` and a scratch TEMP directory. Windows junction tests required
  ordinary filesystem access outside the restricted test runner.
- Python: 47 tests passed, one skipped.
- Desktop: formatting, strict release all-target/all-feature Clippy and 31 tests passed.
  Two ignored tests are subprocess fixtures exercised by the process-tree tests.
- Windows build script: syntax, nonzero command handling, arguments containing spaces,
  bounded cleanup and junction rejection passed (`desktop/scripts/windows-build.test.ps1`).

## Native Windows acceptance

Built `desktop/dist/Lilt-0.2.1-x64-setup.exe` (68.72 MiB) with the pinned Tauri CLI and NSIS.
The complete build reached packaging; opening its executable during that step caused a Windows
file lock. After closing the test app, reran `tauri bundle` and copied the successful installer.
Rebundling the already-patched executable reported a bundle-type marker warning; Windows
automatic updating is disabled independently. The final release executable started successfully
with its bundled resources, served a healthy scratch API on port 17982, and displayed the room.
Installer archive integrity passed for 4,669 files; inspected paths include the desktop/server
executables, Python executable, analysis entry point and web index. SHA-256:
`ca2148af9ecd2664b52ba99b9f300236ab89c4144ef3e7630ea75fbf368e01bc`.

Copied the desktop executable and bundled runtime to `desktop/target/windows smoke`, a path
containing spaces. Used its own data, log and WebView2 profile directories and port 17981.
The owner’s data directory and port 7878 were not used.

The bundled Python independently analysed `harmonic_240.webm` successfully. Inside the real
Windows WebView2 window, Chromium’s synthetic speech input exercised recording, chunk upload,
the bundled analysis helper, listen-back playback and saving the starting range. Playback
advanced without a media error, and no page errors were reported. The smoke script observes
the detached `Audio` objects used by listen-back, and waits for the save confirmation.

The native File menu opened Updates, which reported that updates are unconfigured. Closed
Updates, then the main window; verified that both the desktop and its owned server exited.
Process-tree unit tests separately verify cleanup after a parent exits and that a separately
started process survives closing an attached connection.

Evidence (ignored build artifacts): `desktop/target/windows-smoke-evidence/report.json`,
`native-practice.png`, `fixture.json`, `shutdown.txt`, plus the test/build logs under `target`.

## Repeating the native audio check

Launch a relocated app with `LILT_DATA_DIR` containing `windows smoke` in its path, a fresh
profile, and `LILT_BIND=127.0.0.1:17981`. Set `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS` to include
`--remote-debugging-port=19223 --use-fake-device-for-media-stream --use-fake-ui-for-media-stream`
and `--use-file-for-fake-audio-capture="<absolute path to web/e2e/fake-mic.wav>"`.
Then set `LILT_DESKTOP_CDP=http://127.0.0.1:19223` and run
`node desktop/scripts/windows-smoke.mjs`. Close the app after testing.

## Limits

This verifies synthetic capture and software playback, not a physical microphone or audible
speaker output. The per-user NSIS installer is unsigned; signed distribution and automatic
Windows updates are not configured. Installation on a clean second Windows machine and Mac
runtime regression testing remain separate checks. The installer can download WebView2 when
it is missing, so first installation may require internet.
