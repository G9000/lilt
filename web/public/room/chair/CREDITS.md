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

Room sprites remain unchanged under `../players/`. Each device now has its own placement and
contact shadow. No generated room or chair RGB pixels replace the original chair in the app.
