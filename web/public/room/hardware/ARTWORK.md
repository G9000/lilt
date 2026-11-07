# Microphone and monitor finishes

Generated 7 November 2026 with the built-in image-generation tool, referencing the existing
`room-day-v3.webp`. Original output pixels were copied unchanged. There was no CLI fallback.
Registered alpha masks reveal only the hardware; full-room finish images are never shown as
backgrounds. The original black choice uses the existing room painting. All finishes retain
the original outside geometry, attachments, screen openings and stand positions.

`web/scripts/hardware-outlines.mjs` reads the masks to derive smooth SVG interaction contours
in `hardwareOutlinePaths.ts`. It writes UI geometry only; it never changes raster artwork.

## Prompt set

Mask prompts requested transparent extraction on the exact 1672×941 reference canvas without
zoom, framing changes or redesign. Main and side masks include their physical frame and stand,
with screen interiors transparent. Microphone extraction includes the entire black boom arm,
desk base, hanging capsule and pop shield, with all gaps transparent.

Finish prompts requested exact reference registration, unchanged screen corners and pictures,
and edits only to both physical bezels/stands: warm ivory cream, muted sage green, or brushed
silver aluminium. Every other object and the camera framing were to remain unchanged.
The same full-room finish serves either monitor, isolated by its own alpha mask.

Microphone prompts requested edits only to the body and shock mount near x750,y320, keeping
its original silhouette, top attachment at y274 and bottom at y364. The black arm and oval
pop shield stay in place. Cream uses an ivory body and champagne grille; sage uses a muted
retro green body and dark grille; silver uses brushed metal with a charcoal grille. Match
the cozy shaded illustrated style, without logos, lettering, a new stand or movement.

| File | Built-in output ID |
| --- | --- |
| main-mask.png | 4bb0a143-9d25-4281-9ac2-7933d2d539a8 |
| side-mask.png | d54f6ffb-292d-4041-beb8-58a238dee2e3 |
| microphone-mask.png | 8de85ff7-0b51-49a1-bcac-0cb7abae612f |
| frames-cream.png | 17b9a1fa-007f-497b-94b0-935a614c5028 |
| frames-sage.png | 9795c566-a98a-4b7a-845f-a6fc8cd7cc3b |
| frames-silver.png | d32f8f56-aa3f-48cb-8fbe-70f485dd4a12 |
| microphone-cream.png | 8f8b6c4a-6dd7-4b18-a2f8-a8ea05f6a044 |
| microphone-sage.png | 1bab9703-760d-4d8d-ab34-778d09bbf35e |
| microphone-silver.png | 240c9a3d-290f-486b-bd7f-79b9529093b5 |

## Distinct monitor models

The owner then requested thicker, more creative monitors. Three new full-room source paintings
were generated with the same built-in tool, referencing `room-day-v3.webp`. These are composed
through registered SVG housing/opening contours in `monitorModels.ts`; source raster pixels
remain untouched. The second monitor uses the room's existing perspective transform, and each
screen's media stays below the model's bezel. Transparent-extraction attempts were not selected
because their edges included artifacts; they are not shipped or used by the application.

Prompts requested a new center-left monitor model on the unchanged 1672×941 room canvas, matching
the cozy shaded illustration. Keep the housing around x846–1166,y305–500, with a smaller recessed
screen opening and a broad solid pedestal covering the original neck and foot. No logos or text.
The model must sit firmly on the desk, with distinctive physical construction rather than a colour
change. The room and other objects retain their positions. Rendering isolates only the new casing
and stand; the generated blank screen interiors and surrounding room are excluded by UI contours.

| Shipped file | Design requested | Built-in output ID |
| --- | --- | --- |
| monitor-retro.png | Chunky warm ivory plastic, deep softly bevelled casing, two little buttons, broad cream pedestal and rounded rectangular foot. | f57051c3-ccac-4fb2-a849-8328e70ab218 |
| monitor-rounded.png | Sage designer monitor, thick sculpted housing, soft rounded corners, recessed dark rim, tapered pedestal and wide oval foot. | 032826bd-1c99-4b7f-b450-399bde5f023f |
| monitor-studio.png | Brushed silver studio display, substantial lower chin, tiny centered sensor dot, wide pedestal and flat aluminium foot. | 7cb0e4b1-482f-4cd6-b470-6b19e9d9c40e |
