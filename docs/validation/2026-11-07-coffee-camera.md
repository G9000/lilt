# Coffee and camera choices — 7 November 2026

The iced drink and camera now open compact pickers with four painted designs each and the
same pale-blue outline as the other room objects. Photos and the support link remain explicit
actions in their respective pickers. Choices persist independently in browser storage and
survive Reset layout. The eight cutouts and four lighting repairs were made with built-in
imagegen; prompts and output IDs are recorded in `web/public/room/props/ARTWORK.md`.

## Verified

- Typecheck and 169 web unit tests passed.
- Scratch production web and desktop stylesheet builds passed. The existing large-chunk
  warning remains; deployed `web/dist` was not overwritten.
- `room-props.mjs` passed in light/dark themes: all eight choices, fixed tabletop baselines,
  hover/focus outlines, reduced motion, four room lights, reset/reload persistence, cross-tab
  sync, Enter/Escape/Done, resize focus restoration and 320/390px shortcuts/dialog bounds.
- Missing initial backgrounds leave the original painting and focus cues intact; later
  failed choices retain previous art. Retry, out-of-order image completion and storage denial
  passed. Choosing artwork causes neither navigation nor support-link opening.
- Actual rendered monitor pixels remain identical when the coffee repair beneath them is
  hidden, confirming that chosen monitor pictures are not covered by the repaired desktop.
- Photos navigation passed. Normal support activation schedules the expected URL once, and
  native Ctrl-click passed using a same-origin surrogate. An early modifier-click fixture
  reached support-page scripts despite a narrow route interception; the final fixture uses
  the local surrogate and blocks HTTPS requests. All browser contexts were disposable and
  practice API calls were stubbed.
- `room-appearance.mjs`, `room-layout.mjs` and `object-outlines.mjs` passed. The expanded
  shortcuts initially covered a note drag handle on tablets; keeping a single row above
  599px resolved it while retaining two rows on phones. Layout drag/reset/persistence passed.
- Inspected cutouts, picker screenshots, tabletop crops, room lighting and phone layouts.
- Server formatting, strict all-target/all-feature Clippy and 129 tests passed in the
  separate `target/yarn-check` cache. Desktop formatting/release Clippy passed there too.
- Python: 47 passed, one skipped, with isolated scratch output/cache paths.
- Scoped design and code reviews completed; final code review found no actionable issues.

The owner's running server and practice data were not changed. Packaged desktop, Safari and
physical-device acceptance were not exercised. Artwork selection has no new server API.
