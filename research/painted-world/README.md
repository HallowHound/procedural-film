# Painted World: research, not a finished film

This is an **asset-first architecture decision and executable reference study** for
hour-long painterly journeys. It does not claim to solve the requested production
artwork, rigged characters, tavern/market interactions, unrestricted 3D cameras or
an original one-hour story. Do not present the study as an accepted visual target.

## Decision

Use **Godot for staged 3D worlds and animation**, **Blender for asset/rig authoring**,
painted/projection backgrounds for distant scenery, and canonical rigged actors
for travel and contact actions. This is a proposed production stack, not a Godot or
Blender implementation tested here. The browser study is a diagnostic, not that engine.

Keep the existing `living-world` scheduling/export principles; do not stretch the
original short-film skill or add one drawing agent per shot. Read
[the production blueprint](docs/BLUEPRINT.md), then
[the bounded Codex mission](docs/CODEX_MISSION.md).

## What runs here

`prepare.py` uses a supplied image and manually annotated regions to make a private
self-contained HTML study. It extracts three tiny cutout proxies, repairs their
old footprints with classical inpainting, packs material masks and a manual depth
proxy, and embeds the assets. `lab.html` projects the plate through a triangulated
WebGL depth sheet; material-specific motion, small camera movement and a deliberate
camera stress mode are available. No inference is performed during playback.

The study retains the original reference aspect in its UI for comparison. Its API
default and the proposed production default are 1280x720 / 16:9. Wide/tall study
views are labelled crops, not new compositions. The 399x501 source is not a 4K asset.

```bash
python -m pip install -r requirements.txt
python prepare.py /path/to/the/supplied-reference.png
# Open private-build/study.html in a WebGL-capable browser.
python verify.py verify
python verify.py export --seconds 8 --fps 12 --width 400 --height 502
```

Verification requires Chromium and Python Playwright; export additionally requires
FFmpeg and ffprobe. Set `CHROMIUM` to an existing browser executable, or install a
Playwright Chromium binary. In the tested Linux software-rendering container use
`xvfb-run -a python verify.py verify` (and similarly for export). The test harness
loads embedded HTML via `set_content`; it makes no HTTP/file-navigation requests.

Annotations are specific to this composition. A different image needs new masks,
figure polygons and camera validation, not merely the same aspect ratio.
Preparation overwrites files inside the selected output directory; use a dedicated
build folder. Do not apply the study's dimensionless camera limit to real scenes.

## Evidence actually obtained

Seven browser checks passed: raster-tolerant source projection, reverse seeking,
fresh-context shuffled seeking, exact 120-second period closure, non-static output,
invalid-input rejection and no page errors. Seventeen sample times include 3600s,
which repeats this 120-second study; this is **not** an hour-long unique scene or a
wall-clock soak. The eight-second 400x502/12fps MP4 contains 96 verified frames.

Read [the test report](docs/RESULTS.md) for failures, timings, limitations and visual
findings. Stills were inspected, but no full normal-speed end-to-end watch-through
or production-engine evaluation was performed. Technical checks do not approve art.

## Publication boundary

No source illustration, extracted sprites, embedded HTML build, generated pictures,
videos or caches belong in public Git without confirmed publication rights. The
source and annotations can be committed; private-build/ and evidence/ are ignored.
The supplied reference was used locally only. This code adds no ownership claim to
it. Existing repository license applies to new code, not automatically to artwork.
