# AGENTS.md

Notes for coding agents (Claude Code, Codex, Cursor and the like) working on Lilt. People should
start with the [README](README.md); everything about how Lilt works is in [docs/guide.md](docs/guide.md).

## What Lilt is

A small, private app for self-directed courses. Read, practise and revisit skills at your own
pace, with Markdown courses, daily cards, optional recordings and reflections. It runs on your
own computer: a Rust server serves a React app and keeps everything as plain files. The voice
course also measures takes with a Python helper (Praat). There's no database and no cloud service
in the core app.

Describe Lilt as a general learning and practice app. Keep course-specific goals and terminology
within their course; don't assume everyone is here to practise their voice.

**Lilt describes, it never grades.** No scores, streaks, pass/fail colours, "missed days" or imposed
targets. Results are plain sentences in plain ink. Comfort comes first: anything that could strain
says how to stop. Keep that in every feature and every line of copy.

## Layout

| Path | What's there |
| --- | --- |
| `server/` | Rust (Axum, Tokio): API, web UI, MCP, jobs. One module per area under `server/src` (`practice`, `recordings`, `analysis`, `coach`, `courses`, `photos`, `ai`, `store`) |
| `web/` | React 18 + TypeScript + Vite. Pages in `src/pages`, the desk and room in `src/desk` and `src/room`, styles in `src/styles` |
| `analysis/` | Python 3.12 helper (`lilt_analysis`), run as a subprocess with a versioned JSON contract |
| `content/` | Courses as Markdown (`content/courses`), exercises (`content/exercises`) and coaching prompts (`content/prompts`) |
| `desktop/` | Tauri desktop apps: `build.sh` makes the Mac app/DMG; `build.ps1` makes the Windows installer, with the server and Python inside |
| `docs/` | `guide.md` (every feature), `tech-stack.md`, `courses.md`; design plans and specs in `docs/superpowers`, saved check results in `docs/validation` |
| `.claude/` | `launch.json` (the `web` dev server for preview tools) and the shared agent skills |
| `DESIGN.md` | The look: tokens, type, components, motion, and a **Never** list |
| `VALIDATION.md` | What has actually been verified |

## Running

```bash
./lilt.sh                                   # builds what's missing, serves http://127.0.0.1:7878
bun install --frozen-lockfile              # root Bun workspace; Bun 1.4.2 and Node 22.18+
bun dev                                    # Rust server on :7878 and web UI on :5173; Ctrl+C stops both
bun dev:web                                # UI only, when the server is already running
desktop/build.sh                            # Mac app: desktop/dist/Lilt.app and Lilt-<version>-<arch>.dmg
```

On macOS, if `cc` fails because Xcode's licence was never accepted, build with
`DEVELOPER_DIR=/Library/Developer/CommandLineTools` (`lilt.sh` and `desktop/build.sh` do this themselves).

**Windows** works too (the owner develops there). `lilt.sh` and `desktop/build.sh` are Mac/Linux
scripts; use `bun dev`, or run `server/target/debug/lilt.exe serve` from the repo root. The binary is
`lilt.exe`, Python is `analysis/.venv/Scripts/python.exe` (picked automatically), and the data folder
is `~/Lilt/data`, falling back to `%USERPROFILE%\Lilt\data` when `HOME` isn't set. A plain `bash` may
be WSL's, which can't run `lilt.exe`: use Git Bash or PowerShell. Use forward or quoted paths, not `/tmp`.

For the Windows desktop installer, run `powershell -NoProfile -ExecutionPolicy Bypass -File desktop/build.ps1`.
It stages its own server/web/Python builds under `desktop/target` and `desktop/runtime`, then writes
`desktop/dist/Lilt-<version>-x64-setup.exe`. Windows updates are manual; the Mac updater stays Mac-only.
Native desktop tests must set `LILT_DATA_DIR` to a scratch folder, isolating data, logs and WebView storage.

## Never touch the owner's Lilt while testing

`~/Lilt/data` and port 7878 are the owner's real practice: their recordings and their running app.
Tests and experiments use a scratch data folder and another port:

```bash
LILT_DATA_DIR=/tmp/lilt-scratch LILT_BIND=127.0.0.1:7979 server/target/release/lilt serve
```

```powershell
$env:LILT_DATA_DIR="$env:TEMP\lilt-scratch"; $env:LILT_BIND="127.0.0.1:7979"; server\target\debug\lilt.exe serve
```

