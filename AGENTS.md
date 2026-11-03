# AGENTS.md

Notes for coding agents (Claude Code, Codex, Cursor and the like) working on Lilt. People should
start with the [README](README.md); everything about how Lilt works is in [docs/guide.md](docs/guide.md).

## What Lilt is

A small, private app for practising your voice (voice feminization first) a few minutes a day. It
runs on your own computer: a Rust server serves a React app, keeps everything as plain files, and
measures each take with a Python helper (Praat). There's no database and no cloud service in the
core app.

**Lilt describes, it never grades.** No scores, streaks, pass/fail colours, "missed days" or man/woman
targets. Results are plain sentences in plain ink. Comfort comes first: anything that could strain
says how to stop. Keep that in every feature and every line of copy.

## Layout

| Path | What's there |
| --- | --- |
| `server/` | Rust (Axum, Tokio): API, web UI, MCP, jobs. One module per area under `server/src` (`practice`, `recordings`, `analysis`, `coach`, `courses`, `photos`, `ai`, `store`) |
| `web/` | React 18 + TypeScript + Vite. Pages in `src/pages`, the desk and room in `src/desk` and `src/room`, styles in `src/styles` |
| `analysis/` | Python 3.12 helper (`lilt_analysis`), run as a subprocess with a versioned JSON contract |
| `content/` | Courses as Markdown (`content/courses/voice`) and exercises (`content/exercises`) |
| `desktop/` | The Mac app (Tauri): `build.sh` makes `Lilt.app` and a `.dmg` with the server and Python inside |
| `docs/` | `guide.md` (every feature), `tech-stack.md`, `courses.md` |
| `DESIGN.md` | The look: tokens, type, components, motion, and a **Never** list |
| `VALIDATION.md` | What has actually been verified |

## Running

```bash
./lilt.sh                                   # builds what's missing, serves http://127.0.0.1:7878
cd web && pnpm dev                          # UI on :5173, proxies /api to :7878
desktop/build.sh                            # Mac app: desktop/dist/Lilt.app and Lilt-<version>-<arch>.dmg
```

On macOS, if `cc` fails because Xcode's licence was never accepted, build with
`DEVELOPER_DIR=/Library/Developer/CommandLineTools` (`lilt.sh` and `desktop/build.sh` do this themselves).

## Never touch the owner's Lilt while testing

`~/Lilt/data` and port 7878 are the owner's real practice: their recordings and their running app.
Tests and experiments use a scratch data folder and another port:

```bash
LILT_DATA_DIR=/tmp/lilt-scratch LILT_BIND=127.0.0.1:7979 server/target/release/lilt serve
```

Stop that server when you're done. Don't restart, stop or rebuild under the owner's running Lilt
without saying so.

## Checks

Run the ones that cover what you changed, and all of them before calling a feature done.

```bash
cd web && npx tsc --noEmit -p .                                  # types
cd web && node --test src/*.test.ts src/room/*.test.ts           # unit tests
cd server && cargo fmt --all -- --check
cd server && cargo clippy --all-targets --all-features -- -D warnings
cd server && cargo test --all-targets --all-features             # uses the real Python helper (uv sync --locked --project analysis first)
cd analysis && uv run --locked pytest
cd desktop && cargo fmt --check && cargo clippy --release -- -D warnings
```

Browser tests drive real Chrome with a fake microphone (`web/e2e/fake-mic.wav`) against a scratch
server on :7979. Most suites take a screenshot folder:

```bash
cd web && LILT_URL=http://127.0.0.1:7979 node e2e/results-extras.mjs /tmp/shots
```

`e2e/flow.mjs` and `e2e/practice.mjs` are out of date (they stop at the card stack's arrow keys and
the first-take range offer on any server); the newer suites (`flashcards`, `photos`,
`recorder-extras`, `results-extras`, `yarn`) pass.

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
