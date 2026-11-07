# Compact Music implementation plan

**Goal:** Apply the user's requested mug-style compact controls to Music without entering the monitor.

**Architecture:** Keep one persistent Music component, portalled to a native dialog in the body.
The existing shared music store owns open state; opening leaves the route and room camera alone.
Closing hides the dialog without unmounting Spotify. Use a small painted player preview, a mood
select, transport and volume controls, source tabs and a four-choice artwork disclosure.
Legacy music links open this same dialog over the room. All entry points share this behavior.

**Tech stack:** Existing React 18, TypeScript, Tailwind, native dialog and Web Audio.

- [x] Update the isolated Music browser test to require a compact dialog and unchanged route;
      run it before implementation and verify the expected failure.
- [x] Update `musicState.ts`, `Music.tsx`, `Desk.tsx`, `App.tsx`, `PlayerPicker.tsx` and room
      target semantics. Preserve one Spotify host and restore visible opener focus.
- [x] Update room-player tests for unchanged room state and the compact picker. Verify real
      audio, simulated Spotify, route preservation, keyboard/backdrop dismissal, legacy links,
      light/dark/phone bounds, and inspect screenshots. Run the repository checks in scratch paths.
- [x] Update guide, design, release and validation notes; review the checked change.

Commit the finished work on main according to the repository instructions.
