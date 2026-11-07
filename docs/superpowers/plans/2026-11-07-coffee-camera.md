# Coffee and camera choices implementation plan

**Goal:** Let the user choose the iced drink and camera in the room, with the existing pale-blue outline.

**Approved design:** Iced latte, cold brew, iced matcha, strawberry milk; current black camera,
silver film camera, cream instant camera, sage compact. Clicking the artwork opens a compact
picker. Photos and Buy me a coffee remain explicit actions inside the appropriate picker.
Narrow screens retain direct Photos access and gain Coffee/Camera picker shortcuts.
The shortcut row wraps while preserving 44px targets, checked at 320px and 390px.
Escape, Done and backdrop clicks close and restore the actual opener (or its visible shortcut
after a resize). Initial load failure retains the original painting and its original focus cue;
later failures retain the last successful art, with Retry and explicit unsaved-storage feedback.
The support action stays a real external link, including modifier/middle-click behavior.

**Architecture:** A small typed prop catalogue and shared picker/art component own the two
independent browser-local choices. Load a complete sprite/background set before swapping;
retain the previous appearance on failure, guard stale loads, and handle cross-tab updates.
Repair only small desk regions using separate backgrounds for all four room lights. Fit
transparent artwork to fixed scene rectangles with grounded baselines. Reuse ObjectOutline.
No provider calls, autoplay, navigation or support-link opening just from selecting a design.

**Tech stack:** Existing React/TypeScript, SVG/CSS, browser storage and isolated Chrome fixtures.

- [x] Generate and inspect transparent sprites and four aligned background repairs using built-in imagegen.
- [x] Add `web/src/room/roomPropOptions.ts`, a local choice hook and `RoomProps.tsx` for art and compact dialogs.
- [x] Connect camera/coffee targets, mobile shortcuts and existing support feedback in Room/RoomObjects.
- [x] Extend the shared outline to the two new props; preserve monitor, chair and other interactions.
- [x] Verify all choices, lighting, keyboard/phone, persistence, failed/stale loads, Photos and explicit support action.
- [x] Update affected browser expectations, guide/design/release notes, asset provenance and validation report.
- [x] Run required checks with isolated data/build outputs and review checked scope for the main-branch commit.
