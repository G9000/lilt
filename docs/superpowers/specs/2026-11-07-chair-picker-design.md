# Selectable room chairs

The owner chose four different chairs: the existing mesh chair with its pink throw,
a cream upholstered chair, a sage padded chair, and a walnut-and-cane chair.

Clicking the chair opens a compact picker like the mug controls. A Chair shortcut provides
the same action on narrow screens. Escape, Done and outside click close it and restore focus.
Choices are saved in browser storage and synchronized between tabs. Reset layout leaves the
chair alone. Choosing a chair never enters Practice or starts music.

All chairs keep the painted room's camera angle and floor contact. There is no CSS body
rotation or idle movement. The original chair stays available unchanged. Three generated
transparent cutouts provide distinct silhouettes; four lighting-specific background repairs
fill the original chair's silhouette and a feathered continuous under-desk region, avoiding
chair-shaped seams in the floor and wall. New artwork is generated with the built-in image
tool, copied into the project unchanged, and documented with exact prompts.

Render order: original room and other objects, player background repair, chair background
repair, player artwork, chosen chair foreground, original bed foreground, atmospheric effects. This prevents either
background repair from restoring an old chair over the other one. The chair foreground works
independently of music artwork loading. The current default mask remains available for its
existing player overlap.

Load the new chair, its repair images and mask together before replacing the visible chair.
Stale loads cannot replace newer choices. Failed loads retain the previous chair and offer
retry; failed storage reports that the choice applies only to the current visit.
Returning to Original disables repair immediately without waiting for replacement assets.
Original foreground masking applies only when Original is the shown chair, including initial
replacement-load failure. Replacement art follows existing room brightness/saturation/sepia
variables and lighting transitions, with reduced-motion support.

Verify stored-value validation, rapid switching, failed images, reset behavior, keyboard
and phone access, light/dark controls, all four room lighting modes, and player occlusion.
Inspect actual room screenshots for scale, floor contact, duplicate edges and perspective.
Browser fixtures use isolated caches, ports and stub data. Never restart the owner's app.
