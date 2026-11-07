# Distinct monitor models

Verified on Windows on 7 November 2026. Cream retro, Sage rounded and Silver studio are available
independently for either monitor, alongside the four existing finishes. Their thicker housings,
screen openings and grounded stands are separate painted designs. The side monitor follows its
existing perspective; the main screen's entry target uses the exact rounded opening.

All browser work used private Vite servers, stubbed APIs and disposable browser storage. The
owner's running application, port 7878, practice data and development processes were untouched.
Web builds and native test data/output stayed under scratch or separate validation directories.

## Evidence

- `room-hardware.mjs` passed all 18 choices, pointer and keyboard outlines, model bezel/corner
  clicks, main-screen entry, mixed designs, persistence, independent cross-tab changes, retry,
  stale image decoding, storage errors, light/dark controls and 320/390px phones.
- Cold refresh waits for a saved model's decoded image. A failed saved model reveals the original
  painting and offers Retry. Existing finish IDs still load, and microphone choices stay unchanged.
- Actual screenshots inspected: all three models on the main monitor, side retro and mixed
  cream/sage at night, plus the expanded picker. Source pictures remain behind the bezel;
  legacy screen pixels are unchanged when their hardware layer is hidden.
- The independent review identified a rounded-corner entry mismatch. Using the exact opening
  contour fixes it; the regression now clicks visible bezel corners and verifies they open the
  picker rather than entering the desk. No other important review findings remained.
- Screenshots are in `.tmp/monitor-models-shots`, with additional fixture output under
  `.tmp/monitor-models-appearance`, `monitor-models-media`, `monitor-models-outlines` and `monitor-models-props`.

## Checks

| Check | Result |
| --- | --- |
| Web types | Passed |
| Web unit tests | 169 passed |
| Scratch Vite production build and desktop update stylesheet | Passed; existing large-chunk warning |
| Server formatting and strict all-target/all-feature Clippy | Passed |
| Server all-target/all-feature tests, separate target and scratch TEMP/TMP | 129 passed |
| Python | 47 passed, 1 skipped |
| Desktop formatting and strict release Clippy | Passed |
| `room-hardware.mjs` | Passed, including all three new models on both monitors |
| `room-readiness.mjs` | Passed |
| `room-appearance.mjs` | Passed |
| `monitor-media.mjs` | Passed: locally generated video, GIF, pictures, playback/pause, resets and missing files |
| `object-outlines.mjs` | Passed |
| `room-props.mjs` | Passed in light and dark |
| `git diff --check` | Passed |

This validates the browser implementation, not a new packaged desktop installer. The built-in
image-generation outputs, prompt set and composition approach are recorded in
`web/public/room/hardware/ARTWORK.md`.
