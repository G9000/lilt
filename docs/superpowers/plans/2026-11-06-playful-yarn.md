# Playful Ball of yarn implementation plan

**Goal:** Refresh Yarn with playful cartoon art and livelier cat reactions, the direction chosen by the owner on 6 November.

**Design:** Keep the warm window-side room and voice-controlled yarn. Give the wool broad overlapping wraps, a rounded silhouette and a ground shadow. Redraw the tuxedo cat with a larger expressive face, soft paws, blinks, a reaching paw near the yarn, and a brief happy reaction after threading a loop. A resting cat really curls up. Add richer scenery at the edges while keeping the playing area readable. Offer optional free play without loops or loop sounds; keep humming/speaking choices, calibration, breaks and comfort stops.

**Architecture:** Keep static art cached in `web/src/yarn-art.ts`; draw animated characters separately. A small pure reaction helper in `web/src/yarn.ts` supplies time-based poses, including a reduced-motion fallback. `web/src/pages/Yarn.tsx` owns the free-play preference and passes it into the game. No new dependencies or changes to microphone capture, storage or pitch tracking.

**Tech stack:** Existing React, TypeScript and Canvas 2D.

- [x] Cover cat reaction timing and reduced motion in `web/src/yarn.test.ts`; verify failures before implementing the helper.
- [x] Redraw the ball, cat and scenic details in `web/src/yarn-art.ts`; wire reactions and loop feedback into `Yarn.tsx`. Match the room illustration and dock icon.
- [x] Add accessible free-play selection and test its persisted preference, absence of loops and sounds, voice response and breathing controls in `web/e2e/yarn-ui.mjs`.
- [x] Inspect isolated browser screenshots in light/dark, reduced motion, phone, landscape and large desktop layouts. Use fake microphone and stubbed APIs only. Verify the real threaded event, freeze/resume without retriggering and reset in a new game.
- [x] Update `docs/guide.md`, `web/src/release.ts`, `DESIGN.md` and validation evidence.
- [x] Run web types/tests/scratch build and the required project checks, using a separate Rust target and web output directory. Review the diff, then commit finished work on main without pushing.

**Acceptance:** The ball reads as wound wool, the cat's reactions follow actual play and settle without jitter, free play generates no loops/cues, controls remain reachable, and stopping/breaks retain the existing behavior. Decorative movement stops with reduced motion. No scores, streaks or pressure to reach a particular pitch.

Review tightened reaction lifecycle coverage. Installed Motion's preference hook retained its initial
value, so Yarn now listens to the media query directly, matching the monitor-media pattern.
Checked live preference changes with canvas pixels and inspected the happy cat hop in the browser.
