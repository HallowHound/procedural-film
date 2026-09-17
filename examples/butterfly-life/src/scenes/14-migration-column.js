// 14 migration-column : The column heads south-west.
// Late-summer monarchs stream in a loose column from the top right, small and far, down to the lower
// left, large and near, over three hatched ridges and a fir-mountain silhouette. A low sun sits on the
// G7 sun-path arc; a blue line and arc annotation mark the sun angle the lead female steers by.
// Waves of new butterflies enter on the beats (T 27.0, 27.5). The camera tilts the scene up 80 px.
// Far butterflies are plan views turned along the stream; near ones fly level toward the viewer, and most
// of the nearest pass beside the camera through the frame sides.
(function () {
  'use strict';

  const ID = 'migration-column';
  const LIB = FILM.lib;
  const TAU = Math.PI * 2;
  const P = {};
  for (const k of Object.keys(LIB.pal)) P[k] = LIB.pal[k];

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
  const sstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const sd = (...k) => LIB.hash(ID, ...k) & 0x7fffffff;

  const TILT = 80; // world drifts up 80 px over the shot
  const BEATS = [0, 0.5, 1.0]; // local beat times (T 26.5, 27.0, 27.5)

  function makeCanvas(w, h) {
    if (FILM.makeCanvas) return FILM.makeCanvas(w, h);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }

  function nearestIdx(loop, p) {
    let bi = 0, bd = Infinity;
    for (let i = 0; i < loop.length; i++) {
      const dx = loop[i][0] - p[0], dy = loop[i][1] - p[1];
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        bi = i;
      }
    }
    return bi;
  }

  function trace(g, pts, closed = true) {
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) g.moveTo(pts[i][0], pts[i][1]);
      else g.lineTo(pts[i][0], pts[i][1]);
    }
    if (closed) g.closePath();
  }

  // ===========================================================================
  // Monarch wing geometry (the G5 drawing, right side, in G5 frame pixels; span 920)
  // ===========================================================================

  const FORE = {
    margin: [
      [552, 872], [600, 846], [690, 797], [790, 741], [890, 685], [952, 651], [986, 636], [1003, 641],
      [1009, 660], [1003, 702], [980, 770], [945, 843], [901, 918], [853, 976], [808, 1005], [781, 1011],
      [758, 1007], [700, 988], [640, 962], [588, 935], [557, 919],
    ],
    cell: [[570, 893], [640, 873], [720, 846], [800, 815], [797, 844], [790, 872], [740, 884], [660, 896], [584, 906]],
    veins: [
      { n: 'R1', o: [700, 838], e: [822, 723], w0: 11, bow: 3 },
      { n: 'R2', o: [748, 826], e: [882, 690], w0: 11, bow: 4 },
      { n: 'R3', o: [780, 820], e: [940, 657], w0: 10, bow: 5 },
      { n: 'R4', o: [800, 815], e: [990, 637], w0: 10, bow: 6 },
      { n: 'R5', o: [799, 830], e: [1008, 690], w0: 10, bow: 6 },
      { n: 'M1', o: [797, 844], e: [985, 762], w0: 10, bow: 5 },
      { n: 'M2', o: [794, 858], e: [950, 836], w0: 10, bow: 4 },
      { n: 'M3', o: [790, 872], e: [905, 912], w0: 11, bow: 2 },
      { n: 'Cu1', o: [745, 884], e: [855, 975], w0: 12, bow: -3 },
      { n: 'Cu2', o: [680, 895], e: [792, 1010], w0: 14, bow: -6 },
      { n: '2A', o: [600, 905], e: [742, 1003], w0: 15, bow: -5 },
    ],
    marks: { apex: [1003, 641], tornus: [781, 1011] },
  };

  const HIND = {
    margin: [
      [556, 930], [620, 936], [700, 958], [770, 990], [815, 1025], [842, 1072], [852, 1120], [850, 1150],
      [838, 1182], [806, 1212], [752, 1236], [690, 1246], [632, 1240], [590, 1226], [560, 1210], [551, 1170],
      [549, 1100], [551, 1020], [553, 960],
    ],
    cell: [[570, 948], [640, 968], [700, 994], [735, 1016], [729, 1046], [714, 1076], [665, 1062], [610, 1034], [574, 998]],
    veins: [
      { n: 'Sc', o: [625, 962], e: [812, 1022], w0: 12, bow: 6 },
      { n: 'Rs', o: [735, 1016], e: [846, 1085], w0: 11, bow: 4 },
      { n: 'M1', o: [732, 1032], e: [852, 1142], w0: 11, bow: 3 },
      { n: 'M2', o: [727, 1052], e: [828, 1192], w0: 11, bow: 2 },
      { n: 'M3', o: [714, 1076], e: [768, 1232], w0: 11, bow: 0 },
      { n: 'Cu1', o: [690, 1070], e: [700, 1246], w0: 12, bow: -2 },
      { n: 'Cu2', o: [650, 1054], e: [632, 1240], w0: 13, bow: -4 },
      { n: '1A', o: [592, 1018], e: [585, 1224], w0: 15, bow: -3 },
    ],
    marks: { costaEnd: [815, 1025], inner: [560, 1210] },
  };

  function buildWing(def, isFore) {
    const margin = LIB.smoothPts(def.margin, true, 5);
    const cell = LIB.smoothPts(def.cell, true, 5);
    const n = margin.length;
    const veins = def.veins.map((v) => {
      const o = cell[nearestIdx(cell, v.o)];
      const ei = nearestIdx(margin, v.e);
      const e = margin[ei];
      const dx = e[0] - o[0], dy = e[1] - o[1];
      const len = Math.hypot(dx, dy) || 1;
      const mid = [(o[0] + e[0]) / 2 - (dy / len) * v.bow, (o[1] + e[1]) / 2 + (dx / len) * v.bow];
      return { n: v.n, ei, o, e, pts: LIB.smoothPts([o, mid, e], false, 8), w0: v.w0 };
    });
    const byName = {};
    for (const v of veins) byName[v.n] = v;
    // border band between the margin and an inner line that bulges inward at vein ends
    let wAt;
    if (isFore) {
      const ia = nearestIdx(margin, def.marks.apex), it = nearestIdx(margin, def.marks.tornus);
      wAt = (i) => (i <= ia ? lerp(9, 30, Math.pow(i / ia, 1.6)) : i <= it ? 36 : lerp(30, 9, Math.pow((i - it) / (n - it), 0.7)));
    } else {
      const ic = nearestIdx(margin, def.marks.costaEnd), ii = nearestIdx(margin, def.marks.inner);
      wAt = (i) => (i <= ic ? lerp(12, 34, sstep(0.55, 1, i / ic)) : i <= ii ? 36 : lerp(28, 10, Math.pow((i - ii) / (n - ii), 0.6)));
    }
    const inner = [];
    for (let i = 0; i < n; i++) {
      const a = margin[(i - 2 + n) % n], b = margin[(i + 2) % n];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      let w = wAt(i);
      for (const v of veins) {
        const d = Math.min(Math.abs(i - v.ei), n - Math.abs(i - v.ei)) * 5;
        w += 9 * Math.exp(-(d * d) / 170) * (w > 20 ? 1 : 0.4);
      }
      inner.push([margin[i][0] - ty * w, margin[i][1] + tx * w]);
    }
    const band = margin.concat([margin[0]], [inner[0]], inner.slice().reverse());
    // white spots: two rows between vein ends
    const spots = [];
    const r = LIB.rng(sd('spots', isFore ? 1 : 2));
    const outerVeins = isFore ? ['R5', 'M1', 'M2', 'M3', 'Cu1', 'Cu2'] : ['Sc', 'Rs', 'M1', 'M2', 'M3', 'Cu1', 'Cu2', '1A'];
    const ends = outerVeins.map((k) => byName[k].ei);
    if (isFore) ends.unshift(nearestIdx(margin, def.marks.apex));
    else ends.push(nearestIdx(margin, def.marks.inner));
    const spotAt = (fi, inset, rad, row) => {
      const i = Math.round(fi);
      const p = margin[i], q = inner[i];
      const dx = q[0] - p[0], dy = q[1] - p[1];
      const dl = Math.hypot(dx, dy) || 1;
      spots.push({ x: p[0] + (dx / dl) * inset, y: p[1] + (dy / dl) * inset, r: rad, row });
    };
    for (let k = 0; k < ends.length - 1; k++) {
      const i0 = ends[k], i1 = ends[k + 1];
      const span = i1 - i0;
      if (span < 4) continue;
      spotAt(i0 + span * 0.5, 25, r.range(5.6, 6.6), 0);
      spotAt(i0 + span * 0.28, 10, r.range(3.8, 4.4), 1);
      spotAt(i0 + span * 0.72, 10, r.range(3.8, 4.4), 1);
    }
    const apexSpots = [];
    let apexPatch = null;
    if (isFore) {
      const on = (name, u) => {
        const V = byName[name];
        return V.pts[Math.round((V.pts.length - 1) * u)];
      };
      const between = (a, b, u, rad, color) => {
        const pa = on(a, u), pb = on(b, u);
        apexSpots.push({ x: (pa[0] + pb[0]) / 2, y: (pa[1] + pb[1]) / 2, r: rad, color });
      };
      between('R1', 'R2', 0.86, 7, 'w');
      between('R2', 'R3', 0.86, 8, 'w');
      between('R3', 'R4', 0.84, 8, 'w');
      between('R4', 'R5', 0.82, 8, 'w');
      between('R5', 'M1', 0.78, 7, 'w');
      between('R3', 'R4', 0.6, 10, 'o');
      between('R4', 'R5', 0.58, 12, 'o');
      between('R5', 'M1', 0.56, 12, 'o');
      const mid = (a, b, u) => {
        const p = on(a, u), q = on(b, u);
        return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      };
      apexPatch = LIB.smoothPts(
        [on('R1', 0.62), mid('R1', 'R2', 0.72), on('R2', 0.36), mid('R2', 'R3', 0.46), on('R3', 0.26), mid('R3', 'R4', 0.42), on('R4', 0.2),
          mid('R4', 'R5', 0.4), on('R5', 0.22), mid('R5', 'M1', 0.42), on('M1', 0.3), mid('M1', 'M2', 0.62), on('M2', 0.72)],
        false,
        6
      ).concat([[1070, 870], [1070, 560], [760, 600]]);
    }
    // male scent patch: on Cu2 of the hindwing
    const scent = !isFore ? (() => {
      const V = byName.Cu2;
      const p = V.pts[Math.round((V.pts.length - 1) * 0.42)];
      return { x: p[0] + 4, y: p[1], r: 13 };
    })() : null;
    return { margin, cell, veins, band, spots, apexSpots, apexPatch, scent, isFore };
  }

  const WINGS = { fore: buildWing(FORE, true), hind: buildWing(HIND, false) };

  // ===========================================================================
  // Monarch sprite: dorsal view, head toward -y, thorax at the origin, wingspan = span
  // detail 0 silhouette, 1 veins and border, 2 plus spots, 3 plus hatching and ink outlines, 4 lead
  // ===========================================================================

  const FX = [1, 0.6, 0.5]; // wing foreshortening per flap pose (open, mid, raised)
  const POSE_SHADE = [0, 0.06, 0.06];

  function drawMonarch(g, span, pose, sex, variant, detail, showUnder) {
    const k = span / 920;
    const fx = FX[pose];
    const female = sex === 0;
    const seed = sd('spr', detail, pose, sex);
    const mapper = (mirror) => (p) => {
      const dx = p[0] - 540;
      const ds = dx <= 12 ? dx : 12 + (dx - 12) * fx;
      return [(mirror ? -ds : ds) * k, (p[1] - 900) * k];
    };
    for (const kind of ['hind', 'fore']) {
      for (const mirror of [false, true]) {
        // far upstroke (above the horizon) may show an underside; near butterflies stay dorsal
        const under = !!showUnder && pose === 2 && mirror;
        drawWing(g, WINGS[kind], mapper(mirror), k, fx, pose, female, variant, detail, seed + (kind === 'fore' ? 100 : 200) + (mirror ? 7 : 0), span, under);
      }
    }
    drawBody(g, k, span, variant, detail, seed + 500);
  }

  function drawWing(g, W, M, k, fx, pose, female, variant, detail, seed, span, under) {
    const margin = W.margin.map(M);
    const veinK = (female ? 1.3 : 0.95) * (detail >= 4 ? 0.85 : 1);
    // base colour
    g.beginPath();
    trace(g, margin);
    g.fillStyle = under && !W.isFore ? P.monarchUnder : under ? LIB.mix(P.monarch, P.monarchUnder, 0.3) : P.monarch;
    g.fill();
    g.save();
    g.beginPath();
    trace(g, margin);
    g.clip();
    if (detail >= 3) {
      // orange hatching darker near the body and on the trailing (lower right) half
      const bx = 0, by = 0;
      LIB.hatch(g, margin, {
        spacing: detail >= 4 ? 3.4 : 3.0,
        width: detail >= 4 ? 1.0 : 0.8,
        color: P.monarchDeep,
        alpha: 0.85,
        length: detail >= 4 ? [6, 18] : [4, 12],
        gap: [1, 4],
        boil: variant,
        seed: seed + 1,
        inset: 1,
        overshoot: 1,
        density: (x, y) => {
          const dBody = Math.hypot(x - bx, (y - by) * 0.8) / (span * 0.5);
          // sprites are drawn turned about 200 degrees, so the head side ends up lowest: shade toward it
          return clamp(0.7 - dBody * 1.25) + 0.22 * sstep(0.02, 0.3, -y / span);
        },
      });
    } else if (detail === 2) {
      const bx = 0, by = 0;
      LIB.hatch(g, margin, {
        spacing: 4,
        width: 0.9,
        color: P.monarchDeep,
        alpha: 0.7,
        length: [3, 9],
        boil: variant,
        seed: seed + 1,
        inset: 1,
        overshoot: 1,
        density: (x, y) => {
          const dBody = Math.hypot(x - bx, (y - by) * 0.8) / (span * 0.5);
          return clamp(0.55 - dBody * 1.4);
        },
      });
    }
    // discal cell outline and veins
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.strokeStyle = P.veinBlack;
    const minW = detail === 0 ? 0 : 0.55;
    if (detail >= 1) {
      const cell = W.cell.map(M);
      g.beginPath();
      trace(g, cell);
      g.lineWidth = Math.max(minW, 9 * k * veinK);
      g.stroke();
      for (const v of W.veins) {
        const pts = v.pts.map(M);
        const w = Math.max(minW, v.w0 * k * veinK * (detail <= 1 ? 1.25 : 1));
        const n = pts.length;
        const cut = Math.max(2, Math.floor(n * 0.55));
        g.beginPath();
        trace(g, pts.slice(0, cut), false);
        g.lineWidth = w;
        g.stroke();
        g.beginPath();
        trace(g, pts.slice(cut - 1), false);
        g.lineWidth = w * 0.75;
        g.stroke();
      }
    } else {
      // silhouette: three bold vein streaks
      g.lineWidth = Math.max(0.6, 26 * k);
      for (const idx of [2, 7, 9]) {
        const v = W.veins[Math.min(idx, W.veins.length - 1)];
        const pts = v.pts.map(M);
        g.beginPath();
        trace(g, pts, false);
        g.stroke();
      }
    }
    // wing base darkening near the body
    if (detail >= 2) {
      const b = M([552, W.isFore ? 900 : 1000]);
      g.beginPath();
      g.ellipse(b[0], b[1], Math.max(1, 38 * k * Math.max(0.4, fx)), 60 * k, 0, 0, TAU);
      g.fillStyle = P.veinBlack;
      g.globalAlpha = 0.55;
      g.fill();
      g.globalAlpha = 1;
    }
    // apex patch (on the underside the tip is yellow-brown, its veins still black)
    if (W.apexPatch) {
      g.beginPath();
      trace(g, W.apexPatch.map(M));
      g.fillStyle = under ? P.monarchUnder : P.veinBlack;
      g.fill();
      if (under && detail >= 1) {
        g.strokeStyle = P.veinBlack;
        for (const v of W.veins) {
          if (v.n[0] !== 'R' && v.n !== 'M1') continue;
          const pts = v.pts.map(M);
          g.beginPath();
          trace(g, pts.slice(Math.floor(pts.length * 0.35)), false);
          g.lineWidth = Math.max(0.55, v.w0 * k * veinK * 0.8);
          g.stroke();
        }
      }
    }
    // border band
    g.beginPath();
    trace(g, W.band.map(M));
    g.fillStyle = P.veinBlack;
    g.fill('evenodd');
    // spots
    if (under && !W.isFore && detail >= 3) {
      // underside hindwing veins carry a pale edging
      g.strokeStyle = P.spotWhite;
      g.globalAlpha = 0.4;
      for (const v of W.veins) {
        const pts = v.pts.map(M);
        g.beginPath();
        trace(g, pts.slice(1, Math.floor(pts.length * 0.8)), false);
        g.lineWidth = Math.max(0.5, v.w0 * k * veinK * 1.7);
        g.stroke();
      }
      g.globalAlpha = 1;
      g.strokeStyle = P.veinBlack;
      for (const v of W.veins) {
        const pts = v.pts.map(M);
        g.beginPath();
        trace(g, pts, false);
        g.lineWidth = Math.max(0.55, v.w0 * k * veinK * 0.9);
        g.stroke();
      }
    }
    if (detail >= 2 && fx > 0.3) {
      const ss = (detail === 2 ? 1.55 : detail === 3 ? 1.25 : 1.05) * (under ? 1.4 : 1);
      g.fillStyle = P.spotWhite;
      g.beginPath();
      for (const q of W.spots) {
        if (detail === 2 && q.row === 1) continue;
        const c = M([q.x, q.y]);
        const rr = Math.max(0.55, q.r * k * ss);
        g.moveTo(c[0] + rr * Math.max(0.5, fx), c[1]);
        g.ellipse(c[0], c[1], rr * Math.max(0.5, fx), rr, 0, 0, TAU);
      }
      for (const q of W.apexSpots) {
        if (q.color !== 'w') continue;
        const c = M([q.x, q.y]);
        const rr = Math.max(0.6, q.r * k * ss);
        g.moveTo(c[0] + rr * Math.max(0.5, fx), c[1]);
        g.ellipse(c[0], c[1], rr * Math.max(0.5, fx), rr, 0, 0, TAU);
      }
      g.fill();
      g.fillStyle = P.monarch;
      g.beginPath();
      for (const q of W.apexSpots) {
        if (q.color !== 'o') continue;
        const c = M([q.x, q.y]);
        const rr = Math.max(0.6, q.r * k * ss);
        g.moveTo(c[0] + rr * Math.max(0.5, fx), c[1]);
        g.ellipse(c[0], c[1], rr * Math.max(0.5, fx), rr * 1.3, 0, 0, TAU);
      }
      g.fill();
    }
    if (!female && !under && W.scent && detail >= 2 && fx > 0.3) {
      const c = M([W.scent.x, W.scent.y]);
      g.beginPath();
      g.ellipse(c[0], c[1], W.scent.r * k * fx * 1.2, W.scent.r * k * 0.9, 0, 0, TAU);
      g.fillStyle = P.veinBlack;
      g.fill();
    }
    // turning away from the light as the wing rises
    if (POSE_SHADE[pose] > 0) {
      g.beginPath();
      trace(g, margin);
      g.globalAlpha = POSE_SHADE[pose];
      g.fillStyle = P.veinBlack;
      g.fill();
      g.globalAlpha = 1;
    }
    g.restore();
    // outline
    if (detail >= 3) {
      LIB.inkPath(g, margin, {
        closed: true,
        width: detail >= 4 ? 3.2 : 3.0,
        double: detail >= 4 ? { offset: 3, width: 0.35, alpha: 0.4 } : { offset: 3, width: 0.8, alpha: 0.4 },
        color: P.ink,
        seed: seed + 3,
        boil: variant,
        wobble: 0.5,
        tremble: 0.15,
        boilAmp: 0.35,
        taper: [4, 10],
      });
    } else if (detail >= 1) {
      LIB.inkPath(g, margin, {
        closed: true,
        width: detail === 2 ? 1.8 : 1.2,
        color: P.ink,
        seed: seed + 3,
        boil: variant,
        wobble: 0.4,
        taper: [2, 5],
      });
    } else {
      g.beginPath();
      trace(g, margin);
      g.lineWidth = Math.max(0.9, 30 * k);
      g.strokeStyle = P.veinBlack;
      g.stroke();
    }
  }

  function drawBody(g, k, span, variant, detail, seed) {
    g.fillStyle = P.veinBlack;
    g.strokeStyle = P.veinBlack;
    g.lineCap = 'round';
    // antennae with clubs
    if (detail >= 1) {
      g.lineWidth = Math.max(0.5, 5 * k);
      for (const s of [-1, 1]) {
        g.beginPath();
        g.moveTo(s * 8 * k, -95 * k);
        g.quadraticCurveTo(s * 30 * k, -170 * k, s * 70 * k, -232 * k);
        g.stroke();
        g.beginPath();
        g.ellipse(s * 72 * k, -238 * k, Math.max(0.7, 8 * k), Math.max(1, 15 * k), s * 0.35, 0, TAU);
        g.fill();
      }
    }
    // abdomen, thorax, head
    g.beginPath();
    g.ellipse(0, 108 * k, Math.max(0.8, 24 * k), 104 * k, 0, 0, TAU);
    g.fill();
    g.beginPath();
    g.ellipse(0, 4 * k, Math.max(1, 34 * k), 50 * k, 0, 0, TAU);
    g.fill();
    g.beginPath();
    g.arc(0, -70 * k, Math.max(0.9, 30 * k), 0, TAU);
    g.fill();
    if (detail >= 3) {
      // eyes, white dots on head and thorax, abdomen rings
      g.fillStyle = P.inkSoft;
      for (const s of [-1, 1]) {
        g.beginPath();
        g.arc(s * 18 * k, -76 * k, 12 * k, 0, TAU);
        g.fill();
      }
      g.fillStyle = P.spotWhite;
      g.beginPath();
      const dots = [[-10, -95, 4], [10, -95, 4], [-20, -20, 5], [20, -20, 5], [-24, 10, 4], [24, 10, 4], [0, -40, 4], [-14, 40, 3.5], [14, 40, 3.5]];
      for (const [x, y, r] of dots) {
        const rr = Math.max(0.5, r * k * 1.3);
        g.moveTo(x * k + rr, y * k);
        g.arc(x * k, y * k, rr, 0, TAU);
      }
      g.fill();
      g.strokeStyle = P.inkSoft;
      g.lineWidth = Math.max(0.5, 3 * k);
      g.beginPath();
      for (let i = 1; i < 7; i++) {
        const y = (60 + i * 22) * k;
        const hw = 22 * k * Math.sqrt(Math.max(0, 1 - Math.pow((y / k - 108) / 104, 2)));
        g.moveTo(-hw, y);
        g.quadraticCurveTo(0, y + 4 * k, hw, y);
      }
      g.stroke();
    }
    if (detail >= 4) {
      LIB.inkPath(g, LIB.ellipsePts(0, 108 * k, 24 * k + 1, 104 * k + 1, 28), { closed: true, width: 1.4, color: P.ink, seed: seed + 1, boil: variant, wobble: 0.3, tremble: 0.1 });
    }
  }

  // sprite classes by wingspan
  const CLASSES = [
    { span: 20, detail: 0, variants: 1 },
    { span: 38, detail: 1, variants: 1 },
    { span: 74, detail: 2, variants: 2 },
    { span: 140, detail: 3, variants: 2 },
  ];
  const LEAD_CLASS = { span: 230, detail: 4, variants: 3 };

  const SPRITES = new Map();
  function sprite(cls, pose, sex, variant, S, under) {
    const key = cls.span + '|' + pose + '|' + sex + '|' + variant + '|' + S + '|' + (under ? 1 : 0);
    let s = SPRITES.get(key);
    if (s) return s;
    const box = Math.ceil(cls.span * 1.16);
    const px = Math.ceil(box * S);
    const c = makeCanvas(px, px);
    const g = c.getContext('2d');
    g.scale(px / box, px / box);
    g.translate(box / 2, box / 2 - cls.span * 0.03);
    drawMonarch(g, cls.span, pose, sex, variant, cls.detail, under);
    s = { c, box, oy: cls.span * 0.03 };
    SPRITES.set(key, s);
    return s;
  }

  function classFor(size) {
    for (const c of CLASSES) if (c.span >= size * 0.92) return c;
    return CLASSES[CLASSES.length - 1];
  }

  // ===========================================================================
  // The column: a centre path in world coordinates (the frame at t = 0)
  // ===========================================================================

  const PATH_CTRL = [[880, -330], [830, -40], [770, 280], [660, 600], [520, 870], [410, 1120], [330, 1400], [250, 1720], [170, 2060]];
  const PATH = (() => {
    const pts = LIB.smoothPts(PATH_CTRL, false, 4);
    const len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const i0 = nearestIdx(pts, [830, -40]);
    const i1 = nearestIdx(pts, [250, 1720]);
    return { pts, len, L0: len[i0], L1: len[i1] - len[i0], total: len[len.length - 1] };
  })();

  // s = 0 at the top entry (846, -40), s = 1 at the lower-left exit (40, 1720)
  function pathAt(s) {
    let d = PATH.L0 + s * PATH.L1;
    const { pts, len } = PATH;
    d = clamp(d, 0, PATH.total - 0.001);
    let lo = 0, hi = len.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (len[m] <= d) lo = m;
      else hi = m;
    }
    const u = (d - len[lo]) / (len[hi] - len[lo] || 1);
    const a = pts[lo], b = pts[hi];
    const tx = b[0] - a[0], ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1;
    return { x: lerp(a[0], b[0], u), y: lerp(a[1], b[1], u), tx: tx / tl, ty: ty / tl };
  }

  // perspective: size grows exponentially along the column, speed grows with size
  const SZ0 = 11, SZ1 = 140;
  const A = Math.log(SZ1 / SZ0);
  const sizeAt = (s) => SZ0 * Math.exp(A * s);
  const S_MID = 0.5;
  const V_MID = 160; // px per second at mid column: 40 px per 8th note
  // screen speed grows more slowly than size (B < A) so the near column does not empty out
  const B = 0.62 * A;
  const C_RATE = V_MID / (PATH.L1 * Math.exp(B * S_MID)); // ds/dt = C_RATE * e^(B s)
  const W_RATE = B * C_RATE; // w = e^(-B s) falls linearly: dw/dt = -W_RATE, so uniform w is a steady stream
  // the column fans out as it nears the viewer, so the outer near butterflies leave through the frame sides
  const halfWidthAt = (s) => Math.min(480, 14 + 2.5 * sizeAt(s) * (1 + 1.3 * sstep(0.5, 1.1, s)));
  const NEAR_MAX = 145; // storyboard: near butterflies 90 to 140 px

  const CROWD = (() => {
    const r = LIB.rng(sd('crowd'));
    const wLo = Math.exp(-B * 1.14);
    const wTop = Math.exp(-B * -0.04);
    const wHi = wTop + W_RATE * 1.6 * 1.3;
    const visible = 1 - Math.exp(-B);
    const N = Math.round((236 * (wHi - wLo)) / visible);
    // loose groups: about half the column flies in small bunches
    const groups = [];
    for (let i = 0; i < 34; i++) groups.push({ w: wLo + (wHi - wLo) * r(), lat: clamp(r.gauss() * 0.5, -0.9, 0.9) });
    const list = [];
    for (let i = 0; i < N; i++) {
      let w0 = wLo + ((wHi - wLo) * (i + r())) / N;
      let g = clamp(r.gauss() * 0.5, -1.15, 1.15);
      if (r() < 0.5) {
        let best = groups[0];
        for (const q of groups) if (Math.abs(q.w - w0) < Math.abs(best.w - w0)) best = q;
        w0 = lerp(w0, best.w, 0.3);
        g = lerp(g, best.lat, 0.45);
      }
      list.push({
        id: i,
        w0,
        lat: g,
        j: r.range(0.8, 1.22),
        szj: r.range(0.82, 1.16),
        ph: r.int(0, 3),
        glideSeed: r.int(0, 1e6),
        bob: r.range(0, TAU),
        bobF: r.range(1.2, 2.2),
        head: r.range(-0.22, 0.22),
        sex: r() < 0.5 ? 0 : 1,
        wave: -1,
      });
    }
    return list;
  })();

  // two waves of small butterflies that break in at the top edge on the beats
  const camYAt = (t, dur) => TILT * clamp(t / dur);
  function sAtWorldY(y) {
    let lo = -0.3, hi = 0.4;
    for (let i = 0; i < 30; i++) {
      const m = (lo + hi) / 2;
      if (pathAt(m).y < y) lo = m;
      else hi = m;
    }
    return (lo + hi) / 2;
  }
  // each wave bursts in where the column crosses screen y 300, inside the safe area below the top bar
  const WAVE_Y = 300;
  const waveS = (tb) => sAtWorldY(camYAt(tb, 1.5) + WAVE_Y);
  const WAVES = (() => {
    const out = [];
    for (const [wi, tb] of [[0, 0.5], [1, 1.0]]) {
      const r = LIB.rng(sd('wave', wi));
      const sSpawn = waveS(tb);
      for (let i = 0; i < 28; i++) {
        const lat = clamp(r.gauss() * 1.3, -2.4, 2.4);
        out.push({
          id: 1000 + wi * 100 + i,
          tb,
          wEdge: Math.exp(-B * (sSpawn + r.range(-0.035, 0.035))),
          lat,
          j: r.range(0.9, 1.25),
          szj: r.range(16, 24) / sizeAt(sSpawn),
          ph: r.int(0, 3),
          glideSeed: r.int(0, 1e6),
          bob: r.range(0, TAU),
          bobF: r.range(1.4, 2.4),
          head: r.range(-0.25, 0.25),
          sex: r() < 0.5 ? 0 : 1,
          // outward rush across the stream over the first 6 frames
          rushX: r.range(60, 120) * (lat < 0 ? -1 : 1),
          wave: wi,
        });
      }
    }
    return out;
  })();

  // stragglers: loose butterflies in the upper stream that peel 60 to 200 px off the column and drift back
  const STRAGGLERS = (() => {
    const r = LIB.rng(sd('stragglers'));
    const out = [];
    for (let i = 0; i < 26; i++) {
      const s0 = lerp(0.03, 0.42, (i + r()) / 26);
      out.push({
        id: 2000 + i,
        w0: Math.exp(-B * s0),
        side: i % 2 ? 1 : -1,
        amp: r.range(60, 200),
        ph: r.range(0, TAU),
        om: r.range(1.6, 3.2),
        j: r.range(0.45, 0.7),
        size: r.range(12, 24),
        glideSeed: r.int(0, 1e6),
        ph4: r.int(0, 3),
        bob: r.range(0, TAU),
        bobF: r.range(1.2, 2.0),
        head: r.range(-0.3, 0.3),
        sex: r() < 0.5 ? 0 : 1,
      });
    }
    return out;
  })();

  // a small loose group gliding on open wings in the right-hand sky, just off the top of the thermal
  const GLIDERS = (() => {
    const r = LIB.rng(sd('gliders'));
    const out = [];
    const pos = [[880, 418], [938, 452], [852, 486], [966, 512], [906, 538]];
    for (let i = 0; i < pos.length; i++) {
      out.push({ id: 2500 + i, x: pos[i][0] + r.range(-8, 8), y: pos[i][1] + r.range(-6, 6), size: r.range(20, 27), head: r.range(-0.18, 0.18), sex: i % 2, bob: r.range(0, TAU), glideSeed: r.int(0, 1e6), ph: r.int(0, 3), flapAt: r.int(0, 18) });
    }
    return out;
  })();

  function crowdPose(b, tq) {
    const d = Math.floor(tq * 12 + 1e-6);
    const glide = LIB.h3(b.glideSeed, Math.floor((d + b.ph * 3) / 6), 3) < 0.3;
    if (glide) return LIB.h3(b.glideSeed, 11, 7) < 0.5 ? 0 : 1;
    return [0, 1, 2, 1][(d + b.ph) % 4];
  }

  function placeCrowd(tq, L, t) {
    const items = [];
    const add = (b, w, extraLat, sizeCap) => {
      if (w <= 0.001) return;
      const s = -Math.log(w) / B;
      if (s < -0.1 || s > 1.25) return;
      const q = pathAt(s);
      const size = Math.min(sizeAt(s) * b.szj, sizeCap || NEAR_MAX);
      const hw = halfWidthAt(s);
      const weave = 0.07 * Math.sin(b.bob + tq * b.bobF * 2.1);
      const nx = -q.ty, ny = q.tx;
      const lat = (b.lat + weave) * hw + (extraLat || 0);
      const bob = Math.sin(b.bob * 1.7 + tq * b.bobF * TAU) * size * 0.1;
      let x = q.x + nx * lat;
      let y = q.y + ny * lat + bob;
      // most of the nearest butterflies pass beside the camera: they peel off level through the frame
      // sides instead of piling into the bottom of the frame
      if (b.wave < 0 && s > 0.76 && LIB.h3(b.id, 7, 3) < 0.5) {
        const side = b.lat < 0 ? 1 : -1;
        const f = Math.pow(sstep(0.76, 1.1, s), 1.25);
        x += side * 1000 * f;
        y -= 250 * f;
      }
      // small butterflies part around the lead so her outline sits on clean sky: the stream splits into
      // two lanes past her (mostly across the stream, partly radial) instead of wrapping her in a ring
      if (L && size < 90) {
        const dx = x - L.x, dy = y - L.y;
        const along = dx * q.tx + dy * q.ty, across = dx * nx + dy * ny;
        const d = Math.hypot(along / 1.6, across);
        const R = 150;
        if (d < R) {
          const side = Math.abs(across) > 2 ? Math.sign(across) : b.lat < 0 ? -1 : 1;
          const rl = Math.hypot(dx, dy) || 1;
          let ux = 0.35 * side * nx + 0.65 * (dx / rl), uy = 0.35 * side * ny + 0.65 * (dy / rl);
          const ul = Math.hypot(ux, uy) || 1;
          ux /= ul;
          uy /= ul;
          // push is 0 at d = R so motion stays continuous; close sprites land 330-560 px out
          const push = (R - d) * (2.2 + 1.6 * LIB.h3(b.id, 5, 17));
          x += ux * push;
          y += uy * push;
        }
      }
      // bodies point south-west on screen, a little flatter than the column's steep perspective line
      const heading = lerp(Math.atan2(q.ty, q.tx), 2.42, 0.55) + b.head + 0.12 * Math.cos(b.bob + tq * b.bobF * 2.1);
      items.push({ b, x, y, s, size, heading, pose: crowdPose(b, tq) });
    };
    for (const b of CROWD) add(b, b.w0 - W_RATE * b.j * tq);
    for (const b of WAVES) {
      if (t < b.tb - 1e-6) continue;
      const u = Math.max(0, tq - b.tb);
      const n0 = items.length;
      add(b, b.wEdge - W_RATE * b.j * u, b.rushX * LIB.ease.outCubic(clamp(u / (6 / 24))));
      if (items.length > n0) {
        const pop = LIB.ease.outBack(clamp((t - b.tb) / (3 / 24)));
        items[items.length - 1].size *= pop;
        if (t - b.tb < 2 / 12) items[items.length - 1].pose = 0;
      }
    }
    for (const b of STRAGGLERS) {
      const w = b.w0 - W_RATE * b.j * tq;
      if (w <= 0.001) continue;
      const s = -Math.log(w) / B;
      // off the column only in the upper stream, drifting out and back
      const env = sstep(-0.05, 0.08, s) * (1 - sstep(0.4, 0.58, s));
      const off = b.side * b.amp * env * (0.55 + 0.45 * Math.sin(b.ph + tq * b.om));
      add({ id: b.id, lat: 0, szj: b.size / sizeAt(clamp(s, 0, 1)), bob: b.bob, bobF: b.bobF, head: b.head, sex: b.sex, glideSeed: b.glideSeed, ph: b.ph4, wave: 9 }, w, off, 24 + 40 * sstep(0.45, 0.8, s));
    }
    items.sort((p, q) => p.size - q.size);
    return items;
  }

  function placeGliders(tq) {
    const items = [];
    for (const g of GLIDERS) {
      // a slow glide down-left, 36 px over the shot, with one short flap burst each
      const d = Math.floor(tq * 12 + 1e-6);
      const k = d - g.flapAt;
      const pose = k >= 0 && k < 4 ? [1, 2, 1, 0][k] : 0;
      items.push({
        b: { id: g.id, sex: g.sex, head: g.head },
        x: g.x - 24 * tq,
        y: g.y + 12 * tq + 3 * Math.sin(g.bob + tq * 4),
        size: g.size,
        heading: 2.5 + g.head,
        pose,
      });
    }
    return items;
  }

  // ===========================================================================
  // The lead female
  // ===========================================================================

  const LEAD_A = [585, 800], LEAD_B = [475, 1040];
  // six drawings per beat: the downstroke lands open on each beat
  const LEAD_POSES = [0, 0, 1, 2, 1, 0];
  const LEAD_BOB = [-9, -7, -2, 2, -1, -6];
  function leadAt(tq, dur) {
    const u = clamp(tq / dur);
    const d = Math.floor(tq * 12 + 1e-6) % 6;
    const x = lerp(LEAD_A[0], LEAD_B[0], u) + 4 * Math.sin(tq * 5.1);
    const y = lerp(LEAD_A[1], LEAD_B[1], u) + LEAD_BOB[d];
    const path = Math.atan2(LEAD_B[1] - LEAD_A[1], LEAD_B[0] - LEAD_A[0]);
    return { x, y, heading: lerp(path, 2.42, 0.4) + 0.04 * Math.sin(tq * 4), pose: LEAD_POSES[d] };
  }

  // ===========================================================================
  // Landscape
  // ===========================================================================

  // crest profiles from control points plus a little hand-drawn irregularity, tabulated every 2 px
  function crestTable(ctrl, amp, seed) {
    const sm = LIB.smoothPts(ctrl, false, 3);
    const tab = new Float32Array(600);
    let j = 0;
    for (let i = 0; i < 600; i++) {
      const x = -60 + i * 2;
      while (j < sm.length - 2 && sm[j + 1][0] < x) j++;
      const a = sm[j], b = sm[j + 1];
      const u = clamp((x - a[0]) / (b[0] - a[0] || 1));
      tab[i] = lerp(a[1], b[1], u) + amp * LIB.noise1(x * 0.011, seed) + amp * 0.4 * LIB.noise1(x * 0.037, seed + 1);
    }
    return tab;
  }
  const RIDGES = [
    { base: 1250, tab: crestTable([[-80, 1262], [110, 1236], [290, 1258], [470, 1222], [640, 1246], [830, 1206], [990, 1240], [1160, 1222]], 5, sd('r0')) },
    { base: 1385, tab: crestTable([[-80, 1428], [140, 1392], [330, 1352], [520, 1398], [700, 1420], [880, 1350], [1160, 1300]], 7, sd('r1')) },
    { base: 1555, tab: crestTable([[-80, 1480], [180, 1508], [420, 1572], [640, 1552], [860, 1602], [1160, 1630]], 9, sd('r2')) },
  ];
  const crestY = (R, x) => {
    const f = (clamp(x, -60, 1136) + 60) / 2;
    const i = Math.min(598, Math.floor(f));
    return lerp(R.tab[i], R.tab[i + 1], f - i);
  };
  const crestSlope = (R, x) => (crestY(R, x + 8) - crestY(R, x - 8)) / 16;

  const DISTANT = { base: 1200, tab: crestTable([[-80, 1230], [90, 1208], [220, 1224], [400, 1192], [560, 1218], [700, 1200], [800, 1212], [930, 1184], [1160, 1216]], 4, sd('distant')) };
  // the fir-covered mountains: two humps peaking near (180, 1690) and (820, 1720)
  const FIR_RIDGE = { tab: crestTable([[-80, 1788], [20, 1738], [180, 1690], [330, 1760], [480, 1836], [600, 1832], [700, 1780], [820, 1720], [950, 1772], [1160, 1846]], 6, sd('fir')) };
  const FIR_BASE = (x) => crestY(FIR_RIDGE, x);

  // each ridge is a band from its crest down to just below the next crest in front (the rest is hidden)
  const RIDGE_POLY = RIDGES.map((R, i) => {
    const pts = [];
    for (let x = -30; x <= 1110; x += 10) pts.push([x, crestY(R, x)]);
    for (let x = 1110; x >= -30; x -= 20) pts.push([x, (i + 1 < RIDGES.length ? crestY(RIDGES[i + 1], x) : FIR_BASE(x)) + 40]);
    return pts;
  });
  const FIRS = (() => {
    const r = LIB.rng(sd('firs'));
    const out = [];
    let x = -30;
    while (x < 1120) {
      const h = r.range(40, 120);
      const w = h * r.range(0.42, 0.55);
      out.push({ x, y: FIR_BASE(x) + r.range(-4, 10), h, w, tiers: r() < 0.2 ? 2 : r.int(4, 6), seed: r.int(0, 1e6) });
      x += r.range(18, 34);
    }
    // a second, lower row in front
    x = -10;
    while (x < 1120) {
      const h = r.range(40, 120);
      out.push({ x, y: FIR_BASE(x) + r.range(60, 100), h, w: h * r.range(0.42, 0.52), tiers: r() < 0.2 ? 2 : r.int(5, 7), seed: r.int(0, 1e6), front: true });
      x += r.range(26, 44);
    }
    // a third row further down the slope, so the forest mass reads as tree tops, not a flat fill
    x = -24;
    while (x < 1120) {
      const h = r.range(40, 120);
      out.push({ x, y: FIR_BASE(x) + r.range(175, 215), h, w: h * r.range(0.44, 0.54), tiers: r() < 0.2 ? 2 : r.int(5, 7), seed: r.int(0, 1e6), deep: true });
      x += r.range(24, 40);
    }
    return out;
  })();

  // a third row of big firs close to the camera, cut by the bottom edge (sets up shot 15's trunks)
  const BIG_FIRS = (() => {
    const r = LIB.rng(sd('bigfirs'));
    const out = [];
    let x = r.range(-40, 0);
    while (x < 1130) {
      const h = r.range(160, 245);
      out.push({ x, y: r.range(2010, 2045), h, w: h * r.range(0.5, 0.6), tiers: r.int(7, 9), seed: r.int(0, 1e6) });
      x += r.range(92, 132);
    }
    return out;
  })();

  function firPoly(f) {
    const pts = [];
    const n = f.tiers;
    const r = LIB.rng(f.seed + 19);
    const lean = r.range(-5, 5);
    const hwJ = [];
    for (let i = 1; i <= n; i++) hwJ[i] = r.range(0.82, 1.18);
    // left side going down from the tip, zig-zag tiers
    pts.push([f.x + lean, f.y - f.h]);
    for (let i = 1; i <= n; i++) {
      const u = i / n;
      const yy = f.y - f.h + f.h * u;
      const hw = (f.w / 2) * Math.pow(u, 0.85) * hwJ[i];
      pts.push([f.x - hw, yy]);
      if (i < n) pts.push([f.x - hw * 0.55, yy - f.h / n * 0.12]);
    }
    for (let i = n; i >= 1; i--) {
      const u = i / n;
      const yy = f.y - f.h + f.h * u;
      const hw = (f.w / 2) * Math.pow(u, 0.85) * hwJ[i];
      if (i < n) pts.push([f.x + hw * 0.55, yy - f.h / n * 0.12]);
      pts.push([f.x + hw, yy]);
    }
    return pts;
  }

  const RIVER = (() => {
    const c = LIB.smoothPts([[712, 1402], [792, 1418], [770, 1446], [700, 1470], [760, 1500], [900, 1522], [1010, 1560], [1110, 1600]], false, 6);
    const n = c.length;
    const left = [], right = [];
    for (let i = 0; i < n; i++) {
      const a = c[Math.max(0, i - 1)], b = c[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      const w = lerp(3, 26, Math.pow(i / (n - 1), 1.3)) * (1 + 0.15 * Math.sin(i * 0.7));
      left.push([c[i][0] - ty * w, c[i][1] + tx * w * 0.55]);
      right.push([c[i][0] + ty * w, c[i][1] - tx * w * 0.55]);
    }
    return { c, left, right, poly: left.concat(right.slice().reverse()) };
  })();

  const CLOUDS = [
    { x: 905, y: 1168, w: 300, h: 84, seed: sd('cloud', 1) },
    { x: 118, y: 1196, w: 190, h: 52, seed: sd('cloud', 2) },
  ];
  // cumulus: the upper envelope of uneven round bumps over a flat base, tallest in the middle
  function cloudPoly(c) {
    const r = LIB.rng(c.seed);
    const x0 = c.x - c.w / 2, x1 = c.x + c.w / 2;
    const base = c.y + c.h * 0.25;
    const bumps = [];
    // rounded end caps: the first and last bumps sit on the base line so the outline closes cleanly
    const capL = c.h * 0.32, capR = c.h * 0.36;
    bumps.push({ x: x0 + capL, r: capL, cy: base });
    let x = x0 + c.w * 0.1;
    let bi = 0;
    while (x < x1 - c.w * 0.12) {
      const u = (x - x0) / c.w;
      const rad = c.w * r.range(0.05, 0.16);
      const top = base - c.h * (0.3 + 0.7 * Math.sin(Math.PI * u)) * r.range(0.8, 1.05);
      bumps.push({ x, r: rad, cy: top + rad });
      // two interior bumps overlap by 40 percent
      x += rad * (bi === 1 ? 0.6 : r.range(1.1, 1.6));
      bi++;
    }
    bumps.push({ x: x1 - capR, r: capR, cy: base });
    const pts = [];
    for (let px = x0; px <= x1 + 0.01; px += 3) {
      let y = base;
      for (const b of bumps) {
        const dx = px - b.x;
        if (Math.abs(dx) < b.r) y = Math.min(y, b.cy - Math.sqrt(b.r * b.r - dx * dx));
      }
      pts.push([px, y]);
    }
    // flat base back to the start point
    for (let px = x1 - 12; px > x0 + 6; px -= 24) pts.push([px, base + 1]);
    return { pts, bumps, base };
  }

  // a thermal on the right: stacked rings that a few butterflies circle before gliding off
  const THERMAL = { x0: 902, y0: 1206, x1: 860, y1: 700, rings: 7 };
  const thermalRing = (i) => {
    const u = i / (THERMAL.rings - 1);
    return { x: lerp(THERMAL.x0, THERMAL.x1, u), y: lerp(THERMAL.y0, THERMAL.y1, u), rx: lerp(26, 96, u), ry: lerp(7, 22, u) };
  };
  const RIDERS = (() => {
    const r = LIB.rng(sd('riders'));
    const out = [];
    for (let i = 0; i < 12; i++) out.push({ id: 3000 + i, u: 0.04 + (i / 11) * 0.9 + r.range(-0.03, 0.03), ph: r.range(0, TAU), w: r.range(3.4, 4.4), szj: r.range(0.9, 1.1), size: r.range(22, 28), sex: i % 2, fl: r.int(0, 3), glideSeed: r.int(0, 1e6), b: null });
    return out;
  })();

  // G7 sun-path arc and the sun
  const ARC_CX = 540, ARC_CY = 720, ARC_R = 520;
  const ARC_A0 = Math.atan2(520 - ARC_CY, 60 - ARC_CX);
  const ARC_A1 = Math.atan2(520 - ARC_CY, 1020 - ARC_CX);
  const SUN_R = 60;
  const SUN = (() => {
    const x = 170;
    return [x, ARC_CY - Math.sqrt(ARC_R * ARC_R - (x - ARC_CX) * (x - ARC_CX))];
  })();

  // ===========================================================================
  // Drawing: background
  // ===========================================================================

  function drawSky(ctx, t) {
    LIB.stripes(ctx, { colors: [P.stripeCream, P.stripeSky], width: 140, angle: -0.52, offset: (t / 0.5) * 6, bounds: { x: -10, y: -20, w: 1100, h: 2060 }, seed: sd('stripes') });
    // engraved sky: horizontal line hatching that deepens toward the top of the frame
    LIB.hatch(ctx, null, {
      bounds: { x: -20, y: -20, w: 1120, h: 460 },
      angle: 0,
      spacing: 6,
      width: 1.1,
      color: P.inkFaint,
      alpha: 0.32,
      length: [40, 140],
      gap: [5, 18],
      seed: sd('skyhatch'),
      density: (x, y) => 1 - sstep(40, 430, y),
    });
    // haze near the horizon
    LIB.hatch(ctx, null, {
      bounds: { x: -20, y: 1040, w: 1120, h: 240 },
      angle: 0,
      spacing: 7,
      width: 1.2,
      color: P.white,
      alpha: 0.55,
      length: [30, 110],
      gap: [6, 22],
      seed: sd('haze'),
      density: (x, y) => sstep(1060, 1250, y) * 0.9,
    });
  }

  function drawConstruction(ctx) {
    const c = { width: 1.5, color: P.inkFaint, alpha: 0.3, wobble: 0.6, taper: [10, 20] };
    // horizon and the column's perspective rails converging beyond the top-right entry
    LIB.inkLine(ctx, -20, 1250, 1100, 1250, Object.assign({ seed: sd('c', 1) }, c));
    const vp = [905, -330];
    LIB.inkLine(ctx, vp[0], vp[1], -160, 1520, Object.assign({ seed: sd('c', 2) }, c));
    LIB.inkLine(ctx, vp[0], vp[1], 470, 2040, Object.assign({ seed: sd('c', 3) }, c));
    // sun crosshair and guide circle
    LIB.inkLine(ctx, SUN[0] - 150, SUN[1], SUN[0] + 150, SUN[1], Object.assign({ seed: sd('c', 4) }, c));
    LIB.inkLine(ctx, SUN[0], SUN[1] - 150, SUN[0], SUN[1] + 150, Object.assign({ seed: sd('c', 5) }, c));
    LIB.guideCircle(ctx, SUN[0], SUN[1], 104, { color: P.inkFaint, alpha: 0.3, width: 1.5, dash: [3, 6] });
    // G7 circle radii
    LIB.inkLine(ctx, 60, 520, ARC_CX, ARC_CY, Object.assign({ seed: sd('c', 6) }, c, { alpha: 0.2 }));
    LIB.inkLine(ctx, 1020, 520, ARC_CX, ARC_CY, Object.assign({ seed: sd('c', 7) }, c, { alpha: 0.2 }));
    // construction ticks: depth ticks down the right-hand rail that open up with perspective as the
    // column nears the viewer (the horizon ruler is drawn over the land, in drawHorizonTicks)
    const tk = new Path2D();
    const ex = 470 - vp[0], ey = 2040 - vp[1];
    const el = Math.hypot(ex, ey);
    const ux = ex / el, uy = ey / el;
    for (let k = 1; k <= 14; k++) {
      const u = 1 - Math.pow(0.8, k * 1.25);
      const px = vp[0] + ex * u, py = vp[1] + ey * u;
      const L = 8 + 16 * u;
      tk.moveTo(px, py);
      tk.lineTo(px + uy * L, py - ux * L);
    }
    ctx.save();
    ctx.strokeStyle = P.inkFaint;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.stroke(tk);
    ctx.restore();
    // depth arcs: equal-distance circles swung from the vanishing point through the column, so the
    // perspective of the stream is drawn out across the sky, with a short tick where each crosses the path
    for (let k = 0; k < DEPTH_ARCS.length; k++) {
      const A = DEPTH_ARCS[k];
      LIB.inkPath(ctx, A.pts, { width: 1.4, color: P.inkFaint, alpha: 0.26, seed: sd('darc', k), wobble: 1.2, taper: [30, 60] });
      const q = A.cross;
      LIB.inkLine(ctx, q[0] - A.nx * 16, q[1] - A.ny * 16, q[0] + A.nx * 16, q[1] + A.ny * 16, { width: 1.6, color: P.inkFaint, alpha: 0.5, seed: sd('dtick', k), taper: [3, 3], wobble: 0.3 });
    }
  }

  const DEPTH_ARCS = [0.3, 0.5, 0.68].map((s) => {
    const vp = [905, -330];
    const q = pathAt(s);
    const R = Math.hypot(q.x - vp[0], q.y - vp[1]);
    const pts = [];
    for (let a = 0.35; a < 2.9; a += 6 / R) {
      const x = vp[0] + Math.cos(a) * R, y = vp[1] + Math.sin(a) * R;
      if (x < -40 || x > 1120) continue;
      if (y > 1215) continue;
      pts.push([x, y]);
    }
    const nx = (q.x - vp[0]) / R, ny = (q.y - vp[1]) / R;
    return { pts, cross: [q.x, q.y], nx, ny };
  });

  // a construction ruler along the land's skyline: 7 px ticks every 30 px, 16 px every 150 px
  function drawHorizonTicks(ctx) {
    const far = RIDGES[0];
    const tk = new Path2D();
    for (let x = 0; x <= 1080; x += 30) {
      const y = Math.min(crestY(DISTANT, x), crestY(far, x)) - 2;
      const L = x % 150 === 0 ? 16 : 7;
      tk.moveTo(x, y - L);
      tk.lineTo(x, y);
    }
    ctx.save();
    ctx.strokeStyle = P.inkFaint;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.stroke(tk);
    ctx.restore();
  }

  function drawSun(ctx) {
    const [x, y] = SUN;
    const R = SUN_R;
    const seed = sd('sun');
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + 0.13;
      const r0 = R + 14, r1 = R + (i % 2 ? 32 : 48);
      LIB.inkLine(ctx, x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1, { width: 3.6, seed: seed + i, taper: [2, 9], wobble: 0.4 });
    }
    const disc = LIB.ellipsePts(x, y, R, R, 48);
    LIB.inkPath(ctx, disc, { closed: true, fill: P.sun, width: 3.8, seed: seed + 20, double: { offset: 5, width: 0.3, alpha: 0.35, from: 0.3, to: 0.62 } });
    const fall = (px, py) => ((px - x) * 0.6 + (py - y) * 0.8) / R;
    LIB.hatch(ctx, disc, { spacing: 5, width: 1.3, color: P.ochre, alpha: 0.85, seed: seed + 21, length: [8, 30], density: (px, py) => sstep(0.0, 0.75, fall(px, py)) });
    // cross layer on the lower-right third only
    LIB.hatch(ctx, disc, { angle: -Math.PI / 4 - Math.PI / 3, spacing: 7, width: 1.2, color: P.ochre, alpha: 0.8, seed: seed + 23, length: [6, 20], density: (px, py) => sstep(0.35, 0.8, fall(px, py)) });
  }

  function drawClouds(ctx, tq) {
    for (const c of CLOUDS) {
      // clouds drift west 3 px per 8th note, on twos
      const dx = -12 * tq;
      const cloud = cloudPoly(c);
      const pts = cloud.pts.map((q) => [q[0] + dx, q[1]]);
      LIB.inkPath(ctx, pts, { closed: true, fill: LIB.mix(P.white, P.stripeSky, 0.15), width: 2.4, color: P.inkSoft, seed: c.seed + 1, wobble: 0.8, taper: [0, 0], overlap: 6 });
      LIB.hatch(ctx, pts, {
        spacing: 5,
        width: 1.1,
        color: P.inkSoft,
        alpha: 0.45,
        angle: -Math.PI / 4,
        length: [6, 18],
        seed: c.seed + 2,
        density: (x, y) => {
          let d = 0;
          for (const b of cloud.bumps) {
            const dens = sstep(0.2, 0.8, ((x - (b.x + dx)) * 0.7 + (y - b.cy) * 0.7) / b.r);
            if (dens > d) d = dens;
          }
          return d;
        },
      });
      const big = cloud.bumps.slice().sort((a, b) => b.r - a.r).slice(0, 2);
      for (let i = 0; i < big.length; i++) {
        const b = big[i];
        const inner = [];
        const rIn = b.r * 0.62;
        for (let a = -1.15; a <= 0.55; a += 0.1) {
          inner.push([b.x + dx + Math.cos(a) * rIn, b.cy + Math.sin(a) * rIn]);
        }
        LIB.inkPath(ctx, inner, { width: 1.5, color: P.inkSoft, seed: c.seed + 30 + i, wobble: 0.35, taper: [4, 6] });
      }
    }
  }

  function thermalSpiralAt(u) {
    const pos = (uu) => {
      const f = clamp(uu, 0, 1) * (THERMAL.rings - 1);
      const q = thermalRing(f);
      const th = f * TAU * 0.5;
      return { x: q.x + Math.cos(th) * q.rx * 0.8, y: q.y + Math.sin(th) * q.ry * 0.8 };
    };
    const p = pos(u);
    const q = pos(u + 0.012);
    return { x: p.x, y: p.y, heading: Math.atan2(q.y - p.y, q.x - p.x) };
  }

  function drawThermal(ctx, t) {
    const pOn = LIB.ease.outExpo(clamp(t / (6 / 24)));
    ctx.save();
    ctx.strokeStyle = P.teal;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < THERMAL.rings; i++) {
      const q = thermalRing(i);
      ctx.beginPath();
      ctx.ellipse(q.x, q.y, q.rx, q.ry, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    ctx.beginPath();
    const n = 360;
    const nOn = Math.max(1, Math.floor(n * pOn));
    for (let k = 0; k <= nOn; k++) {
      const p = thermalSpiralAt(k / n);
      if (k === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawAirflow(ctx, t) {
    const offs = [260, 340, 420];
    ctx.save();
    ctx.strokeStyle = P.inkFaint;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([40, 18]);
    ctx.lineDashOffset = -V_MID * t;
    ctx.lineCap = 'round';
    for (let i = 0; i < offs.length; i++) {
      for (let k = 0; k < 2; k++) {
        const extra = k === 0 ? -14 : 14;
        ctx.beginPath();
        let first = true;
        for (let s = 0.1; s <= 0.7; s += 0.012) {
          const q = pathAt(s);
          const nx = -q.ty, ny = q.tx;
          const x = q.x + nx * (offs[i] + extra);
          const y = q.y + ny * (offs[i] + extra);
          if (first) {
            ctx.moveTo(x, y);
            first = false;
          } else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function placeRiders(tq) {
    const items = [];
    for (const b of RIDERS) {
      const u = clamp(b.u + 0.03 * tq, 0, 1);
      const p = thermalSpiralAt(u);
      const it = { b: { id: b.id, sex: b.sex, glideSeed: b.glideSeed, ph: b.fl }, x: p.x, y: p.y, size: b.size, heading: p.heading, pose: 0 };
      it.pose = crowdPose(it.b, tq);
      items.push(it);
    }
    return items;
  }

  // contour hatching that follows a ridge crest, on its shadow slopes and above the next ridge
  function contourHatch(ctx, R, next, o, v) {
    const p = new Path2D();
    const r = LIB.rng(o.seed);
    const bi = v;
    let k = 0;
    for (let d = o.spacing * 0.7; d < o.depth; d += o.spacing * r.range(0.85, 1.15), k++) {
      const th = ((k * 0.6180339 + 0.21) % 1) * 0.9 + 0.05;
      let seg = null;
      let segLen = 0, limit = r.range(26, 80);
      let prev = null;
      for (let x = -30; x <= 1110; x += 6) {
        const cy = crestY(R, x);
        const y = cy + d + (R.base - cy) * Math.min(1, d / o.depth) * 0.45;
        if (next && y > crestY(next, x) + 2) {
          seg = null;
          prev = null;
          continue;
        }
        const dens = o.dens(x, y, d, cy);
        const noiseTh = th + 0.12 * LIB.noise1(x * 0.02 + k * 3.7, o.seed);
        if (dens > noiseTh) {
          const jy = (LIB.h3(k, Math.floor(x / 40), bi + o.seed) - 0.5) * 0.9;
          if (!seg) {
            p.moveTo(x, y + jy);
            seg = true;
            segLen = 0;
            limit = r.range(26, 80);
          } else {
            p.lineTo(x, y + jy);
            segLen += 6;
            if (segLen > limit) {
              seg = null;
              x += r.range(2, 8);
            }
          }
          prev = [x, y];
        } else {
          seg = null;
        }
      }
    }
    ctx.save();
    ctx.strokeStyle = o.color;
    ctx.globalAlpha = o.alpha;
    ctx.lineWidth = o.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(p);
    ctx.restore();
  }

  // the dark tuck where a ridge passes behind the crest in front of it: 45 degree ink hatch at 5 px with a
  // 105 degree cross layer at 7 px, strongest where the slopes face lower right, fading upward
  function tuckShadow(ctx, R, next, v, seed, strength) {
    const top = [], bot = [];
    for (let x = -30; x <= 1110; x += 8) {
      const ny = crestY(next, x);
      top.push([x, Math.max(crestY(R, x), ny - 52)]);
      bot.push([x, ny + 4]);
    }
    const band = top.concat(bot.reverse());
    const face = (x) => clamp(0.3 + 7 * Math.max(0, crestSlope(next, x), crestSlope(R, x)));
    const hgt = (x) => lerp(30, 45, face(x));
    LIB.hatch(ctx, band, {
      boil: v, spacing: 5, width: 1.3, color: P.ink, alpha: 0.8 * strength, length: [8, 22], gap: [1, 4], seed, inset: 0, overshoot: 0,
      density: (x, y) => face(x) * sstep(-hgt(x), -6, y - crestY(next, x)) * 1.05,
    });
    LIB.hatch(ctx, band, {
      boil: v, angle: -Math.PI / 4 - Math.PI / 3, spacing: 7, width: 1.2, color: P.ink, alpha: 0.7 * strength, length: [6, 16], gap: [2, 5], seed: seed + 1, inset: 0, overshoot: 0,
      density: (x, y) => face(x) * sstep(-hgt(x) * 0.65, -4, y - crestY(next, x)) * 0.95,
    });
  }

  function drawLand(ctx, v) {
    const [far, mid, near] = RIDGES;
    const inkS = P.inkSoft;
    // distant range in the haze behind the far ridge
    const distant = [];
    for (let x = -30; x <= 1110; x += 10) distant.push([x, crestY(DISTANT, x)]);
    for (let x = 1110; x >= -30; x -= 40) distant.push([x, crestY(far, x) + 30]);
    LIB.inkPath(ctx, distant, { boil: v, closed: true, fill: LIB.mix(P.stripeSky, P.mist, 0.3), width: 1.6, color: inkS, alpha: 0.55, seed: sd('distant'), wobble: 0.8 });
    LIB.hatch(ctx, distant, { boil: v, angle: -1.2, spacing: 7, width: 1, color: inkS, alpha: 0.3, length: [6, 18], seed: sd('distanth'), density: (x, y) => clamp(4 * crestSlope(DISTANT, x) + 0.1) });
    // haze stipple, about 0.004 dots per px2
    LIB.stipple(ctx, distant, { boil: v, spacing: 17, r: [1.0, 1.6], color: P.inkFaint, alpha: 0.75, seed: sd('distants'), boilAmp: 0.3 });
    // far ridge: hazy sage
    const farFill = LIB.mix(P.sage, P.stripeSky, 0.45);
    LIB.inkPath(ctx, RIDGE_POLY[0], { boil: v, closed: true, fill: farFill, width: 2.4, color: inkS, seed: sd('rp', 0), wobble: 1 });
    contourHatch(ctx, far, mid, {
      seed: sd('ch', 0), spacing: 6, depth: 180, color: inkS, alpha: 0.42, width: 1.15,
      dens: (x, y, d, cy) => clamp(3.5 * crestSlope(far, x) + 0.03) * (1 - d / 180) + 0.62 * sstep(-46, 0, y - crestY(mid, x)),
    }, v);
    // ochre field patches on the far ridge
    LIB.hatch(ctx, RIDGE_POLY[0], { boil: v, angle: -0.08, spacing: 4.5, width: 1.3, color: P.ochre, alpha: 0.55, length: [20, 60], seed: sd('farfields'), density: (x, y) => clamp(LIB.noise2(x * 0.006, y * 0.02, sd('ff')) * 2.2 - 0.3) });
    tuckShadow(ctx, far, mid, v, sd('tuck', 0), 0.55);
    // river on the far and mid slopes
    // mid ridge: ochre
    const midFill = LIB.mix(P.ochre, P.paper, 0.55);
    LIB.inkPath(ctx, RIDGE_POLY[1], { boil: v, closed: true, fill: midFill, width: 3, color: P.ink, seed: sd('rp', 1), wobble: 1.2 });
    contourHatch(ctx, mid, near, {
      seed: sd('ch', 1), spacing: 5.5, depth: 240, color: P.ink, alpha: 0.5, width: 1.2,
      dens: (x, y, d, cy) => clamp(3.8 * crestSlope(mid, x) + 0.04) * (1 - d / 240) + 0.75 * sstep(-60, 0, y - crestY(near, x)),
    }, v);
    // farmland patches on the lit ochre slopes: hatched in alternating directions, edged with hedgerow dots
    drawFields(ctx, mid, near, v);
    // river
    ctx.save();
    ctx.beginPath();
    trace(ctx, RIDGE_POLY[1]);
    ctx.clip();
    LIB.inkPath(ctx, RIVER.poly, { boil: v, closed: true, fill: LIB.mix(P.white, P.stripeSky, 0.35), width: 1.8, color: P.ink, seed: sd('river'), wobble: 0.5, taper: [2, 6] });
    LIB.hatch(ctx, RIVER.poly, { boil: v, angle: 0.05, spacing: 4, width: 1.1, color: P.teal, alpha: 0.75, length: [8, 26], seed: sd('riverh'), inset: 2, overshoot: 0, density: (x, y) => 0.35 + 0.5 * sstep(1440, 1600, y) });
    // glints
    const bi = v;
    const gl = new Path2D();
    for (let i = 4; i < RIVER.c.length - 2; i += 3) {
      if (LIB.h3(i, bi, 77) < 0.45) continue;
      const c = RIVER.c[i];
      const L = lerp(4, 16, i / RIVER.c.length);
      gl.moveTo(c[0] - L, c[1] + 1);
      gl.lineTo(c[0] + L * 0.6, c[1] - 1);
    }
    ctx.strokeStyle = P.white;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.stroke(gl);
    ctx.restore();
    // round trees along the mid crest
    const tr = LIB.rng(sd('trees'));
    for (let i = 0; i < 11; i++) {
      const x = 30 + i * 98 + tr.range(-30, 30);
      const rr = tr.range(8, 14);
      const y = crestY(mid, x) + tr.range(4, 24);
      const pts = LIB.ellipsePts(x, y - rr * 0.9, rr, rr * 0.9, 18);
      LIB.inkPath(ctx, pts, { boil: v, closed: true, fill: P.sage, width: 1.8, color: P.ink, seed: sd('tree', i), wobble: 0.4, taper: [3, 6] });
      LIB.hatch(ctx, pts, { boil: v, spacing: 3.2, width: 1, color: P.ink, alpha: 0.7, length: [4, 10], seed: sd('treeh', i), density: (px, py) => sstep(-0.2, 0.6, ((px - x) + (py - y + rr)) / rr) });
      LIB.inkLine(ctx, x, y + 0.1 * rr, x, y + rr * 0.6, { boil: v, width: 1.6, seed: sd('trunk', i), taper: 0 });
    }
    tuckShadow(ctx, mid, near, v, sd('tuck', 1), 1);
    // near ridge: milkweed
    LIB.inkPath(ctx, RIDGE_POLY[2], { boil: v, closed: true, fill: P.milkweed, width: 3.4, color: P.ink, seed: sd('rp', 2), wobble: 1.4 });
    contourHatch(ctx, near, null, {
      seed: sd('ch', 2), spacing: 5.5, depth: 260, color: P.milkweedDeep, alpha: 0.95, width: 1.35,
      dens: (x, y, d, cy) => clamp(4 * crestSlope(near, x) + 0.06) * (1 - d / 280) + 0.7 * sstep(-70, 0, y - FIR_BASE(x)),
    }, v);
    drawMilkweedStrokes(ctx, near, v);
    tuckShadow(ctx, near, FIR_RIDGE, v, sd('tuck', 2), 1);
  }

  const FIELDS = (() => {
    const r = LIB.rng(sd('fields'));
    const out = [];
    let x = -20;
    let k = 0;
    while (x < 1100) {
      const w = r.range(70, 170);
      const d0 = r.range(14, 40), d1 = d0 + r.range(26, 60);
      out.push({ xa: x, xb: x + w, d0, d1, angle: [-0.35, 0.95, 0.15, -1.1][k % 4] + r.range(-0.1, 0.1), dens: r.range(0.35, 0.8), seed: r.int(0, 1e6) });
      if (r() < 0.5) {
        const e0 = d1 + r.range(8, 16);
        out.push({ xa: x + r.range(-20, 20), xb: x + w + r.range(-10, 30), d0: e0, d1: e0 + r.range(30, 60), angle: [0.9, -0.3][k % 2], dens: r.range(0.3, 0.7), seed: r.int(0, 1e6) });
      }
      x += w + r.range(6, 40);
      k++;
    }
    return out;
  })();

  function drawFields(ctx, R, next, v) {
    const hedge = new Path2D();
    for (const f of FIELDS) {
      const top = [], bot = [];
      for (let x = f.xa; x <= f.xb; x += 8) {
        const cy = crestY(R, x);
        top.push([x, cy + f.d0 + (R.base - cy) * 0.2 * (f.d0 / 200)]);
        bot.push([x, cy + f.d1 + (R.base - cy) * 0.2 * (f.d1 / 200)]);
      }
      const poly = top.concat(bot.reverse());
      LIB.hatch(ctx, poly, { boil: v, angle: f.angle, spacing: 5, width: 1.1, color: P.bark, alpha: 0.45 * f.dens + 0.1, length: [10, 30], gap: [2, 6], seed: f.seed, inset: 3, overshoot: 0 });
      // hedgerow dots along the lower edge
      for (let i = 0; i < bot.length; i++) {
        const q = bot[i];
        const jx = (LIB.h3(f.seed, i, v) - 0.5) * 1.4;
        hedge.moveTo(q[0] + jx + 1.8, q[1]);
        hedge.arc(q[0] + jx, q[1], 1.8, 0, TAU);
      }
    }
    ctx.save();
    ctx.fillStyle = P.ink;
    ctx.globalAlpha = 0.55;
    ctx.fill(hedge);
    ctx.restore();
  }

  function drawMilkweedStrokes(ctx, R, v) {
    const r = LIB.rng(sd('mw'));
    const bi = v;
    const stems = new Path2D();
    const pods = new Path2D();
    for (let i = 0; i < 260; i++) {
      const x = r.range(-10, 1090);
      const cy = crestY(R, x);
      const y = cy + 14 + Math.pow(r(), 1.4) * 306;
      const h = lerp(8, 26, (y - cy) / 320) * r.range(0.8, 1.2);
      const jx = (LIB.h3(i, bi, 5) - 0.5) * 0.8;
      const lean = r.range(-0.15, 0.15) * h;
      stems.moveTo(x, y);
      stems.quadraticCurveTo(x + lean * 0.3 + jx, y - h * 0.6, x + lean + jx, y - h);
      // leaf ticks
      const ly = y - h * 0.45;
      stems.moveTo(x + lean * 0.2, ly);
      stems.lineTo(x + lean * 0.2 - h * 0.28, ly - h * 0.14);
      stems.moveTo(x + lean * 0.25, ly - h * 0.12);
      stems.lineTo(x + lean * 0.25 + h * 0.28, ly - h * 0.26);
      if (r() < 0.55) {
        const pr = Math.max(1.2, h * 0.09);
        pods.moveTo(x + lean + jx + pr, y - h);
        pods.ellipse(x + lean + jx, y - h, pr, pr * 1.6, lean * 0.05, 0, TAU);
      }
    }
    ctx.save();
    ctx.strokeStyle = LIB.mix(P.milkweedDeep, P.ink, 0.35);
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.stroke(stems);
    ctx.fillStyle = P.seedPod;
    ctx.fill(pods);
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 0.8;
    ctx.stroke(pods);
    ctx.restore();
  }

  function drawFirs(ctx, v) {
    const back = FIRS.filter((f) => !f.front && !f.deep);
    const front = FIRS.filter((f) => f.front);
    const deep = FIRS.filter((f) => f.deep);
    const ROWS = [
      { row: back, off: 0, fill: LIB.mix(P.fir, P.ink, 0.35), hatchTo: 130 },
      { row: front, off: 80, fill: LIB.mix(P.fir, P.ink, 0.5), hatchTo: 190 },
      { row: deep, off: 175, fill: LIB.mix(P.fir, P.ink, 0.45), hatchTo: 330 },
    ];
    for (let ri = 0; ri < ROWS.length; ri++) {
      const { row, off, fill, hatchTo } = ROWS[ri];
      const isFront = ri > 0;
      const mass = [];
      for (let x = -30; x <= 1110; x += 12) mass.push([x, FIR_BASE(x) + off]);
      const top = mass.slice();
      if (isFront) mass.push([1110, 2040], [-30, 2040]);
      else for (let x = 1110; x >= -30; x -= 24) mass.push([x, FIR_BASE(x) + 130]);
      ctx.save();
      ctx.fillStyle = fill;
      ctx.beginPath();
      trace(ctx, mass);
      ctx.fill();
      ctx.restore();
      // the slope's ink line first, so the tree tips standing on it cover it
      LIB.inkPath(ctx, top, { boil: v, width: 2.2, color: P.ink, seed: sd('firline', ri), wobble: 0.8, taper: [0, 0] });
      ctx.save();
      ctx.fillStyle = fill;
      ctx.beginPath();
      for (const f of row) trace(ctx, firPoly(f));
      ctx.fill('nonzero');
      ctx.restore();
      // outlines of each tree
      const outl = new Path2D();
      for (const f of row) {
        const poly = firPoly(f);
        for (let i = 0; i <= poly.length; i++) {
          const q = poly[i % poly.length];
          const jx = (LIB.h3(f.seed, i, v * 3 + 1) - 0.5) * 1.2, jy = (LIB.h3(i, f.seed, v * 3 + 2) - 0.5) * 1.2;
          if (i === 0) outl.moveTo(q[0] + jx, q[1] + jy);
          else outl.lineTo(q[0] + jx, q[1] + jy);
        }
      }
      ctx.save();
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = isFront ? 2.2 : 1.7;
      ctx.lineJoin = 'round';
      ctx.stroke(outl);
      ctx.restore();
      // needle strokes: lit left halves in fir, shadow right halves in ink
      const lit = new Path2D(), shade = new Path2D();
      const bi = v;
      for (const f of row) {
        const r = LIB.rng(f.seed + 3);
        const n = Math.round(f.h / 4.5);
        for (let i = 2; i < n; i++) {
          const u = i / n;
          const yy = f.y - f.h + f.h * u;
          const hw = (f.w / 2) * Math.pow(u, 0.85) * 0.85;
          const jb = (LIB.h3(i, f.seed, bi) - 0.5) * 0.8;
          lit.moveTo(f.x - 1, yy + jb);
          lit.lineTo(f.x - hw * r.range(0.6, 1), yy + hw * 0.35 + jb);
          shade.moveTo(f.x + 1, yy + jb);
          shade.lineTo(f.x + hw * r.range(0.6, 1), yy + hw * 0.35 + jb);
        }
      }
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineWidth = 1.3;
      if (!isFront) {
        ctx.strokeStyle = LIB.mix(P.fir, P.white, 0.25);
        ctx.globalAlpha = 0.55;
        ctx.stroke(lit);
      }
      ctx.strokeStyle = P.ink;
      ctx.globalAlpha = 0.75;
      ctx.stroke(shade);
      ctx.restore();
      // the mass below its tree line: vertical needle hatching, only where the next row leaves it visible
      const band = top.concat(top.slice().reverse().map((q) => [q[0], q[1] - off + hatchTo]));
      LIB.hatch(ctx, band, { boil: v, angle: -1.35, spacing: 6, width: 1.3, color: P.ink, alpha: 0.55, length: [5, 14], gap: [2, 6], seed: sd('firmass', ri), density: (x, y) => 1 - 0.55 * sstep(FIR_BASE(x) + off + 20, FIR_BASE(x) + hatchTo, y) });
    }
  }

  // big near firs: a bark trunk, drooping branch tiers built from lengthwise needle strokes, ink outlines
  function drawBigFirs(ctx, v) {
    const bodyFill = LIB.mix(P.fir, P.ink, 0.16);
    const litCol = LIB.mix(P.fir, P.white, 0.34);
    const midCol = LIB.mix(P.fir, P.white, 0.1);
    for (const f of BIG_FIRS) {
      const r = LIB.rng(f.seed);
      const top = f.y - f.h;
      // trunk with lengthwise bark strokes, seen between the lower tiers
      const tw = f.h * 0.05;
      const trunk = [[f.x - tw * 0.45, top + f.h * 0.3], [f.x + tw * 0.45, top + f.h * 0.3], [f.x + tw, f.y + 24], [f.x - tw, f.y + 24]];
      LIB.inkPath(ctx, trunk, { boil: v, closed: true, fill: P.bark, width: 2.2, color: P.ink, seed: f.seed + 1, wobble: 0.4, taper: [0, 0] });
      const bark = new Path2D();
      for (let k = 0; k < 9; k++) {
        const bx = f.x + lerp(-tw * 0.75, tw * 0.75, (k + 0.5) / 9) + (LIB.h3(f.seed, k, v) - 0.5) * 1.2;
        const y0 = top + f.h * r.range(0.35, 0.8), y1 = y0 + r.range(18, 50);
        bark.moveTo(bx, y0);
        bark.lineTo(bx + r.range(-1.2, 1.2), y1);
      }
      ctx.save();
      ctx.strokeStyle = P.ink;
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      ctx.stroke(bark);
      ctx.restore();
      // branch tiers: drooping skirts with ragged needle tufts along the lower edge
      const tiers = [];
      const step = (f.h * 0.9) / f.tiers;
      for (let i = 0; i < f.tiers; i++) {
        const y0 = top + i * step - (i === 0 ? 0 : step * 0.15);
        const dh = step * (i === 0 ? 1.35 : 1.55);
        const hw = (f.w / 2) * Math.pow((i + 1) / f.tiers, 0.85);
        const pts = [[f.x, y0]];
        const n = 5;
        for (let k = 1; k <= n; k++) {
          const u = k / n;
          pts.push([f.x + hw * u, y0 + dh * Math.pow(u, 1.25) + r.range(-1.2, 1.2)]);
        }
        const tufts = Math.max(6, Math.round((hw * 2) / 13));
        const lower = [pts[pts.length - 1]];
        for (let m = 1; m < tufts; m++) {
          const u = 1 - (2 * m) / tufts;
          const lift = (1 - Math.pow(Math.abs(u), 1.6)) * dh * 0.22;
          pts.push([f.x + hw * u + r.range(-2, 2), y0 + dh - lift + (m % 2 ? r.range(4, 9) : r.range(-5, -2))]);
          lower.push(pts[pts.length - 1]);
        }
        for (let k = n; k >= 1; k--) {
          const u = k / n;
          pts.push([f.x - hw * u, y0 + dh * Math.pow(u, 1.25) + r.range(-1.2, 1.2)]);
        }
        lower.push(pts[pts.length - 1]);
        tiers.push({ i, y0, dh, hw, pts, lower });
      }
      // lowest tier first so each tier above droops over the one below and casts a hatched shadow on it
      for (let ti = tiers.length - 1; ti >= 0; ti--) {
        const T = tiers[ti];
        if (ti < tiers.length - 1) {
          // 45 degree hatch cast just under this tier's ragged edge, onto the tier below
          const sh = new Path2D();
          const L = T.lower;
          for (let k = 0; k + 1 < L.length; k++) {
            const a = L[k], b = L[k + 1];
            const span = Math.abs(b[0] - a[0]);
            for (let x = 0; x < span; x += 3.4) {
              const u = x / (span || 1);
              const px = lerp(a[0], b[0], u), py = lerp(a[1], b[1], u);
              const len = 7 + 7 * LIB.h3(f.seed + ti, k * 31 + Math.round(x), 3);
              const jb = (LIB.h3(k, Math.round(x), f.seed + v) - 0.5) * 0.8;
              sh.moveTo(px + jb, py + 1);
              sh.lineTo(px + len * 0.7 + jb, py + 1 + len * 0.7);
            }
          }
          ctx.save();
          ctx.strokeStyle = P.ink;
          ctx.globalAlpha = 0.75;
          ctx.lineWidth = 1.2;
          ctx.lineCap = 'round';
          ctx.stroke(sh);
          ctx.restore();
        }
        // tier body and a jittered ink outline that boils with the land
        const ol = new Path2D();
        for (let k = 0; k <= T.pts.length; k++) {
          const q = T.pts[k % T.pts.length];
          const jx = (LIB.h3(f.seed + ti, k, v * 5 + 1) - 0.5) * 1.1, jy = (LIB.h3(k, f.seed + ti, v * 5 + 2) - 0.5) * 1.1;
          if (k === 0) ol.moveTo(q[0] + jx, q[1] + jy);
          else ol.lineTo(q[0] + jx, q[1] + jy);
        }
        ctx.save();
        ctx.fillStyle = bodyFill;
        ctx.fill(ol);
        ctx.strokeStyle = P.ink;
        ctx.lineWidth = 2.3;
        ctx.lineJoin = 'round';
        ctx.stroke(ol);
        ctx.restore();
        // needle strokes laid lengthwise along the drooping branches: pale on the lit left, mid on the
        // upper right, ink on the lower right
        const lit = new Path2D(), mid = new Path2D(), shade = new Path2D();
        const rows = Math.max(3, Math.round(T.dh / 4.5));
        for (let q = 0; q < rows; q++) {
          const fy = (q + 0.6) / (rows + 0.4);
          for (const side of [-1, 1]) {
            const segs = Math.max(2, Math.round((T.hw * (0.25 + 0.75 * fy)) / 9));
            for (let k = 0; k < segs; k++) {
              const u = (k + r.range(0.15, 0.85)) / segs;
              const reach = T.hw * (0.2 + 0.8 * fy);
              const x0 = f.x + side * reach * u;
              const yEdge = T.y0 + T.dh * Math.pow(Math.max(0.001, u * (0.2 + 0.8 * fy)), 1.25);
              const yb = lerp(yEdge, T.y0 + T.dh * (0.55 + 0.35 * fy), fy * 0.85) - 1;
              const L = r.range(8, 14);
              const ang = Math.atan2(T.dh * 0.9, T.hw) * (0.6 + 0.5 * u);
              const jb = (LIB.h3(f.seed + q * 7, k * 2 + (side > 0 ? 1 : 0), v + ti) - 0.5) * 0.9;
              const p = side < 0 ? (fy < 0.8 ? lit : mid) : fy < 0.45 ? mid : shade;
              p.moveTo(x0, yb + jb);
              p.lineTo(x0 + side * Math.cos(ang) * L, yb + Math.sin(ang) * L + jb);
            }
          }
        }
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineWidth = 1.3;
        ctx.strokeStyle = litCol;
        ctx.globalAlpha = 0.8;
        ctx.stroke(lit);
        ctx.strokeStyle = midCol;
        ctx.globalAlpha = 0.6;
        ctx.stroke(mid);
        ctx.strokeStyle = P.ink;
        ctx.globalAlpha = 0.7;
        ctx.stroke(shade);
        ctx.restore();
      }
    }
  }

  // The hills and firs never move except for their 12 fps boil, so each boil drawing is rendered once
  // into its own layer (a pure function of the drawing index and render scale) and reused.
  const LAND_BOX = { x: -20, y: 1150, w: 1120, h: 900 };
  const LAND_VARIANTS = 3;
  const LAND = new Map();
  function landLayer(v, S) {
    const key = v + '|' + S;
    let c = LAND.get(key);
    if (c) return c;
    c = makeCanvas(Math.ceil(LAND_BOX.w * S), Math.ceil(LAND_BOX.h * S));
    const g = c.getContext('2d');
    g.scale(S, S);
    g.translate(-LAND_BOX.x, -LAND_BOX.y);
    drawLand(g, v);
    drawFirs(g, v);
    drawBigFirs(g, v);
    LAND.set(key, c);
    return c;
  }

  // ===========================================================================
  // Butterflies
  // ===========================================================================

  function drawCrowd(ctx, items, S) {
    const bi = LIB.boil(LIB.T);
    for (const it of items) {
      const cls = classFor(it.size);
      const v = cls.variants > 1 ? Math.floor(LIB.h3(it.b.id, bi, 41) * cls.variants) : 0;
      const under = it.pose === 2 && it.size < 60 && it.y < 1250;
      const spr = sprite(cls, it.pose, it.b.sex, v, S, under);
      const sc = it.size / cls.span;
      // a tiny boil wobble for sprites that have one drawing
      const wob = (LIB.h3(it.b.id, bi, 43) - 0.5) * 0.06;
      // far butterflies are plan views turned along the stream. Near ones fly level toward the viewer:
      // head mostly down the frame, wing axis within about 20 degrees of horizontal, each with its own
      // roll, and the body axis foreshortened as the wing plane is seen from a low angle
      const along = it.heading + Math.PI / 2;
      const roll = (it.b.head || 0) * 1.1;
      const toward = Math.PI + 0.4 * (it.heading - Math.PI / 2) + roll;
      const rot = lerp(along, toward, sstep(30, 50, it.size)) + wob;
      const squash = lerp(1, 0.6, sstep(40, 140, it.size));
      ctx.save();
      ctx.translate(it.x, it.y);
      ctx.rotate(rot);
      ctx.scale(sc, sc * squash);
      ctx.drawImage(spr.c, -spr.box / 2, -spr.box / 2 + spr.oy, spr.box, spr.box);
      ctx.restore();
    }
  }

  function drawLead(ctx, L, S) {
    const bi = LIB.boil(LIB.T);
    const v = bi % LEAD_CLASS.variants;
    const spr = sprite(LEAD_CLASS, L.pose, 0, v, S, true);
    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.rotate(L.heading + Math.PI / 2);
    ctx.scale(1, 0.85);
    ctx.drawImage(spr.c, -spr.box / 2, -spr.box / 2 + spr.oy, spr.box, spr.box);
    ctx.restore();
  }

  // ===========================================================================
  // Overlays
  // ===========================================================================

  function drawTrajectory(ctx, t, L) {
    // hard cut in: the draw-on is already one frame along on the first frame so the cut reads at once
    const pOn = LIB.ease.outExpo(clamp((t + 1 / 24) / 0.25));
    const s0 = -0.08, s1 = 0.79;
    const sEnd = lerp(s0, s1, pOn);
    const pts = [];
    for (let s = s0; s <= sEnd; s += 0.01) {
      const q = pathAt(s);
      pts.push([q.x, q.y]);
    }
    const qe = pathAt(sEnd);
    pts.push([qe.x, qe.y]);
    ctx.save();
    // the dashes break around the lead, as a path passing behind her
    ctx.beginPath();
    ctx.rect(-60, -400, 1200, 2800);
    ctx.arc(L.x, L.y, 132, 0, TAU, true);
    ctx.clip('evenodd');
    ctx.strokeStyle = P.annMagenta;
    ctx.fillStyle = P.annMagenta;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'round';
    ctx.setLineDash([14, 10]);
    ctx.lineDashOffset = -V_MID * t * 0.6;
    ctx.beginPath();
    trace(ctx, pts, false);
    ctx.stroke();
    ctx.setLineDash([]);
    // arrowhead
    const ah = 28;
    const ex = qe.x + qe.tx * 6, ey = qe.y + qe.ty * 6;
    const nx = -qe.ty, ny = qe.tx;
    ctx.beginPath();
    ctx.moveTo(ex + qe.tx * ah * 0.4, ey + qe.ty * ah * 0.4);
    ctx.lineTo(ex - qe.tx * ah * 0.7 + nx * ah * 0.45, ey - qe.ty * ah * 0.7 + ny * ah * 0.45);
    ctx.lineTo(ex - qe.tx * ah * 0.4, ey - qe.ty * ah * 0.4);
    ctx.lineTo(ex - qe.tx * ah * 0.7 - nx * ah * 0.45, ey - qe.ty * ah * 0.7 - ny * ah * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawSunArc(ctx) {
    ctx.save();
    ctx.strokeStyle = P.annYellow;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.setLineDash([0.01, 4]);
    ctx.beginPath();
    ctx.arc(ARC_CX, ARC_CY, ARC_R, ARC_A0, ARC_A1);
    ctx.stroke();
    ctx.restore();
  }

  function drawLeadOverlays(ctx, L, t) {
    const blue = P.annBlue;
    const ringR = [140, 176];
    // sun line
    const dx = L.x - SUN[0], dy = L.y - SUN[1];
    const dl = Math.hypot(dx, dy);
    const ux = dx / dl, uy = dy / dl;
    const aSun = Math.atan2(-dy, -dx);
    const aHead = L.heading;
    const arcR = 300;
    // draw-on at t 0 and redraw at T 27.0
    const tr = t >= 0.5 ? t - 0.5 : t;
    const pArc = LIB.ease.outExpo(clamp((tr + 1 / 24) / 0.25));
    const pLine = LIB.ease.outExpo(clamp((t + 1 / 24) / 0.25));
    ctx.save();
    ctx.strokeStyle = blue;
    ctx.fillStyle = blue;
    ctx.lineCap = 'round';
    ctx.lineWidth = 2;
    const sx = SUN[0] + ux * (SUN_R + 18), sy = SUN[1] + uy * (SUN_R + 18);
    const exL = L.x - ux * ringR[0], eyL = L.y - uy * ringR[0];
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(lerp(sx, exL, pLine), lerp(sy, eyL, pLine));
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(sx, sy, 5, 0, TAU);
    ctx.fill();
    // heading leg
    ctx.beginPath();
    ctx.moveTo(L.x + Math.cos(aHead) * ringR[1], L.y + Math.sin(aHead) * ringR[1]);
    ctx.lineTo(L.x + Math.cos(aHead) * (arcR + 26), L.y + Math.sin(aHead) * (arcR + 26));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(L.x - ux * ringR[1], L.y - uy * ringR[1]);
    ctx.lineTo(L.x - ux * (arcR + 26), L.y - uy * (arcR + 26));
    ctx.stroke();
    ctx.restore();
    // sun-angle arc from the sun direction round to the heading
    let a1 = aHead;
    while (a1 > aSun) a1 -= TAU;
    LIB.arcAnnotation(ctx, L.x, L.y, arcR, aSun, a1, { color: blue, width: 2, p: pArc, endTicks: 10, arrow: 14 });
    // a protractor scale inside the arc: 5 degree ticks, longer every 15 degrees, drawn on with the arc
    {
      const aEnd = aSun + (a1 - aSun) * pArc;
      const step = (5 * Math.PI) / 180;
      const tk = new Path2D();
      let k = 1;
      for (let a = aSun - step; a > aEnd + step * 0.5; a -= step, k++) {
        const len = k % 3 === 0 ? 14 : 7;
        tk.moveTo(L.x + Math.cos(a) * (arcR - 3), L.y + Math.sin(a) * (arcR - 3));
        tk.lineTo(L.x + Math.cos(a) * (arcR - 3 - len), L.y + Math.sin(a) * (arcR - 3 - len));
      }
      ctx.save();
      ctx.strokeStyle = blue;
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.stroke(tk);
      ctx.restore();
    }
    // motion rings pulse on each beat
    ctx.save();
    ctx.strokeStyle = blue;
    for (let i = 0; i < BEATS.length; i++) {
      const tb = BEATS[i];
      if (t < tb - 1e-6) continue;
      const u = t - tb;
      if (i + 1 < BEATS.length && t >= BEATS[i + 1] - 1e-6) continue;
      const pulse = LIB.ease.outExpo(clamp(u / (5 / 24)));
      ctx.lineWidth = 2;
      ctx.globalAlpha = 1;
      for (let k = 0; k < 2; k++) {
        ctx.beginPath();
        ctx.arc(L.x, L.y, ringR[k] * lerp(0.82, 1, pulse), 0, TAU);
        ctx.stroke();
      }
      const e = clamp(u / (10 / 24));
      if (e < 1) {
        ctx.globalAlpha = 1 - e;
        ctx.beginPath();
        ctx.arc(L.x, L.y, ringR[1] * lerp(1.0, 1.42, LIB.ease.outExpo(e)), 0, TAU);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawWaveRings(ctx, t) {
    ctx.save();
    ctx.strokeStyle = P.annYellow;
    ctx.lineWidth = 3;
    for (const tb of [0.5, 1.0]) {
      const u = t - tb;
      if (u < 0 || u > 10 / 24) continue;
      const e = u / (10 / 24);
      const q = pathAt(waveS(tb));
      ctx.globalAlpha = 1 - sstep(0.35, 1, e);
      ctx.beginPath();
      ctx.arc(q.x, q.y, lerp(30, 130, LIB.ease.outExpo(clamp((u + 1 / 24) / (10 / 24)))), 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    for (const tb of [0.5, 1.0]) {
      const u = t - tb;
      if (u < 0 || u >= 4 / 24) continue;
      const q = pathAt(waveS(tb));
      const rr = LIB.rng(sd('burst', Math.round(tb * 10)));
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + rr.range(-0.12, 0.12);
        const r0 = rr.range(40, 60);
        const len = rr.range(10, 18);
        LIB.inkLine(ctx, q.x + Math.cos(a) * r0, q.y + Math.sin(a) * r0, q.x + Math.cos(a) * (r0 + len), q.y + Math.sin(a) * (r0 + len), {
          width: 1.5,
          color: P.inkSoft,
          seed: sd('burstl', Math.round(tb * 10), i),
          taper: [2, 4],
          wobble: 0.3,
        });
      }
    }
  }

  // ===========================================================================
  // Scene
  // ===========================================================================

  FILM.scene({
    id: ID,
    draw(ctx, t, info) {
      const dur = info.dur;
      const tc = Math.min(t, dur);
      const tq = Math.min(LIB.onTwos(t), dur);
      const S = info.S || FILM.S || 1;
      const camY = camYAt(tc, dur);
      const lead = leadAt(tq, dur);
      const crowd = placeCrowd(tq, lead, tc);
      LIB.camera(ctx, { x: 540, y: 960 + camY }, () => {
        drawSky(ctx, tc);
        drawConstruction(ctx);
        drawAirflow(ctx, tc);
        drawSunArc(ctx);
        drawSun(ctx);
        drawThermal(ctx, tc);
        drawClouds(ctx, tq);
        const lv = LIB.boil(LIB.T) % LAND_VARIANTS;
        ctx.drawImage(landLayer(lv, S), LAND_BOX.x, LAND_BOX.y, LAND_BOX.w, LAND_BOX.h);
        drawHorizonTicks(ctx);
        // butterflies behind the lead, then the lead, then the near ones in front
        const behind = crowd.filter((c) => c.size < 90);
        const front = crowd.filter((c) => c.size >= 90);
        drawCrowd(ctx, placeRiders(tq), S);
        drawCrowd(ctx, placeGliders(tq), S);
        drawCrowd(ctx, behind, S);
        drawLead(ctx, lead, S);
        drawCrowd(ctx, front, S);
        drawTrajectory(ctx, tc, lead);
        drawLeadOverlays(ctx, lead, tc);
        drawWaveRings(ctx, tc);
      });
    },
  });
})();
