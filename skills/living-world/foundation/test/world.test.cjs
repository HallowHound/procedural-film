'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const W = require('../src/world.js');
const config = require('../src/config.js');
const C = require('../tools/common.cjs');
const { sampleTimes } = require('../tools/cli.cjs');
function finite(value) {
  if (typeof value === 'number') assert.ok(Number.isFinite(value));
  else if (value && typeof value === 'object') Object.values(value).forEach(finite);
}
for (const duration of [600, 900, 10800]) {
  test(`${duration}s: state is deterministic in arbitrary order and config cannot mutate`, () => {
    const input = { ...config, duration }, world = W.create(input);
    const times = [0, 0.5, 95, duration * 0.44, duration * 0.63, duration - 1 / 30, duration];
    const first = new Map(times.map(t => [t, JSON.stringify(world.sample(t))]));
    input.duration = 1;
    for (const t of [...times].reverse()) {
      finite(world.sample(t)); assert.equal(JSON.stringify(world.sample(t)), first.get(t));
    }
    assert.ok(Object.isFrozen(world.plan.people[0].job.segments));
  });
  test(`${duration}s: characters have stable identities and weights tile the episode`, () => {
    const world = W.create({ ...config, duration });
    for (let i = 0; i <= 200; i++) {
      const s = world.sample(duration * i / 200);
      assert.ok(Math.abs(s.views.reduce((a, v) => a + v.weight, 0) - 1) < 1e-10);
      for (const v of s.views) assert.deepEqual(v.actors.map(a => a.id), ['Mara', 'Ivo', 'Ren', 'Moss']);
      finite(s);
    }
  });
  test(`${duration}s: every movement/job joins without a position jump`, () => {
    const world = W.create({ ...config, duration }), epsilon = 0.0001;
    for (const p of world.plan.people) {
      assert.ok(p.job.end < duration);
      for (const t of [p.entry.end, ...p.job.segments.flatMap(s => [s.start, s.end])]) {
        const get = at => world.sample(at).views.find(v => v.id === 'camp').actors.find(a => a.id === p.id);
        const a = get(t - epsilon), b = get(t + epsilon);
        assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 0.01, `${p.id} jumps at ${t}`);
      }
    }
  });
  test(`${duration}s: walkers clear the screen before the vista dissolve`, () => {
    const world = W.create({ ...config, duration });
    const s = world.sample(world.plan.cut - config.transition - 0.01);
    for (const a of s.views[0].actors) assert.ok(a.x > 1600, `${a.id} still visible at the transition`);
  });
}
test('longer duration adds dwell, not slower locomotion', () => {
  const a = W.create(config), b = W.create({ ...config, duration: 10800 });
  for (const w of [a, b]) for (const s of w.plan.valley.segments.filter(s => s.length > 0)) assert.ok(Math.abs(s.length / (s.end - s.start) - 8.8) < 1e-9);
  assert.ok(b.plan.rain[1] - b.plan.rain[0] > a.plan.rain[1] - a.plan.rain[0]);
});
test('loop clock is periodic and smoothly hands off to its beginning', () => {
  for (const t of [0, 123, 876, 887.999, 888, 2000]) {
    const a = W.loopTimes(t, 900, 12), b = W.loopTimes(t + 888, 900, 12);
    assert.deepEqual(a, b);
    assert.ok(Math.abs(a.reduce((n, x) => n + x.weight, 0) - 1) < 1e-10);
  }
  const before = W.loopTimes(888 - 0.0001, 900, 12).at(-1);
  assert.ok(Math.abs(before.t - 12) < 0.001 && before.weight > 0.9999);
});
test('seeded randomness is stable and changes with the seed', () => {
  assert.equal(W.hash(14, 'x', 2), W.hash(14, 'x', 2));
  assert.notEqual(W.hash(14, 'x', 2), W.hash(15, 'x', 2));
  for (let i = 0; i < 1000; i++) assert.ok(W.random(i) >= 0 && W.random(i) < 1);
});
for (const patch of [{ duration: 10 }, { duration: Infinity }, { fps: 0 }, { fps: 29.97 }, { width: 1919 }, { seed: -1 }, { transition: 0 }, { version: 2 }, { palette: {} }]) {
  test(`reject malformed config ${JSON.stringify(patch)}`, () => assert.throws(() => W.validate({ ...config, ...patch })));
}
test('invalid sample times and loop parameters fail explicitly', () => {
  const w = W.create(config);
  assert.throws(() => w.sample(NaN)); assert.throws(() => w.sample(Infinity));
  assert.throws(() => W.loopTimes(0, 5, 3));
  assert.equal(w.sample(-1).t, 0); assert.equal(w.sample(9999).t, 900);
});
test('frame chunks tile nonzero, non-divisible ranges exactly', () => {
  assert.deepEqual(C.ranges(7, 20, 5), [{ from: 7, to: 12 }, { from: 12, to: 17 }, { from: 17, to: 20 }]);
  assert.equal(C.ranges(0, 324000, 3600).length, 90);
  for (const values of [[0, 0, 2], [-1, 5, 2], [0, 5, 0], [0.2, 5, 2]]) assert.throws(() => C.ranges(...values));
});
test('CLI validates unknown/missing/repeated arguments and numerical values', () => {
  assert.deepEqual(C.parse(['render', '--duration', '10800', '--resume']).args, { duration: '10800', resume: true });
  for (const args of [['render', '--oops'], ['render', '--fps'], ['render', '--fps', '24', '--fps', '30']]) assert.throws(() => C.parse(args));
  assert.throws(() => C.config({ fps: 'oops' })); assert.throws(() => sampleTimes(config, { times: 'NaN' }));
});
test('standalone build inlines all runtime scripts without network dependencies', () => {
  const html = C.html(config);
  assert.ok(html.includes('window.LIVING_OVERRIDE='));
  assert.ok(!/<script src=/.test(html));
  assert.ok(!/https?:\/\//.test(html));
  assert.equal(C.sourceHash(config), C.sourceHash(config));
  assert.notEqual(C.sourceHash(config), C.sourceHash({ ...config, seed: 8 }));
});
