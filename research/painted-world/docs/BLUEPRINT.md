# Production blueprint — a painted world that can be followed

Status: **architecture proposal, not production acceptance**. Research and local
browser experiments: 2026-09-24. Default deliverable: 1920x1080, 30fps, 3600 seconds;
aspect ratio and resolution are project inputs. There is no finished Godot scene,
character rig, generated asset library or unique hour in this change.

## 1. Change the unit of work

The original repository's README describes one agent per short shot, 1000+ lines
of drawing, then critic waves. Its skill is a 30-second, 1–3-second-shot,
beat-synchronized, asset-free pipeline. That is a different production problem.
The existing `living-world` branch already separates deterministic time sampling,
canonical cast and chunked export. Its `world.js` still authors two vistas and
allocates spare duration to waits. More duration does not create better art or
new places. Preserve the good engineering; replace the art-production strategy.

The new unit is **a reusable location, character, animation clip or interaction**,
not a shot. Models create those resources and direct their use. They do not redraw
the landscape or invent the cast for every frame. The output is staged cinema, not
a general-purpose MMORPG or a full emergent-economy simulator.

## 2. Select one production stack

Primary recommendation: **Godot staged 3D runtime + Blender asset/rig preparation
+ painterly textures/projection plates + FFmpeg deliverables**. Pin actual engine,
exporter and graphics-driver versions when the first target-machine test runs.
Neither Godot nor Blender was available/executed in this container; browser tests
are not their performance or quality benchmarks.

Godot's AnimationTree provides blending/state-machine/root-motion facilities [2].
Its offline Movie Maker supports fixed-rate output rather than dropped-frame
screen recording [1]. Spatial shaders permit custom material/light treatment [3].
Those capabilities fit reusable travellers and scheduled scenes. They do not
supply the desired art direction or contact animation automatically.

Blender is the authoring part of this design: one source of truth for meshes,
rigs, skin weights, UVs and animation. Export a controlled glTF/GLB subset and
validate it in Godot. Do not assume Blender shader graphs or every rig constraint
survive export; bake necessary animation and rebuild the approved runtime material.
Keep Blender as an alternate final-render path only if a representative Godot art
study demonstrably fails the agreed target. Do not build two production engines
in parallel before that decision.

A pure painted 2.5D renderer remains a good *different product*: locked-camera
wallpapers and small parallax moves. It is not the sole answer to this brief.
Generated video may supply occasional approved effects or cutaways, but not the
canonical one-hour world state. Hundreds of independently regenerated short clips
would re-open identity, geography and repair problems at every join.

## 3. Build geometry only where it matters

| Region | Representation | Reason / constraint |
|---|---|---|
| Walkable ground, road, bridge, tavern, market, camp | Coherent 3D geometry, collision/contact surfaces, painterly materials | Foot contact, shadows, occlusion, changing viewpoint and entry into buildings |
| Main cast and interactable props | Canonical rigged 3D assets | Same body/clothes/props across actions and camera angles |
| Trees and near vegetation | Hybrid meshes/cards with validated backs, root-pinned deformation | Wind and parallax without entire trees wobbling as a flat image |
| Distant cliffs/castle/forest | Authored meshes plus layered or projected paintings | Spend detail where seen; respect each plate's camera envelope |
| Sky, distant clouds/fog | Atmosphere and deep layers | Slow depth-consistent changes without revealing unpainted surfaces |

A single picture contains no verified back of the tavern or ground behind the
foreground tree. Even layered-depth photography needs hidden colour/depth surfaces
to be inpainted [4]. Our depth-sheet stress demonstrates the simpler failure:
stretching and an uncovered border. Recovering plausible depth is not equivalent
to reconstructing a navigable location.

Each projected asset therefore declares a reference camera, allowed camera volume,
overscan, disocclusion coverage and occluder geometry. An orbit/dolly outside that
volume is a **preflight error**, not a prompt to add stronger distortion. Generate
or author missing surfaces, swap to genuine geometry, or redesign the camera path.

Connect stages through authored 3D corridors, bends, vegetation or doorways. For
a genuinely continuous shot, both connected sections must have compatible world
coordinates, illumination and cast state at the handoff. A dissolve is permitted
as an editorial alternative, but must not be labelled a continuous 3D traversal.

## 4. Preserve the reference's visual language

The reference's strength is not a generic pixel grid: it is composition, depth,
soft atmospheric light, clustered flowers/leaves, specific architecture, and a
small journey set inside a large world. Its 399x501 pixels are a visual brief, not
an adequate landscape master for 1920x1080 or 4K. Increasing dimensions creates no
new authored information. The diagnostic's wide crop also loses composition.

Create a new, approved native-16:9 key composition with overscan before scene
assembly. Keep approved sky/cliff/forest/building/ground layers and clean plates.
Use the 3D blockout's camera, depth and silhouettes as constraints when generating
or editing final art. Unconstrained independent illustrations for neighbouring
views tend to produce incompatible geometry; review alignment before projection.

