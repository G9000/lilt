# Recording and guided practice for every course

Verified on Windows, 7 November 2026. All runtime data was isolated under
`.tmp/course-audio-runtime`; ports 17981 and 17983, copied scratch binaries and a scratch web
build. The owner's data, port 7878, debug executable and web/dist were not used or replaced.

## What changed

- Course-owned studio sessions and original audio; non-voice recordings finish as Saved without
  voice analysis or coaching. Existing records default to voice.
- Guided course tasks snapshot their prompt and hint. Learners may record, save a reflection,
  finish without audio, reopen practice, and clear an older reflection.
- Chapters, daily cards and flashcards offer optional recording. Course history stays scoped;
  daily ratings only attach saved audio from the same course and text.
- Failed uploads remain retryable. Empty or unfinished studio and guided takes can be removed
  from their course screens after confirmation, with recording-lock and ownership checks.
- Generic saved audio no longer blocks backup/update admission. Backup restoration checks
  session/take course ownership and saved guided-task identity.

## Checks

- Web types and 161 unit tests passed. Scratch production web build passed (existing large-chunk
  warning remains).
- Server formatting and strict Clippy passed; all 129 server tests passed. This includes generic
  audio lifecycle, historical defaults, saved task/reflection reload, cross-course card validation,
  voice analysis/review exclusion, recovery and update admission. Backup tests round-trip course
  audio and snapshots and reject five malformed or cross-course archive cases.
- Python: 47 passed, one skipped. Desktop formatting and release Clippy passed.
- Existing generic-course browser suite: 8/8 passed using a stubbed API.
- Existing voice Practice: 24/24 passed; voice Flashcards: 22/22 passed, each using fresh scratch
  data and Chrome's synthetic microphone.
- `web/e2e/course-recording.mjs` passed against the real scratch server with drawing and gardening
  fixtures. It exercised free, guided, chapter, daily-card and flashcard recordings; saved original
  byte length, decoded non-silent audio and advancing playback; silent guided completion without
  microphone access; reflection clearing/reload and failed-save retry; rejected finalization with
  locked controls followed by retry; recorded Again followed by a silent Good rating; history
  isolation; empty-take deletion; induced capture-start failure and recovery; unchanged voice
  history, participation, analysis jobs and reviews; and successful backup creation.
- Inspected the generated desktop and phone screenshots, including light and dark guided practice.
- Independent specification and quality reviews found recovery gaps, which were fixed and
  re-reviewed without remaining findings.

## Limits

Audio acceptance used a synthetic microphone in Chrome. Physical microphone/speaker use and
native WebView recording were not re-tested for this change. Generic guidance is the course's
authored task and the learner's reflection; subject-specific automated assessment is not provided.
