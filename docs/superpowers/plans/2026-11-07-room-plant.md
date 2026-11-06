# Plant inside the painted room

Replace the floating weekly plant tile with the actual floor plant shown by the user. Retain
the choice and practice-week count, but present it as dimensional painted art in the room.
Clicking the plant opens the picker; progress text lives there and on hover/focus.

- [x] Generate transparent ficus, monstera, fern and jade artwork with the built-in image tool.
- [x] Generate matching empty floor-plant backgrounds for each room light. Composite only the
      plant region over the original image, preserving the rest of the painting.
- [x] Keep the pot fixed, subtly scale the canopy with the week's practice days, and tint the
      artwork with the same time-of-day weights as the room. Preserve bed foreground occlusion.
- [x] Preserve saved choices; remove the draggable plant tile. Provide a Plants room shortcut
      where the painted object is cropped. Keep keyboard access and storage/load failure states.
- [x] Replace old widget assertions with scene-art tests, inspect all plants/lights and verify
      picker/persistence/growth/navigation, then run required project checks using scratch output.
- [x] Update guide, design, release, image provenance and validation. Commit on main; do not push.
