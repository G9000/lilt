# Update notices implementation plan

**Goal:** Surface available desktop updates in the notification center and version/status in Settings.
**Architecture:** Native read-only status push; shared web state; existing notification read/clear storage.
**Tech stack:** Tauri 2 Rust, React 18/TypeScript, Node tests and Playwright Chrome fixtures.

- [x] Review the approved follow-up design in `../specs/2026-11-07-update-notices-design.md`.
- [x] Native status projection and delivery in `desktop/src/update_notice.rs`, `updates.rs`
  and `main.rs`: write projection/origin tests first, publish after load and status changes,
  preserve all existing update-command permissions. Run desktop fmt/tests/strict release Clippy.
- [x] Shared web model/hook in `web/src/desktopUpdate.ts`, `desktopUpdate.test.ts`,
  `useDesktopUpdate.ts`: test validation and every status, then implement read-only event state.
- [x] Update `web/src/pages/Settings.tsx` and `web/src/desk/Inbox.tsx`: inline native version/status,
  browser web-version explanation, version-keyed notices and opening the native window only.
- [x] Extend `web/e2e/desktop-updates.mjs` with failing integration checks before UI changes;
  verify initial/live status, notification read/clear/reload/new-version behavior and layouts.
- [x] Update `docs/guide.md`, `DESIGN.md`, `web/src/release.ts`, `VALIDATION.md`; independent
  review, appropriate browser checks plus all AGENTS checks in scratch directories; commit
  locally on main. Do not push, publish or access owner practice data.

Existing signed-release/Mac installation gates remain open. This change does not configure
release credentials or enable public distribution. Keep desktop version 0.2.1 until release.
