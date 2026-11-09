# Lilt: validation report

## 10 November 2026: A lighter room

Left idle in the room, the installed 0.1.4 app's WebView2 renderer grew from 323 MB to 1,026 MB of
private memory in 2.5 minutes on a fresh scratch data folder, and was still rising. Through
DevTools it did about 147 style recalculations and layouts a second (one per display frame, about
110 ms of style work a second). A scratch copy of the same app with the new web build, also on a
fresh data folder, stayed flat at 87–98 MB, with the GPU process at about 205 MB instead of 390 MB,
while the room was visible, focused, fully loaded (37/37 pictures) and animating with no layouts.
In that Chromium, any running CSS animation (even a plain test square) still restyles once a
frame, but now only the few animated elements. The causes were the cat's breathing scale written
on the whole stage, the stage transform and `--inv` rewritten every frame, the tea wisps animated
as SVG paths (a layout each frame), and the widget check clearing `.off` five times a second. Web
typecheck, 226 unit tests, a scratch production build, and `tea`, `object-outlines`, `room-cats`,
`room-layout` and `sticky-note` passed. `room-appearance` stops at the painted microphone's click
through to `#/deck` (line 131) both before and after this change.

## 9 November 2026: Updates inside Lilt, no separate window

The separate updates window (blank and impossible to close on Windows) is gone. Settings → Updates
and the notice now check, download and install through `lilt://update/<step>` links the main
window's navigation handler runs. A release-mode scratch app (reporting 0.1.2, updater key built in,
new web pages, its own data folder and port) found the published 0.1.3 at launch, showed its notes,
downloaded it with progress from 4% to 98% in 25 steps, verified it and offered Install and
restart; the notice followed (ready to install), and the window closed normally with X. Install was
not run, since it would replace the owner's installed app. Web typecheck, 226 unit tests and the
production build, `desktop-updates` 5/5, desktop formatting, release Clippy and 31 tests, and the
release-script tests passed.

## 9 November 2026: Room tips

First-visit hints, hover/focus labels and Make it yours → Show room tips passed isolated Chrome
checks for readiness, dismissal, replay, keyboard focus, Escape, clipped artwork, phone layout,
camera transitions and unavailable storage. Existing hold, cat and tea suites passed. Web types,
220 unit tests, scratch builds, server formatting/Clippy/144 tests, desktop formatting/Clippy and
Python (47 passed, one skipped) passed. See [the room tips record](docs/validation/2026-11-09-room-tips.md).

## 9 November 2026: Pitch scale back on, resonance against the gap

The man/woman pitch scale shows by default and can be hidden from under it or in Practice
settings. On fresh scratch servers (port 7979) `results-extras` passed 18/18 (on from a fresh
data folder, the spread sentence, Hide saved and kept, back on from Settings, light and dark),
`practice` 25/25 and `flow` 42/42; `feedback` passed against its stubbed API. Web typecheck, 212
unit tests and a production build passed; server Clippy and 138 tests passed. The last-week
marker is covered by unit tests only (the browser suites record hums, which it leaves out).
Resonance is not placed against population averages: two Windows voices read about 1.5 st above
Peterson & Barney even on the same words (`analysis/EVALUATION.md`). Not tried on a real voice.

## 9 November 2026: Windows 0.1.0 release

