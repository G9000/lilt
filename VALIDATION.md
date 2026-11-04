# Lilt: validation report

## 4 November 2026: Music app and compact top-bar player

The oversized music popover is replaced by a routed Music app with record artwork,
nine moods, volume/transport controls and expand/restore. A compact player stays in
both top bars after closing, including while paused. Music is also in the dock.
The Spotify host remains mounted across navigation, expansion and source changes.

Isolated Chrome checks cover opening without autoplay, mood selection/skip, mute and
volume persistence, close/reopen and return route, animated room focus return, compact play/pause, lo-fi mic ducking,
expand/restore, mobile/dark layout and the existing room regressions. A mocked Spotify
iframe controller verifies real UI play/pause actions and that closing, expanding and
source switching do not destroy/recreate its host. Delayed AudioContext resume verifies
that switching away cannot leave a late lo-fi start playing. This does not establish
real Spotify account/provider playback or physical audio-device behavior.

Web types, 108 unit tests/build, server formatting/strict Clippy/70 tests, Python
(47 passed, one platform skip) and desktop formatting/release Clippy pass. Owner data
and port 7878 were untouched. Existing bundle advisory remains; Safari is untested.

## 4 November 2026: painted music player and desk actions

Four v3 room backgrounds replace the small left monitor with a cassette player while
retaining main/right screen customization and the repaired cat. Camera opens Photos;
microphone follows the existing Practice entry. Music reuses lo-fi, volume and Spotify.
The duplicate floating radio is removed. Landscape cards leave the camera clear, and
mobile/portrait shortcuts keep cropped objects accessible. The room cannot scroll when
focus moves to an object.

Isolated Chrome checks pass: real home camera/Practice navigation, no autoplay on opening,
previous/next mood, saved volume, play/pause, microphone claim/release ducking and resume,
playback retained after panel close, Escape focus return, outside/route dismissal, Spotify
setup availability, mobile panel fit and portrait tablet Photos shortcut. Existing lighting,
independent monitor settings, persistence/reset, cross-tab, cat/framing checks also pass.
Four lighting variants and the rendered music panel were visually inspected.

Web types, 108 tests and build pass; server formatting/strict Clippy and 70 tests pass;
analysis has 47 passes and one platform skip; desktop formatting/release Clippy pass.
Restricted temporary/cache permissions initially blocked native tests; they passed when
rerun with normal test-folder access. No owner data or port 7878 was used. Spotify real-account
playback, physical audio hardware and Safari are not newly tested. Existing bundle advisory remains.

## 4 November 2026: artwork and cat repair, independent monitors

Versioned generated paintings preserve the familiar room with simpler coherent props and
matching four-light variants. The new night illustration keeps interior midtones visible.
A single transparent cat sits over empty painted bedding; detached tail/ear layers are no
longer requested. The main and side monitor preferences save independently, including migration
from previously saved side-only settings. Source artwork is retained for comparison.

Verified in isolated Chrome using the actual room and the full home with practice APIs blocked:
both monitor pictures persist independently, reset restores both, light/temperature effects
work, the cat has real transparent alpha and responds to petting, all of the cat fits the
1440px desktop framing, and the main monitor remains visible at 1024×1366 and 1000×950.
The new night bed/chair sample is visibly brighter (mean encoded luminance about 96 versus
28 previously; this is a relative image check, not calibrated display luminance). All four
lighting screenshots and monitor placement were visually inspected. Browser checks also cover
mobile scrolling, focus/route dismissal, cross-tab updates and reduced-motion rendering.

Web typecheck, 108 unit tests/build, server formatting/strict Clippy/70 tests, Python (47 passed,
one platform skip), and desktop formatting/release Clippy pass. No owner data or service on
port 7878 was used. Existing bundle advisory remains. Real phones and Safari are untested.

## 4 November 2026: original room customization

Removed the rejected painted/sketched 3D experiments, their routes, generated assets and
Three.js dependencies. The original illustrated home now offers Make it yours: automatic
or fixed painted lighting, a subtle warmth wash, fairy-light controls, and existing local
artwork on the side monitor. Choices are validated and kept in browser storage.

Verified with the real room in isolated Chrome: actual fairy-light pixel changes, matching
painted light layers, warmth and monitor decor, reload persistence, reset, cross-tab changes,
keyboard dismissal/focus return, computer hit-target alignment, and 390/768px layouts.
The full home was also tested with practice APIs blocked: its card stack does not cover the
panel, and keyboard entry to Practice closes the panel. Desktop/mobile screenshots inspected.
No owner practice data or server on port 7878 was used.

