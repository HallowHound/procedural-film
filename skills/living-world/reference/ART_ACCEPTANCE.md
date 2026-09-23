# Art acceptance: a working renderer is not the visual target

This gate applies to every Living World project. The original butterfly film is
an example of authored visual specificity, not a demand that every world copy
its colours, scientific annotations, cutting rhythm, or line-boil animation.

## Diagnose the first prototype correctly

The first Long Way Home demo proved the clock, persistent cast and export path,
but its broad flat mountains, generic pine symbols and sparse ground detail did
not meet the requested visual richness. Passing implementation tests did not
resolve that mismatch. Do not call more particles, higher resolution, more code
or a longer runtime an artistic upgrade on their own.

## Read and look before writing a new vista

When the complete repository is available, inspect:

- `skills/procedural-film/reference/example-paper-frame.jpg` and
  `example-blueprint-frame.jpg` at native size, not just the contact sheet.
- `examples/butterfly-life/docs/art-bible.md`: note shape-specific construction,
  material-specific detail, palette control and the hierarchy of line weights.
- A representative original scene source: how actual anatomy, cells, bark or
  foliage is authored rather than represented by a generic symbol.

When a copied standalone skill lacks these resources, obtain an agreed visual
reference from the user. State when an image could not be inspected. Reading an
art bible is not the same as seeing its reference frames.

## Three-scale evidence

Review the same frame in three views: a thumbnail, the native-resolution image,
and native-scale crops of the cast and two important materials. All three must
work. Thumbnail-only approval can hide crude geometry. Zoom-only approval can
hide an empty or confusing composition.

At composition scale, require a clear point of interest, readable light, foreground /
middle-distance / distance, and intentional quiet space. Do not fill every area
with equal-contrast texture.

At object scale, require recognisable construction: branching and needle masses
rather than stacked triangles; a rock's fracture planes rather than a smooth oval;
cloth weight, equipment and a readable pose rather than a coloured peg.

At material scale, detail must describe that construction: veins attached to a
leaf's midrib, bark following the trunk, snow following gullies, masonry following
the wall, and folds following the body. Scatter/noise is only a final supporting
layer. It cannot replace those structures.

## Review failures to reject explicitly

- A large foreground object drawn with the same simplification as a distant one.
- Identical tree, cloud or stone stamps repeated without meaningful variation.
- Random bands of shading that end in rectangular edges across a mountain face.
- High-frequency linework that flickers continuously or competes with the cast.
- An evenly detailed frame with no hierarchy or large accidental empty fields.
- A night version that merely multiplies everything by black; local light must
  affect nearby characters and ground while preserving readable depth.
- Terrain gaps exposing the sky, objects hovering, or newly added props obscuring
  a walking route without a deliberate depth/occlusion rule.

## The actual gate

Before expanding the episode, render one fully composed daytime still, a night
counterpart, and a real 30–60-second normal-speed motion study. Compare against
both the previous version and the agreed reference at matched resolution.
Record concrete remaining defects and the user's response. Do not claim parity
with a reference because screenshots were generated or code tests passed.

Agents should critique composition, material specificity and motion in separate
passes. With no subagents, do those passes serially. The renderer owner must
re-render the actual corrected frame; prose promises are not evidence.

`node test/visual-review.cjs` produces review frames and checks renderer
repeatability, the wallpaper period, bounded canvas allocation and disposal. It
is a technical regression aid, NOT an automated art score. Cold initialization
and warm drawing cost must be reported separately from native-host performance.

## Current study, not a finished art package

The second Long Way Home art pass explores engraved mountain terrain, needle
clusters, veins, masonry, grass and stone surfaces, and equipment/local firelight.
Its landscape is deliberately stylised and its distant cast remains simplified.
It has not been accepted as matching the butterfly example. Continue from the
user's visual feedback instead of expanding story duration prematurely.
