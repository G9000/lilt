# Tea from the painted cup — 7 November 2026

Moved TeaBreak from the floating widgets into the room painting. Four transparent shaded mugs
replace the original desk cup over a small feathered repair region in each of the four lights.
The existing deadline, browser preferences, optional clink and microphone suppression remain.
Small screens have a Tea shortcut. Image load failures preserve the original or last loaded cup.
Artwork provenance and exact prompts are in `web/public/room/mugs/`.

Verified on Windows:

- Web typecheck and all 167 unit tests passed.
- Production build passed into `.tmp/painted-mug-web`, with the existing Vite chunk-size warning.
- Isolated light/dark Chrome tea suite passed: all four raster choices, fixed scene placement,
  reset and reload persistence, 3/5/10-minute timer behavior, elapsed-deadline recovery,
  cancellation, keyboard/focus, 800×600 dialog bounds, phone shortcut, cross-tab updates,
  one-shot clink, microphone suppression, quiet wake-up and disabled trigger at the desk.
- Tea coverage also passes all four lights, matching fade transitions, reduced/normal-motion
  steam, replacement and initial-load failures with retry, and unavailable browser storage.
- Light/dark plant regression suite and the full room-layout suite passed, including phone
  sizes and 3840×2160. Room-appearance suite passed.
- Server format and Clippy passed; all 129 Rust tests passed using `server/target/yarn-check`.
- Locked Python sync passed; 47 tests passed and 1 skipped with scratch temp/cache paths.
- Desktop format and release Clippy passed using `desktop/target/yarn-check`.
- Read-only review found no code issues; its suggested image-failure coverage was added and passed.
- Inspected the room composition, mug picker, all mugs/lights and phone screenshots under
  `.tmp/painted-mug/tea`. Sprite backgrounds have real PNG alpha. The art is shaded 2D, not 3D.

No owner data or port 7878 was used. The running app was not restarted, `web/dist` was not
replaced, and no native installer was built or tested. Clink checks observe synthesis and
suppression; speaker playback was not manually auditioned. This supersedes the draggable-mug
placement described in `2026-11-07-tea-break.md`.

Follow-up: added faint idle steam and fuller drifting curls during a break. Three staggered
wisps rise, spread and fade, starting near each mug's rim; completion settles the steam.
Reduced motion retains still wisps. The light/dark tea suite now verifies idle/running/finished
states and observes changing transforms over time with normal motion. Screenshots inspected
under `.tmp/tea-steam`. Web types, all 167 unit tests, scratch production build, server format/
Clippy and 129 Rust tests, Python (47 passed, 1 skipped), desktop format/release Clippy passed.
Chrome local-network access and Rust temporary data-file access were initially blocked by the
sandbox; both checks passed when rerun with the required access. Owner data remained untouched.
