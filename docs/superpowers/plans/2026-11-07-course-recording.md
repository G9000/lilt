# Recording and guided practice for every course

Use each installed course's own practice texts and hints as guided tasks. Recording is optional; learners can practise away from the microphone and save a reflection. Audio is saved and playable for every course. Existing voice exercises, comfort checks, analysis and coaching retain their voice-only meaning.

## Contract

- Sessions and takes carry `course`, defaulting to `voice` for existing files.
- `POST /api/studio/session?course=id` reuses that course's studio session for the day.
- `POST /api/sessions` accepts `{kind:"course_guided",course,prompt_id}` for a non-voice course. The server resolves its namespaced text ID and saves a `task` snapshot `{prompt_id,title,text,hint}`. Voice session requests remain compatible.
- Generic recordings use free takes with their course's namespaced prompt (or `free` for an open recorder). Course guided recordings use the saved task. Reject mismatched course/task/exercise references.
- Generic audio finalizes as `saved`; never queues voice analysis or coaching. Manual/recovery paths enforce the same boundary.
- `GET /api/sessions?course=id` and `/api/history?course=id` filter by course; omission means voice. Course cards may attach only saved takes from that course and prompt.
- Generic sessions complete through the existing notes/complete update. Reflections and audio survive reload. Voice progress and participation exclude other courses.

## Screens

- Course navigation links to Recordings and Guided practice.
- Guided practice offers the course's own texts, saves a session before practising, shows its saved prompt/hint, allows optional audio, then reflection and completion. Completed sessions reopen with their saved evidence.
- Course chapter texts and daily cards offer optional recording. Flashcards offer the same where practical. No voice pitch displays, microphone warmups or voice-specific questions for other courses.
- Recordings page supports an open recorder, playback and reopening guided sessions, always scoped to the selected course.

## Work and checks

1. Server ownership, snapshots, safe audio lifecycle, history and card validation with regression tests.
2. Reusable course recording/guided/history screens and entry points.
3. Route/API integration, documentation and release notes; inspect all global voice consumers.
4. Focused backend and web checks plus browser coverage using synthetic audio and isolated data. Review spec and quality, then commit only this work on main.

Preserve concurrent JavaScript-loading and style edits. Never use the owner's data, port 7878, debug binary or web/dist for tests.

Completed: server and UI integration, recovery controls, restore ownership checks, documentation,
independent reviews and the checks recorded in `docs/validation/2026-11-07-course-recording.md`.
