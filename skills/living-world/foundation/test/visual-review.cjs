'use strict';
// Visual evidence and renderer regression checks. Passing this is NOT an art-quality score.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../tools/common.cjs');
async function main() {
  const cfg = C.config(), env = await C.openBrowser(cfg);
  const dir = C.resolve('.frames/art-review'); fs.mkdirSync(dir, { recursive: true });
  const times = [0, 40, 95, 180, 384, 390, 396, 470, 530, 540, 560, 650, 770, 899];
  const hashes = new Map();
  try {
    for (const t of times) {
      const data = await C.png(env.page, t); hashes.set(t, C.digest(data));
      fs.writeFileSync(path.join(dir, `frame-${t}.png`), data);
    }
    for (const t of [...times].reverse()) assert.equal(C.digest(await C.png(env.page, t)), hashes.get(t), `Reverse-order drift at ${t}`);
    const cold = await env.newPage();
    for (const t of [770, 40, 390, 560, 95, 0]) assert.equal(C.digest(await C.png(cold, t)), hashes.get(t), `Fresh-page drift at ${t}`);
    assert.equal(C.digest(await C.png(env.page, 17, true)), C.digest(await C.png(env.page, cfg.duration - cfg.transition + 17, true)), 'Loop-period mismatch');
    // The fixed-size canvas allocations must stop after all view/light plates exist.
    const cacheCheck = await env.page.evaluate(config => {
      const created = [], make = document.createElement;
      document.createElement = function (...args) { const el = make.apply(this, args); if (args[0] === 'canvas') created.push(el); return el; };
      let app;
      try {
        const output = document.createElement('canvas'); app = LivingScene.create(output, config);
        for (const t of [0, 390, 560, 899]) app.renderFrame(t);
        const first = created.length;
        for (let k = 0; k < 80; k++) app.renderFrame(k * config.duration / 80);
        const after = created.length;
        app.destroy(); app = null;
        return { first, after, liveOffscreen: created.filter(c => c !== output && c.width > 0 && c.height > 0).length };
      } finally { if (app) app.destroy(); document.createElement = make; }
    }, { ...cfg, width: 640, height: 360 });
    assert.equal(cacheCheck.after, cacheCheck.first, 'Time-indexed canvas leak');
    assert.equal(cacheCheck.liveOffscreen, 0, 'Offscreen canvases not released');
    const timings = await env.page.evaluate(ts => {
      const values = [];
      for (let k = 0; k < 3; k++) for (const t of ts) {
        const start = performance.now(); LIVING.renderFrame(t); values.push(performance.now() - start);
      }
      return values.sort((a, b) => a - b);
    }, times);
    const report = { times, sameFrameChecks: times.length + 6, loop: 'pass', cacheCheck,
      warmDrawMs: { p50: timings[Math.floor(timings.length * 0.5)], p95: timings[Math.floor(timings.length * 0.95)], max: timings.at(-1) },
      note: 'Warm draw only, excluding compositor/PNG/encoding. Inspect stills and normal-speed clips manually; no quality or real-time guarantee.' };
    const full = await env.newPage();
    await full.evaluate(config => { LIVING.destroy(); window.longReview = LivingScene.create(document.getElementById('world'), { ...config, duration: 10800, width: 640, height: 360 }); }, cfg);
    await full.evaluate(() => { for (const t of [0, 95, 4750, 6000, 8500, 10799]) longReview.renderFrame(t); longReview.destroy(); });
    assert.deepEqual(env.errors, []);
    C.atomic(path.join(dir, 'report.json'), JSON.stringify(report, null, 2));
    C.atomic(path.join(dir, 'index.html'), '<!doctype html><meta charset="utf-8"><title>Art review</title><style>body{background:#192422;color:#eee;font:16px system-ui}img{max-width:100%}figure{margin:30px 0}</style>' +
      times.map(t => `<figure><figcaption>${t}s — inspect at native resolution</figcaption><img src="frame-${t}.png"></figure>`).join(''));
    console.log(JSON.stringify(report, null, 2));
  } finally { await env.browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
