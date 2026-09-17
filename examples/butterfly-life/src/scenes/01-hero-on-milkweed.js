// 01 hero-on-milkweed : Cold open, the monarch.
// An adult female Danaus plexippus seen from above on a common milkweed flower ball (G5 geometry).
// Frame 0 is fully drawn with wings flat open. The wings lift in three drawings, slam down on beat 2
// with a yellow and a magenta ring bursting from the thorax, and lift once more on beat 3.
(function () {
  'use strict';

  const ID = 'hero-on-milkweed';
  const LIB = FILM.lib;
  const PAL = LIB.pal;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;

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

  function polyDist(px, py, pts) {
    let m = Infinity;
    for (let i = 0; i + 1 < pts.length; i++) {
      const d = segDist(px, py, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      if (d < m) m = d;
    }
    return m;
  }

  // keep at most `max` evenly spaced points of a polyline (cheap distance tests)
  function thin(pts, max) {
    if (pts.length <= max) return pts;
    const out = [];
    for (let i = 0; i < max; i++) out.push(pts[Math.round((i * (pts.length - 1)) / (max - 1))]);
    return out;
  }

  // point at arc-length fraction u along a polyline
  function atFrac(pts, u) {
    let total = 0;
    for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    let want = clamp(u) * total;
    for (let i = 1; i < pts.length; i++) {
      const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (want <= l || i === pts.length - 1) {
        const f = l ? clamp(want / l) : 0;
        return [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)];
      }
      want -= l;
    }
    return pts[pts.length - 1].slice();
  }

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

  const COL = {
    deepInk: LIB.mix(PAL.monarchDeep, PAL.ink, 0.3),
    petal: LIB.mix(PAL.milkweedFlower, PAL.milkweedCrown, 0.5),
    petalCrease: LIB.mix(PAL.milkweedCrown, PAL.ink, 0.25),
    hood: LIB.mix(PAL.milkweedFlower, PAL.white, 0.22),
    leafDeep: LIB.mix(PAL.milkweedDeep, PAL.ink, 0.42),
    stemDeep: LIB.mix(PAL.milkweedDeep, PAL.ink, 0.35),
    apexOrange: '#E58E3A',
    underDeep: LIB.mix(PAL.monarchUnder, PAL.monarchDeep, 0.55),
  };

  // ---------------------------------------------------------------------------
  // G5 wing geometry, right side in the flat-open pose (left side is the mirror about x = 540)
  // ---------------------------------------------------------------------------

  const FORE = {
    // closed, clockwise on screen: base, costa, apex (1000, 640), termen, tornus (780, 1010), dorsum.
    // The termen is nearly straight (at most 15 px off the tip-to-tornus chord) like a real monarch.
    // The costa bows 8 px outward and the apex is blunt, about 20 px in radius.
    margin: [
      [552, 872], [600, 846], [686, 790], [786, 733], [890, 685], [946, 652], [972, 639], [990, 640],
      [996, 650], [992, 670], [976, 702], [939, 770], [892, 843], [842, 918], [808, 972], [789, 1000], [779, 1011],
      [758, 1007], [700, 988], [640, 962], [588, 935], [557, 919],
    ],
    // discal cell, clockwise from the base along the upper edge; its end runs about 110 px inside the termen
    cell: [[570, 888], [640, 862], [705, 838], [772, 806], [760, 833], [746, 860], [700, 874], [640, 890], [584, 905]],
    corners: { top: [772, 806], mid: [760, 833], bottom: [746, 860], before: [705, 838], after: [700, 874] },
    veins: [
      { n: 'R1', o: [665, 853], e: [790, 741], w0: 11, bow: 3 },
      { n: 'R2', o: [718, 831], e: [862, 701], w0: 11, bow: 4 },
      { n: 'R3', o: [752, 815], e: [935, 661], w0: 10, bow: 5 },
      { n: 'R4', u: 0, e: [991, 646], w0: 10, bow: 6 },
      { n: 'R5', u: 0.25, e: [978, 690], w0: 10, bow: 6 },
      { n: 'M1', u: 0.5, e: [946, 756], w0: 10, bow: 5 },
      { n: 'M2', u: 0.76, e: [901, 830], w0: 10, bow: 3 },
      { n: 'M3', u: 1, e: [855, 900], w0: 11, bow: 0 },
      { n: 'Cu1', o: [700, 874], e: [812, 965], w0: 12, bow: -3 },
      { n: 'Cu2', o: [645, 889], e: [785, 1006], w0: 14, bow: -6 },
      { n: '2A', o: [592, 903], e: [742, 1003], w0: 15, bow: -5 },
    ],
    marks: { apex: [994, 646], tornus: [779, 1011] },
  };

  const HIND = {
    margin: [
      [556, 930], [620, 936], [700, 958], [770, 990], [815, 1025], [842, 1072], [852, 1120], [850, 1150],
      [838, 1182], [806, 1212], [752, 1236], [690, 1246], [632, 1240], [590, 1226], [560, 1210], [551, 1170],
      [549, 1100], [551, 1020], [553, 960],
    ],
    cell: [[570, 948], [640, 968], [700, 994], [735, 1016], [729, 1046], [714, 1076], [665, 1062], [610, 1034], [574, 998]],
    corners: { top: [735, 1016], mid: [729, 1046], bottom: [714, 1076], before: [700, 994], after: [665, 1062] },
    veins: [
      { n: 'Sc', o: [625, 962], e: [812, 1022], w0: 12, bow: 6 },
      { n: 'Rs', u: 0, e: [846, 1085], w0: 11, bow: 4 },
      { n: 'M1', u: 0.27, e: [852, 1142], w0: 11, bow: 3 },
      { n: 'M2', u: 0.6, e: [828, 1192], w0: 11, bow: 2 },
      { n: 'M3', u: 1, e: [768, 1232], w0: 11, bow: 0 },
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
    const K = def.corners;
    const iTop = nearestIdx(cell, K.top), iBot = nearestIdx(cell, K.bottom);
    // the cell end is one smooth stroke that starts and ends 3 px inside the upper and lower bars
    const unit = (a, b) => {
      const dx = a[0] - b[0], dy = a[1] - b[1];
      const l = Math.hypot(dx, dy) || 1;
      return [dx / l, dy / l];
    };
    const dT = unit(K.top, K.before), dB = unit(K.bottom, K.after);
    const endPath = LIB.smoothPts([[K.top[0] - dT[0] * 3, K.top[1] - dT[1] * 3], K.mid, [K.bottom[0] - dB[0] * 3, K.bottom[1] - dB[1] * 3]], false, 2);
    const veins = def.veins.map((v) => {
      const o = v.u != null ? atFrac(endPath, v.u) : cell[nearestIdx(cell, v.o)];
      const oi = nearestIdx(cell, o), ei = nearestIdx(margin, v.e);
      const e = margin[ei];
      const dx = e[0] - o[0], dy = e[1] - o[1];
      const len = Math.hypot(dx, dy) || 1;
      const mid = [(o[0] + e[0]) / 2 - (dy / len) * v.bow, (o[1] + e[1]) / 2 + (dx / len) * v.bow];
      return { n: v.n, oi, ei, o, e, mid, pts: LIB.smoothPts([o, mid, e], false, 5), w0: v.w0 };
    });
    const byName = {};
    for (const v of veins) byName[v.n] = v;
    const vFirst = { oi: 0, ei: 0, o: cell[0], e: margin[0], pts: [cell[0], margin[0]] };
    const vLast = { oi: nc - 1, ei: n - 1, o: cell[nc - 1], e: margin[n - 1], pts: [cell[nc - 1], margin[n - 1]] };
    const seq = [vFirst, ...veins, vLast];
    const cells = [];
    for (let k = 0; k < seq.length - 1; k++) {
      const A = seq[k], B = seq[k + 1];
      const poly = A.pts.slice();
      for (let i = A.ei + 1; i < B.ei; i++) poly.push(margin[i]);
      for (let i = B.pts.length - 1; i >= 0; i--) poly.push(B.pts[i]);
      for (let i = B.oi - 1; i > A.oi; i--) poly.push(cell[i]);
      // both bounding veins; posed() picks the one on the lower right as the shadow side
      cells.push({ poly, sides: [A.pts, B.pts] });
    }
    const lowerBar = cell.slice(iBot).concat([cell[0]]);
    cells.push({ poly: cell, sides: [lowerBar], disc: true });

    // border band: quads between the margin and an inner line that bulges inward where veins arrive
    let wAt;
    let iApex = 0, iTornus = 0;
    if (isFore) {
      const ia = (iApex = nearestIdx(margin, def.marks.apex)), it = (iTornus = nearestIdx(margin, def.marks.tornus));
      wAt = (i) => {
        if (i <= ia) return lerp(9, 30, Math.pow(i / ia, 1.6));
        if (i <= it) return 36;
        return lerp(30, 9, Math.pow((i - it) / (n - it), 0.7));
      };
    } else {
      const ic = nearestIdx(margin, def.marks.costaEnd), ii = nearestIdx(margin, def.marks.inner);
      wAt = (i) => {
        if (i <= ic) return lerp(12, 34, sstep(0.55, 1, i / ic));
        if (i <= ii) return 36;
        return lerp(28, 10, Math.pow((i - ii) / (n - ii), 0.6));
      };
    }
    const outer = [], inner = [];
    for (let i = 0; i < n; i++) {
      const a = margin[(i - 2 + n) % n], b = margin[(i + 2) % n];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      let w = wAt(i);
      for (const v of veins) {
        const d = Math.min(Math.abs(i - v.ei), n - Math.abs(i - v.ei)) * 4;
        w += 9 * Math.exp(-(d * d) / (13 * 13)) * (w > 20 ? 1 : 0.4);
      }
      w += 1.6 * LIB.noise1(i * 0.21, sd('band', isFore ? 1 : 2));
      const p = margin[i];
      outer.push(p);
      inner.push([p[0] - ty * w, p[1] + tx * w]);
    }

    // marginal white spots: two rows between vein ends along the outer border
    const spots = [];
    const r = LIB.rng(sd('spots', isFore ? 1 : 2));
    const outerVeins = isFore ? ['R5', 'M1', 'M2', 'M3', 'Cu1', 'Cu2'] : ['Sc', 'Rs', 'M1', 'M2', 'M3', 'Cu1', 'Cu2', '1A'];
    const ends = outerVeins.map((k) => byName[k].ei);
    if (isFore) ends.unshift(nearestIdx(margin, def.marks.apex));
    else ends.push(nearestIdx(margin, def.marks.inner));
    const spotAt = (fi, inset, rad, elong) => {
      const i = Math.round(fi);
      const p = margin[i], q = inner[i];
      const dx = q[0] - p[0], dy = q[1] - p[1];
      const dl = Math.hypot(dx, dy) || 1;
      spots.push({ x: p[0] + (dx / dl) * inset, y: p[1] + (dy / dl) * inset, r: rad, e: elong, a: Math.atan2(dy, dx) });
    };
    for (let k = 0; k < ends.length - 1; k++) {
      const i0 = ends[k], i1 = ends[k + 1];
      const span = i1 - i0;
      if (span < 6) continue;
      spotAt(i0 + span * 0.5, 25, r.range(5.2, 6.2), 1.25);
      spotAt(i0 + span * 0.3, 10, r.range(3.6, 4.3), 1.1);
      spotAt(i0 + span * 0.7, 10, r.range(3.6, 4.3), 1.1);
    }
    // forewing apex: subapical white band and three orange spots, each centred between two veins
    const apexSpots = [];
    if (isFore) {
      const between = (a, b, u, rad, e, color) => {
        const A = byName[a], B = byName[b];
        const pa = A.pts[Math.round((A.pts.length - 1) * u)], pb = B.pts[Math.round((B.pts.length - 1) * u)];
        const dir = Math.atan2(A.e[1] - A.o[1] + B.e[1] - B.o[1], A.e[0] - A.o[0] + B.e[0] - B.o[0]);
        const gap = Math.hypot(pa[0] - pb[0], pa[1] - pb[1]);
        apexSpots.push({ x: (pa[0] + pb[0]) / 2, y: (pa[1] + pb[1]) / 2, r: Math.min(rad, gap * 0.3), e, a: dir, color });
      };
      between('R1', 'R2', 0.86, 7, 1.7, 'w');
      between('R2', 'R3', 0.86, 8, 1.8, 'w');
      between('R3', 'R4', 0.84, 8, 1.8, 'w');
      between('R4', 'R5', 0.82, 8, 1.7, 'w');
      between('R5', 'M1', 0.78, 7, 1.6, 'w');
      between('R3', 'R4', 0.6, 10, 1.7, 'o');
      between('R4', 'R5', 0.58, 12, 1.8, 'o');
      between('R5', 'M1', 0.56, 12, 1.8, 'o');
      // a marginal spot never sits on top of a subapical one
      for (let i = spots.length - 1; i >= 0; i--) {
        const q = spots[i];
        if (apexSpots.some((a) => Math.hypot(a.x - q.x, a.y - q.y) < a.r * a.e + q.r * q.e + 4)) spots.splice(i, 1);
      }
    }
    // forewing apex black: follows the veins, reaching further in along each vein than between them
    let apexPatch = null;
    if (isFore) {
      const on = (name, u) => {
        const V = byName[name];
        return V.pts[Math.round((V.pts.length - 1) * u)];
      };
      const mid = (a, b, u) => {
        const p = on(a, u), q = on(b, u);
        return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      };
      const seqA = [
        on('R1', 0.62), mid('R1', 'R2', 0.72), on('R2', 0.36), mid('R2', 'R3', 0.46), on('R3', 0.26), mid('R3', 'R4', 0.42),
        on('R4', 0.2), mid('R4', 'R5', 0.4), on('R5', 0.22), mid('R5', 'M1', 0.42), on('M1', 0.5), mid('M1', 'M2', 0.93), on('M2', 0.98),
      ];
      apexPatch = LIB.smoothPts(seqA, false, 5).concat([[1070, 870], [1070, 560], [760, 600]]);
    }
    return {
      margin, cell, veins, byName, cells, outer, inner, spots, apexSpots, apexPatch, isFore, iTop, iBot, endPath, iApex, iTornus,
      apexZone: isFore ? [byName.R1.ei, byName.M2.ei] : null,
    };
  }

  const WINGS = { fore: buildWing(FORE, true), hind: buildWing(HIND, false) };

  // Scale rows on the black: short strokes parallel to the nearest margin, denser toward the light.
  function buildScaleRows(W, seed) {
    const M = W.margin, n = M.length;
    const NX = new Float64Array(n), NY = new Float64Array(n), BW = new Float64Array(n);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < n; i++) {
      const dx = W.inner[i][0] - M[i][0], dy = W.inner[i][1] - M[i][1];
      const l = Math.hypot(dx, dy) || 1;
      NX[i] = dx / l;
      NY[i] = dy / l;
      BW[i] = l;
      x0 = Math.min(x0, M[i][0]);
      x1 = Math.max(x1, M[i][0]);
      y0 = Math.min(y0, M[i][1]);
      y1 = Math.max(y1, M[i][1]);
    }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.max(40, Math.max(x1 - x0, y1 - y0) / 2);
    const r = LIB.rng(seed);
    const band = [], apex = [];
    const az = W.apexZone;
    const rows = az ? 22 : 7;
    for (let j = 0; j < rows; j++) {
      const d = 3 + j * 6;
      let i = (r() * 5) | 0;
      while (i < n - 1) {
        const i1 = Math.min(n - 1, i + 2 + ((r() * 4) | 0));
        const inApex = az && i >= az[0] && i1 <= az[1];
        const lim = inApex ? 128 : Math.min(BW[i], BW[i1]) + 1;
        if (d <= lim) {
          const im = (i + i1) >> 1;
          const q0x = M[i][0] + NX[i] * d, q0y = M[i][1] + NY[i] * d;
          const q1x = M[im][0] + NX[im] * d, q1y = M[im][1] + NY[im] * d;
          const q2x = M[i1][0] + NX[i1] * d, q2y = M[i1][1] + NY[i1] * d;
          let ok = true;
          if (inApex && d > 10) {
            // the stroke must stay parallel to its own stretch of margin (no crossings at the tip)
            for (let k = Math.max(0, im - 110); k < Math.min(n, im + 110); k++) {
              if (Math.hypot(M[k][0] - q1x, M[k][1] - q1y) < d - 2.5) {
                ok = false;
                break;
              }
            }
          }
          const lit = ((cx - q1x) + (cy - q1y)) / (R * 1.414);
          const keep = lerp(0.42, 1, sstep(-0.7, 0.7, lit));
          const roll = r(), cls = r() < 0.5 ? 0 : 1;
          if (ok && roll < keep) (inApex ? apex : band).push(q0x, q0y, q1x, q1y, q2x, q2y, cls);
        }
        i = i1 + 1 + ((r() * 2) | 0);
      }
    }
    return { band, apex };
  }

  // Pose: each wing hinges on its own root line (x 558 right, 522 left) and foreshortens as it rises.
  const poseCache = new Map();
  function posed(kind, mirror, s) {
    const key = kind + (mirror ? 'L' : 'R') + s;
    if (poseCache.has(key)) return poseCache.get(key);
    const W = WINGS[kind];
    const root = mirror ? 522 : 558;
    // rising toward the camera: the wing lengthens along the body axis and the nearer wing grows a little
    const lift = clamp(1 - s, 0, 1);
    const ky = 1 + 0.22 * lift;
    const sx = s * (1 + 0.1 * lift);
    const P = (p) => [root + ((mirror ? 1080 - p[0] : p[0]) - root) * sx, 900 + (p[1] - 900) * ky];
    const PA = (arr) => arr.map(P);
    const spotMap = (q) => {
      const p = P([q.x, q.y]);
      return Object.assign({}, q, { x: p[0], y: p[1], a: mirror ? Math.PI - q.a : q.a });
    };
    const out = {
      kind,
      s,
      sx,
      ky,
      root,
      mirror,
      isFore: W.isFore,
      margin: PA(W.margin),
      cell: PA(W.cell),
      endPath: PA(W.endPath),
      veins: W.veins.map((v) => ({ n: v.n, pts: PA(v.pts), w0: v.w0, o: P(v.o), e: P(v.e), ei: v.ei })),
      // flat: the shadow vein in the flat pose (mirrored for the left wings), for tone lookups.
      // Light comes from the upper left, so the shadow side is the bounding vein nearest the lower right of the cell.
      cells: W.cells.map((c) => {
        const M = (p) => [mirror ? 1080 - p[0] : p[0], p[1]];
        const poly = c.poly.map(M);
        let cx = 0, cy = 0;
        for (const p of poly) {
          cx += p[0];
          cy += p[1];
        }
        cx /= poly.length;
        cy /= poly.length;
        let best = null, bv = -Infinity;
        for (const side of c.sides) {
          const pts = side.map(M);
          let q = pts[0], qd = Infinity;
          for (const p of pts) {
            const d = Math.hypot(p[0] - cx, p[1] - cy);
            if (d < qd) {
              qd = d;
              q = p;
            }
          }
          const v = (q[0] - cx + q[1] - cy) / (qd || 1);
          if (v > bv) {
            bv = v;
            best = pts;
          }
        }
        return { poly: PA(c.poly), flat: thin(best, 8), disc: !!c.disc };
      }),
      outer: PA(W.outer),
      inner: PA(W.inner),
      spots: W.spots.map(spotMap),
      apexSpots: W.apexSpots.map(spotMap),
      apexPatch: W.apexPatch ? PA(W.apexPatch) : null,
      apexZone: W.apexZone,
      iTop: W.iTop,
      iBot: W.iBot,
      iApex: W.iApex,
      iTornus: W.iTornus,
      base: P([556, 900]),
    };
    out.rows = buildScaleRows(out, sd('rows', kind, mirror ? 1 : 0));
    const marginPath = new Path2D();
    trace(marginPath, out.margin, true);
    out.marginPath = marginPath;
    const bandPath = new Path2D();
    const n = out.outer.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      bandPath.moveTo(out.outer[i][0], out.outer[i][1]);
      bandPath.lineTo(out.outer[j][0], out.outer[j][1]);
      bandPath.lineTo(out.inner[j][0], out.inner[j][1]);
      bandPath.lineTo(out.inner[i][0], out.inner[i][1]);
      bandPath.closePath();
    }
    out.bandPath = bandPath;
    if (out.apexPatch) {
      const ap = new Path2D();
      trace(ap, out.apexPatch, true);
      out.apexPath = ap;
    }
    poseCache.set(key, out);
    if (poseCache.size > 64) poseCache.delete(poseCache.keys().next().value);
    return out;
  }

  // ---------------------------------------------------------------------------
  // milkweed florets on a ball centred (540, 1150), radius 220
  // ---------------------------------------------------------------------------

  const BALL = { x: 540, y: 1150, r: 220 };
  const FLORETS = (() => {
    const r = LIB.rng(sd('florets'));
    // 130 points on the sphere put about 45 florets on the front hemisphere (nz > 0.3), a full dome
    const N = 130;
    const GA = Math.PI * (3 - Math.sqrt(5));
    const list = [];
    for (let i = 0; i < N; i++) {
      const z = 1 - (2 * (i + 0.5)) / N;
      const rr = Math.sqrt(1 - z * z);
      const th = i * GA + r.range(-0.1, 0.1);
      const nx = rr * Math.cos(th), ny = rr * Math.sin(th), nz = z;
      if (nz < -0.22) continue;
      // the lower florets hang out further so the ball meets the stem at y 1370
      const R = ny > 0.6 ? 200 + r.range(-4, 4) : 176 + r.range(-6, 8);
      list.push({ nx, ny, nz, x: BALL.x + nx * R, y: BALL.y + ny * R, size: r.range(44, 50), rot: r.range(0, TAU), phase: r.range(0, TAU), bud: r() < 0.08, seed: i });
    }
    // rim florets seen edge-on at both sides, 30 to 65 degrees below horizontal, hanging out to radius 245
    // so they peek past the hindwing margins when the wings are flat open
    let seed = N;
    for (const side of [-1, 1]) {
      for (const a of [24, 38, 52, 65]) {
        const aa = (a + r.range(-3, 3)) * DEG;
        const nx = side * Math.cos(aa), ny = Math.sin(aa);
        list.push({ nx: nx * 0.94, ny: ny * 0.94, nz: 0.34, x: BALL.x + nx * 255, y: BALL.y + ny * 255, size: r.range(46, 50), rot: r.range(0, TAU), phase: r.range(0, TAU), bud: a === 52 && side > 0, seed: seed++ });
      }
    }
    // upper-side hoods, 16 and 38 degrees above horizontal, so the walking tarsi
    // land outside the 30 percent wing (x about 430) at the aim height y 1035-1110
    for (const side of [-1, 1]) {
      for (const a of [16, 38]) {
        const aa = (a + r.range(-2, 2)) * DEG;
        const nx = side * Math.cos(aa), ny = -Math.sin(aa);
        list.push({ nx: nx * 0.93, ny: ny * 0.93, nz: 0.36, x: BALL.x + nx * 200, y: BALL.y + ny * 200, size: r.range(46, 50), rot: r.range(0, TAU), phase: r.range(0, TAU), bud: false, seed: seed++ });
      }
    }
    list.sort((a, b) => a.nz - b.nz);
    return list;
  })();
  const bobOf = (f, tw) => 3 * Math.sin(tw * TAU * 1.5 + f.phase);

  function drawBud(ctx, f, cx, cy, P) {
    let dx = f.nx, dy = f.ny;
    const l = Math.hypot(dx, dy);
    if (l < 0.25) {
      dx = 0.3;
      dy = -0.95;
    } else {
      dx /= l;
      dy /= l;
    }
    const nx = -dy, ny = dx;
    // short pedicel, then a teardrop 10 px wide and 16 px long pointing outward
    const bx = cx + dx * 5, by = cy + dy * 5;
    ctx.beginPath();
    ctx.moveTo(cx - dx * 4, cy - dy * 4);
    ctx.lineTo(bx, by);
    ctx.strokeStyle = P.milkweedStem;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    const side1 = [], side2 = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const w = (5 * Math.pow(t, 0.5) * Math.pow(1 - t, 0.9)) / 0.401;
      side1.push([bx + dx * 16 * t + nx * w, by + dy * 16 * t + ny * w]);
      side2.push([bx + dx * 16 * t - nx * w, by + dy * 16 * t - ny * w]);
    }
    const pts = side1.concat(side2.reverse());
    const p = new Path2D();
    trace(p, pts, true);
    ctx.fillStyle = P.milkweedFlower;
    ctx.fill(p);
    // shadow side (lower right) in crown colour
    const sh = new Path2D();
    const sgn = nx * 0.7 + ny * 0.7 > 0 ? 1 : -1;
    for (let i = 2; i <= 11; i++) {
      const t = i / 12;
      const w = ((5 * Math.pow(t, 0.5) * Math.pow(1 - t, 0.9)) / 0.401) * 0.55;
      const x = bx + dx * 16 * t + nx * w * sgn, y = by + dy * 16 * t + ny * w * sgn;
      if (i === 2) sh.moveTo(x, y);
      else sh.lineTo(x, y);
    }
    ctx.strokeStyle = P.milkweedCrown;
    ctx.lineWidth = 2.6;
    ctx.stroke(sh);
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 1.3;
    ctx.globalAlpha = 0.9;
    ctx.stroke(p);
    ctx.globalAlpha = 1;
  }

  function drawFloret(ctx, f, P, bob, bi) {
    const cx = f.x, cy = f.y + bob;
    if (f.bud) {
      drawBud(ctx, f, cx, cy, P);
      return;
    }
    let e1x = f.ny, e1y = -f.nx;
    let l1 = Math.hypot(e1x, e1y);
    if (l1 < 1e-3) {
      e1x = 1;
      e1y = 0;
      l1 = 1;
    }
    e1x /= l1;
    e1y /= l1;
    // e2 = n x e1, with the foreshortening eased so rim florets still read
    const nzv = 0.5 + 0.5 * Math.max(0, f.nz);
    const e2x = -nzv * e1y;
    const e2y = nzv * e1x;
    // lift moves a point along the floret's own axis: + up out of the ball, - swept back into it
    const side = Math.hypot(f.nx, f.ny);
    const proj = (px, py, lift) => [cx + px * e1x + py * e2x + lift * f.nx, cy + px * e1y + py * e2y + lift * f.ny];
    const pr = (a, rad, lift) => proj(Math.cos(a) * rad, Math.sin(a) * rad, lift);
    const J = (k) => LIB.h3(f.seed, k, bi) - 0.5;
    const S = f.size;
    const back = -S * (0.12 + 0.3 * side);

    // 1. five petals swept back under the crown: a darker skirt seen between and below the hoods
    const petals = new Path2D();
    const crease = new Path2D();
    for (let k = 0; k < 5; k++) {
      const a = f.rot + (k / 5) * TAU;
      const bl = pr(a - 0.5, 5, 0), br = pr(a + 0.5, 5, 0);
      const tip = pr(a + J(k) * 0.08, S * 0.7 + J(k + 9) * 2, back);
      const cl = pr(a - 0.34, S * 0.5, back * 0.45), cr = pr(a + 0.34, S * 0.5, back * 0.45);
      petals.moveTo(bl[0], bl[1]);
      petals.quadraticCurveTo(cl[0], cl[1], tip[0], tip[1]);
      petals.quadraticCurveTo(cr[0], cr[1], br[0], br[1]);
      petals.closePath();
      const c0 = pr(a, S * 0.34, back * 0.3), c1 = pr(a, S * 0.6, back * 0.8);
      crease.moveTo(c0[0], c0[1]);
      crease.lineTo(c1[0], c1[1]);
    }
    ctx.fillStyle = COL.petal;
    ctx.fill(petals);
    ctx.strokeStyle = COL.petalCrease;
    ctx.lineWidth = 1.1;
    ctx.globalAlpha = 0.85;
    ctx.stroke(crease);
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 1.3;
    ctx.globalAlpha = 0.85;
    ctx.stroke(petals);
    ctx.globalAlpha = 1;

    // 2. the crown: five upright hood cups open toward the column, each with a horn arching over it
    const hoods = new Path2D(), cups = new Path2D(), horns = new Path2D(), lights = new Path2D();
    const hoodLift = S * 0.14;
    for (let k = 0; k < 5; k++) {
      const a = f.rot + ((k + 0.5) / 5) * TAU;
      const ca = Math.cos(a), sa = Math.sin(a);
      const ell = (path, rc, rx, ry, lift, lean) => {
        for (let m = 0; m < 14; m++) {
          const b = (m / 14) * TAU;
          const u = rc + Math.cos(b) * rx, v = Math.sin(b) * ry;
          // the outer end of a hood stands taller than its inner lip
          const q = proj(u * ca - v * sa, u * sa + v * ca, lift + lean * Math.cos(b));
          if (m === 0) path.moveTo(q[0], q[1]);
          else path.lineTo(q[0], q[1]);
        }
        path.closePath();
      };
      ell(hoods, S * 0.3, S * 0.24, S * 0.17, hoodLift, S * 0.08);
      ell(cups, S * 0.22, S * 0.11, S * 0.095, hoodLift * 0.9, 0);
      const h0 = pr(a, S * 0.22, hoodLift), h1 = pr(a + 0.5, S * 0.14, hoodLift * 1.9), h2 = pr(a + 0.34, S * 0.07, hoodLift * 1.4);
      horns.moveTo(h0[0], h0[1]);
      horns.quadraticCurveTo(h1[0], h1[1], h2[0], h2[1]);
      const l0 = pr(a - 0.28, S * 0.36, hoodLift * 1.3), l1p = pr(a - 0.1, S * 0.46, hoodLift * 1.5);
      lights.moveTo(l0[0], l0[1]);
      lights.lineTo(l1p[0], l1p[1]);
    }
    ctx.fillStyle = COL.hood;
    ctx.fill(hoods);
    ctx.fillStyle = P.milkweedCrown;
    ctx.fill(cups);
    ctx.strokeStyle = P.white;
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.55;
    ctx.stroke(lights);
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.9;
    ctx.stroke(hoods);
    ctx.lineWidth = 1.2;
    ctx.stroke(horns);
    // 3. the column top: a small pale pentagon with five anther slits
    const pent = new Path2D(), slits = new Path2D();
    for (let m = 0; m < 5; m++) {
      const q = pr(f.rot + (m / 5) * TAU, 5, hoodLift * 1.2);
      if (m === 0) pent.moveTo(q[0], q[1]);
      else pent.lineTo(q[0], q[1]);
      const o = pr(f.rot + ((m + 0.5) / 5) * TAU, 1.5, hoodLift * 1.2), w = pr(f.rot + ((m + 0.5) / 5) * TAU, 4.2, hoodLift * 1.2);
      slits.moveTo(o[0], o[1]);
      slits.lineTo(w[0], w[1]);
    }
    pent.closePath();
    ctx.globalAlpha = 1;
    ctx.fillStyle = P.egg;
    ctx.fill(pent);
    ctx.lineWidth = 0.9;
    ctx.globalAlpha = 0.75;
    ctx.stroke(pent);
    ctx.globalAlpha = 0.6;
    ctx.stroke(slits);
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------------------
  // leaves
  // ---------------------------------------------------------------------------

  // fold: { u0, u1, k } turns the upper half of the tip over onto the lower half. The fold line runs
  // diagonally from the upper edge at u0 to the midrib at u1, and the flap lies back at k of its width.
  function leafGeom(bx, by, tx, ty, width, key, bend = 16, fold = null) {
    const len = Math.hypot(tx - bx, ty - by);
    const ux = (tx - bx) / len, uy = (ty - by) / len;
    let nx = -uy, ny = ux;
    if (ny > 0) {
      nx = -nx;
      ny = -ny;
    }
    const pet = 38;
    const blade = len - pet;
    const r = LIB.rng(sd('leaf', key));
    const shape = (u) => Math.pow(Math.sin(Math.PI * Math.pow(clamp(u), 0.78)), 0.72);
    const bendAt = (u) => bend * 4 * u * (1 - u);
    const at = (u, v) => [bx + ux * (pet + u * blade) + nx * (v + bendAt(u)), by + uy * (pet + u * blade) + ny * (v + bendAt(u))];
    const N = 40;
    const upper = [], lower = [];
    const hwAt = (u) => (width / 2) * shape(u) * (1 + 0.03 * LIB.noise1(u * 6, sd('leafedge', key)));
    const uCut = fold ? fold.u0 - 0.03 : 2;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      if (u < uCut) upper.push(at(u, hwAt(u)));
      lower.push(at(u, -hwAt(u) * 0.96));
    }
    // the folded tip, sampled finely so the diagonal crease stays smooth
    const flapFold = [], flapEdge = [];
    if (fold) {
      for (let i = 0; i <= 36; i++) {
        const u = uCut + (i / 36) * (1 - uCut);
        const hw = hwAt(u);
        const strip = hw * sstep(fold.u0, fold.u1, u);
        flapFold.push(at(u, hw - strip));
        flapEdge.push(at(u, hw - strip - strip * fold.k));
        upper.push(at(u, hw - strip));
      }
    }
    const outline = upper.concat(lower.slice(1, N).reverse());
    const mid = [];
    for (let i = 0; i <= N; i++) mid.push(at(i / N, 0));
    const upperHalf = upper.concat(mid.slice(1, N).reverse());
    const lowerHalf = lower.concat(mid.slice(1, N).reverse());
    // common milkweed: many side veins leaving the midrib almost at right angles, looping toward the tip at the margin
    const veins = [];
    for (let k = 0; k < 14; k++) {
      const u0 = 0.05 + k * 0.064 + r.range(-0.008, 0.008);
      const u1 = Math.min(0.97, u0 + 0.05);
      for (const side of [1, -1]) {
        const sideK = side > 0 ? 1 : 0.96;
        const hwMid = (width / 2) * shape(u0 + 0.012) * sideK;
        const hwEnd = (width / 2) * shape(u1) * sideK;
        const p0 = at(u0, 0), p1 = at(u0 + 0.012, side * hwMid * 0.8), p2 = at(u1, side * hwEnd * 0.9);
        veins.push({ side, pts: [p0, p1, p2], u0 });
      }
    }
    const veinAngle = (side) => {
      const v = veins.find((q) => q.side === side && q.u0 > 0.3);
      return Math.atan2(v.pts[2][1] - v.pts[0][1], v.pts[2][0] - v.pts[0][0]);
    };
    return {
      outline, upperHalf, lowerHalf, mid, veins, base: [bx, by], tip: [tx, ty],
      stalk: [[bx, by], at(0, 0)], ux, uy, nx, ny, width, blade, pet, bend,
      angUpper: veinAngle(1), angLower: veinAngle(-1),
      hwAt, flap: fold ? { fold: flapFold, edge: flapEdge, poly: flapFold.concat(flapEdge.slice().reverse()) } : null,
    };
  }

  const LEAVES = [
    // lower pair: broad blades that run off the bottom edge, bent unevenly so the pairs do not mirror
    leafGeom(527, 1842, 70, 1816, 270, 'll', 16),
    leafGeom(553, 1842, 1010, 1826, 270, 'lr', 24),
    leafGeom(527, 1522, 110, 1370, 200, 'ul'),
    // the upper right leaf's tip is turned over toward the viewer, showing its pale downy underside
    leafGeom(553, 1522, 970, 1370, 200, 'ur', 16, { u0: 0.78, u1: 0.9, k: 0.88 }),
  ];

  function drawLeaf(ctx, Lf, P, key) {
    const L = LIB;
    const deep = COL.leafDeep;
    // petiole
    L.inkPath(ctx, Lf.stalk, { width: 15, color: P.ink, seed: sd('pet0', key), taper: [0, 4], swell: 0, wobble: 0.4 });
    L.inkPath(ctx, Lf.stalk, { width: 9, color: P.milkweedStem, seed: sd('pet', key), taper: [0, 4], swell: 0, wobble: 0.4 });
    L.inkPath(ctx, Lf.outline, { closed: true, width: 3, fill: P.milkweed, seed: sd('leafline', key), wobble: 1.4 });
    // tone: shadow half gets hatch parallel to the side veins, lit half only a light crease shade
    const hw = Lf.width / 2;
    const uOf = (x, y) => ((x - Lf.base[0]) * Lf.ux + (y - Lf.base[1]) * Lf.uy - Lf.pet) / Lf.blade;
    const vOf = (x, y) => {
      const u = uOf(x, y);
      return Math.abs((x - Lf.base[0]) * Lf.nx + (y - Lf.base[1]) * Lf.ny - 4 * Lf.bend * clamp(u) * (1 - clamp(u))) / hw;
    };
    L.hatch(ctx, Lf.lowerHalf, {
      angle: Lf.angLower,
      spacing: 5,
      width: 1.8,
      color: deep,
      alpha: 0.85,
      length: [12, 30],
      seed: sd('lh', key),
      density: (x, y) => 0.55 + 0.45 * sstep(0.05, 0.7, vOf(x, y)),
    });
    L.hatch(ctx, Lf.lowerHalf, {
      angle: Lf.angLower + 1.05,
      spacing: 7,
      width: 1.3,
      color: P.ink,
      alpha: 0.45,
      length: [10, 26],
      seed: sd('lh2', key),
      density: (x, y) => 0.9 * sstep(0.45, 0.95, vOf(x, y)) * (1 - sstep(0.8, 1, uOf(x, y))),
    });
    L.hatch(ctx, Lf.upperHalf, {
      angle: Lf.angUpper,
      spacing: 8,
      width: 1.5,
      color: deep,
      alpha: 0.75,
      length: [10, 26],
      seed: sd('uh', key),
      density: (x, y) => 0.7 * (1 - sstep(0.05, 0.45, vOf(x, y))) + 0.35 * sstep(0.8, 1.0, vOf(x, y)) * sstep(0.4, 0.9, uOf(x, y)),
    });
    if (key === 'ul' || key === 'ur') {
      // the lower 35 percent of an upper blade turns from the light: an ink cross layer at 105 degrees
      const vLoc = (x, y) => {
        const u = clamp(uOf(x, y), 0.001, 0.999);
        return (vOf(x, y) * hw) / Math.max(4, Lf.hwAt(u));
      };
      L.hatch(ctx, Lf.lowerHalf, {
        angle: -Math.PI / 4 - Math.PI / 3,
        spacing: 7,
        width: 1.3,
        color: P.ink,
        alpha: 0.5,
        length: [10, 24],
        seed: sd('lh3', key),
        density: (x, y) => sstep(0.22, 0.32, vLoc(x, y)),
      });
    }
    if (key === 'ur') {
      // the stem and leaf stalk cast a 20 px shadow strip down and right onto the blade
      const strip = [[544, 1380], [564, 1380], [564, 1524], [600, 1509], [606, 1529], [557, 1542], [544, 1542]].map((p) => [p[0] + 14, p[1] + 10]);
      ctx.save();
      ctx.beginPath();
      trace(ctx, Lf.outline, true);
      ctx.clip();
      L.hatch(ctx, strip, { angle: -Math.PI / 4, spacing: 4, width: 1.4, color: P.milkweedDeep, alpha: 0.8, length: [8, 20], seed: sd('stemsh') });
      ctx.restore();
    }
    // downy hairs
    L.stipple(ctx, Lf.outline, { spacing: 11, density: 0.4, r: [1.0, 1.3], color: P.milkweedPale, alpha: 0.55, seed: sd('hair', key) });
    // side veins and midrib (clipped, so a folded tip leaves no vein hanging in the air)
    ctx.save();
    if (Lf.flap) {
      ctx.beginPath();
      trace(ctx, Lf.outline, true);
      ctx.clip();
    }
    for (let k = 0; k < Lf.veins.length; k++) {
      L.inkPath(ctx, Lf.veins[k].pts, { width: 1.8, color: P.milkweedPale, alpha: 0.95, seed: sd('lv', key, k), taper: [3, 14], wobble: 0.6, step: 3 });
    }
    L.inkPath(ctx, Lf.mid, { width: 4.2, color: P.milkweedPale, seed: sd('mid', key), taper: [2, 60], wobble: 0.8 });
    L.inkPath(ctx, Lf.mid, { width: 1.2, color: P.inkSoft, alpha: 0.5, seed: sd('mid2', key), taper: [10, 80], wobble: 0.8, double: false });
    ctx.restore();

    if (Lf.flap) {
      const F = Lf.flap;
      // the flap's shadow on the blade below its free edge
      ctx.save();
      ctx.beginPath();
      trace(ctx, Lf.outline, true);
      ctx.clip();
      L.hatch(ctx, F.poly.map((p) => [p[0] + 5, p[1] + 8]), { angle: -Math.PI / 4, spacing: 3.5, width: 1.3, color: deep, alpha: 0.9, length: [6, 16], inset: 0, seed: sd('flapsh', key) });
      ctx.restore();
      // the pale underside, downy, with raised veins
      fillPoly(ctx, F.poly, P.milkweedPale);
      const eDist = (x, y) => polyDist(x, y, F.edge);
      L.hatch(ctx, F.poly, { angle: Lf.angLower + 1.05, spacing: 5, width: 1.3, color: P.milkweed, alpha: 0.9, length: [6, 16], inset: 1, seed: sd('flaph', key), density: (x, y) => 1 - sstep(5, 16, eDist(x, y)) });
      L.stipple(ctx, F.poly, { spacing: 7.5, density: 1, r: [1.0, 1.3], color: P.milkweed, alpha: 0.75, seed: sd('flaphair', key) });
      const fv = [];
      for (let i = 4; i + 6 < F.fold.length; i += 6) {
        const a = F.fold[i], b = F.fold[i + 3], c = F.edge[i + 3], d = F.fold[i + 6], e = F.edge[i + 6];
        if (Math.hypot(e[0] - d[0], e[1] - d[1]) < 12) continue;
        fv.push([a, [lerp(b[0], c[0], 0.5), lerp(b[1], c[1], 0.5)], [lerp(d[0], e[0], 0.88), lerp(d[1], e[1], 0.88)]]);
      }
      fv.forEach((pts, j) => L.inkPath(ctx, pts, { width: 1.5, color: P.milkweed, alpha: 0.95, seed: sd('flapv', key, j), taper: [2, 8], wobble: 0.4, step: 3 }));
      L.inkPath(ctx, F.edge, { width: 2.4, color: P.ink, seed: sd('flapedge', key), taper: [4, 4], wobble: 0.6 });
      L.inkPath(ctx, F.fold, { width: 3, color: P.ink, seed: sd('flapfold', key), taper: [3, 3], wobble: 0.6 });
    }
  }

  // ---------------------------------------------------------------------------
  // butterfly body
  // ---------------------------------------------------------------------------

  const ABDOMEN = (() => {
    const prof = [[944, 17], [962, 21.5], [990, 23.5], [1025, 22], [1055, 18], [1080, 12.5], [1098, 7], [1110, 0]];
    const right = prof.map(([y, w]) => [540 + w, y]);
    const left = prof.slice(0, -1).reverse().map(([y, w]) => [540 - w, y]);
    return LIB.smoothPts(right.concat(left), true, 4);
  })();

  // middle and hind legs: hip, knee, then a tarsus that reaches the nearest front-facing floret
  const LEGS = [
    // the aims sit outside the 30 percent wing silhouette, so the tarsi show on the raised drawings
    { hip: [528, 902], knee: [462, 890], aim: [395, 1035] },
    { hip: [531, 928], knee: [455, 962], aim: [385, 1110] },
  ];
  const LEG_FLORET = (() => {
    const out = [];
    for (const mirror of [false, true]) {
      const used = new Set();
      for (const leg of LEGS) {
        const ax = mirror ? 1080 - leg.aim[0] : leg.aim[0], ay = leg.aim[1];
        let best = -1, bd = Infinity;
        for (let i = 0; i < FLORETS.length; i++) {
          const f = FLORETS[i];
          if (f.nz < 0.2 || f.bud || used.has(i)) continue;
          // keep the tarsus outside the 30 percent hindwing silhouette (x about 430 / 650)
          if (mirror ? f.x < 650 : f.x > 430) continue;
          const d = Math.hypot(f.x - ax, f.y - ay);
          if (d < bd) {
            bd = d;
            best = i;
          }
        }
        used.add(best);
        out.push(best);
      }
    }
    return out;
  })();

  function drawLegs(ctx, P, bi, tw) {
    let idx = 0;
    for (const mirror of [false, true]) {
      for (let k = 0; k < LEGS.length; k++) {
        const leg = LEGS[k];
        const m = (p) => [mirror ? 1080 - p[0] : p[0], p[1]];
        const hip = m(leg.hip), knee = m(leg.knee);
        const f = FLORETS[LEG_FLORET[idx++]];
        const fy = f.y + bobOf(f, tw);
        // the claws land on a hood, a little in from the floret centre toward the leg
        let dx = knee[0] - f.x, dy = knee[1] - fy;
        const dl = Math.hypot(dx, dy) || 1;
        dx /= dl;
        dy /= dl;
        const tip = [f.x + dx * 12, fy + dy * 12];
        const hock = [tip[0] + dx * 24, tip[1] + dy * 24];
        const pts = [hip, knee, hock, tip];
        LIB.inkPath(ctx, pts, { width: 3.6, color: P.veinBlack, seed: sd('leg', k, mirror ? 1 : 0), smooth: false, taper: [0, 2], wobble: 0.5 });
        // a pale rim on the lit side of the tarsus so the grip reads over the pink
        LIB.inkPath(ctx, [hock, tip].map((q) => [q[0] - 1.5, q[1] - 1]), { width: 1, color: P.tan, alpha: 0.9, seed: sd('legHi', k, mirror ? 1 : 0), smooth: false, taper: [2, 4], swell: 0, wobble: 0.3 });
        // tibial spines and tarsal claws
        const p = new Path2D();
        for (let j = 1; j <= 3; j++) {
          const x = lerp(knee[0], hock[0], j / 4), y = lerp(knee[1], hock[1], j / 4);
          p.moveTo(x, y);
          p.lineTo(x + (mirror ? 5 : -5), y + 3 + LIB.h3(j, k, bi) * 2);
        }
        p.moveTo(tip[0], tip[1]);
        p.lineTo(tip[0] - dy * 8 - dx * 3, tip[1] + dx * 8 - dy * 3);
        p.moveTo(tip[0], tip[1]);
        p.lineTo(tip[0] + dy * 8 - dx * 3, tip[1] - dx * 8 - dy * 3);
        ctx.strokeStyle = P.veinBlack;
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.stroke(p);
      }
    }
  }

  // the tiny brush forelegs, folded against the thorax
  function drawForelegs(ctx, P, bi) {
    for (const mirror of [false, true]) {
      const m = (p) => [mirror ? 1080 - p[0] : p[0], p[1]];
      const pts = [[522, 850], [510, 868], [516, 884]].map(m);
      LIB.inkPath(ctx, pts, { width: 2.5, color: P.veinBlack, seed: sd('foreleg', mirror ? 1 : 0), taper: [1, 3], swell: 0, wobble: 0.3 });
      // a pale rim on the outer side so the black hook reads against the black thorax
      LIB.inkPath(ctx, pts.map((p) => [p[0] + (mirror ? 1.6 : -1.6), p[1] - 0.6]), { width: 1.1, color: P.tan, alpha: 0.85, seed: sd('forelegHi', mirror ? 1 : 0), taper: [3, 5], swell: 0, wobble: 0.3 });
      const hair = new Path2D();
      for (let j = 0; j < 6; j++) {
        const u = 0.15 + j * 0.15;
        const a = u < 0.5 ? 0 : 1;
        const x = lerp(pts[a][0], pts[a + 1][0], u < 0.5 ? u * 2 : (u - 0.5) * 2);
        const y = lerp(pts[a][1], pts[a + 1][1], u < 0.5 ? u * 2 : (u - 0.5) * 2);
        const jj = (LIB.h3(j, mirror ? 3 : 4, bi) - 0.5) * 1.5;
        hair.moveTo(x, y);
        hair.lineTo(x + (mirror ? 5 : -5) + jj, y + 1.5 + jj);
      }
      ctx.strokeStyle = P.tan;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 1;
      ctx.stroke(hair);
      ctx.globalAlpha = 1;
    }
  }

  function drawTorso(ctx, P, bi) {
    const L = LIB;
    // abdomen
    L.inkPath(ctx, ABDOMEN, { closed: true, width: 4, color: P.ink, fill: P.veinBlack, seed: sd('abd'), wobble: 0.8 });
    const seg = new Path2D();
    for (let k = 0; k < 7; k++) {
      const y = 968 + k * 19;
      const w = y < 1055 ? 20 : lerp(18, 6, (y - 1055) / 50);
      seg.moveTo(540 - w, y - 4);
      seg.quadraticCurveTo(540, y + 5, 540 + w, y - 4);
    }
    ctx.strokeStyle = '#5E4A3C';
    ctx.lineWidth = 1.6;
    ctx.globalAlpha = 0.9;
    ctx.stroke(seg);
    ctx.globalAlpha = 1;
    L.hatch(ctx, ABDOMEN, {
      angle: 0.25,
      spacing: 5,
      width: 1.1,
      color: '#6B5646',
      alpha: 0.75,
      length: [6, 14],
      seed: sd('abdh'),
      density: (x) => 0.9 * (1 - sstep(530, 546, x)),
    });
    // thorax: hairy ellipse
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
    ctx.strokeStyle = P.veinBlack;
    ctx.lineWidth = 1.6;
    ctx.stroke(hair);
    L.inkPath(ctx, th, { closed: true, width: 5, color: P.ink, fill: P.veinBlack, seed: sd('thorax'), wobble: 1 });
    L.hatch(ctx, th, {
      angle: -0.9,
      spacing: 5,
      width: 1.1,
      color: '#6B5646',
      alpha: 0.7,
      length: [5, 12],
      seed: sd('thh'),
      density: (x, y) => 0.95 * (1 - sstep(-0.2, 0.6, ((x - 540) / 38 + (y - 900) / 56) * 0.7)),
    });
    // white thorax spots
    const spots = [[523, 853, 3.2], [557, 853, 3.2], [533, 862, 2.4], [547, 862, 2.4], [508, 880, 2.8], [572, 880, 2.8], [512, 915, 2.4], [568, 915, 2.4], [520, 940, 2], [560, 940, 2]];
    ctx.fillStyle = P.spotWhite;
    ctx.beginPath();
    for (const [x, y, r] of spots) {
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, TAU);
    }
    ctx.fill();
  }

  function drawHead(ctx, P, antSplay) {
    const L = LIB;
    // antennae (drawn before the head so the sockets sit under it)
    for (const side of [-1, 1]) {
      const bx = 540 + side * 9, by = 806;
      const club = side < 0 ? [470, 660] : [610, 660];
      const vx = club[0] - bx, vy = club[1] - by;
      const th2 = antSplay * side;
      const c = Math.cos(th2), s = Math.sin(th2);
      const rx = vx * c - vy * s, ry = vx * s + vy * c;
      const ex = bx + rx, ey = by + ry;
      const len = Math.hypot(rx, ry);
      const dx = rx / len, dy = ry / len;
      const mid = [bx + rx * 0.5 + side * 7 * dy, by + ry * 0.5 - side * 7 * dx];
      L.inkPath(ctx, [[bx, by], mid, [ex - dx * 14, ey - dy * 14]], { width: 4, color: P.veinBlack, seed: sd('ant', side), taper: [2, 0], minWidth: 0.8, swell: 0, wobble: 0.6 });
      const clubPts = L.ellipsePts(ex, ey, 7, 17, 20, Math.atan2(dy, dx) - Math.PI / 2);
      L.inkPath(ctx, clubPts, { closed: true, width: 2, color: P.ink, fill: P.veinBlack, seed: sd('club', side), wobble: 0.4 });
      // pale ring flecks along the shaft
      const fl = new Path2D();
      for (let k = 2; k < 13; k++) {
        const u = k / 14;
        const x = lerp(bx, ex, u), y = lerp(by, ey, u);
        fl.moveTo(x + 1.2, y);
        fl.arc(x, y, 1.1, 0, TAU);
      }
      ctx.fillStyle = P.spotWhite;
      ctx.globalAlpha = 0.45;
      ctx.fill(fl);
      ctx.globalAlpha = 1;
    }
    // palps
    for (const side of [-1, 1]) {
      L.inkPath(ctx, [[540 + side * 6, 808], [540 + side * 8, 792], [540 + side * 7, 780]], { width: 7, color: P.veinBlack, seed: sd('palp', side), taper: [0, 8], wobble: 0.4 });
    }
    // head and eyes
    L.inkPath(ctx, L.ellipsePts(540, 830, 28, 30, 36), { closed: true, width: 4, color: P.ink, fill: P.veinBlack, seed: sd('head'), wobble: 0.6 });
    for (const side of [-1, 1]) {
      const ex = 540 + side * 25, ey = 826;
      L.inkPath(ctx, L.ellipsePts(ex, ey, 16, 18, 30), { closed: true, width: 3, color: P.ink, fill: '#17110D', seed: sd('eye', side), wobble: 0.5 });
      L.stipple(ctx, L.ellipsePts(ex, ey, 13, 15, 20), { spacing: 5, density: 0.8, r: [0.8, 1.1], color: '#6A5646', alpha: 0.6, seed: sd('facet', side) });
      ctx.beginPath();
      ctx.ellipse(ex - 5, ey - 7, 5, 3, -0.6, 0, TAU);
      ctx.fillStyle = P.spotWhite;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    const hs = [[540, 814, 2.6], [532, 844, 2.2], [548, 844, 2.2], [530, 806, 1.8], [550, 806, 1.8], [540, 796, 1.8], [534, 786, 1.6], [546, 786, 1.6]];
    ctx.fillStyle = P.spotWhite;
    ctx.beginPath();
    for (const [x, y, r] of hs) {
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, TAU);
    }
    ctx.fill();
  }

  // ---------------------------------------------------------------------------
  // one wing
  // ---------------------------------------------------------------------------

  function drawScaleRows(ctx, list, clipPath, color, bi, salt) {
    if (!list.length) return;
    const pA = new Path2D(), pB = new Path2D();
    for (let k = 0; k < list.length; k += 7) {
      const j0 = (LIB.h3(k, bi, salt) - 0.5) * 0.9, j1 = (LIB.h3(bi, k, salt + 1) - 0.5) * 0.9;
      const p = list[k + 6] ? pB : pA;
      p.moveTo(list[k] + j0, list[k + 1] + j1);
      p.quadraticCurveTo(list[k + 2], list[k + 3], list[k + 4] - j1, list[k + 5] + j0);
    }
    ctx.save();
    ctx.clip(clipPath);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.3;
    ctx.stroke(pA);
    ctx.globalAlpha = 0.4;
    ctx.stroke(pB);
    ctx.restore();
  }

  function drawWing(ctx, W, P, key, shade, bi) {
    const L = LIB;
    const root = W.root, inv = 1 / Math.max(0.3, W.sx), iky = 1 / W.ky;
    // back to the flat pose, so tone stays on the wing
    const fx = (x) => root + (x - root) * inv;
    const fy = (y) => 900 + (y - 900) * iky;
    // flat orange
    ctx.fillStyle = P.monarch;
    ctx.fill(W.marginPath);

    // (a) the wing base sinks next to the thorax: 45-degree hatch within 160 px, a 105-degree layer within 120 px of the body
    L.hatch(ctx, W.margin, {
      angle: -Math.PI / 4,
      spacing: 8,
      width: 1.6,
      color: COL.deepInk,
      alpha: 0.85,
      length: [16, 44],
      seed: sd('base', key),
      density: (x, y) => 1 - sstep(90, 160, Math.hypot(fx(x) - 540, fy(y) - 900)),
    });
    L.hatch(ctx, W.margin, {
      angle: -Math.PI / 4 - Math.PI / 3,
      spacing: 7,
      width: 1.5,
      color: COL.deepInk,
      alpha: 0.8,
      length: [10, 28],
      seed: sd('base2', key),
      density: (x, y) => 1 - sstep(70, 120, segDist(fx(x), fy(y), 540, 850, 540, 1110)),
    });
    // (b) each cell's shadow side, a dark strip along its lower vein; the upper-left of the cell stays flat monarch
    for (let k = 0; k < W.cells.length; k++) {
      const c = W.cells[k];
      const dv = (x, y) => polyDist(fx(x), fy(y), c.flat);
      L.hatch(ctx, c.poly, {
        angle: -Math.PI / 4,
        spacing: 5,
        width: 1.5,
        color: P.monarchDeep,
        alpha: 0.85,
        length: [10, 26],
        seed: sd('cellsh', key, k),
        density: (x, y) => 1 - sstep(10, 20, dv(x, y)),
      });
      L.hatch(ctx, c.poly, {
        angle: -Math.PI / 4 - Math.PI / 3,
        spacing: 7,
        width: 1.3,
        color: COL.deepInk,
        alpha: 0.8,
        length: [8, 18],
        seed: sd('cellsh2', key, k),
        density: (x, y) => 1 - sstep(3, 8, dv(x, y)),
      });
    }
    // scale texture: sparse deep-orange dots
    L.stipple(ctx, W.margin, { spacing: 10, density: 0.22, r: [1.0, 1.5], color: P.monarchDeep, alpha: 0.6, seed: sd('scales', key) });
    if (shade > 0) {
      // the left wing turns away from the upper-left light as it rises
      L.hatch(ctx, W.margin, { angle: -Math.PI / 4, spacing: 8, width: 1.6, color: P.veinBlack, alpha: 0.4, density: clamp(shade), seed: sd('shade', key) });
    }
    // dark hairy wing base next to the body
    {
      const hr = LIB.rng(sd('basehair', key));
      const hp = new Path2D();
      const bx = W.base[0], by = W.base[1];
      const dir = W.mirror ? -1 : 1;
      const a0 = W.isFore ? -0.75 : -0.05, a1 = W.isFore ? 0.35 : 1.45;
      for (let i = 0; i < 70; i++) {
        const a = hr.range(a0, a1);
        const r0 = hr.range(-6, 26), l = hr.range(12, 42) * (1 - 0.4 * hr());
        const ca = Math.cos(a) * dir, sa = Math.sin(a);
        const x0 = bx + ca * r0 * W.sx, y0 = by + sa * r0 * W.ky;
        const j = (LIB.h3(i, 7, bi) - 0.5) * 2;
        hp.moveTo(x0, y0);
        hp.lineTo(x0 + ca * l * W.sx + j, y0 + sa * l * W.ky + j);
      }
      ctx.save();
      ctx.clip(W.marginPath);
      ctx.strokeStyle = P.veinBlack;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.85;
      ctx.stroke(hp);
      ctx.restore();
    }
    // black apex
    if (W.apexPatch) {
      ctx.save();
      ctx.clip(W.marginPath);
      L.inkPath(ctx, W.apexPatch, { closed: true, width: 3, color: P.veinBlack, fill: P.veinBlack, seed: sd('apex', key), wobble: 3 });
      ctx.restore();
    }
    // veins: filled bands, wide at the body, tapering toward the margin
    const upper = W.cell.slice(0, W.iTop + 1);
    const lower = W.cell.slice(W.iBot).concat([W.cell[0]]).reverse();
    L.inkPath(ctx, upper, { width: 18, color: P.veinBlack, seed: sd('cu', key), taper: [0, 0], swell: 0, pressure: (u) => lerp(1, 0.6, u), wobble: 0.8 });
    L.inkPath(ctx, lower, { width: 18, color: P.veinBlack, seed: sd('cl', key), taper: [0, 0], swell: 0, pressure: (u) => lerp(1, 0.6, u), wobble: 0.8 });
    L.inkPath(ctx, W.endPath, { width: 7, color: P.veinBlack, seed: sd('ce', key), taper: [0, 0], swell: 0, widthJitter: 0.1, wobble: 0.4 });
    for (let k = 0; k < W.veins.length; k++) {
      const v = W.veins[k];
      L.inkPath(ctx, v.pts, {
        width: v.w0,
        color: P.veinBlack,
        seed: sd('v', key, k),
        taper: [0, 0],
        swell: 0,
        minWidth: 1,
        widthJitter: 0.18,
        pressure: (u) => lerp(1, 8 / v.w0, Math.pow(u, 0.8)) * (u > 0.88 ? 1 + (u - 0.88) * 3 : 1),
        wobble: 1,
      });
    }
    // round joints where the veins leave the cell and at the two cell-end corners, so no orange notch shows
    {
      const joints = new Path2D();
      const disc = (p, r) => {
        joints.moveTo(p[0] + r * W.sx, p[1]);
        joints.ellipse(p[0], p[1], r * W.sx, r * W.ky, 0, 0, TAU);
      };
      disc(W.cell[W.iTop], 6.5);
      disc(W.cell[W.iBot], 6.5);
      for (const v of W.veins) disc(v.o, v.w0 * 0.46);
      ctx.fillStyle = P.veinBlack;
      ctx.fill(joints);
    }
    // scale sheen along the veins: broken inkSoft strokes on the lit (upper-left) side of each band
    {
      const sheen = new Path2D();
      const addRun = (pts, w0, key2) => {
        for (let i = 2; i + 3 < pts.length; i += 2) {
          if (LIB.h3(key2, i, 5) < 0.35) continue;
          const a = pts[i], b = pts[i + 2];
          const dx = b[0] - a[0], dy = b[1] - a[1];
          const l = Math.hypot(dx, dy) || 1;
          let nx = -dy / l, ny = dx / l;
          if (nx + ny > 0) {
            nx = -nx;
            ny = -ny;
          }
          const u = i / pts.length;
          const off = Math.max(1, (w0 * lerp(1, 0.55, u)) * 0.22);
          const jb = (LIB.h3(key2, i, bi) - 0.5) * 0.6;
          sheen.moveTo(a[0] + nx * (off + jb), a[1] + ny * (off + jb));
          sheen.lineTo(b[0] + nx * off, b[1] + ny * off);
        }
      };
      W.veins.forEach((v, k) => addRun(v.pts, v.w0, 100 + k));
      addRun(upper, 16, 90);
      addRun(lower, 16, 91);
      ctx.save();
      ctx.strokeStyle = P.inkSoft;
      ctx.lineWidth = 1.1;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.45;
      ctx.stroke(sheen);
      ctx.restore();
    }
    // black border band
    ctx.save();
    ctx.clip(W.marginPath);
    ctx.fillStyle = P.veinBlack;
    ctx.fill(W.bandPath, 'nonzero');
    ctx.restore();
    // (c) scale rows on the black border and the apex, parallel to the margin
    drawScaleRows(ctx, W.rows.band, W.bandPath, P.inkSoft, bi, 31);
    if (W.apexPath) drawScaleRows(ctx, W.rows.apex, W.apexPath, P.inkSoft, bi, 37);

    // (d) spots with a soft ink rim and a shaded crescent on the lower right
    const fills = { w: new Path2D(), o: new Path2D() };
    const rims = new Path2D();
    const cres = { w: new Path2D(), o: new Path2D() };
    const addSpot = (q, kind) => {
      const ca = Math.cos(q.a), sa = Math.sin(q.a);
      const N = 16;
      const pts = [];
      let best = 0, bd = -Infinity;
      for (let m = 0; m < N; m++) {
        const b = (m / N) * TAU;
        const lx = Math.cos(b) * q.r * q.e, ly = Math.sin(b) * q.r;
        const ox = (lx * ca - ly * sa) * W.sx, oy = (lx * sa + ly * ca) * W.ky;
        pts.push([ox, oy]);
        if (ox + oy > bd) {
          bd = ox + oy;
          best = m;
        }
      }
      trace(fills[kind], pts.map((p) => [q.x + p[0], q.y + p[1]]), true);
      trace(rims, pts.map((p) => [q.x + p[0], q.y + p[1]]), true);
      const f = q.r > 5 ? 0.74 : 0.68;
      for (let m = -3; m <= 3; m++) {
        const p = pts[(best + m + N) % N];
        const x = q.x + p[0] * f, y = q.y + p[1] * f;
        if (m === -3) cres[kind].moveTo(x, y);
        else cres[kind].lineTo(x, y);
      }
    };
    for (const q of W.spots) addSpot(q, 'w');
    for (const q of W.apexSpots) addSpot(q, q.color === 'o' ? 'o' : 'w');
    ctx.fillStyle = P.spotWhite;
    ctx.fill(fills.w);
    ctx.fillStyle = COL.apexOrange;
    ctx.fill(fills.o);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = P.paperShade;
    ctx.lineWidth = 2;
    ctx.stroke(cres.w);
    ctx.strokeStyle = P.monarchDeep;
    ctx.stroke(cres.o);
    ctx.strokeStyle = P.inkSoft;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.stroke(rims);
    ctx.globalAlpha = 1;

    // the lower right of the plate sits furthest from the light: a 105-degree ink layer over the right hindwing's outer lobe
    if (key === 'hr') {
      L.hatch(ctx, W.margin, {
        angle: -Math.PI / 4 - Math.PI / 3,
        spacing: 7,
        width: 1.4,
        color: P.ink,
        alpha: 0.35,
        length: [12, 30],
        seed: sd('plate', key),
        density: (x, y) => 1 - sstep(130, 170, Math.hypot(fx(x) - 850, fy(y) - 1150)),
      });
    }

    // raised forewing: a sliver of the yellow-brown underside shows past the outer margin
    if (W.isFore && W.s < 1) {
      const w = (1 - W.s) * 14;
      const dir = W.mirror ? -1 : 1;
      const edge = W.margin.slice(W.iApex, W.iTornus + 1);
      const out = edge.map((p, i) => {
        const u = i / (edge.length - 1);
        const k = Math.sin(Math.PI * Math.min(1, u * 1.15 + 0.08)) * 0.75 + 0.25;
        return [p[0] + dir * w * k, p[1] + w * 0.25 * k];
      });
      const sl = edge.concat(out.slice().reverse());
      fillPoly(ctx, sl, P.monarchUnder);
      L.hatch(ctx, sl, { angle: -Math.PI / 4, spacing: 5, width: 1.1, color: COL.underDeep, alpha: 0.8, length: [4, 10], inset: 1, overshoot: 0, seed: sd('under', key) });
      L.inkPath(ctx, out, { width: 2.2, color: P.ink, seed: sd('underline', key), taper: [6, 10], wobble: 0.5 });
    }
    // outline
    // the outline thickens with the lift, 5 px flat to about 5.8 px at 30 percent
    L.inkPath(ctx, W.margin, { closed: true, width: 5 * W.ky, color: P.ink, seed: sd('wo', key), wobble: 1.2, double: { alpha: 0.4, width: 0.3 } });
  }

  // ---------------------------------------------------------------------------
  // scene
  // ---------------------------------------------------------------------------

  // wing span per drawing (12 drawings a second)
  function spanAt(k) {
    if (k <= 0) return 1;
    if (k === 1) return 0.75;
    if (k === 2) return 0.5;
    if (k <= 5) return 0.3;
    if (k === 6) return 1.1;
    if (k <= 11) return 1;
    if (k === 12) return 0.85;
    return 1;
  }

  // the raised tips the slam trajectories start from
  const RAISED_TIP = (() => {
    const W = posed('fore', false, 0.3);
    return W.margin[W.iApex].slice();
  })();
  // and the 110 percent tip they end on
  const SLAM_TIP = (() => {
    const W = posed('fore', false, 1.1);
    return W.margin[W.iApex].slice();
  })();

  FILM.scene({
    id: ID,
    draw(ctx, t, info) {
      const L = info.lib;
      const P = L.pal;
      const E = L.ease;
      const tt = Math.min(Math.max(t, 0), info.dur);
      const k = Math.floor(tt * 12 + 1e-6); // drawing index on twos
      const tw = k / 12;
      const bi = L.boil(info.T);
      const s = spanAt(k);
      const fr24 = tt * 24; // frames since the shot started

      // background stripes: drift 6 px per beat, jolt 8 px on the slam and settle over 4 frames
      const fSlam = Math.round(fr24 - 12);
      const jolt = fSlam >= 0 && fSlam < 4 ? 8 * (1 - fSlam / 4) : 0;
      L.stripes(ctx, { colors: [P.stripeCream, P.stripeYellow], width: 140, angle: -0.52, offset: 12 * tt + jolt, seed: sd('stripes') });

      // camera: push-in 1.00 to 1.05, holding world (540, 920) on its screen spot
      const zoom = 1 + 0.05 * E.inOutSine(tt / info.dur);
      const cam = { x: 540, y: 920 + 40 / zoom, zoom };

      L.camera(ctx, cam, (ctx) => {
        // --- milkweed: leaves, stem, dew ---
        const lkeys = ['ll', 'lr', 'ul', 'ur'];
        for (let i = 0; i < LEAVES.length; i++) drawLeaf(ctx, LEAVES[i], P, lkeys[i]);
        // the stem runs up under the ball so it meets the florets at y 1370
        const stem = [[525, 1290], [524, 1600], [523, 1930], [557, 1930], [556, 1600], [555, 1290]];
        fillPoly(ctx, stem, P.milkweedStem);
        L.hatch(ctx, [[541, 1300], [541, 1930], [557, 1930], [555, 1300]], { angle: 0.12, spacing: 6, width: 1.5, color: COL.stemDeep, alpha: 0.9, length: [8, 16], bend: 1.5, seed: sd('stemh') });
        L.inkPath(ctx, [[525, 1290], [524, 1600], [523, 1930]], { width: 3, seed: sd('stemL'), taper: [0, 0] });
        L.inkPath(ctx, [[555, 1290], [556, 1600], [557, 1930]], { width: 3, seed: sd('stemR'), taper: [0, 0] });
        const hairs = new Path2D();
        for (let y = 1380; y < 1920; y += 9) {
          const j = L.h3(y, 3, bi);
          hairs.moveTo(524, y);
          hairs.lineTo(517 - j * 3, y - 4);
          hairs.moveTo(556, y + 4);
          hairs.lineTo(563 + j * 3, y);
        }
        ctx.strokeStyle = P.inkSoft;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1;
        ctx.stroke(hairs);
        ctx.globalAlpha = 1;
        // leaf nodes where each pair leaves the stem
        for (const ny of [1522, 1842]) {
          L.inkPath(ctx, L.ellipsePts(540, ny, 19, 9, 20), { closed: true, width: 2.2, fill: P.milkweedStem, seed: sd('node', ny), wobble: 0.4 });
        }

        // the flower ball's shadow falls down-right across the right upper leaf
        {
          const Lf = LEAVES[3];
          const pts = L.ellipsePts(655, 1415, 150, 62, 40, -0.35);
          ctx.save();
          ctx.beginPath();
          trace(ctx, Lf.outline, true);
          ctx.clip();
          L.hatch(ctx, pts, {
            angle: -Math.PI / 4 + 1.05, spacing: 5, width: 1.3, color: P.ink, alpha: 0.45, length: [10, 30], seed: sd('ballshadow'),
            density: (x, y) => 1 - sstep(0.55, 1, Math.hypot((x - 655) / 150, (y - 1415) / 62)),
          });
          ctx.restore();
        }

        // dew drop on the left leaf: cast shadow down-right, dark refraction rim top-left,
        // pale caustic bottom-right, white highlight crescent top-left
        const dx = 310, dy = 1480, dr = 16;
        L.hatch(ctx, L.ellipsePts(dx + 8, dy + 9, dr + 1, dr * 0.85, 24), { angle: -Math.PI / 4, spacing: 3, width: 1.4, color: P.ink, alpha: 0.55, seed: sd('dewsh') });
        L.inkPath(ctx, L.ellipsePts(dx, dy, dr, dr, 28), { closed: true, width: 2.2, color: P.ink, fill: P.milkweed, seed: sd('dew'), wobble: 0.3 });
        L.hatch(ctx, L.ellipsePts(dx, dy, dr - 1.5, dr - 1.5, 24), { angle: -Math.PI / 4 + 1.05, spacing: 2.6, width: 1.1, color: P.milkweedDeep, alpha: 0.95, seed: sd('dewin'), length: [4, 12], overshoot: 0, inset: 1, density: (x, y) => sstep(-2, 10, (x - dx) * -0.7 + (y - dy) * -0.7) });
        ctx.beginPath();
        ctx.arc(dx + 1, dy + 1, dr - 5, Math.PI * 0.05, Math.PI * 0.55);
        ctx.strokeStyle = P.milkweedPale;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(dx - 1, dy - 1, dr - 6, Math.PI * 1.08, Math.PI * 1.5);
        ctx.strokeStyle = P.white;
        ctx.lineWidth = 3.4;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(dx - 9, dy + 2, 1.6, 0, TAU);
        ctx.fillStyle = P.white;
        ctx.fill();

        // --- flower ball ---
        // shadowed interior of the umbel, seen between the florets
        const inner = L.ellipsePts(BALL.x, BALL.y, 178, 178, 64);
        fillPoly(ctx, inner, L.mix(P.milkweedCrown, P.paper, 0.5));
        L.crossHatch(ctx, inner, { spacing: 5, width: 1.3, color: P.ink, alpha: 0.35, layers: 2, seed: sd('umbelx'), density: 0.6, clip: true });
        const ped = new Path2D();
        for (const f of FLORETS) {
          if (f.nz > 0.6) continue;
          ped.moveTo(BALL.x + f.nx * 40, BALL.y + f.ny * 40);
          ped.lineTo(f.x, f.y + bobOf(f, tw));
        }
        ctx.strokeStyle = P.milkweedStem;
        ctx.lineWidth = 2.6;
        ctx.stroke(ped);
        const ballShape = new Path2D();
        ballShape.arc(BALL.x, BALL.y, 178, 0, TAU);
        for (const f of FLORETS) {
          const bob = bobOf(f, tw);
          drawFloret(ctx, f, P, bob, bi);
          // tone clips to the drawn florets; edge-on florets are foreshortened, so their clip circle shrinks
          const rr = f.size * 0.45 * (f.nz < 0.4 ? 0.55 : 1);
          ballShape.moveTo(f.x + rr, f.y + bob);
          ballShape.arc(f.x, f.y + bob, rr, 0, TAU);
        }
        L.crossHatch(ctx, ballShape, {
          bounds: { x: BALL.x - 240, y: BALL.y - 240, w: 480, h: 480 },
          spacing: 6,
          width: 1.3,
          color: P.ink,
          alpha: 0.6,
          layers: 2,
          seed: sd('ballx'),
          density: (x, y) => 0.8 * sstep(0.3, 1.0, ((x - BALL.x) * 0.75 + (y - BALL.y) * 0.66) / BALL.r),
        });

        // --- construction lines, behind the butterfly ---
        {
          const cons = { width: 1.5, color: P.inkFaint, alpha: 0.3, taper: [0, 0], wobble: 1.5 };
          L.inkPath(ctx, [[540, -40], [540, 2000]], Object.assign({ seed: sd('axis'), smooth: false, step: 8 }, cons));
          L.guideCircle(ctx, 540, 900, 520, { color: P.inkFaint, alpha: 0.3, width: 1.5 });
          L.guideCircle(ctx, 540, 900, 700, { color: P.inkFaint, alpha: 0.2, width: 1.5 });
          L.inkPath(ctx, [[40, 640], [1040, 640]], Object.assign({ seed: sd('tipline'), smooth: false, step: 8 }, cons));
          // lines from the thorax through each antenna club, out to the top edge
          L.inkPath(ctx, [[540, 900], [277.5, 0]], Object.assign({ seed: sd('antline', -1), smooth: false, step: 8 }, cons));
          L.inkPath(ctx, [[540, 900], [802.5, 0]], Object.assign({ seed: sd('antline', 1), smooth: false, step: 8 }, cons));
          // 10 px degree ticks every 10 degrees on the wingspan circle, over the top
          {
            const deg = new Path2D();
            for (let a = -170; a <= -10; a += 10) {
              const c = Math.cos(a * DEG), sn = Math.sin(a * DEG);
              deg.moveTo(540 + c * 520, 900 + sn * 520);
              deg.lineTo(540 + c * 530, 900 + sn * 530);
            }
            ctx.save();
            ctx.strokeStyle = P.inkFaint;
            ctx.globalAlpha = 0.45;
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            ctx.stroke(deg);
            ctx.restore();
          }
          // rays from the thorax through every forewing vein end, out to the wingspan circle
          const rays = new Path2D(), rayTicks = new Path2D();
          for (const v of WINGS.fore.veins) {
            for (const m of [1, -1]) {
              const ex = 540 + (v.e[0] - 540) * m, ey = v.e[1];
              const a = Math.atan2(ey - 900, ex - 540);
              const c = Math.cos(a), sn = Math.sin(a);
              const r0 = Math.hypot(ex - 540, ey - 900) + 8;
              if (r0 > 500) continue;
              rays.moveTo(540 + c * r0, 900 + sn * r0);
              rays.lineTo(540 + c * 520, 900 + sn * 520);
              rayTicks.moveTo(540 + c * 512, 900 + sn * 512);
              rayTicks.lineTo(540 + c * 530, 900 + sn * 530);
            }
          }
          ctx.save();
          ctx.strokeStyle = P.inkFaint;
          ctx.lineCap = 'round';
          ctx.globalAlpha = 0.3;
          ctx.lineWidth = 1.5;
          ctx.stroke(rays);
          ctx.globalAlpha = 0.5;
          ctx.stroke(rayTicks);
          ctx.restore();
          // the flower ball's construction circle and registration crosses on the G5 points
          L.guideCircle(ctx, BALL.x, BALL.y, BALL.r, { color: P.inkFaint, alpha: 0.35, width: 1.5, dash: [3, 7] });
          const marks = new Path2D();
          for (const [x, y] of [[230, 1150], [850, 1150], [540, 1110], [300, 1010], [780, 1010], [540, 1370], [540, 1522], [80, 640], [1000, 640], [470, 660], [610, 660], [540, 830]]) {
            marks.moveTo(x - 9, y);
            marks.lineTo(x + 9, y);
            marks.moveTo(x, y - 9);
            marks.lineTo(x, y + 9);
          }
          ctx.save();
          ctx.strokeStyle = P.inkFaint;
          ctx.globalAlpha = 0.55;
          ctx.lineWidth = 1.5;
          ctx.stroke(marks);
          ctx.restore();
        }

        // --- butterfly ---
        const fl = posed('fore', true, s), frt = posed('fore', false, s);
        const hl = posed('hind', true, s), hrt = posed('hind', false, s);

        // cast shadow on the flower ball (light from the upper left)
        const sh = new Path2D();
        const offx = 20, offy = 28;
        for (const W of [fl, frt, hl, hrt]) {
          const pts = W.margin;
          for (let i = 0; i < pts.length; i += 2) {
            if (i === 0) sh.moveTo(pts[i][0] + offx, pts[i][1] + offy);
            else sh.lineTo(pts[i][0] + offx, pts[i][1] + offy);
          }
          sh.closePath();
        }
        ctx.save();
        ctx.clip(ballShape);
        L.hatch(ctx, sh, { bounds: { x: 60, y: 600, w: 960, h: 700 }, angle: -Math.PI / 4, spacing: 4.5, width: 1.3, color: P.ink, alpha: 0.7, seed: sd('shadow') });
        ctx.restore();

        drawLegs(ctx, P, bi, tw);

        // antennae: tick 4 degrees apart on each beat, whip back 6 degrees on the slam
        const beat = Math.floor(tw / 0.5 + 1e-6);
        // even beats sit on the G5 clubs, odd beats open each antenna 2 degrees (4 degrees between them)
        let splay = (beat % 2 ? 2 : 0) * DEG;
        if (k === 6) splay += 6 * DEG;
        else if (k === 7) splay += 3 * DEG;

        const drawWings = () => {
          // the left wings turn from the light as they rise, the right wings stay lit
          const shadeL = s < 1 ? (1 - s) * 1.15 : 0;
          drawWing(ctx, hl, P, 'hl', shadeL, bi);
          drawWing(ctx, hrt, P, 'hr', 0, bi);
          // forewing shadow on the hindwing
          for (const [F, H, key] of [[fl, hl, 'fsl'], [frt, hrt, 'fsr']]) {
            const shp = new Path2D();
            F.margin.forEach((p, i) => (i ? shp.lineTo(p[0] + 7, p[1] + 10) : shp.moveTo(p[0] + 7, p[1] + 10)));
            shp.closePath();
            ctx.save();
            ctx.clip(H.marginPath);
            L.hatch(ctx, shp, { bounds: { x: 60, y: 850, w: 960, h: 250 }, angle: -Math.PI / 4, spacing: 4, width: 1.3, color: P.veinBlack, alpha: 0.75, seed: sd(key) });
            ctx.restore();
          }
          drawWing(ctx, fl, P, 'fl', shadeL, bi);
          drawWing(ctx, frt, P, 'fr', 0, bi);
          if (k === 1 || k === 2) {
            // speed strokes behind each rising forewing tip, curving in toward the body axis
            const prevS = spanAt(k - 1);
            for (const [W, side] of [[fl, -1], [frt, 1]]) {
              const tip = W.margin[W.iApex];
              const prev = posed('fore', side < 0, prevS).margin[W.iApex];
              let ux = prev[0] - tip[0], uy = prev[1] - tip[1];
              const ul = Math.hypot(ux, uy) || 1;
              ux /= ul;
              uy /= ul;
              for (const [len, off, j] of [[60, -10, 0], [40, 16, 1]]) {
                // off moves the stroke across the path: negative above the tip, positive below it
                const x0 = tip[0] + ux * 14 - uy * off * side, y0 = tip[1] + uy * 14 + ux * off * side;
                const x1 = x0 + ux * len, y1 = y0 + uy * len;
                // the bow lifts the middle toward the top of the frame, so both ends bend in and down
                const mx = (x0 + x1) / 2 - side * 4, my = (y0 + y1) / 2 - len * 0.22;
                L.inkPath(ctx, LIB.smoothPts([[x0, y0], [mx, my], [x1, y1]], false, 3), { width: 2, color: P.ink, seed: sd('speed', side, j, k), taper: [2, 12], swell: 0.1, wobble: 0.4 });
              }
            }
          }
        };
        if (s < 1) {
          // wings rising toward the camera overlap the thorax edge
          drawTorso(ctx, P, bi);
          drawWings();
          drawHead(ctx, P, splay);
        } else {
          drawWings();
          // the body's cast shadow on the right wings (light from the upper left)
          {
            const body = new Path2D();
            trace(body, ABDOMEN.map((p) => [p[0] + 12, p[1] + 16]), true);
            trace(body, L.ellipsePts(552, 916, 38, 56, 48), true);
            const wingsR = new Path2D();
            wingsR.addPath(frt.marginPath);
            wingsR.addPath(hrt.marginPath);
            ctx.save();
            ctx.clip(wingsR);
            L.hatch(ctx, body, { bounds: { x: 540, y: 850, w: 70, h: 290 }, angle: -Math.PI / 4, spacing: 4, width: 1.3, color: P.veinBlack, alpha: 0.6, length: [8, 22], seed: sd('bodysh') });
            ctx.restore();
          }
          drawTorso(ctx, P, bi);
          drawHead(ctx, P, splay);
        }
        drawForelegs(ctx, P, bi);

        // --- overlay: wingspan arc over the head, fixed on the G5 span ---
        {
          const R = 560;
          const aR = Math.atan2(640 - 900, 1000 - 540), aL = Math.atan2(640 - 900, 80 - 540);
          ctx.save();
          ctx.strokeStyle = P.annBlue;
          ctx.fillStyle = P.annBlue;
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(540, 900, R, aL, aR);
          ctx.stroke();
          const tick = new Path2D(), dots = new Path2D();
          // ruler: a 12 px tick every 5 degrees and a 28 px tick every 15 degrees, outside the arc
          for (let d = -150; d <= -30; d += 5) {
            const a = d * DEG;
            if (a < aL + 0.3 * DEG || a > aR - 0.3 * DEG) continue;
            const c = Math.cos(a), sn = Math.sin(a);
            const len = d % 15 === 0 ? 28 : 12;
            tick.moveTo(540 + c * R, 900 + sn * R);
            tick.lineTo(540 + c * (R + len), 900 + sn * (R + len));
          }
          for (const [a, tip] of [[aL, [80, 640]], [aR, [1000, 640]]]) {
            const c = Math.cos(a), sn = Math.sin(a);
            tick.moveTo(540 + c * (R - 8), 900 + sn * (R - 8));
            tick.lineTo(540 + c * (R + 8), 900 + sn * (R + 8));
            if (s >= 0.85) {
              // dotted leader down to the tip, while the wings are open or nearly so
              const dl = Math.hypot(540 + c * R - tip[0], 900 + sn * R - tip[1]);
              for (let d = 14; d < dl - 10; d += 12) {
                const u = d / dl;
                const x = lerp(540 + c * R, tip[0], u), y = lerp(900 + sn * R, tip[1], u);
                dots.moveTo(x + 1.6, y);
                dots.arc(x, y, 1.6, 0, TAU);
              }
            }
          }
          ctx.stroke(tick);
          ctx.fill(dots);
          ctx.beginPath();
          ctx.arc(540, 900 - R, 4, 0, TAU);
          ctx.fill();
          ctx.restore();
        }

        // --- overlay: one dashed wing-stroke arc per side on the slam ---
        {
          const f = fr24 - 12;
          if (f > -1e-6 && f < 6 - 1e-6) {
            const on = 1; // frame 12 shows the whole stroke, arrowhead on the 110 percent tip
            const off = clamp(f / 5); // erased from the root over frames 13 to 17
            if (on > off) {
              ctx.save();
              ctx.strokeStyle = P.annBlue;
              ctx.fillStyle = P.annBlue;
              ctx.lineWidth = 2.5;
              ctx.lineCap = 'butt';
              for (const side of [1, -1]) {
                const a = [540 + (RAISED_TIP[0] - 540) * side, RAISED_TIP[1]];
                const b = [540 + (SLAM_TIP[0] - 540) * side, SLAM_TIP[1]];
                const c = [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 120];
                const N = 48;
                const pts = [];
                const cum = [0];
                for (let i = 0; i <= N; i++) {
                  const u = i / N;
                  const x = (1 - u) * (1 - u) * a[0] + 2 * u * (1 - u) * c[0] + u * u * b[0];
                  const y = (1 - u) * (1 - u) * a[1] + 2 * u * (1 - u) * c[1] + u * u * b[1];
                  if (i) cum.push(cum[i - 1] + Math.hypot(x - pts[i - 1][0], y - pts[i - 1][1]));
                  pts.push([x, y]);
                }
                const total = cum[N];
                const s0 = off * total, s1 = on * total;
                ctx.setLineDash([14, 10]);
                ctx.lineDashOffset = s0;
                ctx.beginPath();
                let started = false;
                for (let i = 0; i <= N; i++) {
                  if (cum[i] < s0 || cum[i] > s1) continue;
                  if (!started) {
                    // exact start point on the erase edge
                    const i0 = Math.max(0, i - 1);
                    const seg = cum[i] - cum[i0] || 1;
                    const u = clamp((s0 - cum[i0]) / seg);
                    ctx.moveTo(lerp(pts[i0][0], pts[i][0], u), lerp(pts[i0][1], pts[i][1], u));
                    started = true;
                  }
                  ctx.lineTo(pts[i][0], pts[i][1]);
                }
                ctx.stroke();
                ctx.setLineDash([]);
                if (on >= 1) {
                  // arrowhead at the open tip
                  const p = pts[N], q = pts[N - 3];
                  const ang = Math.atan2(p[1] - q[1], p[0] - q[0]);
                  ctx.beginPath();
                  ctx.moveTo(p[0] + Math.cos(ang) * 4, p[1] + Math.sin(ang) * 4);
                  ctx.lineTo(p[0] - Math.cos(ang - 0.45) * 14, p[1] - Math.sin(ang - 0.45) * 14);
                  ctx.lineTo(p[0] - Math.cos(ang) * 8, p[1] - Math.sin(ang) * 8);
                  ctx.lineTo(p[0] - Math.cos(ang + 0.45) * 14, p[1] - Math.sin(ang + 0.45) * 14);
                  ctx.closePath();
                  ctx.fill();
                }
              }
              ctx.restore();
            }
          }
        }

        // --- overlays: rings from the thorax on the slam ---
        if (tt >= 0.5 - 1e-6) {
          const alpha = 1 - clamp((tt - 0.8) / 0.45);
          if (alpha > 0) {
            // magenta leads, yellow follows two frames later
            const p1 = clamp((tt - 0.5) / 0.75);
            const p2 = (tt - 0.5 - 2 / 24) / 0.75;
            const rings = [[60 + 560 * E.outExpo(p1), P.annMagenta, false]];
            if (p2 >= -1e-6) rings.push([60 + 560 * E.outExpo(clamp(p2)), P.annYellow, true]);
            const ringPath = (r, withTicks) => {
              const p = new Path2D();
              p.moveTo(540 + r, 900);
              p.arc(540, 900, r, 0, TAU);
              if (withTicks) {
                for (let q = 0; q < 4; q++) {
                  const a = Math.PI / 4 + (q * Math.PI) / 2;
                  p.moveTo(540 + Math.cos(a) * (r - 9), 900 + Math.sin(a) * (r - 9));
                  p.lineTo(540 + Math.cos(a) * (r + 9), 900 + Math.sin(a) * (r + 9));
                }
              }
              return p;
            };
            ctx.save();
            ctx.lineCap = 'round';
            // ink underlay so each ring reads over the stripes and the orange
            ctx.strokeStyle = P.ink;
            ctx.lineWidth = 6;
            ctx.globalAlpha = alpha * 0.25;
            for (const [r, , tk] of rings) ctx.stroke(ringPath(r, tk));
            ctx.lineWidth = 3;
            ctx.globalAlpha = alpha;
            for (const [r, col, tk] of rings) {
              ctx.strokeStyle = col;
              ctx.stroke(ringPath(r, tk));
            }
            ctx.restore();
          }
        }
      });
    },
  });
})();
