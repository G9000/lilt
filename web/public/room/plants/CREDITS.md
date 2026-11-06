# Painted room plants

Generated on 7 November 2026 using the built-in OpenAI image generation tool (not the API CLI).
The exact final prompt set is in [prompts.json](prompts.json).

- `clear-day.png`, `clear-morning.png`, `clear-sunset.png`, `clear-night.png`: edits of the
  corresponding Lilt `room-*-v3.webp` background, removing the floor plant. The application
  composites only a feathered rectangle around the old plant; the rest of the original stays.
- `sprout.png`: ficus, retaining the original saved choice ID.
- `monstera.png`: monstera.
- `fern.png`: Boston fern.
- `succulent.png`: jade plant, retaining the original saved choice ID.

The four sprites used the owner's attached crop of Lilt's floor plant as a style reference.
They are transparent PNGs; alpha was checked at background, leaf and interior gap pixels.
The application handles lighting, canopy growth and bed occlusion without modifying the files.
These are shaded 2D assets with a dimensional painted appearance, not 3D models.
