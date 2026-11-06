# Weekly plant picker

**Goal:** Let the user choose the weekly plant just like the tea mug.

**Design:** Keep the weekly widget in its existing home. Clicking it opens a keyboard-accessible
modal with Original sprout, Monstera, Fern and Succulent, previewed at the current week's growth.
Choosing changes the art immediately and saves in this browser. It never changes practice data,
counts, or adds scores. Zero days still says “A new week.” Each practice day fills another leaf
or frond. The modal closes with Done, Escape or backdrop, and returns focus to the widget.

**Implementation:** Extract the plant from `Desk.tsx` into `room/PlantWidget.tsx`; keep artwork
in `room/PlantArt.tsx` and validated preference/growth helpers in `room/plant.ts`. Follow the
tea dialog pattern, including disabled trigger inside the desk, cross-tab updates and a clear
storage-failure message. Preserve all unrelated edits currently in Desk and UI files.

- [x] Add preference and growth boundary tests and verify failure before implementation.
- [x] Implement four plant designs and the picker without changing its home or footprint.
- [x] Verify browser selection, growth at 0/3/7 days, reload, drag, keyboard, storage failures,
      reduced motion and light/dark layouts; rerun room layout and web checks.
- [x] Run repository backend/desktop checks with scratch targets and record results.
- [x] Update guide, design notes and release; review and commit only this feature on main.
