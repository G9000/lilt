# Lilt — tech stack and design

Lilt is a local, single-user voice feminization practice app built from
`voice_feminization_build_brief.md` (PRD v1.1, 26 Oct 2026). This file records the
stack, the main contracts and the consequential assumptions. The README covers
setup; `VALIDATION.md` covers what was actually verified.

## Stack at a glance

| Layer | Choice | Why |
| --- | --- | --- |
| App server | Rust 1.94, Axum 0.8, Tokio | PRD's suggested shape; one small binary serves API, web UI and MCP. |
| Analysis | Python 3.12 helper (`analysis/`) using Parselmouth (Praat) + NumPy, PyAV for decoding | Established Praat pitch tracking; PyAV bundles FFmpeg so WebM/Opus and MP4/AAC decode without a system FFmpeg. Run as a subprocess with a versioned JSON contract. |
| Web UI | React 18 + TypeScript + Vite, built to static files served by the Rust server | Responsive browser UI for desktop and phone; no separate web server. |
| Storage | Plain files under a data root: original audio, JSON records, Markdown summaries | Exportable and understandable; no database. The server scans and caches records. |
| Jobs | Persisted job files in `jobs/`, a Tokio worker, reconciliation at startup | Analysis survives crashes and restarts without duplicate results. |
| MCP | Streamable HTTP at `/mcp` from the same server, plus a `lilt mcp-stdio` bridge for stdio clients | Same validation path as the UI; IDs only, never filesystem paths. |
| Packaging | Native (`cargo run`) on loopback, or Docker Compose with `./lilt-data:/data` bind mount published to `127.0.0.1` | PRD §13. |
| Tests | `cargo test` (storage, upload, coaching rules, MCP validation), `pytest` (analysis on fixtures), browser checks with fake-microphone audio | PRD §14. |

External model processing defaults to **off**. Nothing in the core app calls a cloud
service. When a person connects an MCP client such as Claude, whatever the tools return
goes to that client's model provider; the UI and README say so.

## Data root layout

```
<LILT_DATA_DIR>/
  profile.json                       goal, timezone (Asia/Kuala_Lumpur), reminder time, appearance
  exercises/<exercise_id>/v<N>.json  versioned registry, seeded from content/exercises, never overwritten
  sessions/<session_id>/
    session.json                     kind (full | check_in | studio | deck), local date, UTC timestamps, comfort, completion
    recordings/<take_id>/
      take.json                      tags, task, mime, capture settings, status, hashes, retry_of
      chunks/000000.part ...         upload chunks (kept until finalize succeeds)
      original.<ext>                 original captured bytes (immutable)
      analysis.wav                   derived decode copy (labelled as such)
    analyses/<run_id>.json           measurements, quality flags, method + params, source hash
    reviews/<review_id>.json         structured observations/pointers with evidence
    reviews/<review_id>.responses.jsonl   learner responses, e.g. "Does not match what I hear or feel"
    reviews/<review_id>.md           generated readable summary
  plans/current.json, plans/history/v<N>.json
  cards/state.json                   per-card schedule: due, interval, ease, reps, lapses, suspended
  cards/reviews.jsonl                append-only log of card ratings (card, take, rating, interval)
  jobs/<job_id>.json
  deletions.jsonl                    record of owner deletions (no content)
```

Every write uses temp file → fsync → rename → fsync dir. **Saved** is shown only after the
server confirms that the finalized original is on disk.

## Voice cards (spaced repetition)

Practice texts are Markdown in `content/courses/voice` (`_about.md` plus one `NN-<id>.md` per chapter), parsed at start-up by `server/src/texts.rs` into the JSON that `/api/texts` serves. Cards are generated from content: `ref.daily` (the reference phrase, every day and never spaced),
`text.<level>.<item>` for the 33 practice texts, and `ex.<id>` for four NHS Fife exercises placed
in the stage they fit. Stages follow the text levels. A stage opens when 60% of the stage before
is "learned", meaning two Good or Easy ratings in a row.

Scheduling is SM-2-like:
- New cards: Again comes back later today, Hard or Good come back tomorrow, Easy in 4 days.
- Review cards:
  - Hard multiplies the interval by 1.2, Good by the ease, and Easy by the ease × 1.3.
  - Ease starts at 2.5, never drops below 1.3, and moves −0.2 / −0.15 / 0 / +0.15.
  - Intervals are capped at 60 days.

Differences from Anki, on purpose:
- A daily cap of clamp(session_minutes, 4, 15) cards. There is no backlog: overdue cards wait.
- Ratings are self-reports, never acoustic scores.
- An "ouch" rating suspends the card, pauses the plan and records strain on the session.
- A strain or pain report at the end of a deck also pauses the plan.
- Resuming the plan brings back suspended cards.

API: `GET /api/deck/today`, `POST /api/deck/session` (one Deck session per day), and
`POST /api/deck/review {card_id, take_id, rating}`, which is idempotent per (card, take).