Stop that server when you're done, by its port's process, never by name (`taskkill /IM lilt.exe`
also stops the owner's). Don't restart, stop or rebuild under the owner's running Lilt without saying
so. The owner's Lilt may be running from `server/target/debug` itself, and Windows won't let a running
`lilt.exe` be replaced: a `cargo build`, or a `cargo test --all-targets` after a change, then fails with
"Access is denied". Build your scratch copy elsewhere with `--target-dir`, and build the web app for a
scratch server with `vite build --outDir <scratch>` rather than over `web/dist`.

## Checks

Run the ones that cover what you changed, and all of them before calling a feature done.

```bash
bun run typecheck                                               # web types, from the repo root
bun run test                                                    # web unit tests (Node runner)
bun run build                                                   # production web app
cd server && cargo fmt --all -- --check
cd server && cargo clippy --all-targets --all-features -- -D warnings
cd server && cargo test --all-targets --all-features             # uses the real Python helper (uv sync --locked --project analysis first)
cd analysis && uv run --locked pytest
cd desktop && cargo fmt --check && cargo clippy --release -- -D warnings
```

Browser tests drive real Chrome with a fake microphone (`web/e2e/fake-mic.wav`). Most suites take a
screenshot folder:

```bash
cd web && LILT_URL=http://127.0.0.1:7979 node e2e/results-extras.mjs /tmp/shots
```

Every suite passed on fresh data folders on 6 November 2026 (Windows). They come in four kinds:

- **Against a scratch server** (`LILT_URL`, a fresh data folder each): `flashcards`, `flow`, `photos`,
  `practice`, `recorder-extras`, `results-extras`, `yarn`. `long-take` records to the two-minute
  limit, so it takes about three minutes. `deck-extras` also needs `LILT_DATA_DIR`
  set to the server's folder, and that folder's `cards/state.json` must hold `text.warmup.lip-trill`
  as a due review with `"reps": 3` (it's the eyes-off card).
- **Their own Vite server with a stubbed API** (no `LILT_URL`): `markdown`, `feedback`,
  `monitor-media`, `music`, `room-appearance`, `room-layout`, `settings-comparison`,
  `stationery-deck`, `sticky-note`, `yarn-ui`. `room-layout` can fail once while Vite optimises a dependency; run it again.
- **Its own server**: `course-review` starts `server/target/debug/lilt` on :17979 with a temporary data
  folder (set `LILT_WEB_DIR` to test a web build other than `web/dist`).
- **`node --test`**: `recording-lock` runs against `bun run dev` on :5173 (or `LILT_URL`) and stubs
  every API call. `safari` needs Safari on a Mac.

Suites find their files with `fileURLToPath(new URL(…, import.meta.url))`; `new URL(…).pathname`
breaks on Windows (Chrome then records silence from a missing `fake-mic.wav`).

When the app's flow changes on purpose (what sitting down opens, which details fold away, labels),
update the suites in the same change.

## Conventions

- **Match the code around you.** Comments are few and say why. Names are plain. The web app keeps
  its logic in small `.ts` files with `node --test` tests beside them (`insight.ts`, `noise.ts`,
  `yarn.ts`), and the components stay thin.
- **Data is plain files.** Every write goes through `store` (temp file, fsync, rename). Deletions are
  logged in `deletions.jsonl`. Never add a database.
- **Design:** read `DESIGN.md` first and respect its Never list (no gradient text, no emoji as icons,
  no cards inside cards…). Colours are tokens; light and dark both have to work.
- **Copy:** short, kind and concrete, in the second person. Describe what happened and one thing to
  try. Avoid jargon unless the course has taught it.
- **When you add a feature:** document it in `docs/guide.md`, and add a line to the top release in
  `web/src/release.ts` (the room's What's new).
- **Courses** are Markdown that people edit. Keep each text's `## id` stable, since recordings link
  to it. `content/courses/voice/README.md` explains the format.

## Commits

- Commit finished, checked work on `main`. Push only when asked.
- A commit message is plain prose about what changed for the person using Lilt, then where the logic
  and tests live. See `git log` for the voice. No conventional-commit prefixes.
- Never commit `data/`, `lilt-data*/`, `web/dist/`, `desktop/runtime/` or `desktop/dist/`.

## Content licence

The course and the exercises are written for Lilt in its own words; they credit and link the NHS
Fife, ASHA and coaching sources they're based on. NHS Fife's pages allow personal use only, so never
copy their wording (or anyone's) into the repo: write it fresh and link the source. To change an
exercise, add a new version file and keep its ids, questions, answers and cues, since takes and
coaching refer to them. Details: [Content and licensing](docs/guide.md#content-and-licensing).
