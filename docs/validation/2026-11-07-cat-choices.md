# Room cat choices

Verified on Windows on 7 November 2026. Make it yours now opens a five-choice cat picker,
including the owner's requested dilute tuxedo. Direct cat clicks still pet the companion;
the existing sleeping pose, breathing, lighting and bed contact are retained.

Isolated Chrome used a private Vite server, stubbed APIs and disposable browser storage. The
owner's application, port 7878, practice data and development processes were untouched.

## Evidence

- `room-cats.mjs` passed all five painted choices, petting without opening the picker, light/dark
  controls, 320/390px phones, keyboard dismissal/focus return, reload/Reset layout persistence,
  cross-tab changes, delayed stale decoding, failed swaps, storage errors and retry.
- Delayed saved-cat loading keeps the initial room hidden until the selected image can paint.
  A failed saved image loads the original cat; failure of both images still releases the room.
- Actual canvas transforms with normal motion show breathing changing scale while keeping the
  bed baseline at y846 and rotation at zero. The rendered image uses the original scene box.
  Reduced-motion choice and petting checks passed with the room's non-looping rendering path.
- Inspected screenshots show the dilute tuxedo by day and night, fluffy white on the bed and
  the dark picker. Art remains connected and grounded. Evidence is in `.tmp/cat-shots`.
- Read-only review found no important issues in choice persistence, loading cancellation,
  failure fallback, decoded first reveal, canvas redraw or dialog focus handling.

## Checks

| Check | Result |
| --- | --- |
| Web types | Passed |
| Web unit tests | 169 passed |
| Scratch Vite production build and update stylesheet | Passed; existing large-chunk warning |
| Server formatting and strict all-target/all-feature Clippy | Passed |
| Server all-target/all-feature tests, separate target and scratch TEMP/TMP | 129 passed |
| Python | 47 passed, 1 skipped |
| Desktop formatting and strict release Clippy | Passed |
| `room-cats.mjs` | Passed |
| `room-readiness.mjs` | Passed |
| `room-appearance.mjs` | Passed |
| `git diff --check` | Passed |

These checks cover the browser implementation, not a new packaged desktop installer.
Artwork and prompts are documented in `web/public/room/cats/ARTWORK.md`.
