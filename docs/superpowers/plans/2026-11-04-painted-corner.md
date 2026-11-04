# Painted corner implementation plan

**Goal:** A playable, real 3D window/desk/lamp/fan corner matching the approved cool, hand-painted summer concept.

**Architecture:** An optional, lazy-loaded `#/painted-corner` preview, isolated from practice APIs and recording recovery. Three.js renders modeled furniture with painted surfaces, a layered outdoor painting, soft toon lighting, curtains and foliage. React owns accessible controls; the renderer owns geometry, bounded camera movement, picking, animation, and cleanup. The existing home links to the preview.

**Tech stack:** Existing React/TypeScript/Vite, Three.js, Node tests and Chrome/Playwright.

## Accepted design

- Cool teal shade, cream sunlight, leafy window, weathered wood, restrained outlines; no glossy cartoon finish.
- Actual 3D desk, adjustable lamp and fan, with camera orbit constrained to a composed corner. Painted scenery beyond the window is intentionally layered.
- Lamp toggles visible light; fan cycles off, low, high with animated blades and head. Window curtains move gently. No audio or microphone access.
- Drag and pinch/wheel navigation plus keyboard camera controls, reset view, pause motion, reduced-motion support, touch-sized lamp/fan controls, and a clear exit.
- Handle absent WebGL, texture failure and lost context without an empty page. Dispose all GPU resources and stop animation on exit/hidden tabs.
- Preview only; no replacement of the owner's home and no changes to practice data.

## Steps

- [x] Add an interaction acceptance test first (`web/e2e/painted-corner.mjs`), covering standalone entry, no API calls, rendered scene, lamp/fan state, camera/reset, reduced motion, failure fallback and mobile layout.
- [x] Add pinned Three.js and types; create painted asset(s) under `web/public/painted-corner/`, with provenance.
- [x] Build `web/src/painted-corner/materials.ts`, `objects.ts`, `scene.ts`, `PaintedCorner.tsx`, and `corner.css`; keep responsibilities separated.
- [x] Route the preview from the root entry, lazy-load it, and add a home link. Update guide, design, release notes and validation.
- [x] Run typecheck, web tests/build and the new real-browser suite. Inspect screenshots and refine the art. Run the repository's other mandated checks and record platform limitations accurately.
- [x] Obtain an independent code review and address findings. Review confirmed no remaining blockers.
- [x] Commit checked work on main without pushing, and provide the verified preview URL: `http://127.0.0.1:5173/#/painted-corner`.

## Acceptance

The user can inspect real perspective changes and operate lamp/fan by clicking their geometry or using accessible controls. The painting is a reference, not a falsely presented screenshot of the final result. Mobile and reduced-motion modes remain usable. Native tests never use owner data or port 7878; browser tests run their own Vite instance with no backend.

Review additions verified: dappled interior sunlight, direct geometry picking, separately observed lamp illumination and fan animation, simulated hidden-document draw pause/resume, context loss, repeated entry/exit, and saved themes opposing the OS theme. The first browser acceptance run failed because the preview did not yet exist. Subsequent visual refinements corrected narrow-screen framing and changed procedural surfaces to a painted atlas.
