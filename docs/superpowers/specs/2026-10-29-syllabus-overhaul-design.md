# Voice course overhaul: design

Status: draft for Julio's approval. Date: 2026-10-29.

## Why

Julio's words: the current guide is "lacking and lackluster". It doesn't cover everything a
transfeminine voice involves, says nothing about the microphone or how to get ready, and doesn't
feel warm. Every chapter should have takes you can repeat, so you can hear and see change over time.

The current course (`content/courses/voice`, 9 chapters) is mostly one idea: a ladder from humming
to conversation by length of speech, from NHS Fife's progression advice, plus a new Resonance check.
Pitch, vocal weight and intonation get no chapter of their own, and the chapter intros are a single
line each.

Lilt's own analysis supports a skill-by-skill course. Leung et al. (2018) found that pitch, resonance,
loudness, articulation and intonation all relate to perceived gender, with pitch the largest single
part (about 42 % of the variance). Leung et al. (2021) found F2 (resonance) and pitch were the only
predictors of the perceived gender category. Lilt measures pitch and, since this week, F2/F3.

## Goals

1. **Cover the whole voice**, one skill at a time, before bringing them together: getting set up,
   warm-ups, pitch, resonance, vocal weight, intonation, then carry-over into everyday speech and
   real life.
2. **A "Start here" chapter**: microphone and room (from what we found in Julio's own takes: they
   come in about 15–20 dB too quiet), getting your body ready, how to practise, and voice care.
3. **Repeatable takes in every chapter**: each chapter names one **check-in** text, the same every
   time, that you record whenever you visit. Lilt already compares a take with your first and last
   take of the same text (pitch, and now resonance); the check-in makes that the habit.
