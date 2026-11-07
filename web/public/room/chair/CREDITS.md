# Chair foreground

`foreground.png` was extracted from Lilt's `room-day-v3.webp` on 7 November 2026 using the
built-in OpenAI image-generation tool (not the API CLI). The generated PNG is copied here
unchanged. The exact prompt is in `prompts.json`.

The transparent image retains the original full-scene framing, with the visible office chair
and pink throw in place. Its 1670 × 941 canvas is registered to the room's 1672 × 941 coordinates.
Alpha was checked: empty corners and desk pixels are transparent, chair interiors are opaque
or nearly opaque. The application uses only this silhouette as a foreground mask. The original
four room paintings supply the displayed chair pixels, preserving their texture and lighting
while covering the lower portions of the selectable music players.

The original chair choice continues to use original room pixels through this mask.

## Selectable chairs

Generated on 7 November 2026 with the built-in image-generation tool. Exact prompts are in
`selection-prompts.json`. All generated PNGs are copied unchanged.

- `cream.png`: cream upholstered swivel chair with oak arm supports (1602 × 981).
- `sage.png`: sage padded task chair with cream supports (1670 × 941).
- `cane.png`: walnut-and-cane swivel chair with a linen seat (1672 × 941).
- `clear-day.png`, `clear-morning.png`, `clear-sunset.png`, `clear-night.png`: edits of the
  corresponding room paintings with the original chair removed (1671 × 941). The application
  uses only the chair silhouette and a feathered under-desk region of these images.
- `bed-foreground.png`: extracted bed silhouette, used only as alpha to restore original
  room pixels over replacement-chair wheels. The rendered cat remains a separate later layer.

Cutouts are registered to the room's 1672 × 941 coordinates and follow its brightness,
saturation and sepia lighting variables. The selected chair covers the music player;
the bed stays in front. These are dimensional painted 2D assets, with no body animation.
