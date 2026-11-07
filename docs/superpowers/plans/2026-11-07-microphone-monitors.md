# Microphone, monitor finishes and first room reveal

User requested selectable microphone and computer designs, matching outlines, and a fix for
the original artwork flashing on refresh. They confirmed physical frames for both monitors,
with black, cream, sage and silver finishes, preserving pictures and click-to-enter.

## Design

- Keep each monitor's geometry and screen quad fixed. Apply painted finishes through registered
  frame/stand alpha masks; each monitor saves its own choice. Main screen still enters the desk.
- Add compact hardware pickers accessible from Make it yours. The microphone also opens its
  picker from the painted microphone, with a clear Practice action inside. Existing phone
  Practice shortcut stays direct; don't enlarge the shortcut bar again.
- Keep the microphone arm and pop shield anchored; swap the hanging body between original
  black, cream studio, sage retro and silver broadcast. Outline the whole assembly on hover/focus.
- Outline each physical frame and stand, preserving all monitor media, keyboard and focus flows.
- Load complete replacement assets before swapping. Retain current artwork on failure, offer
  Retry and unsaved-storage feedback, support cross-tab changes and Reset layout persistence.
- First reveal waits for saved selections and composed image decoding or explicit failure
  fallback. Subsequent changes keep the current room visible. No arbitrary flash-hiding delay.

## Work

- [x] Reproduce and fix startup flash independently with delayed-load and failed-load tests.
- [x] Generate registered frame/assembly masks and painted finishes. Fixed microphone silhouette
  avoids a background repair and preserves the original attachment.
- [x] Build typed hardware options, saved-choice hook, artwork and compact picker components.
- [x] Integrate frame and microphone outlines and appearance controls without changing entry routes.
- [x] Verify geometry, media retention, lighting, keyboard, phone, saved choices, failure/stale loads and refresh.
- [x] Update guide, design, release notes, artwork provenance and validation; run required checks.
- [x] Review and commit checked scope on main, without pushing.
