# Accent color checks

7 November 2026, Windows.

Accent color is available in Make it yours and Settings → Appearance. Presets, a native picker
and a hex field share one browser preference. Changes update shared tokens and pitch charts
immediately, survive reload and synchronize across tabs. Reset to orange changes only the
accent; Reset room also restores it. Storage failure keeps a session-only choice with a notice.
The original orange palette remains the default; custom colors derive readable light/dark tones.

Verified:

- Web typecheck and all 152 unit tests passed, including hex validation and 125 color samples
  checked for focus, text, tinted-surface and button-label contrast in both themes.
- Scratch production build passed; Vite reported the existing large-chunk advisory.
- `web/e2e/accent.mjs`: presets, native picker input, hex validation, two picker instances,
  reload, cross-tab synchronization/removal, malformed saved state, keyboard choice/dismissal,
  reset controls and failed storage. Screens fit 320, 390 and 1440 pixels in both themes.
- The canvas changed on a color update. Recording red stayed unchanged. Always-dark cards
  kept their own readable focus color, and highlighted annotation numbers followed button text.
- Existing room appearance checks passed. All nine Settings/comparison browser tests passed.
- Full built-app check used fresh scratch data and the existing course-review suite. The actual
  Settings → Appearance picker saved a color, fit desktop/phone layouts, and applied it to
  Practice after reload. Course navigation and six-width layout checks passed. Screenshots
  were inspected in `lilt-data-accent-review/app-shots/` (ignored scratch output).
- Server formatting and strict all-targets/all-features Clippy passed; all 113 Rust tests passed.
- Python: 47 passed, one skipped. Desktop formatting and release Clippy passed on Windows.
  These checks are not packaged Mac runtime acceptance.
- Review identified dark-card focus and highlighted-annotation contrast issues; both were
  corrected and covered by the browser check before completion.

Tests used isolated data, browser contexts and separate build outputs. No owner recordings,
preferences or running server were modified by tests. The web files served by the local app
are updated only after validation; open tabs pick up the controls on refresh.

After validation, the production web build was updated in `web/dist`. A read-only request
confirmed the owner's running app serves the new bundle containing the accent picker.
No running server restart or browser preference change was needed.