Use a common colour script for painting and actors. Build broad shape/value groups
first, material-specific medium detail second, sparse high-frequency accents last.
Place brush texture in UV/object/world coordinates so it follows surfaces, not
screen noise or a fresh random pattern each frame. Do not apply per-frame neural
stylization as the default final pass; a stable mesh can still acquire flickering
textures and identity drift through independent frame generation.

Night requires either proper runtime lighting/material separation or aligned,
approved night plates with consistent geometry. Dimming a sunlit painting blue
keeps baked daytime shadows and is only a colour study. Add emissive windows,
local lantern/fire illumination, reflections and changed environmental activity.
Rain needs coherent direction, wetness, shelter response and surface interaction,
not only diagonal streaks. Use a shared wind field, pinned plant roots and flowing
water masks; avoid synchronized sine motion on every object.

Suggested initial framing target, subject to visual approval: heroes around
3–6% of frame height in travelling vistas, somewhat larger for necessary hand
interactions. Check identity and action at actual delivery resolution, not only
in close-up inspection. A tiny unreadable figure is not a strong protagonist.

## 5. Canonical cast and actions

Lock each hero's model, proportions, wardrobe palette, silhouette, equipment,
handedness and asset ID once. The tiny people in the reference are not enough to
extract a production rig or detailed character design; author an approved cast
sheet. Reuse the same rig through walk/turn/idle/look/talk/sit/stand/eat/drink,
pick-up/put-down, fight/react and lie-down/sleep/get-up clips.

Retarget licensed motions or author clips once; procedural controls then adapt
feet/hands/look direction/cloth to the stage. Contact beats need actual anchors:
chair seat, table surface, cup handle, weapon grip, bed, firewood placement.
Specify prop ownership through attachment/detachment events. Do not let a new
scene agent redraw the same coat or invent a second cup in the other hand.

Locomotion phase follows travelled distance, not a normalized hour-long ramp.
Slow travel is not slow-motion walking. Blend stop/turn/sit transitions, lock
planted feet, use terrain height and keep the body mass over its support. A fight
is a paired, timed interaction with spacing/contact/reaction beats, not two
independent attack loops. For distant figures, approved directional sprite clips
rendered from those exact rigs may be an optimization, not separate character art.

## 6. Generate assets once, edit locally

Astra/Sol are the reasoning and implementation roles. An image-generation tool is
a separate capability. Current OpenAI documentation lists image generation/editing,
reference inputs, masks and transparent outputs, while warning about recurring
character and structured-composition consistency [5]. Such tools help create
plates, textures, prop concepts and cast sheets; they do not automatically provide
rigged meshes, clean topology, useful UVs or trustworthy animation-ready layers.

Start with inexpensive thumbnails, choose the composition, then refine selected
assets. For revisions send the locked source, mask and exact desired change.
Store immutable output bytes and hashes; a repeated prompt is not a reproducible
asset cache. Capture source/license, reference hashes, provider/model, parameters,
mask hash, revision and approval status. Never let a tool call silently replace
approved cast art. Do not publish user-provided/reference media without rights.

Required per-location asset set: approved colour key; walkable stage; camera paths;
contact/occlusion surfaces; sky/far/mid/near artwork as needed; depth and semantic
masks; albedo/emission/lighting strategy; day/weather variants where baked lighting
requires them; entry/exit anchors. Bake important hidden regions rather than
assuming a segmentation mask supplies their pixels.

For assets generated as full illustrations, inspect seams, alpha edges, embedded
shadows, perspective, scale, forbidden extra figures and the consistency of
neighbouring views. A single successful still is not evidence of camera readiness.

## 7. Compile a story, do not ask a model every frame

Proposed data flow:

```
brief + art bible -> approved assets + location/cast contracts
chapter plan + seeded choices -> validated event schedule
schedule + fixed time -> transforms, animation phases, props, weather, camera
staged 3D renderer -> bounded frame chunks -> verified video
```

Use authored interaction templates with preconditions/effects. Example: buying
food requires the party at a stall, an available vendor and counter anchor;
completion updates a carried food prop. Camping requires arrival, a safe fire
anchor and a wood-placing action before ignition. Schedule reserves participants
and shared anchors, so the same actor or chair cannot serve conflicting actions.

The renderer reads an already compiled schedule. Use absolute integer frame
indices and fixed simulation ticks. Analytical effects may seek directly; real
physics, AnimationTree transitions and temporal rendering may require checkpoints
and deterministic warm-up. Do not promise history-free sampling merely because
the old Canvas engine had it. Test cold chunk starts against uninterrupted output.

A proposed first hour could use eight chapters: valley departure 0–8m; bridge and
woods 8–15m; market 15–24m; tavern 24–32m; rainy ruins road 32–39m; a brief encounter
inside 39–44m; dusk camp 44–54m; night/rest 54–60m. These are **unimplemented story
allocations**, not renders or an accepted pacing specification. The fight itself
should be brief, with approach/recovery/quiet time around it.

Layer background motion, recurring NPC routines and occasional causal story beats.
Plan quiet intervals deliberately; not every visible thing needs constant motion.
Seeded variations can change small timings and choices while preserving cause,
character identity and geography. New unique locations still require new assets.