Web typecheck, 106 unit tests and production build pass. Server formatting, strict Clippy and
70 tests, Python (47 passed, one platform skip), and desktop formatting/release Clippy passed
in the same work session; no native or analysis source changed. The existing main-bundle size
advisory remains; the separate 3D bundle is gone. Real phones and Safari remain untested.

## 4 November 2026: one development command

`bun dev` runs the Rust server and Vite together using Bun's parallel script runner. The server
script first syncs the locked Python helper environment and builds Rust from the repository root.
`bun dev:web` and `bun dev:server` run each side separately. Rust changes need a restart.

Verified on Windows with temporary data and Rust on port 7979:

- The actual `bun dev` command starts a healthy Rust server and serves the Vite HTML. Vite used
  port 5174 because 5173 was occupied; the existing process was left alone.
- Terminating the parent command releases both test ports, including descendant processes.
- Holding the scratch Rust port open causes startup to fail, returns a nonzero exit code and
  stops Vite as well.
- Root type checking and all 103 frontend unit tests pass; `git diff --check` passes.

The Vite API proxy still targets port 7878; this check fetched the scratch Rust health endpoint
directly and checked the UI separately. No owner practice data or server on port 7878 was used.
macOS/Linux signal handling was not exercised in this pass.

## 4 November 2026: Bun workspace

The private root workspace manages `web` with Bun 1.4.2. All 221 dependency name/version pairs
match the previous pnpm lockfile. The launcher, Docker web stage and Mac build use the root
workspace; Node still runs Vite and the existing tests.

Verified on Windows with Bun 1.4.2 and Node 24.22.1:

- A fresh `bun install --frozen-lockfile` succeeds with the old pnpm installation moved aside.
  Repeating it after removing both pnpm lockfiles makes no changes.
- Root `bun run typecheck`, `bun run build` and `bun run test` pass (103 frontend tests).
  Vite still reports the existing large-bundle advisory.
- All nine settings/comparison browser regressions and the feedback browser check pass against
  isolated Vite fixtures with the Bun-installed dependencies.
- Server formatting, strict Clippy and all 70 tests pass with the real Python helper.
  Python has 47 passing tests and one macOS-only skip. Desktop formatting and release Clippy
  pass after fetching the locked dependencies. Rust still reports its hard-link cache fallback.
- Both Bash build scripts pass syntax checks. A temporary launcher copy with a failing Bun
  command exits with that failure before attempting to build or start the server.

Docker's engine was unavailable, so the container build was not run. Mac app/DMG packaging was
not run on Windows. No owner practice data or server on port 7878 was used.

## 4 November 2026: settings saves and comparison switches

Settings saves are ordered across closing and reopening the pane. Only confirmation of the latest
edit shows Saved; an older failure cannot replace the newer edit's status. Qualities preserve commas
and spaces while you type. Changing a comparison pair clears its recordings, measurements and errors,
and late responses from the old pair are ignored.

Verified on Windows with isolated browser fixtures and simulated API responses:

- `node --test e2e/settings-comparison.mjs`: nine browser regressions pass, covering overlapping
  saves, leaving/reopening, older failures, typed qualities, pair switches and late results/analyses.
  The original seven cases failed before the fixes; the additional reopening case caught and
  verified a correction to the first implementation.
- Existing feedback browser regression, 103 frontend unit tests, TypeScript and production web
  build pass. The existing large-bundle advisory remains.
- All 70 server tests pass with the real Python helper and a writable scratch temp folder.
  Server formatting and strict Clippy pass; the compiler reports its existing hard-link cache fallback.
- Python: 47 passed, one skipped (macOS `say`). Desktop formatting passes. Desktop release Clippy
  could not run offline because locked `tauri-plugin-opener` 2.7.2 is absent from the local cache.

No owner recordings or server on port 7878 were used for testing. Safari and the Mac desktop build
were not validated in this pass.

## 3 November 2026: width controls removed

Removed the experimental section width/column controls, document grouping and expanded-layout
styles at the owner's request. Guide and chapter documents use the standard reading column again;
old saved width preferences are ignored. The monitor glow and exercise-number spacing fixes remain.

Verified: production build, all 60 remaining frontend tests, the course browser check across six
widths (including old saved preferences), and the Markdown matrix across five widths, both themes
and normal/largest text. The restored desktop reading layout was visually inspected.

## Earlier 3 November 2026 pass: section layouts (removed above) and corrected monitor glow

