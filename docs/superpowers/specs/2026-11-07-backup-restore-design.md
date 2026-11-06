# Backup and restore in Settings

The owner approved adding backup and restore to Settings. This first version uses portable
ZIP files: Create backup creates a downloadable backup, choosing a backup validates a file and
shows its date and counts, and Restore backup explicitly replaces current practice data.
Show a clear replacement confirmation and keep a downloadable safety backup before replacement.
Show Last backup created honestly; creating a server archive does not prove the user's browser
saved it. Automatic schedules and arbitrary server filesystem destinations are outside this change.

Include recordings, analysis, courses, exercises, progress/plans, uploaded Photos and practice
profile/notes. Exclude `.private`, `oauth.json`, connection bookkeeping, temporary files and
backup control state. Preserve current local authentication during restore; never import it.
Browser-only room customisations/media are not in the practice-data backup and stay untouched.
Explain these boundaries in Settings. No cloud upload and no sign-in required for local use.

## Archive contract

Create `lilt.backup/1` ZIPs with `_lilt-backup.json`: creation UTC, file count, expanded byte
count, recording count, and per-file sizes/SHA-256 hashes. Files keep their data-root-relative
paths. Require this manifest on import; old Export all ZIPs remain usable for documented
manual restore but are not silently accepted by the validated in-app importer.

Stream archive/upload data to disk, cap compressed size at 2 GiB, expanded size at 8 GiB,
individual files at 2 GiB and entries at 100,000. Reject traversal, absolute paths, backslashes,
drive/ADS/reserved Windows names, case-colliding duplicates, symlinks/special files, encryption,
unknown roots, malformed/inconsistent records, unsupported schema and checksum/count mismatch.
Validate path-bearing record fields (recording audio, photo file, job IDs, etc.) before use.
Never extract directly into live data. Fail closed on unreadable source files or unsafe links.

## Runtime and concurrency

Keep a stable backup controller outside the replaceable App. Reopen the entire App and router
after replacement, rather than refreshing selected caches. Global read/write admission guards
cover HTTP requests/response bodies, analysis and blocking MCP/export work; blocking closures
own their permits even if callers disconnect. Restore/backups take exclusive admission or
return a clear busy response. Recording/saving/un-enqueued Saved takes and desktop installation
block replacement. Old App instances are retired so lingering MCP sessions cannot write.

Use shared lifetime OS data-use locks plus an exclusive transition lock in a stable sibling
control directory. Startup/recovery and restore conversion use the transition lock. Refuse
restore while another Lilt or stdio process holds the shared lease. Keep OS leases outside the
renamed root. Recover incomplete transactions before App::open can create an empty root.

Validated stage and previous-root directories live beside the data root on the same filesystem.
Journal fixed transaction identities and phases durably, make a safety ZIP, preserve local
credentials, rename current to previous and stage to current, open/reconcile the new App,
then commit. Any pre-commit crash/failure rolls back to previous. Keep the safety archive.
Tests establish process-crash recovery, not guaranteed durability on every filesystem/power loss.

Persist a random data generation outside backup contents. Bind browser mutations to the
generation in which their state was loaded; after restore reject stale or missing generations
with a reload-required error. Capture the generation with recording creation and preserve it
in buffered-audio recovery; never relabel old pending chunks after restore. All APIs keep the
existing host/remote/cross-origin protections. Backup control is local-only and not an MCP tool.

## HTTP interface

- `GET /api/backups`: `{generation, last_backup, max_upload_bytes}` (last_backup nullable).
- `POST /api/backups`: create a consistent backup, return `{id, created_utc, files, bytes,
  recordings, download_url}`; request JSON `{}` and current generation header.
- `GET /api/backups/{id}/download`: a ZIP response, opaque ID only; no filesystem path input.
- `POST /api/backups/restore-preview`: raw ZIP body; validate/stage, return `{id, created_utc,
  files, bytes, recordings}` bound to the current generation. One preview at a time.
- `POST /api/backups/restore`: JSON `{id, generation, confirm: true}`; return
  `{restored: true, generation, safety_backup: {id, created_utc, files, bytes, recordings,
  download_url}}` only after restored App/router is usable. Retrying consumed previews must
  not repeat replacement. UI offers safety-copy download and Reload Lilt after success.
- Errors JSON `{error, code?}`: 409 busy/stale, 413 oversized, 422 invalid backup, 404 unknown ID.
  Response header `X-Lilt-Generation` supplies current generation; web retains its first loaded
  generation until reload. After restore all browser writes require the current generation.

## Verification

Test archive round trip and malformed/hostile files, credential exclusion/preservation, busy
recordings/jobs/requests, cancelled blocking work, multiple-process locks, preview expiry/stale
generation/replay, failure at rename/open phases and startup recovery. Exercise a real isolated
server backup → change data → preview → restore → reopen and verify audio/content/hash fidelity.
Browser-test Settings flow, confirmation/cancel, error/busy states, last backup, safety download,
reload, keyboard and narrow light/dark layouts. Run AGENTS checks in scratch targets; never use
owner data, port 7878 or web/dist. Document limitations and commit checked local work, no push.
