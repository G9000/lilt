# Home and first practice implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this approved design task by task. The owner has authorized implementation and main commits; no further execution-choice approval is needed.

**Goal:** Restore the purpose and creator story to Home and offer a skippable, course-specific first practice before daily cards.

**Architecture:** Shared introduction state and components serve voice and generic courses. Room entry opens course Home; explicit practice routes stay direct. Browser-local state is separate from practice data.

**Tech Stack:** React 18, TypeScript, existing Markdown renderer and Tailwind recipes, Node tests and isolated Vite/Chrome.

## Tasks

- [x] Add behavioral tests for per-course persisted steps, explicit completion/skip, unavailable storage and original story extraction in `web/src/introduction.test.ts`; run `node --test web/src/introduction.test.ts` and observe failure.
- [x] Implement `web/src/introduction.ts` and subscription hook; add shared `web/src/components/Introduction.tsx` with Home copy, original course Markdown story, walkthrough and accessible focus changes.
- [x] Wire `web/src/App.tsx`, `web/src/pages/Voice.tsx` and `web/src/pages/CoursePractice.tsx` for Home entry and walkthrough routes. Remove history-based first-entry guessing. Update desk/widget text and avoid mic prewarming on Home/welcome.
- [x] Add `web/e2e/introduction.mjs` using isolated Vite and stubbed API; assert room entry, creator story, no mic, steps/back/skip/finish/reload/replay, course isolation and direct routes. Inspect screenshots at desktop and narrow/dark sizes. Update existing flow/course-reading suites to match purposeful navigation changes.
- [x] Update `docs/guide.md`, `DESIGN.md`, voice course guide first-visit instructions and `web/src/release.ts`.
- [x] Run web typecheck/unit tests, scratch web/style builds, affected browser suites, server fmt/Clippy/tests with separate target and scratch temp, Python tests, desktop fmt/release Clippy. Record evidence and limitations in `docs/validation/2026-11-09-first-practice.md`.
- [x] Review final diff and checks, commit checked work on main without pushing, and checkpoint the result.


Review clarified that replay preserves the terminal choice and that granted/pending microphone
requests need explicit browser coverage. The final review also caught a stale microphone request
and a storage warning lost on navigation; both have regression checks and fixes. A small generation
counter in the existing microphone provider prevents a released request from replacing a newer one.
