# Smaller JavaScript loading

**Goal:** Bring the initial JavaScript load below 1 MB, reduce avoidable total code, and retain the existing room, recording and navigation behavior.

**Design:** Prefer page-level React lazy loading with local Suspense/error boundaries. This keeps the room and microphone provider mounted while a screen loads or fails. Measure the complete static import graph from Vite's manifest, separately from total JS across all chunks; splitting alone is not a total-size reduction. Inspect retained shared style objects and dependencies before changing them. Avoid replacing tested parsers or animation behavior for speculative savings.

- [x] Profile the current production modules and record an isolated baseline.
- [x] Load route screens and Settings on demand, with accessible loading and recovery states.
- [x] Remove verified unnecessary eager dependencies or code without changing interactions.
- [x] Enforce initial and total JS budgets; exercise direct links, navigation, slow/failed loading, recording, themes and responsive layouts in a production preview.
- [x] Run type checks, unit tests, style scanning and production build; document measured results and commit only owned changes on main.

Concurrent course work is present in App and page files. Preserve it, track exact owned edits,
and do not commit unrelated work. Use scratch builds and stubbed APIs, never the owner's server/data.
