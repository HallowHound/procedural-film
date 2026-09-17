// 13 pull-back-continent : Pull-back, leaf, plant, meadow, continent.
// One continuous log-scale zoom out through five nested ink layers, each drawn at its own scale in
// its own function: L1 the female on a leaf tip (G5 at an 820 px span), L2 the autumn milkweed with
// split pods, L3 a meadow, L4 farmland, L5 a map of eastern North America on the G6 projection.
// Each layer lives in its own 1080x1920 local frame. A fixed similarity maps layer i into layer i+1
// (scale NOM[i]/NOM[i+1]), so every inner frame sits exactly inside its parent and the camera is one
// zoom about a fixed screen point per segment, landing each layer at identity on its beat.
(function () {
  'use strict';

  const ID = 'pull-back-continent';
  const LIB = FILM.lib;
  const TAU = Math.PI * 2;
  const FW = 1080, FH = 1920;

  // ---------------------------------------------------------------------------
  // small maths
  // ---------------------------------------------------------------------------

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
  const sstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const sd = (...k) => LIB.hash(ID, ...k) & 0x7fffffff;
  const outExpo = (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(p)));

  function trace(ctx, pts, closed = true) {
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) ctx.moveTo(pts[i][0], pts[i][1]);
      else ctx.lineTo(pts[i][0], pts[i][1]);
    }
    if (closed) ctx.closePath();
  }

  function fillPoly(ctx, pts, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    trace(ctx, pts, true);
    ctx.fill();
    ctx.restore();
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

  function segDist(px, py, ax, ay, bx, by) {
    const vx = bx - ax, vy = by - ay;
    const L2 = vx * vx + vy * vy || 1;
    const u = clamp(((px - ax) * vx + (py - ay) * vy) / L2);
    const qx = ax + vx * u - px, qy = ay + vy * u - py;
    return Math.sqrt(qx * qx + qy * qy);
  }

  // Sutherland-Hodgman: clip a closed polygon to an axis-aligned rectangle
  function clipPolyRect(pts, x0, y0, x1, y1) {
    let out = pts;
    const edges = [
      (p) => p[0] >= x0, (p) => p[0] <= x1, (p) => p[1] >= y0, (p) => p[1] <= y1,
    ];
    const cut = [
      (a, b) => { const u = (x0 - a[0]) / (b[0] - a[0]); return [x0, lerp(a[1], b[1], u)]; },
      (a, b) => { const u = (x1 - a[0]) / (b[0] - a[0]); return [x1, lerp(a[1], b[1], u)]; },
      (a, b) => { const u = (y0 - a[1]) / (b[1] - a[1]); return [lerp(a[0], b[0], u), y0]; },
      (a, b) => { const u = (y1 - a[1]) / (b[1] - a[1]); return [lerp(a[0], b[0], u), y1]; },
    ];
    for (let e = 0; e < 4; e++) {
      const inp = out;
      out = [];
      if (!inp.length) break;
      for (let i = 0; i < inp.length; i++) {
        const a = inp[(i + inp.length - 1) % inp.length], b = inp[i];
        const ina = edges[e](a), inb = edges[e](b);
        if (inb) {
          if (!ina) out.push(cut[e](a, b));
          out.push(b);
        } else if (ina) {
          out.push(cut[e](a, b));
        }
      }
    }
    return out;
  }

  // polyline point at arc fraction u, plus the unit tangent
  function polyAt(pts, u) {
    let total = 0;
    const segL = [];
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      segL.push(l);
      total += l;
    }
    let d = clamp(u) * total;
    for (let i = 0; i < segL.length; i++) {
      if (d <= segL[i] || i === segL.length - 1) {
        const f = segL[i] > 0 ? clamp(d / segL[i]) : 0;
        const a = pts[i], b = pts[i + 1];
        return { x: lerp(a[0], b[0], f), y: lerp(a[1], b[1], f), tx: (b[0] - a[0]) / (segL[i] || 1), ty: (b[1] - a[1]) / (segL[i] || 1) };
      }
      d -= segL[i];
    }
    const n = pts.length - 1;
    return { x: pts[n][0], y: pts[n][1], tx: 1, ty: 0 };
  }

  function polyLen(pts) {
    let s = 0;
    for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return s;
  }

  function convexHull(pts) {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower = [];
    for (const q of p) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
      lower.push(q);
    }
    const upper = [];
    for (let i = p.length - 1; i >= 0; i--) {
      const q = p[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
      upper.push(q);
    }
    lower.pop();
    upper.pop();
    return lower.concat(upper);
  }

  // ---------------------------------------------------------------------------
  // scale-aware drawing: V describes how a layer sits on screen
  //   V.k   screen px per local px     V.ws  local width multiplier (keeps pens near their nominal size)
  //   V.x0..V.y1  visible local rectangle, for culling
  // ---------------------------------------------------------------------------

  function makeView(m, card, tt, f, bi) {
    const k = m.k;
    const ws = k >= 1 ? Math.pow(k, -0.8) : Math.pow(k, -0.5);
    let x0 = (-8 - m.ox) / k, y0 = (-8 - m.oy) / k, x1 = (FW + 8 - m.ox) / k, y1 = (FH + 8 - m.oy) / k;
    if (card) {
      x0 = Math.max(x0, 0);
      y0 = Math.max(y0, 0);
      x1 = Math.min(x1, FW);
      y1 = Math.min(y1, FH);
    }
    return { k, ws, x0, y0, x1, y1, tt, f, bi, card };
  }
  const viewPts = (V, pad = 20) => [[V.x0 - pad, V.y0 - pad], [V.x1 + pad, V.y0 - pad], [V.x1 + pad, V.y1 + pad], [V.x0 - pad, V.y1 + pad]];
  const viewBounds = (V, pad = 20) => ({ x: V.x0 - pad, y: V.y0 - pad, w: V.x1 - V.x0 + 2 * pad, h: V.y1 - V.y0 + 2 * pad });
  const vis = (V, x0, y0, x1, y1, pad = 0) => !(x1 < V.x0 - pad || x0 > V.x1 + pad || y1 < V.y0 - pad || y0 > V.y1 + pad);
  const visPts = (V, pts, pad = 0) => {
    const b = LIB.bounds(pts);
    return vis(V, b.x, b.y, b.x + b.w, b.y + b.h, pad);
  };

  function ink(ctx, V, pts, o = {}) {
    const ws = V.ws;
    const w = (o.width != null ? o.width : 3) * ws;
    const q = Object.assign({}, o, {
      width: w,
      wobble: (o.wobble != null ? o.wobble : 2) * ws,
      tremble: (o.tremble != null ? o.tremble : 0.4) * ws,
      boilAmp: (o.boilAmp != null ? o.boilAmp : 0.7) * ws,
      rough: (o.rough != null ? o.rough : 0.22 + 0.07 * (o.width != null ? o.width : 3)) * ws,
      step: (o.step || 2.5) * Math.max(1, ws * 0.8),
    });
    const tp = o.taper != null ? o.taper : o.closed ? [10, 22] : [18, 34];
    q.taper = Array.isArray(tp) ? [tp[0] * ws, tp[1] * ws] : tp * ws;
    if (o.double) {
      const d = o.double === true ? {} : Object.assign({}, o.double);
      if (d.offset == null) d.offset = (w / 2 + 3 * ws) * (sd('dbl', pts.length) & 1 ? 1 : -1);
      q.double = d;
    }
    LIB.inkPath(ctx, pts, q);
  }

  function hatchV(ctx, V, clip, o = {}) {
    const ws = V.ws;
    const q = Object.assign({}, o, {
      width: (o.width != null ? o.width : 1.4) * ws,
      boilAmp: (o.boilAmp != null ? o.boilAmp : 0.45) * ws,
      bow: (o.bow != null ? o.bow : 0.7) * ws,
      inset: (o.inset != null ? o.inset : 6) * ws,
      overshoot: (o.overshoot != null ? o.overshoot : 3) * ws,
    });
    LIB.hatch(ctx, clip, q);
  }

  function stippleV(ctx, V, clip, o = {}) {
    const ws = V.ws;
    const r = o.r || [1.0, 2.2];
    LIB.stipple(ctx, clip, Object.assign({}, o, { r: [r[0] * ws, r[1] * ws], boilAmp: (o.boilAmp != null ? o.boilAmp : 0.35) * ws }));
  }

  // plain stroke helper for many thin lines (hairs, grass, graticule)
  function strokePath(ctx, V, path, color, width, alpha = 1, dash = null) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width * V.ws;
    ctx.globalAlpha *= alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dash) ctx.setLineDash(dash.map((d) => d * V.ws));
    ctx.stroke(path);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // G5 hero adult from above (drawn in G5 coordinates: thorax (540, 900), span 920)
  // Wing outlines, cells and veins use the same G5 construction as shot 01 so the female matches.
  // ---------------------------------------------------------------------------

  const FORE = {
    margin: [
      [552, 872], [600, 846], [690, 797], [790, 741], [890, 685], [952, 651], [986, 636], [1003, 641],
      [1009, 660], [1003, 702], [980, 770], [945, 843], [901, 918], [853, 976], [808, 1005], [781, 1011],
      [758, 1007], [700, 988], [640, 962], [588, 935], [557, 919],
    ],
    cell: [[570, 893], [640, 873], [720, 846], [800, 815], [797, 844], [790, 872], [740, 884], [660, 896], [584, 906]],
    corners: { top: [800, 815], bottom: [790, 872] },
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
    corners: { top: [735, 1016], bottom: [714, 1076] },
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
    const margin = LIB.smoothPts(def.margin, true, 4);
    const cell = LIB.smoothPts(def.cell, true, 4);
    const n = margin.length, nc = cell.length;
    const veins = def.veins.map((v) => {
      const oi = nearestIdx(cell, v.o), ei = nearestIdx(margin, v.e);
      const o = cell[oi], e = margin[ei];
      const dx = e[0] - o[0], dy = e[1] - o[1];
      const len = Math.hypot(dx, dy) || 1;
      const mid = [(o[0] + e[0]) / 2 - (dy / len) * v.bow, (o[1] + e[1]) / 2 + (dx / len) * v.bow];
      return { n: v.n, oi, ei, o, e, pts: LIB.smoothPts([o, mid, e], false, 5), w0: v.w0 };
    });
    const byName = {};
    for (const v of veins) byName[v.n] = v;
    const seq = [{ oi: 0, ei: 0, o: cell[0], e: margin[0], pts: [cell[0], margin[0]] }, ...veins, { oi: nc - 1, ei: n - 1, o: cell[nc - 1], e: margin[n - 1], pts: [cell[nc - 1], margin[n - 1]] }];
    const cells = [];
    for (let k = 0; k < seq.length - 1; k++) {
      const A = seq[k], B = seq[k + 1];
      const poly = A.pts.slice();
      for (let i = A.ei + 1; i < B.ei; i++) poly.push(margin[i]);
      for (let i = B.pts.length - 1; i >= 0; i--) poly.push(B.pts[i]);
      for (let i = B.oi - 1; i > A.oi; i--) poly.push(cell[i]);
      cells.push({ poly, a: [A.o, A.e], b: [B.o, B.e] });
    }
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
        const d = Math.min(Math.abs(i - v.ei), n - Math.abs(i - v.ei)) * 4;
        w += 9 * Math.exp(-(d * d) / 169) * (w > 20 ? 1 : 0.4);
      }
      w += 1.6 * LIB.noise1(i * 0.21, sd('band', isFore ? 1 : 2));
      inner.push([margin[i][0] - ty * w, margin[i][1] + tx * w]);
    }
    const spots = [];
    const r = LIB.rng(sd('spots', isFore ? 1 : 2));
    const ends = (isFore ? ['R5', 'M1', 'M2', 'M3', 'Cu1', 'Cu2'] : ['Sc', 'Rs', 'M1', 'M2', 'M3', 'Cu1', 'Cu2', '1A']).map((k) => byName[k].ei);
    if (isFore) ends.unshift(nearestIdx(margin, def.marks.apex));
    else ends.push(nearestIdx(margin, def.marks.inner));
    const spotAt = (fi, inset, rad, e) => {
      const i = Math.round(fi);
      const p = margin[i], q = inner[i];
      const dx = q[0] - p[0], dy = q[1] - p[1];
      const dl = Math.hypot(dx, dy) || 1;
      spots.push({ x: p[0] + (dx / dl) * inset, y: p[1] + (dy / dl) * inset, r: rad, e, a: Math.atan2(dy, dx), c: 'w' });
    };
    for (let k = 0; k < ends.length - 1; k++) {
      const i0 = ends[k], span = ends[k + 1] - i0;
      if (span < 6) continue;
      spotAt(i0 + span * 0.5, 25, r.range(5.2, 6.2), 1.25);
      spotAt(i0 + span * 0.3, 10, r.range(3.6, 4.3), 1.1);
      spotAt(i0 + span * 0.7, 10, r.range(3.6, 4.3), 1.1);
    }
    let apexPatch = null;
    if (isFore) {
      const on = (name, u) => byName[name].pts[Math.round((byName[name].pts.length - 1) * u)];
      const mid = (a, b, u) => {
        const p = on(a, u), q = on(b, u);
        return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      };
      const between = (a, b, u, rad, e, c) => {
        const A = byName[a], B = byName[b];
        const pa = on(a, u), pb = on(b, u);
        const dir = Math.atan2(A.e[1] - A.o[1] + B.e[1] - B.o[1], A.e[0] - A.o[0] + B.e[0] - B.o[0]);
        spots.push({ x: (pa[0] + pb[0]) / 2, y: (pa[1] + pb[1]) / 2, r: Math.min(rad, Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) * 0.3), e, a: dir, c });
      };
      between('R1', 'R2', 0.86, 7, 1.7, 'w');
      between('R2', 'R3', 0.86, 8, 1.8, 'w');
      between('R3', 'R4', 0.84, 8, 1.8, 'w');
      between('R4', 'R5', 0.82, 8, 1.7, 'w');
      between('R5', 'M1', 0.78, 7, 1.6, 'w');
      between('R3', 'R4', 0.6, 10, 1.7, 'o');
      between('R4', 'R5', 0.58, 12, 1.8, 'o');
      between('R5', 'M1', 0.56, 12, 1.8, 'o');
      const seqA = [
        on('R1', 0.62), mid('R1', 'R2', 0.72), on('R2', 0.36), mid('R2', 'R3', 0.46), on('R3', 0.26), mid('R3', 'R4', 0.42),
        on('R4', 0.2), mid('R4', 'R5', 0.4), on('R5', 0.22), mid('R5', 'M1', 0.42), on('M1', 0.3), mid('M1', 'M2', 0.62), on('M2', 0.72),
      ];
      apexPatch = LIB.smoothPts(seqA, false, 5).concat([[1070, 870], [1070, 560], [760, 600]]);
    }
    const iTop = nearestIdx(cell, def.corners.top), iBot = nearestIdx(cell, def.corners.bottom);
    return { margin, cell, veins, cells, outer: margin, inner, spots, apexPatch, isFore, iTop, iBot };
  }

  function mirrorWing(W) {
    const M = (p) => [1080 - p[0], p[1]];
    const MA = (a) => a.map(M);
    return {
      margin: MA(W.margin), cell: MA(W.cell), outer: MA(W.outer), inner: MA(W.inner),
      veins: W.veins.map((v) => ({ n: v.n, pts: MA(v.pts), w0: v.w0 })),
      cells: W.cells.map((c) => ({ poly: MA(c.poly), a: MA(c.a), b: MA(c.b) })),
      spots: W.spots.map((q) => Object.assign({}, q, { x: 1080 - q.x, a: Math.PI - q.a })),
      apexPatch: W.apexPatch ? MA(W.apexPatch) : null,
      isFore: W.isFore, iTop: W.iTop, iBot: W.iBot, mirror: true, base: [524, 900],
    };
  }

  let WINGS = null;
  function wings() {
    if (!WINGS) {
      const fr = buildWing(FORE, true), hr = buildWing(HIND, false);
      fr.base = hr.base = [556, 900];
      WINGS = { fr, hr, fl: mirrorWing(fr), hl: mirrorWing(hr) };
    }
    return WINGS;
  }

  function drawG5Wing(ctx, W, P, key, bi, lod = 1) {
    const L = LIB;
    fillPoly(ctx, W.margin, P.monarch);
    if (lod) {
      L.hatch(ctx, W.margin, {
        angle: W.isFore ? -0.55 : 0.7, spacing: 8, width: 1.5, color: P.monarchDeep, alpha: 0.85, length: [14, 44], seed: sd('wh', key),
        density: (x, y) => 0.7 * (1 - sstep(60, 280, Math.hypot(x - 540, y - 900))),
      });
    }
    L.stipple(ctx, W.margin, { spacing: 10, density: 0.4, r: [1.0, 1.5], color: P.monarchDeep, alpha: 0.6, seed: sd('scales', key) });
    // hairy wing base
    {
      const hr = L.rng(sd('basehair', key));
      const hp = new Path2D();
      const dir = W.mirror ? -1 : 1;
      const a0 = W.isFore ? -0.75 : -0.05, a1 = W.isFore ? 0.35 : 1.45;
      for (let i = 0; i < 60; i++) {
        const a = hr.range(a0, a1);
        const r0 = hr.range(-6, 26), l = hr.range(12, 42) * (1 - 0.4 * hr());
        const ca = Math.cos(a) * dir, sa = Math.sin(a);
        const x0 = W.base[0] + ca * r0, y0 = W.base[1] + sa * r0;
        const j = (L.h3(i, 7, bi) - 0.5) * 2;
        hp.moveTo(x0, y0);
        hp.lineTo(x0 + ca * l + j, y0 + sa * l + j);
      }
      ctx.save();
      ctx.beginPath();
      trace(ctx, W.margin, true);
      ctx.clip();
      ctx.strokeStyle = P.veinBlack;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.85;
      ctx.stroke(hp);
      if (W.apexPatch) L.inkPath(ctx, W.apexPatch, { closed: true, width: 3, color: P.veinBlack, fill: P.veinBlack, seed: sd('apex', key), wobble: 3 });
      ctx.restore();
    }
    const upper = W.cell.slice(0, W.iTop + 1);
    const lower = W.cell.slice(W.iBot).concat([W.cell[0]]).reverse();
    const vein = { color: P.veinBlack, taper: [0, 0], swell: 0, wobble: 0.8 };
    L.inkPath(ctx, upper, Object.assign({ width: 14, seed: sd('cu', key), pressure: (u) => lerp(1, 0.55, u) }, vein));
    L.inkPath(ctx, lower, Object.assign({ width: 14, seed: sd('cl', key), pressure: (u) => lerp(1, 0.55, u) }, vein));
    for (let k = 0; k < W.veins.length; k++) {
      const v = W.veins[k];
      L.inkPath(ctx, v.pts, {
        width: v.w0, color: P.veinBlack, seed: sd('v', key, k), taper: [0, 0], swell: 0, minWidth: 1, widthJitter: 0.18, wobble: 1,
        pressure: (u) => lerp(1, 8 / v.w0, Math.pow(u, 0.8)) * (u > 0.88 ? 1 + (u - 0.88) * 3 : 1),
      });
    }
    // black border band
    ctx.save();
    ctx.beginPath();
    trace(ctx, W.margin, true);
    ctx.clip();
    const band = new Path2D();
    const n = W.outer.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      band.moveTo(W.outer[i][0], W.outer[i][1]);
      band.lineTo(W.outer[j][0], W.outer[j][1]);
      band.lineTo(W.inner[j][0], W.inner[j][1]);
      band.lineTo(W.inner[i][0], W.inner[i][1]);
      band.closePath();
    }
    ctx.fillStyle = P.veinBlack;
    ctx.fill(band, 'nonzero');
    ctx.restore();
    const white = new Path2D(), orange = new Path2D();
    for (const q of W.spots) {
      const p = q.c === 'o' ? orange : white;
      const ca = Math.cos(q.a), sa = Math.sin(q.a);
      for (let m = 0; m <= 14; m++) {
        const b = (m / 14) * TAU;
        const lx = Math.cos(b) * q.r * q.e, ly = Math.sin(b) * q.r;
        const x = q.x + lx * ca - ly * sa, y = q.y + lx * sa + ly * ca;
        if (m === 0) p.moveTo(x, y);
        else p.lineTo(x, y);
      }
      p.closePath();
    }
    ctx.fillStyle = P.spotWhite;
    ctx.fill(white);
    ctx.fillStyle = '#E58E3A';
    ctx.fill(orange);
    L.inkPath(ctx, W.margin, { closed: true, width: 5, color: P.ink, seed: sd('wo', key), wobble: 1.2, double: { alpha: 0.4, width: 0.3 } });
  }

  const ABDOMEN = (() => {
    const prof = [[944, 17], [962, 21.5], [990, 23.5], [1025, 22], [1055, 18], [1080, 12.5], [1098, 7], [1110, 0]];
    const right = prof.map(([y, w]) => [540 + w, y]);
    const left = prof.slice(0, -1).reverse().map(([y, w]) => [540 - w, y]);
    return LIB.smoothPts(right.concat(left), true, 4);
  })();

  function drawG5Legs(ctx, P) {
    const L = LIB;
    for (const side of [-1, 1]) {
      const legs = [[[531, 902], [476, 866], [438, 930], [428, 952]], [[533, 928], [470, 954], [436, 1022], [430, 1044]]];
      for (let k = 0; k < 2; k++) {
        const pts = legs[k].map((p) => [side < 0 ? p[0] : 1080 - p[0], p[1]]);
        L.inkPath(ctx, pts, { width: 3.2, color: P.veinBlack, seed: sd('leg', k, side), smooth: false, taper: [0, 10], wobble: 0.5 });
      }
    }
  }

  function drawG5Body(ctx, P, bi, splay) {
    const L = LIB;
    L.inkPath(ctx, ABDOMEN, { closed: true, width: 4, color: P.ink, fill: P.veinBlack, seed: sd('abd'), wobble: 0.8 });
    const seg = new Path2D();
    for (let k = 0; k < 7; k++) {
      const y = 968 + k * 19;
      const w = y < 1055 ? 20 : lerp(18, 6, (y - 1055) / 50);
      seg.moveTo(540 - w, y - 4);
      seg.quadraticCurveTo(540, y + 5, 540 + w, y - 4);
    }
    ctx.save();
    ctx.strokeStyle = '#5E4A3C';
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.9;
    ctx.stroke(seg);
    ctx.restore();
    L.hatch(ctx, ABDOMEN, { angle: 0.25, spacing: 5, width: 1.1, color: '#6B5646', alpha: 0.75, length: [6, 14], seed: sd('abdh'), density: (x) => 0.9 * (1 - sstep(530, 546, x)) });
    const th = L.ellipsePts(540, 900, 38, 56, 48);
    const hair = new Path2D();
    const hr = L.rng(sd('hair', bi));
    for (let k = 0; k < 70; k++) {
      const a = (k / 70) * TAU + hr.range(-0.03, 0.03);
      const x0 = 540 + Math.cos(a) * 36, y0 = 900 + Math.sin(a) * 53;
      const l = hr.range(5, 10);
      hair.moveTo(x0, y0);
      hair.lineTo(x0 + Math.cos(a + hr.range(-0.3, 0.3)) * l, y0 + Math.sin(a + hr.range(-0.3, 0.3)) * l);
    }
    ctx.save();
    ctx.strokeStyle = P.veinBlack;
    ctx.lineWidth = 1.6;
    ctx.stroke(hair);
    ctx.restore();
    L.inkPath(ctx, th, { closed: true, width: 5, color: P.ink, fill: P.veinBlack, seed: sd('thorax'), wobble: 1 });
    L.hatch(ctx, th, { angle: -0.9, spacing: 5, width: 1.1, color: '#6B5646', alpha: 0.7, length: [5, 12], seed: sd('thh'), density: (x, y) => 0.95 * (1 - sstep(-0.2, 0.6, ((x - 540) / 38 + (y - 900) / 56) * 0.7)) });
    const dots = (list) => {
      ctx.fillStyle = P.spotWhite;
      ctx.beginPath();
      for (const [x, y, r] of list) {
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, TAU);
      }
      ctx.fill();
    };
    dots([[523, 853, 3.2], [557, 853, 3.2], [533, 862, 2.4], [547, 862, 2.4], [508, 880, 2.8], [572, 880, 2.8], [512, 915, 2.4], [568, 915, 2.4], [520, 940, 2], [560, 940, 2]]);
    for (const side of [-1, 1]) {
      const bx = 540 + side * 9, by = 806;
      const club = side < 0 ? [470, 660] : [610, 660];
      const vx = club[0] - bx, vy = club[1] - by;
      const c = Math.cos(splay * side), s = Math.sin(splay * side);
      const rx = vx * c - vy * s, ry = vx * s + vy * c;
      const ex = bx + rx, ey = by + ry;
      const len = Math.hypot(rx, ry);
      const dx = rx / len, dy = ry / len;
      const mid = [bx + rx * 0.5 + side * 7 * dy, by + ry * 0.5 - side * 7 * dx];
      L.inkPath(ctx, [[bx, by], mid, [ex - dx * 14, ey - dy * 14]], { width: 4, color: P.veinBlack, seed: sd('ant', side), taper: [2, 0], minWidth: 0.8, swell: 0, wobble: 0.6 });
      L.inkPath(ctx, L.ellipsePts(ex, ey, 7, 17, 20, Math.atan2(dy, dx) - Math.PI / 2), { closed: true, width: 2, color: P.ink, fill: P.veinBlack, seed: sd('club', side), wobble: 0.4 });
    }
    for (const side of [-1, 1]) {
      L.inkPath(ctx, [[540 + side * 6, 808], [540 + side * 8, 792], [540 + side * 7, 780]], { width: 7, color: P.veinBlack, seed: sd('palp', side), taper: [0, 8], wobble: 0.4 });
    }
    L.inkPath(ctx, L.ellipsePts(540, 832, 27, 28, 36), { closed: true, width: 4, color: P.ink, fill: P.veinBlack, seed: sd('head'), wobble: 0.6 });
    for (const side of [-1, 1]) {
      const ex = 540 + side * 25, ey = 826;
      L.inkPath(ctx, L.ellipsePts(ex, ey, 16, 18, 30), { closed: true, width: 3, color: P.ink, fill: '#17110D', seed: sd('eye', side), wobble: 0.5 });
      L.stipple(ctx, L.ellipsePts(ex, ey, 13, 15, 20), { spacing: 5, density: 0.8, r: [0.8, 1.1], color: '#6A5646', alpha: 0.6, seed: sd('facet', side) });
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(ex - 5, ey - 7, 5, 3, -0.6, 0, TAU);
      ctx.fillStyle = P.spotWhite;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.restore();
    }
    dots([[540, 814, 2.6], [532, 844, 2.2], [548, 844, 2.2], [530, 806, 1.8], [550, 806, 1.8], [540, 796, 1.8]]);
  }

  // ---------------------------------------------------------------------------
  // a small monarch glyph from above for the far layers (screen or local units)
  //   size = wingspan, flap = 0..1 span of the current drawing, rot = heading (0 = head up)
  // ---------------------------------------------------------------------------

  function miniMonarch(ctx, x, y, size, flap, rot, P, seed, detail = 1, opts = {}) {
    if (size < 1.2) return;
    const fill = opts.fill || P.monarch;
    const doStroke = opts.stroke !== false;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const s = size / 920;
    ctx.scale(s, s);
    ctx.translate(-540, -900);
    if (size < 17) {
      // at this size a bold orange wing pair with a dark rim and body reads better than detail
      const sp = Math.max(0.45, flap);
      ctx.beginPath();
      ctx.ellipse(540 - 250 * sp, 860, 250 * sp, 190, -0.35, 0, TAU);
      ctx.ellipse(540 + 250 * sp, 860, 250 * sp, 190, 0.35, 0, TAU);
      ctx.ellipse(540 - 170 * sp, 1060, 170 * sp, 150, 0.4, 0, TAU);
      ctx.ellipse(540 + 170 * sp, 1060, 170 * sp, 150, -0.4, 0, TAU);
      ctx.fillStyle = fill;
      ctx.fill();
      if (doStroke) {
        ctx.lineWidth = 0.75 / s;
        ctx.strokeStyle = P.veinBlack;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(540, 760);
      ctx.lineTo(540, 1120);
      ctx.lineWidth = 1.6 / s;
      ctx.strokeStyle = P.veinBlack;
      ctx.stroke();
      ctx.restore();
      return;
    }
    if (size < 0) {
      ctx.beginPath();
      ctx.ellipse(540, 930, 460 * Math.max(0.35, flap), 300, 0, 0, TAU);
      ctx.fillStyle = P.monarch;
      ctx.fill();
      ctx.lineWidth = 1.1 / s;
      ctx.strokeStyle = P.veinBlack;
      ctx.stroke();
      ctx.restore();
      return;
    }
    const W = wings();
    const sx = Math.max(0.08, flap);
    ctx.translate(540, 0);
    ctx.scale(sx, 1);
    ctx.translate(-540, 0);
    const lw = Math.max(1.1, size / 40) / s;
    for (const key of ['hl', 'hr', 'fl', 'fr']) {
      const w = W[key];
      ctx.beginPath();
      trace(ctx, key[0] === 'f' ? FORE_SIMPLE[key] : HIND_SIMPLE[key], true);
      ctx.fillStyle = P.monarch;
      ctx.fill();
      if (detail && size >= 14) {
        // black border and a few vein strokes
        ctx.save();
        ctx.clip();
        ctx.strokeStyle = P.veinBlack;
        ctx.lineWidth = 90;
        ctx.beginPath();
        trace(ctx, key[0] === 'f' ? FORE_SIMPLE[key] : HIND_SIMPLE[key], true);
        ctx.stroke();
        ctx.lineWidth = Math.max(18, lw * 0.7);
        ctx.beginPath();
        for (const v of w.veins) {
          if (v.n === 'R1' || v.n === 'R2' || v.n === 'M2' || v.n === 'Rs' || v.n === 'M3') continue;
          trace(ctx, [v.pts[0], v.pts[v.pts.length - 1]], false);
        }
        ctx.stroke();
        if (size >= 24) {
          ctx.fillStyle = P.spotWhite;
          ctx.beginPath();
          for (const q of w.spots) {
            if (q.c !== 'w' || q.r < 5) continue;
            ctx.moveTo(q.x + 14, q.y);
            ctx.arc(q.x, q.y, 14, 0, TAU);
          }
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.lineWidth = lw;
      ctx.strokeStyle = P.ink;
      ctx.beginPath();
      trace(ctx, key[0] === 'f' ? FORE_SIMPLE[key] : HIND_SIMPLE[key], true);
      ctx.stroke();
    }
    ctx.restore();
    // body stays full width
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = P.veinBlack;
    ctx.beginPath();
    ctx.ellipse(0, size * 0.06, size * 0.045, size * 0.16, 0, 0, TAU);
    ctx.fill();
    if (size >= 14) {
      ctx.beginPath();
      ctx.arc(0, -size * 0.075, size * 0.035, 0, TAU);
      ctx.fill();
      ctx.lineWidth = Math.max(0.8, size / 60);
      ctx.strokeStyle = P.veinBlack;
      ctx.beginPath();
      ctx.moveTo(-size * 0.01, -size * 0.1);
      ctx.lineTo(-size * 0.08, -size * 0.26);
      ctx.moveTo(size * 0.01, -size * 0.1);
      ctx.lineTo(size * 0.08, -size * 0.26);
      ctx.stroke();
    }
    ctx.restore();
  }

  const FORE_SIMPLE = {
    fr: FORE.margin.filter((_, i) => i % 2 === 0),
    fl: FORE.margin.filter((_, i) => i % 2 === 0).map((p) => [1080 - p[0], p[1]]),
  };
  const HIND_SIMPLE = {
    hr: HIND.margin.filter((_, i) => i % 2 === 0),
    hl: HIND.margin.filter((_, i) => i % 2 === 0).map((p) => [1080 - p[0], p[1]]),
  };

  // ---------------------------------------------------------------------------
  // L2 geometry: the autumn milkweed plant, side view, local 1080x1920
  // ---------------------------------------------------------------------------

  function leafGeom(bx, by, tx, ty, width, key, droop = 0) {
    const len = Math.hypot(tx - bx, ty - by);
    const ux = (tx - bx) / len, uy = (ty - by) / len;
    let nx = -uy, ny = ux;
    if (ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    const pet = Math.min(30, len * 0.1);
    const blade = len - pet;
    const r = LIB.rng(sd('leaf', key));
    // broad oval ~2:1, rounded base, short apical point
    const shape = (u) => {
      const uu = clamp(u);
      const x = (uu - 0.46) / 0.52;
      let w = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x), 2.15)), 0.48);
      if (uu < 0.08) w *= Math.sin((uu / 0.08) * Math.PI / 2);
      if (uu > 0.9) w *= Math.pow((1 - uu) / 0.1, 0.55);
      return w;
    };
    const bendAt = (u) => (width * 0.09 + droop) * 4 * u * (1 - u) - droop * u * u;
    const at = (u, v) => [bx + ux * (pet + u * blade) + nx * (v + bendAt(u)), by + uy * (pet + u * blade) + ny * (v + bendAt(u))];
    const N = 48;
    const upper = [], lower = [], mid = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const hw = (width / 2) * shape(u) * (1 + 0.035 * LIB.noise1(u * 7, sd('leafedge', key)));
      upper.push(at(u, hw));
      lower.push(at(u, -hw * 0.94));
      mid.push(at(u, 0));
    }
    const outline = upper.concat(lower.slice(1, N).reverse());
    const upperHalf = upper.concat(mid.slice(1, N).reverse());
    const lowerHalf = lower.concat(mid.slice(1, N).reverse());
    const veins = [];
    for (let k = 0; k < 5; k++) {
      const u0 = 0.12 + k * 0.15 + r.range(-0.01, 0.01);
      const u1 = Math.min(0.985, u0 + 0.16);
      for (const side of [1, -1]) {
        const hw = (width / 2) * shape(u1) * 0.88;
        veins.push({ side, u0, pts: [at(u0, 0), at(u0 + 0.045, side * hw * 0.55), at(u1, side * hw)] });
      }
    }
    const angOf = (side) => {
      const v = veins.find((q) => q.side === side && q.u0 > 0.3);
      return Math.atan2(v.pts[2][1] - v.pts[0][1], v.pts[2][0] - v.pts[0][0]);
    };
    const uOf = (x, y) => ((x - bx) * ux + (y - by) * uy - pet) / blade;
    const vOf = (x, y) => {
      const u = clamp(uOf(x, y));
      return ((x - bx) * nx + (y - by) * ny - bendAt(u)) / Math.max(1, (width / 2) * shape(u));
    };
    return { key, outline, upperHalf, lowerHalf, mid, veins, at, uOf, vOf, base: [bx, by], tip: [tx, ty], ux, uy, nx, ny, width, blade, pet, angUpper: angOf(1), angLower: angOf(-1), shape };
  }

  const STEM_BASE = [578, 1920];
  const STEM = [[586, 2480], [578, 1945], [573, 1700], [566, 1450], [558, 1200], [551, 960], [546, 722], [542, 560], [540, 430], [539, 322]];
  function stemX(y) {
    for (let i = 1; i < STEM.length; i++) {
      if (y >= STEM[i][1]) return lerp(STEM[i][0], STEM[i - 1][0], (y - STEM[i][1]) / (STEM[i - 1][1] - STEM[i][1]));
    }
    return STEM[STEM.length - 1][0];
  }
  const stemW = (y) => lerp(13, 30, clamp((y - 322) / 1620));

  // pairs bottom to top: node y, left tip, right tip, width, autumn yellowing, droop
  const PAIRS = [
    { y: 1748, l: [150, 1812], r: [1000, 1796], w: 150, aut: 0.9, droop: 34 },
    { y: 1528, l: [150, 1452], r: [985, 1480], w: 152, aut: 0.62, droop: 14 },
    { y: 1306, l: [182, 1196], r: [962, 1222], w: 144, aut: 0.46, droop: 4 },
    { y: 1098, l: [216, 978], r: [912, 1004], w: 134, aut: 0.3, droop: 0 },
    { y: 906, l: [252, 792], r: [862, 810], w: 124, aut: 0.2, droop: 0 },
    { y: 722, l: [322, 546], r: [806, 614], w: 118, aut: 0.12, droop: 0 },
  ];
  // neighbouring plants just outside the L2 frame, seen while the frame drifts back
  const NEIGHBOURS = [
    { x: -330, top: 820, pairs: [2150, 1860, 1570, 1290, 1030], len: 330, w: 140, aut: 0.55, key: 'nl' },
    { x: 1430, top: 1010, pairs: [2200, 1930, 1660, 1400, 1180], len: 320, w: 136, aut: 0.4, key: 'nr' },
  ];
  const NEIGHBOUR_LEAVES = [];
  NEIGHBOURS.forEach((nb) => {
    nb.pairs.forEach((y, i) => {
      const L = nb.len * (1 - i * 0.08);
      NEIGHBOUR_LEAVES.push(Object.assign(leafGeom(nb.x - 7, y, nb.x - L * 0.93, y - L * 0.36, nb.w * (1 - i * 0.06), nb.key + 'l' + i, i < 2 ? 20 : 0), { aut: nb.aut + (i < 2 ? 0.25 : 0) }));
      NEIGHBOUR_LEAVES.push(Object.assign(leafGeom(nb.x + 7, y + 5, nb.x + L * 0.93, y - L * 0.33, nb.w * (1 - i * 0.06), nb.key + 'r' + i, i < 2 ? 20 : 0), { aut: nb.aut * 0.8 + (i < 2 ? 0.25 : 0) }));
    });
  });
  const LEAVES = [];
  PAIRS.forEach((pr, i) => {
    const x = stemX(pr.y);
    LEAVES.push(Object.assign(leafGeom(x - 6, pr.y, pr.l[0], pr.l[1], pr.w, 'L' + i, pr.droop), { pair: i, side: -1, aut: pr.aut }));
    LEAVES.push(Object.assign(leafGeom(x + 6, pr.y + 4, pr.r[0], pr.r[1], pr.w * 0.96, 'R' + i, pr.droop), { pair: i, side: 1, aut: pr.aut * 0.85 }));
  });
  const TOP_LEAF = LEAVES[10];
  const PERCH = TOP_LEAF.at(0.9, 0);

  // ---------------------------------------------------------------------------
  // layers, embeddings and the camera
  // ---------------------------------------------------------------------------

  const NOM = [1, 0.05, 0.0075, 0.0015, 0.0003];
  const END_Z = 0.0003 * 0.94;
  const BEAT = [0, 0.5, 1.5, 2.0, 2.5, 3.0];
  // layer i local x maps to layer i+1 local as P[i] + S[i] * (x - Q[i])
  const S = [NOM[1] / NOM[0], NOM[2] / NOM[1], NOM[3] / NOM[2], NOM[4] / NOM[3]];
  const Q = [[540, 960], [540, 960], [540, 960], [540, 960]];
  const P = [PERCH, [540, 960], [540, 960], [756, 666]];
  // fixed screen point of each segment's zoom; the last one is the gentle drift after the map lands
  const FIX = [0, 1, 2, 3].map((j) => [(P[j][0] - S[j] * Q[j][0]) / (1 - S[j]), (P[j][1] - S[j] * Q[j][1]) / (1 - S[j])]);
  FIX.push([470, 1040]);

  // log-zoom ease per segment: e(u) is the normalised integral of v(u).
  // v holds a drift, ramps over 3 frames, then decays toward the beat.
  // Segment 0 holds frames 0-4 at <= 1.055x so the hero stays readable.
  const ZOOM_ACC = (() => {
    const out = [];
    const maxDv = 0.12;
    for (let seg = 0; seg < 5; seg++) {
      const F = Math.round((BEAT[seg + 1] - BEAT[seg]) * 24);
      const za = seg < 4 ? NOM[seg] : NOM[4];
      const zb = seg < 4 ? NOM[seg + 1] : END_Z;
      const L = Math.log(za) - Math.log(zb);
      const v = new Array(F);
      if (seg === 4) {
        let prev = 0;
        for (let f = 1; f <= F; f++) {
          const e = 1 - (1 - f / F) * (1 - f / F);
          v[f - 1] = (e - prev) * L;
          prev = e;
        }
      } else if (seg === 0) {
        const vHold = Math.log(1.055);
        const holdN = 4;
        for (let f = 0; f < holdN; f++) v[f] = vHold;
        v[4] = vHold + maxDv;
        v[5] = vHold + 2 * maxDv;
        v[6] = vHold + 3 * maxDv;
        let used = 0;
        for (let f = 0; f < 7; f++) used += v[f];
        const rest = F - 7;
        const first = v[6];
        const last = (2 * (L - used)) / rest - first;
        for (let k = 0; k < rest; k++) v[7 + k] = first + (last - first) * (k / (rest - 1));
      } else {
        const u0 = Math.max(0, F - 10);
        const rampN = 3;
        const drift = 0.55;
        const decayK = 2.5;
        let restS = 0;
        const sh = [];
        for (let f = 0; f < F; f++) {
          const ramp = sstep(u0, u0 + rampN, f + 0.5);
          const sArr = clamp((f + 0.5 - u0) / Math.max(1e-6, F - u0));
          const decay = Math.pow(2, -decayK * sArr);
          sh[f] = drift + (1 - drift) * ramp * decay;
          restS += sh[f];
        }
        const k = L / restS;
        for (let f = 0; f < F; f++) v[f] = sh[f] * k;
      }
      const acc = [0];
      let s = 0;
      for (let f = 0; f < F; f++) {
        s += v[f];
        acc.push(s / L);
      }
      acc[F] = 1;
      out.push(acc);
    }
    return out;
  })();

  function zoomEase(seg, u) {
    const acc = ZOOM_ACC[seg];
    const F = acc.length - 1;
    const x = clamp(u) * F;
    const i = Math.min(F - 1, Math.floor(x));
    return lerp(acc[i], acc[i + 1], x - i);
  }

  function logZoom(tt) {
    const t = clamp(tt, 0, 3);
    let i = 0;
    while (i < 4 && t >= BEAT[i + 1] - 1e-9) i++;
    const u = (t - BEAT[i]) / (BEAT[i + 1] - BEAT[i]);
    const za = i < 4 ? NOM[i] : NOM[4], zb = i < 4 ? NOM[i + 1] : END_Z;
    return Math.log(za) + (Math.log(zb) - Math.log(za)) * zoomEase(i, u);
  }

  // M[i] = { k, ox, oy }: screen = o + k * local, for every layer i
  function cameraAt(tt) {
    const t = clamp(tt, 0, 3);
    let j = 0;
    while (j < 4 && t >= BEAT[j + 1] - 1e-9) j++;
    const z = Math.exp(logZoom(t));
    const outer = Math.min(j + 1, 4);
    const k = z / NOM[outer];
    const F = FIX[j];
    const M = [];
    M[outer] = { k, ox: F[0] * (1 - k), oy: F[1] * (1 - k) };
    for (let i = outer - 1; i >= 0; i--) {
      const m = M[i + 1];
      M[i] = { k: m.k * S[i], ox: m.ox + m.k * (P[i][0] - S[i] * Q[i][0]), oy: m.oy + m.k * (P[i][1] - S[i] * Q[i][1]) };
    }
    for (let i = outer + 1; i < 5; i++) {
      const m = M[i - 1];
      const kk = m.k / S[i - 1];
      M[i] = { k: kk, ox: m.ox - kk * (P[i - 1][0] - S[i - 1] * Q[i - 1][0]), oy: m.oy - kk * (P[i - 1][1] - S[i - 1] * Q[i - 1][1]) };
    }
    return M;
  }
  const toScreen = (m, x, y) => [m.ox + m.k * x, m.oy + m.k * y];
  const CARD_INSET = [24, 42.7, 1032, 1834.6];
  function cardRect(m) {
    return { x: m.ox + CARD_INSET[0] * m.k, y: m.oy + CARD_INSET[1] * m.k, w: CARD_INSET[2] * m.k, h: CARD_INSET[3] * m.k };
  }

  // content alpha of each layer by camera frame: outer layers fade in over 4 frames as the inner
  // frame shrinks, inner layers fade out over 4 frames once small, leaving their yellow framing
  const FADE = [
    { inF: -1, outF: 5 },
    { inF: 2, outF: 30 },
    { inF: 26, outF: 42 },
    { inF: 38, outF: 54 },
    { inF: 50, outF: 999 },
  ];
  function layerAlpha(i, f) {
    const a = FADE[i];
    const ain = a.inF < 0 ? 1 : clamp((f - a.inF) / 4);
    const aout = 1 - clamp((f - a.outF) / 4);
    return Math.min(ain, aout);
  }

  // ---------------------------------------------------------------------------
  // the female's flight, in L2 local coordinates
  // ---------------------------------------------------------------------------

  const FLIGHT_KEYS = [
    [0.5, 0, 0], [0.583, -10, -16], [0.667, -30, -14], [0.75, -56, 0], [0.833, -86, 20],
    [0.917, -118, 44], [1.0, -152, 72], [1.125, -200, 112], [1.25, -246, 156], [1.375, -290, 196], [1.5, -330, 236],
  ].map(([t, dx, dy]) => [t, PERCH[0] + dx, PERCH[1] + dy]);

  function flightL2(t) {
    const K = FLIGHT_KEYS;
    if (t <= K[0][0]) return [K[0][1], K[0][2]];
    if (t <= K[K.length - 1][0]) {
      let i = 0;
      while (i < K.length - 2 && t > K[i + 1][0]) i++;
      const s = (t - K[i][0]) / (K[i + 1][0] - K[i][0]);
      const p0 = K[Math.max(0, i - 1)], p1 = K[i], p2 = K[i + 1], p3 = K[Math.min(K.length - 1, i + 2)];
      const cr = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * s + (2 * a - 5 * b + 4 * c - d) * s * s + (-a + 3 * b - 3 * c + d) * s * s * s);
      return [cr(p0[1], p1[1], p2[1], p3[1]), cr(p0[2], p1[2], p2[2], p3[2])];
    }
    // after she shrinks to a dot, hold a steady screen drift down-left and solve back into L2
    const end = K[K.length - 1];
    const m0 = cameraAt(1.5)[1];
    const s0 = toScreen(m0, end[1], end[2]);
    const d = 200 * (1 - Math.exp(-(t - 1.5) * 1.6));
    const sx = s0[0] - 0.74 * d, sy = s0[1] + 0.67 * d;
    const m = cameraAt(t)[1];
    return [(sx - m.ox) / m.k, (sy - m.oy) / m.k];
  }

  // ---------------------------------------------------------------------------
  // L1: the female on the top-left leaf tip, 20x the L2 drawing of the same leaf
  // ---------------------------------------------------------------------------

  const L1_RECT = [-160, -160, 1240, 2080];
  const toL1 = (p) => [540 + (p[0] - PERCH[0]) / S[0], 960 + (p[1] - PERCH[1]) / S[0]];
  const toL2from1 = (x, y) => [PERCH[0] + (x - 540) * S[0], PERCH[1] + (y - 960) * S[0]];

  // open runs of a polyline that fall inside a rectangle (so a huge outline can be inked in pieces)
  function runsInside(pts, closed, x0, y0, x1, y1) {
    const inside = (p) => p[0] >= x0 && p[0] <= x1 && p[1] >= y0 && p[1] <= y1;
    const n = pts.length;
    const runs = [];
    let start = 0;
    if (closed) {
      while (start < n && inside(pts[start])) start++;
      if (start === n) return [pts.concat([pts[0]])];
    }
    let cur = null;
    for (let c = 0; c <= n; c++) {
      if (!closed && c === n) break;
      const i = (start + c) % n;
      const p = pts[i];
      if (inside(p)) {
        if (!cur) {
          cur = [];
          const prev = pts[(i - 1 + n) % n];
          if (c > 0 || closed) cur.push(prev);
        }
        cur.push(p);
      } else if (cur) {
        cur.push(p);
        runs.push(cur);
        cur = null;
      }
    }
    if (cur) runs.push(cur);
    return runs;
  }

  const L1LEAF = (() => {
    const Lf = TOP_LEAF;
    const fine = (pts, closed) => LIB.smoothPts(pts, closed, 1.2).map(toL1);
    const outline = fine(Lf.outline, true);
    const [x0, y0, x1, y1] = L1_RECT;
    const clipP = (pts) => clipPolyRect(pts, x0, y0, x1, y1);
    const BIG = [-3200, -3200, 4300, 5100];
    const veins = Lf.veins.map((v) => ({ side: v.side, u0: v.u0, pts: LIB.smoothPts(v.pts, false, 3).map(toL1) })).filter((v) => {
      const b = LIB.bounds(v.pts);
      return !(b.x > BIG[2] || b.x + b.w < BIG[0] || b.y > BIG[3] || b.y + b.h < BIG[1]);
    });
    // reticulate tertiary veins: short wiggles joining neighbouring side veins
    const net = [];
    const r = LIB.rng(sd('net'));
    for (const side of [1, -1]) {
      const vs = Lf.veins.filter((v) => v.side === side);
      for (let k = 0; k < vs.length - 1; k++) {
        for (let m = 0; m < 5; m++) {
          const a = LIB.smoothPts(vs[k].pts, false, 3), b = LIB.smoothPts(vs[k + 1].pts, false, 3);
          const ua = r.range(0.25, 0.95), ub = clamp(ua + r.range(-0.12, 0.12));
          const pa = a[Math.floor(ua * (a.length - 1))], pb = b[Math.floor(ub * (b.length - 1))];
          const mx = (pa[0] + pb[0]) / 2 + r.range(-4, 4), my = (pa[1] + pb[1]) / 2 + r.range(-4, 4);
          const pts = [pa, [mx, my], pb].map(toL1);
          const bb = LIB.bounds(pts);
          if (bb.x > x1 || bb.x + bb.w < x0 || bb.y > y1 || bb.y + bb.h < y0) continue;
          net.push(pts);
        }
      }
    }
    // autumn browning creeping back from the leaf tip along its lower edge
    const patchC = Lf.at(0.955, 0.75 * (Lf.width / 2) * Lf.shape(0.955));
    const patch = LIB.ellipsePts(patchC[0], patchC[1], 9, 6, 28, Math.atan2(Lf.uy, Lf.ux)).map((p, i) => {
      const w = 1 + 0.25 * LIB.noise1(i * 0.7, sd('patch'));
      return [patchC[0] + (p[0] - patchC[0]) * w, patchC[1] + (p[1] - patchC[1]) * w];
    }).map(toL1);
    return {
      outline, poly: clipP(outline), polyBig: clipPolyRect(outline, BIG[0], BIG[1], BIG[2], BIG[3]),
      upper: clipP(fine(Lf.upperHalf, true)), lower: clipP(fine(Lf.lowerHalf, true)),
      upperBig: clipPolyRect(fine(Lf.upperHalf, true), BIG[0], BIG[1], BIG[2], BIG[3]),
      lowerBig: clipPolyRect(fine(Lf.lowerHalf, true), BIG[0], BIG[1], BIG[2], BIG[3]),
      mid: fine(Lf.mid, false),
      veins, net, patch,
    };
  })();

  const G5_TO_L1 = 820 / 920;
  const g5ToL1 = (p) => [540 + (p[0] - 540) * G5_TO_L1, 960 + (p[1] - 900) * G5_TO_L1];

  function drawL1(ctx, V, P) {
    const L = LIB;
    const Lf = TOP_LEAF;
    const LL = L1LEAF;
    // construction: the leaf axis run long, and the body axis
    ctx.save();
    const cons = { width: 1.5, color: P.inkFaint, alpha: 0.3, taper: [0, 0], wobble: 1.5, smooth: false, step: 8 };
    const a0 = toL1(Lf.at(-0.2, 0)), a1 = toL1(Lf.at(1.25, 0));
    ink(ctx, V, [a0, a1], Object.assign({ seed: sd('leafaxis') }, cons));
    ink(ctx, V, [[540, V.y0 - 60], [540, V.y1 + 60]], Object.assign({ seed: sd('axis1') }, cons));
    ctx.restore();

    const deep = L.mix(P.milkweedDeep, P.ink, 0.4);
    fillPoly(ctx, LL.polyBig, P.milkweed);
    const v2 = (x, y) => {
      const q = toL2from1(x, y);
      return { v: Lf.vOf(q[0], q[1]), u: Lf.uOf(q[0], q[1]) };
    };
    const hatchClipL = clipPolyRect(LL.lowerBig, V.x0 - 40, V.y0 - 40, V.x1 + 40, V.y1 + 40);
    const hatchClipU = clipPolyRect(LL.upperBig, V.x0 - 40, V.y0 - 40, V.x1 + 40, V.y1 + 40);
    if (hatchClipL.length > 2) hatchV(ctx, V, hatchClipL, {
      angle: Lf.angLower, spacing: 8, width: 1.6, color: P.milkweedDeep, alpha: 0.85, length: [18, 60], seed: sd('l1lh'),
      density: (x, y) => 0.55 + 0.4 * sstep(-0.05, -0.9, v2(x, y).v),
    });
    const lod = V.k >= 0.3 ? 1 : 0;
    if (hatchClipU.length > 2) hatchV(ctx, V, hatchClipU, {
      angle: Lf.angUpper, spacing: 8, width: 1.5, color: P.milkweedDeep, alpha: 0.7, length: [14, 40], seed: sd('l1uh'),
      density: (x, y) => 0.55 * (1 - sstep(0.04, 0.45, v2(x, y).v)),
    });
    if (V.k >= 0.5) {
      const stipClip = clipPolyRect(LL.polyBig, V.x0 - 20, V.y0 - 20, V.x1 + 20, V.y1 + 20);
      if (stipClip.length > 2) stippleV(ctx, V, stipClip, { spacing: 13, density: 0.85, r: [1.0, 1.7], color: P.milkweedPale, alpha: 0.65, seed: sd('l1hair') });
    }
    // butterfly shadow on the leaf, light from the upper left
    ctx.save();
    ctx.beginPath();
    trace(ctx, LL.poly, true);
    ctx.clip();
    const W = wings();
    const sh = new Path2D();
    for (const key of ['fl', 'fr', 'hl', 'hr']) {
      const pts = W[key].margin;
      for (let i = 0; i < pts.length; i += 3) {
        const q = g5ToL1(pts[i]);
        if (i === 0) sh.moveTo(q[0] + 26, q[1] + 36);
        else sh.lineTo(q[0] + 26, q[1] + 36);
      }
      sh.closePath();
    }
    LIB.hatch(ctx, sh, { bounds: { x: 100, y: 640, w: 900, h: 640 }, angle: -Math.PI / 4, spacing: 5, width: 1.4, color: P.ink, alpha: 0.6, seed: sd('bshadow'), boilAmp: 0.45 });
    ctx.restore();
    for (let k = 0; k < (V.k >= 0.5 ? LL.net.length : 0); k++) ink(ctx, V, LL.net[k], { width: 1.3, color: deep, alpha: 0.45, seed: sd('net', k), taper: [4, 8], wobble: 1.2 });
    for (let k = 0; k < LL.veins.length; k++) {
      if (!visPts(V, LL.veins[k].pts, 40)) continue;
      const vp = LL.veins[k].pts;
      ink(ctx, V, vp.map((q) => [q[0] + 3, q[1] + 5]), { width: 3, color: deep, alpha: 0.55, seed: sd('l1v3', k), taper: [10, 120], wobble: 2 });
      ink(ctx, V, vp, { width: 10, color: P.milkweedPale, alpha: 0.95, seed: sd('l1v', k), taper: [6, 160], wobble: 2, swell: 0 });
      ink(ctx, V, vp, { width: 1.4, color: P.inkSoft, alpha: 0.6, seed: sd('l1v2', k), taper: [20, 160], wobble: 2.4 });
    }
    const midRuns = runsInside(LL.mid, false, V.x0 - 60, V.y0 - 60, V.x1 + 60, V.y1 + 60);
    for (let k = 0; k < midRuns.length; k++) {
      ink(ctx, V, midRuns[k].map((q) => [q[0] + 4, q[1] + 8]), { width: 6, color: deep, alpha: 0.55, seed: sd('l1mid3', k), taper: [0, 80], wobble: 2, swell: 0 });
      ink(ctx, V, midRuns[k], { width: 30, color: P.milkweedPale, seed: sd('l1mid', k), taper: [0, 40], wobble: 1.6, swell: 0 });
      ink(ctx, V, midRuns[k].map((q) => [q[0] - 2, q[1] - 13]), { width: 1.8, color: P.inkSoft, alpha: 0.7, seed: sd('l1mid2', k), taper: [0, 80], wobble: 2 });
      ink(ctx, V, midRuns[k].map((q) => [q[0] + 2, q[1] + 13]), { width: 1.8, color: P.inkSoft, alpha: 0.8, seed: sd('l1mid4', k), taper: [0, 80], wobble: 2 });
    }
    const outRuns = runsInside(LL.outline, true, V.x0 - 60, V.y0 - 60, V.x1 + 60, V.y1 + 60);
    for (let k = 0; k < outRuns.length; k++) ink(ctx, V, outRuns[k], { width: 4.2, color: P.ink, seed: sd('l1out', k), taper: [0, 0], wobble: 2.2, double: { alpha: 0.4, width: 0.35 } });

    // the female, G5 scaled to an 820 px span about her thorax at (540, 960)
    ctx.save();
    ctx.translate(540, 960);
    ctx.scale(G5_TO_L1, G5_TO_L1);
    ctx.translate(-540, -900);
    const bi = V.bi;
    drawG5Legs(ctx, P);
    drawG5Wing(ctx, W.hl, P, 'hl', bi, lod);
    drawG5Wing(ctx, W.hr, P, 'hr', bi, lod);
    for (const [F, H, key] of [[W.fl, W.hl, 'fsl'], [W.fr, W.hr, 'fsr']]) {
      const shp = new Path2D();
      F.margin.forEach((p, i) => (i ? shp.lineTo(p[0] + 7, p[1] + 10) : shp.moveTo(p[0] + 7, p[1] + 10)));
      shp.closePath();
      ctx.save();
      ctx.beginPath();
      trace(ctx, H.margin, true);
      ctx.clip();
      LIB.hatch(ctx, shp, { bounds: { x: 60, y: 850, w: 960, h: 250 }, angle: -Math.PI / 4, spacing: 4, width: 1.3, color: P.veinBlack, alpha: 0.75, seed: sd(key) });
      ctx.restore();
    }
    drawG5Wing(ctx, W.fl, P, 'fl', bi, lod);
    drawG5Wing(ctx, W.fr, P, 'fr', bi, lod);
    const beat = Math.floor(V.tt / 0.5 + 1e-6);
    drawG5Body(ctx, P, bi, (beat % 2 ? 2 : 0) * (Math.PI / 180));
    ctx.restore();

    // construction: span circle and registration crosses on the scaled G5 points
    LIB.guideCircle(ctx, 540, 960, 470, { color: P.inkFaint, alpha: 0.3, width: 1.5 * V.ws });
    const marks = new Path2D();
    for (const g of [[80, 640], [1000, 640], [300, 1010], [780, 1010], [230, 1150], [850, 1150], [540, 1110], [540, 830]]) {
      const [x, y] = g5ToL1(g);
      marks.moveTo(x - 10, y);
      marks.lineTo(x + 10, y);
      marks.moveTo(x, y - 10);
      marks.lineTo(x, y + 10);
    }
    strokePath(ctx, V, marks, P.inkFaint, 1.5, 0.6);

    // floss seeds at ~20x, silk trailing opposite the up-right drift
    {
      const tw = LIB.onTwos(V.tt);
      const seeds = [
        { x: 240, y: 390, t0: -0.4, vx: 36, vy: -26, spin: 0.12, seed: 31 },
        { x: 800, y: 310, t0: -0.18, vx: 28, vy: -22, spin: -0.08, seed: 32 },
      ];
      for (const fs of seeds) {
        const age = tw - fs.t0;
        const x = fs.x + fs.vx * age;
        const y = fs.y + fs.vy * age;
        if (y < 190 || y > 560) continue;
        const rot = Math.atan2(fs.vy, fs.vx) + Math.PI + fs.spin * age;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        const fl = new Path2D();
        for (let k = 0; k < 48; k++) {
          const a = (k - 23.5) * 0.04;
          const len = 52 + 16 * LIB.h3(k, fs.seed, 5);
          fl.moveTo(2, 0);
          fl.quadraticCurveTo(Math.cos(a) * len * 0.5, Math.sin(a) * len * 0.5, Math.cos(a) * len, Math.sin(a) * len);
        }
        ctx.lineCap = 'round';
        ctx.strokeStyle = P.white;
        ctx.lineWidth = 1.2 * V.ws;
        ctx.globalAlpha *= 0.92;
        ctx.stroke(fl);
        ctx.globalAlpha /= 0.92;
        ctx.beginPath();
        ctx.ellipse(0, 0, 6, 9, 0, 0, TAU);
        ctx.fillStyle = P.ink;
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // L2: the whole plant
  // ---------------------------------------------------------------------------

  const PODS = [
    { key: 'podL', ped: [[542, 572], [506, 598], [466, 584], [446, 548]], base: [446, 548], tip: [392, 318], w: 84, open: -1 },
    { key: 'podR', ped: [[541, 482], [580, 506], [624, 500], [646, 468]], base: [646, 468], tip: [706, 262], w: 80, open: 1 },
  ].map((pd) => {
    const len = Math.hypot(pd.tip[0] - pd.base[0], pd.tip[1] - pd.base[1]);
    const ux = (pd.tip[0] - pd.base[0]) / len, uy = (pd.tip[1] - pd.base[1]) / len;
    const nx = -uy, ny = ux;
    const prof = (u) => Math.pow(Math.sin(Math.PI * Math.pow(clamp(u), 0.62)), 0.85) * (1 - 0.18 * u);
    const at = (u, v) => [pd.base[0] + ux * u * len + nx * v, pd.base[1] + uy * u * len + ny * v];
    const r = LIB.rng(sd(pd.key));
    const N = 40;
    const sideA = [], sideB = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const bump = 1 + 0.05 * Math.sin(u * 60 + r() * 0.3) * (u > 0.05 && u < 0.9 ? 1 : 0);
      sideA.push(at(u, (pd.w / 2) * prof(u) * bump));
      sideB.push(at(u, -(pd.w / 2) * prof(u) * bump));
    }
    const outline = sideA.concat(sideB.slice(1, N).reverse());
    // the split: a lens along the seam on the open side, showing the lining and the seed scales
    const lens = [];
    for (let i = 0; i <= 24; i++) {
      const u = lerp(0.2, 0.93, i / 24);
      lens.push(at(u, pd.open * (pd.w / 2) * prof(u) * lerp(0.05, 0.62, Math.sin(Math.PI * (i / 24)))));
    }
    for (let i = 23; i > 0; i--) {
      const u = lerp(0.2, 0.93, i / 24);
      lens.push(at(u, pd.open * (pd.w / 2) * prof(u) * -0.18 * Math.sin(Math.PI * (i / 24))));
    }
    const seeds = [];
    for (let row = 0; row < 9; row++) {
      for (let c = -1; c <= 1; c++) {
        const u = lerp(0.28, 0.86, row / 8) + c * 0.012;
        const v = pd.open * (pd.w / 2) * prof(u) * (0.2 + c * 0.16);
        if (LIB.polyContains(lens, ...at(u, v))) seeds.push({ p: at(u, v), a: Math.atan2(uy, ux) + c * 0.35 + r.range(-0.1, 0.1) });
      }
    }
    const warts = [];
    for (let i = 0; i < 46; i++) {
      const u = r.range(0.08, 0.9), v = r.range(-0.9, 0.9) * (pd.w / 2) * prof(u);
      const p = at(u, v);
      if (!LIB.polyContains(lens, p[0], p[1])) warts.push(p);
    }
    const mouth = at(0.9, pd.open * (pd.w / 2) * prof(0.9) * 0.3);
    return Object.assign(pd, { len, ux, uy, nx, ny, at, prof, outline, lens, seeds, warts, mouth, shadeSide: sideB });
  });

  // floss seeds released from the pod mouths, drifting up and right
  const FLOSS = (() => {
    const r = LIB.rng(sd('floss'));
    const out = [];
    for (let i = 0; i < 16; i++) {
      const pod = PODS[i % 2];
      out.push({
        pod, t0: r.range(-1.2, 2.6), vx: r.range(70, 150), vy: r.range(-150, -70), ph: r.range(0, TAU), size: r.range(0.8, 1.2), spin: r.range(-0.6, 0.6), seed: i,
      });
    }
    return out;
  })();

  function drawFlossSeed(ctx, V, P, x, y, size, rot, seed, strands) {
    const s = size * V.ws;
    const n = strands || 13;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    // tuft: fine silky filaments fanning back from the seed
    const fl = new Path2D();
    const spread = n > 20 ? 0.055 : 0.13;
    for (let k = 0; k < n; k++) {
      const a = -Math.PI / 2 + (k - (n - 1) / 2) * spread;
      const L = (26 + 8 * LIB.h3(k, seed, 5)) * size;
      fl.moveTo(0, -4 * size);
      fl.quadraticCurveTo(Math.cos(a) * L * 0.5 + (k - (n - 1) / 2) * 0.8 * size, -4 * size + Math.sin(a) * L * 0.55, Math.cos(a) * L, Math.sin(a) * L - 4 * size);
    }
    ctx.lineCap = 'round';
    ctx.strokeStyle = P.inkSoft;
    ctx.globalAlpha *= 0.55;
    ctx.lineWidth = (n > 20 ? 1.2 : 1.6) * s / size;
    ctx.stroke(fl);
    ctx.globalAlpha /= 0.55;
    ctx.strokeStyle = P.white;
    ctx.lineWidth = (n > 20 ? 1.2 : 0.9) * s / size;
    ctx.stroke(fl);
    ctx.beginPath();
    ctx.ellipse(0, 2 * size, 4.2 * size, 6.5 * size, 0, 0, TAU);
    ctx.fillStyle = L2SEED;
    ctx.fill();
    ctx.lineWidth = 1.1 * s / size;
    ctx.strokeStyle = P.ink;
    ctx.stroke();
    ctx.restore();
  }
  const L2SEED = '#7B5534';

  function drawLeaf2(ctx, V, P, Lf) {
    const L = LIB;
    const col = L.mix(P.milkweed, P.ochre, Lf.aut * 0.55);
    const deep = L.mix(L.mix(P.milkweedDeep, P.ink, 0.35), '#6B4A1E', Lf.aut * 0.5);
    ink(ctx, V, [Lf.base, Lf.at(0, 0)], { width: 9, color: P.milkweedStem, seed: sd('pet', Lf.key), taper: [0, 3], swell: 0, wobble: 0.3 });
    ink(ctx, V, Lf.outline, { closed: true, width: 3, fill: col, seed: sd('lo', Lf.key), wobble: 1.2 });
    // autumn: yellowing from the margin inward between side veins
    if (Lf.aut > 0.05) {
      const r = LIB.rng(sd('aut', Lf.key));
      ctx.save();
      ctx.beginPath();
      trace(ctx, Lf.outline, true);
      ctx.clip();
      const n = 1 + Math.round(Lf.aut * 3);
      for (let i = 0; i < n; i++) {
        const side = r.sign();
        const vs = Lf.veins.filter((q) => q.side === side);
        const vi = Math.min(vs.length - 2, Math.max(0, r.int(0, vs.length - 2)));
        const u0 = vs.length ? vs[vi].u0 : r.range(0.2, 0.7);
        const u1 = Math.min(0.96, u0 + r.range(0.12, 0.28));
        const depth = r.range(0.35, 0.7) * Lf.aut;
        const blob = [];
        const steps = 10;
        for (let s = 0; s <= steps; s++) {
          const u = lerp(u0, u1, s / steps);
          const hw = (Lf.width / 2) * Lf.shape(u);
          blob.push(Lf.at(u, side * hw * (0.92 + 0.08 * L.noise2(u * 6, i, sd('autn', Lf.key)))));
        }
        for (let s = steps; s >= 0; s--) {
          const u = lerp(u0, u1, s / steps);
          const hw = (Lf.width / 2) * Lf.shape(u);
          const inn = 1 - depth * (0.75 + 0.25 * L.noise2(u * 5, i + 3, sd('auti', Lf.key)));
          blob.push(Lf.at(u, side * hw * inn));
        }
        fillPoly(ctx, blob, P.ochre, 0.8);
        hatchV(ctx, V, blob, { angle: -Math.PI / 4, spacing: 8, width: 1.2, color: P.monarchDeep, alpha: 0.7, length: [6, 16], seed: sd('bh', Lf.key, i), density: 0.7 });
      }
      stippleV(ctx, V, Lf.outline, { spacing: 9, density: Lf.aut * 0.45, r: [0.9, 2.0], color: P.bark, alpha: 0.55, seed: sd('speck', Lf.key) });
      ctx.restore();
    }
    hatchV(ctx, V, Lf.lowerHalf, {
      angle: Lf.angLower, spacing: 5, width: 1.4, color: deep, alpha: 0.8, length: [8, 24], seed: sd('lh', Lf.key),
      density: (x, y) => 0.5 + 0.45 * sstep(-0.1, -0.8, Lf.vOf(x, y)),
    });
    hatchV(ctx, V, Lf.lowerHalf, {
      angle: Lf.angLower + 1.05, spacing: 6, width: 1.1, color: P.ink, alpha: 0.45, length: [6, 16], seed: sd('lh2', Lf.key),
      density: (x, y) => 0.8 * sstep(-0.5, -0.95, Lf.vOf(x, y)),
    });
    hatchV(ctx, V, Lf.upperHalf, {
      angle: Lf.angUpper, spacing: 7, width: 1.2, color: deep, alpha: 0.65, length: [6, 18], seed: sd('uh', Lf.key),
      density: (x, y) => 0.6 * (1 - sstep(0.04, 0.45, Lf.vOf(x, y))),
    });
    for (let k = 0; k < Lf.veins.length; k++) ink(ctx, V, Lf.veins[k].pts, { width: 1.5, color: P.milkweedPale, alpha: 0.9, seed: sd('lv', Lf.key, k), taper: [3, 14], wobble: 0.6 });
    ink(ctx, V, Lf.mid, { width: 3.4, color: P.milkweedPale, seed: sd('mid', Lf.key), taper: [2, 50], wobble: 0.6 });
    ink(ctx, V, Lf.mid, { width: 1, color: P.inkSoft, alpha: 0.5, seed: sd('mid2', Lf.key), taper: [10, 60], wobble: 0.6 });
  }

  function drawPod(ctx, V, P, pd) {
    const L = LIB;
    ink(ctx, V, pd.ped, { width: 9, color: P.milkweedStem, seed: sd('ped', pd.key), taper: [0, 2], swell: 0, wobble: 0.6 });
    ink(ctx, V, pd.ped, { width: 2, color: P.ink, alpha: 0.7, seed: sd('ped2', pd.key), taper: [0, 4], wobble: 0.6 });
    ink(ctx, V, pd.outline, { closed: true, width: 3.2, fill: P.seedPod, seed: sd('po', pd.key), wobble: 1 });
    // contour hatch across the pod on its shadow side
    const ang = Math.atan2(pd.uy, pd.ux) + Math.PI / 2;
    hatchV(ctx, V, pd.outline, {
      angle: ang, spacing: 5, width: 1.3, color: L.mix(P.seedPod, P.ink, 0.55), alpha: 0.85, length: [8, 22], bend: 1.4, seed: sd('ph', pd.key),
      density: (x, y) => {
        const dx = x - pd.base[0], dy = y - pd.base[1];
        const u = (dx * pd.ux + dy * pd.uy) / pd.len;
        const v = (dx * pd.nx + dy * pd.ny) / Math.max(1, (pd.w / 2) * pd.prof(u));
        return 0.15 + 0.8 * sstep(0.05, -0.85, v);
      },
    });
    // warts
    const wart = new Path2D();
    for (const [x, y] of pd.warts) {
      const r = 2.6 * V.ws;
      wart.moveTo(x + r, y);
      wart.arc(x, y, r, 0, TAU);
    }
    ctx.save();
    ctx.fillStyle = L.mix(P.seedPod, P.ink, 0.35);
    ctx.fill(wart);
    ctx.fillStyle = L.mix(P.seedPod, P.white, 0.45);
    ctx.globalAlpha = 0.7;
    ctx.translate(-1.2 * V.ws, -1.2 * V.ws);
    ctx.fill(wart);
    ctx.restore();
    // open seam: pale lining, overlapping flat brown seeds, floss bunched at the mouth
    ink(ctx, V, pd.lens, { closed: true, width: 2.2, fill: P.white, seed: sd('lens', pd.key), wobble: 0.6 });
    ctx.save();
    ctx.beginPath();
    trace(ctx, pd.lens, true);
    ctx.clip();
    for (const s of pd.seeds) {
      ctx.save();
      ctx.translate(s.p[0], s.p[1]);
      ctx.rotate(s.a + Math.PI / 2);
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 10, 0, 0, TAU);
      ctx.fillStyle = L2SEED;
      ctx.fill();
      ctx.lineWidth = 1.2 * V.ws;
      ctx.strokeStyle = P.ink;
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    const fl = new Path2D();
    const r = LIB.rng(sd('mouth', pd.key));
    for (let k = 0; k < 26; k++) {
      const a = Math.atan2(pd.uy, pd.ux) + r.range(-0.9, 0.9);
      const Lk = r.range(18, 46);
      const x0 = pd.mouth[0] + r.range(-8, 8), y0 = pd.mouth[1] + r.range(-8, 8);
      const j = (LIB.h3(k, 3, V.bi) - 0.5) * 3;
      fl.moveTo(x0, y0);
      fl.quadraticCurveTo(x0 + Math.cos(a) * Lk * 0.6 + j, y0 + Math.sin(a) * Lk * 0.6, x0 + Math.cos(a + 0.3) * Lk, y0 + Math.sin(a + 0.3) * Lk + j);
    }
    strokePath(ctx, V, fl, P.inkSoft, 1.8, 0.5);
    strokePath(ctx, V, fl, P.white, 1.1, 1);
  }

  function drawL2(ctx, V, P) {
    const L = LIB;
    const tt = V.tt;
    const tw = LIB.onTwos(tt);
    // soil under the ground line, only seen once the frame has drifted back
    if (V.y1 > 1930) {
      const sx0 = Math.max(V.x0 - 20, -700), sx1 = Math.min(V.x1 + 20, 1780);
      const soil = [[sx0, 1928], [sx1, 1928], [sx1, 2060], [sx0, 2060]];
      hatchV(ctx, V, [[sx0, 1928], [sx1, 1928], [sx1, 2120], [sx0, 2120]], { angle: -Math.PI / 4, spacing: 7, width: 1.3, color: P.bark, alpha: 0.6, length: [8, 22], seed: sd('soil2'), density: (x, y) => 0.85 * (1 - sstep(1935, 2110, y)) });
      stippleV(ctx, V, soil, { spacing: 16, density: (x, y) => 0.5 * (1 - sstep(1935, 2060, y)), r: [1.2, 3.0], color: P.inkSoft, alpha: 0.5, seed: sd('soil2s') });
      ink(ctx, V, [[sx0, 1928], [sx1, 1928]], { width: 2.6, seed: sd('soilline'), taper: [30, 30], wobble: 2.5, smooth: false, step: 6 });
    }
    // construction: plant axis, height ruler, a circle through the pods
    const cons = { width: 1.5, color: P.inkFaint, alpha: 0.3, taper: [0, 0], wobble: 1.5, smooth: false, step: 8 };
    ink(ctx, V, [[560, Math.min(-40, V.y0 - 40)], [560, Math.max(1960, V.y1 + 40)]], Object.assign({ seed: sd('ax2') }, cons));
    LIB.guideCircle(ctx, 548, 420, 250, { color: P.inkFaint, alpha: 0.3, width: 1.5 * V.ws, dash: [3 * V.ws, 7 * V.ws] });
    LIB.ticks(ctx, 1010, 322, { kind: 'linear', length: 1598, angle: Math.PI / 2, n: 32, len: 10 * V.ws, major: 4, majorLen: 22 * V.ws, side: 1, color: P.inkFaint, alpha: 0.45, width: 1.4 * V.ws });

    // ground: dry grass along the bottom
    {
      const r = LIB.rng(sd('grass2'));
      const g1 = new Path2D(), g2 = new Path2D();
      for (let i = 0; i < 330; i++) {
        const x = r.range(-420, 1500), y = 1920 + r.range(0, 12), h = r.range(30, 110), lean = r.range(-0.4, 0.4);
        if (x < V.x0 - 60 || x > V.x1 + 60) continue;
        const p = r() < 0.5 ? g1 : g2;
        const j = (LIB.h3(i, 9, V.bi) - 0.5) * 2;
        p.moveTo(x, y);
        p.quadraticCurveTo(x + lean * h * 0.3, y - h * 0.6, x + lean * h + j, y - h);
      }
      strokePath(ctx, V, g1, P.ochre, 2.4, 0.9);
      strokePath(ctx, V, g2, P.inkSoft, 1.4, 0.7);
    }

    for (const nb of NEIGHBOURS) {
      if (!vis(V, nb.x - 360, nb.top - 40, nb.x + 360, 2500)) continue;
      ink(ctx, V, [[nb.x + 6, 2480], [nb.x, 1600], [nb.x - 4, nb.top]], { width: 20, color: P.milkweedStem, seed: sd('nbs', nb.key), taper: [0, 30], swell: 0, wobble: 1 });
      ink(ctx, V, [[nb.x - 4, 2480], [nb.x - 10, 1600], [nb.x - 13, nb.top + 10]], { width: 2.6, seed: sd('nbl', nb.key), taper: [0, 30], wobble: 1 });
      ink(ctx, V, [[nb.x + 16, 2480], [nb.x + 10, 1600], [nb.x + 5, nb.top + 10]], { width: 2.6, seed: sd('nbr', nb.key), taper: [0, 30], wobble: 1 });
    }
    for (const Lf of NEIGHBOUR_LEAVES) {
      if (!visPts(V, Lf.outline, 20)) continue;
      drawLeaf2(ctx, V, P, Lf);
    }
    for (let i = 0; i < LEAVES.length; i++) {
      const Lf = LEAVES[i];
      if (!visPts(V, Lf.outline, 20)) continue;
      drawLeaf2(ctx, V, P, Lf);
    }
    // stem
    {
      const left = [], right = [];
      const pts = LIB.smoothPts(STEM, false, 20);
      for (const p of pts) {
        const w = stemW(p[1]) / 2;
        left.push([p[0] - w, p[1]]);
        right.push([p[0] + w, p[1]]);
      }
      const body = left.concat(right.slice().reverse());
      fillPoly(ctx, body, P.milkweedStem);
      hatchV(ctx, V, body, { angle: 0.1, spacing: 5, width: 1.3, color: L.mix(P.milkweedDeep, P.ink, 0.35), alpha: 0.85, length: [6, 14], bend: 1.2, seed: sd('stemh'), density: (x, y) => sstep(-0.1, 0.8, (x - stemX(y)) / (stemW(y) / 2)) });
      ink(ctx, V, left, { width: 2.6, seed: sd('stemL'), taper: [0, 20], wobble: 0.8 });
      ink(ctx, V, right, { width: 2.8, seed: sd('stemR'), taper: [0, 20], wobble: 0.8 });
      const hairs = new Path2D();
      for (let y = 340; y < Math.min(2480, V.y1 + 20); y += 11) {
        const j = LIB.h3(y, 3, V.bi);
        const x = stemX(y), w = stemW(y) / 2;
        hairs.moveTo(x - w, y);
        hairs.lineTo(x - w - 5 - j * 2, y - 4);
        hairs.moveTo(x + w, y + 5);
        hairs.lineTo(x + w + 5 + j * 2, y + 1);
      }
      strokePath(ctx, V, hairs, P.inkSoft, 0.9, 0.55);
      for (const pr of PAIRS) {
        ink(ctx, V, LIB.ellipsePts(stemX(pr.y), pr.y + 2, stemW(pr.y) * 0.62, 6, 18), { closed: true, width: 2, fill: P.milkweedStem, seed: sd('node', pr.y), wobble: 0.3 });
      }
      // stem tip where the old flower cluster was
      ink(ctx, V, [[539, 330], [534, 306], [528, 296]], { width: 4, color: P.inkSoft, seed: sd('tip'), taper: [0, 6] });
    }
    for (const pd of PODS) drawPod(ctx, V, P, pd);
    // floss seeds adrift, on twos
    for (const fs of FLOSS) {
      const age = tw - fs.t0;
      if (age < 0) continue;
      const x = fs.pod.mouth[0] + fs.vx * age + 14 * Math.sin(age * 5 + fs.ph);
      const y = fs.pod.mouth[1] + fs.vy * age - 18 * age * age;
      if (x > 1120 || y < -60) continue;
      drawFlossSeed(ctx, V, P, x, y, fs.size, fs.spin * age + 0.5, fs.seed);
    }
  }

  // ---------------------------------------------------------------------------
  // L3: the meadow. The L2 frame sits at its centre (162 x 288 px), so the plant is the stalk there.
  // ---------------------------------------------------------------------------

  const toL3from2 = (p) => [P[1][0] + S[1] * (p[0] - Q[1][0]), P[1][1] + S[1] * (p[1] - Q[1][1])];
  const CARD2 = [P[1][0] - 540 * S[1], P[1][1] - 960 * S[1], P[1][0] + 540 * S[1], P[1][1] + 960 * S[1]];

  const MEADOW = (() => {
    const r = LIB.rng(sd('meadow'));
    const bounds = [505, 560, 628, 712, 812, 940, 1100, 1300, 1550, 1935, 4600];
    const bandCols = ['sage', 'ochre', 'milkweed', 'tan', 'ochre', 'sage', 'tan', 'ochre', 'milkweed', 'sage'];
    const edges = bounds.map((y, i) => {
      const pts = [];
      for (let x = -1640; x <= 2720; x += 40) pts.push([x, y + 6 * (i + 1) * 0.5 * LIB.noise1(x * 0.006 + i * 3.1, sd('edge', i))]);
      return pts;
    });
    const bands = [];
    for (let i = 0; i < bounds.length - 1; i++) {
      bands.push({ poly: edges[i].concat(edges[i + 1].slice().reverse()), col: bandCols[i], i, y0: bounds[i], y1: bounds[i + 1] });
    }
    const trees = [];
    let x = -1650;
    while (x < 2720) {
      const rad = r.range(20, 44);
      trees.push({ x: x + rad, y: 492 - rad * 0.2 + r.range(-6, 6), r: rad, seed: trees.length });
      x += rad * r.range(1.5, 2.3);
    }
    const stalks = [];
    let guard = 0;
    while (stalks.length < 72 && guard++ < 400) {
      const yb = lerp(575, 1900, Math.pow(r(), 0.85));
      const xb = r.range(10, 1070);
      if (xb > CARD2[0] - 12 && xb < CARD2[2] + 12 && yb > CARD2[1] - 20 && yb < CARD2[3] + 60) continue;
      const h = lerp(60, 420, (yb - 575) / 1325) * r.range(0.85, 1.12);
      stalks.push({ x: xb, y: yb, h, lean: r.range(-0.08, 0.08), seed: stalks.length });
    }
    // sparse stalks beyond the frame, simple strokes
    for (let i = 0; i < 90; i++) {
      const yb = lerp(575, 2600, Math.pow(r(), 0.9));
      let xb = r.range(-1600, 2680);
      if (xb > -30 && xb < 1110) xb += xb < 540 ? -1150 : 1150;
      stalks.push({ x: xb, y: yb, h: lerp(60, 420, clamp((yb - 575) / 1325)) * r.range(0.85, 1.12), lean: r.range(-0.08, 0.08), seed: stalks.length, far: true });
    }
    stalks.sort((a, b) => a.y - b.y);
    for (const s of stalks) {
      const rg = LIB.rng(sd('stalkg', s.seed));
      const pairs = s.far ? rg.int(1, 2) : rg.int(2, 3);
      s.leaves = [];
      for (let p = 0; p < pairs; p++) {
        const u = 0.2 + p * (0.48 / Math.max(1, pairs - 1)) + rg.range(-0.02, 0.02);
        const len = s.h * rg.range(0.09, 0.14);
        const w = len * 0.48;
        const ang = 0.72 + rg.range(-0.12, 0.12);
        s.leaves.push({ u, side: 1, ang, len, w });
        s.leaves.push({ u: u + 0.03, side: -1, ang: ang + rg.range(-0.08, 0.08), len: len * rg.range(0.9, 1.05), w: w * rg.range(0.9, 1.0) });
      }
      const np = s.far ? (rg() < 0.45 ? 1 : 0) : rg.int(1, 2);
      s.pods = [];
      for (let k = 0; k < np; k++) {
        const u = 0.68 + k * 0.12 + rg.range(-0.03, 0.03);
        const a = ((22 + rg.range(0, 10)) * Math.PI) / 180 * (k % 2 ? 1 : -1);
        const stem = s.h * rg.range(0.08, 0.14);
        const plen = s.h * rg.range(0.07, 0.11);
        const pw = plen * 0.38;
        const nFloss = rg.int(3, 6);
        s.pods.push({ u, a, stem, plen, pw, nFloss });
      }
    }
    return { edges, bands, trees, stalks };
  })();

  function drawStalk(ctx, V, P, s) {
    const top = [s.x + s.lean * s.h, s.y - s.h];
    const at = (u) => [lerp(s.x, top[0], u), lerp(s.y, top[1], u)];
    // short hatched ground shadow
    {
      const sh = LIB.ellipsePts(s.x + 6, s.y + 4, s.h * 0.08, 5, 12, 0.15);
      hatchV(ctx, V, sh, { angle: -0.5, spacing: 3.5, width: 1.1, color: P.inkSoft, alpha: 0.55, length: [4, 10], seed: sd('stsh', s.seed), density: 0.8 });
    }
    ink(ctx, V, [[s.x, s.y], [lerp(s.x, top[0], 0.5) + s.lean * 6, s.y - s.h * 0.5], top], { width: 2.5, color: P.ink, seed: sd('stalk', s.seed), taper: [2, 10], wobble: 1 });
    for (const lf of s.leaves) {
      const b = at(lf.u);
      const ang = lf.side > 0 ? -lf.ang : Math.PI + lf.ang;
      const cx = b[0] + Math.cos(ang) * lf.len * 0.5;
      const cy = b[1] + Math.sin(ang) * lf.len * 0.5;
      const oval = LIB.ellipsePts(cx, cy, lf.len * 0.5, lf.w * 0.5, 16, ang);
      ink(ctx, V, oval, { closed: true, width: 1.2, color: P.ink, fill: P.milkweed, seed: sd('sleaf', s.seed, lf.u), wobble: 0.5 });
      hatchV(ctx, V, oval, {
        angle: Math.PI / 4, spacing: 5, width: 1.1, color: P.milkweedDeep, alpha: 0.75, length: [4, 12], seed: sd('slefh', s.seed, lf.u),
        density: (x, y) => sstep(-0.2, 0.9, ((x - cx) * 0.7 + (y - cy) * 0.7) / Math.max(4, lf.len * 0.5)),
      });
    }
    for (const pd of s.pods) {
      const b = at(pd.u);
      const ex = b[0] + Math.cos(pd.a - Math.PI / 2) * pd.stem;
      const ey = b[1] + Math.sin(pd.a - Math.PI / 2) * pd.stem;
      ink(ctx, V, [b, [ex, ey]], { width: 1.8, color: P.ink, seed: sd('ppd', s.seed, pd.u), taper: [0, 4], wobble: 0.4 });
      const boat = LIB.ellipsePts(ex + Math.cos(pd.a - Math.PI / 2) * pd.plen * 0.45, ey + Math.sin(pd.a - Math.PI / 2) * pd.plen * 0.45, pd.plen * 0.5, pd.pw, 14, pd.a - Math.PI / 2);
      ink(ctx, V, boat, { closed: true, width: 1.2, color: P.ink, fill: P.seedPod, seed: sd('pbo', s.seed, pd.u), wobble: 0.4 });
      const seamX = ex + Math.cos(pd.a - Math.PI / 2) * pd.plen * 0.7;
      const seamY = ey + Math.sin(pd.a - Math.PI / 2) * pd.plen * 0.7;
      const fl = new Path2D();
      for (let k = 0; k < pd.nFloss; k++) {
        const aa = pd.a - Math.PI / 2 + (k - (pd.nFloss - 1) / 2) * 0.28;
        const L = pd.plen * (0.7 + 0.3 * LIB.h3(k, s.seed, 5));
        fl.moveTo(seamX, seamY);
        fl.lineTo(seamX + Math.cos(aa) * L, seamY + Math.sin(aa) * L);
      }
      strokePath(ctx, V, fl, P.white, 1, 0.95);
    }
  }

  function drawL3(ctx, V, P) {
    const L = LIB;
    const M = MEADOW;
    fillPoly(ctx, viewPts(V), P.paper);
    const core = V.k > 0.6;
    const cx0 = core ? V.x0 - 30 : Math.max(V.x0 - 30, -120), cx1 = core ? V.x1 + 30 : Math.min(V.x1 + 30, 1200);
    // receding hatched fields above the tree row, no sun or ruled sky
    {
      const strips = [
        { y0: 0, y1: 110, col: 'sage', ang: 0.12 },
        { y0: 110, y1: 220, col: 'ochre', ang: -0.12 },
        { y0: 220, y1: 330, col: 'tan', ang: 0.14 },
        { y0: 330, y1: 455, col: 'milkweed', ang: -0.1 },
      ];
      for (let i = 0; i < strips.length; i++) {
        const st = strips[i];
        const top = [], bot = [];
        for (let x = cx0; x <= cx1; x += 40) {
          top.push([x, st.y0 + 5 * L.noise1(x * 0.008 + i, sd('skyw', i))]);
          bot.push([x, st.y1 + 5 * L.noise1(x * 0.008 + i + 2, sd('skyw', i))]);
        }
        const poly = top.concat(bot.slice().reverse());
        fillPoly(ctx, poly, L.mix(P[st.col], P.paper, 0.22));
        hatchV(ctx, V, poly, {
          angle: st.ang, spacing: 6 + i, width: 1.2, color: L.mix(P[st.col], P.ink, 0.5), alpha: 0.65,
          length: [16, 50], seed: sd('skyfield', i), density: 0.7,
        });
        ink(ctx, V, bot, { width: 1.6, color: P.inkSoft, alpha: 0.7, seed: sd('skyedge', i), taper: [0, 0], wobble: 1 });
      }
      const hedge = new Path2D();
      const hr = LIB.rng(sd('hedgerow3'));
      for (let x = cx0; x < cx1; x += hr.range(7, 13)) {
        const y = 472 + 4 * LIB.noise1(x * 0.02, sd('hedgey'));
        const rad = hr.range(2.5, 5);
        hedge.moveTo(x + rad, y);
        hedge.arc(x, y, rad, 0, TAU);
      }
      ctx.save();
      ctx.fillStyle = L.mix(P.milkweedDeep, P.ink, 0.35);
      ctx.fill(hedge);
      ctx.restore();
    }
    // far hills
    const hx0 = Math.floor((V.x0 - 60) / 30) * 30, hx1 = V.x1 + 60;
    const hill = [[hx0, 540]];
    for (let x = hx0; x <= hx1; x += 30) hill.push([x, 468 - 34 * (0.5 + 0.5 * L.noise1(x * 0.004, sd('hill3'))) - 16 * L.noise1(x * 0.015, sd('hill3b'))]);
    hill.push([hx1, 540]);
    fillPoly(ctx, hill, L.mix(P.sage, P.paper, 0.45));
    hatchV(ctx, V, clipPolyRect(hill, cx0, 300, cx1, 560), { angle: -Math.PI / 4, spacing: 7, width: 1.1, color: P.milkweedDeep, alpha: 0.5, length: [8, 20], seed: sd('hillh') });
    ink(ctx, V, hill.slice(1, -1), { width: 2, color: P.inkSoft, seed: sd('hillo'), taper: [0, 0] });
    // bands
    for (const b of M.bands) {
      if (!vis(V, -1640, b.y0 - 20, 2720, b.y1 + 20)) continue;
      const near = clamp((b.y0 - 505) / 1430);
      const vp = clipPolyRect(b.poly, V.x0 - 20, V.y0 - 20, V.x1 + 20, V.y1 + 20);
      if (vp.length < 3) continue;
      fillPoly(ctx, vp, L.mix(P[b.col], P.paper, 0.18));
      const hp = clipPolyRect(vp, cx0, -1e5, cx1, Math.min(V.y1 + 20, 2150));
      if (hp.length < 3) continue;
      hatchV(ctx, V, hp, {
        angle: b.i % 2 ? 0.14 : -0.14, spacing: lerp(4, 9, near), width: lerp(1, 1.6, near), color: L.mix(P[b.col], P.ink, 0.5), alpha: 0.7,
        length: [lerp(10, 30, near), lerp(26, 80, near)], seed: sd('band3', b.i), density: (x, y) => 0.35 + 0.55 * sstep(b.y0, Math.min(b.y1, 2000), y),
      });
    }
    for (let i = 0; i < M.edges.length - 1; i++) {
      const ev = M.edges[i].filter((p) => p[0] > V.x0 - 80 && p[0] < V.x1 + 80);
      if (ev.length < 2 || M.edges[i][0][1] > V.y1 + 40) continue;
      ink(ctx, V, ev, { width: lerp(1.6, 3, i / 9), color: P.inkSoft, alpha: 0.85, seed: sd('edge3', i), taper: [0, 0], wobble: 1 });
      // grass flicks along each band edge
      const fl = new Path2D();
      const r = LIB.rng(sd('flick', i));
      const hgt = lerp(5, 26, i / 9);
      for (let x = cx0; x < cx1; x += lerp(7, 16, i / 9) * r.range(0.7, 1.3)) {
        const y = M.edges[i][clamp(Math.round((x + 1640) / 40), 0, M.edges[i].length - 1)][1];
        fl.moveTo(x, y + 2);
        fl.lineTo(x + r.range(-3, 3), y - hgt * r.range(0.5, 1.1));
      }
      strokePath(ctx, V, fl, P.ink, lerp(1, 1.6, i / 9), 0.7);
    }
    // tree row along y 500
    for (const tr of M.trees) {
      if (!vis(V, tr.x - tr.r, tr.y - tr.r, tr.x + tr.r, tr.y + tr.r + 30)) continue;
      const crown = LIB.ellipsePts(tr.x, tr.y - tr.r * 0.4, tr.r, tr.r * 0.92, 28).map((p, j) => {
        const w = 1 + 0.08 * Math.sin(j * 1.9 + tr.seed) + 0.05 * L.noise1(j * 0.8, sd('crown', tr.seed));
        return [tr.x + (p[0] - tr.x) * w, tr.y - tr.r * 0.4 + (p[1] - tr.y + tr.r * 0.4) * w];
      });
      ink(ctx, V, [[tr.x, tr.y + tr.r * 0.3], [tr.x, tr.y + tr.r * 0.85]], { width: 4, color: P.bark, seed: sd('trunk', tr.seed), taper: [0, 0] });
      ink(ctx, V, crown, { closed: true, width: 2.4, fill: L.mix(P.sage, P.milkweedDeep, 0.4), seed: sd('crowno', tr.seed), wobble: 0.8 });
      if (tr.x < cx0 || tr.x > cx1) continue;
      LIB.crossHatch(ctx, crown, {
        spacing: 4.5, width: 1.1 * V.ws, color: P.ink, alpha: 0.6, layers: 2, seed: sd('crownh', tr.seed), boilAmp: 0.4 * V.ws,
        density: (x, y) => sstep(-0.2, 0.9, ((x - tr.x) * 0.7 + (y - tr.y + tr.r * 0.4) * 0.7) / tr.r),
      });
    }
    // stalks back to front
    for (const s of M.stalks) {
      if (!vis(V, s.x - s.h * 0.2, s.y - s.h, s.x + s.h * 0.2, s.y)) continue;
      if (s.far && s.x > cx0 && s.x < cx1 && V.k < 0.6) continue;
      drawStalk(ctx, V, P, s);
    }
    // the plant from L2, in miniature
    {
      const base = toL3from2(STEM_BASE), top = toL3from2(STEM[STEM.length - 1]);
      ink(ctx, V, [base, toL3from2(STEM[5]), top], { width: 4.4, color: P.ink, seed: sd('plant3'), taper: [2, 8] });
      const nbl = new Path2D();
      for (const nb of NEIGHBOURS) {
        const b = toL3from2([nb.x, 1920]), tp = toL3from2([nb.x - 4, nb.top]);
        ink(ctx, V, [b, tp], { width: 3.6, color: P.ink, seed: sd('nb3', nb.key), taper: [2, 8] });
        for (const y of nb.pairs) {
          if (y > 1920) continue;
          const c = toL3from2([nb.x, y]);
          nbl.moveTo(c[0] - 40 * S[1] * 7, c[1] - 14);
          nbl.quadraticCurveTo(c[0] - 14, c[1] - 2, c[0], c[1]);
          nbl.quadraticCurveTo(c[0] + 14, c[1] - 2, c[0] + 40 * S[1] * 7, c[1] - 13);
        }
      }
      strokePath(ctx, V, nbl, LIB.mix(P.milkweedDeep, P.ink, 0.3), 2.6, 0.95);
      const lv = new Path2D();
      for (const Lf of LEAVES) {
        const a = toL3from2(Lf.base), b = toL3from2(Lf.at(0.55, 0)), c = toL3from2(Lf.tip);
        lv.moveTo(a[0], a[1]);
        lv.quadraticCurveTo(b[0], b[1] - 4, c[0], c[1]);
      }
      strokePath(ctx, V, lv, LIB.mix(P.milkweedDeep, P.ink, 0.3), 3, 0.95);
      for (const pd of PODS) {
        const c = toL3from2(pd.at(0.5, 0));
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(c[0], c[1], 6, 18, Math.atan2(pd.uy, pd.ux) + Math.PI / 2, 0, TAU);
        ctx.fillStyle = P.seedPod;
        ctx.fill();
        ctx.lineWidth = 1.6 * V.ws;
        ctx.strokeStyle = P.ink;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // L4: patchwork farmland from above. The meadow frame sits at the centre (216 x 384 px).
  // ---------------------------------------------------------------------------

  const CARD3 = [540 - 540 * S[2], 960 - 960 * S[2], 540 + 540 * S[2], 960 + 960 * S[2]];

  const FARM = (() => {
    const r = LIB.rng(sd('farm'));
    const rot = -0.16;
    const c = Math.cos(rot), s = Math.sin(rot);
    const R = (x, y) => [540 + (x - 540) * c - (y - 960) * s, 960 + (x - 540) * s + (y - 960) * c];
    const colW = 150, rowH = 128;
    const nx = 30, ny = 56;
    const gx = [], gy = [];
    for (let i = 0; i <= nx; i++) gx.push(-1710 + i * colW);
    for (let j = 0; j <= ny; j++) gy.push(-2610 + j * rowH);
    const node = (i, j) => {
      const jx = LIB.noise2(i * 0.9, j * 0.9, sd('fjx')) * 26, jy = LIB.noise2(i * 0.9 + 7, j * 0.9, sd('fjy')) * 20;
      return R(gx[i] + jx, gy[j] + jy);
    };
    const cols = ['#D8C48C', 'sage', 'milkweed', 'tan', '#CDB77E', 'paperShade', 'ochre', '#B9B98A'];
    const fields = [];
    for (let i = 0; i < nx; i++) {
      for (let j = 0; j < ny; j++) {
        const a = node(i, j), b = node(i + 1, j), d = node(i + 1, j + 1), e = node(i, j + 1);
        const split = r() < 0.35;
        const pick = () => r.pick(cols);
        const hat = [0.02, Math.PI / 2, -Math.PI / 4, Math.PI / 4][(i + j * 3 + r.int(0, 1)) % 4];
        if (split) {
          const m1 = [lerp(a[0], b[0], 0.5), lerp(a[1], b[1], 0.5)], m2 = [lerp(e[0], d[0], 0.5), lerp(e[1], d[1], 0.5)];
          fields.push({ poly: [a, m1, m2, e], col: pick(), ang: hat + rot, sp: r.range(5, 8), seed: fields.length, cx: (a[0] + d[0]) / 2, cy: (a[1] + d[1]) / 2 });
          fields.push({ poly: [m1, b, d, m2], col: pick(), ang: hat + rot + Math.PI / 2, sp: r.range(5, 8), seed: fields.length, cx: (a[0] + d[0]) / 2, cy: (a[1] + d[1]) / 2 });
        } else {
          fields.push({ poly: [a, b, d, e], col: pick(), ang: hat + rot, sp: r.range(5, 9), seed: fields.length, cx: (a[0] + d[0]) / 2, cy: (a[1] + d[1]) / 2 });
        }
      }
    }
    const hedges = [];
    for (let i = 0; i <= nx; i++) {
      const pts = [];
      for (let j = 0; j <= ny; j++) pts.push(node(i, j));
      hedges.push(pts);
    }
    for (let j = 0; j <= ny; j++) {
      const pts = [];
      for (let i = 0; i <= nx; i++) pts.push(node(i, j));
      hedges.push(pts);
    }
    const river = LIB.smoothPts([[520, -2700], [300, -2000], [520, -1300], [240, -700], [400, -260], [330, -60], [250, 180], [360, 420], [230, 700], [330, 960], [250, 1200], [420, 1400], [700, 1520], [800, 1760], [720, 1990], [980, 2600], [760, 3400], [1100, 4300]], false, 8);
    const roads = [
      LIB.smoothPts([[-1800, 120], [-60, 380], [400, 520], [1140, 610], [2600, 820]], false, 12),
      LIB.smoothPts([[760, -2700], [880, -60], [800, 700], [940, 1400], [900, 1990], [1000, 4300]], false, 12),
      LIB.smoothPts([[-1800, 2600], [-400, 2350], [700, 2500], [2600, 2300]], false, 12),
    ];
    const clumps = [];
    for (let k = 0; k < 120; k++) {
      const p = polyAt(river, r());
      const side = r.sign();
      clumps.push([p.x - p.ty * side * r.range(18, 40), p.y + p.tx * side * r.range(18, 40), r.range(6, 13)]);
    }
    const town = [];
    for (let k = 0; k < 26; k++) town.push([806 + r.range(-50, 50), 690 + r.range(-40, 40), r.range(6, 14), r.range(5, 11), r.range(-0.3, 0.3)]);
    return { fields, hedges, river, roads, clumps, town };
  })();

  function drawL4(ctx, V, P) {
    const L = LIB;
    const F = FARM;
    fillPoly(ctx, viewPts(V), P.paperShade);
    const farFill = new Map();
    for (const fd of F.fields) {
      if (fd.cx < V.x0 - 200 || fd.cx > V.x1 + 200 || fd.cy < V.y0 - 200 || fd.cy > V.y1 + 200) continue;
      const col = P[fd.col] || fd.col;
      if (V.k < 0.8 && (fd.cx < -100 || fd.cx > 1180 || fd.cy < -100 || fd.cy > 2020)) {
        if (!farFill.has(col)) farFill.set(col, new Path2D());
        trace(farFill.get(col), fd.poly, true);
        continue;
      }
      fillPoly(ctx, fd.poly, L.mix(col, P.paper, 0.12));
      hatchV(ctx, V, fd.poly, { angle: fd.ang, spacing: fd.sp, width: 1.2, color: L.mix(col, P.ink, 0.55), alpha: 0.6, length: [20, 70], gap: [2, 6], seed: sd('field', fd.seed), density: 0.85, angleJitter: 0.02 });
    }
    for (const [col, path] of farFill) {
      ctx.fillStyle = L.mix(col, P.paper, 0.12);
      ctx.fill(path);
    }
    // the meadow at the centre
    const mead = [[CARD3[0], CARD3[1] + 70], [CARD3[2], CARD3[1] + 64], [CARD3[2], CARD3[3]], [CARD3[0], CARD3[3]]];
    fillPoly(ctx, mead, L.mix(P.ochre, P.paper, 0.35));
    stippleV(ctx, V, mead, { spacing: 7, density: 0.6, r: [0.8, 1.4], color: P.ink, alpha: 0.7, seed: sd('meadst') });
    const hx0 = V.k < 0.8 ? Math.max(V.x0, -160) : V.x0, hx1 = V.k < 0.8 ? Math.min(V.x1, 1240) : V.x1;
    const hy0 = V.k < 0.8 ? Math.max(V.y0, -160) : V.y0, hy1 = V.k < 0.8 ? Math.min(V.y1, 2080) : V.y1;
    const far = V.k < 0.8;
    const hedgePath = new Path2D();
    for (const h0 of F.hedges) {
      if (far) for (const h of runsInside(h0, false, V.x0 - 150, V.y0 - 150, V.x1 + 150, V.y1 + 150)) trace(hedgePath, h, false);
      for (const h of runsInside(h0, false, hx0 - 60, hy0 - 60, hx1 + 60, hy1 + 60)) {
        ink(ctx, V, h, { width: 1.6, color: P.inkSoft, alpha: 0.8, seed: sd('hedge', h0[0][0] | 0, h0[0][1] | 0), taper: [0, 0], wobble: 1.4, smooth: false });
      }
    }
    strokePath(ctx, V, hedgePath, P.inkSoft, 1.6, 0.8);
    const dots = new Path2D();
    const r = LIB.rng(sd('hedgedots'));
    for (const h of F.hedges) {
      for (let k = 0; k < h.length - 1; k++) {
        if (r() < 0.55) continue;
        const seen = !(h[k][0] < V.x0 - 60 || h[k][0] > V.x1 + 60 || h[k][1] < V.y0 - 60 || h[k][1] > V.y1 + 60);
        for (let m = 0; m < 6; m++) {
          const u = r();
          const x = lerp(h[k][0], h[k + 1][0], u), y = lerp(h[k][1], h[k + 1][1], u);
          const rad = r.range(2, 4.5);
          if (!seen) continue;
          dots.moveTo(x + rad, y);
          dots.arc(x, y, rad, 0, TAU);
        }
      }
    }
    for (let x = CARD3[0] + 6; x < CARD3[2]; x += 9) {
      const y = 960 + S[2] * (492 - 960) + 3 * Math.sin(x);
      dots.moveTo(x + 4, y);
      dots.arc(x, y, 4, 0, TAU);
    }
    ctx.save();
    ctx.fillStyle = L.mix(P.milkweedDeep, P.ink, 0.35);
    ctx.fill(dots);
    ctx.restore();
    const farLines = new Path2D();
    if (far) {
      for (const line of F.roads.concat([F.river])) for (const run of runsInside(line, false, V.x0 - 60, V.y0 - 60, V.x1 + 60, V.y1 + 60)) trace(farLines, run, false);
      strokePath(ctx, V, farLines, P.ink, 7, 1);
    }
    for (let k = 0; k < F.roads.length; k++) {
      for (const run of runsInside(F.roads[k], false, hx0 - 60, hy0 - 60, hx1 + 60, hy1 + 60)) {
        ink(ctx, V, run, { width: 7, color: P.ink, seed: sd('road', k), taper: [0, 0], wobble: 1 });
        ink(ctx, V, run, { width: 3.2, color: P.paper, seed: sd('road', k), taper: [0, 0], wobble: 1, boilAmp: 0.7 });
      }
    }
    for (const [x, y, w, h, a] of F.town) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.fillStyle = P.rose;
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.lineWidth = 1.2 * V.ws;
      ctx.strokeStyle = P.ink;
      ctx.strokeRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }
    if (far) {
      const rp = new Path2D();
      for (const run of runsInside(F.river, false, V.x0 - 60, V.y0 - 60, V.x1 + 60, V.y1 + 60)) trace(rp, run, false);
      strokePath(ctx, V, rp, P.ink, 26, 1);
      strokePath(ctx, V, rp, P.teal, 19, 1);
    }
    for (const run of runsInside(F.river, false, hx0 - 60, hy0 - 60, hx1 + 60, hy1 + 60)) {
      ink(ctx, V, run, { width: 26, color: P.ink, seed: sd('river4a'), taper: [0, 0], wobble: 2, swell: 0 });
      ink(ctx, V, run, { width: 19, color: P.teal, seed: sd('river4a'), taper: [0, 0], wobble: 2, swell: 0 });
      ink(ctx, V, run, { width: 3, color: P.white, alpha: 0.7, seed: sd('river4b'), taper: [40, 40], wobble: 5 });
    }
    const farClumps = new Path2D();
    for (const [x, y, rad] of F.clumps) {
      if (!vis(V, x - rad, y - rad, x + rad, y + rad, 10)) continue;
      if (far && (x < hx0 || x > hx1 || y < hy0 || y > hy1)) {
        farClumps.moveTo(x + rad, y);
        farClumps.arc(x, y, rad, 0, TAU);
        continue;
      }
      ink(ctx, V, LIB.ellipsePts(x, y, rad, rad, 12), { closed: true, width: 1.8, fill: LIB.mix(P.sage, P.milkweedDeep, 0.5), seed: sd('clump', x | 0), wobble: 0.6 });
    }
    ctx.fillStyle = LIB.mix(P.sage, P.milkweedDeep, 0.5);
    ctx.fill(farClumps);
    strokePath(ctx, V, farClumps, P.ink, 1.8, 1);
  }

  // ---------------------------------------------------------------------------
  // L5: eastern North America on the G6 projection
  //   x = 540 + (lon + 88) * 27,  y = 1450 - (lat - 19.5) * 32,  west longitudes negative
  // Rings are [lon, lat] with a third element 1 marking construction points off the map edge.
  // ---------------------------------------------------------------------------

  const gx = (lon) => 540 + (lon + 88) * 27;
  const gy = (lat) => 1450 - (lat - 19.5) * 32;
  const G6 = (p) => [gx(p[0]), gy(p[1])];

  const RING_ATLANTIC = [
    // St Lawrence north shore, Quebec City out to the gulf
    [-71.15, 46.85], [-70.5, 47.2], [-69.7, 47.9], [-69.0, 48.35], [-68.3, 48.8], [-67.4, 49.3], [-66.3, 50.15], [-64.5, 50.25], [-61.0, 50.2],
    [-50, 74, 1], [-50, 2, 1], [-62, 2, 1],
    // Venezuela and Colombia west to Panama
    [-63.0, 10.6], [-65.0, 10.1], [-67.0, 10.6], [-68.2, 10.6], [-68.6, 11.1], [-69.4, 11.5], [-69.8, 11.45], [-70.2, 11.6], [-70.9, 11.35],
    [-71.3, 11.8], [-71.95, 11.6], [-72.2, 12.1], [-72.6, 11.7], [-73.3, 11.3], [-74.2, 11.3], [-74.8, 11.05], [-75.3, 10.9], [-75.6, 10.3],
    [-76.0, 9.4], [-76.8, 8.8], [-76.9, 8.3], [-77.5, 8.7], [-78.1, 9.25], [-78.9, 9.45], [-79.6, 9.6], [-80.3, 9.1], [-81.1, 8.8],
    [-81.7, 9.0], [-82.2, 9.2], [-82.8, 9.9], [-83.4, 10.5], [-83.7, 11.0], [-83.75, 11.6], [-83.6, 12.5], [-83.5, 13.4], [-83.4, 14.2],
    [-83.2, 14.9], [-83.6, 15.3], [-84.3, 15.7], [-85.2, 15.9], [-86.0, 15.95], [-86.9, 15.8], [-87.7, 15.9], [-88.2, 15.7], [-88.9, 15.9],
    [-88.5, 16.3], [-88.25, 16.9], [-88.3, 17.6], [-88.1, 18.45], [-87.85, 18.5], [-87.6, 19.2], [-87.45, 19.8], [-87.25, 20.3], [-86.8, 20.6],
    [-86.8, 21.2], [-87.05, 21.55], [-87.6, 21.5], [-88.6, 21.5], [-89.6, 21.3], [-90.3, 21.05], [-90.45, 20.7], [-90.5, 19.85], [-90.75, 19.3],
    [-91.4, 18.8], [-91.9, 18.55], [-92.7, 18.6], [-93.6, 18.4], [-94.4, 18.15], [-94.8, 18.5], [-95.6, 18.75], [-96.1, 19.1], [-96.5, 19.9],
    [-97.15, 20.7], [-97.3, 21.3], [-97.8, 22.2], [-97.75, 23.0], [-97.7, 24.3], [-97.45, 25.2], [-97.2, 25.95], [-97.4, 26.6], [-97.35, 27.2],
    [-97.1, 27.8], [-96.6, 28.25], [-95.9, 28.55], [-95.2, 28.95], [-94.7, 29.35], [-93.9, 29.7], [-93.3, 29.75], [-92.6, 29.6], [-91.9, 29.65],
    [-91.3, 29.25], [-90.8, 29.05], [-90.2, 29.1], [-89.7, 29.3], [-89.25, 29.05], [-89.0, 29.2], [-89.3, 29.6], [-89.4, 29.95], [-89.4, 30.3],
    [-88.8, 30.4], [-88.1, 30.3], [-88.0, 30.65], [-87.3, 30.35], [-86.5, 30.4], [-85.7, 30.1], [-85.4, 29.7], [-85.0, 29.7], [-84.3, 30.05],
    [-83.8, 29.9], [-83.3, 29.3], [-82.7, 28.7], [-82.8, 28.0], [-82.65, 27.4], [-82.0, 26.5], [-81.75, 25.9], [-81.15, 25.2], [-80.9, 25.1],
    [-80.4, 25.2], [-80.15, 25.6], [-80.05, 26.2], [-80.1, 27.0], [-80.55, 28.2], [-80.6, 28.6], [-81.2, 29.6], [-81.45, 30.4], [-81.4, 31.1],
    [-81.1, 31.9], [-80.7, 32.2], [-79.9, 32.75], [-79.3, 33.2], [-78.9, 33.6], [-77.95, 33.85], [-77.3, 34.5], [-76.6, 34.65], [-76.0, 35.05],
    [-75.5, 35.3], [-75.75, 36.2], [-75.95, 36.9], [-76.3, 37.0], [-76.3, 37.5], [-76.3, 38.3], [-76.5, 39.2], [-76.1, 39.5], [-76.4, 38.9],
    [-76.2, 38.0], [-76.0, 37.3], [-75.65, 37.45], [-75.25, 38.0], [-75.05, 38.45], [-75.25, 38.85], [-75.55, 39.45], [-74.95, 38.93], [-74.4, 39.35],
    [-74.05, 40.0], [-74.0, 40.5], [-73.8, 40.87], [-72.5, 41.27], [-71.4, 41.45], [-70.6, 41.55], [-70.0, 41.55], [-69.95, 41.7], [-70.1, 42.05],
    [-70.55, 41.95], [-71.0, 42.3], [-70.85, 42.5], [-70.7, 43.0], [-70.2, 43.65], [-69.0, 44.0], [-68.2, 44.4], [-67.0, 44.9],
    // Bay of Fundy, Nova Scotia, the gulf's south shore and the Gaspe back up the river
    [-66.1, 45.3], [-65.0, 45.6], [-64.3, 45.8], [-64.9, 45.3], [-65.5, 44.8], [-66.1, 44.3], [-65.8, 43.7], [-65.3, 43.5], [-64.3, 44.3],
    [-63.5, 44.6], [-62.0, 45.0], [-61.0, 45.3], [-59.8, 45.9], [-60.4, 46.9], [-61.4, 46.4], [-62.5, 45.75], [-64.0, 46.15], [-64.6, 46.8],
    [-64.8, 47.8], [-65.7, 47.9], [-66.4, 48.1], [-65.3, 48.25], [-64.2, 48.85], [-65.5, 49.25], [-66.8, 49.1], [-68.1, 48.55], [-69.3, 47.8],
    [-70.1, 47.25], [-70.7, 46.95],
  ];

  const RING_PACIFIC = [
    [-112, 32, 1], [-109.3, 26.4], [-108.5, 25.3], [-107.6, 24.5], [-106.9, 23.8], [-106.4, 23.2], [-105.8, 22.5], [-105.55, 21.9], [-105.25, 21.0],
    [-105.2, 20.7], [-105.65, 20.4], [-105.5, 19.9], [-105.0, 19.3], [-104.35, 19.05], [-103.5, 18.3], [-102.6, 17.95], [-101.6, 17.6], [-100.6, 17.1],
    [-99.9, 16.8], [-98.9, 16.5], [-98.0, 16.15], [-97.1, 15.9], [-96.2, 15.65], [-95.4, 15.95], [-94.8, 16.2], [-94.1, 16.1], [-93.3, 15.7],
    [-92.5, 15.0], [-92.1, 14.6], [-91.4, 13.95], [-90.6, 13.9], [-89.8, 13.5], [-88.8, 13.2], [-87.9, 13.2], [-87.5, 12.95], [-87.3, 12.6],
    [-86.7, 12.1], [-86.0, 11.4], [-85.7, 11.05], [-85.9, 10.6], [-85.75, 10.1], [-85.25, 9.9], [-84.8, 9.6], [-84.2, 9.4], [-83.6, 8.9],
    [-83.4, 8.5], [-83.0, 8.2], [-82.6, 8.1], [-82.0, 8.2], [-81.5, 7.7], [-81.0, 7.6], [-80.4, 7.3], [-80.0, 7.6], [-80.4, 8.1], [-79.6, 8.9],
    [-79.1, 9.0], [-78.6, 8.6], [-78.2, 8.1], [-78.0, 7.6], [-77.8, 7.2], [-77.4, 6.6], [-77.4, 5.8], [-77.3, 4.5], [-77.5, 3.0],
    [-79, -2, 1], [-116, -2, 1],
  ];

  const RING_HUDSON = [
    [-96, 76, 1], [-92.5, 64.5], [-90.7, 63.3], [-92.0, 62.8], [-93.5, 61.9], [-94.2, 60.9], [-94.8, 59.8], [-94.3, 58.8], [-93.2, 58.7],
    [-92.3, 57.9], [-90.8, 57.3], [-89.0, 56.8], [-87.8, 56.0], [-85.8, 55.3], [-84.3, 55.2], [-82.3, 55.1], [-82.2, 54.2], [-82.3, 53.1],
    [-81.5, 52.4], [-80.5, 51.6], [-79.7, 51.3], [-79.0, 51.5], [-78.8, 52.3], [-79.1, 53.3], [-79.0, 54.1], [-79.6, 54.7], [-77.8, 55.4],
    [-76.7, 56.3], [-76.6, 57.4], [-77.3, 58.5], [-78.2, 59.2], [-77.6, 60.1], [-78.1, 60.9], [-77.9, 62.3], [-75.5, 62.3], [-73.0, 62.0],
    [-71.0, 61.2], [-69.6, 61.0], [-69.4, 60.2], [-67.9, 58.5], [-66.2, 58.8], [-64.9, 60.1], [-64.5, 61.3, 1], [-65.5, 62.0], [-68.0, 62.5],
    [-70.0, 62.8], [-72.5, 63.4], [-74.5, 64.2], [-77.0, 64.3], [-79.5, 65.2], [-80, 76, 1],
  ];

  const ISLANDS = [
    // Cuba, Hispaniola, Jamaica, Puerto Rico, Bahamas, Long Island, Southampton, Coats, Belcher
    [[-84.95, 21.85], [-84.4, 22.4], [-83.3, 22.95], [-82.0, 23.15], [-80.5, 23.1], [-79.3, 22.5], [-78.0, 22.3], [-77.2, 21.7], [-76.0, 21.2], [-75.0, 20.7], [-74.15, 20.25], [-74.9, 19.9], [-76.5, 19.95], [-77.7, 19.85], [-77.1, 20.5], [-78.1, 20.75], [-79.0, 21.55], [-80.4, 21.8], [-81.6, 22.1], [-83.0, 22.0], [-84.0, 21.9]],
    [[-74.45, 18.4], [-73.2, 19.7], [-72.0, 19.9], [-70.8, 19.9], [-69.9, 19.3], [-68.35, 18.6], [-69.0, 18.3], [-70.5, 18.2], [-71.4, 17.6], [-72.3, 18.2], [-73.4, 18.2]],
    [[-78.35, 18.3], [-77.5, 18.5], [-76.35, 18.2], [-76.8, 17.9], [-77.8, 17.85]],
    [[-67.25, 18.4], [-65.6, 18.35], [-65.7, 18.0], [-67.2, 17.95]],
    [[-78.4, 25.2], [-77.8, 25.0], [-77.8, 24.2], [-78.1, 24.0], [-78.4, 24.6]],
    [[-79.0, 26.7], [-78.2, 26.7], [-78.0, 26.55], [-78.8, 26.5]],
    [[-77.2, 26.9], [-76.95, 26.3], [-77.2, 25.9], [-77.4, 26.3]],
    [[-76.7, 25.5], [-76.2, 25.1], [-76.15, 24.7], [-76.4, 25.1]],
    [[-74.0, 40.58], [-73.2, 40.62], [-72.3, 40.9], [-71.9, 41.07], [-72.7, 40.98], [-73.7, 40.87]],
    [[-86.6, 64.1], [-85.5, 63.2], [-83.2, 63.6], [-81.0, 63.9], [-80.6, 64.4], [-83.0, 65.0], [-85.5, 65.3]],
    [[-83.2, 62.9], [-81.9, 62.6], [-82.8, 62.3], [-83.9, 62.5]],
    [[-79.8, 56.6], [-79.2, 56.4], [-79.4, 55.9], [-79.9, 56.1]],
  ];
  const ISLAND_SEA = [0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 2]; // which water ring each island sits in

  const LAKES = [
    // Superior, Michigan, Huron, Erie, Ontario, Winnipeg, Nipigon, Winnipegosis, Nicaragua, Okeechobee
    [[-92.1, 46.8], [-90.5, 47.7], [-89.6, 48.0], [-88.3, 48.8], [-87.0, 48.6], [-86.0, 48.7], [-85.0, 47.95], [-84.8, 47.3], [-84.5, 46.5], [-85.0, 46.75], [-86.5, 46.45], [-87.5, 46.5], [-87.9, 47.45], [-88.4, 47.1], [-88.9, 46.8], [-89.9, 46.8], [-91.0, 46.9]],
    [[-87.2, 41.6], [-87.6, 41.9], [-87.9, 43.0], [-87.7, 43.8], [-87.5, 44.6], [-87.0, 45.3], [-86.5, 45.9], [-85.5, 45.9], [-84.8, 45.8], [-85.2, 45.2], [-85.6, 44.9], [-86.2, 44.3], [-86.5, 43.5], [-86.3, 42.5], [-86.8, 41.8]],
    [[-84.7, 45.8], [-83.5, 46.0], [-82.5, 46.2], [-81.3, 46.0], [-80.4, 45.9], [-80.0, 45.3], [-79.8, 44.7], [-80.6, 44.5], [-81.1, 44.9], [-81.6, 45.25], [-81.4, 44.6], [-81.7, 44.0], [-82.1, 43.4], [-82.4, 43.0], [-82.6, 43.6], [-82.7, 44.0], [-83.3, 43.9], [-83.9, 43.9], [-83.5, 44.4], [-83.3, 45.0], [-83.9, 45.5]],
    [[-83.4, 41.7], [-82.5, 42.0], [-81.5, 42.6], [-80.5, 42.6], [-79.8, 42.8], [-78.9, 42.9], [-79.8, 42.3], [-80.5, 42.0], [-81.7, 41.5], [-82.7, 41.4]],
    [[-79.8, 43.3], [-79.4, 43.65], [-78.5, 43.95], [-77.5, 44.05], [-76.8, 44.2], [-76.4, 44.2], [-76.2, 43.6], [-77.6, 43.3], [-78.8, 43.35]],
    [[-96.85, 50.35], [-96.35, 50.9], [-96.45, 51.6], [-97.2, 52.3], [-97.4, 53.1], [-97.9, 53.85], [-98.6, 53.6], [-98.9, 52.9], [-98.2, 52.3], [-97.4, 51.6], [-97.3, 50.9]],
    [[-88.9, 49.5], [-88.2, 49.8], [-88.4, 50.5], [-89.0, 50.2]],
    [[-99.3, 51.4], [-99.9, 52.9], [-100.4, 52.7], [-99.6, 51.3], [-98.7, 50.4], [-98.4, 50.7]],
    [[-86.0, 12.0], [-85.2, 11.9], [-84.7, 11.3], [-85.4, 11.05], [-85.9, 11.4]],
    [[-80.95, 27.15], [-80.65, 27.1], [-80.6, 26.8], [-80.85, 26.7], [-81.0, 26.9]],
  ];

  const RIVERS = [
    { w: 1.9, pts: [[-95.2, 47.2], [-94.3, 46.3], [-93.1, 45.0], [-92.0, 44.4], [-91.2, 43.5], [-91.0, 42.6], [-90.6, 41.5], [-91.0, 40.6], [-90.2, 38.8], [-89.4, 37.3], [-89.2, 37.0], [-89.6, 36.2], [-90.1, 35.1], [-90.9, 34.0], [-91.1, 32.3], [-91.5, 31.0], [-91.1, 30.5], [-90.1, 29.95], [-89.25, 29.1]] },
    { w: 1.6, pts: [[-89.2, 37.0], [-88.4, 37.3], [-87.6, 37.9], [-86.6, 37.9], [-85.8, 38.25], [-84.5, 39.1], [-83.3, 38.6], [-82.6, 38.7], [-81.6, 39.3], [-80.8, 39.9], [-80.0, 40.44]] },
    { w: 1.6, pts: [[-90.2, 38.8], [-91.5, 38.6], [-92.2, 38.6], [-93.5, 39.2], [-94.6, 39.1], [-95.3, 40.0], [-95.9, 41.3], [-96.4, 42.5], [-97.5, 42.9], [-98.9, 43.1], [-100.3, 44.4], [-100.6, 45.6], [-101.4, 46.8], [-102.6, 47.6], [-104.0, 48.0], [-106.4, 48.1], [-108.5, 47.7]] },
    { w: 4.2, pts: [[-76.4, 44.2], [-75.6, 44.7], [-74.7, 45.0], [-73.6, 45.5], [-72.6, 46.2], [-71.8, 46.7], [-71.15, 46.85]] },
    { w: 1.5, pts: [[-97.2, 25.95], [-98.3, 26.2], [-99.5, 27.5], [-100.5, 28.7], [-101.4, 29.8], [-102.5, 29.8], [-103.2, 29.0], [-104.4, 29.6], [-105.0, 30.6], [-106.5, 31.8], [-107.0, 33.5], [-106.8, 35.2], [-106.2, 37.0]] },
  ];

  const BORDERS = [
    [[-110, 49.0], [-95.15, 49.0], [-94.8, 48.7], [-93.0, 48.6], [-91.5, 48.1], [-89.6, 48.0], [-88.5, 47.7], [-86.5, 47.3], [-84.8, 46.9], [-84.4, 46.5], [-83.9, 46.0], [-83.4, 45.4], [-82.5, 44.4], [-82.4, 43.0], [-82.9, 42.3], [-83.1, 42.0], [-82.0, 41.8], [-80.0, 42.3], [-79.0, 42.6], [-79.1, 43.3], [-78.5, 43.6], [-76.8, 43.6], [-76.3, 44.2], [-74.7, 45.0], [-71.5, 45.0], [-70.9, 45.3], [-70.0, 46.7], [-69.2, 47.45], [-68.2, 47.35], [-67.8, 47.05], [-67.8, 45.7], [-67.4, 45.2], [-67.0, 44.9]],
    [[-117, 32.5], [-108.2, 31.8], [-106.5, 31.8], [-105.0, 30.6], [-104.4, 29.6], [-103.2, 29.0], [-102.5, 29.8], [-101.4, 29.8], [-100.5, 28.7], [-99.5, 27.5], [-98.3, 26.2], [-97.2, 25.95]],
    [[-92.2, 14.6], [-92.2, 15.25], [-91.7, 16.07], [-90.45, 16.07], [-90.4, 17.8], [-89.15, 17.8], [-89.15, 17.95], [-88.3, 18.5]],
  ];

  const RANGES = [
    [[-85.8, 34.0], [-84.0, 35.3], [-82.3, 36.4], [-80.6, 37.6], [-79.2, 38.8], [-77.8, 40.1], [-76.2, 41.3], [-74.6, 42.3], [-73.2, 43.6], [-71.6, 44.3], [-69.8, 45.3]],
    [[-100.9, 26.2], [-100.0, 24.5], [-99.4, 22.8], [-98.6, 21.2], [-97.9, 19.9]],
    [[-104.6, 19.6], [-102.6, 19.5], [-100.6, 19.4], [-98.8, 19.2], [-97.3, 19.0]],
    [[-107.8, 28.6], [-106.6, 26.6], [-105.6, 24.6], [-104.6, 22.6]],
    [[-105.3, 33.0], [-105.4, 36.0], [-105.6, 39.0], [-106.4, 42.0], [-107.8, 44.5]],
  ];

  // smooth + crinkle a projected run (open) or ring (closed)
  function coastify(pts, closed, key) {
    const sm = LIB.smoothPts(pts, closed, 3.2);
    const n = sm.length;
    const out = [];
    let s = 0;
    for (let i = 0; i < n; i++) {
      if (i > 0) s += Math.hypot(sm[i][0] - sm[i - 1][0], sm[i][1] - sm[i - 1][1]);
      const a = sm[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = sm[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      let d = 2.2 * LIB.fbm1(s * 0.045, sd('coast', key), 3) + 0.9 * LIB.noise1(s * 0.3, sd('coast2', key));
      if (!closed) d *= sstep(0, 20, s) * sstep(0, 20, (n - 1 - i) * 3.2);
      out.push([sm[i][0] - ty * d, sm[i][1] + tx * d]);
    }
    return out;
  }

  // a ring with edge construction points -> { poly (for clipping), runs (inked coasts) }
  function buildRing(ring, key) {
    const hasFar = ring.some((p) => p[2]);
    if (!hasFar) {
      const c = coastify(ring.map(G6), true, key);
      return { poly: c, runs: [c.concat([c[0]])], closed: true };
    }
    let start = ring.findIndex((p) => p[2]);
    const n = ring.length;
    const poly = [];
    const runs = [];
    let cur = [];
    for (let c = 0; c <= n; c++) {
      const p = ring[(start + c) % n];
      if (p[2]) {
        if (cur.length > 1) {
          const cc = coastify(cur.map(G6), false, key + runs.length);
          runs.push(cc);
          for (const q of cc) poly.push(q);
        }
        cur = [];
        if (c < n) poly.push(G6(p));
      } else {
        cur.push(p);
      }
    }
    return { poly, runs, closed: false };
  }

  const MAP = (() => {
    const seas = [buildRing(RING_ATLANTIC, 'atl'), buildRing(RING_PACIFIC, 'pac'), buildRing(RING_HUDSON, 'hud')];
    const islands = ISLANDS.map((r, i) => buildRing(r, 'isl' + i));
    const lakes = LAKES.map((r, i) => buildRing(r, 'lake' + i));
    // water clip: each sea with its islands as even-odd holes, lakes on their own
    const water = new Path2D();
    const addPoly = (pts) => {
      pts.forEach((p, i) => (i ? water.lineTo(p[0], p[1]) : water.moveTo(p[0], p[1])));
      water.closePath();
    };
    seas.forEach((s) => addPoly(s.poly));
    islands.forEach((s) => addPoly(s.poly));
    lakes.forEach((s) => addPoly(s.poly));
    const coastRuns = [];
    seas.forEach((s) => s.runs.forEach((r) => coastRuns.push(r)));
    islands.forEach((s) => s.runs.forEach((r) => coastRuns.push(r)));
    lakes.forEach((s) => s.runs.forEach((r) => coastRuns.push(r)));
    // Bahamas cluster: one combined outline for engraved rings so they do not shard
    const bahamaPts = [];
    for (let i = 4; i <= 7; i++) islands[i].poly.forEach((p) => bahamaPts.push(p));
    const bahamaHull = LIB.smoothPts(convexHull(bahamaPts), true, 5);
    const offsetRuns = [];
    seas.forEach((s) => s.runs.forEach((r) => offsetRuns.push(r)));
    islands.forEach((s, i) => {
      if (i >= 4 && i <= 7) return;
      s.runs.forEach((r) => offsetRuns.push(r));
    });
    lakes.forEach((s) => s.runs.forEach((r) => offsetRuns.push(r)));
    offsetRuns.push(bahamaHull.concat([bahamaHull[0]]));
    // engraved offsets, both sides of every coast; the water clip keeps only the sea side
    const LEVELS = [5, 10, 16, 23, 31, 40, 50];
    const offsets = LEVELS.map(() => new Path2D());
    for (const run of offsetRuns) {
      const n = run.length;
      for (let li = 0; li < LEVELS.length; li++) {
        const d0 = LEVELS[li];
        for (const side of [1, -1]) {
          let pen = false;
          for (let i = 0; i < n; i += 2) {
            const a = run[Math.max(0, i - 3)], b = run[Math.min(n - 1, i + 3)];
            let tx = b[0] - a[0], ty = b[1] - a[1];
            const tl = Math.hypot(tx, ty) || 1;
            const d = d0 * (1 + 0.12 * LIB.noise1(i * 0.03 + li, sd('eng', li))) * side;
            const x = run[i][0] - (ty / tl) * d, y = run[i][1] + (tx / tl) * d;
            if (!pen) offsets[li].moveTo(x, y);
            else offsets[li].lineTo(x, y);
            pen = true;
          }
        }
      }
    }
    const lakePolys = lakes.map((l) => l.poly);
    const seaTest = [RING_ATLANTIC, RING_PACIFIC, RING_HUDSON].map((r) => r.map(G6));
    const islandTest = ISLANDS.map((r) => r.map(G6));
    const isWater = (x, y) => {
      for (const lp of LAKES) if (LIB.polyContains(lp.map(G6), x, y)) return true;
      let w = false;
      for (const s of seaTest) if (LIB.polyContains(s, x, y)) w = true;
      if (w) for (const s of islandTest) if (LIB.polyContains(s, x, y)) return false;
      return w;
    };
    const lakeTest = LAKES.map((r) => r.map(G6));
    const isWaterFast = (x, y) => {
      for (const lp of lakeTest) if (LIB.polyContains(lp, x, y)) return true;
      for (const s of seaTest) if (LIB.polyContains(s, x, y)) return true;
      return false;
    };
    const rivers = RIVERS.map((r, i) => ({ w: r.w, pts: coastify(r.pts.map(G6), false, 'riv' + i) }));
    const borders = BORDERS.map((b) => LIB.smoothPts(b.map(G6), false, 4));
    const ranges = RANGES.map((b) => LIB.smoothPts(b.map(G6), false, 4));
    // inland hachure: short strokes perpendicular to every coast, 6 px apart, fading 40 px in
    const hachure = new Path2D();
    const hachureSrc = coastRuns.concat([bahamaHull.concat([bahamaHull[0]])]);
    for (let ri = 0; ri < hachureSrc.length; ri++) {
      const run = hachureSrc[ri];
      let dist = 0, next = 0;
      for (let i = 1; i < run.length; i++) {
        const ax = run[i - 1][0], ay = run[i - 1][1], bx = run[i][0], by = run[i][1];
        const seg = Math.hypot(bx - ax, by - ay) || 1;
        const tx = (bx - ax) / seg, ty = (by - ay) / seg;
        const nx = -ty, ny = tx;
        while (next <= dist + seg) {
          const u = (next - dist) / seg;
          const x = lerp(ax, bx, u), y = lerp(ay, by, u);
          const s1 = isWater(x + nx * 8, y + ny * 8) ? -1 : 1;
          const s2 = isWater(x - nx * 8, y - ny * 8) ? 1 : -1;
          const side = s1 === s2 ? s1 : s1;
          hachure.moveTo(x, y);
          hachure.lineTo(x + nx * side * 28, y + ny * side * 28);
          next += 7;
        }
        dist += seg;
      }
    }
    const boreal = [];
    {
      const rb = LIB.rng(sd('boreal'));
      for (let i = 0; i < 90 && boreal.length < 55; i++) {
        const x = rb.range(80, 1000), y = rb.range(280, 560);
        if (isWaterFast(x, y)) continue;
        const n = rb.int(3, 6);
        const cluster = [];
        for (let k = 0; k < n; k++) cluster.push([x + rb.range(-14, 14), y + rb.range(-8, 8), rb.range(4, 7)]);
        boreal.push(cluster);
      }
    }
    // the flight band across southern Canada and the north-east
    const band = LIB.smoothPts([[380, 640], [470, 592], [640, 576], [820, 590], [962, 600], [1040, 642], [1030, 722], [930, 760], [760, 748], [600, 760], [462, 732], [386, 700]], true, 6);
    const bandDots = [];
    {
      const r = LIB.rng(sd('banddots'));
      for (let i = 0; i < 1400 && bandDots.length < 520; i++) {
        const x = r.range(370, 1050), y = r.range(566, 770);
        if (!LIB.polyContains(band, x, y)) continue;
        if (isWaterFast(x, y)) continue;
        const bb = LIB.bounds(band);
        const edge = Math.min(x - bb.x, bb.x + bb.w - x, y - bb.y, bb.y + bb.h - y);
        if (r() > sstep(0, 40, edge) * 0.95 + 0.05) continue;
        bandDots.push([x, y, r.range(1.2, 2.4), r()]);
      }
    }
    return { seas, islands, lakes, water, coastRuns, offsets, LEVELS, lakePolys, rivers, borders, ranges, band, bandDots, isWater, hachure, boreal };
  })();

  const PEAKS = (() => {
    const out = [];
    for (let ri = 0; ri < MAP.ranges.length; ri++) {
      const pts = MAP.ranges[ri];
      const r = LIB.rng(sd('peaks', ri));
      const step = ri <= 3 ? 2 : 4;
      for (let i = 0; i < pts.length; i += step) {
        const [x, y] = pts[i];
        const rows = ri <= 3 ? 2 : 1;
        for (let m = 0; m < rows; m++) {
          out.push([x + r.range(-6, 6) + (m ? 10 : 0), y + r.range(-4, 4) + (m ? 12 : 0), r.range(10, 17), r.range(8, 12)]);
        }
      }
    }
    return out.sort((a, b) => a[1] - b[1]);
  })();

  const LAND_DOTS = (() => {
    const out = [];
    const seaTest = [RING_ATLANTIC, RING_PACIFIC, RING_HUDSON].map((r) => r.map(G6));
    const lakeTest = LAKES.map((r) => r.map(G6));
    const islTest = ISLANDS.map((r) => r.map(G6));
    for (let i = -8; i < 110; i++) {
      for (let j = -6; j < 64; j++) {
        const x = j * 19 + (i & 1 ? 9.5 : 0) + (LIB.h3(i, j, 41) - 0.5) * 12, y = i * 19 + (LIB.h3(j, i, 43) - 0.5) * 12;
        const d = 0.3 + 0.4 * LIB.fbm2(x * 0.004, y * 0.004, sd('landtone'), 3);
        if (LIB.h3(i, j, 47) > d) continue;
        let water = false;
        for (const s of seaTest) if (LIB.polyContains(s, x, y)) water = true;
        if (water) for (const s of islTest) if (LIB.polyContains(s, x, y)) water = false;
        if (!water) for (const s of lakeTest) if (LIB.polyContains(s, x, y)) water = true;
        if (!water) out.push([x, y, 0.8 + 0.6 * LIB.h3(i, j, 49)]);
      }
    }
    return out;
  })();

  const TARGET = [208, 1447];
  const FLIGHT_ANCHOR = [756, 666];
  const TEXAS = [256, 1133];

  const FLOWS = (() => {
    const r = LIB.rng(sd('flows'));
    const starts = [[430, 660], [520, 628], [600, 700], [680, 612], [756, 666], [840, 700], [905, 640], [960, 712], [1000, 668]];
    return starts.map((s, i) => {
      const c = (i - 4) / 4;
      const ang = -Math.PI / 2 + (c * 60 * Math.PI) / 180;
      const tx = [TEXAS[0] + c * 36, TEXAS[1] + c * 22];
      const m1 = [lerp(s[0], tx[0], 0.45) - 50 + c * 80, lerp(s[1], tx[1], 0.45) + 30 - Math.abs(c) * 20];
      const n1 = [TARGET[0] + Math.cos(ang) * 88, TARGET[1] - 150 + Math.sin(ang) * 16];
      const e = [TARGET[0] + 30 * Math.cos(ang), TARGET[1] + 30 * Math.sin(ang)];
      const pts = LIB.smoothPts([s, m1, tx, n1, e], false, 5);
      const cum = [0];
      for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
      return { pts, cum, len: cum[cum.length - 1], seed: i, dash: r.range(0, 20) };
    });
  })();

  const DOTS = (() => {
    const out = [];
    for (let i = 0; i < 440; i++) {
      const r = LIB.rng(sd('stream', i));
      out.push({
        flow: i % FLOWS.length,
        t0: 2.5 + r() * 0.42,
        dur: r.range(0.26, 0.5),
        side: r.sign() * r.range(0.3, 1),
        wig: r.range(0, TAU),
        settleA: r.range(0, TAU) + i,
        settleR: 22 * Math.sqrt(r.range(0.05, 1)),
      });
    }
    return out;
  })();

  function flowPoint(fl, u) {
    const d = clamp(u) * fl.len;
    let lo = 0, hi = fl.cum.length - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (fl.cum[m] < d) lo = m;
      else hi = m;
    }
    const seg = fl.cum[hi] - fl.cum[lo] || 1;
    const f = (d - fl.cum[lo]) / seg;
    const a = fl.pts[lo], b = fl.pts[hi];
    return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), (b[0] - a[0]) / seg, (b[1] - a[1]) / seg];
  }

  function drawL5(ctx, V, P) {
    const L = LIB;
    const Mp = MAP;
    fillPoly(ctx, [[-400, -400], [1480, -400], [1480, 2320], [-400, 2320]], P.paper);
    // engraved water: pale wash, then offset lines fading offshore
    ctx.save();
    ctx.beginPath();
    ctx.rect(V.x0 - 40, V.y0 - 40, V.x1 - V.x0 + 80, V.y1 - V.y0 + 80);
    ctx.clip();
    ctx.clip(Mp.water, 'evenodd');
    ctx.fillStyle = L.mix(P.teal, P.paper, 0.86);
    ctx.fillRect(-400, -400, 1880, 2720);
    for (let li = Mp.LEVELS.length - 1; li >= 0; li--) {
      ctx.lineWidth = lerp(1.6, 1.0, li / (Mp.LEVELS.length - 1)) * V.ws;
      ctx.strokeStyle = li < 2 ? P.tealDeep : P.teal;
      ctx.globalAlpha = lerp(0.85, 0.16, li / (Mp.LEVELS.length - 1));
      ctx.stroke(Mp.offsets[li]);
    }
    ctx.globalAlpha = 1;
    // Great Lakes and the big lakes get horizontal ruled hatching too
    for (let i = 0; i < Mp.lakePolys.length; i++) {
      if (i > 5) break;
      hatchV(ctx, V, Mp.lakePolys[i], { angle: 0, spacing: 4.5, width: 1.1, color: P.teal, alpha: 0.7, length: [10, 40], gap: [2, 6], seed: sd('lakeh', i), angleJitter: 0.01, flow: 0 });
    }
    ctx.restore();
    // graticule every 10 degrees
    const grat = new Path2D();
    for (let lon = -110; lon <= -60; lon += 10) {
      grat.moveTo(gx(lon), -300);
      grat.lineTo(gx(lon), 2300);
    }
    for (let lat = 0; lat <= 70; lat += 10) {
      grat.moveTo(-300, gy(lat));
      grat.lineTo(1400, gy(lat));
    }
    strokePath(ctx, V, grat, P.inkFaint, 1.5, 0.35);
    const gt = new Path2D();
    for (let lon = -110; lon <= -60; lon += 2) {
      for (let lat = 0; lat <= 70; lat += 10) {
        gt.moveTo(gx(lon), gy(lat) - 5);
        gt.lineTo(gx(lon), gy(lat) + 5);
      }
    }
    strokePath(ctx, V, gt, P.inkFaint, 1.2, 0.3);
    // land tone: sparse engraved stipple plus coastal hachure
    {
      const lp = new Path2D();
      for (const [x, y, rad] of LAND_DOTS) {
        const jx = (LIB.h3(x | 0, V.bi, 3) - 0.5) * 0.7;
        lp.moveTo(x + jx + rad * V.ws, y);
        lp.arc(x + jx, y, rad * V.ws, 0, TAU);
      }
      ctx.save();
      ctx.fillStyle = P.inkFaint;
      ctx.globalAlpha = 0.5;
      ctx.fill(lp);
      ctx.restore();
      ctx.save();
      ctx.strokeStyle = P.inkSoft;
      ctx.lineWidth = 1.1 * V.ws;
      ctx.globalAlpha = 0.32;
      ctx.lineCap = 'round';
      ctx.stroke(Mp.hachure);
      ctx.restore();
    }
    // boreal tree clusters across Canada
    {
      const tp = new Path2D();
      for (const cl of Mp.boreal) {
        for (const [x, y, h] of cl) {
          tp.moveTo(x, y - h);
          tp.lineTo(x + h * 0.4, y);
          tp.lineTo(x - h * 0.4, y);
          tp.closePath();
        }
      }
      ctx.save();
      ctx.fillStyle = P.fir;
      ctx.globalAlpha = 0.75;
      ctx.fill(tp);
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 1 * V.ws;
      ctx.globalAlpha = 0.7;
      ctx.stroke(tp);
      ctx.restore();
    }
    // mountain ranges as hachured peaks, lit from the upper left
    const mtO = new Path2D(), mtH = new Path2D();
    for (const [x, y, h, w] of PEAKS) {
      const j = (LIB.h3(x | 0, y | 0, V.bi) - 0.5) * 0.8;
      mtO.moveTo(x - w, y);
      mtO.lineTo(x + j, y - h);
      mtO.lineTo(x + w, y);
      for (let k = 1; k <= 3; k++) {
        const u = k / 4;
        const px = lerp(x + j, x + w, u), py = lerp(y - h, y, u);
        mtH.moveTo(px, py);
        mtH.lineTo(px - w * 0.45, py + h * 0.2);
      }
    }
    strokePath(ctx, V, mtH, P.inkSoft, 1.1, 0.7);
    strokePath(ctx, V, mtO, P.ink, 1.5, 0.85);
    // rivers
    for (let i = 0; i < Mp.rivers.length; i++) ink(ctx, V, Mp.rivers[i].pts, { width: Mp.rivers[i].w, color: P.teal, seed: sd('river5', i), taper: [0, 24], wobble: 0.5 });
    // borders
    for (let i = 0; i < Mp.borders.length; i++) {
      const pth = new Path2D();
      trace(pth, Mp.borders[i], false);
      strokePath(ctx, V, pth, P.inkFaint, 1.4, 0.6, [10, 5, 2, 5]);
    }
    // coastlines
    for (let i = 0; i < Mp.coastRuns.length; i++) {
      const run = Mp.coastRuns[i];
      if (run.length < 3 || !visPts(V, run, 20)) continue;
      ink(ctx, V, run, { width: 2.4, color: P.ink, seed: sd('coast', i), taper: [0, 0], wobble: 0.6, tremble: 0.3, boilAmp: 0.5 });
    }
    // the dotted band where the migration starts
    const bd = new Path2D();
    const bi = V.bi;
    for (const [x, y, rad, ph] of Mp.bandDots) {
      const jx = (LIB.h3(x | 0, bi, 7) - 0.5) * 0.8, jy = (LIB.h3(y | 0, bi, 9) - 0.5) * 0.8;
      bd.moveTo(x + jx + rad * V.ws, y + jy);
      bd.arc(x + jx, y + jy, rad * V.ws, 0, TAU);
    }
    ctx.save();
    ctx.fillStyle = P.monarch;
    ctx.fill(bd);
    ctx.restore();
    ink(ctx, V, Mp.band, { closed: true, width: 1.6, color: P.monarchDeep, alpha: 0.75, seed: sd('bandline'), wobble: 1.2, double: false });
    // compass rose in the Atlantic
    {
      const cx = 960, cy = 1060;
      LIB.guideCircle(ctx, cx, cy, 46, { color: P.ink, alpha: 0.6, width: 1.4 * V.ws });
      LIB.guideCircle(ctx, cx, cy, 38, { color: P.ink, alpha: 0.4, width: 1 * V.ws, dash: [2 * V.ws, 4 * V.ws] });
      for (let k = 0; k < 8; k++) {
        const a = -Math.PI / 2 + (k / 8) * TAU;
        const len = k % 2 ? 34 : 66;
        const w = k % 2 ? 6 : 10;
        const tip = [cx + Math.cos(a) * len, cy + Math.sin(a) * len];
        const l = [cx + Math.cos(a - Math.PI / 2) * w, cy + Math.sin(a - Math.PI / 2) * w];
        const rr = [cx + Math.cos(a + Math.PI / 2) * w, cy + Math.sin(a + Math.PI / 2) * w];
        fillPoly(ctx, [[cx, cy], l, tip], k === 0 ? P.ink : P.paper);
        fillPoly(ctx, [[cx, cy], tip, rr], P.ink);
        const o = new Path2D();
        trace(o, [l, tip, rr, [cx, cy]], true);
        strokePath(ctx, V, o, P.ink, 1.3, 1);
      }
    }
    // oyamel firs at the overwintering site
    {
      const firs = [[176, 1492, 16], [196, 1502, 20], [220, 1496, 17], [240, 1506, 13], [160, 1508, 12]];
      for (const [x, y, h] of firs) {
        fillPoly(ctx, [[x, y - h], [x + h * 0.45, y], [x - h * 0.45, y]], P.fir);
        const o = new Path2D();
        trace(o, [[x, y - h], [x + h * 0.45, y], [x - h * 0.45, y]], true);
        o.moveTo(x, y);
        o.lineTo(x, y + 4);
        strokePath(ctx, V, o, P.ink, 1.3, 1);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // flyers: the female and the few monarchs that join her in the meadow
  // ---------------------------------------------------------------------------

  const FLAPS = [1, 0.6, 0.28, 0.6];

  const COMPANIONS = (() => {
    const r = LIB.rng(sd('companions'));
    const out = [];
    for (let i = 0; i < 8; i++) {
      out.push({ x: r.range(380, 700), y: r.range(780, 1060), t0: r.range(1.05, 1.55), vx: r.range(-95, -55), vy: r.range(25, 60), ph: r.int(0, 3), seed: i });
    }
    return out;
  })();

  function drawFlyers(ctx, P, M, tt, f) {
    const tw = LIB.onTwos(tt);
    const aHer = 1 - clamp((tt - 2.25) / 0.2);
    let herSize = 12;
    if (aHer > 0 && f >= 3) {
      const m = M[1];
      const pos = flightL2(tw);
      const prev = flightL2(tw - 1 / 12);
      const s = toScreen(m, pos[0], pos[1]);
      const size = Math.max(tt < 1.25 ? 22 : 12, 41 * m.k);
      herSize = size;
      let rot = 0, flap = 1;
      if (tw >= 0.5 + 1 / 12 - 1e-6) {
        const dx = pos[0] - prev[0], dy = pos[1] - prev[1];
        rot = Math.atan2(dx, -dy);
        flap = FLAPS[Math.floor(tw * 12 + 1e-6) % 4];
      }
      ctx.save();
      ctx.globalAlpha = aHer;
      if (tt >= 0.5 && tt <= 2.25) {
        const E = LIB.ease;
        const pop = tt < 0.5 + 3 / 24 ? E.outBack((tt - 0.5) / (3 / 24)) : 1;
        let R = lerp(36, 24, clamp((tt - 0.5) / 1.75)) * pop;
        let ra = 1;
        for (const tPulse of [1.5, 2.0]) {
          const pt = tt - tPulse;
          if (pt >= 0 && pt < 8 / 24) {
            const p = clamp(pt / (8 / 24));
            R = lerp(36, 24, clamp((tt - 0.5) / 1.75)) + 40 * E.outExpo(p);
            ra = 1 - p;
          }
        }
        ctx.save();
        ctx.globalAlpha = aHer * ra;
        ctx.strokeStyle = P.annYellow;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(s[0], s[1], R, 0, TAU);
        ctx.stroke();
        ctx.beginPath();
        for (let k = 0; k < 4; k++) {
          const a = (k * Math.PI) / 2;
          ctx.moveTo(s[0] + Math.cos(a) * (R + 4), s[1] + Math.sin(a) * (R + 4));
          ctx.lineTo(s[0] + Math.cos(a) * (R + 12), s[1] + Math.sin(a) * (R + 12));
        }
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = P.paper;
      ctx.beginPath();
      ctx.ellipse(s[0], s[1], size * 0.42 + 3, size * 0.55 + 3, 0, 0, TAU);
      ctx.fill();
      miniMonarch(ctx, s[0], s[1], size, flap, tw < 0.5 + 1 / 12 - 1e-6 ? 0 : rot, P, 1);
      ctx.restore();
    }
    const a3 = layerAlpha(2, f) * (1 - clamp((tt - 2.05) / 0.25));
    if (a3 > 0) {
      const m = M[2];
      ctx.save();
      ctx.globalAlpha = a3;
      for (const c of COMPANIONS) {
        const age = tw - c.t0;
        if (age < 0) continue;
        const x = c.x + c.vx * age, y = c.y + c.vy * age - 30 * Math.sin(Math.min(age, 0.4) * 4);
        const s = toScreen(m, x, y);
        const size = Math.max(8, herSize * 0.6);
        miniMonarch(ctx, s[0], s[1], size, FLAPS[(Math.floor(tw * 12 + 1e-6) + c.ph) % 4], Math.atan2(c.vx, -c.vy), P, 2, 1, { fill: P.monarchUnder, stroke: false });
      }
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // overlays: nested framing rectangles, her trajectory, the flow into Michoacan
  // ---------------------------------------------------------------------------

  const RECT_MIN = [10, 22, 44, 88];
  const LAND_F = [0, 12, 36, 48];

  function framingRects(ctx, P, M, f) {
    const rects = [];
    for (let i = 0; i < 4; i++) {
      const m = M[i];
      if (m.k > 1.02 || f < LAND_F[i]) continue;
      const cr = cardRect(m);
      let x0 = cr.x, y0 = cr.y, w = cr.w, h = cr.h;
      if (w < RECT_MIN[i]) {
        const cx = x0 + w / 2, cy = y0 + h / 2;
        w = RECT_MIN[i];
        h = w * (1834.6 / 1032);
        x0 = cx - w / 2;
        y0 = cy - h / 2;
      }
      rects.push({ i, x0, y0, w, h });
    }
    ctx.save();
    ctx.strokeStyle = P.annYellow;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // leader lines joining matching corners of consecutive frames
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    for (let a = 0; a + 1 < rects.length; a++) {
      const A = rects[a], B = rects[a + 1];
      if (B.i !== A.i + 1) continue;
      for (const [u, v] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        ctx.moveTo(A.x0 + A.w * u, A.y0 + A.h * v);
        ctx.lineTo(B.x0 + B.w * u, B.y0 + B.h * v);
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    for (const R of rects) {
      const hit = R.i < 3 && f >= LAND_F[R.i + 1] && f < LAND_F[R.i + 1] + 3 ? 1.6 : 1;
      ctx.lineWidth = 2 * hit;
      ctx.strokeRect(R.x0, R.y0, R.w, R.h);
      const c = Math.min(22, R.w * 0.22);
      ctx.lineWidth = 3.2 * hit;
      ctx.beginPath();
      for (const [x, y, sx, sy] of [[R.x0, R.y0, 1, 1], [R.x0 + R.w, R.y0, -1, 1], [R.x0, R.y0 + R.h, 1, -1], [R.x0 + R.w, R.y0 + R.h, -1, -1]]) {
        ctx.moveTo(x, y + sy * c);
        ctx.lineTo(x, y);
        ctx.lineTo(x + sx * c, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function trajectory(ctx, P, M, tt, f) {
    const E = LIB.ease;
    ctx.save();
    ctx.strokeStyle = P.annBlue;
    ctx.fillStyle = P.annBlue;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (f < 12) {
      // heading set by the sun compass, drawn on over 6 frames from the cut
      const p = E.outExpo(f / 6);
      const a = toScreen(M[0], 470, 1060), b0 = toScreen(M[0], 150, 1380);
      const b = [lerp(a[0], b0[0], p), lerp(a[1], b0[1], p)];
      ctx.globalAlpha = 1 - clamp((f - 8) / 4);
      ctx.lineWidth = 2.5;
      ctx.setLineDash([14, 10]);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      ctx.setLineDash([]);
      if (p > 0.5) {
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        ctx.beginPath();
        ctx.moveTo(b[0] + Math.cos(ang) * 10, b[1] + Math.sin(ang) * 10);
        ctx.lineTo(b[0] + Math.cos(ang + 2.5) * 16, b[1] + Math.sin(ang + 2.5) * 16);
        ctx.lineTo(b[0] + Math.cos(ang - 2.5) * 16, b[1] + Math.sin(ang - 2.5) * 16);
        ctx.closePath();
        ctx.fill();
      }
    }
    if (tt > 0.5) {
      const m = M[1];
      const pts = [];
      const end = LIB.onTwos(tt);
      for (let s = 0.5; s <= end + 1e-6; s += 1 / 48) {
        const q = flightL2(s);
        pts.push(toScreen(m, q[0], q[1]));
      }
      ctx.globalAlpha = 1 - clamp((tt - 2.2) / 0.3);
      if (pts.length > 1 && ctx.globalAlpha > 0) {
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        trace(ctx, pts, false);
        ctx.stroke();
        // little motion ticks across the path every few samples
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let k = 4; k < pts.length - 2; k += 6) {
          const a = pts[k - 1], b = pts[k + 1];
          const dx = b[0] - a[0], dy = b[1] - a[1];
          const dl = Math.hypot(dx, dy);
          if (dl < 3) continue;
          ctx.moveTo(pts[k][0] - (dy / dl) * 7, pts[k][1] + (dx / dl) * 7);
          ctx.lineTo(pts[k][0] + (dy / dl) * 7, pts[k][1] - (dx / dl) * 7);
        }
        ctx.stroke();
        // a dashed lead-out down-left once she is a dot
        if (tt > 1.4) {
          const tip = pts[pts.length - 1];
          const p = E.outExpo((tt - 1.4) / 0.3);
          ctx.setLineDash([14, 10]);
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(tip[0] - 10, tip[1] + 9);
          ctx.lineTo(tip[0] - 10 - 170 * p, tip[1] + 9 + 154 * p);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }
    ctx.restore();
  }

  function migration(ctx, P, M, tt, f) {
    const a5 = layerAlpha(4, f);
    if (a5 <= 0) return;
    const E = LIB.ease;
    const m = M[4];
    const S5 = (x, y) => toScreen(m, x, y);
    const tw = LIB.onTwos(tt);
    ctx.save();
    ctx.globalAlpha = a5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // flow lines draw on
    const pDraw = E.outExpo((tt - 2.333) / 0.25);
    if (pDraw > 0) {
      for (const fl of FLOWS) {
        const n = Math.max(2, Math.round(fl.pts.length * pDraw));
        const hi = [], lo = [];
        for (let i = 0; i < n; i++) {
          const p = S5(fl.pts[i][0], fl.pts[i][1]);
          if (fl.pts[i][1] > 1100) lo.push(p);
          else hi.push(p);
        }
        if (hi.length > 1) {
          ctx.strokeStyle = P.monarch;
          ctx.lineWidth = 2;
          ctx.globalAlpha = a5 * 0.8;
          ctx.beginPath();
          trace(ctx, hi, false);
          ctx.stroke();
        }
        if (lo.length > 1) {
          const join = hi.length ? [hi[hi.length - 1]].concat(lo) : lo;
          ctx.strokeStyle = P.monarch;
          ctx.lineWidth = 1.5;
          ctx.globalAlpha = a5 * 0.7;
          ctx.beginPath();
          trace(ctx, join, false);
          ctx.stroke();
        }
        ctx.globalAlpha = a5;
        ctx.lineWidth = 2;
        ctx.strokeStyle = P.monarchDeep;
        ctx.beginPath();
        for (let u = 0.18; u < pDraw - 0.05; u += 0.2) {
          const q = flowPoint(fl, u);
          if (q[1] > 1100) {
            let close = false;
            for (const other of FLOWS) {
              if (other === fl) continue;
              const p = flowPoint(other, u);
              if (Math.hypot(p[0] - q[0], p[1] - q[1]) < 6) { close = true; break; }
            }
            if (close) continue;
          }
          const s = S5(q[0], q[1]);
          const ang = Math.atan2(q[3], q[2]);
          ctx.moveTo(s[0] + Math.cos(ang + 2.6) * 9, s[1] + Math.sin(ang + 2.6) * 9);
          ctx.lineTo(s[0], s[1]);
          ctx.lineTo(s[0] + Math.cos(ang - 2.6) * 9, s[1] + Math.sin(ang - 2.6) * 9);
        }
        ctx.stroke();
      }
    }
    // hundreds of monarch dots streaming south-west, on twos
    if (tw >= 2.5 - 1e-6) {
      const dots = new Path2D();
      for (let i = 0; i < DOTS.length; i++) {
        const d = DOTS[i];
        const fl = FLOWS[d.flow];
        let u = (tw - d.t0) / d.dur;
        if (u < 0) continue;
        let x, y;
        if (u >= 1) {
          x = TARGET[0] + Math.cos(d.settleA) * d.settleR;
          y = TARGET[1] + Math.sin(d.settleA) * d.settleR * 0.8;
        } else {
          u = E.inOutSine(u);
          const q = flowPoint(fl, u);
          const spread = 16 * (1 - u) + 4;
          x = q[0] - q[3] * d.side * spread + Math.sin(d.wig + u * 9) * 1.5;
          y = q[1] + q[2] * d.side * spread;
        }
        const s = S5(x, y);
        dots.moveTo(s[0] + 2.4, s[1]);
        dots.arc(s[0], s[1], 2.4, 0, TAU);
      }
      ctx.strokeStyle = P.veinBlack;
      ctx.lineWidth = 1.6;
      ctx.stroke(dots);
      ctx.fillStyle = P.monarch;
      ctx.fill(dots);
    }
    // the target ring on Michoacan: pops on 26.0, pulses on 26.25
    if (f >= 60) {
      const c = S5(TARGET[0], TARGET[1]);
      const pop = E.outBack((f - 60 + 1) / 3);
      const R = 30 * m.k * pop;
      ctx.strokeStyle = P.paper;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(c[0], c[1], Math.max(0.1, R), 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = P.annMagenta;
      ctx.fillStyle = P.annMagenta;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(c[0], c[1], Math.max(0.1, R), 0, TAU);
      ctx.stroke();
      if (pop >= 1) {
        ctx.globalAlpha = a5 * 0.5;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(c[0], c[1], 48 * m.k, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = a5;
      }
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const a = (k * Math.PI) / 2;
        ctx.moveTo(c[0] + Math.cos(a) * (R + 6), c[1] + Math.sin(a) * (R + 6));
        ctx.lineTo(c[0] + Math.cos(a) * (R + 18), c[1] + Math.sin(a) * (R + 18));
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(c[0], c[1], 3.5, 0, TAU);
      ctx.fill();
      const pt = tt - 2.75;
      if (pt >= -1e-6) {
        const p = clamp(pt / (10 / 24));
        const rr = 30 + 110 * E.outExpo(p);
        ctx.globalAlpha = a5 * (1 - p);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(c[0], c[1], rr * m.k, 0, TAU);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(c[0], c[1], (30 + 60 * E.outExpo(p)) * m.k, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // compositing
  // ---------------------------------------------------------------------------

  let scratch = null;
  function scratchFor(ctx) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    if (!scratch || scratch.canvas.width !== w || scratch.canvas.height !== h) {
      const c = FILM.makeCanvas(w, h);
      scratch = { canvas: c, ctx: c.getContext('2d') };
    }
    const s = scratch.ctx;
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.globalAlpha = 1;
    s.globalCompositeOperation = 'source-over';
    s.clearRect(0, 0, w, h);
    FILM.baseTransform(s);
    return scratch;
  }

  const DRAWERS = [drawL1, drawL2, drawL3, drawL4, drawL5];
  wings(); // build the G5 wing geometry at load, not inside the first frame

  // mode 'open': the layer runs past its own frame (it is the outermost thing on screen)
  // mode 'card': clipped to its own frame, sitting inside the outer layer
  // mode 'around': an outer layer fading in everywhere except over the inner frame `hole`
  function drawLayer(ctx, i, m, alpha, P, tt, f, bi, mode, hole) {
    const card = mode === 'card';
    const paint = (c) => {
      c.save();
      if (card) {
        const r = cardRect(m);
        c.beginPath();
        c.rect(r.x, r.y, r.w, r.h);
        c.clip();
      } else if (mode === 'around' && hole) {
        const r = cardRect(hole);
        c.beginPath();
        c.rect(-10, -10, FW + 20, FH + 20);
        c.rect(r.x, r.y, r.w, r.h);
        c.clip('evenodd');
      }
      c.translate(m.ox, m.oy);
      c.scale(m.k, m.k);
      DRAWERS[i](c, makeView(m, card, tt, f, bi), P);
      c.restore();
    };
    if (alpha >= 0.999) {
      paint(ctx);
      return;
    }
    const sc = scratchFor(ctx);
    paint(sc.ctx);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(sc.canvas, 0, 0, FW, FH);
    ctx.restore();
  }

  FILM.scene({
    id: ID,
    draw(ctx, t, info) {
      const L = info.lib;
      const P = L.pal;
      const tt = clamp(t, 0, info.dur);
      const f = Math.min(72, Math.floor(tt * 24 + 1e-6));
      const bi = L.boil(info.T);
      const M = cameraAt(tt);
      L.paper(ctx);
      if (f <= FADE[2].outF + 4) {
        L.stripes(ctx, { colors: [P.stripeCream, P.stripeApricot], width: 140, angle: -0.52, offset: 12 * tt, seed: sd('stripes1') });
      }
      const A = [0, 1, 2, 3, 4].map((i) => layerAlpha(i, f));
      let o = 4;
      while (o > 0 && A[o] <= 0) o--;
      let next;
      let l1Open = false;
      if (A[o] >= 0.999 || o === 0) {
        drawLayer(ctx, o, M[o], A[o], P, tt, f, bi, 'open');
        next = o - 1;
        l1Open = o === 0;
      } else {
        const n = o - 1;
        drawLayer(ctx, n, M[n], 1, P, tt, f, bi, 'card');
        drawLayer(ctx, o, M[o], A[o], P, tt, f, bi, 'around', M[n]);
        next = n - 1;
        l1Open = n === 0;
      }
      for (let i = next; i >= 1; i--) {
        if (A[i] <= 0 || M[i].k * FW < 2) continue;
        drawLayer(ctx, i, M[i], A[i], P, tt, f, bi, 'card');
      }
      if (!l1Open) drawFlyers(ctx, P, M, tt, f);
      if (next >= 0 && A[0] > 0) drawLayer(ctx, 0, M[0], A[0], P, tt, f, bi, 'card');
      migration(ctx, P, M, tt, f);
      trajectory(ctx, P, M, tt, f);
      framingRects(ctx, P, M, f);
    },
  });
})();
