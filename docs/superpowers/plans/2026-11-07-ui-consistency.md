# UI consistency implementation plan

**Goal:** Apply the approved calmer, consistent UI direction to Settings, Course Home and
Today's practice, supported by shared controls and visual tokens.

**Architecture:** Reuse the existing shared button classes and semantic color tokens. Fix
the Practice button reset that currently strips their styles. Keep reading and recording
behavior intact, with a centered reading column and responsive layouts. Room/game artwork
continues to establish the setting; task cards communicate their task.

**Tech stack:** Existing React, TypeScript and CSS; no new runtime dependencies.

- [x] Define shared spacing, type, control-height and corner tokens in `web/src/styles.css`.
      Use the shared primary/secondary controls throughout the affected pages, remove the
      conflicting Practice reset and redundant per-page button sizing.
- [x] Simplify Settings category icons and duplicated headings; align the rows, help text,
      inputs and actions with the shared system in `Settings.tsx` and `settings.css`.
- [x] Give Course Home a consistent title and section rhythm, clear primary action and
      quiet navigation. Apply the same scale to course management and daily practice.
- [x] Simplify the desktop Today widget to a light/dark task surface, retaining its actions
      and data. Keep the room's widget positions and artwork intact.
- [x] Verify the affected screens with isolated browser fixtures: light/dark, phone/desktop,
      enlarged text, settings saves, course links and daily recording/review controls.
      Run web types, unit tests and a scratch production build; inspect screenshots.
- [x] Update design/guide/release notes, review the diff, commit checked changes on main,
      and update the local web build after announcing it. Do not push.
