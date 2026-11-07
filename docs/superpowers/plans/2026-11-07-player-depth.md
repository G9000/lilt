# Ground room players behind the chair

The user requested a foreground chair asset and corrected player placement, especially
the record player and walnut radio. Keep the existing selectable designs and compact CD controls.

- [x] Extract a registered transparent chair/throw layer using the built-in image tool.
      Use its alpha to reveal the original room pixels in front of the player, preserving
      the original chair texture and all four light states.
- [x] Give each device its own scale, angle, desk contact point and restrained contact shadow.
      Keep the whole body stationary while its small playback details animate.
- [x] Load the foreground mask with the player art before showing a replacement; retain
      original/previous art and retry if any required layer fails.
- [x] Verify rendered overlap, all four designs and light states, playback stability,
      keyboard/phone controls and load failure. Inspect the composed room images.
- [x] Update artwork provenance, guide, design, release and validation; review the change.

Commit the checked work on main according to the repository instructions.
