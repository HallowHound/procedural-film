# Living World

A new, independent ambient-animation skill in this fork. The original
`procedural-film` skill and butterfly example are untouched.

The target is a **window into a place**, not a fast explanatory short: small,
recognizable travellers inside a large landscape, environmental motion, pauses,
minor shared events, a gradual evening and a camp that stays alive after sunset.

## Run the working example

Node.js 20+ is needed for the tools. Opening the source `index.html` or a built
HTML file in a browser needs neither Node nor an AI account.

From the repository root:

```bash
cd skills/living-world/foundation
npm install
npx playwright install chromium
npm start
```

Open `http://127.0.0.1:8080/`. The controls appear on hover/focus; use the timeline
to inspect the whole 15-minute episode. Space toggles playback, arrow keys seek
10 seconds. The 4x/16x/60x modes are **review tools**, not the intended final pace.
Restart the preview server after source edits.

The included episode, **The Long Way Home**, contains two held vistas, three
persistent travellers (Mara, Ivo and Ren), their dog Moss, walking and pauses,
rain during a shelter stop, a lakeside arrival, lighting/tending a fire, collecting
wood, fetching water, rest and sleep. Wind, clouds, birds, water, smoke, sparks,
grass, stars and fireflies are sampled procedurally. Music is deliberately separate.

This is a working stylized foundation, not a finished feature film, a general
text-to-video model, or a promise that any requested theme is already implemented.

## Single-file player and wallpapers

```bash
npm run build
# Open dist/living-world.html in a browser.
```

The build has no media dependencies, CDN requests or runtime packages. It includes
the original MIT notice. It works offline. The unbuilt `index.html` uses four
local scripts and should stay beside `src/`.

Add `?wallpaper=1` to the browser/preview URL for hidden controls, a capped frame
rate, optional local progress persistence, and a repeating dissolve. Add
`?t=560` to begin at a known time, or `?duration=10800` for a three-hour episode.
The default is 1920x1080 at 30 FPS. The illustration is composed in 16:9;
other aspect ratios are letterboxed, not stretched or automatically re-composed.

Wallpaper Engine integration implements `window.wallpaperPropertyListener`
`applyGeneralProperties` (FPS cap) and `setPaused`. Browser visibility pause and
user pause are independent: resuming the host must not override a user pause.
Import the built HTML as a web wallpaper using the host's editor. To make hidden
controls the default when the host cannot provide a query string, set `wallpaper`
to `true` in `src/player.js` and rebuild. The source is also usable in other
web-wallpaper hosts, but no host-specific APIs besides Wallpaper Engine are assumed.

The loop is an **explicit end-to-start dissolve**, not an endless unique world or
a physically continuous return journey. Its period is `duration - transition`.
Use non-looping mode for a fixed episode. Native Wallpaper Engine behavior still
needs checking on Windows; browser callback tests are not a substitute.

## Export video, then add your music

FFmpeg and ffprobe must be on PATH. The exporter uses Playwright/Chromium to draw
exact frames and streams one PNG at a time to FFmpeg; it does not screen-record
real-time playback. FPS is shared by the player, planner tools and encoder.

First validate a small range:

```bash
npm run render -- --from 90 --to 95 --width 1280 --height 720 --out exports/test.mp4
```

Then render a long episode, with the same normal movement speed and longer holds:

```bash
npm run render -- --duration 10800 --fps 30 --chunk 120 --resume --out exports/journey-3h.mp4
```

Add a locally owned/licensed music track. Use an absolute music path:

```bash
npm run render -- --duration 10800 --chunk 120 --resume --audio /absolute/music.mp3 --out exports/journey-with-music.mp4
```

Music starts at the beginning of the exported range. A short track is padded with
silence unless `--loop-audio` is supplied. Longer audio is trimmed to the export.
Without `--audio`, the video has **no audio stream**, not a multi-gigabyte silent
PCM buffer. There is no beat-grid requirement or AI soundtrack generation.

`--from`/`--to` are global episode seconds, rounded to whole frames. Every segment
uses those absolute frame indices, including after resuming. Export paths are
relative to the copied project, not the shell's current directory.

Completed video chunks and a manifest remain in `.cache/render-<fingerprint>/`.
`--resume` verifies each completed chunk's SHA-256. Source/config changes,
encoding changes and browser/FFmpeg version changes select a new cache. Audio
changes only remux the video. A broken chunk is re-rendered. Successful chunks
survive interrupted exports; the final output is replaced only after verification.
SIGINT/SIGTERM release the render lock. A hard kill/power failure can leave a
`.lock`; remove it only after confirming no renderer is using that cache.
Do not manually edit manifests or run different exports to the same output path
concurrently. Delete old `.cache/render-*` folders when their resumability is no
longer needed; disk usage grows with completed compressed video, not RAM duration.

