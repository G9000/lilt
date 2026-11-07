# Player contact and browser fixture isolation

- Player shadows now use the artwork's foot coordinates inside the same transformed element.
  The turntable follows the desk angle more closely. Original artwork, chair masking and
  playback remain in place.
- `bun run typecheck`: passed.
- `bun run test`: 167 passed.
- `bun x vite build --outDir ../.tmp/player-contact-build` from `web`: passed; existing large
  entry chunk warning remains. The owner's `web/dist` was not overwritten.
- `node e2e/player-depth.mjs ../.tmp/player-contact`: passed rendered chair coverage,
  visible contact shadows under the exposed foot in four lights, and stationary player bodies.
- `node e2e/room-player.mjs ../.tmp/player-contact-controls`: passed light/dark selection,
  playback, persistence, microphone ducking, visibility, reduced motion and fallback checks.
- Inspected the turntable in the rendered room, including a larger crop saved at
  `.tmp/player-refinement/grounded.png`. Visual acceptance remains the owner's judgment.

Browser fixtures previously shared `web/node_modules/.vite` with development and each other.
Each now receives a temporary cache removed when its server closes. The regression
`node --test e2e/isolated-vite.test.mjs` failed against the old helper and passed after the fix,
using a disposable project and preserving its development-cache marker.

Read-only host inspection observed the development processes change from their 14:52 start
to a 16:08 start on 7 November. No owner server was stopped or restarted during this work.
Cache sharing is a confirmed isolation defect, but the cause of that process restart is not
established without the terminal's exit/restart messages. Native checks were not rerun for
these web-only fixes.
