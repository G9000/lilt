# Lilt: validation report (first release, 26 Oct 2026)

This report keeps four questions apart, as PRD §14 requires: does the **software** work, are the
**measurements** accurate, is the **coaching** valid, and do **long-term voice outcomes** improve?
Passing one says nothing about the others. Everything below names how it was checked.

## Capability matrix (verified state)

| Area | Guided practice | Acoustic measurement | Listening / feedback | Validation status |
| --- | --- | --- | --- | --- |
| Listening & goals | A/B playback, favourites, notes, preference on retry | None (preference is the learner's choice) | Learner's own listening | Not applicable |
| Lightness | **Smile to brighten** (NHS Fife, source_checked); forward hum is also listed under lighten/brighten | **None** | Learner's A/B judgement → rule-based pointer | No perceptual validation. Automatic judgements disabled |
| Resonance | **Forward hum** (NHS Fife, source_checked) | **None** (formants not implemented) | Self-report of where the vibration is felt → rule-based cue | No perceptual validation. Automatic judgements disabled |
| Pitch | Gentle pitch and counting (NHS Fife, source_checked) | F0 median, p10/p90, p10–p90 span (st), SD (st), contour, coverage, quality flags | Self-report; measurements shown **descriptively only** | Synthetic fixtures only. **Not validated on natural speech, so it never drives pointers or plans** |
| Intonation | Real-life phrases (NHS Fife, source_checked) | Pitch span (descriptive) | Self-report | No judgement of correct intonation |
| Carryover | **Carryover ladder** (NHS Fife, source_checked) + unscripted answer each session | Descriptive only | Self-report; 2 consecutive "comfortable and consistent" sessions before the next step is offered (Lilt's own rule) | Reading-only evidence explicitly not treated as conversational ability |

## 1. Software correctness: verified

| Check | How | Result |
| --- | --- | --- |
| Rust acceptance tests | `cd server && cargo test` (23 tests, including the Markdown practice texts; real Python helper, fixture audio; 5 cover the card scheduler: interval growth and caps, first deck, rating + idempotency + same-day "again", no backlog after missed days, hurt → suspend + pause → resume) | **23/23 pass** (28 Oct 2026) |
| Analysis tests | `cd analysis && .venv/bin/python -m pytest` (27 tests) | **27/27 pass** |
| Live pitch tracker (browser YIN, display only) | `cd web && node --test src/pitch.test.ts` (9 tests; tolerance of 1% on clean harmonic tones from 90–500 Hz, declared before running) | **9/9 pass**. Silence and quiet noise give no pitch; loud white noise is voiced in at most 4 of 40 frames |
| Take notes in words, and the pitch reference scale | `cd web && node --test src/insight.test.ts` (5 tests: comfort first, end drop, below range, level, lively, steady, nothing to say; placing a pitch in words and semitones, never a percentage) | **5/5 pass** (28 Oct 2026) |
| Practice window, end to end | `web/e2e/practice.mjs`, same fake audio device, fresh data folder, 1440×900 then 390×844: first run sets the range, Home shows your practice, a free take's summary, a chapter text from the tree, a Today card recorded and rated, the sidebar hides and returns, the phone recorder opens only while recording | **16/16 pass** (28 Oct 2026, twice) |
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
| Browser behaviour | **Partly verified** | Chrome (headless, fake device) desktop and phone viewport, permission denial message. **Not tested:** a real microphone, Safari/iOS, Firefox, Android, a real phone over HTTPS, mid-recording tab close in a real browser |
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
