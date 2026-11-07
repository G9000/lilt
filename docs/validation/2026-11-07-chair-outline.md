# Chair silhouette highlight — 7 November 2026

The chair's round hotspot has been replaced with a thin pale-blue outline and soft bloom,
matching the monitor. It appears on pointer hover and keyboard focus for the currently shown
chair, and hides while the picker is open. The chair interior is not brightened. Other room
objects retain their existing highlights.

Both the visible outline and a clipped native button use generated SVG contours. The generator
reads existing chair alpha, subtracts the foreground bed, drops tiny fragments, simplifies
the contour and rounds corners by at most 3 scene pixels. It never edits raster artwork.
The clickable area includes the arms and exposed wheels while preserving empty openings.

## Verified

- Typecheck and 169 web tests passed.
- Production web build passed to `.tmp/chair-outline-web`; the existing large-chunk warning remains.
- `node e2e/chair-outline.mjs ../.tmp/chair-outlines` passed all four silhouettes, unchanged
  interior pixels, no radial hotspot, transparent-corner/opening hit exclusion, arm clicks,
  keyboard Enter/Escape/focus and reduced-motion behavior. Arm and opening samples come from
  the actual raster assets independently of generated hit paths.
- `node e2e/chair.mjs ../.tmp/chair-outline-picker` passed saved choices, cross-tab updates,
  lighting, artwork/storage failure recovery, stale loads, reset behavior and phone controls.
- Inspected hover screenshots for all four chairs. The first trace was rejected for jagged
  edges and a bedding sliver; the final trace is rounded and subtracts the bed for every chair.
- Server formatting, all-target/all-feature Clippy and 129 tests passed in `target/yarn-check`.
- Desktop formatting/release Clippy passed in `target/yarn-check`.
- Python checks passed: 47 passed, one skipped, using scratch pytest directories.
- Scoped code review found no actionable interaction or accessibility issues.

Browser tests use private Vite caches, separate ports and stubbed APIs. The owner's server,
practice data and deployed `web/dist` were not changed. Physical-device and packaged-app
acceptance were not performed.
