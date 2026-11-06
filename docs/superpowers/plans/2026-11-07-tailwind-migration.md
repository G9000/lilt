# Tailwind migration implementation plan

> Execute the approved full migration with independent area implementers and a final integration review.

**Goal:** Use Tailwind for all Lilt UI component styling, removing handwritten component
stylesheets while preserving the existing look, behavior and custom accent.

**Architecture:** Tailwind 4 utilities in JSX and explicit reusable TypeScript recipes. Keep
semantic marker classes where browser tests or interaction selectors need them. No runtime
class-name lookup, legacy stylesheet copied into a plugin, or blanket @apply conversion.
Only theme variables, document defaults, font imports and animation keyframes remain as CSS.
Use named utilities for common values and arbitrary utilities/variants for precise illustration
geometry and descendant content. Shared control recipes are composed explicitly.

**Tech stack:** Existing React/TypeScript/Vite/Bun with Tailwind 4 and its Vite integration.
Use CSS-first theme configuration. Omit Preflight to preserve current document defaults.
The owner explicitly dropped older Safari support; modern Tailwind browser requirements apply.

- [x] Install pinned Tailwind/Vite integration; configure explicit source paths, colors,
      type and spacing tokens; ensure isolated browser fixtures use the same integration.
- [x] Convert Practice/editor/recording/flashcard styles into utilities and recipes; preserve
      Markdown, recording, resize, keyboard and reduced-motion behavior.
- [x] Convert room/desktop/music/yarn styles into utilities and recipes; preserve painted
      geometry, drag positions, animation and phone layouts.
- [x] Convert Settings/course/data/photo/text/shared controls and Markdown styling; remove
      obsolete imports and stylesheets. Convert the small native Updates HTML UI too.
- [x] Audit all source for remaining handwritten component CSS, missing generated utilities,
      dynamic class construction, and conflicting shorthand/state utilities. Check production
      output and source scanning; document how new UI should be styled.
- [x] Run web typecheck/unit tests/build and isolated browser suites covering appearance,
      accent, layout, music, yarn, Markdown, Settings, storage/backups, recording and deck.
      Compare screenshots at phone/desktop sizes and light/dark themes. Do not use owner data.
- [x] Review final changes, update guide/design/release/validation notes, announce and update
      the local web build, verify served assets, commit finished work on main. Do not push.
