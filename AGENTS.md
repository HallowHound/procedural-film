# Working in this fork

There are two independent products. Preserve `skills/procedural-film/` and
`examples/butterfly-life/` unless explicitly asked to change the original short-film pipeline.

For ambient journeys, living landscapes, long music videos or desktop wallpapers,
read `skills/living-world/SKILL.md` and `LIVING_WORLD.md`. Start from
`skills/living-world/foundation/`, not from a thousand new short-shot files.

Runtime boundaries:
- `world.js`: pure seed/config/time -> state; reusable cast, routes, scheduled actions.
- `scene.js`: pure time-driven drawing; caches may contain only immutable generated geometry.
- `player.js`: browser clock, controls, host pause/FPS and optional local progress.
- `tools/`: offline build, visual review, validation and resumable encoding.

Keep character identities and props canonical across vistas. Motion cadence must
come from distance/physical action time, never from a three-hour normalized ramp.
Do not put model calls, network requests, wall clocks or unseeded randomness in rendering.
Do not allocate an episode-length PCM buffer or retain a whole episode of PNGs.

Run the new project's `npm test`, `npm run check`, `npm run test:integration`,
and `npm run build`. Inspect contact sheets AND normal-speed motion. A green
pixel test is not an art-quality approval or proof of real-time performance.
Record what was actually run, including resolution and runtime. Do not claim
Wallpaper Engine was tested merely because its callbacks worked in Chromium.

Keep new prompts and technical documentation in English. Do not publish generated
media, music, caches or node_modules to Git unless explicitly requested.
