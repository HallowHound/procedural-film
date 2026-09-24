# Local experiment report — 2026-09-24

## Scope and environment

This report concerns the WebGL reference study only. Linux container, Python 3.13.5,
Chromium 144.0.7559.96 with ANGLE/SwiftShader, Python Playwright 1.57.0, FFmpeg 7.1.5.
No hardware GPU, Godot, Blender, neural asset generation or Astra/Sol API calls
were used. No engine/GPU performance or token-saving result is implied.

The source is a user-supplied 399x501 illustration. Assets were manually annotated;
three cutout proxies were extracted and their footprints classically inpainted.
The depth map is authored approximation, not inferred accurate geometry. Artwork
and the standalone build are private artifacts, deliberately absent from Git.

## What ran successfully

`xvfb-run -a python verify.py verify` passed **7 grouped browser checks**. Seventeen
sample times were compared in reverse and in a fresh page with shuffled order;
0, 120 and 3600 seconds were exactly equal within this repeated study. Invalid
size/time/rain/fit/light inputs and unapproved camera amplitude are rejected.
Day/night/rain/camera-stress and aspect-ratio frames were rendered and several
stills visually inspected. No JavaScript page errors were reported.

At the reference viewpoint, with actors/effects off, sampled output was compared
against the prepared clean plate, **not** the original image before figure removal.
8-bit RGB error: mean **0.0457414**, p99 **1**, maximum **4**. An initial stricter
max-error<=2 test failed. The final test explicitly allows mean<=0.1, p99<=1 and
max<=8 for WebGL interpolation/raster rounding; it does not claim lossless pixels
or assess art quality. The exact measured error is retained in verification.json.

A 24-frame 1920x1080 software-rendering sample measured median **416.10ms** for
rendering, PNG capture and browser round-trip together. The in-page draw submission
measurement was much smaller (p95 1.24ms), but excludes asynchronous capture costs;
it must not be advertised as real-time rendering performance. No extrapolated
hour-render guarantee is made.

An **8-second 400x502, 12fps MP4** successfully exported and ffprobe verified 96
frames and duration 8.000s. Measured wall time: 16.263s for that specific run.
SHA-256: `40de79d6dc52461db36bb1a22de2f2a9006b5b9bf7df572538ad96f1ed265f2a`.
No audio. This short native-size diagnostic is not a 1080p production animation.
The offline HTML allows the full 120-second study to be explored interactively.

## Failures and negative evidence

Headless WebGL initially failed without an X display; using Xvfb resolved the
ANGLE initialization failure. No file/localhost navigation policy was bypassed:
tests load the embedded HTML directly with Playwright set_content.

Several attempted longer 24fps exports hit container execution deadlines and did
not finish. They are **not delivered as valid clips**. Partials were discarded.
Limiting encoder/decoder threads was tried; it did not establish robust longer
export performance. Only the completed clip above is an export success claim.
An initial per-frame Canvas colour-filter approach was replaced with 65 small,
precomputed tint levels per figure; the retained caches are bounded.

Camera stress intentionally uses a much larger translation than the annotated
study allowance. It reveals foreground stretching and uncovered image borders.
The study is therefore **rejected as the production representation for unrestricted
camera travel**. The camera threshold is a diagnostic heuristic, not a production
unit/measurement. A true 3D stage or newly authored hidden surfaces is needed.

## Visual findings and untested claims

The asset-first route preserves the reference's existing painted detail instead
of asking code to approximate all of it. This does not prove new generated assets
will match it. Material masks allow local movement, but the wind, water and smoke
are intentionally modest study effects, not physically rich finished animation.
The reference's painted flying creature remains baked into the plate; not every
object in the illustration was separated or animated.

The tiny cutout travellers cannot provide convincing full-body action, arbitrary
viewpoints, hand/seat contacts or fighting. Their approximate path and gait are
proxies, not accepted production motion. Night remains a colour grade with lamps,
not correct daylight removal/relighting. The wide crop cuts away important parts
of the original composition; proper 16:9 production requires a new composed master.

No full normal-speed end-to-end watch-through, 60–90s production slice, 1-hour
render, 1-hour runtime soak, real 3D traversal, tavern/market/fight choreography,
rig import, physical contact validation, target-machine GPU test or paid model
cost benchmark was performed. These remain explicit next gates, not delivered
features. The production blueprint addresses them as design, not tested code.
