# Ball of yarn artwork — 7 November 2026

Added five locally bundled WebP assets: day and night rooms plus watching, reaching and
resting kitten poses. Their combined size is about 1.45 MB. Generated kitten transparency
is preserved. Yarn wraps now have individual twisted fibers and a fine fuzzy edge.

The room is cached separately from moving elements. Images load without blocking setup
or the microphone; the original drawn scene and cat provide an individual-asset fallback.
Game rules, voice analysis and microphone ownership are unchanged.

Verified on Windows:

- `bun run typecheck` passed; all 153 web unit tests passed.
- Production build passed into `lilt-data-yarn-art/web`.
- `node e2e/yarn-ui.mjs ../lilt-data-yarn-art/after` passed with Chrome's fake microphone
  and stubbed APIs: pitch following, loop reactions, free play, speaking, calibration,
  breathing breaks, stop/comfort stop, reduced motion, and phone through 4K layouts.
- The suite waits for artwork before comparing still/moving previews. It also blocks
  every new image request and verifies a painted fallback and usable setup controls.
- Inspected day/night desktop, phone and short-landscape screenshots. Added a quiet
  background to Another line, fine cream loop edges, and moved phone pitch labels to
  the right so they do not cover the kitten. Intro copy remains readable over the art.
- A separate read-only code review found no material implementation issues.

Screenshots live in ignored `lilt-data-yarn-art/before` and `lilt-data-yarn-art/after`.
All browser checks used isolated fixtures; the owner's recordings and practice data were
not used. This is browser validation on Windows, not a native Mac packaging check.
