# Plant inside the room — 7 November 2026

Replaced the floating weekly tile with selectable, shaded floor-plant artwork beside the drawers.
Four transparent sprites and four empty-background plates were generated with the built-in image
tool. Only the plant region is composited over the original paintings. Prompts and provenance
are saved in `web/public/room/plants/`. Legacy choice IDs and browser storage remain compatible.

Verified on Windows:

- Web typecheck and all 167 Node unit tests passed.
- Production build passed into `.tmp/room-plant-web`; existing Vite large-chunk warning remains.
- Isolated Chrome plant suite passed in light and dark: all four choices; 0/3/7 practice days;
  fixed pot and position; all four room lights; keyboard/focus; reset and reload persistence;
  cross-tab updates; small-screen bounds and phone shortcut; disabled desk trigger; failed
  replacement and initial background loads with retry; unavailable storage; no API writes.
- Normal-motion checks confirm matching `2s ease` lighting transitions for the original room,
  repaired area and plant filter. Reduced-motion checks confirm immediate lighting/growth.
- Room-layout suite passed at all sizes through 3840×2160, including phones and reset/drag.
  Room-appearance and light/dark tea browser suites also passed.
- Server format and Clippy passed; all 129 Rust tests passed using `server/target/yarn-check`.
- Locked Python sync passed; 47 tests passed and 1 skipped with scratch temp/cache directories.
- Desktop format and release Clippy passed using `desktop/target/yarn-check`.
- Read-only review found a lighting-transition mismatch, fixed and covered above; no other
  loading or accessibility blockers. Screenshot inspection caught leftover painted leaves at
  the repair edge; the region was widened before the final browser checks.
- Screenshots are local under `.tmp/room-plant/plant`, with appearance and tea evidence alongside.
  Inspected all four plants, picker, lighting and responsive presentation. PNG alpha verified.

No owner data, port 7878, running server or `web/dist` was changed. No native installer was
rebuilt or tested. These are dimensional painted 2D assets, not interactive 3D models. This
supersedes the old tile behavior documented in `2026-11-07-plant-picker.md`.
