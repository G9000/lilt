# Hold to change room artwork

**Goal:** Extend the approved cat interaction to other painted room objects: ordinary clicks
perform their existing action; a 650ms hold opens artwork choices without firing a click.

**Architecture:** Share pointer gesture handling in `room/useArtworkHold.ts`. Cancel on movement
over 10 screen pixels, pointer cancellation, Escape, blur, visibility changes and unmount.
Suppress the release click even if the hold has opened a native modal. Keep the original cat
behavior. Keyboard activation performs the primary action; artwork-only targets may open their
picker from the keyboard. Make it yours and visible choice controls remain accessible.

**Mapping:** Mug click opens the timer and hold expands mug choices; music click opens playback
and hold expands player choices. Camera click opens Photos; iced coffee keeps its support link;
microphone click enters Practice. Chair, plant and monitor bezels require a pointer hold for
their choices. Monitor screen click still enters the desk. No art, stored choices or timing changes.

- [x] Add a focused failing browser fixture for short click, hold, release suppression and cancellation.
- [x] Add the shared gesture hook, then wire prop, hardware, chair and plant targets.
- [x] Wire mug/music hold entry with choices collapsed during normal use; retain explicit picker controls.
- [x] Update affected interaction suites, guide/design/release notes and validate in disposable fixtures.
- [x] Run required checks and review the scoped diff; prepare the main commit without pushing.

Use `superpowers:subagent-driven-development` for the independent mug/music integration and
browser fixture tasks. Coordinator owns the shared hook and remaining objects. Preserve the
existing dirty dependency/desktop/documentation work and use scratch builds, not the owner's data.
