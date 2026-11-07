# Iced drinks and cameras

Generated on 7 November 2026 with the built-in image-generation tool, using Lilt's existing
`room-*-v3.webp` paintings as style and placement references. Outputs were copied into this
directory with their original pixels and alpha intact. No CLI fallback was used.

`web/scripts/prop-bounds.mjs` reads sprite alpha to generate layout-only metadata in
`web/src/room/propBounds.ts`. It does not alter raster files. Artwork fits a fixed tabletop
baseline in `roomPropOptions.ts`; SVG contact shadows and the interactive outlines are separate.
Only small feathered portions of the four full-room repair images are displayed.

## Prompt set

The camera prompts requested a single transparent prop matching the attached cozy room:
soft dimensional anime background painting, warm light from upper left, muted detail,
slightly top-down front view with the right side visible, bottom level and standing flat.
The whole object is centered on a landscape canvas with transparent margins. No logos,
lettering, straps, hands, room, tabletop, cast shadow, glow or aura.

| File | Requested subject | Built-in output ID |
| --- | --- | --- |
| camera-black.png | Faithful enlarged cutout of the existing black mirrorless camera: textured body, prominent round lens, small top dials, visible right side. | 0c0d5542-97c9-4d2c-8404-8a1cfddf1acd |
| camera-silver.png | Vintage silver-and-black film rangefinder, brushed silver top/trim, black leather body, compact round lens and rectangular viewfinder. | 7069e1fa-68aa-49f1-b7fe-f144a0806ab5 |
| camera-instant.png | Cream instant camera, softly rounded square body, small black lens, tan trim, flash and narrow print slot; no printed photo. | bbeb675d-589d-4e23-8c82-9ef2781d5c01 |
| camera-sage.png | Small sage-green compact digital camera, rounded horizontal body, silver lens rim, ivory flash and top shutter button. | 4c9f9456-44f1-448a-84ff-56f8a4116455 |

Drink prompts requested a single transparent tall clear tapered tumbler and one slim ivory
reusable straw leaning slightly right. Match the reference desk glass, with a visible elliptical
rim from slightly above, upright sides and level base. Soft dimensional painterly anime artwork,
warm upper-left light, restrained glints and readable small-scale detail. Keep the whole glass
and straw within a portrait canvas with transparent margins. No handle, lid, saucer, coaster,
garnish, logos, hands, background, tabletop, glow, aura or shadow. The drink itself is opaque
enough to read clearly as a small prop.

| File | Requested drink | Built-in output ID |
| --- | --- | --- |
| coffee-latte.png | Coffee-brown espresso blending into creamy milk with large amber ice cubes. | ab852f63-2be2-4bc5-b660-a9f63548c433 |
| coffee-coldbrew.png | Dark amber cold brew and a few ice cubes, without milk. | 7f0f0ce2-0807-4772-8620-8301db058db3 |
| coffee-matcha.png | Soft sage-green matcha blending into ivory milk and ice cubes. | a85b1c49-d4a9-404e-ab7d-7bdc6f0b833d |
| coffee-strawberry.png | Pastel-pink strawberry milk and a few ice cubes, without garnish. | 10d34726-51a7-4cce-bc6e-0d24f289e47d |

Repair prompts used the matching original room light as the edit target. Remove only the iced
glass/straw around x1165–1215, y465–577 and camera around x1245–1345, y529–591, including their
contact shadows, on the 1672×941 reference canvas. Continue the wooden desktop and hidden
monitor details seamlessly. Preserve composition, framing, other objects, monitor pictures,
perspective and lighting. No added props or transparency.

| File | Built-in output ID |
| --- | --- |
| clear-day.png | 84b82864-4e9c-478a-8903-cd0ed91f42ff |
| clear-morning.png | 4c615571-a764-42a5-84a1-488caf94214c |
| clear-sunset.png | d91694fe-d6c0-4b00-840f-680a350351f9 |
| clear-night.png | d902cf8d-3f5d-4631-874e-8e2f8b2432ea |
