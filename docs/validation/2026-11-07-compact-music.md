# Compact Music controls — 7 November 2026

Music now opens in a 340px native dialog over the current view, matching the tea controls.
The route and camera stay put; the dialog keeps the underlying app and Spotify host mounted.
A painted preview, source tabs, mood menu, transport, volume and compact artwork disclosure
replace the large Music window. Old `#/music` links open the same dialog over the room.

## Verified

- First ran the changed Music browser regression against the old implementation: it failed
  because opening changed the route to `#/music`. The completed implementation passes.
- `web/e2e/music.mjs` passes: compact bounds, native modal keyboard behavior, unchanged room
  route, unchanged Photos route and page node while open, no autoplay, all 17 moods producing
  unclipped Web Audio output, volume/mute, microphone ducking, source-change races, persistent
  simulated Spotify controller, phone layout, Escape/backdrop dismissal and legacy links.
- `web/e2e/room-player.mjs` passes in light and dark: four designs, persistence/reset,
  playback-driven motion while the dialog is open, hidden-tab and reduced-motion behavior,
  artwork/storage failures and retry, phone focus restoration and resize-to-desktop fallback.
- `web/e2e/tea.mjs` passes in both themes, including timer recovery, steam, sound suppression,
  keyboard/phone controls and artwork/storage fallback.
- `web/e2e/room-appearance.mjs` passes with the new phone-dialog navigation expectation.
- Inspected composed light desktop and dark phone screenshots under `.tmp/compact-player-final`.
  The controls remain legible and the expanded four-choice artwork row fits within the dialog.
- Typecheck, 167 web unit tests and production build to `.tmp/compact-music-web` pass.
  Vite still reports its existing large-chunk warning.
- Server formatting, all-target/all-feature Clippy and all 129 Rust tests pass with the
  isolated `server/target/yarn-check` target directory.
- Desktop formatting and release Clippy pass with `desktop/target/yarn-check`.
- Python: 47 passed, one skipped, with scratch pytest directories.
- Source review found no actionable issues; its suggested while-open route/page-preservation
  assertions were added and passed. A resize regression confirmed focus restoration must
  happen after native dialog closure and prefer a visible mini player over hidden shortcuts.

Browser suites use isolated Vite and stubbed application APIs. Spotify is simulated, not a
live account acceptance test; audio is measured, not manually auditioned. No owner data,
port 7878, deployed `web/dist`, running server or native installer was changed by validation.
