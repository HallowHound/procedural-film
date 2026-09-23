#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const C = require('./common.cjs');
const World = require('../src/world.js');
const HELP = `Living World (run in the copied foundation or use the absolute script path)
  npm start                         local preview on http://127.0.0.1:8080
  npm run build                     dist/living-world.html; no browser dependency
  npm test                          pure planning, continuity and CLI tests
  npm run check                     pixel determinism, loop and frame-cost checks
  npm run snap -- --times 95,560,770  .frames/ PNGs and an HTML contact sheet
  npm run render -- --from 90 --to 95 --width 1280 --height 720
  npm run render -- --duration 10800 --chunk 120 --resume --audio /absolute/music.mp3

Config overrides: --width N --height N --fps N --duration SECONDS --seed INTEGER
Build/render output: --out PATH (relative paths are relative to the project, not the shell)
Render: --from S --to S --chunk S --resume --crf 18 --preset medium
        --audio PATH [--loop-audio] (without looping, short music is padded with silence)
Check:  --samples 24 [--budget MILLISECONDS] (strict warm p95 drawing budget)
Snap:   --times 0,95,560,770 or --samples 12; --out .frames
Preview: --port 8080
Runtime URL: ?wallpaper=1, ?t=560, ?speed=16, ?loop=1, ?duration=10800
Environment: CHROMIUM, FFMPEG, FFPROBE override executable paths.
`;
function sampleTimes(c, args) {
  if (args.times) {
    const values = args.times.split(',').map(Number);
    if (!values.length || values.some(t => !Number.isFinite(t) || t < 0 || t > c.duration)) throw new Error('--times must contain seconds within the episode');
    return values;
  }
  const count = C.number(args, 'samples', 12, 2, 300, true);
  return Array.from({ length: count }, (_, i) => (c.duration - 1 / c.fps) * i / (count - 1));
}
function build(args) {
  const c = C.config(args), out = C.resolve(args.out || 'dist/living-world.html');
  C.atomic(out, C.html(c)); console.log(`wrote ${out}`); return out;
}
async function snap(args) {
  const c = C.config(args), times = sampleTimes(c, args), folder = C.resolve(args.out || '.frames');
  fs.mkdirSync(folder, { recursive: true });
  const session = await C.openBrowser(c), entries = [];
  try {
    for (let i = 0; i < times.length; i++) {
      const t = times[i], name = `frame-${String(i).padStart(3, '0')}-${t.toFixed(3)}.png`;
      fs.writeFileSync(path.join(folder, name), await C.png(session.page, t));
      entries.push(`<figure><img src="${name}" alt="Frame at ${t.toFixed(3)} seconds"><figcaption>${t.toFixed(3)}s</figcaption></figure>`);
    }
    if (session.errors.length) throw new Error(session.errors.join('\n'));
    C.atomic(path.join(folder, 'index.html'), '<!doctype html><meta charset="utf-8"><title>Living World contact sheet</title><style>body{background:#152128;color:#eee;font:14px system-ui;display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px}figure{margin:0}img{width:100%}</style>' + entries.join('\n'));
    console.log(`wrote ${times.length} frames and ${path.join(folder, 'index.html')}`);
  } finally { await session.browser.close(); }
}
async function check(args) {
  const c = C.config(args), world = World.create(c);
  for (const file of ['src/world.js', 'src/scene.js']) {
    const code = fs.readFileSync(C.resolve(file), 'utf8');
    if (/\bMath\s*\.\s*random\b|\bDate\s*\.|\bperformance\s*\.\s*now\b|\bfetch\s*\(|\bXMLHttpRequest\b/.test(code)) throw new Error(`Impure rendering source: ${file}`);
  }
  const anchors = [0, c.duration - 1 / c.fps, world.plan.cut - c.transition, world.plan.cut, world.plan.fireStart];
  for (const person of world.plan.people) for (const segment of person.job.segments) anchors.push(segment.start, segment.end);
  const times = [...new Set([...sampleTimes(c, { ...args, samples: args.samples || 24 }), ...anchors.flatMap(t => [Math.max(0, t - 1 / c.fps), t, Math.min(c.duration, t + 1 / c.fps)])])].sort((a, b) => a - b);
  const session = await C.openBrowser(c), hashes = new Map(), costs = [];
  try {
    for (const t of times) hashes.set(t, C.digest(await C.png(session.page, t)));
    for (const t of [...times].reverse()) if (C.digest(await C.png(session.page, t)) !== hashes.get(t)) throw new Error(`Warm reverse determinism failed at ${t}s`);
    const fresh = await session.newPage();
    for (const t of [...times].sort((a, b) => World.hash(c.seed, a) - World.hash(c.seed, b))) {
      await C.png(fresh, (t + 71.3) % c.duration);
      if (C.digest(await C.png(fresh, t)) !== hashes.get(t)) throw new Error(`Fresh shuffled determinism failed at ${t}s`);
    }
    await fresh.close();
    for (const t of anchors.slice(0, 5)) {
      const cold = await session.newPage();
      if (C.digest(await C.png(cold, t)) !== hashes.get(t)) throw new Error(`Cold first-frame determinism failed at ${t}s`);
      await cold.close();
    }
    const loop0 = C.digest(await C.png(session.page, 0, true));
    if (loop0 !== C.digest(await C.png(session.page, c.duration - c.transition, true))) throw new Error('Wallpaper loop period is discontinuous');
    for (const t of times) {
      const result = await session.page.evaluate(t => {
        const start = performance.now(); LIVING.renderFrame(t); const ms = performance.now() - start;
        const canvas = document.getElementById('world'), data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
        let lo = 255, hi = 0;
        for (let i = 0; i < data.length; i += 64) { lo = Math.min(lo, data[i]); hi = Math.max(hi, data[i]); }
        return { ms, spread: hi - lo };
      }, t);
      if (result.spread < 8) throw new Error(`Blank or nearly blank frame at ${t}s`);
      costs.push(result.ms);
    }
    costs.sort((a, b) => a - b);
    const p95 = costs[Math.floor((costs.length - 1) * 0.95)], max = costs.at(-1);
    const report = { frames: times.length, determinism: 'warm/reverse/fresh-shuffled/cold anchors', loop: 'exact-period match',
      drawMs: { p50: costs[Math.floor(costs.length / 2)], p95, max }, config: c, browser: session.browser.version(), source: C.sourceHash(c) };
    C.atomic(C.resolve('.cache/check.json'), JSON.stringify(report, null, 2));
    if (session.errors.length) throw new Error(session.errors.join('\n'));
    if (args.budget && p95 > C.number(args, 'budget', 1000 / c.fps, 0.1, 10000)) throw new Error(`Warm p95 ${p95.toFixed(2)}ms exceeds --budget; see .cache/check.json`);
    console.log(`PASS: ${times.length} times; reverse, fresh-shuffled, cold anchors, nonblank frames, wallpaper loop\nDraw only: p95 ${p95.toFixed(2)}ms, max ${max.toFixed(2)}ms. Readback/encoding and host compositor are NOT included.`);
    if (p95 > 1000 / c.fps) console.warn(`WARNING: p95 exceeds the ${c.fps}fps frame budget. Lower resolution/FPS or optimize before shipping as a wallpaper.`);
  } finally { await session.browser.close(); }
}
function preview(args) {
  const port = C.number(args, 'port', 8080, 1024, 65535, true);
  const page = C.html(C.config(args));
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname !== '/' && url.pathname !== '/index.html') { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(page);
  });
  server.on('error', e => { console.error(e.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Preview http://127.0.0.1:${port}/\nWallpaper http://127.0.0.1:${port}/?wallpaper=1\nCtrl-C stops the server. Restart after editing sources.`));
}
async function main(argv = process.argv.slice(2)) {
  const { command, args } = C.parse(argv);
  if (command === 'help' || command === '--help' || args.help) return console.log(HELP);
  if (command === 'build') return build(args);
  if (command === 'preview') return preview(args);
  if (command === 'snap') return snap(args);
  if (command === 'check') return check(args);
  if (command === 'render') return require('./render.cjs').render(args);
  throw new Error(`Unknown command: ${command}`);
}
if (require.main === module) main().catch(e => { console.error(`ERROR: ${e.message}`); process.exitCode = 1; });
module.exports = { main, build, sampleTimes };
