# Plain practice cards — 7 November 2026

Removed the room practice stack's daily photo selection and photo covers in every state.
Cards now use light/dark surfaces with chapter, prompt, practice hint, count and a Start
action. Back cards are paper edges; the saved widget position and swipe/tap behavior remain.
Photos and the clock retain their existing picture selection.

Verified on Windows:

- Web typecheck and production build passed.
- `node e2e/room-layout.mjs ../lilt-data-practice-card/shots` passed the original placement,
  drag persistence and reset checks from phones through 4K, plus dark, resting and done states.
- Inspected phone light/dark screenshots for readable hints, unobscured controls and no photo
  covers. Browser checks used stubbed APIs rather than the owner's practice data.

Screenshots are ignored local artifacts under `lilt-data-practice-card/shots`.
