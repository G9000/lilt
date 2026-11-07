# Sleeping ear and tail motion

**Goal:** Occasional ear flicks and a small tail-tip swish while each room cat sleeps.

**Approach:** Deform the existing connected cutout in three small, feathered regions. Keep
the face, paws, body and bed anchor fixed. Render at twice the painting resolution and share
the resulting canvas with the silhouette outline. Cache the source pixels and current pose,
not an unbounded animation frame list. Reduced motion and non-sleeping moods use the rest pose.

- [x] Add bounded pose timing and local pixel deformation in `catPuppet.ts`, with pure tests.
- [x] Connect the scene and outline canvas to the same current pose; retain breathing and gestures.
- [x] Check five actual images, stationary regions, rest restoration, outlines, reduced motion,
      saved-image refresh and pointer gestures in isolated Chrome; inspect pose screenshots.
- [x] Run required checks, review, document the feature and prepare the scoped commit on main.
