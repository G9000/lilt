# Tailwind bundle optimization

> Execute in this session with measured builds and browser comparisons. Preserve unrelated working changes.

**Goal:** Reduce the CSS and JavaScript added by the migration without changing Lilt's appearance or interactions.

**Architecture:** Remove redundant per-component zero-specificity guards from explicitly attached utility recipes so Tailwind can reuse the same rules. Keep real state and ancestor selectors. Measure further simplification only where equivalent declarations and browser results support it; do not replace Tailwind with generated legacy CSS.

**Tech stack:** Tailwind 4, Vite, React, TypeScript, Chrome browser fixtures.

- [x] Capture the production size baseline and inspect recipe duplication and attachment assumptions.
- [x] Simplify recipes in `web/src/ui/`, preserving state selectors and cascade behavior. Room recipes already used unguarded utilities and needed no edits.
- [x] Verify utility generation, type checks, unit tests and computed-style comparisons for practice, pages and room; run relevant interaction suites.
- [x] Record before/after build sizes and styling conventions in `docs/tailwind.md` and a validation report.
- [x] Review and commit only this optimization on main; do not push or touch the owner's running app/data.
