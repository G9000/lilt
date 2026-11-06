# Mac desktop updates implementation plan

> **For agentic workers:** Use superpowers:subagent-driven-development or
> superpowers:executing-plans task by task. Keep each task within its listed files.

**Goal:** Give installed Mac users a signed whole-app download/install/restart flow.

**Architecture:** Native updater operations live behind bundled-window permissions. An
authenticated server interlock protects recordings; the release pipeline packages and signs
the complete runtime before making updater artifacts. GitHub receives drafts only.

**Tech stack:** Tauri 2 updater, Rust/Axum, small bundled HTML/JS UI, existing React Settings,
Node release tools, Bash macOS packaging, GitHub Actions.

## Tasks

- [x] 1. Recording-safe server interlock (`server/src/desktop_update.rs`, `app.rs`,
  `http.rs`, `main.rs`, `recordings/mod.rs`, `test_support.rs`, `web/src/recorder.ts`, and
  `web/e2e/recording-lock.mjs`). Write failing tests for
  unauthenticated requests, busy recording/saving, cancellation, and blocked new takes;
  implement `/api/desktop/update/prepare` and `/api/desktop/update/cancel` authenticated
  by `Authorization: Bearer <LILT_DESKTOP_TOKEN>`. Check and block take creation atomically.
  Await server admission before MediaRecorder starts and cover denied/delayed admission.
  Keep finalization protected until the analysis job is durably enqueued (or fail closed on
  Saved takes lacking the job); test this boundary so shutdown cannot strand an unmeasured take.
  Fail closed when record inspection fails. Run scoped tests, format and strict Clippy.
- [x] 2. Release tooling (`desktop/build.sh`, `desktop/scripts/*`, `.github/workflows/*`,
  `desktop/entitlements.plist`, `docs/desktop-releases.md`). Write metadata/artifact tests
  first. Implement complete-runtime signing/notarization, final archive signing, version
  checks and two-architecture manifest generation. Use explicit release mode requiring
  `LILT_UPDATER_PUBLIC_KEY`, `TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`,
  `APPLE_SIGNING_IDENTITY`, and notarization credentials. Add a manual draft-release workflow.
  Test generators, shell syntax and missing-secret failures. Do not push or run the workflow.
- [x] 3. Native update controller (`desktop/src/updates.rs`, `desktop/src/main.rs`,
  `desktop/Cargo.toml`, `desktop/Cargo.lock`, `desktop/build.rs`, capabilities and permissions).
  Use `option_env!("LILT_UPDATER_PUBLIC_KEY")`, fixed G9000/lilt endpoint, serialized operations,
  trusted window checks, retained verified download, and explicit restart. Integrate the
  server interlock, ownership check, stop/wait and failure recovery. Write state/policy tests
  before implementation and run desktop tests/Clippy in a separate target directory.
- [x] 4. Update UI and Settings (`desktop/ui/updates.*`, `web/src/pages/Settings.tsx`,
  `web/e2e/desktop-updates.mjs`). Write browser checks using a stub native bridge first;
  cover all states, retries, text-only notes, double-click prevention, dark/light and keyboard
  access. Add a Settings entry and native menu. No remote IPC grants. Run browser suite.
- [x] 5. Integrate and document (`desktop/tauri.conf.json`, `desktop/Cargo.toml`,
  `web/src/release.ts`, `docs/guide.md`, `DESIGN.md`, `VALIDATION.md`). Align desktop version
  0.2.1, record signing setup, bootstrap manual install, data retention, and unverified Mac
  acceptance. Review the full diff independently, fix findings, run all required checks,
  mark these tasks accurately, and commit finished local work on main. No push.

## Verification commands

Implementation and local verification completed on 7 November 2026. Review added retained
downloads on close, installation recovery/serialization tests, and startup/reaped-process
ownership fixes. Counts and limitations are recorded in `VALIDATION.md`.

### Release gate (still pending)

- [ ] Configure Developer ID and updater signing secrets securely.
- [ ] Build and validate two signed versions on Apple silicon and Intel Macs, including
  Gatekeeper, real recording/analysis, update/restart, failure recovery and retained data.
- [ ] Review the draft artifacts and publish only when explicitly requested.

### Local checks

- `bun run typecheck`, `bun run test`, Vite build to an ignored scratch directory.
- `node --test desktop/scripts/*.test.mjs` and `node web/e2e/desktop-updates.mjs`.
- Server: `cargo fmt --all -- --check`, `cargo clippy --all-targets --all-features -- -D warnings`,
  `cargo test --all-targets --all-features`, each build with `--target-dir target/yarn-check`.
- Analysis: `uv run --locked pytest`.
- Desktop: `cargo fmt --check`, `cargo clippy --all-targets --all-features --release -- -D warnings`,
  `cargo test`, each build with `--target-dir target/yarn-check`.
- Manual Mac acceptance remains a release gate, not something a stub test can prove.
