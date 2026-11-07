# Reset all Lilt data

**Goal:** Settings → Storage offers Reset all data, with an explicit irreversible warning and
typed `DELETE ALL DATA` confirmation. Implementing this feature does not authorize using it
on the owner's data.

**Scope:** Delete the active data tree (including custom content, recordings, photos, progress,
notes and local credentials), Lilt-managed sibling backup/recovery files, and Lilt browser
storage. Keep the application and bundled course content. Explain that downloaded/exported
copies outside those folders remain. Other browser origins clear their local Lilt storage on
their next connection to the reset server.

**Server contract:** GET `/api/reset` returns `{ generation, reset_id, pending_cleanup }`. POST `/api/reset`
requires `{ generation, confirmation: "DELETE ALL DATA" }` and the existing generation header.
Success returns `{ reset: true, generation, reset_id }`. Responses include `X-Lilt-Reset`
when the server has a reset marker. The marker persists through restart and backup restore.

**Transaction:** Reuse controller maintenance, admission and process leases. Refuse active
recording/analysis/update work, concurrent readers and stale generations. Stage a fresh App,
retain the old directory only until the durable reset commit point, then remove all old data
and managed backup content. Before commit, rollback preserves old data. After commit, resume
deletion after interruption and never silently restore deleted data. Keep minimal lock,
generation/reset marker and deletion-audit metadata. Report incomplete cleanup truthfully.
Do not follow links or accept caller-supplied filesystem paths.

- [x] Implement backend reset and restart recovery with scratch-only transaction tests.
- [x] Implement typed confirmation, honest busy/error/partial handling and browser cleanup.
- [x] Test local/remote access, stale requests, failure boundaries, managed-backup removal,
      browser stores and warning/cancel flows; review backend and UI independently.
- [x] Run required checks, document scope and limitations, prepare a scoped main commit.
