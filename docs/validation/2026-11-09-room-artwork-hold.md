# Hold to change room artwork — 9 November 2026

Painted objects now share the cat's 650ms hold gesture. Short clicks retain the everyday
actions for the mug, player, camera, iced coffee and microphone. Chair, plant and monitor-frame
pointer clicks do not open artwork choices. Keyboard entry and explicit picker controls remain.
The cat's implementation, artwork, saved choices and monitor screen entry were left intact.

## Verified

- `web/e2e/artwork-hold.mjs` failed first because the shared hook did not exist, then passed
  in isolated Chrome. It checks short clicks, holds, release suppression after a native modal
  opens, movement cancellation, pointer cancellation, Escape, blur, keyboard, real CDP touch,
  native anchor navigation and actual painted-object mappings.
- Tea and room-player suites passed in light and dark. A short click keeps artwork choices
  collapsed; a hold opens them. Releasing does not choose artwork, enter the desk or start music.
  Explicit Change mug/Change player controls remain usable by keyboard and on narrow screens.
- Existing chair, chair-outline, plant, object-outlines, room-hardware, room-props,
  room-appearance and room-readiness suites passed with the intentional interaction changes.
  This includes all designs, silhouettes, lighting, saved choices, cross-tab updates,
  failures/retry, screen entry, external-link modifiers and cold artwork loading.
- The full music suite passed all 17 moods and checks for controls, no autoplay, focus,
  persistent mini player, microphone ducking and phone layout. An earlier run interrupted
  during concurrent source edits was superseded by this complete run.
- Web types and all 208 unit tests passed. Production web and desktop stylesheet builds used
  `.tmp/hold-web` and `.tmp/hold-updates.css`; the existing large-chunk advisory remains.
- Server formatting, strict all-target/all-feature Clippy and all 138 tests passed using
  `server/target/yarn-check` with scratch TEMP/TMP. Desktop formatting/release Clippy passed.
  Python: 47 passed, one skipped, with a scratch uv cache and test directory.
- Independent read-only review found no actionable gesture, keyboard, release, cleanup or
  focus issues. The compact music controls were also inspected in a rendered screenshot.

Browser suites used private Vite ports, disposable Chrome contexts and stubbed APIs. The
owner's data, running app and dev server were not reset or restarted. No native-device touch,
Safari or live Spotify/provider verification is claimed. Logs and screenshots are under
ignored `.tmp/hold-*`; the focused media suites also returned their own check output.
