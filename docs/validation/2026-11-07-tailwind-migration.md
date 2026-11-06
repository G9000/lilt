# Tailwind 4 migration — 7 November 2026

All 17 handwritten web component stylesheets were replaced with explicit Tailwind utility
recipes. Shared CSS now contains theme variables, document defaults, animation keyframes and
Tailwind configuration. The native updater's CSS is generated from its HTML utilities and theme.
The owner explicitly chose Tailwind 4 and dropped older Safari support.

## Checks

- Web typecheck passed; all 153 unit tests passed.
- Scratch production build passed. Tailwind 4.3.5 and its Vite/CLI packages are pinned.
- The normal `bun run build` passed, including native updater CSS generation. A temporary
  static production preview passed the full UI consistency suite. The normal local app address
  on port 7878 was not running, so serving through the owner's server could not be verified.
- The new `web/e2e/tailwind.mjs` check verified all reusable recipe candidates occur in generated
  CSS (over 10,300 classes). This catches quoted arbitrary values that source scanning can miss.
- UI consistency: Home, daily deck, Settings, enlarged text, desktop Today and guided practice
  passed at 390/1440px in light/dark themes. The guided plan/action attachments caught in review
  are included in this suite.
- Accent picker and Markdown suites passed, including persistence, contrast, safe content,
  five reading widths and enlarged text.
- Stationery deck passed recording/retry, ratings, Again order, eyes-off reveal, selection,
  completion and comfort stop.
- Settings comparison: 9 passed. Storage/backups: 15 passed. Feedback switching/scale passed.
- Room layout: 16 variants passed. Room appearance, sticky notes and monitor media passed.
- Music passed all 17 moods, microphone ducking, mini player and phone layout.
- Yarn passed fake-voice play, threading, responsive layouts through 4K, breaks, summary,
  strain stop, calibration and artwork fallback. Fake-pitch waits now have explicit time limits.
- Native updater browser checks: 14 passed, covering actions, retry, hidden states, keyboard access and both
  color schemes. Its 380px breakpoint and heading line-height were checked against the old CSS.

Independent computed-style comparisons against saved original CSS found zero differences in
36 representative page layouts, 18 room/music/Yarn variants and 12 practice layouts. The 36
page screenshot pairs were also byte-identical. These comparisons supplement functional browser
tests; they do not claim every possible state was exhaustively captured.

The final independent review found a missing guided-session recipe attachment, which was fixed
and added to the UI suite. No remaining blocking findings were reported.

## Scope and limitations

Browser evidence is Windows Chrome with disposable API fixtures and a fake microphone.
Fixture Vite servers use isolated ports and no backend proxy. No owner's practice data was used.
Native Mac packaging, Safari and Rust/Python behavior were not revalidated by this styling task.
Concurrent Windows packaging and backend work is separate.

A workspace interruption zero-filled several files and the Git index. The index was backed up
and reconstructed without replacing working files. Migration files were recovered selectively
from committed originals and intact conversion backups; the checks above were rerun after
recovery. A source audit found no remaining NUL-filled product files.

This pass prioritizes visual and behavioral parity. A measured production build is approximately
942 KB CSS / 139 KB gzip and 1,437 KB JavaScript / 378 KB gzip, compared with approximately
238 KB / 50 KB and 926 KB / 300 KB before migration. The existing large-JavaScript warning remains.
This is the bundle-size baseline for follow-up work: simplify unconditional guarded recipes into
shared utilities and remove verified dead recipes while retaining the parity checks. No startup
or interaction performance improvement is claimed.

Ignored screenshots and comparison reports are under `lilt-data-tailwind/`, including
`final-shots`, `pages/parity.json`, `room-parity.json` and `practice-parity-recovered.json`.
