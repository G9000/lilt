# UI consistency — 7 November 2026

Settings, Course Home, course management and Today now share spacing, heading and control
tokens. Practice's button reset leaves shared button styles intact. Reading surfaces are opaque,
Settings uses quiet category icons, and the desktop Today widget leads with its task. Generic
daily-card illustrations were removed; the recording-responsive cat remains.

## Verified

- `bun run typecheck`: passed.
- `bun run test`: 153 passed, zero failures.
- `bun run --cwd web build --outDir ../lilt-data-ui-consistency/web`: passed after the final
  illustration removal. The existing large-bundle warning remains.
- `bun run build`: passed; the running local app on port 7878 serves the resulting JavaScript
  and stylesheet, including the shared 44px control token.
- `node e2e/ui-consistency.mjs ../lilt-data-ui-consistency/shots`: passed after the final change.
  Covers Course Home, guide disclosure, starting Today, Appearance settings, enlarged text,
  desktop Today, light/dark themes and 390/1440px viewports. Checks action hit targets,
  horizontal overflow and page errors; saves screenshots for visual inspection.
- `node e2e/stationery-deck.mjs ../lilt-data-ui-consistency/deck`: passed after the final change.
  Covers recording/retry, review controls, Again order, eyes-off reveal, card selection,
  completion and comfort stop.
- `node --test e2e/settings-comparison.mjs`: nine passed, including saving races.
- `node e2e/markdown.mjs ../lilt-data-ui-consistency/markdown`: passed across five widths,
  two themes and two text sizes.
- `node e2e/accent.mjs ../lilt-data-ui-consistency/accent`: passed for presets, picker, hex,
  contrast, charts and persistence.
- Independent review found no material defects. Additional isolated Chrome checks covered
  active/paused desktop Today and first-time Course Home at 320/390/1440px; actions stayed
  at least 44px tall and inside their surfaces.

Browser evidence is Windows Chrome with disposable, stubbed API responses, not the owner's
practice data. Screenshots were inspected for phone Home/Today, desktop Settings/Today, and
enlarged-text phone Settings. No Rust, Python or native Mac behavior changed or was revalidated.
