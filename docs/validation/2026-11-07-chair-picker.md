# Selectable room chairs — 7 November 2026

The original mesh chair, cream upholstered chair, sage padded chair and walnut-and-cane
chair are selectable through a compact dialog. Clicking the back or using the phone's Chair
shortcut opens it. Selection is local, survives Reset layout, and syncs between tabs.

Original painting pixels supply the default chair and foreground bed. Generated replacement
cutouts and lighting-specific background repairs are documented under `web/public/room/chair`.
The under-desk repair is continuous and feathered: a silhouette-only repair left visible
old-chair seams and was rejected during screenshot inspection. Chair bodies never animate.

## Checks

- `bun run typecheck`: passed.
- `bun run test`: 169 passed, including saved chair validation and original fallback assets.
- Vite production build to `.tmp/chair-web`: passed; existing large-entry-chunk warning remains.
  Desktop Tailwind styles also compiled to `.tmp/chair-updates.css`.
- `node e2e/chair.mjs ../.tmp/chair-picker`: passed all designs/lights, no body transform or
  animation, no autoplay/navigation, storage/reset/cross-tab behavior, failed images and
  repairs, stale loads, storage denial, keyboard dismissal/focus, and phone/dark controls.
- `node e2e/chair-depth.mjs`: passed actual rendered-pixel occlusion in 48 chair/player/light
  combinations, bed-over-chair pixels in 12 scenes, and chair loading while player images fail.
- `node e2e/player-depth.mjs ../.tmp/chair-player-depth`: passed original-chair overlap,
  contact shadows, light transitions and stationary player bodies.
- `room-player.mjs` and `tea.mjs`: passed both color themes, including their playback/timer,
  keyboard/phone, image/storage fallback and microphone interactions.
- Server formatting, all-target/all-feature Clippy, and 129 tests passed using `target/yarn-check`.
- Desktop formatting and release Clippy passed using `target/yarn-check`.
- Python: 47 passed, one skipped; scratch pytest directories under `.tmp/chair-pytest*`.
- Scoped code review found no actionable issues and separately checked all six phone shortcuts.

Inspected actual room screenshots in all light presets. Final closeups and a clean picker
capture are under `.tmp/chair-final`; the complete scene matrix is under `.tmp/chair-picker`.
Browser checks use isolated caches/ports and stubbed APIs. Native checks use scratch targets;
the owner's practice data, running server and deployed `web/dist` were not changed. No live
provider, packaged-installer or physical-device acceptance was performed.
