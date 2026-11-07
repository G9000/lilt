# Mug, plant and player outlines — 7 November 2026

The three selectable objects now use the chair's pale-blue edge and soft bloom on hover or
keyboard focus. A shared SVG filter traces each displayed cutout's alpha, excluding steam
and the separate player contact shadows. The plant duplicates its anchored pot and growing
canopy into the outline, keeping the same transforms and clipping. The player outline sits
in its existing art layer behind the chair. No artwork or object placement changed.

Existing targets, labels and dialogs remain. Their rectangular highlight is removed once
replacement artwork is ready; initial load failures retain the original focus cue. Outlines
hide while their controls are open, inside the desk and on narrow layouts. Reduced motion
disables the outline fade. The chair retains its existing silhouette-shaped hit target.

## Verified

- Typecheck and 169 web unit tests passed.
- Production web build and desktop stylesheet build passed into `.tmp/object-outlines-*`.
  The existing large JavaScript chunk warning remains.
- `node e2e/object-outlines.mjs ../.tmp/object-outlines` passed twelve rendered variants,
  hover and keyboard focus, dialog dismissal/focus restoration, reduced motion, phone
  visibility and canopy alignment at 0, 3 and 7 days. Screenshot differences verify visible
  outlines and chair occlusion (allowing less than one channel value of average difference
  at the antialiased chair edge).
- Inspected screenshots of mug, leaf and player contours, including the turntable behind
  the chair. Steam and contact shadows are not included in the filtered silhouette.
- Existing `tea.mjs`, `plant.mjs` and `room-player.mjs` browser suites passed in both themes:
  saved choices, timers, playback/motion, lighting, reset, keyboard/phone controls, storage
  and artwork failure recovery. `chair-outline.mjs` passed all four chair silhouettes.
- Server formatting, all-target/all-feature Clippy and 129 tests passed using `target/yarn-check`.
- Desktop formatting and release Clippy passed using `target/yarn-check`.
- Python checks passed: 47 passed, one skipped, with scratch pytest output/cache paths.
- Scoped code review found no actionable issues. `git diff --check` passed.

Browser checks used private Vite servers/caches and stubbed APIs. The owner's running server,
practice data and deployed `web/dist` were not changed. Packaged-app and Safari rendering
were not exercised.
