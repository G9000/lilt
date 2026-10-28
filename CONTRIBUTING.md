# Contributing to Lilt

Thank you for wanting to help. Lilt is a structure for practising voice feminization a little every
day. I put it together while I'm still finding my own voice, so if you already know this world, as a
coach, a speech and language therapist or someone who's been through it, your experience is exactly
what it's missing.

You don't need to write code to contribute content.

## Improve or add a chapter

The chapters are plain Markdown files in [`content/courses/voice`](content/courses/voice). Open the folder in any
editor, or as an Obsidian vault. [`content/courses/voice/README.md`](content/courses/voice/README.md) explains the
format, and [`content/courses/voice/_template.md`](content/courses/voice/_template.md) is a chapter to copy.

- **Fix a text or a hint**: edit the line and keep its `## id` the same (recordings are linked to it).
- **Add a text** to a chapter: add a `## new-id` section.
- **Add a chapter**: copy `_template.md` to the next number, like `09-breathing.md`.
- **Add a picture** to the Practice home (`index.md`): put it in `content/courses/voice/images`.
- **Add an example recording** of someone saying a text: put the file in `content/courses/voice/audio`
  and add `example: audio/<file>` under the text's hint. Only record yourself, or someone who said yes.

## What makes a good contribution

- **Say where it comes from.** A link to the guide, video or service you learned it from, in
  `source_url`, and an honest `written_by`. If it's your own experience, say so.
- **Comfort first.** Nothing should strain or hurt. If an exercise has a risk, say how to stop.
- **Describe, don't grade.** Lilt never scores a voice. Hints say what to try, not what's wrong.
- **Keep it kind and inclusive.** People come to this at every stage, and for their own reasons.

## Checking your change

Run Lilt (`./lilt.sh`, or `docker compose up -d --build`) and open Practice. If a chapter file has a
mistake, Lilt won't start and the message names the file. The server tests also read every chapter:

```bash
cd server && cargo test texts
```

## Code

Bug fixes and features are welcome too. The stack and the design are described in
[docs/tech-stack.md](docs/tech-stack.md) and [DESIGN.md](DESIGN.md).
