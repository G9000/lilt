# Reset all data — 8 November 2026

Settings → Storage now has a warning, Cancel, and exact `DELETE ALL DATA` confirmation.
The reset deletes the active data directory's personal files, saved credentials, managed
backup/recovery content, and Lilt browser stores. Bundled content and exported copies outside
those directories remain. Minimal coordination metadata and a fresh deletion audit remain.

## Evidence

- Eight Rust reset tests cover confirmation/generation requirements, old App retirement,
  all managed backup removal, restart and restore marker persistence, busy readers/recordings/
  analysis/updates/process leases, local-origin gates, four precommit failure boundaries,
  interrupted postcommit cleanup, and external directory junctions on Windows.
- Recovery tests also verify that the static browser shell and bundles remain available
  during incomplete cleanup while data APIs stay blocked and host gates still apply.
- Eight isolated Chrome tests in `web/e2e/reset-data.mjs` cover warning/Cancel focus,
  exact confirmation, one destructive POST, local/session/IndexedDB/CacheStorage cleanup,
  unrelated storage preservation, a second tab, incomplete server cleanup, blocked IndexedDB
  retry, uncertain network results, stale startup ordering, and a pre-reset monitor upload.
- `web/e2e/reset-live.mjs` passed against the production web build and a real scratch Rust
  server. Cancel preserved a sentinel; reset deleted the sentinel, credentials and managed
  backup ZIP; an exported copy remained. Browser preferences/cache cleared, old-generation
  writes returned 409, and newly saved preferences survived refresh. The server was stopped.
- Existing Backup and Storage browser suites passed all 15 tests. Narrow light/dark reset
  screenshots and the production Settings warning were inspected.
- The complete monitor-media browser suite passed, including a room reset queued during a
  cache write, cross-tab removal, responsive controls, playback and missing-file recovery.
- Web types and 181 unit tests passed in the shared checkout. Production web and desktop
  stylesheet builds passed using scratch output. The build retains the existing large-chunk
  advisory; no bundle-size acceptance is claimed.
- Server formatting, strict all-target/all-feature Clippy, and all 137 tests passed. Desktop
  formatting/release Clippy passed. Python: 47 passed, one skipped.

Logs and synthetic screenshots are under ignored `.tmp/reset-*`. Rust checks used
`server/target/yarn-check` and scratch TEMP/TMP; Windows link fixtures required an unsandboxed
test run. Python used a scratch uv cache after the sandbox cache was inaccessible.

## Limits and safety

The owner's data, browser profile, server and installed app were not reset or restarted.
Native installed-app reset was not exercised; Chrome verified browser behavior and native
code passed static checks. No real credentials, provider connections or physical recording
were used. Other browser origins clear their Lilt stores when they next reach this server.
Reset does not remove external downloads, installation files or environment configuration.
Browser cleanup retries never repeat the destructive server POST. During offline startup,
the room stays available and reset-marker discovery blocks stale writes on reconnection.

Backend/frontend review identified a delayed startup snapshot race, an in-flight monitor
upload race, and recovery-copy clarity; the implementation and focused regressions address
them. Unrelated active UI changes in the checkout were preserved and excluded from this commit.
