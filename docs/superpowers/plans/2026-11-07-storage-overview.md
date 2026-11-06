# Storage overview implementation plan

> Follow subagent-driven-development for bounded implementation tasks and independent review.

**Goal:** Explain Lilt's saved storage and make its data folder easy to find from Settings.
**Architecture:** Read-only bounded metadata scan under existing admission; fixed authenticated
native folder action; Settings pane with totals, refresh, paths and explicit incomplete/error states.
**Tech stack:** Rust/Axum, React/TypeScript, existing Tauri opener.

- [x] Review the storage spec and agree exact API/native contracts.
- [x] Backend: add `server/src/storage.rs` scanner and tests first; wire `/api/storage` to the
  stable backup controller and fixed bearer-authenticated desktop folder descriptor. Run focused
  tests with TEMP/TMP and target directories under scratch builds.
- [x] Desktop: `desktop/src/storage.rs`, fixed navigation handler and tests for exact main origin,
  fixed path request, path validation and result projection; existing opener, no new IPC grants.
- [x] Web: typed API, small size formatter with tests, Storage Settings component and pane;
  isolated browser tests for normal/empty/partial/failure/refresh/copy/native and responsive layouts.
- [x] Independent review, real scratch HTTP totals/guards acceptance, required web/server/Python/
  desktop checks and screenshot inspection.
- [x] Update guide, DESIGN, release notes and validation; commit checked work on main, no push.
