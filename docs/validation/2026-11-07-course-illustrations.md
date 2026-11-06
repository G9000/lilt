# Course illustrations and first-visit review

7 November 2026.

Three images generated with the built-in image-generation tool replace the placeholder references in the original voice course's welcome page. The first pass left the cover unchanged; the Home-banner follow-up below replaces it too. Credited video thumbnails are unchanged. Older placeholder files remain available for personal course copies. The new illustrations are decorative, not anatomical diagrams or demonstrations of voice technique.

Assets in `content/courses/voice/images/`:

- `practice-corner.png` — a microphone, notebook and water beside a sunlit window.
- `listening-nook.png` — headphones and an audio player for the listening section.
- `resting-cat.png` — a resting tuxedo cat beside a closed notebook.
- `cover.webp` — a panoramic practice corner above "Your practice" on Home.

The welcome page now opens with a first-visit route. Start here explains recording and saving a take, and the listening section gives one question per comparison and a smaller next step when a cue is unclear. No chapter/text ids, spoken texts, hints, check-ins, course edition, or exercise files changed. Dedicated matched A/B audio remains missing; the images do not fill that gap.

## Verification

- Web typecheck passed; all 150 web unit tests passed at the time of the check.
- Production web build passed into a separate temporary output directory.
- Existing `web/e2e/course-review.mjs` passed on a scratch server: course navigation, seven responsive screens, full Markdown rendering, room entry and six viewport widths.
- A temporary browser check decoded all three images at 390 and 1440 pixels in light and dark themes; no page overflow. Its first-visit links selected counting, the baseline greeting and hum-to-hello exactly. The two added Start here steps rendered.
- Inspected desktop illustration and mobile dark first-visit screenshots. All chapter/text ids and the entire exercise/hint sections were compared with HEAD and were unchanged.
- Test data and screenshots stayed under the ignored `lilt-data-course-review/` directory. Scratch servers were stopped. The owner's port 7878, data and running app were not used. The full Rust/Python/Mac checks were not run for this content-and-image change.

## Generation prompts

### Practice corner

Use case: illustration-story. Create a finished editorial illustration for Lilt, a private gentle voice-practice course. Wide landscape 2:1 composition. A welcoming, uncluttered wooden practice desk beside a sunlit window: one small desktop microphone, a simple closed laptop, a glass of water, a cream notebook open with abstract marks (no readable writing), a coral pencil and a sage houseplant. Empty chair invites the viewer in. Warm cream, muted sage, terracotta coral, honey wood, charcoal details. Beautiful hand-painted gouache and fine coloured-pencil texture on paper, sophisticated cozy picture-book art, soft natural light, rounded organic shapes, restrained detail, generous breathing room. No people, no screens with metrics, no lettering, no logos, no watermark, no gradients, no border. This is a decorative illustration of preparing for practice, not a medical or anatomical diagram.

### Listening nook

Use case: illustration-story. Create a finished editorial illustration for Lilt's gentle voice-practice course section on listening to examples. Wide landscape 2:1 composition. A quiet listening nook by an open window: over-ear charcoal headphones resting on a cream notebook, a small coral audio player with only a simple unlabeled play triangle, a clear water glass, linen curtain and sage-green leaves outside. View across a honey-coloured wooden windowsill and table; a few abstract soft curved strokes on the notebook suggest listening, without scientific charts or writing. Warm cream, muted sage, terracotta coral, honey wood, charcoal. Hand-painted gouache and fine coloured-pencil texture on paper, sophisticated cozy picture-book art, rounded organic forms, soft afternoon light, restrained detail, generous breathing room. No people, no readable text, no logos, no watermark, no border. Mood: listening with curiosity, at your own pace.

### Resting cat

Use case: illustration-story. Create a finished editorial illustration for Lilt's gentle voice-practice course: taking a break. Wide landscape 2:1 composition. A round black-and-white tuxedo cat, white muzzle and paws, sleeping curled comfortably on a muted sage cushion beside a honey-wood practice desk. On the desk edge a closed cream notebook, a coral pencil and a clear glass of water; warm linen curtains and a few leafy shadows nearby. Peaceful domestic scene, no human. Warm cream, muted sage, terracotta coral, honey wood, charcoal details. Hand-painted gouache and fine coloured-pencil texture on paper, sophisticated cozy picture-book art, rounded organic shapes, soft late-afternoon light, restrained detail and generous breathing room. Anatomically plausible curled cat with closed eyes, no extra limbs. No text, no lettering, no logos, no watermark, no border. A complete illustration about permission to rest; no medical claims or diagrams.


## Home-banner follow-up

The user clarified that the remaining thumbnail meant the wide image above "Your practice" on Home. Generated a matching 2172×724 panorama with the built-in image-generation tool, then encoded it as WebP (410,764 bytes) at the existing `images/cover.webp` path. Its existing reference stays valid for the already-running server and personal course copies.

Checked Home in a scratch server at 390 and 1440 pixels, light and dark: the banner decoded, remained visible and caused no horizontal overflow. Inspected desktop light and mobile dark screenshots. A read-only request to the owner's running app confirmed its served cover bytes match the new file exactly. No server restart or practice-data change was needed for this image replacement; the earlier guide-text edits still require the running server to reload its course.

### Cover generation prompt

Use case: illustration-story. Create the main cover banner for Lilt, a gentle private voice-practice course. A finished hand-painted gouache and fine coloured-pencil illustration on warm paper, matching a cozy cream, muted sage, terracotta coral and honey-wood palette. Very wide panoramic landscape composition, approximately 3:1. A peaceful small practice corner: a simple charcoal desktop microphone near the centre on a honey-wood desk, cream notebook and coral pencil to one side, headphones and a water glass nearby, a sleepy black-and-white tuxedo cat on a sage cushion at the other side. Soft sunlit window, linen curtain and leafy plants behind. Few large readable shapes, restrained details, organic rounded forms. Keep the microphone, notebook and cat around the horizontal centre band so the picture works as a shallow banner with vertical cropping. Gentle editorial storybook art with visible paper texture, soft natural light. No people, no readable text, no logos, no watermark, no scientific diagrams, no computer monitors, no border. Convey a welcoming place to practise and rest at your own pace.