Replaced the global Wide view toolbar with floating controls for individual guide/chapter sections:
Normal width, Full width and Two columns. Preferences are independent and survive reloads.
Numbered instructions form paired rows on wide screens and stack on phones. The monitor's static
glow now follows its actual painted polygon, avoiding distortion from the transformed click target.

The production build and all 63 frontend tests pass. The built-app browser check verifies section
independence, persistence, real two-column placement, mobile stacking, menu keyboard dismissal,
reference/footnote links, and overflow across six widths with normal/largest text. The Markdown
matrix and feedback regression also pass. Desktop columns and the new monitor glow were visually
inspected. Checks used Chrome on Windows and emulated touch; physical phones and Safari remain
untested. The existing large-bundle build advisory remains.

## Earlier 3 November 2026 pass: monitor invitation and reading width (superseded above)

The room's middle monitor now has a resting glow and a visible click/tap cue. The halo strengthens
on hover/focus; reduced motion preserves the static invitation. Entry hides the cue. Added a saved
Wide view preference for Home, chapter and update documents on larger screens. Wide blocks use
more space while prose and footnotes keep a bounded width; exercise numbers remain inside the page.

The production build, 60 frontend tests, Markdown browser matrix and feedback regression pass.
The built-app check additionally verifies mouse, keyboard and emulated-touch entry, the reduced-motion
cue, width changes and reload persistence, and wide layouts at 320/390/768/1024/1440/1920 px with
normal and largest text. Desktop/phone room previews and a wide document preview were inspected.
Checks used Chrome on Windows; physical mobile devices and Safari were not tested. The existing
large-bundle build advisory remains.

## 3 November 2026: shared UI and Markdown

The shared Markdown renderer now uses CommonMark and GFM, with nested lists, all heading levels,
tables, task lists, code blocks and footnotes. HTML execution and unsafe URL schemes remain blocked.
Images preserve their proportions. Tables/code scroll within the document, and document links and
keyboard scrolling do not trigger app navigation or practice shortcuts. Home and rich chapter
introductions keep complete Markdown together, so references and multiline blocks survive.

The shared layout has a clearer heading scale, consistent prose spacing, wider reading columns,
flowing chapter actions, larger mobile navigation targets, and responsive settings/rating controls.
Home prioritizes actions and the chapter catalog; the full authored guide is expandable.

Verified on Windows/Chrome with isolated test data and no microphone:

- `node --test src/*.test.ts src/room/*.test.ts`: 60 frontend tests pass.
- TypeScript and the production web build pass; the existing large-bundle advisory remains.
- `node e2e/markdown.mjs`: subject-neutral content at 320, 390, 768, 1024 and 1440 px,
  both themes and normal/largest text. Checks Markdown structure, safe links, footnotes,
  image proportions, title/action overlap, nested tip layout and horizontal overflow.
- `node e2e/course-review.mjs`: seven real app screens at 320, 768 and 1440 px in both
  themes/text sizes, plus a synthetic general-interest course testing complete Markdown documents,
  reference links, next-chapter routing and keyboard scrolling in code/footnotes.
- `node e2e/feedback.mjs`: recording-feedback regression check still passes.
- Desktop/mobile screenshots were inspected. Safari and physical mobile devices were not tested.

## 3 November 2026: syllabus and feedback review

The general MtF learning route and resource list were clarified; pitch, resonance, weight,
articulation and intonation wording was revised against accessible ASHA and NHS Fife guidance.
External YouTube link titles/creator credits were checked, not the full video instruction.
The NHS Lothian PDF was unavailable during this review. No clinician review or human voice-outcome
validation is claimed. See `content/courses/voice/README.md` for the remaining teaching work.

Verified on Windows in this pass:

- All 57 frontend unit tests passed; TypeScript and production web build passed (existing large-bundle warning).
- All 23 course tests passed. All 131 text ids/spoken texts and 16 check-ins remain unchanged.
- `web/e2e/feedback.mjs`: reproduced and fixed stale pitch/suggestion/resonance when changing takes,
  and the pitch-scale setting failing to update mounted views. Uses synthetic analysis, no microphone.
- `web/e2e/course-review.mjs`: actual built app with isolated temporary data; course navigation,
  revised guidance, 16 chapters, desktop and 390 px phone layouts, light/dark screenshots inspected.
- Native server build passed. POSIX-only analysis tests are now Unix-gated so the Windows test
  binary compiles. A stale filename-only validation-error assertion was corrected.

### Follow-up: audio failures, formatting and lint resolved

