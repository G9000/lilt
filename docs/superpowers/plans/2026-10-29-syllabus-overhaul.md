# Voice course overhaul: implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Lilt's voice course with eleven skill-by-skill chapters (Start here … Real life), each with a warm multi-paragraph intro and a check-in text, driven by new front-matter keys instead of tables in code.

**Architecture:** Course files stay Markdown parsed by `server/src/courses/texts.rs`. Four new optional front-matter keys (`area`, `exercises`, `check_in`, `today`) flow through `texts()` JSON to `cards.rs` (Today) and `Voice.tsx` (Practice). Missing keys fall back to today's id tables so older copies keep working.

**Tech Stack:** Rust (axum, serde_json), React/TypeScript (Vite), Markdown content.

**Spec:** `docs/superpowers/specs/2026-10-29-syllabus-overhaul-design.md`

## Global Constraints

- Areas are only: `recording`, `resonance`, `pitch`, `lightness`, `intonation`, `carryover` (`AREA_LABEL` in `web/src/api.ts`).
- Chapter ids: `start-here`, `warmup`, `pitch`, `resonance`, `weight`, `intonation`, `automatic`, `phrases`, `reading`, `own-words`, `real-life` (files `01-…` to `11-…`).
- `resonance` keeps texts `ee`, `ah`, `oo` with their ids; every other text id is new.
- All wording is Lilt's own; never copy source text; never "as high as possible", "passing", or a score; breathiness is not the goal.
- `course.md` and `_about.md` version 2.
- Sources (checked 2026-10-29) are the URLs in the spec's research notes.

## Review Focus

1. A chapter with `today: false` (no cards) must not stall Today's stage unlocking: the next chapter's cards still open.
2. An older copy whose chapters lack `area`/`exercises` keeps the same areas and exercise cards as before (fallback by chapter id).
3. `check_in` naming a text id not in the chapter is an error when the course loads (as other format mistakes are), naming the file.
4. Multi-paragraph intros render as separate paragraphs in Practice and still load in the Remix/Mixtape views.
5. Takes of `resonance/ee|ah|oo` still show under the Resonance chapter after the change.

---

### Task 1: Front-matter keys through the server

**Files:** Modify `server/src/courses/texts.rs` (chapter parse + tests), `server/src/practice/cards.rs` (`level_area`, `exercise_after`, stage numbering), `server/src/practice/tests.rs`.

**Interfaces — Produces:** each level JSON gains `area: string|null`, `exercises: string[]`, `check_in: string|null`, `today: bool` (default true), `basis: string` keeping paragraph breaks (`\n\n`).

- [ ] Test (texts.rs): a chapter with `area: pitch`, `exercises: a, b`, `check_in: two`, `today: false` and a two-paragraph intro parses to those values; `check_in: missing` errors with "check_in".
- [ ] Test (practice): a course whose first chapter has `today: false` still opens the second chapter's cards on day one; a chapter without `area` gets `level_area(id)`.
- [ ] Implement: `exercises` is comma-separated; `today` is `false` only for the literal `false`; cards skip `today: false` chapters and number stages over chapters that have cards; area = front matter else `level_area`; exercises = front matter else `exercise_after`.
- [ ] `cargo test` passes; commit.

### Task 2: Practice shows intros and check-ins

**Files:** Modify `web/src/api.ts` (`TextLevel`), `web/src/pages/Voice.tsx` (how-to box, item list), `web/src/styles/editor.css`, `web/src/readalong.ts` (level ids `m-words`→`resonance`, `passages`→`reading`).

- [ ] The how-to box renders `basis` paragraphs (split on blank lines) through the existing `Markdown` component; the check-in text is listed first with a "Check-in · record it each visit" badge.
- [ ] `npx tsc --noEmit` and `vite build` pass; commit.

### Task 3: The eleven chapters and home page

**Files:** Delete `content/courses/voice/0[1-8]-*.md`, rename `09-resonance.md`→`04-resonance.md`; create the other ten; modify `index.md`, `_about.md`, `course.md`, `README.md`, `_template.md`.

- [ ] Write each chapter per the spec table: intro (what it is, how it feels, on track when, care note where relevant), 3–6 texts with hints, `check_in`, `area`, `source_url`, `written_by` crediting sources. Exercises: `warmup`→`nhsfife.forward-hum`, `automatic`→`nhsfife.gentle-pitch-count`, `phrases`→`nhsfife.smile-brighten, nhsfife.real-phrases-intonation`. Start here has `today: false`.
- [ ] `cargo test courses::texts` (chapter count 11) passes; commit.

### Task 4: Tests and e2e follow the new ids; updates button

**Files:** `server/src/courses/tests.rs`, `server/src/courses/syllabus.rs` tests, `web/e2e/practice.mjs`, `web/e2e/flow.mjs`, `web/src/pages/Practice.tsx` (`READ_LEVEL`), `web/src/pages/Voice.tsx` (`UpdatesDoc`).

- [ ] Replace `02-m-words.md`/`01-warmup.md` and old text ids in tests with new files/ids; e2e opens `#/studio/warmup` and its first text.
- [ ] `UpdatesDoc`: when there are choices, a "Take all of Lilt's new versions" button sets every pick to `original`.
- [ ] All suites pass (cargo, node unit, flow.mjs, practice.mjs on fresh data); commit.

### Task 5: Verify and ship

- [ ] Browser check: Practice home, Start here, Resonance (old takes still listed), a check-in badge, phone width, dark.
- [ ] One fresh reviewer reads the whole diff; fix findings; update DESIGN.md and docs/courses.md; commit; `docker compose up -d --build`.