## Recording and upload contract

1. `POST /api/sessions` creates a session.
2. `POST /api/takes` with a client-generated take UUID, session, tags and task. This call is idempotent.
3. MediaRecorder runs with a 1 s timeslice. Each chunk is sent with `PUT /api/takes/{id}/chunks/{seq}`
   and an `X-Content-SHA256` header. Same bytes → 200 (idempotent). Different bytes → 409.
4. `POST /api/takes/{id}/finalize {chunk_count, sha256}` concatenates the contiguous chunk prefix
   (container chunks are not independently decodable, so only a prefix from chunk 0 is valid). It
   writes `original.<ext>`, records completeness (`complete` or `missing_tail`) and queues analysis.
   This call is idempotent too.
5. When the server starts, takes still in `recording` are finalized from their confirmed prefix
   and marked `interrupted`.

Take status moves through `recording → saving → saved → analysis_pending → review_ready | analysis_failed`.

## Analysis contract (v1)

`python -m lilt_analysis --input <original> --wav-out <analysis.wav> --out <run.json> --source-sha256 <hex>`

- The helper decodes to mono float at the native sample rate and writes a 16-bit WAV analysis copy.
- Pitch uses Praat **raw autocorrelation** (`To Pitch (ac)`). Praat now recommends filtered
  autocorrelation, but Parselmouth 0.4.7, the newest release, bundles Praat 6.1.38, which doesn't
  have it. The helper tries the filtered method first and records the method actually used. The search range is a fixed 60–700 Hz for
  every take, not derived from a gender label or a target, so matched comparisons use one configuration.
- Outputs: duration, voiced duration and voiced-frame coverage with denominators, F0 median,
  p10 and p90, the p10–p90 span in semitones, a semitone SD around the median, a contour (null where
  unvoiced), voiced segments, suspected octave jumps, and quality flags (`clipping`, `low_signal`,
  `insufficient_voiced`, `suspected_tracking_errors`) with clipping time ranges.
- Unavailable values are `null` with a reason, never 0.
- Status: these measurements are **descriptive only**. Natural-speech validation against independent
  reference contours has not been done, so they never drive corrective pointers or progression.

## Coaching engine

The engine is deterministic Rust rules, with no LLM. Decision order follows PRD §10: comfort, then
capture quality, then comparability, then goal relevance, then one eligible cue from the registry,
then the retry. Evidence comes from capture-quality measurements and from self-reports defined per
exercise (for example, where the vibration was felt during the forward-resonance hum, or which A/B
take sounds lighter to the learner). Every pointer stores observation, evidence (take and segment
IDs, or "whole recording" for self-reports), goal connection, confidence basis, next action
(exercise ID and version plus cue ID) and recheck. Agents may add reviews through MCP. The server
rejects unknown takes, quoted numbers that don't match stored analyses, unregistered exercises and
cues, stale plan versions, and prose containing hearing claims ("I hear…", "sounds feminine") when
no audio was delivered to the model.

## Exercise content (first release)

Five activities, all from NHS Fife Speech and Language Therapy "Shaping your voice" pages, checked
26 Oct 2026. Their status is `source_checked`: an AI checked the source, and **no clinician has
reviewed them**. Each one is a short paraphrase with a link back to the source. NHS Fife copyright
allows private study and personal use, but not redistribution, so do not publish
`content/exercises`.

| ID | Area(s) | Source section |
| --- | --- | --- |
| `nhsfife.smile-brighten` | lightness | Lighten/brighten: articulation, "Exploring how your lips affect your voice" |
| `nhsfife.forward-hum` | resonance, lightness | Lighten brighten: pitch and resonance, Activity 1 |
| `nhsfife.gentle-pitch-count` | pitch | Lighten brighten: pitch and resonance, Activity 2 |
| `nhsfife.real-phrases-intonation` | intonation | Lighten brighten: intonation, Activity |
| `nhsfife.progression-ladder` | carryover | Progression activities to shape your authentic voice |

Known gaps: there are no licensed example audio or video files (the app links to the source pages
instead), and no clinician has reviewed the content. NHS Fife's "volume and pressure" page currently
shows the intonation text, so vocal-pressure exercises are not included.

## Consequential assumptions (my calls)

- Native default data dir is `~/Lilt/data`; Docker uses `./lilt-data` → `/data`. Port 7878.
- There is no SQLite index. File scans are fast enough for one person's history.
- Pitch is fixed at 60–700 Hz for every take, as above.
- Carryover only moves up a step after two consecutive sessions where the learner reports
  "comfortable and consistent" at the current step. The source says to move on only when you can
  produce your voice comfortably and consistently, but it gives no count, so two is a product choice.
- Reminders run in the app: a banner, plus a browser notification while Lilt is open. Lilt sets up
  no outside messaging. Only the latest missed reminder is shown, never a backlog.
- Model-perceived feedback is disabled. No MCP client has been shown to receive Lilt audio yet.