For a three-hour film at 30 FPS the exporter must produce 324,000 frames. Render
time depends on the actual scene and machine; a full three-hour export is not
included or claimed to have been benchmarked.

## Make a new theme with an agent

Install/link `skills/living-world/` in the skill directory used by your coding
agent, or tell it to read `skills/living-world/SKILL.md` directly. No provider-
specific subagent system is required. A single agent can follow the same gates.

Example brief:

> Use the living-world skill to create a quiet woodland journey for a three-hour
> music video and a desktop wallpaper. Three recognizable travellers and a dog
> cross a large landscape, stop by a stream, make camp and sleep under the stars.
> Start with a polished one-minute motion study and a coherent 15-minute episode.
> Keep movement natural, transitions rare, camera motion restrained, and the
> cast shared across every vista. Show rendered contact sheets before expanding.

Copy `foundation/` into a new project and copy `templates/PROJECT.md` into that
project's `docs/PROJECT.md`. The foundation carries its license. All commands
work from the copied project; they do not require the original butterfly example.

`src/config.js` controls title, seed, duration, dimensions, FPS and palette.
A new setting such as snowy ruins or a desert caravan requires adapting drawable
geometry and the plan, not merely changing the palette or a prompt string.
The seed changes deterministic variations; it does not manufacture new locations.

The included three-hour mode retimes the **same two-vista story** with longer
rests. To make a richer three-hour journey, author more vistas and meaningful
chapters using the shared cast and time-sampling contract. Do not pass that off
as already present in the starter.

## Architecture and quality gates

`src/world.js` exposes `LivingWorld.create(config).sample(T)` and an immutable
plan. `src/scene.js` creates a renderer exposing `renderFrame(T, {loop})`. The
same time returns the same frame regardless of the render order, within the same
browser/rendering environment. Cross-browser pixel-identical output is not promised.

Tracks use fixed movement speed. Extra episode time becomes dwell time, while
leg phase comes from travelled distance. Job entry/exit positions join exactly.
The short location dissolve happens after travellers leave the first view;
there is no need to redraw the characters independently for the second vista.

The renderer caches generated day/night background plates per vista at output
resolution. Cache size is bounded by vista/resolution, not elapsed time. A later
large-world implementation should add cache eviction instead of retaining every
visited location. `player.js` alone owns clocks, UI, persistence and host events.

```bash
npm test
npm run check -- --width 1280 --height 720 --budget 33.3
npm run test:integration
npm run snap -- --times 0,95,350,530,560,650,770,899
npm run build
```

`npm test` covers planning at 10 minutes, 15 minutes and 3 hours, identities,
position continuity, offscreen transitions, fixed locomotion speed, invalid input,
loop time, chunk boundaries and standalone assembly. It needs no browser package.

`check` compares full PNG hashes in forward/reverse order, in a fresh shuffled
page with decoy frames, and at cold first-frame anchors; checks nonblank frames
and the exact loop period; reports warm draw p50/p95/max. `--budget` makes p95
strict. The default warns when the requested FPS budget is missed. Timing excludes
PNG readback/encoding, compositor and host overhead, and is not a hardware claim.

`test:integration` exercises browser controls/host pause, a nonzero-range export,
partial final chunks, audio muxing, cache reuse and recovery from a corrupt chunk.
It creates short local synthetic test audio and deletes its own output/cache.
`snap` writes PNGs and an HTML contact sheet to `.frames/`; actually open and
inspect them. Still images cannot prove good walking, settling, fire motion or
unobtrusive pacing: also review normal-speed clips of each action and transition.

Optional executable overrides: `CHROMIUM`, `FFMPEG`, `FFPROBE`. Playwright's own
installed Chromium is preferred. `LIVING_PLAYWRIGHT_MODULE` can point to an
already installed compatible Playwright package for controlled/offline testing.

## Reference APIs

- Wallpaper Engine properties/pause: https://docs.wallpaperengine.io/en/web/api/propertylistener.html
- Playwright browser launch: https://playwright.dev/docs/api/class-browsertype#browser-type-launch
- Playwright screenshots: https://playwright.dev/docs/screenshots

## Next improvements, not current features

More biomes and connected route chapters; stronger hand-drawn/painterly art;
character turn/prop handoff animation; richer animal behavior; interaction/resource
scheduling; gentle camera composition changes; native Windows wallpaper profiling.
No real-time LLM, 3D engine, automatic music licensing or unlimited new story
content is part of this initial foundation.
