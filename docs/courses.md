# Courses and kinds of practice

Lilt is built so that voice practice is the first course, not the only one. This page says how the
pieces fit, what is already per course, and what to add for a new course or a new kind of practice.

The shared AI instructions do not contain a learner's name, pronouns or personal goal. Agents
start with `courses_list`, use the requested course's id explicitly with `syllabus_*`, and read
that course's format and locked sections before editing. Omitting the id still defaults to
`voice`; it does not follow a course selected in the app. Course editing follows the course's
subject and the learner's request, without imposing a voice goal on other subjects.

The `voice_*` tools remain specific to the built-in voice course. For voice coaching, agents
read the saved goal from `voice_get_today_plan` and use recorded practice evidence. Its evidence,
comfort and audio limitations still apply. These tools do not provide general practice or
analysis for other course subjects.

## The pieces

- **A course is content.** A folder in `content/courses/<id>` with a `course.md` (id, title, `kind`,
  version, `source`, `locked` sections) and Markdown: `index.md` (its home page), `_about.md`,
  `NN-name.md` chapters, `images/`, `audio/`. Format: `content/courses/README.md` and
  `content/courses/voice/README.md`. Server: `server/src/courses/mod.rs` reads them;
  `server/src/courses/texts.rs` parses the Markdown.
- **Your copy of a course** lives in `<data>/courses/<id>`, made by your AI, with `.history` (every
  change, undoable) and `.base` (the original it follows). Server: `syllabus.rs` (copy, checks,
  history, undo, reset) and `updates.rs` (bringing in changes to the original).
- **Kinds share a practice screen.** The registry in `web/src/courses.tsx` supplies names and tiles.
  Every course can use the shared home, chapters and daily deck at `#/learn/<id>`; unfamiliar kinds
  use the same screen. The built-in `voice` course keeps its recorder at `#/studio` and `#/deck`.
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
- Practice (`#/learn/<id>`), chapter flashcards (`#/flashcards?course=<id>`) and daily cards
  (`#/learn/<id>/today`), with guided practice and recordings. They share voice practice's look,
  with the same pill navigation on every page: a centred 960px column, chapters as
  tiles by part, and **Learn** and **Practise** tabs in a chapter that has notes or a video (a
  link to a text opens Practise). Open **Courses → a course → Practise**. The room and desk remember this
  course in the browser; explicit voice links still open voice. A missing course shows an error.
- `GET /api/deck/today?course=<id>` and `POST /api/deck/review?course=<id>`: separate schedules,
  ratings and participation for each course. Omission still means voice. Generic courses use
  their texts and the learner's Again/Hard/Good/Easy ratings without requiring a recording.
  Voice reference tasks, exercises, check-ins and comfort plan pauses belong only to voice.
  A review may include `request_id`; retry the same operation with the same id so a lost reply
  cannot count the rating twice. The app supplies this id for generic daily ratings.
- Generic card state and review logs live in `<data>/cards/<id>/`; voice keeps `<data>/cards/`.
  Backups include both. Chapter flashcard runs stay in the browser, isolated by course.
- The text browser (`#/texts?course=<id>`) and course Markdown links to chapter cards and texts
  keep the selected course. An unscoped `#/texts` follows the browser's selected course.
  Generic room cards describe practice at your own pace, without read-aloud instructions or a
  guessed duration. A saved voice goal is only used as the default room note for voice; notes you
  write yourself remain shared room notes.

## Recording and guided practice

Every course supports optional audio recording from its chapters, daily cards and chapter cards.
**Recordings** opens the selected course's saved audio and a free recorder. **Guided practice**
lets you choose a course text, practise with its hint, optionally record, and save a reflection.
The session keeps a copy of that prompt and hint, so later course edits do not change older sessions.
You can finish guided practice without granting microphone access.

Sessions and takes store their course. Existing recordings without this field belong to voice.
`POST /api/studio/session?course=<id>` starts or reuses a course's session for the day.
`POST /api/sessions` with `kind: "course_guided"`, `course` and a namespaced `prompt_id`
starts guided practice. `GET /api/sessions?course=<id>` and `GET /api/history?course=<id>`
return that course's practice; omission means voice. Daily ratings may attach a saved recording
only from the same course and text.

Other courses save original audio for playback without running voice analysis or coaching.
Voice retains its dedicated exercises, comfort reports, pitch measurements, comparison screens,
guided coaching and `voice_*` MCP tools. Subject-specific automated assessment for other courses
is not provided by the generic guided flow.

## Adding a course

1. Make `content/courses/<id>/` with a `course.md` (copy voice's and change it), an `_about.md`, an
   `index.md`, and one or more `NN-name.md` chapters. Put pictures in `images/`.
   Optional front matter: `area` (the skill it trains, for Progress), `check_in` (the text to
   record every visit), `exercises` (built-in exercises that join it in Today) and `today: false`
   (no Today cards). The built-in voice course uses `check_in` and `exercises`, with its original
   fallback tables for older copies. Other courses use their text cards without those voice additions.
   Their `area` can name their own subject or skill, such as `drawing`; voice retains its validated
   voice skill names. New blank chapters use `kind: practice` outside voice.
   A chapter with `draft: true` in its front matter (as "New chapter" makes) shows in Practice but
   makes no cards in Today until the line is gone.
2. Pick its `kind`. An existing one (`voice`, `language`) gets that kind's name and tile; a new word
   lists as a plain "Course" until the kind is registered.
3. Restart Lilt (with Docker, `docker compose up -d --build`). It shows in Courses, and your AI can
   make your own copy of it. Choose **Practise** to open it; no new screen is needed.

## Adding a kind of practice

No code is needed for ordinary reading and practice courses. Optionally register a new label and
tile in `KINDS`. If a subject needs specialised interaction, add that screen and route separately,
load `api.texts(course.id)` and use `textId(course.id, chapter, text)` to retain course isolation.
Any new measurement or feedback needs its own evidence contract; voice measurements are not a
general grading system.

## Next

- Add a course from GitHub by its repository (`source:` in `course.md`), and check it for updates
  into the same Updates page.
