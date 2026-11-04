# Monitor media implementation plan

**Goal:** Let each room monitor show a locally chosen picture, GIF or silent looping video.

**Architecture:** Extend the validated appearance preferences with per-monitor custom-media
metadata. Keep file validation, decoding and browser cache access in a focused media module;
reuse a media display component for the screen and preview. No server or room layout changes.

**Tech stack:** React/TypeScript, native browser media and Cache Storage, existing Playwright tests.

- [x] Add failing preference and isolated browser tests for upload, reload and playback.
- [x] Implement validated metadata, bounded file decoding, still generation and cache lifecycle.
- [x] Add independent file choices, previews, playback and remove actions in Make it yours.
- [x] Render media within the existing screen perspective, suspending hidden animation.
- [x] Exercise failure paths, cross-tab updates, reduced motion, phone and large-screen fit.
- [x] Update design/guide/release/validation and run project checks.

Reviewed storage races and missing-file playback warnings; fixes are covered by the
browser suite. Local commit is the final save step; do not push without a request.

Primary files: `web/src/room/appearance-settings.ts`, `appearance.ts`, `RoomAppearance.tsx`,
`Room.tsx`, new `monitor-media.ts`, `MonitorMedia.tsx`, `room-appearance.css`;
tests in `appearance-settings.test.ts` and new `web/e2e/monitor-media.mjs`.
