# Selectable painted music players — 7 November 2026

Four generated transparent players replace the radio in the room: cream cassette, sage
boombox, walnut radio and record player. Music's “Your room player” picker saves the choice
in this browser. Artwork provenance and exact prompts live in `web/public/room/players/`.
Only a feathered rectangle around the old radio uses the generated empty-room plates.

## Verified

- `bun run typecheck` and all 167 web unit tests passed.
- Production web build passed to `.tmp/room-player-web`, preserving `web/dist`. Vite reports
  its existing large-chunk warning.
- `node e2e/room-player.mjs ../.tmp/room-player-final` passed in light and dark themes:
  all four choices, no autoplay, reload and cross-tab persistence, fixed room position,
  playback-driven motion, microphone ducking, hidden-document suspension, reduced motion,
  all four room lights, phone picker bounds, image failure/retry, unavailable storage and
  a stale failed image request following a successful newer choice.
- Keyboard focus returns to the remounted phone Music shortcut. Resizing to desktop while
  Music is open instead returns focus to the visible mini player. Review found that resize
  edge case; the fix and both browser regressions passed.
- `node e2e/music.mjs ../.tmp/room-player-final/music` passed, including real Web Audio output
  for all 17 moods, no clipping, source changes, persistent controls and microphone ducking.
- The room appearance and tea browser suites passed, including mug steam, timer recovery,
  phone controls and image/storage fallback. Composed screenshots were inspected for all
  four players, the picker, phone layout and night lighting.
- Server formatting, all-target/all-feature Clippy and all 129 Rust tests passed with the
  isolated `server/target/yarn-check` target directory.
- Python checks passed: 47 passed, one skipped, using scratch pytest folders.
- Desktop formatting and release Clippy passed with `desktop/target/yarn-check`.

## Scope of evidence

Browser suites use isolated Vite servers and stubbed application APIs. Spotify coverage
uses simulated published/controller state, not a live Spotify account. The lo-fi output was
measured by the browser suite, not manually auditioned through headphones. Native installer
and physical-device acceptance were not repeated. Tests did not use the owner's practice
folder or port 7878, restart their server, or replace their deployed web build.
