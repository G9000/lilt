# Practice texts

The reading material for Lilt's chapters and today's cards. Edit these files in any text editor,
or open this folder as an Obsidian vault. Restart Lilt afterwards (with Docker, rebuild:
`docker compose up -d --build`). If a file has a mistake, Lilt won't start and says which file.

- `index.md`: the Practice home page (what it's for, why, how to use it, sources). Plain Markdown:
  `##` headings, paragraphs, `-` lists, `> ` quotes, `**bold**`, `_italic_` and `[links](https://…)`.
  The list of chapters under it is added automatically.
- `_about.md`: the version, the date the sources were checked, and the note shown at the end of
  every chapter.
- `01-warmup.md` … `07-conversation.md`: one chapter each. The number at the start of the file
  name sets the order. To add a chapter, add a file like `08-reading.md`.

## A chapter file

```markdown
---
id: warmup
title: Warm-ups
subtitle: Hums and gentle glides
kind: hum
source_url: https://…
written_by: Instructions paraphrased from the source.
---

How to do it: the paragraph shown in the box at the top of the chapter.

## hum-comfortable

mmmmmmm

> The hint shown under the text.
```

- **Front matter** (between the `---` lines): `id`, `title` and `kind` are required; `subtitle`,
  `source_url` and `written_by` are optional.
- **`kind`** sets how the text is shown and read along: `hum`, `words`, `automatic`, `phrases`,
  `sentences`, `passage` or `prompt` (a question you answer in your own words).
- **Each text** starts with `## ` and a short id, unique in the chapter. The lines under it are
  the text (on one line, or wrapped; they're joined), and lines starting with `>` are its hint.

## Keep ids stable

Recordings and cards are linked by `text.<chapter id>.<text id>`, for example
`text.warmup.glide`. Changing an id starts that text fresh: older recordings keep the old id and
no longer show under it. Fixing the wording of a text or hint is fine.
