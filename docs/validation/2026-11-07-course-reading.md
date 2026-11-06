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

## Visible chapter layout and served build follow-up

The first pass had only been built under `.tmp`: port 7878 still served
`index-DBL2aw0E.js`. The follow-up gives voice chapters a 1040px desktop column,
a selected-exercise panel, readable inactive text and compact divided rows.

- Type checking passed.
- Course reading checks passed against source and the exact production bundle, including
  the real voice chapter component at 390, 1440 and 1920px in both themes, exercise selection,
  desktop width, selected-row background and inactive-text contrast.
- Shared Markdown checks passed again across the existing width/theme/text-size matrix.
- Visually inspected desktop dark and phone light voice chapter screenshots.
- Built `ac07d9d`'s web tree with only the updated `Voice.tsx` and `ui/practice.ts`, in
  `.tmp/course-visual-release`, to avoid publishing simultaneous course-recording work.
  The isolated build and type check passed; the existing chunk-size warning remains.
- Copied the checked assets into `web/dist`, retaining old hashed assets, then replaced
  `index.html`. Verified port 7878 serves that exact index and returns HTTP 200 for
  `index-CLOHNX5s.js` and `index-C0DwaMUe.css`.

This last step intentionally updated the served web UI after notifying the owner. No server
restart or practice-data access was needed. Browser tests still used only stubbed APIs.

## Active exercise panel reverted

At the owner's request, removed the selected exercise's background, enclosing border,
rounded corners and extra vertical margin. The recorder remains below the selected text.
Kept the footer fix and the other layout changes.

Type checking, the isolated production build, and course-reading browser checks against
both source and built output passed. The browser checks now verify a transparent active
row with no enclosing border, along with exercise switching and responsive layouts.
Visually inspected the dark desktop result. Updated the served assets and confirmed port
7878 serves the checked index, with HTTP 200 for `index-CSYwdL__.js` and `index-BGMr6LwW.css`.