The eight analysis-dependent Rust failures came from a missing analysis environment and a Unix-only
interpreter path. Installed the existing locked Python 3.12 dependencies with `uv sync --locked`;
the dependency lockfile did not change. The app and tests now share a platform-specific default:
`analysis/.venv/Scripts/python.exe` on Windows, `analysis/.venv/bin/python` elsewhere. The app still
honours `LILT_PYTHON` overrides. Setup instructions are in `docs/guide.md`.

Rechecked on Windows:

- `cargo test --offline --all-targets --all-features`: **66 passed, zero failures**, including all
  eight previously failing analysis, coaching and recording cases with the real Python helper.
- `uv run --locked pytest -q`: **47 passed, one skipped**. The skipped case requires macOS `say`.
  Two POSIX-specific Rust process tests are Unix-gated and were not run on Windows.
- `cargo fmt --all -- --check`: passed after applying standard formatting across the Rust sources.
- `cargo clippy --offline --all-targets --all-features -- -D warnings`: passed, with no lint
  suppressions added. Mechanical suggestions were reviewed separately from formatting; complex
  tuple types were named, and a constant invariant is now asserted at compile time.
- Native server build, all 57 frontend tests, TypeScript, web build and both browser checks above
  passed again. The web build retains its existing non-blocking large-bundle advisory.

An independent code review found no actionable regressions. These are software and synthetic-audio
checks; they do not validate natural-voice accuracy or voice-training outcomes.

The original report below is historical; its counts and feature-gap lists describe the first release.

## First release, 26 October 2026

This report keeps four questions apart, as PRD §14 requires: does the **software** work, are the
**measurements** accurate, is the **coaching** valid, and do **long-term voice outcomes** improve?
Passing one says nothing about the others. Everything below names how it was checked.

## Capability matrix (verified state)

