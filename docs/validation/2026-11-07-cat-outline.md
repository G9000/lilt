# Clickable cat and silhouette outline

Verified on Windows on 7 November 2026. Clicking the room cat opens the existing compact
five-choice picker. Hover and keyboard focus use the same pale-blue alpha contour as the mug.
The contour shares the canvas breathing scale and bed anchor. Pet the cat closes the dialog,
returns focus and shows the purr; hearts animate only when reduced motion is off.

## Evidence

- `room-cats.mjs` passed five rendered choices and matching outline sources, actual hover,
  direct clicks, keyboard opening, focus restoration, dialog outline suppression and petting.
- Normal-motion canvas instrumentation verifies the contour scale matches every drawn frame
  and the cat stays anchored at y846 without rotation. Reduced-motion canvas instrumentation
  verifies petting never paints frozen hearts.
- Existing phone, lighting, persistence, cross-tab, stale/failed image, retry and initial-reveal
  cases passed. The Make it yours entry remains available on narrow screens.
- Inspected the dilute tuxedo hover screenshot in `.tmp/cat-outline-shots`.
- Shared `object-outlines.mjs` and `room-readiness.mjs` passed.
- Read-only code review found the frozen-heart edge case; it was fixed and covered by the
  final passing cat suite. No other important findings.

## Checks

Web types passed, 169 web unit tests passed, and the scratch production build and update
stylesheet passed (the existing large-chunk warning remains). Server formatting and strict
all-target/all-feature Clippy passed, with 129 tests passing. Python: 47 passed, one skipped.
Desktop formatting and strict release Clippy passed. `git diff --check` passed.

Chrome used a temporary Vite server and stubbed APIs. Native checks used a separate build
target and scratch temporary data. The owner's port 7878, development processes, practice
data and `web/dist` were untouched. This does not validate a newly packaged installer.