Separate three modes explicitly: a linear hour; an exact cyclic episode; an
ongoing world. A linear story ending asleep does not seamlessly loop to departure.
An exact cycle needs matching poses, props, camera, lighting, particle/audio phase
and preferably velocity, or a clearly declared hidden/dissolved reset. An ongoing
world persists state and may reuse activity templates without being an exact loop.

## 8. Bound model use and review

Proposed responsibilities, not a benchmark result: **Astra** owns art direction,
architecture, hard failure analysis and acceptance review. **Sol** implements
small bounded tasks, scene data, imports, tests and routine corrections. Keep a
single integration owner; parallelize by subsystem only after interfaces exist.
Do not launch one heavyweight agent per shot or repeat the whole repo in every
prompt. Supply the small contract, owned files, asset IDs and relevant evidence.

Use at most two local correction rounds per task; if the same defect survives,
escalate a short failure report with before/after crops instead of spending another
unbounded critic wave. Automated tests filter invalid states first. Then review a
contact sheet, important 1:1 material/cast crops and short 1x motion clips. Judge
silhouette/composition before requesting more detail. No automatic art approval.

API rates published on the research date are Astra Standard $10/$50 and Sol $2/$10
per million input/output tokens [6,7]. Those are public API rates, not estimates
of this project or the user's Codex subscription allowances. No Astra/Sol/image
API calls or token-saving benchmark were run here. Measure accepted asset cost,
accepted task cost, retries, cached inputs and render time in the actual workflow.

Rendering another minute of an existing compiled world must consume **zero model
calls**. New story/asset authoring is still work. Total production cost separates
asset generation, coding/review tokens, rendering and storage. Do not advertise
an unsupported percentage saving or a fixed price for a finished hour.

## 9. Reuse export infrastructure, do not assume drop-in compatibility

The existing branch's bounded chunks, source fingerprints, resume checks and
corrupt-chunk repair are useful design contracts. Its Canvas browser capture is
not automatically a Godot adapter. Inspect and port only the required interface.
At first, render a short bounded PNG chunk with Godot Movie Maker, encode/verify
it, then delete temporary frames; implement a streaming MovieWriter only if
measurements justify it. Godot documents a custom MovieWriter route and an AVI
4GB output limit [1]. Do not render a whole hour to one giant intermediate AVI.

At 30fps an hour has 108,000 frames. Uncompressed 1080p RGB would total roughly
672GB in decimal units before overhead: a reason to avoid episode-sized frame
buffers and full-hour PNG spools. Use frame ranges, source/config/asset hashes,
engine/shader/driver/colour-setting fingerprints, temp names and ffprobe validation.
Cache small bakes and assets, not every sampled time. Verify a repaired chunk does
not create a lighting, pose, temporal-AA or sound discontinuity at its neighbours.

Do not assume bitwise identical output across different GPUs/drivers. Record the
environment and use an explicit image tolerance where justified. Test long-duration
state coverage, a real runtime soak, bounded memory and final encode separately.
A 3600s time query is not a 3600s watch-through. Keep music optional and rights-checked.

## 10. The next gate is an accepted 60–90 seconds

First, approve one new 16:9 still with the cast integrated into the actual stage.
Then build a 60–90s slice: a held valley vista; heroes approach/cross the bridge;
the camera translates far enough to reveal real occlusion around a near object;
a hero stops, turns, places a prop and sits; the party resumes through a connected
section. Keep it at normal speed. Include separate day/night and weather test shots.
This forces the representation to prove more than a wavy image or a code scaffold.

Reject the slice for pasted-on low-poly actors, foot sliding, rubber-sheet scenery,
identity changes, chair/hand contact errors, texture shimmer, blue-only fake night,
unplanned cuts/teleports, or lost composition at delivery aspect. Inspect before/
after frames at native scale and watch the motion, not just a contact sheet.

Only after this acceptance: build reusable market/tavern/camp interactions, a
10–15m episode with connected stages, then the full hour and optional loop edition.
No new location proliferation before the first look is accepted. This is not a
promise of zero manual art cleanup; automation should reduce repeated labour,
not conceal an unapproved result behind duration and technical tests.

## Sources (primary; checked 2026-09-24)

[1] Godot Movie Maker: https://docs.godotengine.org/en/stable/tutorials/animation/creating_movies.html
[2] AnimationTree: https://docs.godotengine.org/en/stable/tutorials/animation/animation_tree.html
[3] Spatial shaders: https://docs.godotengine.org/en/stable/tutorials/shaders/shader_reference/spatial_shader.html
[4] 3D Photography using Context-aware Layered Depth Inpainting: https://shihmengli.github.io/3D-Photo-Inpainting/
[5] OpenAI image generation: https://developers.openai.com/api/docs/guides/image-generation
[6] Astra: https://openai.com/index/gpt-6-astra/
[7] Sol/Luna: https://openai.com/index/introducing-gpt-6-sol-and-luna/
Repository audit: README.md; skills/procedural-film/SKILL.md on main; AGENTS.md,
skills/living-world/SKILL.md and foundation/src/world.js at a17ef7191035a1dd9080463701184c2f0113c65b;
PR #1: https://github.com/HallowHound/procedural-film/pull/1
