# Practice any course — 7 November 2026

## Follow-up audit

The room stack's read-aloud label and per-card duration, desk duration, voice-goal fallback note,
unscoped Practice texts screen, default course Markdown flashcard/text links, voice-only area
validation and generic blank-chapter kind were still assuming voice. Those are now scoped or
neutral. Generic screens label the recordings shortcut as Voice recordings. Recording, analysis,
guided exercises and the Yarn voice game remain deliberately voice-specific tools.

Regression coverage exercises generic room cards/notes, authored shared notes, course links and
the text browser, plus generic area metadata through loading, daily cards, editing, remix lookup,
diffs, updates and blank creation. Voice still rejects invalid voice areas. Server formatting,
strict Clippy and all 124 tests passed; web types, 161 unit tests and 8 isolated Chrome scenarios
passed. The staged feature snapshot also passed typecheck and a production build independently
of the concurrent styling/loading edits. A separate staged-code review found no blockers.

## Initial implementation

Implemented shared course home/chapter screens, per-course daily queues and ratings, course-aware
chapter flashcards, and remembered room/desk navigation. The built-in voice routes retain their
recording, analysis and comfort flow. Course state is included in backup/restore.

Verified on Windows:

- Server formatting and strict all-target/all-feature Clippy passed; all 123 server tests passed.
  New coverage includes separate schedules with identical chapter/text IDs, invalid/empty course
  rejection, no generic voice tasks or voice pause, null-take ratings, reload and backup round trips,
  and durable retry deduplication after a lost successful response.
- Web typecheck and all 161 unit tests passed; production build passed to a scratch output.
- Six isolated Chrome tests in `web/e2e/any-course-practice.mjs` passed: home/chapter/daily navigation,
  generic cards without microphone requests or voice sessions, Again rotation, save failure/retry,
  lost-response retry identity, course-local flashcards, room/desk/reload selection, voice aliases,
  and empty/invalid course states. Desktop and phone light/dark screenshots were inspected; the
  generic practice surface fills its window and controls wrap without horizontal overflow.
- Existing voice Practice suite passed 24/24 and Flashcards passed 22/22 against the rebuilt scratch
  server and production web build, using fresh scratch data and Chrome's synthetic microphone.
- Python tests: 47 passed, one skipped. The existing virtual environment ran these directly after
  `uv` could not access its shared cache; pytest also reported an unwritable cache directory.

The scratch server used port 17983 and was stopped afterward. Owner data and the running app on
7878 were not changed. No physical microphone, native installer or external AI provider checks
were performed for this change. Existing state and review-log files are still separate writes;
retry IDs protect completed writes from lost replies, not a filesystem failure between those writes.

Concurrent JavaScript loading work was present during integrated browser checks. It is excluded
from this feature's commit; the staged feature snapshot is separately typechecked and built.
