# Painted desk mug implementation plan

**Goal:** Apply the approved integrated plant treatment to the actual desk cup, retaining the tea timer.

**Architecture:** TeaBreak moves from Floaters into the room painting. Transparent shaded mugs
replace the painted cup over a small feathered background repair in each light. Timer/storage/audio
remain unchanged; the room trigger and a small-screen Tea shortcut open the same dialog.

**Tech stack:** Existing React/TypeScript, Tailwind, PNG room art and isolated Chrome suites.

- [x] Generate four mug cutouts and empty-cup room plates with the built-in image tool; save prompts/provenance.
- [x] Update tea browser tests for fixed painted placement, raster choices, phone access and load fallback.
- [x] Implement anchored art, lighting, steam, image loading and focus restoration in TeaBreak;
      remove the floating mug and add Tea shortcut in RoomObjects.
- [x] Visually inspect all choices and lighting, run tea/plant/layout/appearance regression checks
      and required project checks with scratch output. Review code.
- [x] Update guide, design and release notes; record validation and commit on main without pushing.
