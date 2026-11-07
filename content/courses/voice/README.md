# Voice practice (a course)

This folder is Lilt's voice course: the reading material for its chapters and today's cards, and
`course.md`, which names the course, its kind of practice and the sections an AI may never change. Edit these files in any text editor,
or open this folder as an Obsidian vault. Restart Lilt afterwards (with Docker, rebuild:
`docker compose up -d --build`). If a file has a mistake, Lilt won't start and says which file.

These are the original texts, shared by everyone. To change them just for yourself, ask your AI
agent over MCP (see "Courses, and your own copy" in the main README): your version is kept in your
data folder, and these files stay as they are. Another course is another folder beside this one,
with its own `course.md`.

- `index.md`: the Practice home page (why it exists, how it works, sources). `cover: images/<file>`
  in its front matter sets the full-width banner at the top. `cover.webp` is an original generated
  illustration of a microphone, notebook and resting cat, matching the guide's artwork. The welcome page uses three original
  generated illustrations: `practice-corner.png`, `listening-nook.png` and `resting-cat.png`.
  The older `placeholder-*` files remain available for personal copies that still reference them.
  Point the Markdown at your own pictures if you prefer. Plain Markdown:
  `#`/`##` headings, paragraphs, `-` lists, `> ` quotes, `**bold**`, `_italic_`, `[links](https://…)`
  and pictures: put the file in `images/` and write `![what it shows](images/name.webp)` on its own
  line (it opens the same way in Obsidian).
  The list of chapters under it is added automatically.
- `_pitch.md`: the average speaking pitch for men and women (averages and standard deviations in Hz,
  the overlap band) and where those numbers come from. After each take, Lilt shows your middle
  pitch on that scale in words and semitones, never as a percentage or a score.
- `_about.md`: the edition (`version`), the date the sources were checked, and the note shown at
  the end of every chapter. Updates compares this edition: raising it offers the whole course to
  personal copies as one change. `course.md` has its own `version`, the course's listing in
  Courses (version 2 is when chapters began naming their own `exercises:`), so the two differ.
- `images/` and `audio/`: pictures for `index.md`, and example recordings for the texts.
- `_template.md`: a chapter to copy (it isn't loaded itself).
- `01-start-here.md` … `13-real-life.md`: one chapter each. `14-reading-room.md`, `15-stories.md` and `16-articles.md` are Extras shelves of longer passages (`part: Extras`, `today: false`), there to read whenever you want more. A passage of about 40 words or more shows its id as a title (`night-bus-2` reads "Night bus, part 2") and a reading time. The number at the start of the file
  name sets the order (and the order Today's cards open in). To add a chapter, add a file like
  `17-singing.md`. In `04-resonance.md`, each take of a held vowel has its resonance (F2 and F3)
  compared with your first take of the same vowel.

## How a lesson teaches

The chapters come in three parts: **Get ready** (setup and warm-ups), **The skills** (pitch,
resonance, vocal weight, articulation and intonation, one at a time) and **Bring it together**
(automatic speech, everyday phrases, reading, your own words, laughs and little sounds, real life).

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

The general MtF route and listening-resource list are on `index.md`. The 3 November review checked
the accessible ASHA and NHS Fife guidance and the YouTube resource metadata. It is an editorial
review, not clinician approval or a full review of the video content. The NHS Lothian PDF was
unavailable during that check. The course now avoids fixed weekly pitch increases, held swallowing
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
