# Microphone, monitor finishes and refresh reveal

Verified on Windows, 7 November 2026. Tests used disposable browser storage, private Vite
servers with stubbed APIs, scratch web output and separate native build/test directories.
The owner's port 7878, practice data and development processes were not restarted or modified.

## Changes and visual evidence

- Four finishes for the microphone and each monitor frame, saved independently in this browser.
  Original black, warm cream, soft sage and brushed silver preserve fixed scene geometry.
- Compact pickers open from the painted objects or Make it yours. Main screen entry and the
  explicit microphone Practice action remain available; phone shortcut layout is unchanged.
- Pale-blue contours follow the whole microphone assembly and both frames/stands, with openings
  excluded from hit areas. Paths are derived from artwork alpha and smoothed like the chair.
- First reveal waits for decoded saved bundles, monitor content and the committed composition.
  Failure fallback releases the reveal; subsequent swaps retain visible artwork.
- Screenshots inspected all three subjects, frame contours, light/dark pickers and night lighting.
  A review found the mug repair overwriting 195 bezel pixels. Reordering repair, hardware, screen
  media and foreground props fixes that overlap. Monitor-media pixels remain unchanged when the
  hardware overlay is hidden. Evidence is in `.tmp/hardware-shots`, with the remaining fixture
  screenshots under `.tmp/hardware-appearance`, `hardware-layout`, `hardware-props` and `hardware-media-recheck`.

## Checks

| Check | Result |
| --- | --- |
| `bun run typecheck` | Passed |
| `bun run test` | 169 passed |
| Vite production build to `.tmp/hardware-web` | Passed; existing large-chunk warning |
| Desktop update stylesheet to scratch output | Passed |
| Server formatting and strict all-target/all-feature Clippy | Passed |
| Server all-target/all-feature tests in `target/yarn-check` | 129 passed |
| Python pytest | 47 passed, 1 skipped |
| Desktop formatting and strict release Clippy in `target/yarn-check` | Passed |
| `room-hardware.mjs` | Passed: 12 choices, direct pointer/keyboard contours, screen pixels, persistence, cross-tab independence, retry, stale decode, storage failure, light/dark, 320/390px phones, entry and delayed cold reveal |
| `room-readiness.mjs` | Passed: delayed bundles, refresh, cached decoding, StrictMode remount, failures, retry, stale swaps, custom media delay/missing upload and active base-image fallback |
| `room-appearance.mjs` | Passed with the new microphone picker/Practice flow |
| `room-layout.mjs` | Passed across desktop, ultrawide, tablet and phone layouts, drag/reset and light/dark |
| `monitor-media.mjs` | Passed: real locally generated video, GIF, pictures, pause, reduced motion, hidden tabs, cross-tab removal/reset and missing files |
| `object-outlines.mjs` | Passed: 12 existing cutouts, focus/hover, chair occlusion, growing plant and reduced motion |
| `room-props.mjs` | Passed in light and dark: eight drinks/cameras, lighting, navigation, persistence and failed/stale loads |
| Read-only code review | Bezel repair overlap fixed; no remaining important findings |
| `git diff --check` | Passed |

The first native test run could not create temporary directories under the sandbox (OS error 5).
The rerun used dedicated `.tmp/hardware-rust-temp` storage and passed all 129 tests. One parallel
monitor-media run timed out preparing its repeated pending video upload; the unchanged suite
passed when rerun alone, including the cross-tab reset case. Hardware stale-load coverage holds
image decoding explicitly, because already displayed images can bypass a new network request.

These are browser and code checks, not a new installed desktop-package acceptance run. Generated
artwork provenance and the prompt set are in `web/public/room/hardware/ARTWORK.md`.
