# Home and first practice — 9 November 2026

Home now introduces Lilt before practice and restores the voice course's original creator story
from its editable Markdown. Room entry opens course Home. A four-step, skippable introduction
supports voice and other courses, with optional recording, remembered per-course progress and
explicit skip/completion. Home and Today retain a warning if that choice cannot be saved.

## Verified

- Web typecheck and 225 Node unit tests passed. Introduction tests cover per-course persistence,
  terminal replay status, blocked/corrupt storage and extraction of the original creator text.
  The new test first failed with the introduction module absent.
- `web/e2e/introduction.mjs` passed using the full app, isolated Vite, stubbed API and disposable
  Chrome storage. Checks include room-to-Home entry, original creator story, no microphone request
  on Home/introduction with permission already granted, steps/back/reload, skip/replay/completion,
  direct Today, generic-course preparation, blocked-storage warnings including Home-to-Today,
  and narrow dark layout. A delayed permission lookup cannot open the mic after returning Home.
- Independent review found a pending-device request that could stop the next view's microphone.
  Its added browser regression failed, then passed after request invalidation was moved to the
  microphone provider. Two delayed successful requests are resolved after recording → Home →
  recording; the old stream ends, the new stream stays live, and returning Home ends it.
- `course-reading.mjs` passed its existing keyboard navigation and light/dark responsive reading
  checks. Screenshots in `.tmp/introduction-shots` were inspected; shared button styling was
  corrected and rechecked at a minimum 40px height.
- Production web build used `.tmp/introduction-web`; desktop stylesheet build used
  `.tmp/introduction-updates.css`. Both passed. The existing Vite large-chunk advisory remains.
- Final `flow.mjs`: 42/42 checks passed. Final `practice.mjs`: 25/25 passed. Both used the scratch
  production web build, a separate server binary, fresh data folders, private ports and Chrome's
  synthetic microphone. Coverage includes optional starting recording, saved range, real upload
  and Python analysis, card ratings, guided practice, recording locks and navigation while saving.
- Server formatting and strict all-target/all-feature Clippy passed. All 144 server tests passed
  with `server/target/yarn-check` and scratch TEMP/TMP. The sandbox initially denied two junction
  safety checks; the reviewed scratch rerun passed. The incremental-cache hard-link fallback
  warning is environmental.
- Python: 47 passed, one skipped. Desktop formatting and release Clippy passed.
- Independent final review approved the microphone lifecycle and persistent storage notices.

The owner's running app, real practice data, port 7878 and production web output were not changed.
No physical microphone, native screen-reader speech or Safari acceptance was performed. No
installer was rebuilt and nothing was pushed. Introduction choices are browser-local and are not
part of practice backups.