`desktop/build.ps1` built `Lilt-0.1.0-x64-setup.exe` from `206402d`. The relocated app passed
`desktop/scripts/windows-smoke.mjs` on a fresh `windows smoke` data folder (port 17981):
synthetic-microphone recording, upload, bundled analysis, playback and saving the starting
range, and Settings → About Lilt opened. Desktop and server exited on close. Published as
[v0.1.0](https://github.com/G9000/lilt/releases/tag/v0.1.0), unsigned; not installed on a
second machine.

## 9 November 2026: Hold to change room artwork

The cat's hold interaction now covers the other painted objects. Mouse/touch cancellation,
keyboard actions, modal release suppression and existing room/media regressions passed in
isolated Chrome. Required web/server/Python/desktop checks passed; see
[artwork-hold validation](docs/validation/2026-11-09-room-artwork-hold.md).

## 8 November 2026: Reset all data

Typed confirmation, server deletion/recovery, stale-tab protection and browser cleanup passed
scratch-only Rust and Chrome checks, including the production UI against a real scratch server.
The owner's data was not reset. See [reset validation](docs/validation/2026-11-08-reset-all-data.md).

## 7 November 2026: Sleeping ears and tail

Localized ear flicks and tail swishes passed real-pixel checks for all five cats, stationary
faces/paws, matching outlines, exact rest restoration and reduced motion. Existing room
interactions, refresh checks and all required checks passed; see
[ear-and-tail validation](docs/validation/2026-11-07-cat-ear-tail.md).

## 7 November 2026: Small sleeping movements

Soft breathing, a slow stretch and a tiny settling twitch passed rendered-frame checks for bed
contact and matching outlines. Live reduced-motion changes and camera transitions passed, along
with existing cat interactions and all required checks. See
[sleeping-cat validation](docs/validation/2026-11-07-cat-sleep.md).

## 7 November 2026: Click to pet, hold to choose

The cat now pets on a short click or tap and opens choices on a hold. Mouse/touch release,
cancelled gestures, keyboard petting and existing cat regressions passed, alongside the full
required checks. See [cat-hold validation](docs/validation/2026-11-07-cat-hold.md).

## 7 November 2026: Click the cat to choose

Whole-cat outlines, direct-click and keyboard pickers, focus return, synchronized breathing and
reduced-motion petting passed isolated Chrome checks. Shared outlines and refresh readiness
also passed. All web, server, Python and desktop checks passed; see
[cat-outline validation](docs/validation/2026-11-07-cat-outline.md).

## 7 November 2026: Choose your room cat

Five companions, including the requested dilute tuxedo, passed isolated Chrome checks for
petting, anchored breathing, lighting, phone/keyboard controls, persistence and refresh/failure
handling. Web 169/169, server 129/129 and Python 47 with one skip passed, plus types, scratch
build, formatting and strict Clippy. See [cat-choice validation](docs/validation/2026-11-07-cat-choices.md).

## 7 November 2026: Distinct monitor models

Cream retro, Sage rounded and Silver studio passed isolated Chrome checks on both monitors,
including rounded bezel clicks, screen entry, mixed designs, phone controls and saved-artwork
loading. Web 169/169, server 129/129 and Python 47 with one skip passed, along with types, scratch
build, formatting and strict Clippy. See [monitor-model validation](docs/validation/2026-11-07-monitor-models.md).

## 7 November 2026: Microphone, monitor frames and first room reveal

Independent hardware finishes, whole-object outlines, compact controls and saved-artwork refresh
loading passed isolated Chrome checks. Web tests passed 169/169, server tests 129/129, and Python
47 with one skip; types, scratch build, server/desktop formatting and strict Clippy passed.
See [hardware and refresh validation](docs/validation/2026-11-07-microphone-monitors.md).

## 7 November 2026: Recording and guided practice for every course

Every course supports optional audio, course-scoped recordings, and guided tasks with saved
prompts, hints and reflections. Real Chrome tests covered saving/playback, silent practice,
retry/recovery, card evidence, course isolation and backup creation. Server tests passed 129/129,
web tests 161/161, existing generic browser tests 8/8, voice Practice 24/24 and Flashcards 22/22.
Types, production build, server/desktop formatting and strict Clippy passed; Python passed 47
with one skip. See [course recording validation](docs/validation/2026-11-07-course-recording.md).

## 7 November 2026: Practice any course

All installed courses have reading screens, chapter flashcards and isolated daily schedules. The
room and desk remember the selected course. Server tests passed 123/123, web tests 161/161, new
Chrome scenarios 6/6, existing voice Practice 24/24 and Flashcards 22/22. Types, strict server
Clippy, formatting and scratch production build passed; Python passed 47 with one skip.
See [course practice validation](docs/validation/2026-11-07-any-course-practice.md) for scope and limits.

## 7 November 2026: Windows desktop app

Built the unsigned Windows x64 NSIS installer with bundled server, Python, analysis dependencies,
web UI and content. Native WebView2 synthetic recording, upload, bundled analysis, playback and
saving passed in an isolated relocated app; the final release window and health endpoint also
passed. Closing the main window after hiding Updates stopped its app and owned server.
Web 153 tests, server 117, desktop 31 and Python 47 passed (one Python skip and two desktop
subprocess fixtures); formatting, strict Clippy and the scratch web build passed.
Installer integrity passed for all 4,669 archived files. Physical microphone/speaker checks,
clean-machine installation and signed Windows distribution remain unverified.
See [Windows desktop validation](docs/validation/2026-11-07-windows-desktop.md).

## 7 November 2026: Storage overview in Settings

Settings → Storage shows file-size totals for recordings/analysis, Photos, backups/recovery and
other saved data, with Refresh, actual folder paths, Copy folder path and a desktop Open data
folder action. Partial counts say At least; failed refreshes retain the previous count with an
explanation. Browser requests abort on leaving the pane and time out after 15 seconds. Installed
app files, browser-only room media and downloaded copies elsewhere are explicitly outside totals.

Passed: all 150 web unit tests, types and production build to a scratch output; all 113 server
tests, formatting and strict all-target/all-feature Clippy; Python 47 passed and one skipped;
all 23 desktop tests, formatting and strict release Clippy. New server coverage checks exact
categories, private/recovery files, large lengths, bounded and partial scans, Windows junctions
and cycles, local request guards, cancellation admission and the authenticated fixed folder path.
The native action checks its owned server and exact main-window origin, avoids proxies/redirects,
uses a five-second HTTP timeout and publishes a safely serialized outcome. It grants no new IPC
permissions and accepts no frontend path. Native policy/serialization/overlap tests passed.

All 29 isolated Chrome Settings checks passed: nine Storage, six backup and 14 updater checks.
Storage covers refresh, empty and partial counts, initial/refresh failures, clipboard failure,
scan timeout/retry, unmount cancellation, native error/success/timeout, keyboard opening and
narrow light/dark layouts. Inspected both Storage screenshots under
`server/target/yarn-check/artifacts/storage-shots`. A first regression run exposed fixtures
inheriting the development proxy; connections to the normal server were refused. The shared
`web/e2e/isolated-vite.mjs` helper now disables config loading/proxies and selects temporary strict
ports. The clean final run uses that helper for Storage, backup and updater fixtures.

The repeatable `scripts/storage-acceptance.py` passed 16 checks over real loopback HTTP against
the rebuilt scratch binary. Every category's file count and byte count matched an independent
filesystem scan; added/removed files changed totals correctly. Private file sizes and recovery
files were included without exposing contents or per-file names. Descriptor authentication,
fixed path despite query parameters, and host/origin/tunnel restrictions passed for both APIs.
Evidence: `target/storage-network-qmqkxu6y/report.json`, `storage-response.json`, `server.log`.

Independent review found a stalled browser scan needed timeout/cancellation; that was fixed and
verified, with no remaining implementation blockers. Scratch children were stopped by their own
handles. No owner practice data was read or changed, and the normal app was not restarted.
Actual file-manager opening in the packaged Mac app remains unverified. Existing bundle-size and
Windows incremental hard-link warnings remain. No release was pushed or published.

## 7 November 2026: Backup and restore in Settings

Settings → Backup & restore creates downloadable practice-data ZIPs, previews imports, and
requires explicit replacement confirmation. A safety ZIP is created before replacement; success
offers its download and Reload Lilt. Last-backup wording describes creation, not an assumed browser
download. Local credentials and browser-only room choices are excluded and preserved locally.

Passed: 147 web unit tests, types and production build to a scratch output; all 104 server tests,
formatting and strict all-target/all-feature Clippy; Python 47 passed and one skipped; desktop
20 tests, formatting and strict release Clippy. The server tests include 11 archive cases and
15 controller/runtime cases: hashes and original audio, malformed/hostile archives, Windows case
and Unicode aliases, credentials, stale generations, body/cancellation admission, process leases,
failed reopen/rollback, orphan cleanup, and subprocess exits at replacement/commit boundaries.
Independent review found and resolved filename-validation, OAuth compatibility and failed-rollback
admission issues; the final review found no remaining blocker.

Chrome passed all six backup Settings checks, all 12 recorder checks and all 14 existing updater
checks. Backup coverage includes create/download, preview without replacement, keyboard confirmation,
Cancel, invalid/oversized files, busy retry, safety download and actual page reload. Recorder coverage
checks persisted generation and rejects old/legacy buffered audio without deleting its browser copy.
Inspected light desktop preview and narrow dark Settings screenshots under
`server/target/yarn-check/artifacts/backup-shots`. The fixture supplies the app window's background.

The repeatable `scripts/backup-restore-acceptance.py` passed 22 checks against the final rebuilt
scratch server over real loopback HTTP. It uploads a WAV, finalizes it, runs the real Python helper,
backs up courses/cards/photos/notes/analysis/audio, changes data and deletes the recording, then
restores it. All 59 archived files matched restored bytes and the safety ZIP matched pre-restore
practice data exactly. It verifies auth preservation, stale/missing write rejection, consumed-preview
rejection, host/origin/tunnel gates, OAuth compatibility, and audio/profile/generation after restart.
Evidence: `target/backup-network-okh3v2c9/report.json`, `server.log`, `original.zip`, `safety.zip`.

All servers and browsers used scratch data and were stopped by their own handles. Owner data,
port 7878, normal server binary and web/dist were untouched. Existing bundle-size and Windows
hard-link-cache warnings remain. Tests establish process-crash recovery, not guaranteed power-loss
durability on every filesystem. Native Mac ZIP upload/download still needs a packaged-app smoke
test; Windows browser/HTTP acceptance does not establish that. No release was pushed or published.

## 7 November 2026: Update notices and version in Settings

Settings → Updates now shows the native installed version and live update status directly.
Browser-only use labels the bundled version as Web version. The notification center shows an
available release with a version-based identity: repeated checks, downloading and readiness
keep its read/cleared state, while a newer version gets a new notice. Opening the notice only
opens the native Updates window. No sound, toast, system notification or automatic action.

Native code sends four display fields to the main window at its configured loopback HTTP
origin after page load and visible status changes. Both native delivery and the evaluated
script check the origin. No additional IPC grants, control tokens, release notes or download
URLs are exposed. Byte progress does not create broadcasts; reload receives the latest state.

Passed: all 143 web unit tests, types and separate production build; all 78 server tests,
formatting and strict Clippy; Python 47 passed and one skipped; all 20 desktop tests,
formatting and strict release Clippy. Six new web tests cover validation, status wording and
notification identity. Four new native tests cover projection, stale version suppression,
origin restrictions and safe serialization. Independent review found no blockers.

All 14 isolated Chrome updater/Settings/notification checks passed, including initial and
late native status, reload, clear/read persistence, newer-version notices, keyboard opening,
browser mode and light/dark layouts. The layout check was rerun after the final icon style
and screenshot timing changes; inspected the narrow light/dark Settings and notification
screenshots under `desktop/target/update-notice-shots`. These tests inject native display
state; actual delivery in the packaged Mac app still needs native acceptance.

Existing bundle-size and Windows hard-link cache warnings remain. All outputs used scratch
directories; owner data, running app, normal server binary and web/dist were not changed.
No release credentials were configured and nothing was pushed or published.

## 7 November 2026: Mac app update flow and release preparation

The installed app has a bundled Updates window, a Mac menu entry and Settings access.
Checking, downloading and installation are separate actions. The native controller verifies
signed versions, retains downloads after a refused installation, and limits commands to the
bundled window. Closing Updates hides it; normal Quit is held during replacement.

An authenticated server interlock checks recordings and blocks new takes atomically. Capture
waits for server admission. Recording, saving and the gap before durable analysis enqueue
block installation; unreadable records fail closed. Empty interrupted takes remain for the
owner to review. Installation stops only the app's own server, recovers it after failure, and
tracks ownership during startup so quitting cannot leave a startup child behind. Reaped
process ids are forgotten before any later shutdown attempt.

Passed on Windows: web types, all 137 web unit tests and a separate production build; server
formatting, strict Clippy and all 78 tests; Python 47 passed and one skipped; desktop formatting,
strict release Clippy and all 16 tests. Native tests cover state transitions, caller/download
policy, overlapping actions, prepare/cancel/stop/install/recovery failures, startup shutdown
and reaped-child cleanup. A server that crashes before group shutdown refuses installation.
These tests do not execute Mac app replacement or Mac process-group signals.

Chrome passed 9 update-window/Settings checks with a stub native bridge, 10 recording-lock
and admission checks with stubbed APIs, and all 22 Flashcards checks against the real scratch
server with synthetic microphone audio. Update UI checks include keyboard access, long notes,
light/dark layouts, retained errors and stale status responses. Scratch servers were stopped;
owner data, port 7878, the owner's binary and web/dist were not changed.

Release tooling passed 11 fixture tests; the optional real-signer test is skipped by default.
The real pinned Tauri CLI was also exercised with disposable keys and dummy archives for
both architectures: matching signed versions verified and tampering was rejected. The keys
were removed. Version agreement, JavaScript/Bash syntax, workflow YAML and missing-secret
preflight were checked. The existing bundle-size and Windows incremental hard-link warnings
remain. The manual workflow produces a draft only and was not run.

**Release gate still open:** Apple Developer membership is confirmed, but real signing
credentials were not configured or used. This Windows run cannot verify a Mac package,
Gatekeeper, notarization, microphone permissions, window lifecycle, process-group shutdown,
or installation/restart between two signed versions. Complete the Apple silicon and Intel
acceptance checks in [Desktop releases](docs/desktop-releases.md) before publication. Existing
users need one manual installation of the first signed updater-enabled release.

## 6 November 2026: Recoverable Flashcards progress

Flashcards validates saved browser progress before using it. Malformed containers fall back
to empty runs; readable entries survive damaged lists or other chapters. Card ids are unique
and keep their order. Chapter names such as `constructor` and `__proto__` round-trip without
inheriting object properties. The guide and What's new describe recovery.

Eight new unit tests cover damaged JSON and shapes, partial recovery, duplicate ids, chapter
names, preserving other chapters and unavailable storage. Six regression cases failed before
the fix. All 137 web tests, web types and the scratch production build passed. The existing
bundle-size warning remains. Server formatting, strict Clippy and 71 tests passed; Python
had 47 passed and one skipped; desktop formatting and release Clippy passed.

All 22 Flashcards browser checks passed in Chrome with a fake microphone against a fresh
data folder on port 17981 and a separate web build. They cover recording/save, swipes, Undo,
reload, navigation, recovery, duplicate removal and opening the chapter menu with damaged
progress. Restricted local connections blocked the first launch attempts; the unrestricted
isolated run passed. This is synthetic-audio verification, not natural-voice acceptance.
The test server was stopped afterwards. Owner data, port 7878 and `web/dist` were not changed.

## 6 November 2026: Playful Ball of yarn

Refreshed the canvas scene, wound wool, expressive cartoon cat, room illustration and dock
icon. The cat walks when changing position, reaches for nearby yarn, reacts once to a threaded
loop and curls up after play. Optional Free play is remembered locally and removes loops and
their note cues. Decorative reaction time freezes during breathing breaks; reduced motion
disables hops, reaches, blinks and loop expansion.

The isolated Yarn browser suite passed with stubbed APIs and Chrome's fake microphone:
threaded-event wiring, pause/resume without retriggering, voice following, free-play persistence,
absence of loops/cues, replay reset, restoration of loop-sound preference, calibration, keyboard
mode selection, breathing/comfort stops, and reachable controls from 390px through 4K.
Compared canvas pixels to check live reduced-motion preference changes. Inspected the actual
happy cat hop, light/dark play, setup, summary and phone screenshots. These are emulated viewports
and synthetic audio, not physical-device or natural-voice acceptance.

Web types, 129 unit tests and a scratch production build passed. Server formatting, strict
Clippy and 71 tests passed; Python had 47 passed and one skipped; desktop formatting and
release Clippy passed. Server tests initially hit a Windows temporary-folder access error;
rerunning with TMP/TEMP inside the scratch target directory passed all 71. Existing web
bundle-size warnings remain. Builds used separate target/output directories. The owner's
running server, web/dist and practice data were not changed.

## 5 November 2026: Stationery daily deck

Today shows one paper card with a small drawn illustration, a larger reading prompt, optional
tips and record/replay/review controls together. Upcoming and completed cards use disclosures;
upcoming choices are native keyboard buttons. Scheduling, retry metadata and room positions
are unchanged. Recorder scrolling now also respects reduced motion.

The isolated `web/e2e/stationery-deck.mjs` suite passed using stubbed APIs and Chrome's fake
microphone: record/save, one take per recording, opening tips during recording, listen-back,
retry metadata, Again returning before cool-down, eyes-off concealment and reveal, keyboard
rating and selection, room-selected card links, before-and-after questions and postponement,
completion, comfort stop and resume. Choices stay disabled while recording or reviewing.
Checked 390×844, 1024×768, 1440×950, 3440×1440 and 3840×2160 browser viewports, long prompts,
dark mode and the largest text setting. Inspected phone, 4K, recording and comparison screenshots.

Web typecheck, 109 unit tests and production build passed. Server formatting, strict Clippy and
70 tests, Python 47 tests (one skipped), and desktop formatting/release Clippy passed. Existing
bundle-size and Windows hard-link cache warnings remain. The older server-backed browser
suites have updated selectors but were not rerun for this change. These are emulated browser
sizes and synthetic recordings, not physical-device or natural-voice acceptance. No owner data
or running backend was changed.

## 5 November 2026: Cozy Ball of yarn

Replaced the empty play backdrop with a cached illustrated room, woven yarn and a connected
tuxedo cat. Setup sits beside the scene or scrolls below it on narrow screens. Instructions
expand on demand; keyboard mode selection, breathing, Stop and comfort-stop controls remain
reachable. The play field caps at 1920×1100 CSS pixels on large displays. Range labels have
opaque theme-safe backing so curtains cannot wash out their text.

The isolated `web/e2e/yarn-ui.mjs` suite uses stubbed APIs and Chrome's fake microphone.
Passed: setup and play controls at 390×844, 844×390, 1440×950, 3440×1440 and 3840×2160,
plus setup at 1024×768; voice lifts the yarn, keyboard mode changes, instruction disclosure,
breathing/resume, descriptive summary, speaking, comfort stop, and two-hum calibration
without saving a profile. Light/dark and reduced-motion screenshots were inspected,
including phone, ultrawide and 4K. Review caught and corrected low-contrast range labels.

Web typecheck, 109 unit tests and production build passed; the existing bundle-size warning
remains. Server formatting, strict Clippy and 70 tests, Python 47 tests (one skipped), and
desktop formatting/release Clippy passed. No owner data or running backend was changed.
Browser sizes are emulated Chrome viewports, not physical-monitor or real-phone acceptance;
microphone verification used recorded synthetic input, not a natural-voice quality study.

## 5 November 2026: Media on the room monitors

Each monitor accepts a browser-local still picture, GIF or silent looping MP4/WebM.
Existing screen perspective and room layout are preserved. Cache Storage holds file
bytes and still previews; localStorage holds validated identifiers and preferences.
Web Locks serialize preference commits and obsolete-file cleanup across tabs. Uploads
validate size, signature, decoding and dimensions before replacing a saved selection.

Passed in isolated Chrome with generated WebM/GIF/PNG fixtures and stubbed practice APIs:
independent screens, silent inline playback, pause/restart, reload, preset/upload switching,
malformed and undecodable files, oversize rejection, cache and preference write failures,
temporary appearance choices when persistence fails, reduced motion, desk/tab suspension,
cross-tab removal and reset during a pending upload, missing-cache fallback and retained
re-upload messages, reset cleanup, and reachable controls at 390×844, 1440×844,
3440×1440 and 3840×2160. Phone and desktop screenshots were inspected. No media upload
requests were made. The existing room appearance, room layout and Music suites passed.

Web types, 109 unit tests and production build passed (existing bundle-size warning).
Server format/strict Clippy and 70 tests, Python 47 tests (one skipped), and desktop
format/release Clippy passed. The initial restricted server/Python runs were blocked by
Windows temporary-directory permissions; both passed when rerun with those permissions.
No owner practice data or running backend was changed. Browser verification was Chrome
on Windows; Safari/native desktop media codec compatibility has not been exercised here.

GIF pause shows a saved still rather than resuming an exact frame. PNG/WebP uploads are
flattened to still pictures. Files are specific to this browser/origin and may disappear
when browser storage is cleared; the panel asks for the file again in that case.

## 5 November 2026: Restore manual room placement

The automatic free-space placement introduced in `eef3671` was rejected after the
owner reported broken layout behavior. It has been removed and Floaters.tsx restored
to the implementation from `36d68f8`. The older landscape override that moved today's
practice toward the middle was also removed, restoring its original lower-right corner.
The earlier geometric overlap checks below
did not establish satisfactory visual behavior and do not validate the restored layout.
Reset layout now stays visible after resetting; small screens show its reset-arrow icon.
The room-layout browser suite now checks the original default anchors, manual dragging,
saved positions after reload and the reset control remaining reachable across screen sizes.
The compact card size now applies below 900px high so the lower-right stack leaves the
painted camera clickable at 1440×844 without moving toward the center.

Passed: isolated layout/reset checks at 1880×920, 2560×1440, 3440×1440, 3840×2160,
1440×950, 1024×768, 1024×1366 and 390×844, plus 1920×1080 at 2× pixel density.
Inspected the ultrawide and 4K screenshots and the restored live preview. Room appearance
and Music browser suites passed; the appearance suite checks the real camera and microphone
links. Web types, 108 unit tests and production build passed (existing bundle-size warning).
Server formatting, strict Clippy and 70 tests, Python (47 passed, one skipped), and desktop
formatting/release Clippy also passed. No owner practice data was used.

## 5 November 2026: Larger-screen reset follow-up

Extended the isolated room layout suite to reset at every tested size, including
2560×1440, ultrawide 3440×1440 and 3840×2160 CSS viewports. All seven widgets remained
visible with no widget/widget or widget/practice-stack intersections. Ultrawide and
4K screenshots were inspected. `LILT_TEST_DPR=2` additionally checks 1880×920 and
1920×1080 CSS viewports at double pixel density (including a 4K-equivalent display
at 200% scaling); reset, drag and reload checks passed. These are browser-emulated
sizes and pixel density, not physical-monitor acceptance. No app code changed.

## 5 November 2026: Room reset spacing

The isolated `web/e2e/room-layout.mjs` reproduced Yarn disappearing behind today's
practice after Reset layout, and Flashcards doing the same at 1440×950. New defaults
and nearby free-space placement keep all seven widgets visible and separate from the
practice stack and each other at 1880×920, 1440×950, 1024×768 and 1024×1366. Dragging an
automatically nudged note, reloading and resetting again passed; desktop screenshots
were inspected. Existing room appearance/interaction checks, including phone controls,
also passed. Web typecheck, 108 unit tests and build, server formatting/Clippy/70 tests,
Python 47 tests (one platform skip), and desktop formatting/release Clippy passed.
Existing build-size and Windows incremental-cache warnings remain. No owner practice
data or recording service was changed.

## 4 November 2026: Music layout cleanup

Removed expand/restore controls and the square cover obscuring the disc. The full
CD has a metallic surface, artwork label and center ring. Mood rows now have fixed
artwork/text/checkmark columns instead of inheriting centered button alignment.
The new alignment assertion reproduced the original defect before the fix and passes
afterward. The Music browser suite also verifies circular disc geometry, absence of
resize controls, retained playback/Spotify host behavior, and phone layout. Desktop
and dark phone screenshots were inspected; reduced motion still disables disc spin.

## 4 November 2026: Music app and compact top-bar player

The oversized music popover is replaced by a routed Music app with record artwork,
nine moods, volume/transport controls and expand/restore. A compact player stays in
both top bars after closing, including while paused. Music is also in the dock.
The Spotify host remains mounted across navigation, expansion and source changes.

Isolated Chrome checks cover opening without autoplay, mood selection/skip, mute and
volume persistence, close/reopen and return route, animated room focus return, compact play/pause, lo-fi mic ducking,
expand/restore, mobile/dark layout and the existing room regressions. A mocked Spotify
iframe controller verifies real UI play/pause actions and that closing, expanding and
source switching do not destroy/recreate its host. Delayed AudioContext resume verifies
that switching away cannot leave a late lo-fi start playing. This does not establish
real Spotify account/provider playback or physical audio-device behavior.

Web types, 108 unit tests/build, server formatting/strict Clippy/70 tests, Python
(47 passed, one platform skip) and desktop formatting/release Clippy pass. Owner data
and port 7878 were untouched. Existing bundle advisory remains; Safari is untested.

## 4 November 2026: painted music player and desk actions

Four v3 room backgrounds replace the small left monitor with a cassette player while
retaining main/right screen customization and the repaired cat. Camera opens Photos;
microphone follows the existing Practice entry. Music reuses lo-fi, volume and Spotify.
The duplicate floating radio is removed. Landscape cards leave the camera clear, and
mobile/portrait shortcuts keep cropped objects accessible. The room cannot scroll when
focus moves to an object.

Isolated Chrome checks pass: real home camera/Practice navigation, no autoplay on opening,
previous/next mood, saved volume, play/pause, microphone claim/release ducking and resume,
playback retained after panel close, Escape focus return, outside/route dismissal, Spotify
setup availability, mobile panel fit and portrait tablet Photos shortcut. Existing lighting,
independent monitor settings, persistence/reset, cross-tab, cat/framing checks also pass.
Four lighting variants and the rendered music panel were visually inspected.

Web types, 108 tests and build pass; server formatting/strict Clippy and 70 tests pass;
analysis has 47 passes and one platform skip; desktop formatting/release Clippy pass.
Restricted temporary/cache permissions initially blocked native tests; they passed when
rerun with normal test-folder access. No owner data or port 7878 was used. Spotify real-account
playback, physical audio hardware and Safari are not newly tested. Existing bundle advisory remains.

## 4 November 2026: artwork and cat repair, independent monitors

Versioned generated paintings preserve the familiar room with simpler coherent props and
matching four-light variants. The new night illustration keeps interior midtones visible.
A single transparent cat sits over empty painted bedding; detached tail/ear layers are no
longer requested. The main and side monitor preferences save independently, including migration
from previously saved side-only settings. Source artwork is retained for comparison.

Verified in isolated Chrome using the actual room and the full home with practice APIs blocked:
both monitor pictures persist independently, reset restores both, light/temperature effects
work, the cat has real transparent alpha and responds to petting, all of the cat fits the
1440px desktop framing, and the main monitor remains visible at 1024×1366 and 1000×950.
The new night bed/chair sample is visibly brighter (mean encoded luminance about 96 versus
28 previously; this is a relative image check, not calibrated display luminance). All four
lighting screenshots and monitor placement were visually inspected. Browser checks also cover
mobile scrolling, focus/route dismissal, cross-tab updates and reduced-motion rendering.

Web typecheck, 108 unit tests/build, server formatting/strict Clippy/70 tests, Python (47 passed,
one platform skip), and desktop formatting/release Clippy pass. No owner data or service on
port 7878 was used. Existing bundle advisory remains. Real phones and Safari are untested.

## 4 November 2026: original room customization

Removed the rejected painted/sketched 3D experiments, their routes, generated assets and
Three.js dependencies. The original illustrated home now offers Make it yours: automatic
or fixed painted lighting, a subtle warmth wash, fairy-light controls, and existing local
artwork on the side monitor. Choices are validated and kept in browser storage.

Verified with the real room in isolated Chrome: actual fairy-light pixel changes, matching
painted light layers, warmth and monitor decor, reload persistence, reset, cross-tab changes,
keyboard dismissal/focus return, computer hit-target alignment, and 390/768px layouts.
The full home was also tested with practice APIs blocked: its card stack does not cover the
panel, and keyboard entry to Practice closes the panel. Desktop/mobile screenshots inspected.
No owner practice data or server on port 7878 was used.

Web typecheck, 106 unit tests and production build pass. Server formatting, strict Clippy and
70 tests, Python (47 passed, one platform skip), and desktop formatting/release Clippy passed
in the same work session; no native or analysis source changed. The existing main-bundle size
advisory remains; the separate 3D bundle is gone. Real phones and Safari remain untested.

## 4 November 2026: one development command

`bun dev` runs the Rust server and Vite together using Bun's parallel script runner. The server
script first syncs the locked Python helper environment and builds Rust from the repository root.
`bun dev:web` and `bun dev:server` run each side separately. Rust changes need a restart.

Verified on Windows with temporary data and Rust on port 7979:

- The actual `bun dev` command starts a healthy Rust server and serves the Vite HTML. Vite used
  port 5174 because 5173 was occupied; the existing process was left alone.
- Terminating the parent command releases both test ports, including descendant processes.
- Holding the scratch Rust port open causes startup to fail, returns a nonzero exit code and
  stops Vite as well.
- Root type checking and all 103 frontend unit tests pass; `git diff --check` passes.

The Vite API proxy still targets port 7878; this check fetched the scratch Rust health endpoint
directly and checked the UI separately. No owner practice data or server on port 7878 was used.
macOS/Linux signal handling was not exercised in this pass.

## 4 November 2026: Bun workspace

The private root workspace manages `web` with Bun 1.4.2. All 221 dependency name/version pairs
match the previous pnpm lockfile. The launcher, Docker web stage and Mac build use the root
workspace; Node still runs Vite and the existing tests.

Verified on Windows with Bun 1.4.2 and Node 24.22.1:

- A fresh `bun install --frozen-lockfile` succeeds with the old pnpm installation moved aside.
  Repeating it after removing both pnpm lockfiles makes no changes.
- Root `bun run typecheck`, `bun run build` and `bun run test` pass (103 frontend tests).
  Vite still reports the existing large-bundle advisory.
- All nine settings/comparison browser regressions and the feedback browser check pass against
  isolated Vite fixtures with the Bun-installed dependencies.
- Server formatting, strict Clippy and all 70 tests pass with the real Python helper.
  Python has 47 passing tests and one macOS-only skip. Desktop formatting and release Clippy
  pass after fetching the locked dependencies. Rust still reports its hard-link cache fallback.
- Both Bash build scripts pass syntax checks. A temporary launcher copy with a failing Bun
  command exits with that failure before attempting to build or start the server.

Docker's engine was unavailable, so the container build was not run. Mac app/DMG packaging was
not run on Windows. No owner practice data or server on port 7878 was used.

## 4 November 2026: settings saves and comparison switches

Settings saves are ordered across closing and reopening the pane. Only confirmation of the latest
edit shows Saved; an older failure cannot replace the newer edit's status. Qualities preserve commas
and spaces while you type. Changing a comparison pair clears its recordings, measurements and errors,
and late responses from the old pair are ignored.

Verified on Windows with isolated browser fixtures and simulated API responses:

- `node --test e2e/settings-comparison.mjs`: nine browser regressions pass, covering overlapping
  saves, leaving/reopening, older failures, typed qualities, pair switches and late results/analyses.
  The original seven cases failed before the fixes; the additional reopening case caught and
  verified a correction to the first implementation.
- Existing feedback browser regression, 103 frontend unit tests, TypeScript and production web
  build pass. The existing large-bundle advisory remains.
- All 70 server tests pass with the real Python helper and a writable scratch temp folder.
  Server formatting and strict Clippy pass; the compiler reports its existing hard-link cache fallback.
- Python: 47 passed, one skipped (macOS `say`). Desktop formatting passes. Desktop release Clippy
  could not run offline because locked `tauri-plugin-opener` 2.7.2 is absent from the local cache.

No owner recordings or server on port 7878 were used for testing. Safari and the Mac desktop build
were not validated in this pass.

## 3 November 2026: width controls removed

Removed the experimental section width/column controls, document grouping and expanded-layout
styles at the owner's request. Guide and chapter documents use the standard reading column again;
old saved width preferences are ignored. The monitor glow and exercise-number spacing fixes remain.

Verified: production build, all 60 remaining frontend tests, the course browser check across six
widths (including old saved preferences), and the Markdown matrix across five widths, both themes
and normal/largest text. The restored desktop reading layout was visually inspected.

## Earlier 3 November 2026 pass: section layouts (removed above) and corrected monitor glow

Replaced the global Wide view toolbar with floating controls for individual guide/chapter sections:
Normal width, Full width and Two columns. Preferences are independent and survive reloads.
Numbered instructions form paired rows on wide screens and stack on phones. The monitor's static
glow now follows its actual painted polygon, avoiding distortion from the transformed click target.

The production build and all 63 frontend tests pass. The built-app browser check verifies section
independence, persistence, real two-column placement, mobile stacking, menu keyboard dismissal,
reference/footnote links, and overflow across six widths with normal/largest text. The Markdown
matrix and feedback regression also pass. Desktop columns and the new monitor glow were visually
inspected. Checks used Chrome on Windows and emulated touch; physical phones and Safari remain
untested. The existing large-bundle build advisory remains.

## Earlier 3 November 2026 pass: monitor invitation and reading width (superseded above)

The room's middle monitor now has a resting glow and a visible click/tap cue. The halo strengthens
on hover/focus; reduced motion preserves the static invitation. Entry hides the cue. Added a saved
Wide view preference for Home, chapter and update documents on larger screens. Wide blocks use
more space while prose and footnotes keep a bounded width; exercise numbers remain inside the page.

The production build, 60 frontend tests, Markdown browser matrix and feedback regression pass.
The built-app check additionally verifies mouse, keyboard and emulated-touch entry, the reduced-motion
cue, width changes and reload persistence, and wide layouts at 320/390/768/1024/1440/1920 px with
normal and largest text. Desktop/phone room previews and a wide document preview were inspected.
Checks used Chrome on Windows; physical mobile devices and Safari were not tested. The existing
large-bundle build advisory remains.

## 3 November 2026: shared UI and Markdown

The shared Markdown renderer now uses CommonMark and GFM, with nested lists, all heading levels,
tables, task lists, code blocks and footnotes. HTML execution and unsafe URL schemes remain blocked.
Images preserve their proportions. Tables/code scroll within the document, and document links and
keyboard scrolling do not trigger app navigation or practice shortcuts. Home and rich chapter
introductions keep complete Markdown together, so references and multiline blocks survive.

The shared layout has a clearer heading scale, consistent prose spacing, wider reading columns,
flowing chapter actions, larger mobile navigation targets, and responsive settings/rating controls.
Home prioritizes actions and the chapter catalog; the full authored guide is expandable.

Verified on Windows/Chrome with isolated test data and no microphone:

- `node --test src/*.test.ts src/room/*.test.ts`: 60 frontend tests pass.
- TypeScript and the production web build pass; the existing large-bundle advisory remains.
- `node e2e/markdown.mjs`: subject-neutral content at 320, 390, 768, 1024 and 1440 px,
  both themes and normal/largest text. Checks Markdown structure, safe links, footnotes,
  image proportions, title/action overlap, nested tip layout and horizontal overflow.
- `node e2e/course-review.mjs`: seven real app screens at 320, 768 and 1440 px in both
  themes/text sizes, plus a synthetic general-interest course testing complete Markdown documents,
  reference links, next-chapter routing and keyboard scrolling in code/footnotes.
- `node e2e/feedback.mjs`: recording-feedback regression check still passes.
- Desktop/mobile screenshots were inspected. Safari and physical mobile devices were not tested.

## 3 November 2026: syllabus and feedback review

The general MtF learning route and resource list were clarified; pitch, resonance, weight,
articulation and intonation wording was revised against accessible ASHA and NHS Fife guidance.
External YouTube link titles/creator credits were checked, not the full video instruction.
The NHS Lothian PDF was unavailable during this review. No clinician review or human voice-outcome
validation is claimed. See `content/courses/voice/README.md` for the remaining teaching work.

Verified on Windows in this pass:

- All 57 frontend unit tests passed; TypeScript and production web build passed (existing large-bundle warning).
- All 23 course tests passed. All 131 text ids/spoken texts and 16 check-ins remain unchanged.
- `web/e2e/feedback.mjs`: reproduced and fixed stale pitch/suggestion/resonance when changing takes,
  and the pitch-scale setting failing to update mounted views. Uses synthetic analysis, no microphone.
- `web/e2e/course-review.mjs`: actual built app with isolated temporary data; course navigation,
  revised guidance, 16 chapters, desktop and 390 px phone layouts, light/dark screenshots inspected.
- Native server build passed. POSIX-only analysis tests are now Unix-gated so the Windows test
  binary compiles. A stale filename-only validation-error assertion was corrected.

### Follow-up: audio failures, formatting and lint resolved

The eight analysis-dependent Rust failures came from a missing analysis environment and a Unix-only
interpreter path. Installed the existing locked Python 3.12 dependencies with `uv sync --locked`;
the dependency lockfile did not change. The app and tests now share a platform-specific default:
`analysis/.venv/Scripts/python.exe` on Windows, `analysis/.venv/bin/python` elsewhere. The app still
honours `LILT_PYTHON` overrides. Setup instructions are in `docs/guide.md`.

Rechecked on Windows:

- `cargo test --offline --all-targets --all-features`: **66 passed, zero failures**, including all
  eight previously failing analysis, coaching and recording cases with the real Python helper.
- `uv run --locked pytest -q`: **47 passed, one skipped**. The skipped case requires macOS `say`.
  Two POSIX-specific Rust process tests are Unix-gated and were not run on Windows.
- `cargo fmt --all -- --check`: passed after applying standard formatting across the Rust sources.
- `cargo clippy --offline --all-targets --all-features -- -D warnings`: passed, with no lint
  suppressions added. Mechanical suggestions were reviewed separately from formatting; complex
  tuple types were named, and a constant invariant is now asserted at compile time.
- Native server build, all 57 frontend tests, TypeScript, web build and both browser checks above
  passed again. The web build retains its existing non-blocking large-bundle advisory.

An independent code review found no actionable regressions. These are software and synthetic-audio
checks; they do not validate natural-voice accuracy or voice-training outcomes.

The original report below is historical; its counts and feature-gap lists describe the first release.

## First release, 26 October 2026

This report keeps four questions apart, as PRD §14 requires: does the **software** work, are the
**measurements** accurate, is the **coaching** valid, and do **long-term voice outcomes** improve?
Passing one says nothing about the others. Everything below names how it was checked.

## Capability matrix (verified state)

| Area | Guided practice | Acoustic measurement | Listening / feedback | Validation status |
| --- | --- | --- | --- | --- |
| Listening & goals | A/B playback, favourites, notes, preference on retry | None (preference is the learner's choice) | Learner's own listening | Not applicable |
| Lightness | **Smile to brighten** (NHS Fife, source_checked); forward hum is also listed under lighten/brighten | **None** | Learner's A/B judgement → rule-based pointer | No perceptual validation. Automatic judgements disabled |
| Resonance | **Forward hum** (NHS Fife, source_checked) | F1–F3 medians on the loud voiced frames (lilt-analysis/4); F2/F3 change shown only between takes of the same text, mic and method | Self-report of where the vibration is felt → rule-based cue; the F2/F3 change is described in words | Synthetic vowels and synthetic speech with known formant and pitch changes only (`analysis/EVALUATION.md`). No natural-speech or perceptual validation. Automatic judgements disabled |
| Pitch | Gentle pitch and counting (NHS Fife, source_checked) | F0 median, p10/p90, p10–p90 span (st), SD (st), contour, coverage, quality flags | Self-report; measurements shown **descriptively only** | Synthetic fixtures only. **Not validated on natural speech, so it never drives pointers or plans** |
| Intonation | Real-life phrases (NHS Fife, source_checked) | Pitch span (descriptive) | Self-report | No judgement of correct intonation |
| Carryover | **Carryover ladder** (NHS Fife, source_checked) + unscripted answer each session | Descriptive only | Self-report; 2 consecutive "comfortable and consistent" sessions before the next step is offered (Lilt's own rule) | Reading-only evidence explicitly not treated as conversational ability |

## 1. Software correctness: verified

| Check | How | Result |
| --- | --- | --- |
| Rust acceptance tests | `cd server && cargo test` (24 tests, including the Markdown practice texts; real Python helper, fixture audio; 5 cover the card scheduler: interval growth and caps, first deck, rating + idempotency + same-day "again", no backlog after missed days, hurt → suspend + pause → resume) | **24/24 pass** (28 Oct 2026; the new one re-measures a stale take, keeps its earlier run and checks the helper reports the expected method version) |
| Analysis tests | `cd analysis && .venv/bin/python -m pytest` (28 tests, including a 190 Hz voice with mildly uneven cycles that the old octave cost tracked at 95 Hz) | **28/28 pass** (28 Oct 2026) |
| Live pitch tracker and display cleanup | `cd web && node --test src/pitch.test.ts` (27 tests; includes quiet held notes, phrase endings, gain changes, octave mistakes, sustained register changes, pauses/time gaps, immutable source contours, and the slower fallback tracker) | **27/27 pass** (29 Oct 2026). Clean harmonic tones from 90–500 Hz remain within 1%; synthetic filtering checks do not establish natural-speech accuracy |
| Recording lock in Chrome | Vite running, then `cd web && node --test e2e/recording-lock.mjs`: actual Web Locks and MediaRecorder with a fake microphone, stubbed API, isolated browser storage | **9/9 pass** (29 Oct 2026): competing tabs, no take API call on refusal, final audio tail, double starts, tab closure, constructor/start failures, refused take creation, cancellation, recorder errors, and same-page fallback without Web Locks. Cross-tab protection is for the same origin only |
| Filtering and recording lock in installed Safari 26.6.2 | `web/e2e/safari.mjs` and `safari-browser.ts`, opened in actual Safari with two tabs; generated 220 Hz audio, disposable data directory, real local API/storage/Praat; Remote Automation stays disabled | **38/38 pass** (29 Oct 2026): the same 27 pitch tests, live AudioWorklet tracking (median 220.0214 Hz), nine recording-lock checks (competing tabs, tail, double starts, constructor/start failure, refused creation, cancellation, recorder error, tab closure), and native MP4 save/decode/Praat (220.0005 Hz; 2.6224 s). Live tracker constructed by a real button click for Safari audio activation. Default capture selected WebM/Opus; MP4 was explicitly exercised too. [Machine-readable results](docs/validation/safari-2026-10-29.json). **Not tested:** physical microphone/permission flow, full practice UI, iOS/iPadOS, or fallback with Web Locks disabled in Safari |
| Take notes in words, and the pitch reference scale | `cd web && node --test src/insight.test.ts` (5 tests: comfort first, end drop, below range, level, lively, steady, nothing to say; placing a pitch in words and semitones, never a percentage) | **5/5 pass** (28 Oct 2026) |
| Practice window, end to end | `web/e2e/practice.mjs`, fake audio device, fresh temporary data folder, real local API and Praat helper, 1440×900 then 390×844: first run, free/chapter/Today takes, rating, sidebar, phone recorder, competing-tab warning, retry after the other tab stops, and release when leaving a recorder | **21/21 pass** (29 Oct 2026). No page errors; refused starts keep Record available and do not offer saving an empty take |
| Web regression suite and production build | `cd web && node --test src/*.test.ts src/room/*.test.ts`, TypeScript check, Vite build | **45/45 pass**, type check and build pass (29 Oct 2026). Vite reports the existing bundle-size advisory |
| Syllabus teaching revision | `cargo test courses::` and `cargo test practice::tests::`; real `/api/texts` and `/api/deck/today` against a fresh temporary profile; compare earlier IDs and spoken texts | **22/22 course tests and 7/7 practice tests pass** (29 Oct 2026). All 11 chapters and 65 texts load; a fresh deck offers the reference, `text.warmup.hum` and `text.warmup.hum-to-hello`. All 61 earlier exercise IDs and spoken texts are unchanged. Four new phrase cards, clearer listening checks and consistent voice-care wording. Edition stays at 2 for piece-by-piece updates. Dedicated A/B recordings remain missing; no clinician review or learner-outcome validation |
| Bug-fix and resonance pass | `cd server && cargo test`, `cd analysis && uv run pytest`, `cd web && node --test src/*.test.ts src/room/*.test.ts`, type check, Vite build; then the built app on a throwaway data folder: room, sticky note, Real life and Warm-ups chapters, and `curl` with a rebound Host header | **62/62 server, 48/48 analysis, 45/45 web pass**, type check and build pass (31 Oct 2026). Eight new server regression tests (rebound host names refused, a learner's pause kept by automatic reviews, no analysis left for a take deleted mid-run, a timed-out helper reaped, the daily reference not using a new-card slot, one plan version per concurrent write, reminder time stored as HH:MM, no panic on a huge history window). One analysis test: formants come from the loud vowel, not a longer quiet hum (fails with the old frame choice: 839 Hz vs 1210 Hz, truth 1250). A rebound Host gets 403 on `/api/profile` and `/api/export`; localhost and 127.0.0.1 get 200. Enter on the sticky note edits it without leaving the room. All 11 chapters and 69 texts load. **Not tested in a browser:** desk radio/Spotify pausing races, reduced-motion room, card-pile clamping, cross-tab recovery, the CRLF Markdown fix and the web error paths (checked by reading and type check only) |
| Browser end-to-end, desktop 1100×900 | `web/e2e/flow.mjs` driving installed Google Chrome (headless) with Chrome's **fake audio device** fed by macOS `say` speech | **38/38 pass** on 28 Oct 2026, after updating the script for the Practice changes (nothing picked when opened from the computer, the chapter tree, the recorder's layout). Before that: **29/29**, adding checks for the reading desk, the read-along highlighter, pitch under words, Texts, live pitch, steadiness, comfortable range and theme. The earlier intermittent failure turned out to be a race in the test: it read the page before the evidence recording had loaded. It is fixed, with 3 consecutive clean runs since |
| Browser end-to-end, phone size 390×844 | Same script, `MOBILE=1` (mobile viewport in desktop Chrome) | **35/35 pass** (27 Oct 2026, after the voice deck) |
| Voice deck in the browser | Same script: deck home → record each card → rate with keys → an "again" card returns in the same run → end comfort check → home shows "Deck done", then the guided session | **35/35 pass** at desktop, including 6 new deck checks |
| MCP over HTTP, real client | Claude Code 2.1.286 (`claude -p --mcp-config`) against synthetic test data | Round trip worked (details in §5) |
| MCP over stdio | JSON-RPC initialize → tools/list → tools/call piped to `lilt mcp-stdio` | Works |
| Docker | See §6 | See §6 |

### Acceptance scenarios (PRD §14)

| Scenario | Status | Evidence |
| --- | --- | --- |
| Real session | **Verified (fake mic)** | E2E: mic check → reference → exercise → self-check → follow-up → spontaneous → comfort → saved → real Praat analysis → pointer → retry → compare |
| Useful coaching | **Verified** | `useful_coaching_selects_a_cue_and_matched_retry_updates`: "throat or chest" self-report → `practice_focus` with registry cue `nhsfife.forward-hum/smile` (use_when=target_not_met), plan keeps task with new cue, matched retry linked via `retry_of`, updated review reflects retry. Also in E2E |
| Required content | **Verified** | Beginner lightness (smile-brighten), resonance (forward-hum) and carryover (progression-ladder) activities, all source_checked |
| Start today's task | **Verified** | E2E opens on "Forward hum", rationale and cue, with one Start today button and no lesson picking |
| Evidence playback | **Verified** | Self-report evidence shows "no moment is marked" (E2E); measured capture/comparison evidence carries real segments (clipping regions, voiced spans) highlighted in the waveform |
| Guided retry | **Verified** | E2E: retry keeps task + cue, playback paused before capture, separate take with `retry_of`/`triggered_by_review`/`triggered_by_pointer`, A/B pair opens |
| Skill-state separation | **Verified** | `skipped_and_missing_evidence_never_becomes_a_low_state`, `silence_gives_no_pitch_and_a_capture_pointer` (→ `recording_issue`, not low) |
| Appropriate next action per state | **Verified for:** not assessed, recording issue, more evidence, stable, practice focus, progress | Unit tests above + `stable_and_next_context_need_repeated_sessions` |
| Goal-specific pointers | **Verified** | Every rules pointer carries task, goal connection, evidence, confidence basis; next context is *proposed*, plan changes only on acceptance |
| User disagreement | **Verified** | `disagreement_is_kept_and_carried_forward`: review bytes unchanged, note stored in `.responses.jsonl`, next review cites it; E2E UI path |
| Container recreation | See §6 | Also native: reopening the same data root keeps identical hashes (`interrupted_take_…` test) |
| Interrupted upload | **Verified** | Missing-tail finalize labelled `missing_tail`; un-finalised chunks recovered at restart as `interrupted` with byte-exact prefix; browser IndexedDB re-sends unconfirmed chunks |
| Analysis crash | **Verified** | Broken helper → `analysis_failed`, audio intact; job left `running` re-queued at restart; one result, no duplicates |
| Duplicate request | **Verified** | Same chunk → 200 duplicate; conflicting chunk → 409; double finalize → same take, one job; same review key → same review (rules and agent) |
| Silence or poor signal | **Verified** | F0 `null` with reason, no contour; `low_signal`/`insufficient_voiced` capture pointer |
| Changed task or device | **Verified** | `not_comparable` with reasons |
| Same audio twice | **Verified** | Identical measures; comparison `stable` (Δ = 0) |
| No usable audio for model | **Verified** | Hearing claims rejected when `received_audio` false; model-perceived evidence rejected while disabled; Claude Code reported it did not perceive the clip |
| Invalid recommendation | **Verified for listed patterns** | Rejected: nonexistent take, mismatched quoted measure (999 vs stored), numbers in prose not backed by evidence, unregistered exercise, unknown cue, hearing claims, larynx/diagnosis/"% feminine". **Prose screening is a phrase list. It does not semantically validate arbitrary text.** Coverage: 7 prohibited-claim cases tested |
| Effort or pain report | **Verified** | Pain + favourable self-report → `pause`, no proposal, plan paused on same exercise |
| External processing disabled | **Verified** | Profile refuses enabling it; E2E records **zero requests to non-local hosts** |
| Owner deletion | **Verified** | Take dir, analysis.wav and run JSON removed; dependent review kept and marked; unrelated session intact; session deletion; `deletions.jsonl` |
| MCP round trip | **Verified with Claude Code (HTTP)** | §5 |
| Browser behaviour | **Partly verified** | Chrome (headless, fake device) desktop and phone viewport, permission denial message, cross-tab recording exclusion and lock release after tab close. Installed macOS Safari 26.6.2 passes filtering, live pitch, native recording and lock checks with generated audio (row above). **Not tested:** a real microphone, full Safari practice UI, iOS/iPadOS, Firefox, Android, a real phone over HTTPS, audio recovery after mid-recording tab close |
| Interactive usability | **Not performed** | No session with a person unfamiliar with the interface has been run. Recommended next step |
| Responsive & accessible flow | **Partly verified** | Phone viewport E2E; keyboard focus reaches controls; text labels on all status badges and states (not colour alone); reduced-motion CSS; focus rings. **No screen-reader test** |

Other checks performed: the reminder is flagged when due in the configured timezone, the timezone
change takes effect, cross-origin `POST` is refused, and UTC timestamps are stored alongside local dates.

## 2. Measurement accuracy: synthetic only

See [analysis/EVALUATION.md](analysis/EVALUATION.md). Summary:

- **Method:** Praat 6.1.38 via Parselmouth 0.4.7, using **raw autocorrelation**. Filtered
  autocorrelation is not available in any released Parselmouth. Fixed range 60–700 Hz, step 10 ms,
  identical for every take.
- **Clean tones and harmonic complexes:** median error ≤ 0.054%, including after WebM/MP4 encoding.
  Gross errors were 0%, against tolerances declared before tuning (1% median, < 1% gross).
- **Abstention:** silence and noise give null F0 and no contour. Mixed voiced/unvoiced segments land
  within 30 ms of the truth.
- **Octave errors:** a 0.8 s octave jump is detected. **A 0.3 s jump is missed** (tracked at the wrong
  octave with no flag), as documented.
- **Synthetic TTS speech:** checked only for agreement between Praat's AC and CC methods, not against
  ground truth.
- **Missing evaluation asset:** natural-speech recordings with independently checked reference contours.
  Until those exist, every pitch measure is labelled `descriptive_only` and **never** selects a cue,
  changes a plan or supports a progress claim.

## 3. Coaching validity: rule logic only

- The rules are deterministic and implement the decision order: comfort, capture, comparability,
  goal, cue, retry. Cues come only from the registry.
- Corrective pointers rest on the learner's self-reports, which is allowed by the PRD's "useful coaching"
  scenario, and on capture-quality flags.
- **Thresholds:** "stable" needs 2 consecutive matched sessions. "Easier" needs 3, with falling effort.
  The carryover step-up needs 2 sessions. These are **Lilt's product choices**, not clinical findings.
- **Missing evaluation assets:**
  - an independent listener-labelled set for lightness and resonance
  - a check of recommendation relevance with real recordings
  - clinician review of the exercises
- **Result:** automatic perceptual judgements (lightness, resonance, perceived femininity) and
  model-perceived feedback are **disabled**.

## 4. Long-term voice outcomes: not assessed

Nothing here shows that using Lilt changes how a voice is perceived, or that a change lasts. Lilt makes
no clinical claim.

## 5. MCP round trip (Claude Code 2.1.286, HTTP transport, synthetic data)

1. `voice_get_today_plan`, `voice_list_sessions`, `voice_get_session` and `voice_get_analysis`
   returned the same records as the UI.
2. `voice_get_audio_clip` returned 2 s of WAV as MCP audio content. **Claude Code saved it to a file;
   the model reported it did not perceive the audio.** Model-perceived feedback therefore stays off.
3. `voice_save_review` created review `itest-1`, citing `f0_median_hz = 166.3625` from the stored run.
   Re-sending it gave `duplicate: true`.
4. A bad review ("I hear your resonance is 999 Hz", quoted value 999) was rejected for three reasons:
   the measure mismatch, the hearing claim, and an unbacked number.
5. `voice_set_next_plan` moved the plan v3 → v4. Repeating it with the stale version 3 was rejected.

Not tested: claude.ai or Claude Desktop, and a cloud client through a tunnel.

## 6. Docker

Image `lilt:local` is 347 MB. It was built on Apple Silicon (linux/arm64) with Docker 29.8.2, and
Parselmouth was compiled from source in a build stage.

| Check | Result |
| --- | --- |
| Health check | `healthy`; `/healthz` reports the data folder is writable |
| Browser E2E against the container (`127.0.0.1:7981`, scratch bind mount) | **19/19** in 5 of 6 runs; one run had a single intermittent failure that I could not reproduce or identify |
| Container recreation (`docker rm -f` + new container on the same bind mount) | All 5 takes: the stored `sha256` equals the hash of the bytes served back, identical before and after; review count and plan version unchanged |
| Analysis inside the container | All takes reached `review_ready` |
| Port binding | Published to `127.0.0.1` only (compose.yaml) |
| Not tested | `docker compose up` with the real `./lilt-data`, linux/amd64 hosts, restart-policy behaviour across a Docker daemon restart |

## Studio, live pitch and practice texts

- **Live pitch:** an in-browser YIN estimate drawn while you speak or listen. It is **display only**:
  it is never saved, never quoted in reviews, and never used for coaching. Saved takes are measured by
  the Praat helper, and that measured line is what replays on the piano-roll.
- **Steadiness meter:** the standard deviation, in semitones, of the live estimate over the last 2 s,
  shown descriptively ("smooth" / "a little wobbly" / "moving"). It is not a voice-quality score.
- **Comfortable range:** chosen by the learner. Checked to be between 60 and 700 Hz with low < high.
  It is shown only as a band and never affects pointers or plans.
- **Practice texts:** 33 texts in 7 levels.
  - Levels 1–3 come from NHS Fife (hums and glides, m-words, automatic speech).
  - Levels 4–7 are written by Lilt and labelled that way.
  - Classic passages such as the Rainbow Passage were not used, because of copyright.
  - These are reading material, not new techniques.
- **Not verified:** how well the live estimate tracks a real human voice. The E2E test only shows that
  it reads a note from macOS synthetic speech through Chrome's fake microphone.

## Read-along (reading desk and exercises)

- **What it is:** a browser-only estimate of the current word. Syllable beats are detected as rises in
  the loudness envelope (peak/dip detector) and mapped to words by estimated syllable counts. There is
  no speech recognition; Chrome's Web Speech API was deliberately not used, because it sends audio to
  Google.
- **Calibration:** tuned on three macOS synthetic voices.
  - Detected beats undercounted syllables by about a third, so a gain of 1.35 is applied.
  - Estimated syllables then land within 15% of the hand-counted truth (5%, 12.5% and 12.5%), checked
    by `web/src/readalong.test.ts` (7 tests).
  - **This is the same data it was tuned on, so it is a consistency check, not independent
    validation.** Real voices, whispering, very slow or very fast reading, and noisy rooms are untested.
- **E2E:** with Chrome's fake microphone, the highlighter reached all 3 words of "Black coffee,
  please." in 3 of 3 runs (now shown on the device screen). Measured pitch is drawn under the words after analysis.
- **Word timings:** saved with the take as `read_along` and labelled "approximate; display only". They
  are never used for feedback or quoted in reviews.
- **Margin notes:** come only from the text's own hint, NHS Fife guidance ("hold the m a little
  longer"), or labelled Lilt reading cues (breathe at a comma).

## Known gaps

**Voice cards**
- The intervals and the 60% unlock rule are Anki-style defaults that I chose. They are not
  validated for voice training, and no clinician has reviewed the pacing.
- The room is decoration. The cat reacts to whether you are recording, never to how you sound.
- The lo-fi radio pauses whenever the microphone is claimed (a take or live pitch) and resumes after. Checked by measuring the page's audio output in headless Chrome: about 0.04–0.09 RMS while playing, 0.0001 while live pitch was on, back to playing after. Untested on real speakers next to a real microphone, so headphones are still the safer setup.

**Content**
- No licensed example audio or video. Lilt links to the NHS Fife pages instead.
- No clinician review of the exercises.
- Vocal-pressure exercises are missing, because the NHS Fife page for them currently shows the
  intonation text.

**Validation**
- No natural-speech pitch validation.
- No perceptual listening labels.
- No usability session with a person.
- No real-microphone or real-phone test.

**Features not built**
- Formant and spectral measures. They are deliberately left out until they can be evaluated.
- A personal pitch-target setting. It is optional in the PRD; pitch is explored through the source
  exercise without a numeric target.
- Built-in authentication for LAN use. Use a proxy, as the README describes.

**Known behaviours**
- When analysis finishes after a session is complete, an additional review version is written. Earlier
  versions are kept, never overwritten.
