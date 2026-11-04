# Refined room artwork, 4 November 2026

The five `*-v2.webp` files were made with the built-in OpenAI image-generation tool in this
workspace's chat. The existing Lilt `room-day.webp` was the edit reference. The four room
backgrounds leave the bed empty; `cat-v2.webp` is a single transparent, anatomically connected
cat. Original assets remain alongside them for comparison and rollback. The runtime uses v2.
Generated PNGs were converted to WebP with FFmpeg (room quality 92, cat quality 94); no manual
raster paintover or third-party artwork was substituted. The generation instructions below
describe the requested craft improvements; they are not a claim that a human illustrator made
the result.

## Final prompt set

### Day room

Use case: precise-object-edit. Edit the existing Lilt bedroom illustration as a production
illustrated application background, not a 3D render or UI screenshot. Create a careful editorial
paintover to remove distracting AI-generated defects. Keep the exact wide 16:9 composition,
camera, furniture placements, bed lower left, chair foreground middle, desk across right,
three-window city view, main monitor around 60% x / 42% y, right monitor at 77% x / 46% y,
microphone and pop filter left of the main monitor, speakers, keyboard and shelf left.
Preserve the cozy anime painted look, pink bedding, moss-green plants, warm wood, black
recording hardware and soft blue/lavender city. Keep monitor screen edges and positions very
close to input because they are interactive targets. Improve controlled drawn edges, readable
single microphone and pop filter properly attached to one boom, consistent perspective,
straight monitor/desk edges, coherent chair construction and orderly keyboard rows.
Simplify redundant headphones and repeating trinkets: one headphone set, a few curated books,
one small plush, legible pots and plant silhouettes, a notebook, camera and cup. Replace
meaningless stickers/gibberish with quiet material and a few clear illustrations. Reduce
scattered blossoms, repetitive sparkles and over-sharpened texture. Keep cherry-blossom main
screen wallpaper and a peaceful landscape on the right, without writing/UI. Gentle airy
daylight, restrained luminous color, no horizon sun disk, no crushed shadows. Remove the cat
completely from the lower-left bed and repaint continuous pink quilt for a separate animated
cat layer. No cats elsewhere, new subjects, text, logos or watermark.

### Morning, sunset and night

Use case: lighting-weather. Edit the completed day illustration, changing illumination only.
Keep the exact wide canvas framing and placement of all furniture, bed, chair, desk,
microphone, pop filter, window frames, plants, books, cup, monitor quadrilaterals and screen
artwork. Do not add, remove or move objects. Keep the bed empty and add no fairy-light strings
(the app draws them). Keep painted textures and lines, with corresponding edges registering
when crossfaded. No new details, text or watermark.

- Morning: pale peach-blue sky over the same skyline; gentle honey sunlight, peach highlights
  on quilt and desk, pale lavender shadows, clear midtones and a fresh calm feeling.
- Sunset: peach and muted lavender sky; warm late-afternoon amber light, gentle violet
  shadows, restrained colors without fluorescent orange or neon purple, readable furniture.
- Night: deep muted indigo sky with no sun and a few faint stars, same buildings with warm
  windows; soft warm globe-lamp light and gentle screen bounce. Keep quilt, wood, plants, chair
  and microphone readable. Lift interior midtones, preserve dark-fur legibility for the cat
  added later, rich blue shadows and amber highlights, no strong neon or exposure-crushed
  dark overlay. Comfortable visibility at ordinary laptop brightness.

### Cat cutout

Use case: background-extraction / precise-object-edit. Create one transparent PNG animation
sprite matching the lower-left cat's character, painterly anime style and viewing angle in
the reference. Only one repaired sleeping tuxedo cat, isolated on real transparent alpha;
no quilt, bed, room, rectangle, checkerboard graphic or text. Wide roughly 2:1 composition,
whole cat with a tiny clear margin, slightly elevated three-quarter view: rounded dark back
and rump left, head on front paws right, white chest/muzzle/paws, muted pink nose, two ears,
closed peaceful eyes. Deliberate anatomy: continuous silhouette, two small front paws tucked
together, hind paws naturally underneath, exactly one tail attached at the left rump and
curled forward along the lower body, tip near paws. No floating appendage, extra paw or second
tail. Clean hand-painted background-animation style, restrained thin outlines, carefully
placed cel shadows, gentle texture, charcoal rather than pure black, cream rather than bright
white fur, softly warm daylight from upper right. No exaggerated cartoon features, glossy 3D
shading or hyperdetailed fur. All body parts connected.
