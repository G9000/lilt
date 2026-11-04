# Media on the room monitors

The owner approved adding Picture / GIF / Video choices to both illustrated monitors,
including uploads, previews and pause controls. Keep the current room layout and navigation.

Each monitor keeps its existing picture presets and gains a file picker for a picture,
GIF or silent looping video. Selecting a file validates decoding and size before replacing
anything. A small preview, filename, play/pause and remove action appear in Make it yours.
The uploaded choice can be selected again after trying a built-in picture.

Files stay in this browser's named Cache Storage, with only identifiers and preferences in
localStorage. This avoids large base64 videos in localStorage and changes to the plain-file
practice server. No upload request goes to a server. Limit each file to 25 MiB and decoded
dimensions to 4096 by 4096; accept PNG/JPEG/WebP/GIF and playable MP4/WebM only. Cache or
preference write failures leave the previous media intact and explain the problem.
Preference commits and retired-file cleanup share an origin-wide Web Lock, merging fresh
stored preferences. Per-monitor revision stamps cancel stale pending uploads, including
cross-tab resets. Temporary lighting changes survive consecutive storage-write failures.
PNG/WebP picture uploads are flattened, so animation cannot bypass playback controls.

Rendering reuses the existing perspective transform. Videos loop muted and inline. Pause
holds video position; GIF pause shows a captured still. Reduced motion defaults media to a
still until explicitly played. Leaving the room or hiding the tab suspends animation.
Blob URLs are revoked when replaced or unmounted. Missing cached files fall back to the
original painted screen with a re-upload message in the panel. Reset room removes both
custom choices and their cached files; Reset layout has no effect on media.
Missing-file errors remain visible when Play is pressed; only playback errors are retryable.

Verification covers independent uploads, reload, pause/resume, removal/reset, bad or oversized
files, storage failure, cross-tab preference updates, reduced motion, navigation and fitting
the panel on phones and large screens. Use isolated browser data and stub all practice APIs.
