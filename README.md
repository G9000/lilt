# Lilt

A small, private app for self-directed courses. Practise a few minutes a day at your own pace:
record yourself, listen back, try again. Courses are plain Markdown you can write or remix, practice
comes back on a schedule you set, and every recording stays on your computer.

![The room: today's cards, a radio, a clock and a plant that grows when you practise](docs/images/room.webp)

## What it does

- **A cosy room to practise in.** Today's cards sit in a stack; sit down at the computer to start.
- **Courses you can write.** A course is a folder of Markdown chapters, each explaining one skill
  before you practise it, with a check-in you repeat every visit so change shows over time.
- **Spaced practice, rated by you.** Cards come back on a schedule your own rating sets. Nothing grades you.
- **Record, listen, compare.** Each take is measured and described in plain words, with one thing to
  try next. Put it beside your first take, or see every take of a text on one line.
- **Make it yours.** Remix any chapter by asking your AI (ChatGPT, or any agent over MCP). Every change can be undone.

| Practise a text, then compare with last time | One text over time |
| --- | --- |
| ![A text with your take, a suggestion and two takes side by side](docs/images/chapter.webp) | ![Every take of one text on a line, any two side by side](docs/images/history.webp) |

## Quick start

**Mac app:** build `Lilt.dmg` with `desktop/build.sh`, open it and drag Lilt to Applications. It
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

## Development

JavaScript packages are managed as a **Bun workspace**. The root `package.json` includes `web/`,
and the root `bun.lock` keeps dependency versions fixed. Rust lives in `server/` and Python in
`analysis/`, each with its own dependencies and lockfile.

With Bun 1.4.2 and Node 22.18+ installed, run these commands from the repository root:

```bash
bun install --frozen-lockfile
bun run dev
```

Open <http://127.0.0.1:5173>. The development UI reloads as you edit and connects to the Rust
server on port 7878; start the server separately with `./lilt.sh` on macOS.

| Command (from the repository root) | What it does |
| --- | --- |
| `bun run dev` | Start the web development server on port 5173 |
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
- **Describes, never diagnoses.** Lilt isn't a clinical tool and doesn't score you.
- **Write a course:** see [docs/courses.md](docs/courses.md). Course texts live in `content/courses`.
- **More:** the [guide](docs/guide.md) (every feature, MCP, other devices, settings, troubleshooting,
  tests), the [tech stack](docs/tech-stack.md) and [what's been verified](VALIDATION.md). Contributions are welcome.
- **Content:** the course and exercises are written for Lilt in its own words, crediting and
  linking the NHS Fife, ASHA and coaching sources they draw on. See [content and licensing](docs/guide.md#content-and-licensing).
