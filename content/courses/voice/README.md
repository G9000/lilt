# Voice practice (a course)

This folder is Lilt's voice course: the reading material for its chapters and today's cards, and
`course.md`, which names the course, its kind of practice and the sections an AI may never change. Edit these files in any text editor,
or open this folder as an Obsidian vault. Restart Lilt afterwards (with Docker, rebuild:
`docker compose up -d --build`). If a file has a mistake, Lilt won't start and says which file.

These are the original texts, shared by everyone. To change them just for yourself, ask your AI
agent over MCP (see "Courses, and your own copy" in the main README): your version is kept in your
data folder, and these files stay as they are. Another course is another folder beside this one,
with its own `course.md`.

- `index.md`: the course guide (why it exists, how it works, sources), shown folded as **Course
  guide** at the top of Practice's All chapters page. `cover: images/<file>`
  in its front matter sets the picture at the top of Practice's Chapters page. `cover.webp` is an original generated
  illustration of a microphone, notebook and resting cat, matching the guide's artwork. The welcome page uses three original
  generated illustrations: `practice-corner.png`, `listening-nook.png` and `resting-cat.png`.
  The older `placeholder-*` files remain available for personal copies that still reference them.
  Point the Markdown at your own pictures if you prefer. Plain Markdown:
  `#`/`##` headings, paragraphs, `-` lists, `> ` quotes, `**bold**`, `_italic_`, `[links](https://…)`
  and pictures: put the file in `images/` and write `![what it shows](images/name.webp)` on its own
  line (it opens the same way in Obsidian).
  The list of chapters under it is added automatically.
- `_pitch.md`: the average speaking pitch for men and women (averages and standard deviations in Hz,
  the overlap band) and where those numbers come from. After each take, Lilt shows your middle pitch
  on the scale in words and semitones, how the take spread across it, and where your spoken takes
  of the last week usually sit; never as a score. Hide it under the scale or in Practice settings.
- `_about.md`: the edition (`version`), the date the sources were checked, and the note shown at
  the end of every chapter. Updates compares this edition: raising it offers the whole course to
  personal copies as one change. `course.md` has its own `version`, the course's listing in
  Courses (version 2 is when chapters began naming their own `exercises:`), so the two differ.
