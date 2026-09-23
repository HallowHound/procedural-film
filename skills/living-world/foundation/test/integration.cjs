'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../tools/common.cjs');
const { render, probe } = require('../tools/render.cjs');
async function main() {
  const folder = C.resolve(`.cache/integration-${process.pid}`);
  fs.mkdirSync(folder, { recursive: true });
  let work;
  try {
    const live = await C.openBrowser(C.config({ width: 640, height: 360 }), false);
    try {
      await live.page.evaluate(() => {
        LIVING.setPaused(true); LIVING.seek(100);
        wallpaperPropertyListener.setPaused(true);
        wallpaperPropertyListener.setPaused(false);
      });
      assert.equal(await live.page.evaluate(() => LIVING.paused), true, 'Host resume must not override user pause');
      await live.page.evaluate(() => wallpaperPropertyListener.applyGeneralProperties({ fps: 12 }));
      assert.equal(await live.page.evaluate(() => LIVING.fps), 12);
      await live.page.evaluate(() => LIVING.setPaused(false));
      await live.page.waitForTimeout(180);
      assert.ok(await live.page.evaluate(() => LIVING.time > 100));
      await live.page.evaluate(() => wallpaperPropertyListener.setPaused(true));
      const t = await live.page.evaluate(() => LIVING.time);
      await live.page.waitForTimeout(150);
      assert.equal(await live.page.evaluate(() => LIVING.time), t, 'Host pause must freeze time');
      assert.deepEqual(live.errors, []);
      console.log('PASS: user pause, host pause/resume, FPS cap and live clock');
    } finally { await live.browser.close(); }
    const audio = path.join(folder, 'tone.wav');
    await C.child(process.env.FFMPEG || 'ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=0.2', audio]).done;
    const args = { from: '90', to: '91.25', chunk: '0.5', width: '640', height: '360', fps: '12', out: path.join(folder, 'result.mp4') };
    const first = await render(args); work = first.work;
    let manifest = JSON.parse(fs.readFileSync(path.join(work, 'manifest.json'), 'utf8'));
    const files = Object.values(manifest.completed).map(r => path.join(work, r.file));
    assert.deepEqual(Object.values(manifest.completed).map(r => r.frames), [6, 6, 3]);
    const stamps = files.map(f => fs.statSync(f).mtimeMs);
    await render({ ...args, resume: true, audio, 'loop-audio': true });
    assert.deepEqual(files.map(f => fs.statSync(f).mtimeMs), stamps, 'Resume must not re-encode valid chunks');
    const metadata = await probe(args.out);
    assert.equal(Number(metadata.streams.find(s => s.codec_type === 'video').nb_frames), 15);
    assert.ok(metadata.streams.some(s => s.codec_type === 'audio'));
    assert.ok(Math.abs(Number(metadata.format.duration) - 1.25) < 0.1);
    console.log('PASS: nonzero global range, partial last chunk, exact frame count, audio mux, valid cache reuse');
    fs.writeFileSync(files[1], 'deliberately damaged test chunk');
    await render({ ...args, resume: true });
    assert.equal(fs.statSync(files[0]).mtimeMs, stamps[0]);
    assert.equal(fs.statSync(files[2]).mtimeMs, stamps[2]);
    manifest = JSON.parse(fs.readFileSync(path.join(work, 'manifest.json'), 'utf8'));
    const middle = Object.values(manifest.completed)[1];
    assert.equal(await C.hashFile(files[1]), middle.sha256);
    assert.ok((await probe(files[1])).streams.some(s => s.codec_type === 'video'));
    console.log('PASS: corrupt chunk repaired without re-rendering its neighbours');
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
    if (work) fs.rmSync(work, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
