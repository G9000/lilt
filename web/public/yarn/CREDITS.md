# Ball of yarn artwork

Created for Lilt on 7 November 2026 using the built-in OpenAI image generation tool.
Generated originals were converted to WebP at quality 88; kitten alpha is preserved.

- `room-day.webp` and `room-night.webp`: painted background variants.
- `kitten.webp`, `kitten-reach.webp`, `kitten-rest.webp`: matching transparent character poses.
- The moving yarn and fallback illustrations are drawn locally by `web/src/yarn-art.ts`.

These assets are bundled locally, with no runtime image service or external image requests.
The night room edits the day room; both alternate kitten poses edit the watching kitten.

## Day room

Use case: illustration-story. Asset type: production background for a cozy side-view voice game called Ball of yarn, landscape 16:9. Create a beautiful hand-painted gouache storybook interior with sophisticated soft lighting and tactile detail, not flat vector clipart. An inviting quiet window nook: warm ivory plaster, honey oak trim and floorboards, large window in the left half overlooking layered sage-green garden trees and distant hills, draping linen curtains with subtle stitched borders. Right edge has a small low bookcase with worn books, folded knitted blanket, basket with wool skeins, and a leafy plant in a glazed ceramic pot. Fine wood grain, linen weave, foliage shapes and soft contact shadows; warm afternoon light falling across an oval braided rug on the floor. Straight-on elevation, modest perspective, broad uncluttered wall/window play space across the middle. Critical composition: wall meets floor at 80% of image height, lower 20% is open floor and rug; no objects across lower-left floor, that is reserved for a separately animated cat. Keep upper left gentle pale low contrast for an overlaid heading. Small meaningful details concentrated at the edges. Calm cream, honey, sage, terracotta palette. No cats, no animals, no people, no floating yarn balls, no floating decorations, no text, no logos, no UI, no frame. Full bleed finished artwork, highly detailed but restful.

## Night room

Use case: lighting-weather. Edit this game background into its nighttime companion. Keep every object's exact geometry, window, curtain, books, rug, plant, floor and composition unchanged. Preserve the richly textured gouache storybook rendering. Replace sunlit garden with deep muted teal night foliage, a few tiny stars and pale moonlight. The room is gently illuminated by warm off-screen lamplight from the upper right, warm honey wood and cream textiles remain visible, soft blue-green shadows, readable midtones, no black crush. Remove direct sun patches on floor; replace with faint cool window light. No new furniture, lamps, animals, characters, text or UI. Same dimensions.

## Watching kitten

Use case: illustration-story. Asset type: transparent game character sprite for a warm hand-painted gouache storybook room. ONE complete charming small blue-grey tuxedo kitten, side three-quarter view facing right, standing on all four cream-white paws, fluffy curved tail raised and curling toward its back on the left, body horizontal, round head on the right tilted upward watching a ball just above and to the right outside the frame. Grey fur with creamy white chest and muzzle, soft round cheeks, big expressive amber-green eyes, tiny pink nose, pink inner ears. Beautiful nuanced fur brushstrokes and flyaway tufts, believable soft volume, delicate whiskers, tiny toes, subtle warm rimlight, soft cool shadows. Friendly curious expression, compact cuddly proportions; NOT flat vector or plastic 3D. Whole character in frame with generous transparent margin. Horizontal body, slightly bent legs ready to play. Eye line upper right. No ball, no props, no ground, no cast shadow, no room, no text, no border. Genuine transparent alpha background.

## Reaching kitten

Use case: precise-object-edit. This is an animation companion frame for the supplied kitten sprite. Keep the exact same kitten identity, head, face, fur colors and painted texture, same camera, SAME canvas dimensions and SAME body size and placement. Change only the front paw on the viewer's side: lift that foreleg forward/up toward the right in a gentle playful reaching gesture. Keep the other three paws on the same ground baseline, same raised curled tail, same upward gaze. No extra limbs. Keep generous margins and all whiskers inside frame. No shadow, no halo, no background, no props. Genuine transparent alpha.

## Resting kitten

Use case: precise-object-edit. Animation companion sprite of EXACT SAME grey and cream tuxedo kitten, with same painted gouache fur texture and color markings. Change pose to resting curled on the floor, tail curled around its body, paws tucked in, head on the right resting slightly raised with eyes gently closed. Full body and whiskers entirely visible, about same total width as reference, same camera and warm rim light. Keep same canvas dimensions with feet/body bottom at same baseline near bottom; empty transparent space above sleeping body. Absolutely no backdrop, halo, floor, props or cast shadow. Real transparent alpha.

