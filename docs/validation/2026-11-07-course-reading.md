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

## Smaller left gutter and first-exercise gap

Left-aligned the voice chapter with 24px desktop side padding, reduced its number gutter
from 56px to 40px, and reduced the intro-to-first-exercise gap from 52px to 16px (8px intro
margin plus 8px first-row padding). Mobile retains its 18px page padding. Removed the
chapter-row hover fill so both selection and hover keep the plain surface.

Course-reading checks cover the left offset, intro gap, number clearance and plain hover,
using the real chapter introduction with tips collapsed. The checks passed on source and
the isolated production bundle; the final plain-hover assertion passed against the bundle.
The isolated type check and production build passed. Visually inspected the dark desktop
result. Published only this UI update using the existing isolated release tree, then verified
HTTP 200 for the served `index-CnnPBG0X.js` and `index-DlCLWpYX.css` and an exact index match.

## Centered again, wider only

The owner asked to undo the left alignment and spacing reduction, and only widen the content.
Restored centered margins, original side padding, the 56px number gutter and original intro
spacing; increased the chapter maximum width from 1040px to 1280px. Selection and hover remain
plain. The footer fix is retained.

The isolated type check, production build and course-reading browser checks passed. Checks
verify centering, 1280px desktop width, restored intro spacing and no selection/hover panels.
Visually inspected the desktop result. Published the checked UI-only bundle to port 7878 and
verified its exact index plus HTTP 200 for the referenced JavaScript and stylesheet.

## Intro and Markdown fill the reading column

Removed the intro's 34em cap and the shared course Markdown's 68ch cap. Both now fill their
parent column; the centered chapter layout, exercise spacing and plain surfaces are unchanged.
Course-reading checks verify that the intro is as wide as the exercise list. Shared Markdown
checks verify full-column width across five viewports, both themes and both text sizes.

Both browser suites passed on source; course-reading also passed against the exact isolated
production bundle. The isolated type check and production build passed. Published that UI-only
bundle and verified the exact served index and HTTP 200 for its JavaScript and stylesheet.

## Consistent width across course pages

Expanded the shared reading width to 1280px. Course homes, chapter introductions, guides,
practice texts, course details and other-course practice frames now share it. Course browser
windows allow the same width, with matching desktop side padding. Existing centered margins,
chapter spacing and plain exercise surfaces remain; the daily voice card deck retains its
paper layout.

Course-reading browser checks passed on source and the isolated release bundle at 390, 1440
and 1920px in both themes. They measure the same 1200px inner reading width on desktop,
centering and no viewport overflow. Source checks additionally cover other-course guided
practice and recordings. Markdown's five-width, two-theme, two-text-size matrix passed, as did
all eight any-course-practice browser tests. Visually inspected course Home and detail pages.

Type checking and both source and isolated production builds passed (existing bundle-size
warning remains). All 164 tracked web unit tests passed. The initial broad unit command also
picked up another chat's unfinished, untracked plant test and failed on its missing module;
that work was left alone.

Published only the width changes over the existing UI release, retaining its backend-compatible
baseline. Confirmed the served index matches and returns HTTP 200 for `index-CiAzURrA.js` and
`index-Dvx79Hrp.css`. No server restart or practice-data access was needed.