- `images/` and `audio/`: pictures for `index.md`, and example recordings for the texts.
- `_template.md`: a chapter to copy (it isn't loaded itself).
- `01-start-here.md` … `13-real-life.md`: one chapter each. `02-your-voice.md` is Looking after your voice: the voice care from across the course in one place (rest, water, warm-ups, how much is enough, the signs to stop, when to see someone), with a gentle check-in of plain questions. It has no `direction:`, so it's for every way, and stays out of Today (`today: false`), a page to read like Start here. Its name shares Warm-ups' number so it sorts straight after it without renaming any file. `14-reading-room.md`, `15-stories.md` and `16-articles.md` are Extras shelves of longer passages (`part: Extras`, `today: false`), there to read whenever you want more. `17-going-lower.md` … `21-lower-emphasis.md` are the Going lower part (`part: Going lower`, `direction: lower`): a start on breath, care and testosterone, then pitch, resonance, vocal weight and emphasis for a deeper, darker, fuller voice, for people who set Which way to Lower. The start stays out of Today (`today: false`); with Which way set to Lower, the four skill chapters are Today's cards in place of the chapters marked `direction: higher` (Pitch, Resonance, Vocal weight, Articulation, Intonation, Laughs and little sounds and Being heard). They come after the Extras only because the Extras' file names stay as they are. `22-in-between.md` … `24-flex.md` are the In between part (`part: In between`, `direction: open`), for people who set Which way to Still open: a middle that feels like yours, mixing the dials, and moving lighter or fuller on purpose. All three are Today's cards for Still open, in place of the chapters for one way (`direction: higher` and `direction: lower`). A passage of about 40 words or more shows its id as a title (`night-bus-2` reads "Night bus, part 2") and a reading time. The number at the start of the file
  name sets the order (and the order Today's cards open in). `13-being-heard.md` and
  `13-real-life.md` share a number and sort by name, so Being heard comes first. Leave the names as
  they are: Updates would offer a renamed file to personal copies as a separate removal and
  addition, and taking only one of them leaves a copy with two chapters of the same id. Renumber
  them only in a new edition. To add a chapter, add a file like `25-singing.md`. In `04-resonance.md`, each take of a held vowel has its resonance (F2 and F3)
  compared with your first take of the same vowel.

## How a lesson teaches

The main chapters come in three parts: **Get ready** (setup, warm-ups and looking after your voice), **The skills** (pitch,
resonance, vocal weight, articulation and intonation, one at a time) and **Bring it together**
(automatic speech, everyday phrases, reading, your own words, laughs and little sounds, being
heard, real life).

Each chapter's intro is a handful of short **Label.** steps, shown numbered in Practice. Teach the
technique concretely: what the skill is, how to find it in your body (tongue, lips, larynx, breath),
one way to try it, a real phrase to use it in, and what to listen for. Write warmly and directly,
like talking to a friend. Say the voice-care rule once (the closing note in `_about.md` adds it to
every chapter, and a step whose label says "gentle" or "care" gets a heart); hints don't need to
repeat it, except where an exercise has its own risk. Buzzing sensations and acoustic numbers are
clues, not pass marks, and natural melody varies; never make rising endings a rule.

The early chapters have bridge cards alongside their skill exercises. `warmup/hum-to-hello` comes
second, so a fresh Today deck can offer a hum and a real greeting on day one. Pitch, resonance and
intonation have their own short phrase too. Edition 3 renumbered the files to add Articulation
and Laughs and little sounds, so a personal copy takes it as one whole change through Updates. Every
earlier chapter and text id, and the words of every check-in, are unchanged, so recordings still
line up.

Dedicated A/B recordings are still missing. Use the existing video links and personal takes;
`audio/README.md` describes the human-recording briefs. Do not add an `example:` line until its real,
permitted audio file exists. A generated speech voice or synthetic tone is not evidence of vocal
weight or resonance technique. No clinician has reviewed the content or pacing.

## November 2026 guidance review

The general route and listening-resource list are on `index.md`. The 3 November review checked
the accessible ASHA and NHS Fife guidance and the YouTube resource metadata. It is an editorial
review, not clinician approval or a full review of the video content. NHS Lothian's guides could
not load then; see 8 November. The course now avoids fixed weekly pitch increases, held swallowing
positions, props in the mouth, and treating creak or a falling pitch as proof of heavier weight.
Chapter/text ids and check-in words were kept stable. Edition 3 is unchanged so personal copies
can review these corrections piece by piece instead of replacing the whole course.

The 4 November rewrite of Resonance centres it on making the space smaller (a higher larynx, a
forward tongue, spread lips), found through sounds: the big-dog/small-dog pant, the whisper siren
and the toy-dog "wa" are now the main route, no longer optional. It keeps the review's rules: no
held swallow, no pushing on the throat, and smaller never means tighter. Text ids and the check-in
words are unchanged.

Vocal weight had the same rewrite: it now says plainly what weight is (thick, buzzy contact against
thin, clear edges) and teaches one route: hear "HEY" against "aww", borrow a light little sound,
slide up until the sound thins and carry it back down, then words, with "light, not breathy" as its
own step. It never treats creak or a falling pitch as proof of heavier weight. Ids and the check-in
words are unchanged.

On 8 November both NHS Lothian guides ("What is it?" and "Where to start", February 2026) loaded,
and the six chapters that credit them (Start here, Warm-ups, Pitch, Vocal weight, Intonation and
Real life) were read against them. Like the 3 November review, this was an AI editorial check, not
clinical review. No chapter contradicted the guides; four were brought closer to them. Start
here calls five to ten minutes a good visit rather than "plenty", since Lothian suggests at least
that much a day. Warm-ups asks for a clear, easy sound and to stop if it feels pushed. Vocal weight
no longer says weight is "much of" what listeners hear, only that a thinner voice tends to be heard
as higher. Real life gets closer to the person, or away from the noise, before raising the voice.
Lothian sends lasting hoarseness to a GP after six weeks; the course keeps its sooner three weeks,
from the NHS Greater Glasgow and Clyde guidance it cites. Ids and the check-in words are unchanged.

On 9 November the Going lower part was added for a deeper, darker, fuller voice, from NHS
Lothian's "Testosterone and voice" and "Where to start" (2026), ASHA's practice portal, the London
Gender Identity Clinic's transmasculine group evaluation (Mills, Stoneham and Davies 2019) and
study abstracts on the voice on testosterone (Nygren et al. 2016; Irwig, Childs and Hancock 2017;
Hancock, Childs and Irwig 2017; Ziegler et al. 2018; Azul et al. 2017). It follows the same rules:
never push the pitch down, press on the throat or hold the voice box down; creak, pressed voice and
shouting are never "fuller"; and emphasis through loudness and pacing is a tendency, never a rule
against a moving melody. Like the rest, it is an AI editorial piece, not clinician approval. No
Trans Care BC voice page could be found to check against, and the chapters have no video yet. Later
that day Today's cards began to follow Which way: going lower, the four skill chapters
(`direction: lower`) take the place of those aiming lighter (`direction: higher`), straight after
the warm-ups, and the start stays a page to read, like Start here.

Also on 9 November the In between part was added for Still open: androgynous, nonbinary or
undecided voices. It draws on both NHS Lothian guides, ASHA's practice portal (gender-neutral and
flexible goals, citing Davies, Papp and Antoni 2015) and abstracts of Merritt (2023), Chadwick et
al. (2023) and Povinelli, Zhu and Zhao (2025). The overlap band is described as a guide, never a
target; no dial is pushed toward either end; and moving between voices is a choice, never a test.
With Which way set to Still open, its three chapters (`direction: open`) are Today's cards straight
after the warm-ups, in place of the chapters for one way. Like the rest, it is an AI editorial
piece, not clinician approval, and its chapters have no video yet. Mixing the dials shows the
darker–brighter strip, like both resonance chapters.

Also on 9 November, Looking after your voice gathered the course's voice care into one chapter,
from NHS Lothian's "Looking after your voice" leaflet (April 2026, adapted from NHS Fife), the NHS
laryngitis page, NHS Greater Glasgow and Clyde's hoarseness guidance, NIDCD and ASHA's 2026 World
Voice Day release. NHS Fife's own voice care page and the British Voice Association's leaflets
could not be read that day, so nothing in it rests on them. The NHS page and ASHA suggest a GP visit
when hoarseness hasn't improved after two weeks; the chapter says that, and keeps the course's
three weeks as the point not to wait. Its check-in questions are Lilt's own, not a questionnaire,
and nothing in them is scored. An AI editorial piece, like the rest.

Important next work: permitted matched audio demonstrations of pitch, resonance and weight;
review by a voice-specialist speech and language therapist; and real-user checks of comfort,
understanding and everyday carryover. Automated software tests do not establish training efficacy.

## A chapter file

```markdown
---
id: warmup
title: Warm-ups
subtitle: Hums and gentle glides
kind: hum
source_url: https://…
written_by: Instructions paraphrased from the source.
---

What the skill is, how it feels, and how you'll know you're on track: the intro shown in the box at
the top of the chapter. Several paragraphs are fine (leave a blank line between them), and
`**bold**` works.

## hum-comfortable

mmmmmmm

> The hint shown under the text.
```

- **Front matter** (between the `---` lines): `id`, `title` and `kind` are required; `subtitle`,
  `source_url` and `written_by` are optional, and so are:
  - `part`: the part of the course it belongs to (`Get ready`, `The skills`, `Bring it together`).
    Practice groups chapters under these headings.
  - `area`: the skill it trains, for Progress: `recording`, `resonance`, `pitch`, `lightness`,
    `intonation` or `carryover`.
  - `check_in`: the id of one text to record every visit (Practice marks it _Check-in_), so its
    takes show change over time.
  - `exercises`: built-in exercises (from `content/exercises/`, by id, comma-separated) that join
    this chapter in Today.
  - `today: false`: keep this chapter's texts out of Today's cards (Start here uses it).
  - `direction: higher`, `direction: lower` or `direction: open`: a chapter for one way of taking
    the voice (open is Still open: in between, or not decided). Today's cards use the chapters for
    the learner's Which way (unset reads as higher), and the ones for the other ways drop out;
    going lower or still open, its chapters take the place of the first one that dropped. A
    chapter without it is for any direction.
  - `video`, `video_title`, `video_by`: one YouTube video for the chapter (a link). Practice shows a
    card with YouTube's thumbnail and plays the video there; offline, the card says it needs an
    internet connection. `video_image: images/<file>` swaps in a picture of your own, which should
    be one you made or may share, not a copy of the creator's thumbnail.
- **`kind`** sets how the text is shown and read along: `hum`, `words`, `automatic`, `phrases`,
  `sentences`, `passage` or `prompt` (a question you answer in your own words).
- **Each text** starts with `## ` and a short id, unique in the chapter. The lines under it are
  the text (on one line, or wrapped; they're joined), and lines starting with `>` are its hint.
- **An example recording** (optional): put the file in `audio/` and add `example: audio/<file>`
  under the text. The text then shows a "Hear an example" player.

## Keep ids stable

Recordings and cards are linked by `text.<chapter id>.<text id>`, for example
`text.warmup.glide`. Changing an id starts that text fresh: older recordings keep the old id and
no longer show under it. Fixing the wording of a text or hint is fine.
