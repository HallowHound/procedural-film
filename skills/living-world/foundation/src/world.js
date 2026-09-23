/* Pure episode planning and time sampling. No wall clock, frame history or IO. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LivingWorld = api;
})(globalThis, function () {
  'use strict';
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const mod = (x, n) => ((x % n) + n) % n;
  const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a)); return u * u * (3 - 2 * u); };
  function hash(...keys) {
    let h = 2166136261;
    for (const c of keys.join(':')) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
    h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;
    return h >>> 0;
  }
  const random = (...keys) => hash(...keys) / 4294967296;
  function freeze(x) {
    if (x && typeof x === 'object' && !Object.isFrozen(x)) {
      Object.values(x).forEach(freeze); Object.freeze(x);
    }
    return x;
  }
  function validate(input) {
    if (!input || typeof input !== 'object') throw new Error('An episode config is required');
    const c = JSON.parse(JSON.stringify(input));
    for (const [k, lo, hi, integer] of [
      ['width', 256, 7680, true], ['height', 144, 4320, true], ['fps', 1, 60, true],
      ['duration', 600, 86400, false], ['seed', 0, 4294967295, true], ['transition', 2, 30, false]
    ]) {
      if (!Number.isFinite(c[k]) || c[k] < lo || c[k] > hi || (integer && !Number.isInteger(c[k]))) {
        throw new Error(`${k} must be ${integer ? 'an integer' : 'a number'} in [${lo}, ${hi}]`);
      }
    }
    if (c.width % 2 || c.height % 2) throw new Error('width and height must be even (video encoder requirement)');
    if (c.version !== 1) throw new Error('Unsupported episode version');
    if (typeof c.title !== 'string' || !c.title.trim() || c.title.length > 160) throw new Error('Invalid title');
    const names = ['sky', 'horizon', 'far', 'mid', 'near', 'ground', 'water', 'path', 'nightSky', 'nightHorizon', 'moon'];
    if (!c.palette || !Array.isArray(c.palette.coats) || c.palette.coats.length !== 3) throw new Error('Three coat colours are required');
    for (const v of [...names.map(k => c.palette[k]), ...c.palette.coats]) {
      if (typeof v !== 'string' || !/^#[0-9a-f]{6}$/i.test(v)) throw new Error('Palette values must be six-digit hex colours');
    }
    return freeze(c);
  }
  const length = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  // Waypoints have x, y and an optional wait AFTER arrival. Speed is not stretched with the episode.
  function track(points, start, speed) {
    if (!Array.isArray(points) || !points.length || !Number.isFinite(start) || !Number.isFinite(speed) || speed <= 0
      || points.some(p => !Array.isArray(p) || !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || (p[2] !== undefined && (!Number.isFinite(p[2]) || p[2] < 0)))) throw new Error('Invalid track');
    let clock = start, distance = 0;
    const segments = [];
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (i) {
        const prev = points[i - 1], d = length(prev, p);
        if (d > 0) {
          segments.push({ start: clock, end: clock + d / speed, from: prev.slice(0, 2), to: p.slice(0, 2), distance, length: d, action: 'walking' });
          clock += d / speed; distance += d;
        }
      }
      if (p[2] > 0) {
        segments.push({ start: clock, end: clock + p[2], from: p.slice(0, 2), to: p.slice(0, 2), distance, length: 0, action: p[3] || 'looking' });
        clock += p[2];
      }
    }
    return { start, end: clock, first: points[0].slice(0, 2), last: points[points.length - 1].slice(0, 2), distance, segments };
  }
  function atTrack(route, t) {
    const s = route.segments.find(s => t >= s.start && t < s.end);
    if (!s) {
      const before = t < route.start, p = before ? route.first : route.last;
      return { x: p[0], y: p[1], distance: before ? 0 : route.distance, moving: false, direction: 1, action: 'resting', edge: 0 };
    }
    const u = clamp((t - s.start) / (s.end - s.start));
    return { x: lerp(s.from[0], s.to[0], u), y: lerp(s.from[1], s.to[1], u), distance: s.distance + s.length * u,
      moving: s.length > 0, direction: s.to[0] < s.from[0] ? -1 : 1, action: s.action,
      edge: Math.min(t - s.start, s.end - t) };
  }
  function create(input) {
    const config = validate(input), D = config.duration, cut = D * 0.44, speed = 8.8;
    const road = [[-100, 682], [480, 682], [1080, 663], [1740, 686]];
    const walkingTime = road.slice(1).reduce((n, p, i) => n + length(road[i], p) / speed, 0);
    const spare = cut - config.transition - 18 - walkingTime;
    if (spare < 0) throw new Error('Episode is too short for the selected transition and route');
    road[1].push(spare * 0.62, 'sheltering'); road[2].push(spare * 0.38, 'looking');
    const valley = track(road, 0, speed);
    const shelter = valley.segments.find(s => s.action === 'sheltering');
    const homes = [[998, 695], [1150, 691], [1230, 701]];
    const destinations = [[1045, 706], [1360, 692], [860, 682]];
    const names = ['Mara', 'Ivo', 'Ren'];
    const people = homes.map((home, i) => {
      const entry = track([[-95 - i * 25, 683], [500, 699], home], cut + i * 2, speed);
      const available = Math.max(0, D - entry.end - 180);
      const start = entry.end + (i === 0 ? 6 : 25 + available * i * 0.07);
      const action = ['tending', 'gathering', 'fetching'][i];
      const target = destinations[i];
      const job = track([home, [target[0], target[1], 12, action], home], start, speed);
      return { id: names[i], colour: config.palette.coats[i], index: i, home, entry, job };
    });
    const tending = people[0].job.segments.find(s => s.action === 'tending');
    const dogEntry = track([[-160, 683], [550, 712], [1180, 721]], cut + 4, 11);
    const plan = freeze({ valley, cut, people, dogEntry,
      fireStart: tending.start + 6,
      rain: shelter && shelter.end - shelter.start > 12 ? [shelter.start + 3, shelter.end - 3] : [0, 0],
      chapters: [{ start: 0, title: 'Across the valley' }, { start: cut, title: 'The lakeside path' },
        { start: tending.start, title: 'Making camp' }, { start: D * 0.78, title: 'Under the stars' }]
    });
    function person(p, t, view) {
      let s, sit = 0, sleep = 0;
      if (view === 'valley') {
        s = atTrack(valley, t - p.index * 6);
        s.x -= p.index * 26;
      } else if (t < p.entry.end) s = atTrack(p.entry, t);
      else {
        s = atTrack(p.job, t);
        s.distance += p.entry.distance;
        const lastArrival = t < p.job.start ? p.entry.end : p.job.end;
        sit = smooth(lastArrival, lastArrival + 2, t);
        if (t < p.job.start) sit *= 1 - smooth(p.job.start - 2, p.job.start, t);
        if (s.moving || ['tending', 'gathering', 'fetching'].includes(s.action)) sit = 0;
        if (!s.moving && s.action === 'resting') s.direction = p.home[0] > 1080 ? -1 : 1;
        sleep = s.action === 'resting' ? smooth(D * 0.88, D * 0.92, t) : 0;
      }
      return { ...s, id: p.id, index: p.index, colour: p.colour, kind: 'person',
        scale: view === 'valley' ? 0.93 : 1.25, sit, sleep,
        bend: ['tending', 'gathering', 'fetching'].includes(s.action) ? smooth(0, 2, s.edge) : 0 };
    }
    function dog(t, view) {
      let s;
      if (view === 'valley') { s = atTrack(valley, t + 4); s.x += 36; s.y += 7; }
      else {
        s = atTrack(dogEntry, t);
        if (t >= dogEntry.end) {
          const slot = Math.floor((t - dogEntry.end) / 95);
          const start = dogEntry.end + slot * 95 + 16;
          const x = 1240 + random(config.seed, 'dog', slot) * 105;
          const outing = track([[1180, 721], [x, 707, 7, 'sniffing'], [1180, 721]], start, 12);
          if (outing.end < D * 0.86) s = atTrack(outing, t);
        }
      }
      return { ...s, id: 'Moss', kind: 'dog', scale: view === 'valley' ? 0.9 : 1.2, sit: 0,
        sleep: view === 'camp' && !s.moving ? smooth(D * 0.86, D * 0.9, t) : 0 };
    }
    function sample(time) {
      if (!Number.isFinite(time)) throw new Error('Time must be finite');
      const t = clamp(time, 0, D), n = smooth(D * 0.48, D * 0.83, t);
      const rain = plan.rain[1] > 0 ? smooth(plan.rain[0], plan.rain[0] + 3, t) * (1 - smooth(plan.rain[1] - 3, plan.rain[1], t)) : 0;
      const mix = smooth(cut - config.transition, cut, t);
      const views = [{ id: 'valley', weight: 1 - mix }, { id: 'camp', weight: mix }]
        .filter(v => v.weight > 0).map(v => ({ ...v, actors: [...people.map(p => person(p, t, v.id)), dog(t, v.id)] }));
      return { t, night: n, rain, wind: 0.45 + 0.3 * Math.sin(t * 0.071) + 0.18 * Math.sin(t * 0.193),
        fire: smooth(plan.fireStart, plan.fireStart + 4, t),
        chapter: plan.chapters.filter(c => c.start <= t).at(-1).title, views };
    }
    return Object.freeze({ config, plan, sample });
  }
  // Dissolve the end into the beginning without a discontinuity at the wallpaper wrap.
  function loopTimes(time, duration, fade) {
    if (![time, duration, fade].every(Number.isFinite) || fade <= 0 || duration <= fade * 2) throw new Error('Invalid loop');
    const t = fade + mod(time, duration - fade);
    return t <= duration - fade ? [{ t, weight: 1 }] : [
      { t, weight: 1 - smooth(duration - fade, duration, t) },
      { t: t - (duration - fade), weight: smooth(duration - fade, duration, t) }
    ];
  }
  return Object.freeze({ clamp, lerp, mod, smooth, hash, random, validate, track, atTrack, create, loopTimes });
});
