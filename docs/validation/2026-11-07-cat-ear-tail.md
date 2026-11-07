# Sleeping ear and tail movement

Verified on Windows on 7 November 2026. Each of the five cats has occasional ear-tip flicks
and a gentle tail-tip swish while asleep. Feathered local deformation keeps the connected
cutout, face, paws and body intact. Breathing and the fixed bed anchor remain. The outline
uses the same animated sprite and reduced motion returns it to its original shape.

## Evidence

- Three pure tests cover bounded, mostly resting pose timing, localized displacement and
  stillness with reduced motion or a non-sleeping mood.
- `cat-puppet.mjs` checks real pixels from all five source images: ear/tail regions change,
  sampled face/paws/body regions do not, returning to rest restores identical pixels,
  repeated poses reuse the cache and outline alpha matches the complete current sprite.
- Inspected `.tmp/cat-puppet-shots/ear-tail-poses.png`, comparing each coat at rest, ear flick
  and tail swish. Fur stays connected without detached or duplicated pieces.
- Warm ear-pose rendering averaged roughly 0.9ms on this Windows Chrome run; initial source
  preparation took approximately 10–12ms. These are local renderer measurements, not a
  full-frame performance guarantee. Source pixels and the current pose are cached; frames
  are not accumulated. Pixel-read restrictions retain the original-image fallback.
- `room-cats.mjs` observed changing ear and tail pixel signatures during the real animation,
  with unchanged body pixels, matching outline transforms and the fixed y846 bed anchor.
  Reduced motion also freezes local shape changes. Existing five-choice, click/tap petting,
  hold/cancellation, keyboard/phone, saved-choice, failure/retry and refresh checks passed.
- `room-readiness.mjs` and `room-appearance.mjs` passed. Read-only code and pose-image review
  found no important issues in localization, cache lifetime, outline sync or fallback.

## Checks

Web types passed and 174 unit tests passed. Scratch production build and update stylesheet
passed, retaining the existing large-chunk warning. Server formatting and strict all-target/
all-feature Clippy passed; 129 server tests passed. Python: 47 passed, one skipped. Desktop
formatting and strict release Clippy passed. `git diff --check` passed.

Checks used isolated Chrome, stubbed APIs, scratch output and a separate native target. The
owner's application, development server, port 7878, practice data and web/dist were untouched.
Existing artwork files were not modified. No new packaged installer was tested.
