# Player placement and foreground chair — 7 November 2026

Each room player now has its own position, size, slight desk angle and contact shadow.
The chair/throw silhouette is a new transparent asset extracted with the built-in image tool.
Only its alpha is used: the original room paintings supply the foreground pixels in all four
lights. This restores chair occlusion without replacing the original chair's texture or color.
Asset provenance and the exact prompt are in `web/public/room/chair/`.

## Verified

- The initial room-player regression failed on the missing foreground chair layer, then passed
  after implementation. `web/e2e/room-player.mjs` passes in light and dark, including all four
  designs, CD controls, playback motion, room lighting, keyboard/phone behavior, persistence,
  stale loads, image/storage failure and retry. A failed chair-mask load keeps the original
  painting instead of displaying a player without its required foreground.
- `web/e2e/player-depth.mjs` passes actual rendered-pixel checks for all four devices in all
  four light presets. A chair-edge sample matches the original room to within four channel
  levels on average; hiding the foreground makes that same sample visibly differ, confirming
  the chair truly occludes the device rather than merely being ordered later in the DOM.
- The depth suite also checks synchronized foreground/background opacity during lighting
  transitions with motion enabled, and fixed body bounds while each player's details animate.
- Inspected full-room images and close-ups for every device, including night, morning and
  sunset. Crops are under `.tmp/player-depth-crops-final`; complete scenes are under
  `.tmp/player-depth-final`.
- Generated mask alpha was checked at empty corners, the desk and the chair. The PNG is copied
  unchanged; its 1670×941 canvas is registered to the room's 1672×941 rendering coordinates.
- Adjacent tea browser suite passes in both themes, including steam, timer recovery, mic
  suppression, keyboard/phone controls and load/storage fallback.
- Typecheck, 167 web unit tests and production build to `.tmp/player-depth-web` pass.
  The existing Vite large-chunk warning remains.
- Server formatting, all-target/all-feature Clippy and 129 tests pass with `target/yarn-check`.
- Desktop formatting and release Clippy pass with `target/yarn-check`.
- Python: 47 passed, one skipped, in scratch pytest directories.
- Source review found no actionable correctness issues in composition, loading or transitions.

Browser suites use isolated Vite and stubbed application APIs. Spotify state is simulated;
no live provider, installer or physical-device acceptance was performed. Owner practice data,
port 7878, the running server and deployed `web/dist` were not changed by validation.
