# Lilt

A small, private app for self-directed courses. Practise a few minutes a day at your own pace:
read, try a task, and revisit it when you're ready. Courses are plain Markdown you can write or remix, practice
comes back on a schedule you set, and every recording stays on your computer.

![Lilt's room with today's paper practice cards, a tea-break mug, a sleeping cat and a plant beside the desk](docs/images/room.webp)

The room in November 2026, shown with demo practice data.

## What it does

- **A cosy room to practise in.** Today's cards sit in a paper stack. Start a card, sit down at the
  computer, or take a quiet tea break. Choose your room's light, accent colour and monitor pictures.
- **Courses you can write.** A course is a folder of Markdown chapters, each explaining one skill
  before you practise it. Every installed course has reading screens, chapter cards and a daily deck.
- **Spaced practice, rated by you.** Cards come back on a schedule your own rating sets. Nothing grades you.
- **Record and reflect in any course.** Save optional audio and a written reflection during guided
  practice, then return to the session from that course's recordings.
- **Record, listen, compare in the voice course.** Each take is measured and described in plain words, with one thing to
  try next. Put it beside your first take, or see every take of a text on one line.
- **AI only if you want it.** Lilt works fully without any AI. If you choose to, you can connect an
  AI app to help edit courses. See [AI is optional](#ai-is-optional).

| Practise a text, then compare with last time | One text over time |
| --- | --- |
| ![A text with your take, a suggestion and two takes side by side](docs/images/chapter.webp) | ![Every take of one text on a line, any two side by side](docs/images/history.webp) |

## Download

**Windows:** download the `Lilt-…-x64-setup.exe` installer from the
[latest release](https://github.com/G9000/lilt/releases/latest), run it, and open **Lilt** from Start.
It installs for your account only and includes everything it needs. The installer isn't code-signed
yet, so Windows may say "Windows protected your PC": choose **More info**, then **Run anyway**.

**Mac:** download the `Lilt-…-aarch64.dmg` from the
[latest release](https://github.com/G9000/lilt/releases/latest), open it and drag Lilt to Applications.
It's signed and notarized by Apple, so it opens normally, and it includes everything it needs. It's for
Apple silicon Macs (M1 or newer); on an Intel Mac you can build it yourself (below).

## Quick start

**Windows app from source:** run `powershell -NoProfile -ExecutionPolicy Bypass -File desktop/build.ps1`,
then open the installer in `desktop/dist` and launch **Lilt** from Start.
The installed app includes the server and Python helper. See [the desktop app](docs/guide.md#the-desktop-app)
for build requirements and Windows setup.

**Mac app from source:** build `Lilt.dmg` with `desktop/build.sh`, open it and drag Lilt to Applications. It
needs nothing else installed. See [the Mac app](docs/guide.md#the-mac-app) for the first open.

From the repo, on macOS, with Rust, [Bun 1.4.2](https://bun.sh/), Node 22.18+ and
[uv](https://docs.astral.sh/uv/) installed:

```bash
./lilt.sh
```

Or with Docker:

```bash
docker compose up -d --build
```

Then open <http://127.0.0.1:7878>. The first run builds everything; later runs start straight away.
Data lives in `~/Lilt/data` (Docker: `./lilt-data`), and Lilt only listens on your own computer.

## AI is optional

You never need AI to use Lilt. Reading, cards, recording, reflecting and every other part of
practice work on your own computer with no AI and no account. In the voice course, your takes are
measured by Praat, a long-standing speech-analysis program running locally, not by an AI.

AI is off until you connect it yourself:

- **Connect your AI** (Settings) lets an AI app you already use, like Claude or ChatGPT, read and
  edit your courses through MCP. Nothing connects unless you add it, and **Disconnect** ends it.
- **The AI coach** (Settings → AI connections → ChatGPT) is a chat you can sign in to if you like.
  It never hears your recordings.

If you do connect one, what it reads goes to that AI company, so the [guide](docs/guide.md#mcp-connecting-your-agent)
lists exactly what is shared. If you don't, nothing about your practice leaves your computer.

## About the artwork, and who makes Lilt

Lilt is a one-person project with no budget. All of the artwork (the room, its
objects and the cat) was made with an AI image generator, because hiring an illustrator isn't
possible right now. The code was also written with help from AI coding tools. We'd rather tell you
than have you find out.

**If you're an artist and would like to help,** we'd love that. Redrawing the room, the cat or any
single object would mean a lot, and you'd be credited by name. Open an
[issue](https://github.com/G9000/lilt/issues) to say hello. Notes on how the room artwork was made,
including the prompts, are in [web/public/room/CREDITS.md](web/public/room/CREDITS.md).

## Development

JavaScript packages are managed as a **Bun workspace**. The root `package.json` includes `web/`,
and the root `bun.lock` keeps dependency versions fixed. Rust lives in `server/` and Python in
`analysis/`, each with its own dependencies and lockfile.

With Rust, uv, Bun 1.4.2 and Node 22.18+ installed, run these commands from the repository root:

```bash
bun install --frozen-lockfile
bun run dev
```

Open <http://127.0.0.1:5173>. `bun dev` (or `bun run dev`) prepares the Python helper, builds and
starts the Rust server on port 7878, and starts the web development server on port 5173. The UI
reloads as you edit. Press Ctrl+C to stop both. If Lilt is already running on port 7878, use
`bun dev:web` to run just the web app against it.

| Command (from the repository root) | What it does |
| --- | --- |
| `bun dev` | Start the Rust server and web development server together |
| `bun dev:server` | Prepare the Python helper, then build and start the Rust server |
| `bun dev:web` | Start only the web development server on port 5173 |
| `bun run build` | Check TypeScript and build the web app into `web/dist/` |
| `bun run typecheck` | Check web TypeScript without building the app |
| `bun run test` | Run the frontend unit tests using Node |

Use `bun run test` for the configured test suite. Bun installs dependencies and runs the workspace
commands; Node runs Vite and the tests. To add a web dependency, run `bun add <package>` from `web/`
and commit both `web/package.json` and the root `bun.lock`.

For Rust, Python and browser checks, see [development and tests](docs/guide.md#development-and-tests).
Keep test recordings in a scratch data folder on another port, as described in [AGENTS.md](AGENTS.md).

## Good to know

- **Private by default.** Takes are ordinary audio and JSON files; Recordings → Export all makes a full copy.
  The desktop app asks GitHub for a newer version when it opens; nothing about your practice is sent.
- **Back up your practice.** Settings → Backup & restore creates a backup ZIP and lets you preview
  one before restoring it. Lilt keeps a safety copy before replacing your practice data.
- **Describes, never diagnoses.** Lilt isn't a clinical tool and doesn't score you.
- **Write a course:** see [docs/courses.md](docs/courses.md). Course texts live in `content/courses`.
- **More:** the [guide](docs/guide.md) (every feature, MCP, other devices, settings, troubleshooting,
  tests), the [tech stack](docs/tech-stack.md) and [what's been verified](VALIDATION.md). Contributions are welcome.
- **Content:** the course and exercises are written for Lilt in its own words, crediting and
  linking the NHS Fife, ASHA and coaching sources they draw on. See [content and licensing](docs/guide.md#content-and-licensing).
