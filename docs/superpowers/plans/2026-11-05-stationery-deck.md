# Stationery deck implementation plan

**Goal:** Give the daily Anki-style review deck a warm stationery appearance and a clear current card.

**Approved design:** Ivory paper in light mode, charcoal at night, small corner illustrations,
large readable prompts, optional help, a steady record/listen/rate area and gentle card motion.
Review scheduling, recording semantics and room widget positions stay as they are.

**Architecture:** Scope styles to the daily deck in Voice.tsx with a new stationery-deck.css.
Render the active card once; expose upcoming and completed cards in disclosures with native
buttons. Reuse the existing recorder, results, ratings and comfort-stop behavior.
Use a small SVG illustration component and CSS card-edge decoration; no remote assets.

**Stack:** Existing React/TypeScript, CSS, Vite and Chrome browser tests with a fake microphone.

- [x] Add an isolated deck browser suite with stubbed APIs. Capture the refreshed screen and
      verify record/save/rate, retry, upcoming selection, eyes-off reveal, end and hurt states.
- [x] Refresh TodayDoc in web/src/pages/Voice.tsx; add web/src/styles/stationery-deck.css and
      web/src/components/DeckIllustration.tsx. Preserve API calls and keyboard rating shortcuts.
- [x] Inspect light/dark, reduced motion, long passages, expanded details and reachable controls
      at 390px, desktop, ultrawide and 3840px widths. Update affected existing browser assertions.
- [x] Update docs/guide.md, DESIGN.md, web/src/release.ts and VALIDATION.md; run required checks.
- [x] Review the change and fix findings; checked work is ready for the local main commit. Do not push.

Browser checks must stub all practice APIs and never touch the owner's data or service on 7878.
No voice-quality grades, streaks, pass/fail colors or new scheduling rules.

Review found no queue/scheduling regression. Fixed recorder scrolling under reduced motion,
and added explicit playback and disclosure-during-recording checks. Extended coverage to
before-and-after questions/postponement, room-selected card URLs, keyboard focus and largest text.
