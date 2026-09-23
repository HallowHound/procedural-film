---
name: living-world
description: Create slow procedural living landscapes, persistent travelling characters, ambient story scenes, long music videos and browser wallpapers. Use for an observable world that changes over minutes or hours, not a fast vertical explainer.
---

# Living World

Create a window into a place: a large landscape, small recognizable characters,
quiet environmental motion and a restrained sequence of connected events.
The deliverables are an offline HTML player, source/planning documents, review
frames and, when requested, a rendered MP4. This is a coding/art-direction workflow,
not a runtime call to a generative video model.

Read `../../LIVING_WORLD.md` when available, then `foundation/src/world.js`,
`foundation/src/scene.js` and `templates/PROJECT.md`. The starter is an executable
15-minute two-vista episode, not the visual ceiling or an all-theme world engine.

## Invariants

- Keep the original procedural-film skill and butterfly film unchanged.
- World state and rendering are functions of config, seed and absolute time.
  Never depend on prior frames, wall clocks, network calls or unseeded randomness.
  Caches are allowed only for deterministic data. Never create one cache entry per frame.
- Share the cast, proportions, clothing, gait, props and action vocabulary across vistas.
  A scene agent must not independently redesign an existing character.
- Derive walk phase from distance. Increasing episode duration adds sensible waits
  or chapters; it must not turn ordinary walking into extreme slow motion.
- Maintain quiet intervals and asynchronous local motion. No hard cuts on every
  beat, constant camera flight, flashing textures or constant high-salience events.
- No mandatory synthesized soundtrack. Keep music separate and verify rights to
  any supplied media. The default visual runtime is asset-free; a hybrid project
  needs an explicit asset/license contract and adjusted checks.
- Do not render a multi-hour master before visual/motion gates pass. Do not
  allocate full-length audio buffers or spool the whole film as PNGs.

## Workflow

### 1. Brief and scope

Resolve theme, desired look, cast, destination/use (video/wallpaper/both), duration,
resolution, music ownership and forbidden imagery. Ask only for genuinely missing
choices; otherwise make a concrete proposal and record assumptions. Prefer a
single polished minute and a coherent 10–15-minute episode before expanding to hours.

Done: one clear artistic brief and explicit scope in `docs/PROJECT.md`.

### 2. Foundation and smoke test

Copy `foundation/` into a fresh project, excluding generated folders; it includes
the license. Copy the project template to `docs/PROJECT.md`. Run `npm install`,
`npx playwright install chromium`, `npm test`, `npm run build` and a one-second
small-resolution export. FFmpeg AND ffprobe are required for video. Keep the
runtime independent of the agent and original repository checkout.

Done: source player, standalone HTML and a real short MP4 run locally.

### 3. Art bible before detail

Fill the template with palette, silhouettes, depth planes, lighting, materials,
composition, character size, action scale, camera constraints and references.
Use authoritative references for any claimed real-world facts; fiction does not
need invented factual citations. Pick one visual language and apply it across all
vistas. The template's starter palette is an example, not a universal house style.

Render the first composed frame, not a placeholder. Inspect it at full size and
thumbnail size. More line count or particles do not substitute for composition.

Done: an appealing still with readable characters, a clear route and coherent light.

### 4. Canonical cast and normal-speed motion study

Implement shared character/animal drawing and actions once. Stage a walk, stop,
turn, interaction, sit and resume with appropriate foot contact, facing and props.
Use measured path distances, fixed action durations and transition poses. Movement
must look natural at 1x, even when the story lasts three hours.

Done: review a real 30–60-second clip; no skating, popping poses or inconsistent cast.

### 5. Episode plan and continuity

Write a small number of long chapters. State where actors enter/exit, which events
need participants/resources, what changes in the environment and what stays quiet.
Plan the whole episode before sampling frames. A fixed schedule with seeded bounded
variation is preferred initially to unconstrained emergent simulation.

Use absolute time across transitions and exports. Hide a move between independent
vistas behind a planned exit/occlusion/dissolve; do not teleport a visible person.
Do not extend the starter to three hours merely by changing duration unless the
brief explicitly accepts the same two vistas with long rests. Add chapters for a
richer journey; each added vista must reuse the cast and pass the same gates.

Done: frame/state queries work cold at any point, including every action boundary.

### 6. Layered life and causal events

Compose environment motion (wind, water, sky), individual activity (gait, breathing,
animals) and occasional story events (weather response, a stop, making camp).
Use one shared wind field for related motion, not synchronized sine waves on every
object. Reserve visual emphasis for the few important events. Audit background
motion for short obvious repeats and objects reappearing inside the frame.

Done: 10–15 minutes remain coherent at 1x; quiet passages are intentional.

### 7. Review waves

`npm run snap -- --samples 24` produces PNGs and an HTML contact sheet. Inspect all
frames, then request explicit times around every action/transition. Watch short
normal-speed clips; a still sheet cannot prove good animation. Assign critical
issues first: identity drift, broken anatomy/contact, teleports, obstructed action,
wrong lighting, distracting repetition. Re-render evidence after each fix.

For parallel agents, use ownership by subsystem: cast, environment, director,
player/export. One owner integrates shared contracts. Subagents are optional;
serial execution must remain supported. Never let concurrent agents overwrite
shared geometry or the same source file.

Done: every major visual/motion issue has a verified correction, not only a promise.

### 8. Determinism, performance and long-run safety

Run `npm test`, `npm run check` at target resolution, `npm run test:integration`
and a short chunked export with `--resume`. Repeat with the intended long-duration
config. Use `--budget` for a strict warm drawing budget and leave headroom for the
host; report measurement environment. Test seeking, loop handoff, pause/resume,
repeated chapters and bounded cache size. Native host testing is separate.

Done: no pixel/state order dependence, broken chunk join, duration-sized allocation
or unreported FPS failure. Do not call a 3-hour time sweep a 3-hour runtime soak.

### 9. Deliver

Build standalone HTML. Export using global frame ranges and bounded chunks;
remux user-approved music separately. Preserve resume manifests until delivery
is verified. Supply launch/export commands, the filled project document, review
images and a report of actual tests. Say which native hosts/resolutions were not
tested. Label the repeating dissolve honestly; do not claim an infinite unique world.

Done: artifacts exist, the user can run them without the coding agent, and the
result fits the original artistic brief rather than merely passing code checks.
