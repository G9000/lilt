# Practice any course

The learner can open any installed course, read its chapters, practise its texts and use daily
cards. The selected course follows them back to the room and desk. The built-in voice course keeps
its recorder, comfort checks and existing progress. Other courses use reading and self-directed
practice without requiring voice recordings or importing voice exercises.

## Contract

- `/learn/:course` opens the reusable course home; `/learn/:course/today` its daily cards;
  `/learn/:course/chapter/:chapter/:text?` its chapter. Voice keeps `/studio` and `/deck`.
- `/flashcards/:chapter?course=:course` selects chapter cards; omitted course remains voice.
- `GET /api/deck/today?course=:course` and `POST /api/deck/review?course=:course` select a
  validated course. Omission keeps voice behavior. Review request fields remain unchanged.
- Nonvoice card IDs use the existing course/text ID convention. Schedules and review logs are
  isolated by course; existing voice data remains at its current paths. Invalid courses fail.
- Voice reference tasks, exercises, warmups, before/after cards and plan pauses are voice-only.
- The room and desk remember the course opened for practice in this browser. Explicit URLs win.
- Generic daily cards use the learner's Again/Hard/Good/Easy rating and do not require a take.
  Empty, loading and failed requests have explicit states; failed saves do not advance cards.
- Chapter flashcard runs are isolated per course. Generic courses never create voice sessions.

## Work

- [x] Scope card generation, scheduling, storage and review endpoints; regression tests for isolation.
- [x] Add reusable course home/chapter/daily screens and course-aware chapter flashcards.
- [x] Wire course navigation, selected course, room/desk shortcuts and API client.
- [x] Update guide, course documentation and release notes.
- [x] Review the integration; run focused and full applicable checks plus browser checks on scratch data.

Commit only the checked feature files; leave concurrent JavaScript loading work untouched. Do not push.