| Area | Guided practice | Acoustic measurement | Listening / feedback | Validation status |
| --- | --- | --- | --- | --- |
| Listening & goals | A/B playback, favourites, notes, preference on retry | None (preference is the learner's choice) | Learner's own listening | Not applicable |
| Lightness | **Smile to brighten** (NHS Fife, source_checked); forward hum is also listed under lighten/brighten | **None** | Learner's A/B judgement → rule-based pointer | No perceptual validation. Automatic judgements disabled |
| Resonance | **Forward hum** (NHS Fife, source_checked) | F1–F3 medians on the loud voiced frames (lilt-analysis/4); F2/F3 change shown only between takes of the same text, mic and method | Self-report of where the vibration is felt → rule-based cue; the F2/F3 change is described in words | Synthetic vowels and synthetic speech with known formant and pitch changes only (`analysis/EVALUATION.md`). No natural-speech or perceptual validation. Automatic judgements disabled |
| Pitch | Gentle pitch and counting (NHS Fife, source_checked) | F0 median, p10/p90, p10–p90 span (st), SD (st), contour, coverage, quality flags | Self-report; measurements shown **descriptively only** | Synthetic fixtures only. **Not validated on natural speech, so it never drives pointers or plans** |
| Intonation | Real-life phrases (NHS Fife, source_checked) | Pitch span (descriptive) | Self-report | No judgement of correct intonation |
| Carryover | **Carryover ladder** (NHS Fife, source_checked) + unscripted answer each session | Descriptive only | Self-report; 2 consecutive "comfortable and consistent" sessions before the next step is offered (Lilt's own rule) | Reading-only evidence explicitly not treated as conversational ability |

## 1. Software correctness: verified

| Check | How | Result |
| --- | --- | --- |
| Rust acceptance tests | `cd server && cargo test` (24 tests, including the Markdown practice texts; real Python helper, fixture audio; 5 cover the card scheduler: interval growth and caps, first deck, rating + idempotency + same-day "again", no backlog after missed days, hurt → suspend + pause → resume) | **24/24 pass** (28 Oct 2026; the new one re-measures a stale take, keeps its earlier run and checks the helper reports the expected method version) |
| Analysis tests | `cd analysis && .venv/bin/python -m pytest` (28 tests, including a 190 Hz voice with mildly uneven cycles that the old octave cost tracked at 95 Hz) | **28/28 pass** (28 Oct 2026) |
| Live pitch tracker and display cleanup | `cd web && node --test src/pitch.test.ts` (27 tests; includes quiet held notes, phrase endings, gain changes, octave mistakes, sustained register changes, pauses/time gaps, immutable source contours, and the slower fallback tracker) | **27/27 pass** (29 Oct 2026). Clean harmonic tones from 90–500 Hz remain within 1%; synthetic filtering checks do not establish natural-speech accuracy |
| Recording lock in Chrome | Vite running, then `cd web && node --test e2e/recording-lock.mjs`: actual Web Locks and MediaRecorder with a fake microphone, stubbed API, isolated browser storage | **9/9 pass** (29 Oct 2026): competing tabs, no take API call on refusal, final audio tail, double starts, tab closure, constructor/start failures, refused take creation, cancellation, recorder errors, and same-page fallback without Web Locks. Cross-tab protection is for the same origin only |
| Filtering and recording lock in installed Safari 26.6.2 | `web/e2e/safari.mjs` and `safari-browser.ts`, opened in actual Safari with two tabs; generated 220 Hz audio, disposable data directory, real local API/storage/Praat; Remote Automation stays disabled | **38/38 pass** (29 Oct 2026): the same 27 pitch tests, live AudioWorklet tracking (median 220.0214 Hz), nine recording-lock checks (competing tabs, tail, double starts, constructor/start failure, refused creation, cancellation, recorder error, tab closure), and native MP4 save/decode/Praat (220.0005 Hz; 2.6224 s). Live tracker constructed by a real button click for Safari audio activation. Default capture selected WebM/Opus; MP4 was explicitly exercised too. [Machine-readable results](docs/validation/safari-2026-10-29.json). **Not tested:** physical microphone/permission flow, full practice UI, iOS/iPadOS, or fallback with Web Locks disabled in Safari |
| Take notes in words, and the pitch reference scale | `cd web && node --test src/insight.test.ts` (5 tests: comfort first, end drop, below range, level, lively, steady, nothing to say; placing a pitch in words and semitones, never a percentage) | **5/5 pass** (28 Oct 2026) |
| Practice window, end to end | `web/e2e/practice.mjs`, fake audio device, fresh temporary data folder, real local API and Praat helper, 1440×900 then 390×844: first run, free/chapter/Today takes, rating, sidebar, phone recorder, competing-tab warning, retry after the other tab stops, and release when leaving a recorder | **21/21 pass** (29 Oct 2026). No page errors; refused starts keep Record available and do not offer saving an empty take |
| Web regression suite and production build | `cd web && node --test src/*.test.ts src/room/*.test.ts`, TypeScript check, Vite build | **45/45 pass**, type check and build pass (29 Oct 2026). Vite reports the existing bundle-size advisory |
| Syllabus teaching revision | `cargo test courses::` and `cargo test practice::tests::`; real `/api/texts` and `/api/deck/today` against a fresh temporary profile; compare earlier IDs and spoken texts | **22/22 course tests and 7/7 practice tests pass** (29 Oct 2026). All 11 chapters and 65 texts load; a fresh deck offers the reference, `text.warmup.hum` and `text.warmup.hum-to-hello`. All 61 earlier exercise IDs and spoken texts are unchanged. Four new phrase cards, clearer listening checks and consistent voice-care wording. Edition stays at 2 for piece-by-piece updates. Dedicated A/B recordings remain missing; no clinician review or learner-outcome validation |
| Bug-fix and resonance pass | `cd server && cargo test`, `cd analysis && uv run pytest`, `cd web && node --test src/*.test.ts src/room/*.test.ts`, type check, Vite build; then the built app on a throwaway data folder: room, sticky note, Real life and Warm-ups chapters, and `curl` with a rebound Host header | **62/62 server, 48/48 analysis, 45/45 web pass**, type check and build pass (31 Oct 2026). Eight new server regression tests (rebound host names refused, a learner's pause kept by automatic reviews, no analysis left for a take deleted mid-run, a timed-out helper reaped, the daily reference not using a new-card slot, one plan version per concurrent write, reminder time stored as HH:MM, no panic on a huge history window). One analysis test: formants come from the loud vowel, not a longer quiet hum (fails with the old frame choice: 839 Hz vs 1210 Hz, truth 1250). A rebound Host gets 403 on `/api/profile` and `/api/export`; localhost and 127.0.0.1 get 200. Enter on the sticky note edits it without leaving the room. All 11 chapters and 69 texts load. **Not tested in a browser:** desk radio/Spotify pausing races, reduced-motion room, card-pile clamping, cross-tab recovery, the CRLF Markdown fix and the web error paths (checked by reading and type check only) |
| Browser end-to-end, desktop 1100×900 | `web/e2e/flow.mjs` driving installed Google Chrome (headless) with Chrome's **fake audio device** fed by macOS `say` speech | **38/38 pass** on 28 Oct 2026, after updating the script for the Practice changes (nothing picked when opened from the computer, the chapter tree, the recorder's layout). Before that: **29/29**, adding checks for the reading desk, the read-along highlighter, pitch under words, Texts, live pitch, steadiness, comfortable range and theme. The earlier intermittent failure turned out to be a race in the test: it read the page before the evidence recording had loaded. It is fixed, with 3 consecutive clean runs since |
| Browser end-to-end, phone size 390×844 | Same script, `MOBILE=1` (mobile viewport in desktop Chrome) | **35/35 pass** (27 Oct 2026, after the voice deck) |
| Voice deck in the browser | Same script: deck home → record each card → rate with keys → an "again" card returns in the same run → end comfort check → home shows "Deck done", then the guided session | **35/35 pass** at desktop, including 6 new deck checks |
| MCP over HTTP, real client | Claude Code 2.1.286 (`claude -p --mcp-config`) against synthetic test data | Round trip worked (details in §5) |
| MCP over stdio | JSON-RPC initialize → tools/list → tools/call piped to `lilt mcp-stdio` | Works |
| Docker | See §6 | See §6 |

### Acceptance scenarios (PRD §14)

| Scenario | Status | Evidence |
| --- | --- | --- |
| Real session | **Verified (fake mic)** | E2E: mic check → reference → exercise → self-check → follow-up → spontaneous → comfort → saved → real Praat analysis → pointer → retry → compare |
| Useful coaching | **Verified** | `useful_coaching_selects_a_cue_and_matched_retry_updates`: "throat or chest" self-report → `practice_focus` with registry cue `nhsfife.forward-hum/smile` (use_when=target_not_met), plan keeps task with new cue, matched retry linked via `retry_of`, updated review reflects retry. Also in E2E |
| Required content | **Verified** | Beginner lightness (smile-brighten), resonance (forward-hum) and carryover (progression-ladder) activities, all source_checked |
| Start today's task | **Verified** | E2E opens on "Forward hum", rationale and cue, with one Start today button and no lesson picking |
| Evidence playback | **Verified** | Self-report evidence shows "no moment is marked" (E2E); measured capture/comparison evidence carries real segments (clipping regions, voiced spans) highlighted in the waveform |
| Guided retry | **Verified** | E2E: retry keeps task + cue, playback paused before capture, separate take with `retry_of`/`triggered_by_review`/`triggered_by_pointer`, A/B pair opens |
| Skill-state separation | **Verified** | `skipped_and_missing_evidence_never_becomes_a_low_state`, `silence_gives_no_pitch_and_a_capture_pointer` (→ `recording_issue`, not low) |
| Appropriate next action per state | **Verified for:** not assessed, recording issue, more evidence, stable, practice focus, progress | Unit tests above + `stable_and_next_context_need_repeated_sessions` |
| Goal-specific pointers | **Verified** | Every rules pointer carries task, goal connection, evidence, confidence basis; next context is *proposed*, plan changes only on acceptance |
| User disagreement | **Verified** | `disagreement_is_kept_and_carried_forward`: review bytes unchanged, note stored in `.responses.jsonl`, next review cites it; E2E UI path |
| Container recreation | See §6 | Also native: reopening the same data root keeps identical hashes (`interrupted_take_…` test) |
| Interrupted upload | **Verified** | Missing-tail finalize labelled `missing_tail`; un-finalised chunks recovered at restart as `interrupted` with byte-exact prefix; browser IndexedDB re-sends unconfirmed chunks |
| Analysis crash | **Verified** | Broken helper → `analysis_failed`, audio intact; job left `running` re-queued at restart; one result, no duplicates |
| Duplicate request | **Verified** | Same chunk → 200 duplicate; conflicting chunk → 409; double finalize → same take, one job; same review key → same review (rules and agent) |
| Silence or poor signal | **Verified** | F0 `null` with reason, no contour; `low_signal`/`insufficient_voiced` capture pointer |
| Changed task or device | **Verified** | `not_comparable` with reasons |
| Same audio twice | **Verified** | Identical measures; comparison `stable` (Δ = 0) |
| No usable audio for model | **Verified** | Hearing claims rejected when `received_audio` false; model-perceived evidence rejected while disabled; Claude Code reported it did not perceive the clip |
| Invalid recommendation | **Verified for listed patterns** | Rejected: nonexistent take, mismatched quoted measure (999 vs stored), numbers in prose not backed by evidence, unregistered exercise, unknown cue, hearing claims, larynx/diagnosis/"% feminine". **Prose screening is a phrase list. It does not semantically validate arbitrary text.** Coverage: 7 prohibited-claim cases tested |
| Effort or pain report | **Verified** | Pain + favourable self-report → `pause`, no proposal, plan paused on same exercise |
| External processing disabled | **Verified** | Profile refuses enabling it; E2E records **zero requests to non-local hosts** |
| Owner deletion | **Verified** | Take dir, analysis.wav and run JSON removed; dependent review kept and marked; unrelated session intact; session deletion; `deletions.jsonl` |
| MCP round trip | **Verified with Claude Code (HTTP)** | §5 |
| Browser behaviour | **Partly verified** | Chrome (headless, fake device) desktop and phone viewport, permission denial message, cross-tab recording exclusion and lock release after tab close. Installed macOS Safari 26.6.2 passes filtering, live pitch, native recording and lock checks with generated audio (row above). **Not tested:** a real microphone, full Safari practice UI, iOS/iPadOS, Firefox, Android, a real phone over HTTPS, audio recovery after mid-recording tab close |
| Interactive usability | **Not performed** | No session with a person unfamiliar with the interface has been run. Recommended next step |
| Responsive & accessible flow | **Partly verified** | Phone viewport E2E; keyboard focus reaches controls; text labels on all status badges and states (not colour alone); reduced-motion CSS; focus rings. **No screen-reader test** |

Other checks performed: the reminder is flagged when due in the configured timezone, the timezone
change takes effect, cross-origin `POST` is refused, and UTC timestamps are stored alongside local dates.

## 2. Measurement accuracy: synthetic only

See [analysis/EVALUATION.md](analysis/EVALUATION.md). Summary:

- **Method:** Praat 6.1.38 via Parselmouth 0.4.7, using **raw autocorrelation**. Filtered
  autocorrelation is not available in any released Parselmouth. Fixed range 60–700 Hz, step 10 ms,
  identical for every take.
- **Clean tones and harmonic complexes:** median error ≤ 0.054%, including after WebM/MP4 encoding.
  Gross errors were 0%, against tolerances declared before tuning (1% median, < 1% gross).
- **Abstention:** silence and noise give null F0 and no contour. Mixed voiced/unvoiced segments land
  within 30 ms of the truth.
- **Octave errors:** a 0.8 s octave jump is detected. **A 0.3 s jump is missed** (tracked at the wrong
  octave with no flag), as documented.
- **Synthetic TTS speech:** checked only for agreement between Praat's AC and CC methods, not against
  ground truth.
- **Missing evaluation asset:** natural-speech recordings with independently checked reference contours.
  Until those exist, every pitch measure is labelled `descriptive_only` and **never** selects a cue,
  changes a plan or supports a progress claim.

## 3. Coaching validity: rule logic only

- The rules are deterministic and implement the decision order: comfort, capture, comparability,
  goal, cue, retry. Cues come only from the registry.
- Corrective pointers rest on the learner's self-reports, which is allowed by the PRD's "useful coaching"
  scenario, and on capture-quality flags.
- **Thresholds:** "stable" needs 2 consecutive matched sessions. "Easier" needs 3, with falling effort.
  The carryover step-up needs 2 sessions. These are **Lilt's product choices**, not clinical findings.
- **Missing evaluation assets:**
  - an independent listener-labelled set for lightness and resonance
  - a check of recommendation relevance with real recordings
  - clinician review of the exercises
- **Result:** automatic perceptual judgements (lightness, resonance, perceived femininity) and
  model-perceived feedback are **disabled**.

## 4. Long-term voice outcomes: not assessed

Nothing here shows that using Lilt changes how a voice is perceived, or that a change lasts. Lilt makes
no clinical claim.

## 5. MCP round trip (Claude Code 2.1.286, HTTP transport, synthetic data)

1. `voice_get_today_plan`, `voice_list_sessions`, `voice_get_session` and `voice_get_analysis`
   returned the same records as the UI.
2. `voice_get_audio_clip` returned 2 s of WAV as MCP audio content. **Claude Code saved it to a file;
   the model reported it did not perceive the audio.** Model-perceived feedback therefore stays off.
3. `voice_save_review` created review `itest-1`, citing `f0_median_hz = 166.3625` from the stored run.
   Re-sending it gave `duplicate: true`.
4. A bad review ("I hear your resonance is 999 Hz", quoted value 999) was rejected for three reasons:
   the measure mismatch, the hearing claim, and an unbacked number.
5. `voice_set_next_plan` moved the plan v3 → v4. Repeating it with the stale version 3 was rejected.

Not tested: claude.ai or Claude Desktop, and a cloud client through a tunnel.

## 6. Docker

Image `lilt:local` is 347 MB. It was built on Apple Silicon (linux/arm64) with Docker 29.8.2, and
Parselmouth was compiled from source in a build stage.

| Check | Result |
| --- | --- |
| Health check | `healthy`; `/healthz` reports the data folder is writable |
| Browser E2E against the container (`127.0.0.1:7981`, scratch bind mount) | **19/19** in 5 of 6 runs; one run had a single intermittent failure that I could not reproduce or identify |
| Container recreation (`docker rm -f` + new container on the same bind mount) | All 5 takes: the stored `sha256` equals the hash of the bytes served back, identical before and after; review count and plan version unchanged |
| Analysis inside the container | All takes reached `review_ready` |
| Port binding | Published to `127.0.0.1` only (compose.yaml) |
| Not tested | `docker compose up` with the real `./lilt-data`, linux/amd64 hosts, restart-policy behaviour across a Docker daemon restart |

## Studio, live pitch and practice texts

- **Live pitch:** an in-browser YIN estimate drawn while you speak or listen. It is **display only**:
  it is never saved, never quoted in reviews, and never used for coaching. Saved takes are measured by
  the Praat helper, and that measured line is what replays on the piano-roll.
- **Steadiness meter:** the standard deviation, in semitones, of the live estimate over the last 2 s,
  shown descriptively ("smooth" / "a little wobbly" / "moving"). It is not a voice-quality score.
- **Comfortable range:** chosen by the learner. Checked to be between 60 and 700 Hz with low < high.
  It is shown only as a band and never affects pointers or plans.
- **Practice texts:** 33 texts in 7 levels.
  - Levels 1–3 come from NHS Fife (hums and glides, m-words, automatic speech).
  - Levels 4–7 are written by Lilt and labelled that way.
  - Classic passages such as the Rainbow Passage were not used, because of copyright.
  - These are reading material, not new techniques.
- **Not verified:** how well the live estimate tracks a real human voice. The E2E test only shows that
  it reads a note from macOS synthetic speech through Chrome's fake microphone.

## Read-along (reading desk and exercises)

- **What it is:** a browser-only estimate of the current word. Syllable beats are detected as rises in
  the loudness envelope (peak/dip detector) and mapped to words by estimated syllable counts. There is
  no speech recognition; Chrome's Web Speech API was deliberately not used, because it sends audio to
  Google.
- **Calibration:** tuned on three macOS synthetic voices.
  - Detected beats undercounted syllables by about a third, so a gain of 1.35 is applied.
  - Estimated syllables then land within 15% of the hand-counted truth (5%, 12.5% and 12.5%), checked
    by `web/src/readalong.test.ts` (7 tests).
  - **This is the same data it was tuned on, so it is a consistency check, not independent
    validation.** Real voices, whispering, very slow or very fast reading, and noisy rooms are untested.
- **E2E:** with Chrome's fake microphone, the highlighter reached all 3 words of "Black coffee,
  please." in 3 of 3 runs (now shown on the device screen). Measured pitch is drawn under the words after analysis.
- **Word timings:** saved with the take as `read_along` and labelled "approximate; display only". They
  are never used for feedback or quoted in reviews.
- **Margin notes:** come only from the text's own hint, NHS Fife guidance ("hold the m a little
  longer"), or labelled Lilt reading cues (breathe at a comma).

## Known gaps

**Voice cards**
- The intervals and the 60% unlock rule are Anki-style defaults that I chose. They are not
  validated for voice training, and no clinician has reviewed the pacing.
- The room is decoration. The cat reacts to whether you are recording, never to how you sound.
- The lo-fi radio pauses whenever the microphone is claimed (a take or live pitch) and resumes after. Checked by measuring the page's audio output in headless Chrome: about 0.04–0.09 RMS while playing, 0.0001 while live pitch was on, back to playing after. Untested on real speakers next to a real microphone, so headphones are still the safer setup.

**Content**
- No licensed example audio or video. Lilt links to the NHS Fife pages instead.
- No clinician review of the exercises.
- Vocal-pressure exercises are missing, because the NHS Fife page for them currently shows the
  intonation text.

**Validation**
- No natural-speech pitch validation.
- No perceptual listening labels.
- No usability session with a person.
- No real-microphone or real-phone test.

**Features not built**
- Formant and spectral measures. They are deliberately left out until they can be evaluated.
- A personal pitch-target setting. It is optional in the PRD; pitch is explored through the source
  exercise without a numeric target.
- Built-in authentication for LAN use. Use a proxy, as the README describes.

**Known behaviours**
- When analysis finishes after a session is complete, an additional review version is written. Earlier
  versions are kept, never overwritten.
