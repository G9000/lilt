# Courses and kinds of practice

Lilt is built so that voice practice is the first course, not the only one. This page says how the
pieces fit, what is already per course, and what to add for a new course or a new kind of practice.

## The pieces

- **A course is content.** A folder in `content/courses/<id>` with a `course.md` (id, title, `kind`,
  version, `source`, `locked` sections) and Markdown: `index.md` (its home page), `_about.md`,
  `NN-name.md` chapters, `images/`, `audio/`. Format: `content/courses/README.md` and
  `content/courses/voice/README.md`. Server: `server/src/courses/mod.rs` reads them;
  `server/src/courses/texts.rs` parses the Markdown.
- **Your copy of a course** lives in `<data>/courses/<id>`, made by your AI, with `.history` (every
  change, undoable) and `.base` (the original it follows). Server: `syllabus.rs` (copy, checks,
  history, undo, reset) and `updates.rs` (bringing in changes to the original).
- **A kind of practice is code.** `kind` in `course.md` says how a course is practised. The web app
  keeps a registry of kinds in `web/src/courses.tsx`: each kind's name, tile, and the screen that
  practises it. `voice` is registered with Practice (`#/studio`). `language` is registered with a
  name and tile and no screen yet. A course whose kind has no screen still lists in Courses, and
  your AI can still edit it.
- **Text ids** name a course's texts for takes, cards and progress: `text.<chapter>.<text>` for the
  app's course (voice, unchanged from before courses), `<course>/text.<chapter>.<text>` for any other.
  One rule, in `courses::text_id` (server) and `web/src/courseIds.ts` (web), so two courses can
  share a chapter name without sharing progress.

## Already per course

- `GET /api/courses`: every course, its kind, and your copy's state (changes, updates waiting).
- `GET /api/texts?course=<id>`: a course's texts as the app shows them (voice when left out).
- `GET /api/syllabus?course=<id>`, `…/history`, `POST …/undo`, `POST …/reset`,
  `GET|POST /api/syllabus/updates?course=<id>`: your copy, its history and updates.
- `/courses/<id>/images/…` and `/courses/<id>/audio/…`: a course's pictures and recordings (voice's
  also at `/texts/images` and `/texts/audio`).
- MCP: `courses_list`, and every `syllabus_*` tool takes `course`.
- The Courses app (`#/courses`): each course, your copy, history, undo, reset, updates.

## Still the app's course only

These follow the app's course (voice) today. A second kind of practice would decide how far to take
each:

- **Practice** (`web/src/pages/Voice.tsx`) loads the app's course; its sidebar, home page and
  chapters are voice's.
- **Today's cards** (`server/src/practice/cards.rs`) are built from the app's course, plus the voice
  exercises and the reference phrase.
- **Recordings** names a take by its chapter only for the app's course.
- **Analysis** (`analysis/`) measures pitch, which suits voice and would also suit tones.

## Adding a course

1. Make `content/courses/<id>/` with a `course.md` (copy voice's and change it), an `_about.md`, an
   `index.md`, and one or more `NN-name.md` chapters. Put pictures in `images/`.
   A chapter with `draft: true` in its front matter (as "New chapter" makes) shows in Practice but
   makes no cards in Today until the line is gone.
2. Pick its `kind`. An existing one (`voice`, `language`) gets that kind's name and tile; a new word
   lists as a plain "Course" until the kind is registered.
3. Restart Lilt (with Docker, `docker compose up -d --build`). It shows in Courses, and your AI can
   make your own copy of it.

## Adding a kind of practice

1. **Register it** in `KINDS` in `web/src/courses.tsx`: a label, a tile, and `practice`, the route of
   its screen for a course (or null while there is none).
2. **Add the route** in `web/src/App.tsx`, and the window in `WINDOWS` in `web/src/desk/Desk.tsx`
   if it opens on the desk.
3. **Build the screen.** Load the course with `api.texts(course.id)`. Record with the existing
   recorder (`Dock` in `Voice.tsx`) or your own, and name each text's takes with
   `textId(course.id, chapter, text)` so its takes and progress stay with that course.
4. **Feedback**, if the kind needs a different measurement: add it to `analysis/` and to the take's
   analysis run, as pitch is today.
5. **Cards**, if it should join Today: build its cards in `cards.rs` with `courses::text_id`.

## Next

- Add a course from GitHub by its repository (`source:` in `course.md`), and check it for updates
  into the same Updates page.
