# Backup and restore implementation plan

**Goal:** Manual portable backups and validated replacement restore in Settings.
**Architecture:** Versioned archive, stable controller with exclusive maintenance, whole App/router
reopen, process leases and recoverable filesystem transaction. Browser mutations bind data generation.

- [x] Review `../specs/2026-11-07-backup-restore-design.md` and confirm module contracts.
- [x] Archive: `server/src/store/backup_archive.rs` with tests first; manifest, streaming limits,
  safe paths, complete record validation, portable round trip and credentials exclusion.
- [x] Runtime/controller: `server/src/backup/*`, app/main/http/analysis/MCP integration; activity
  guards, OS leases, generation, consistent backup, preview, safety copy, transaction and recovery,
  whole App/router reopening. Add adversarial/concurrency/rollback tests before implementation.
- [x] Web generation handling: `web/src/api.ts`, `web/src/recorder.ts` and small shared helpers;
  protect stale mutations and buffered recording recovery across restore; regression tests.
- [x] Settings UI: `web/src/components/BackupSettings.tsx`, Settings pane, API model/client and browser
  suite; create/download, preview, explicit replace/cancel, safety copy and reload, truthful errors.
- [x] Real scratch-server acceptance: record/export/hash, mutate, preview/restore, verify data and
  safety copy; inspect light/dark responsive UI; independent review; required repository checks.
- [x] Update guide, design, What's new and validation evidence; complete local signed commit.
