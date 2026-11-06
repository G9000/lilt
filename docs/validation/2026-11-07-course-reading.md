# Course reading layout — 7 November 2026

The voice chapter comfort footer now fills the reading column, with a 24px top margin
and 16px inside its divider. Reading pages have less bottom padding. Courses use quieter
rows and lead with linked chapters. Markdown has tighter paragraph and heading spacing,
bordered quotes and a separate footnote area; generic course prompts and hints have
distinct text sizes.

Verified on Windows:

- `bun run typecheck` — passed.
- `bun run test` — 161 passed.
- `bunx vite build --outDir ../.tmp/course-ui-build` from `web` — passed; existing
  large-chunk warning remains.
- `node e2e/markdown.mjs ../.tmp/course-ui-shots` — passed at 320, 390, 768, 1024 and
  1440px, both themes, normal and largest text. Checks footer width and spacing, Markdown
  semantics, safe links, image proportions, heading hierarchy and horizontal overflow.
- `node e2e/course-reading.mjs` — passed. Checks chapter order, keyboard navigation,
  voice and generic chapter destinations, and phone/desktop layouts in both themes.
- `node --test e2e/any-course-practice.mjs` — 8 passed.
- Visually inspected generated footer, Markdown, course list, detail and chapter screenshots.

Browser checks used isolated Vite fixtures with stubbed APIs. Production output went into
`.tmp/course-ui-build`; the owner's server, data and `web/dist` were not changed.
No Rust, Python or desktop implementation changed in this UI pass; their suites were not run.
