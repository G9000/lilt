# Desk recorder implementation plan

**Goal:** Apply the approved small desk-recorder style to shared practice recording and playback,
with readable controls on phones and large screens.

**Architecture:** Keep Dock's capture, save, retry and microphone lifecycle in Voice.tsx.
Add scoped desk-recorder.css and a small RecorderPlayback component using the existing shared
audio hook. Keep the live pitch chart, hide numerical detail behind a toggle, and retain eyes-off
concealment. A stable header/control row precedes the chart; playback has duration and a native
seek slider over its waveform. Ivory/charcoal surfaces use theme tokens. No new dependencies.

**Approved direction:** Clear Record/Stop, elapsed timer and honest microphone readiness;
warm understated surfaces; record/listen/review together; restrained motion; larger-screen checks.

- [x] Extend web/e2e/stationery-deck.mjs with recording-state geometry, pitch-detail toggling,
  eyes-off concealment, keyboard seeking and Studio recording checks; observe the missing control.
- [x] Update web/src/pages/Voice.tsx Dock markup; add web/src/components/RecorderPlayback.tsx
  and web/src/styles/desk-recorder.css. Preserve existing public button names and recorder keys.
- [x] Inspect ready/recording/playback at 390, 1024, 1440, 3440 and 3840 widths; include dark,
  largest text, reduced motion, Studio and chapter contexts. Test blocked mic/save retry paths.
- [x] Update DESIGN.md, docs/guide.md, web/src/release.ts and VALIDATION.md. Run web types/tests/
  build, server format/Clippy/tests, Python tests and desktop format/release Clippy.
- [x] Review code and fix findings; checked work is ready for the local main commit. No push.

All browser API writes use fixtures and fake microphones; do not touch the owner's service/data.

Review fixes: saved Studio pitch can reopen, cancelled playback is not an error, readiness
includes preparation/blocked states. Native seeking preserves paused state. CSS geometry and
eyes-off checks cover the new wrappers. React input documentation confirms synchronous
controlled-value updates; the audio hook notifies subscribers immediately when scrubbing.
