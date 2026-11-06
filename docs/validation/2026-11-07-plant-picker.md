# Weekly plant picker — 7 November 2026

Added Original sprout, Monstera, Fern and Succulent to the existing weekly plant widget.
Selections change only browser-local artwork. The home and footprint remain unchanged.

Verified on Windows:

- Web typecheck and all 166 Node unit tests passed.
- Production web build passed into `.tmp/plant-web`, with the existing Vite bundle-size warning.
- Isolated Chrome `web/e2e/plant.mjs` passed in light and dark: each plant at 0, 3 and 7 days;
  exact growth counts; unchanged widget size; reload and layout-reset persistence; keyboard
  open/Escape/focus restoration; drag without opening; dialog bounds at 800×600; cross-tab
  updates; disabled trigger inside the desk; and unavailable-storage fallback. API fixtures
  confirmed that choosing a plant never writes practice data.
- Reduced motion disables leaf sway. Normal motion enables it, with leaf bodies and veins
  sharing an animated group. Inspected picker, room and normal-motion screenshots under
  `.tmp/plant/final`. Animated screenshots use a viewport crop because the floating widget
  intentionally never becomes stationary for an element screenshot.
- Full `room-layout.mjs` suite passed, through 3840×2160 and phone layouts.
- Server format and Clippy passed; 129 Rust tests passed using `server/target/yarn-check`.
- Locked Python environment sync passed; 47 tests passed and 1 skipped with isolated temp/cache.
- Desktop format and release Clippy passed using `desktop/target/yarn-check`.
- Read-only review found no correctness issues; its normal-motion gap was addressed above.

No owner data or port 7878 was used. The running app was not restarted, `web/dist` was not
replaced, and no native installer was rebuilt. Like existing floating widgets, the plant
is hidden at phone widths. Unrelated course/UI work was preserved.