4. **Warm, friendly writing throughout**, in the first-person voice of the home page ("I built Lilt
   for myself…"): encouraging, plain, never clinical; no "right" or "wrong" voice; your ear decides.
5. **Every chapter explains before it asks**: what the skill is, how it feels in the body, and how
   you'll know you're on track, then the texts.

## Non-goals

- No new measurement. Vocal weight is taught by feel and listening; a weight measure is a later,
  separate piece of work.
- No changes to how recording, analysis, Today's scheduling or the Remix chat work, beyond what the
  new course needs (below).
- Not a medical programme. Lilt stays a practice tool and says when to see a GP or speech and
  language therapist.

## Anti-goals (a failure even if it works)

- Pushing pitch as high as possible, or framing anything as "passing" or a score.
- A clinical, textbook tone.
- Copying source text. Every exercise is Lilt's own wording, crediting the idea's source.
- Breathiness taught as the way to sound lighter (sources warn it's inefficient and dries the folds).

## The new course

Eleven chapters. Order is also Today's unlocking order (one stage per chapter). Each chapter lists
its area (for Progress), its check-in text, and where the ideas come from. Text lists are the
intended content; exact wording is the builder's (see "Writing").

| # | Chapter | Area | What it covers | Check-in (repeat every visit) | Sources |
|---|---|---|---|---|---|
| 1 | **Start here** | recording | Your mic (distance 20–30 cm, input volume, Mic Mode Standard, a quiet room, a headset is the best upgrade, same setup every time), getting ready (water, posture, release jaw/shoulders), how to practise (a few minutes, several times a day; record and listen), voice care (it should never hurt; stop on strain; hoarse over six weeks → GP). Texts: a level check and your **baseline**. | "Hello, this is my voice today." plus counting 1–10 | NHS Fife hub, progression page, voice-care page; NHS Lothian "What is it" and "Where to start"; NIDCD voice care |
| 2 | **Warm-ups** | resonance | Breath (hand on chest and belly, slow breaths), throat release (bite-an-apple mouth, misting a mirror), hum, lip trill, "ng", "zzz/vvv" on one easy note, then slow sirens. | A gentle hum, then a slow siren | NHS Fife breathing; NHS Lothian warm-up and relaxation |
| 3 | **Pitch: finding your range** | pitch | What pitch is, why higher isn't the goal on its own, finding a comfortable target (hum at your speaking pitch, glide up to a comfortable higher one and back), holding it on counting 1–5 then 1–20, the "cartoony" warning (high pitch with dark resonance). Links to Practice settings to set your comfortable range. | Count 1–5 on your target pitch | NHS Fife pitch tuning-in; Fife pitch-and-resonance activity 2; NHS Lothian |
| 4 | **Resonance: bright and forward** | resonance | The current Resonance check grows into this chapter (same chapter id `resonance`, so its held "ee", "ah", "oo" keep their ids and takes): what resonance is (the space above the voice box), finding the buzz (hum touching forehead, cheeks, chest), forward hum to tingling lips, m + vowels, m-words, smiling, tongue forward vs flat, a slight larynx lift, the "stifled giggle" open space; the held vowels are measured against your first take. | Held "ee" (`resonance/ee`, as now) | NHS Fife resonance tuning-in, pitch-and-resonance activity 1, articulation pages; Lilt's measure (`analysis/EVALUATION.md`) |
| 5 | **Vocal weight: light, not breathy** | lightness | What weight is (thin vs thick vocal-fold contact), a breathy sigh vs a pressed "ah" to feel the two ends, then finding the clear, light middle; why breathy isn't the answer. Listen-only feedback (no measure yet; said plainly). | A light, clear "ah… hello" | NHS Fife vocal-cords tuning-in; NHS Lothian voice quality |
| 6 | **Intonation: the melody** | intonation | What intonation is, reading one passage three ways (plain, storyteller, gentle news), exaggerated rise and fall on short real phrases, rises for emphasis, avoiding monotone. | One short passage, read with melody | NHS Fife intonation tuning-in and lighten/brighten intonation; NHS Lothian |
| 7 | **Automatic speech** | carryover | Counting, days, months, counting 50–75: easy, automatic words to hold everything together. (Replaces "M and N words" and "Automatic speech".) | Days of the week | NHS Fife progression ladder |
| 8 | **Everyday phrases** | carryover | Short phrases you'd really say (coffee, thanks, directions), then your name and a short intro. | "Hi, could I get a coffee, please?" | NHS Fife progression and intonation pages |
| 9 | **Sentences and reading** | carryover | Longer sentences, then short passages. (Merges "Smooth sentences" and "Short passages".) | One fixed short passage | NHS Fife progression ladder |
| 10 | **Your own words** | carryover | One minute of free talk on easy prompts. (Was "Your own words".) | "Tell me about your day" (one minute) | NHS Fife progression ladder |
| 11 | **Real life** | carryover | Answering the phone, a call script, ordering, asking a stranger, talking with someone close. | Answering the phone | NHS Fife progression ladder; NHS Lothian goals (phone) |

**Home page** (`index.md`): keep Julio's voice and story; rewrite "How it works" for the new shape
(skills first, then bringing them together), point to Start here, and update Sources to the new list.

**Sources** (all opened and checked on 2026-10-29): NHS Fife "Supporting you to find your authentic
voice" and its tuning-in, shaping and progression pages; NHS Fife "How to take care of your voice";
NHS Lothian "Voice and Communication Therapy for Trans and Non-binary People" ("What is it" and
"Where to start", Feb 2026); NIDCD "Taking care of your voice"; Leung, Oates & Chan (2018, JSLHR
61(2)); Leung, Oates, Chan & Papp (2021, JSLHR 64(7)). URLs are in the research notes and go in each
chapter's `source_url` and the home page's Sources.

## Course format changes

- **`check_in: <text id>`** in a chapter's front matter names its check-in text. Practice shows it
  first with a small "Check-in · record each visit" badge; everything else about takes stays the same.
- **`area: <recording|resonance|pitch|lightness|intonation|carryover>`** in front matter replaces
  the chapter-id table in `server/src/practice/cards.rs` (`level_area`), so a course (or someone's
  mixtape) sets its own areas. These are the areas Progress, Library and Feedback already use
  (`AREA_LABEL` in `web/src/api.ts`); no new areas, so Progress doesn't change.
- **`exercises: <ids>`** in front matter replaces the hard-coded `exercise_after` table in
  `cards.rs`: which built-in exercises (`content/exercises/*.json`) join that chapter's stage.
- **Richer intros**: the chapter intro (before the first `## text`) becomes Markdown with several
  paragraphs (today it is joined into one line). The box at the top of a chapter shows it.
- **`today: false`** in front matter keeps a chapter's texts out of Today's cards (used by Start
  here, whose texts are a level check and a baseline, not drills). A chapter with no cards takes no
  stage, so Today's unlocking never stalls on it.
- **Check-ins are ordinary texts**: they're Today cards like any other (spaced and rated); the badge
  in Practice only says "record it each time you visit".
- **Older copies keep working**: a chapter without `area` or `exercises` (anyone's own copy made
  before version 2) falls back to today's tables by chapter id.
- **Taking the update**: version 2 renames and removes most chapter files. Someone with their own
  copy is offered it as one whole update, never left half old and half new; the builder checks
  `server/src/courses/updates.rs` handles added and removed files and adds that if not.
- Update `content/courses/voice/README.md` and `_template.md` for these keys.

## Decided with Julio

- A full overhaul, replacing the current course in place (not a second course).
- Start fresh: new text ids. Old takes stay in Recordings and Progress but no longer show under
  chapters. The current Resonance check keeps its ids (`resonance/ee|ah|oo`), so its takes carry on.
  Today starts over from the first chapter with cards (Warm-ups); old card states are kept on disk
  but match no card.
- Every chapter has a repeatable check-in.
- Mic requirements and preparation get their own chapter; the writing is warmer and friendlier.

## Builder's calls (Claude's, not agreed with Julio)

- The exact chapter list and order above, and merging some current chapters (including the
  Resonance check into the Resonance chapter).
- Areas reuse the existing ones: vocal weight is `lightness`, Start here is `recording`, Warm-ups
  `resonance` (as the current warm-ups are).
- Check-ins are also Today cards; Today restarting is the consequence of starting fresh.
- Writing all texts and hints in Lilt's own words; first person on the home page, "you" in chapters.
- Course `version` goes to 2, so anyone with their own copy (mixtape) is offered the update.
- The daily reference card (count 1–10) stays as it is.
- The Rainbow Passage is not reproduced (copyright unclear); Lilt writes its own short passages.

## Left to the builder

Exact wording of texts, hints and intros; how many texts per chapter (about 3–6); tests and e2e
checks that name current text ids; the `kind` of each chapter (from the existing kinds); styling of
the check-in badge.
