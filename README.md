# Lilt

Lilt is a personal, local app for practising voice feminization. It opens on today's plan.
You record a short guided session in the browser, and every original recording is kept on
your own machine. You get one grounded next step that you can hear, try again and compare.
Your AI agent can read the same evidence through MCP.

- **Goal it is built around:** a more feminine speaking voice that sounds natural, feels comfortable
  and works in everyday conversation, with emphasis on a lighter sound and forward resonance.
- **What it is not:** a clinical tool. It does not diagnose, give a femininity score or replace a
  speech and language therapist.
- **Docs:** the design and stack are in [docs/tech-stack.md](docs/tech-stack.md). What has actually
  been verified is in [VALIDATION.md](VALIDATION.md).

## Quick start (native, macOS)

Requirements: Rust (cargo), Node with pnpm, and [uv](https://docs.astral.sh/uv/). uv downloads
Python 3.12 for the analysis helper.

```bash
./lilt.sh
```

Then open <http://127.0.0.1:7878>. The first run builds the server, the web UI and the analysis
environment. Later runs start straight away.

- Data is stored in `~/Lilt/data`. To use another location, set `LILT_DATA_DIR=/path/to/folder ./lilt.sh`.
- The server listens on loopback only (`127.0.0.1:7878`), so nothing on your network can reach it.

## Quick start (Docker)

```bash
docker compose up -d --build
```

Then open <http://127.0.0.1:7878>.

- **Where your data lives:** in `./lilt-data` on the host, bind-mounted to `/data`. Recordings live on
  the Docker host, which may not be the phone you recorded on.
- **Ports:** the port is published to `127.0.0.1` only. Inside the container Lilt listens on `0.0.0.0`.
- **Restarts:** the container restarts unless you stop it, and `docker compose ps` shows its health.
- **Recreating the container:** `docker compose down && docker compose up -d` keeps everything, because
  the files stay in `./lilt-data`. A bind mount gives persistence, not a backup.
- **First build:** on Apple Silicon, the first build compiles Parselmouth from source, because there
  are no Linux ARM wheels. It takes a few minutes and is cached afterwards.

## Using it

1. **The room and the desk.** Lilt opens on an illustrated anime room above a city.
   - **Today's cards are a stack** in the corner, one card per practice card left. Swipe the top
     card away (or use the arrow keys) and it tucks in at the back; tap the card on top, or its
     arrow, to practise that one first. The others stay in today's run. The stack deals in when
     the room opens, nudges once to show it can be swiped, and gets shorter as you finish cards.
     Built with Motion (springs and drag).
   - **Floating in the room**, over spots in the painting: the lo-fi radio over the speaker, a
     clock in the window, the plant by the potted plant, and a sticky note taped to the photo wall.
     The note starts as your goal; click it to write anything (up to 280 characters), click away to keep it. It's saved on
     the server (`room_note` in the profile). **Drag either one anywhere**; it remembers its spot
     in the painting (in this browser). Today's cards move too: drag the small grip under the pile
     (swiping the cards still flips through them). **Reset layout** in the menu bar puts
     everything back. Widgets near an edge slide inward rather than disappear. A widget whose spot
     is cropped off a small screen steps aside; a phone shows just the stack.
   - Or click the **computer** itself (it glows and says how many cards are waiting), or press
     <kbd>Enter</kbd>: you sit down and **Practice opens straight away** on today's next card,
     full screen, laid out like a writing app: chapters in a sidebar, the chapter as a page of
     things to read, and the recorder docked at the bottom. Click any card further down to do it next.
   The camera pushes into the monitor and its screen becomes a small macOS-style desktop. Every part
   of Lilt is an app on it: **Today** (the widgets), **Practice**, **Practice texts**, **Progress**
   and **Recordings** in the dock, Settings and the light/dark switch in the menu bar. **Leave desk**
   (or the door in the dock) walks you back out to the room.
   - **The room:** the painting comes in morning, day, sunset and night light and fades between them
     with your clock. Birds cross the windows by day; stars and city lights come out at night. The
     cat sleeps on the bed and breathes; when you arrive it flicks an ear and says hello, and tapping
     it gets a purr and hearts.
   - **Lights on when you're done:** once today's cards are finished, the string lights along the
     beam light up one by one and the desk lamp glows warmer. It's a quiet "nice work", never a score.
   - **Menu bar and notifications:** the room and the desk share a macOS-style menu bar (Lilt, what's
     playing, notifications, date and time). The envelope opens a Notification Center from the right
     with a greeting for the time of day. It only holds real things: your feedback is ready, a new
     stage opened, your reminder time, resting today, recordings recovered from a closed page. Never
     streaks or missed days. Read and cleared notifications are remembered in this browser only.
   - **The desk** shows today's practice as a folder (the cards waiting and Start). The clock, the
     plant (a leaf for each day you practised this week; it never shrinks or scolds) and the lo-fi
     radio live in the room instead, as floating widgets you can drag.
   - **Lo-fi radio:** three moods ("Rain on the window", "Desk lamp", "City at dusk") made live in
     the browser: electric-piano chords, a soft bass, swung drums, and rain on one mood. Both
     radios have a volume slider and a mute button, remembered in this browser. Nothing is
     downloaded or sent anywhere. The record spins while it plays, and the track shows in the menu
     bar and on the room. **It pauses itself whenever the microphone is on** (recording or live
     pitch), so music never reaches a take or a pitch reading, then picks up again.
   - The artwork lives in `web/public/room/` (WebP files: four room lights, and the cat's body,
     tail and ear in each light). Swap them for other art of the same size, then re-measure the
     screen corners in `web/src/room/scene.ts`. The look is documented in `DESIGN.md`.
2. **Today** is your **voice deck**: Anki-style spaced repetition, but for your voice. The deck
   holds the daily reference phrase, any cards due for review, and a couple of new cards (2 a day
   by default, `new_cards_per_day` in the profile). **Start** opens the Practice window: say the
   line, listen back, then rate how it felt: **Again** (later today), **Hard**, **Good** or
   **Easy**. Each button shows when the card will come back (keys 1–4 work too).
   - Ratings are your own judgement. Pitch numbers never decide them.
   - The deck is capped at about your session length. Missed days never pile up into a backlog:
     overdue cards just wait their turn.
   - New stages (m-words, phrases, sentences…) open once most cards in the stage before feel
     comfortable (rated Good or Easy twice in a row).
   - **It hurt or felt strained** pauses that card and your plan until you choose to resume.
   - **Live pitch while recording,** in the recorder docked at the bottom: the waveform with your
     pitch line over it and your comfortable range as a band, plus the current Hz and note, middle
     pitch, usual range and steadiness. Display only.
   - **Results after each take:** middle pitch, usual range (10th to 90th percentile) and how
     much of the take was voiced, from the Praat analysis, plus the measured contour. "Last
     time" on the same card is overlaid only when the comparison check says the two takes are
     comparable; otherwise the reason is shown. The end of the deck lists each card's middle
     pitch and your rating. The numbers describe the recording and never set a rating.
   - The original guided session with coaching feedback is still there: **Guided session with
     feedback** on the Today widget, at `#/guided`, with **Start today** or **Quick check-in**.
3. A session runs through these steps:
   - microphone check, then a reference phrase (counting 1–10)
   - the exercise, then listening back with a self-check question
   - the reference phrase again, then an optional short unscripted answer
   - a comfort and effort check
4. You then see your recordings marked **Saved**. "Saved" appears only after the server has the
   file on disk. You also get one pointer.
5. On the feedback page:
   - **Hear the moment** plays the exact evidence. A segment is marked only when a measurement
     points to one; a self-report covers the whole take.
   - **Try this** shows a cue from the exercise registry.
   - **Try again** records a new, linked take; the original is never touched.
   - **Compare** puts the original and the retry side by side as an A/B pair.
6. If a pointer doesn't match what you hear or feel, say so. Your note is kept with the review and
   is taken into account next time.
7. **Chapters** are free practice, in the same Practice page. The sidebar lists the seven text
   levels with how many texts you've practised in each. A chapter reads like a document: how to do
   it, then each text in a reading serif with a hint under it. Pick a text (or press <kbd>↓</kbd>),
   press record, and the docked recorder draws your pitch live.
   - **Show my pitch live** lets you watch without recording.
   - Every take is saved. Your last take of the same text appears beside it as an A/B pair, with the
     measured pitch line; click the line to play from that point.
   - Hum warm-ups show a **steadiness** meter. The NHS Fife source asks for a smooth sound.
8. **Texts** has 33 starter practice texts in 7 levels:
   1. hums and glides
   2. m/n words
   3. counting, days and months
   4. everyday phrases
   5. smooth sentences
   6. short passages
   7. conversation prompts

   Levels 1–3 come from the NHS Fife sources. The phrases, sentences, passages and questions are
   written by Lilt and labelled that way.
9. **Comfortable range (optional):** a pitch band you choose. Set it in Settings, or with "use this
   take's range" in a chapter. It is shown as a soft band and is never a gendered zone or a coaching
   target.
10. **The look:** a calm macOS-style desktop inside the painting (see `DESIGN.md`): one font
   (Geist), soft glass windows, black primary buttons, one warm coral accent, and a white record
   button whose red dot turns into a square while recording.
   - **Read-along:** it follows the beat of your syllables in the browser, with no speech recognition
     and nothing sent anywhere. It's approximate; tap a word if it loses your place. After a take, your
     measured pitch is drawn under each word.
   - **Theme:** light or dark from the sun/moon button in the menu bar. Fonts (Geist, JetBrains
     Mono, Newsreader for the texts you read) are bundled, so nothing loads from the internet.
11. **Shortcuts:**
   - <kbd>Enter</kbd> in the room sits you down at the desk.
   - <kbd>Space</kbd> starts or stops recording.
   - <kbd>A</kbd> or <kbd>B</kbd> plays a take in an A/B pair.
   - <kbd>↓</kbd> and <kbd>↑</kbd> move between texts in a chapter.

12. **Progress** shows each skill in the task where it was practised, never an overall score.
   **Recordings** (the old History page) has playback, favourites, notes, deletion and export.

If you report strain, pain or new hoarseness, the activity is paused and never made harder. If
it persists or keeps coming back, see a voice professional.

### Microphone requirements

- **On this computer:** use `http://localhost` or `http://127.0.0.1`. Browsers allow the microphone
  there.
- **From your phone:** browsers only allow the microphone on a secure (HTTPS) page. See
  [Access from another device](#access-from-another-device).
- **Capture settings:** Lilt asks the browser to turn off echo cancellation, noise suppression and
  automatic gain, and records what the browser reports. A browser accepting that request doesn't prove
  your device applied no processing.
- **Formats:** Chrome and Firefox record WebM/Opus. Safari records MP4/AAC. The original bytes are kept
  as they were. `analysis.wav` is a derived copy for analysis only.

### Data layout

```
<data>/profile.json
<data>/exercises/<id>/v<N>.json
<data>/sessions/<session>/session.json
<data>/sessions/<session>/recordings/<take>/{take.json, original.webm|m4a, original.sha256, analysis.wav}
<data>/sessions/<session>/analyses/<run>.json
<data>/sessions/<session>/reviews/<review>.{json,md,responses.jsonl}
<data>/plans/current.json, plans/history/vNNNNN.json
<data>/jobs/*.json, deletions.jsonl
```

Everything is plain files. There is no database, and the folder alone is enough to rebuild your
whole history.

### Backup and restore

- **Export:** History → **Export everything (.zip)**, or `curl -o lilt.zip http://127.0.0.1:7878/api/export`.
- **Backup:** with Lilt stopped, copy the data folder, for example `rsync -a ~/Lilt/data/ /Volumes/Backup/lilt-data/`.
  Time Machine also covers `~/Lilt`.
- **Restore:** stop Lilt, put the folder (or the unzipped export) back at `LILT_DATA_DIR` (or
  `./lilt-data` for Docker), then start Lilt. Hashes in `original.sha256` let you check the audio.
- **Deletion:** deleting a recording or session in Lilt removes its originals, analysis copies and
  measurements from the data folder. Reviews elsewhere that cite it are either kept and marked "evidence
  deleted" or deleted too; you choose. Exports and backups are separate copies that you must delete
  yourself.

## MCP (connecting your agent)

Lilt exposes 11 tools, listed below. Arguments are IDs only; there is no filesystem or shell access.

- `voice_get_today_plan`, `voice_list_exercises`, `voice_list_sessions`, `voice_get_session`
- `voice_get_analysis`, `voice_compare_sessions`, `voice_get_progress`, `voice_get_audio_clip`
- `voice_get_deck`: today's card deck, scheduling state and, optionally, the review log
- `voice_save_review`, `voice_set_next_plan`

**HTTP, while Lilt is running.** Use this with Claude Code:

```bash
claude mcp add --transport http lilt http://127.0.0.1:7878/mcp
```

**stdio.** The client starts Lilt itself, against the same data folder:

```json
{ "mcpServers": { "lilt": { "command": "/path/to/lilt/server/target/release/lilt", "args": ["mcp-stdio"],
  "env": { "LILT_DATA_DIR": "/Users/you/Lilt/data", "LILT_CONTENT_DIR": "/path/to/lilt/content" } } } }
```

What the server enforces on writes:

- Reviews must cite takes, analysis runs and self-reports that exist.
- Quoted numbers must match the stored analyses.
- Exercise and cue IDs must be in the registry.
- Prose is screened for hearing claims ("I hear…"), diagnosis, anatomy, and femininity scores.
- Plan updates must name the current plan version.
- A duplicate `idempotency_key` returns the existing review.

This screening checks a list of prohibited phrasings. It cannot prove that arbitrary prose is true.

`voice_get_audio_clip` returns a WAV clip as MCP audio content. Tested with Claude Code 2.1.286, the
clip was saved to disk but the model did not hear it, so model-perceived feedback stays disabled.

**Privacy:** what an agent reads (session details, measurements, notes, audio clips) goes to that
agent's model provider. Lilt itself uses no cloud model, and external processing stays off.

**Cloud clients** (for example claude.ai on the web) can't reach your `localhost`. To use one, run Lilt
behind an authenticated HTTPS tunnel or reverse proxy, and set `LILT_MCP_TOKEN` so `/mcp` requires
`Authorization: Bearer <token>`. Keep the token out of logs and shared configs.

## Access from another device

The default is loopback only. To record on your phone over your LAN:

1. Put Lilt behind HTTPS, for example with Caddy using its internal CA (`tls internal`) or a tunnel
   such as Tailscale Serve. Phones need a secure page to use the microphone.
2. Add authentication at the proxy, such as basic auth or Tailscale identity. Lilt has no login of
   its own.
3. Native: set `LILT_BIND=0.0.0.0:7878` only behind that proxy and firewall. Docker: change the port
   mapping deliberately.

Lilt blocks cross-site browser requests (by checking the Origin header), but that is not
authentication.

## Configuration

| Variable | Default | Meaning |
| --- | --- | --- |
| `LILT_DATA_DIR` | `~/Lilt/data` (`/data` in Docker) | Where everything is stored |
| `LILT_BIND` | `127.0.0.1:7878` (`0.0.0.0:7878` in Docker) | Listen address |
| `LILT_PYTHON` | `analysis/.venv/bin/python` | Python for the analysis helper |
| `LILT_CONTENT_DIR` | `content` | Exercise registry and prompts to seed from |
| `LILT_WEB_DIR` | `web/dist` | Built web UI |
| `LILT_MCP_TOKEN` | unset | If set, `/mcp` requires `Authorization: Bearer <token>` |

The timezone (default `Asia/Kuala_Lumpur`), reminder time, session length and comparison window are
in **Settings**. Lilt stores UTC timestamps alongside local dates.

**Models:** there are no model settings. Lilt never calls a cloud model, and the "external processing"
switch cannot be turned on in this release.

## Development and tests

```bash
cd server && cargo test                     # 15 acceptance-scenario tests (uses the real analysis helper)
cd analysis && .venv/bin/python -m pytest   # 27 analysis tests on fixed fixtures
cd analysis && .venv/bin/python scripts/evaluate.py   # regenerates EVALUATION.md
cd web && node --test src/pitch.test.ts     # live pitch tracker (YIN) on synthetic tones
cd web && node --test src/room/scene.test.ts  # room: monitor warp, light blending, zoom box
cd web && pnpm dev                          # UI on :5173, proxies to a server on :7878
# Browser end-to-end with Chrome's fake microphone (server running on :7979 with a scratch data dir):
cd web && LILT_URL=http://127.0.0.1:7979 node e2e/flow.mjs /tmp/shots   # MOBILE=1 for phone size
```

## Troubleshooting

- **"Microphone access was blocked":** allow the microphone for this site in the browser's site
  settings, or in macOS System Settings → Privacy & Security → Microphone for the browser. Then retry.
- **No mic prompt on your phone:** the page isn't secure (HTTPS). See
  [Access from another device](#access-from-another-device).
- **"Saved · analysis failed":** the audio is safe. Check that `analysis/.venv` exists (`cd analysis && uv sync`),
  then use **Retry analysis** in History. Pending jobs also resume when Lilt restarts.
- **Upload problems:** chunks stay in the browser's IndexedDB until the server confirms them, and
  they're re-sent the next time Lilt opens. The server also recovers interrupted takes at startup and
  labels them "interrupted".
- **Laptop was asleep:** nothing runs while it sleeps. Pending analysis catches up on wake, and
  you'll see at most one reminder, not a backlog.

## Content and licensing

The exercise texts in `content/exercises` are short paraphrases of NHS Fife Speech and Language Therapy
patient-advice pages, with links to the originals. NHS Fife permits use for private study and personal
use only, so keep this repository private and don't redistribute that content. The status of every
exercise is `source_checked`: an AI checked it against its source, and no clinician has reviewed it.
