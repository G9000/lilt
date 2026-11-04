# Cozy Ball of yarn visual refresh

The owner requested better UI and graphics and selected the cozy illustrated game direction.
Use a warm window-side room, woven coral yarn, a readable tuxedo cat, and restrained rope loops.
Keep the existing voice game rules, comfort stops, calibration, and descriptive summaries.

- [x] Build an isolated browser check and capture the current view.
- [x] Move decorative drawing into `web/src/yarn-art.ts`: a cached illustrated backdrop,
      layered yarn strands and connected cat anatomy. Preserve the pitch/loop coordinates.
- [x] Revise `web/src/pages/Yarn.tsx` and `web/src/styles/yarn.css`: side-by-side setup,
      compact mode choices, optional detail disclosure and accessible play controls.
      Narrow screens stack the illustration and setup; controls remain scroll-reachable.
- [x] Inspect setup, play, breathing and summary with a fake microphone. Cover light/dark,
      reduced motion and 390px through 3840px widths in `web/e2e/yarn-ui.mjs`.
- [x] Update guide, release notes, design and validation. Run applicable project checks,
      review the change and save a local commit on main. Do not push.

The backdrop is drawn once per canvas size/theme and composited each frame. No downloaded
or generated image is needed; drawings scale cleanly. Gameplay stays free of scores and
deadlines, and the illustrated environment stays behind the yarn and loops.

Verified with the isolated fake-microphone suite, inspected screenshots from phone through
4K, and all required project checks. Review's range-label contrast finding was corrected
with a solid backdrop. Existing build-size and Windows hard-link warnings remain.
