// 04 larva-molts: "Four molts up the stem". Global T 5.5 to 8.0, illustrated mode.
//
// World layer (under the camera push, zoom 1.00 -> 1.03 held on screen point (540, 900)):
//   stripes (screen) > back-plane milkweed > construction arcs and lines > cast shadows
//   > three milkweed leaf pairs (strip hatching, trenches, latex, holes, notches, frass) > stem
//   > blue climb trail > landed head capsules > shed skin > caterpillar > flying capsule.
// Loupe (screen, f0 to the T 7.0 molt): a round 2.5x detail callout at (285, 1270) that redraws the
//   same world around the larva, with an ink rim, a ring round the real larva and two leader lines.
// Overlay layer (screen space, never hatched): blue ruler at x 920, yellow bracket with leaders and a
//   ghost-bracket growth staircase, yellow tally rings round the shed capsules, magenta molt rings.
// Characters move on twos, overlays, the loupe camera and the push at 24 fps, ink lines boil at 12 fps.
(function () {
  'use strict';
  const FILM = window.FILM;
  const L = FILM.lib;
  const C = {};
  for (const k of Object.keys(L.pal)) C[k] = L.pal[k];
  const E = {};
  for (const k of Object.keys(L.ease)) E[k] = L.ease[k];

  const ID = 'larva-molts';
  const DUR = 2.5;
  const LAST_F = 60;
  const TAU = Math.PI * 2;
  const PHI = 0.6180339887498949;
  const clamp = L.clamp, lerp = L.lerp, sst = L.smoothstep;
  const SD = (...a) => L.hash(ID, ...a);
  const rgba = L.rgba;

  // Pass state. The main pass draws at pen 1 over the whole frame. The loupe pass redraws the same
  // world at 2.5x with pen 0.5 (so its lines land at 1.25x the frame weight) and a small view rect.
  const RS = { pen: 1, view: null };
  const inView = (b, pad = 0) =>
    !RS.view || !(b.x + b.w < RS.view.x - pad || b.x > RS.view.x + RS.view.w + pad || b.y + b.h < RS.view.y - pad || b.y > RS.view.y + RS.view.h + pad);

  // ===========================================================================
  // Numbers from the storyboard
  // ===========================================================================

  const STEM_X = 540, STEM_HW = 22;
  const STEM_L = STEM_X - STEM_HW, STEM_R = STEM_X + STEM_HW;
  const PAIR_Y = [1650, 1050, 450];
  const LEAF_LEN = 470; // stem base point to the mucro tip
  const PET = 36; // blade starts here: 22 px of petiole shows beside the stem
  const LEAF_H = 120; // blade half-width at its widest (45 percent of the blade)
  const DROOP = 8;
  // the tip droops 8 px, so the axis rises a touch over 20 degrees and the base-to-tip chord measures 20
  const LA = (20 * Math.PI) / 180 + Math.atan2(DROOP, LEAF_LEN), LC = Math.cos(LA), LS = Math.sin(LA);

  const MOLT_F = [12, 24, 36, 48];
  const HEAD_Y = [1500, 1260, 1000, 700, 300]; // head at t 0.5, 1.0, 1.5, 2.0, 2.5
  // length, width, head capsule, T2 filaments, A8 filaments, band strength, outline weight
  const INST = [
    { len: 45, w: 10, head: 13, front: 0, rear: 0, bands: 0, thorax: 0, ink: 3 },
    { len: 85, w: 15, head: 14.5, front: 3, rear: 1.8, bands: 0.5, thorax: 0.3, ink: 3 },
    { len: 125, w: 22, head: 16.5, front: 17, rear: 9, bands: 1, thorax: 0.35, ink: 3 },
    { len: 210, w: 34, head: 24, front: 50, rear: 20, bands: 1, thorax: 1, ink: 4 },
    { len: 430, w: 70, head: 36, front: 110, rear: 40, bands: 1, thorax: 1, ink: 5 },
  ];
  // a shed capsule is the old head, so it matches that head: 12 and 13 px for the first two
  const CAP_SIZE = [12, 13, 15, 22];
  const CAP_LAND = [[360, 1540], [STEM_R - 4, 1330], [700, 1010], [STEM_R - 5, 760]];

  // body axis x per stage. Instars 1 and 2 sit on the stem face so their pale bodies read on the
  // darker stem; instar 3 eases back out to the lateral line the big instars climb on.
  const lateralX = (w) => STEM_L - 0.28 * w;
  function stageX(stage, d) {
    if (stage === 0) return 526;
    if (stage === 1) return 527;
    if (stage === 2) return lerp(527, 513, d / 5);
    return lateralX(INST[stage].w);
  }

  // crawl drawings 0..5 after each molt: snap, hump, stretch, hump, stretch, settle (held 2 frames)
  const WALK_FR = [0, 0.16, 0.4, 0.58, 0.82, 1];
  const CLIMB_FR = [0, 0.16, 0.42, 0.58, 0.84, 1];
  const CRAWL_LEN = [1, 0.93, 1.025, 0.93, 1.025, 1];
  const CRAWL_AMP = [0, 1, 0.3, 1, 0.3, 0];
  const CRAWL_XW = [0.5, 0.62, 0.2, 0.62, 0.2, 0.5];

  // loupe
  // the loupe closes over f33 to f35 so molt 3 (f36) plays whole in the main frame
  const LP_X = 285, LP_Y = 1270, LP_R = 185, LP_MAG = 2.5, LP_OUT = 33;

  // ===========================================================================
  // Small geometry helpers
  // ===========================================================================

  function polyPath(path, pts) {
    path.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1]);
    path.closePath();
  }
  // circle bite: outline points inside the circle are pushed onto its rim, flags mark them
  function bite(pts, flags, cx, cy, r) {
    return pts.map((p, i) => {
      const dx = p[0] - cx, dy = p[1] - cy;
      const d = Math.hypot(dx, dy);
      if (d >= r || d < 1e-6) return p;
      flags[i] = true;
      return [cx + (dx / d) * r, cy + (dy / d) * r];
    });
  }
  // a crescent (arc-shaped) feeding hole: outer arc with scalloped bites, inner arc thinning to the horns
  function crescent(cx, cy, r, ang, span, thick, sd, n = 36) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const ph = -span / 2 + (i / n) * span;
      const rr = r * (1 - 0.06 * Math.abs(Math.sin(ph * 9 + sd)) + 0.03 * L.noise1(i * 0.7, sd));
      out.push([cx + Math.cos(ang + ph) * rr, cy + Math.sin(ang + ph) * rr]);
    }
    for (let i = n - 1; i >= 1; i--) {
      const ph = -span / 2 + (i / n) * span;
      const k = Math.cos((ph / (span / 2)) * (Math.PI / 2));
      const rr = r * (1 - thick * Math.pow(Math.max(0, k), 0.8)) * (1 + 0.04 * L.noise1(i * 0.9, sd + 3));
      out.push([cx + Math.cos(ang + ph) * rr, cy + Math.sin(ang + ph) * rr]);
    }
    return out;
  }
  const scalePts = (pts, cx, cy, s) => pts.map((p) => [cx + (p[0] - cx) * s, cy + (p[1] - cy) * s]);

  // append a pen stroke with a width profile wf(u), u 0..1 along pts, to a Path2D
  function ribbon(path, pts, wf) {
    const n = pts.length;
    if (n < 2) return;
    const lx = new Array(n), ly = new Array(n), rx = new Array(n), ry = new Array(n);
    for (let i = 0; i < n; i++) {
      const a = pts[i > 0 ? i - 1 : 0], b = pts[i < n - 1 ? i + 1 : n - 1];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      const hw = wf(i / (n - 1)) / 2;
      lx[i] = pts[i][0] - ty * hw;
      ly[i] = pts[i][1] + tx * hw;
      rx[i] = pts[i][0] + ty * hw;
      ry[i] = pts[i][1] - tx * hw;
    }
    path.moveTo(lx[0], ly[0]);
    for (let i = 1; i < n; i++) path.lineTo(lx[i], ly[i]);
    for (let i = n - 1; i >= 0; i--) path.lineTo(rx[i], ry[i]);
    path.closePath();
  }
  const penStroke = (u) => (u < 0.3 ? lerp(0.45, 1, u / 0.3) : lerp(1, 0.3, (u - 0.3) / 0.7));

  function tapered(ctx, pts, w0, w1, color, alpha, pw = 0.9) {
    const p = new Path2D();
    ribbon(p, pts, (u) => lerp(w0, w1, Math.pow(u, pw)));
    ctx.save();
    ctx.globalAlpha *= alpha == null ? 1 : alpha;
    ctx.fillStyle = color;
    ctx.fill(p);
    ctx.restore();
  }

  // Sutherland-Hodgman clip of a polygon to an axis-aligned rect (keeps loupe hatching cheap)
  function clipRect(poly, R) {
    const x0 = R.x, y0 = R.y, x1 = R.x + R.w, y1 = R.y + R.h;
    const pass = (pts, inside, cut) => {
      const out = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        const ia = inside(a), ib = inside(b);
        if (ia) out.push(a);
        if (ia !== ib) out.push(cut(a, b));
      }
      return out;
    };
    let p = poly;
    p = pass(p, (q) => q[0] >= x0, (a, b) => [x0, a[1] + ((x0 - a[0]) / (b[0] - a[0])) * (b[1] - a[1])]);
    if (p.length < 3) return null;
    p = pass(p, (q) => q[0] <= x1, (a, b) => [x1, a[1] + ((x1 - a[0]) / (b[0] - a[0])) * (b[1] - a[1])]);
    if (p.length < 3) return null;
    p = pass(p, (q) => q[1] >= y0, (a, b) => [a[0] + ((y0 - a[1]) / (b[1] - a[1])) * (b[0] - a[0]), y0]);
    if (p.length < 3) return null;
    p = pass(p, (q) => q[1] <= y1, (a, b) => [a[0] + ((y1 - a[1]) / (b[1] - a[1])) * (b[0] - a[0]), y1]);
    return p.length >= 3 ? p : null;
  }
  const clipPolys = (polys) => (RS.view ? polys.map((p) => clipRect(p, RS.view)).filter(Boolean) : polys);

  function segHit(a, b, c, d) {
    const r1x = b[0] - a[0], r1y = b[1] - a[1], r2x = d[0] - c[0], r2y = d[1] - c[1];
    const den = r1x * r2y - r1y * r2x;
    if (Math.abs(den) < 1e-9) return null;
    const t = ((c[0] - a[0]) * r2y - (c[1] - a[1]) * r2x) / den;
    const u = ((c[0] - a[0]) * r1y - (c[1] - a[1]) * r1x) / den;
    if (t < 0 || t > 1 || u < 0 || u > 1) return null;
    return [a[0] + r1x * t, a[1] + r1y * t];
  }

  // polyline sampled by arc length
  function arcTable(pts) {
    const S = [0];
    for (let i = 1; i < pts.length; i++) S.push(S[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const at = (s) => {
      let i = 1;
      while (i < S.length - 1 && S[i] < s) i++;
      const seg = S[i] - S[i - 1] || 1;
      const u = clamp((s - S[i - 1]) / seg);
      return [lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)];
    };
    return { S, total: S[S.length - 1], at };
  }

  // Break a guide curve into hand-hatched dashes and append them to path.
  // dens(x, y) 0..1 sets where strokes live; row th is the per-curve threshold (golden-ratio spread).
  function dashCurve(path, pts, o) {
    const A = arcTable(pts);
    if (A.total < 4) return;
    const r = o.r;
    const bi = o.bi;
    let s = r() * (o.gap[1] + 2);
    let k = 0;
    const jo = (r() - 0.5) * 1.4 * o.pen;
    while (s < A.total - 3) {
      const dl = lerp(o.len[0], o.len[1], r()) * o.pen * 0.5 + lerp(o.len[0], o.len[1], r()) * 0.5;
      const e = Math.min(A.total, s + dl);
      const m = A.at((s + e) / 2);
      const d = o.dens ? o.dens(m[0], m[1]) : 1;
      const th = o.th + 0.14 * (r() - 0.5);
      if (d > th && e - s > 3) {
        const nseg = Math.max(2, Math.ceil((e - s) / 7));
        const sub = [];
        const b0 = (L.h3(o.sid, k, bi + 3) - 0.5) * 0.9 * o.pen;
        const b1 = (L.h3(k, o.sid, bi + 7) - 0.5) * 0.9 * o.pen;
        for (let j = 0; j <= nseg; j++) {
          const q = A.at(lerp(s, e, j / nseg));
          const bj = lerp(b0, b1, j / nseg) + jo;
          sub.push([q[0] + bj, q[1] - bj * 0.6]);
        }
        const wv = o.width * lerp(0.8, 1.15, r()) * lerp(0.75, 1, clamp(d));
        ribbon(path, sub, (u) => wv * penStroke(u));
      }
      s = e + lerp(o.gap[0], o.gap[1], r()) * o.pen;
      k++;
    }
  }

  // ===========================================================================
  // Leaf blade profile: rounded base, widest at 45 percent, rounded apex (r 30) with a small mucro
  // ===========================================================================

  const LEAF = (() => {
    const tip = LEAF_LEN - 7, capR = 30, capC = tip - capR;
    const uw = PET + 0.45 * (tip - PET);
    const prof = (u, Lg) => {
      if (u <= uw) {
        const s = Math.min(1, (uw - u) / (uw - PET));
        return 5 + (LEAF_H - 5) * Math.pow(1 - s * s, 0.6);
      }
      const s = (u - uw) / Lg;
      return s >= 1 ? 0 : LEAF_H * Math.pow(1 - s * s, 0.8);
    };
    const minD = (Lg) => {
      let best = Infinity, bu = uw;
      for (let u = uw; u <= uw + Lg; u += 0.5) {
        const d = Math.hypot(u - capC, prof(u, Lg));
        if (d < best) {
          best = d;
          bu = u;
        }
      }
      return [best, bu];
    };
    // widen the flank until the apex circle sits tangent inside it
    let lo = tip - uw, hi = 560;
    for (let i = 0; i < 36; i++) {
      const m = (lo + hi) / 2;
      if (minD(m)[0] < capR) lo = m;
      else hi = m;
    }
    const Lg = hi, ut = minD(Lg)[1];
    const tab = new Float32Array(LEAF_LEN * 2 + 2);
    for (let i = 0; i < tab.length; i++) {
      const u = i / 2;
      let h;
      if (u < PET) h = 5.4 - 0.6 * (u / PET);
      else if (u < ut) h = prof(u, Lg);
      else h = Math.sqrt(Math.max(0, capR * capR - (u - capC) * (u - capC)));
      if (u > 454) h = Math.max(h, 3.2 * Math.pow(Math.max(0, 1 - (u - 454) / 16), 1.3));
      tab[i] = h;
    }
    return { tab, ut, uw };
  })();
  function leafHW(u) {
    if (u <= 0) return LEAF.tab[0];
    const x = u * 2;
    const i = Math.floor(x);
    if (i >= LEAF.tab.length - 1) return 0;
    return lerp(LEAF.tab[i], LEAF.tab[i + 1], x - i);
  }

  // side-vein family: fractional index c runs between the real veins (c = 0..8), so hatch strokes
  // follow the strip between two neighbouring veins
  const famU0 = (c) => 50 + c * 41;
  const famSweep = (c) => Math.max(26, 84 - c * 6);

  // ===========================================================================
  // Leaves (built once, pure)
  // ===========================================================================

  function makeLeaf(side, k, opt = {}) {
    const by = opt.by != null ? opt.by : PAIR_Y[k];
    const bx = opt.bx != null ? opt.bx : STEM_X + side * 10;
    const la = opt.la != null ? opt.la : LA;
    const sc = opt.scale || 1;
    const ax = side * Math.cos(la), ay = -Math.sin(la);
    const nx = -side * Math.sin(la), ny = -Math.cos(la); // upper normal
    const droop = (u) => -DROOP * (u / LEAF_LEN) * (u / LEAF_LEN);
    const W = (u, v) => {
      const vv = v + droop(u);
      return [bx + (ax * u + nx * vv) * sc, by + (ay * u + ny * vv) * sc];
    };
    const UV = (x, y) => {
      const dx = (x - bx) / sc, dy = (y - by) / sc;
      const u = dx * ax + dy * ay;
      return [u, dx * nx + dy * ny - droop(u)];
    };
    const s = opt.seed || SD('leaf', side, k);
    const up = [], lo = [];
    const us = [];
    for (let u = 0; u <= 400; u += 5) us.push(u);
    for (let u = 402; u <= LEAF_LEN; u += 2) us.push(u);
    for (const u of us) {
      const h = leafHW(u);
      up.push(W(u, h * (1 + 0.03 * L.noise1(u * 0.03, s + 1))));
      lo.push(W(u, -h * (1 + 0.03 * L.noise1(u * 0.03, s + 2))));
    }
    lo.reverse();
    let outline = up.concat(lo.slice(1));
    const cut = outline.map(() => false);
    const lf = { side, k, bx, by, ax, ay, nx, ny, W, UV, sc, seed: s, holes: [], dyn: [], trench: null, beads: [], frass: [], bites: [] };

    // midrib and side veins in (u, v)
    lf.midrib = [];
    for (let u = 0; u <= LEAF_LEN - 12; u += 12) lf.midrib.push(W(u, 0));
    lf.veins = [];
    for (let i = 0; i < 9; i++) {
      const u0 = famU0(i);
      const sweep = famSweep(i);
      for (const sg of [1, -1]) {
        const pts = [];
        for (let j = 0; j <= 6; j++) {
          const t = j / 6;
          const u = Math.min(LEAF_LEN - 14, u0 + sweep * Math.pow(t, 1.6) + 4 * sg);
          const v = sg * leafHW(u) * 0.88 * Math.pow(t, 0.85);
          pts.push(W(u, v));
        }
        lf.veins.push({ pts, sg, u0 });
      }
    }

    if (!opt.back) {
      // damage per leaf, from the storyboard
      const key = (side < 0 ? 'L' : 'R') + k;
      const rr = L.rng(s + 9);
      const addFrass = (cx, cy, n, spread) => {
        for (let i = 0; i < n; i++) {
          const a = rr() * TAU, d = spread * Math.sqrt(rr());
          lf.frass.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d, rr.range(2.6, 4.2), rr() * Math.PI]);
        }
      };
      const addBite = (c, r) => {
        outline = bite(outline, cut, c[0], c[1], r);
        lf.bites.push({ cx: c[0], cy: c[1], r });
      };
      if (key === 'L0') {
        lf.trench = { cx: 320, cy: 1580, r: 45, a0: 0, a1: TAU };
        lf.holes.push({ pts: crescent(322, 1586, 30, -1.62, 2.5, 0.56, 11), cx: 322, cy: 1586, trench: true });
        const angs = [-2.7, -2.15, -1.6, 2.95, 2.3, -0.75, -0.1, 0.62];
        angs.forEach((a, i) => lf.beads.push({ x: 320 + Math.cos(a) * 52, y: 1580 + Math.sin(a) * 52, r: i === 4 ? 4.2 : 5, f: i >= 5 ? (i - 5) * 3 : -99 }));
        const hp = W(110, 36);
        lf.dyn.push({ fe: 6, cx: hp[0], cy: hp[1], pts: crescent(hp[0], hp[1], 24, -2.2, 2.9, 0.58, 21) });
        addFrass(250, 1640, 5, 22);
      } else if (key === 'R0') {
        lf.trench = { cx: 760, cy: 1590, r: 45, a0: -0.9, a1: 2.4 };
        lf.holes.push({ pts: crescent(760, 1590, 44, 2.35, 3.3, 0.78, 31), cx: 760, cy: 1590 });
        addFrass(835, 1560, 4, 26);
      } else if (key === 'L1') {
        const hc = W(250, -34);
        lf.holes.push({ pts: crescent(hc[0], hc[1], 45, -0.35, 2.9, 0.6, 41), cx: hc[0], cy: hc[1] });
        addBite(W(300, leafHW(300) + 16), 40);
        addBite(W(338, leafHW(338) + 4), 24);
        const hp = W(120, -40);
        lf.dyn.push({ fe: 33, cx: hp[0], cy: hp[1], pts: crescent(hp[0], hp[1], 32, 0.9, 2.8, 0.6, 51) });
        addFrass(hc[0] + 40, hc[1] + 70, 3, 18);
      } else if (key === 'R1') {
        addBite(W(250, -(leafHW(250) + 22)), 56);
        addBite(W(200, -(leafHW(200) + 8)), 26);
        const hc = W(335, 40);
        lf.holes.push({ pts: crescent(hc[0], hc[1], 30, -2.6, 2.6, 0.62, 61), cx: hc[0], cy: hc[1] });
        addFrass(860, 1010, 2, 14);
      } else if (key === 'L2') {
        const hp = W(150, 32);
        lf.dyn.push({ fe: 57, cx: hp[0], cy: hp[1], pts: crescent(hp[0], hp[1], 36, -2.0, 2.9, 0.6, 71) });
      }
    }
    lf.outline = outline;
    lf.cut = cut;
    lf.bb = L.bounds(outline);
    if (!opt.back && typeof Path2D !== 'undefined') {
      lf.upperHalf = new Path2D();
      const uh = [];
      for (let u = 0; u <= LEAF_LEN; u += 10) uh.push(W(u, -2));
      for (let u = LEAF_LEN; u >= 0; u -= 10) uh.push(W(u, leafHW(u) * 1.2 + 6));
      polyPath(lf.upperHalf, uh);
    }

    // outline runs: ink along the whole margin, brown chewed edges along the notches
    lf.runs = null;
    if (cut.some(Boolean)) {
      const n = outline.length;
      let s0 = 0;
      for (let i = 0; i < n; i++) if (!cut[i] && cut[(i - 1 + n) % n]) { s0 = i; break; }
      const runs = [];
      let cur = { cut: false, pts: [outline[s0]] };
      for (let j = 1; j <= n; j++) {
        const i = (s0 + j) % n;
        cur.pts.push(outline[i]);
        if (cut[i] !== cur.cut && j < n) {
          runs.push(cur);
          cur = { cut: cut[i], pts: [outline[(i - 1 + n) % n], outline[i]] };
        }
      }
      runs.push(cur);
      lf.runs = runs;
    }

    if (!opt.back) {
      // reticulate net between neighbouring side veins
      lf.net = [];
      const vr = L.rng(s + 5);
      for (let i = 0; i < lf.veins.length - 2; i++) {
        const A = lf.veins[i].pts, B = lf.veins[i + 2].pts;
        for (const j of [2, 3, 4, 5]) {
          if (vr() < 0.35) continue;
          const a = A[j], b = B[Math.min(6, j + (vr() < 0.5 ? 0 : 1))];
          const m = [(a[0] + b[0]) / 2 + vr.range(-5, 5), (a[1] + b[1]) / 2 + vr.range(-5, 5)];
          lf.net.push([a, m, b]);
        }
      }
      // margin hairs (downy leaves): tick base and outward direction
      lf.hairs = [];
      const hr = L.rng(s + 7);
      for (let i = 2; i < outline.length - 2; i += 2) {
        const a = outline[i - 1], b = outline[i + 1], p = outline[i];
        let tx = b[0] - a[0], ty = b[1] - a[1];
        const tl = Math.hypot(tx, ty) || 1;
        tx /= tl;
        ty /= tl;
        const uv = UV(p[0], p[1]);
        let ox = -ty, oy = tx;
        const test = UV(p[0] + ox * 4, p[1] + oy * 4);
        if (Math.abs(test[1]) < Math.abs(uv[1])) {
          ox = -ox;
          oy = -oy;
        }
        if (uv[0] < 40) continue;
        lf.hairs.push([p[0], p[1], ox + tx * 0.5, oy + ty * 0.5, hr.range(4, 9), hr()]);
      }

      // latex beads where a hole or a notch cuts a vein (2 to 4 each)
      const lines = [[lf.midrib, 3]];
      for (const v of lf.veins) lines.push([v.pts, 2]);
      for (const nn of lf.net) lines.push([nn, 1]);
      const br = L.rng(s + 77);
      const pick = (hits, cx, cy, fallback) => {
        hits.sort((a, b) => b[2] - a[2]);
        const out = [];
        for (const h of hits) {
          if (out.length >= 4) break;
          if (out.every((o) => Math.hypot(o[0] - h[0], o[1] - h[1]) > 10)) out.push(h);
        }
        for (const fb of fallback) {
          if (out.length >= 2) break;
          if (out.every((o) => Math.hypot(o[0] - fb[0], o[1] - fb[1]) > 10)) out.push([fb[0], fb[1], 0]);
        }
        return out.map((h) => {
          const dx = h[0] - cx, dy = h[1] - cy, dl = Math.hypot(dx, dy) || 1;
          return { x: h[0] + (dx / dl) * 2.2, y: h[1] + (dy / dl) * 2.2, r: br.range(3, 4) };
        });
      };
      const holeHits = (poly) => {
        const hits = [];
        for (const [ln, wgt] of lines) {
          for (let i = 1; i < ln.length; i++) {
            for (let j = 0; j < poly.length; j++) {
              const p = segHit(ln[i - 1], ln[i], poly[j], poly[(j + 1) % poly.length]);
              if (p) hits.push([p[0], p[1], wgt]);
            }
          }
        }
        return hits;
      };
      lf.cutBeads = [];
      for (const h of lf.holes) {
        if (h.trench) continue;
        const n = h.pts.length;
        lf.cutBeads.push({ dyn: null, list: pick(holeHits(h.pts), h.cx, h.cy, [h.pts[Math.floor(n * 0.25)], h.pts[Math.floor(n * 0.75)]]) });
      }
      for (const d of lf.dyn) {
        const n = d.pts.length;
        lf.cutBeads.push({ dyn: d, list: pick(holeHits(d.pts), d.cx, d.cy, [d.pts[Math.floor(n * 0.2)], d.pts[Math.floor(n * 0.8)]]) });
      }
      for (const b of lf.bites) {
        const circ = L.ellipsePts(b.cx, b.cy, b.r, b.r, 40);
        const hits = holeHits(circ).filter((h) => {
          const [u, v] = UV(h[0], h[1]);
          return u > 30 && Math.abs(v) < leafHW(u) - 1.5;
        });
        const fb = circ.filter((p) => {
          const [u, v] = UV(p[0], p[1]);
          return u > 30 && Math.abs(v) < leafHW(u) - 2;
        });
        lf.cutBeads.push({ dyn: null, list: pick(hits, b.cx, b.cy, fb.length ? [fb[0], fb[fb.length - 1]] : []) });
      }
    }
    return lf;
  }

  const LEAVES = [];
  for (let k = 0; k < 3; k++) for (const side of [-1, 1]) LEAVES.push(makeLeaf(side, k));

  // back plane: parts of two more milkweed plants, pale, each stem bowing in from one edge over part of
  // the height only (lower left, right middle), so the plant's mirror is broken rather than framed
  const BACK = (() => {
    const cxL = (y) => -30 + 110 * Math.sin((Math.PI * (y - 300)) / 1900);
    const cxR = (y) => 1110 - 90 * Math.sin((Math.PI * (y - 900)) / 1300);
    const stems = [
      { cx: cxL, y0: 300, y1: 2000, sd: SD('bstem', 0) },
      { cx: cxR, y0: 900, y1: 2000, sd: SD('bstem', 1) },
    ];
    for (const st of stems) {
      const left = [], right = [];
      for (let y = st.y0; y <= st.y1; y += 20) {
        const cx = st.cx(y) + 4 * L.noise1(y * 0.004, st.sd);
        left.push([cx - 15, y]);
        right.push([cx + 15, y]);
      }
      st.left = left;
      st.right = right;
      st.poly = left.concat(right.slice().reverse());
    }
    const leaves = [
      makeLeaf(1, 0, { back: true, bx: cxL(745), by: 745, la: 0.2, scale: 0.9, seed: SD('bl', 0) }),
      makeLeaf(1, 0, { back: true, bx: cxL(1300), by: 1300, la: -0.16, scale: 0.52, seed: SD('bl', 1) }),
      makeLeaf(1, 0, { back: true, bx: -40, by: 150, la: 0.5, scale: 0.72, seed: SD('bl', 2) }),
      makeLeaf(-1, 0, { back: true, bx: cxR(1335), by: 1335, la: 0.24, scale: 0.88, seed: SD('bl', 3) }),
      makeLeaf(-1, 0, { back: true, bx: 1120, by: 640, la: 0.3, scale: 0.56, seed: SD('bl', 4) }),
      makeLeaf(-1, 0, { back: true, bx: cxR(1860), by: 1860, la: 0.42, scale: 0.8, seed: SD('bl', 5) }),
    ];
    return { stems, leaves };
  })();

  // ===========================================================================
  // Stem (built once)
  // ===========================================================================

  const STEM = (() => {
    const left = [], right = [];
    const node = (y) => PAIR_Y.reduce((a, py) => a + 5 * Math.exp(-(((y - py) / 34) ** 2)), 0);
    for (let y = -80; y <= 2000; y += 16) {
      left.push([STEM_L - node(y) + 0.9 * L.noise1(y * 0.02, SD('stemL')), y]);
      right.push([STEM_R + node(y) + 0.9 * L.noise1(y * 0.02, SD('stemR')), y]);
    }
    const poly = left.concat(right.slice().reverse());
    const hairs = [];
    const r = L.rng(SD('stemhair'));
    for (let y = -60; y <= 1990; y += r.range(5, 9)) {
      const sgn = r() < 0.5 ? -1 : 1;
      const x = sgn < 0 ? STEM_L - node(y) : STEM_R + node(y);
      hairs.push([x, y, sgn, r.range(4, 10), r.range(0.45, 0.8), r()]);
    }
    // dark band just inside the shadow edge
    const band = [];
    for (let y = -80; y <= 2000; y += 16) band.push([STEM_R + node(y) - 1, y]);
    for (let y = 2000; y >= -80; y -= 16) band.push([STEM_R + node(y) - 6, y]);
    // contour strokes across the shadow side, 6 to 7 px apart
    const contour = [];
    const cr = L.rng(SD('stemcontour'));
    for (let y = -80; y <= 2000; y += 6.5 * (0.85 + 0.3 * cr())) {
      contour.push({ y, xs: 542 + (cr() - 0.5) * 5, xe: STEM_R + node(y) - 1, w: cr.range(0.85, 1.15), bow: cr.range(1.6, 2.8) });
    }
    return { left, right, poly, hairs, node, band, contour };
  })();

  // ===========================================================================
  // First-instar walk path: out of the trench, along the leaf, onto the stem face
  // ===========================================================================

  const WALK = (() => {
    const raw = [[315, 1680], [317, 1640], [319, 1608], [322, 1586], [326, 1573], [338, 1575], [360, 1588], [400, 1605], [445, 1622], [486, 1634], [510, 1630], [522, 1606], [526, 1560], [526, 1500], [526, 1200], [526, -600]];
    const pts = L.smoothPts(raw, false, 2);
    const S = [0];
    for (let i = 1; i < pts.length; i++) S.push(S[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const near = (x, y) => {
      let best = 0, bd = Infinity;
      for (let i = 0; i < pts.length; i++) {
        const d = Math.hypot(pts[i][0] - x, pts[i][1] - y);
        if (d < bd) {
          bd = d;
          best = i;
        }
      }
      return S[best];
    };
    const at = (s) => {
      const n = pts.length;
      if (s <= 0) {
        const dx = pts[1][0] - pts[0][0], dy = pts[1][1] - pts[0][1], l = Math.hypot(dx, dy);
        return [pts[0][0] + (dx / l) * s, pts[0][1] + (dy / l) * s, dx / l, dy / l];
      }
      let lo = 0, hi = n - 1;
      while (hi - lo > 1) {
        const m = (lo + hi) >> 1;
        if (S[m] <= s) lo = m;
        else hi = m;
      }
      const seg = S[hi] - S[lo] || 1;
      const u = clamp((s - S[lo]) / seg);
      const i0 = Math.max(0, lo - 2), i1 = Math.min(n - 1, hi + 2);
      const tx = pts[i1][0] - pts[i0][0], ty = pts[i1][1] - pts[i0][1];
      const tl = Math.hypot(tx, ty) || 1;
      return [lerp(pts[lo][0], pts[hi][0], u), lerp(pts[lo][1], pts[hi][1], u), tx / tl, ty / tl];
    };
    return { pts, S, at, sChew: near(326, 1573), s1500: near(526, 1500), sStart: near(318, 1620) };
  })();

  const vertPath = (x) => (s) => [x, 2000 - s, 0, -1];

  // ===========================================================================
  // Pose: everything about the caterpillar on a frame (drawings change on twos)
  // ===========================================================================

  function poseAtFrame(fr) {
    const f = clamp(Math.floor(fr), 0, LAST_F);
    const q = Math.floor(f / 2) / 12;
    let stage = 0;
    for (const mf of MOLT_F) if (f >= mf) stage++;
    const cur = INST[stage], prev = INST[Math.max(0, stage - 1)];
    const df = stage > 0 ? f - MOLT_F[stage - 1] : f;
    const d = Math.min(5, Math.floor(df / 2));
    // the snap is a drawing too: the new instar lands on the beat 8 percent long and settles a drawing later
    const e = stage > 0 ? (df < 2 ? 1.08 : 1) : 1;
    const ec = clamp(e);
    const g = (k) => lerp(prev[k], cur[k], e);
    const ps = {
      f, q, stage, d, e, df,
      len: g('len') * CRAWL_LEN[d], w: g('w'), head: lerp(prev.head, cur.head, ec),
      front: Math.max(0, g('front')), rear: Math.max(0, g('rear')),
      bands: lerp(prev.bands, cur.bands, ec), thorax: lerp(prev.thorax, cur.thorax, ec), ink: lerp(prev.ink, cur.ink, ec),
      first: stage === 0 ? 1 : 1 - ec,
      amp: CRAWL_AMP[d], xw: CRAWL_XW[d],
      // freeze cue: the drawing before each molt shows the old skin splitting behind the head
      split: stage < 4 && f >= MOLT_F[stage] - 2,
    };
    if (stage === 0) {
      ps.sHead = lerp(WALK.sChew, WALK.s1500, WALK_FR[d]) + (d === 0 ? 1.6 : 0);
      ps.path = WALK.at;
      ps.bx = 526;
      ps.chew = d === 0 ? 0 : -1;
    } else {
      const y = lerp(HEAD_Y[stage - 1], HEAD_Y[stage], CLIMB_FR[d]);
      let x = stageX(stage, d);
      if (d === 0) x = lerp(stageX(stage - 1, 5), x, ec);
      ps.bx = x;
      ps.path = vertPath(x);
      ps.sHead = 2000 - y;
      ps.chew = -1;
    }
    return ps;
  }

  function midOf(ps) {
    if (ps.stage === 0) {
      const p = WALK.at(ps.sHead - ps.len * 0.5);
      return [p[0], p[1]];
    }
    return [ps.bx, 2000 - ps.sHead + ps.len * 0.5];
  }

  // loupe camera: locked to the current drawing, so the larva holds still in the loupe and the
  // stem, rings, capsules and trail step past it on twos
  function loupeTrack(f) {
    const p = poseAtFrame(f - (f % 2));
    const m = midOf(p);
    // instar 3 nearly fills the loupe: lean the view toward the head so the head never clips
    if (p.stage >= 1) m[1] -= 0.09 * p.len * clamp((p.len - 85) / 40);
    return m;
  }

  function loupeScale(f) {
    if (f < 0) return 0;
    if (f < 3) return E.outBack((f + 1) / 3);
    if (f < LP_OUT) return 1;
    const p = (f - LP_OUT + 1) / 4;
    return p >= 1 ? 0 : 1 - E.inBack(p);
  }

  // ===========================================================================
  // Caterpillar body model (lateral view, head first along its path, dorsal side to the left)
  // ===========================================================================

  const SEG_W = [0.72, 0.84, 0.9, 1, 1, 1, 1, 1, 1, 1, 1, 0.84, 0.74];
  const SEG_B = (() => {
    const tot = SEG_W.reduce((a, b) => a + b, 0);
    const out = [0];
    let acc = 0;
    for (const w of SEG_W) out.push((acc += w) / tot);
    return out;
  })();
  // body width per segment: T1 tapers to 80 percent, A9 and A10 to about 65 percent
  const SEG_PW = [0.8, 0.92, 0.98, 1, 1, 1, 1, 1, 1, 0.98, 0.9, 0.74, 0.64];
  // per segment, from the front edge: black, yellow, black, white split by a hairline, black
  const STRIPES = [['k', -0.01, 0.17], ['y', 0.17, 0.41], ['k', 0.41, 0.58], ['k', 0.685, 0.715], ['k', 0.81, 1.01]];

  function model(ps) {
    const len = ps.len, w = ps.w;
    const hv = (ps.head * 0.92) / len;
    const x0 = hv * 0.62;
    const archAt = (x) => (ps.amp ? ps.amp * w * 0.17 * Math.exp(-(((x - ps.xw) / 0.15) ** 2)) : 0);
    const centre = (x) => {
      const p = ps.path(ps.sHead - x * len);
      const a = archAt(x);
      return [p[0] + p[3] * a, p[1] - p[2] * a];
    };
    const frame = (x) => {
      const a = centre(x - 0.004), b = centre(x + 0.004), c = centre(x);
      let tx = a[0] - b[0], ty = a[1] - b[1];
      const l = Math.hypot(tx, ty) || 1;
      tx /= l;
      ty /= l;
      return { x: c[0], y: c[1], tx, ty, dx: ty, dy: -tx };
    };
    const xOf = (xb) => x0 + xb * (1 - x0);
    const pinch = clamp(w * 0.075, 0.5, 5.2) / (w * 0.5);
    const prof = (x) => {
      const xb = (x - x0) / (1 - x0);
      if (xb < 0 || xb > 1) return 0;
      let i = 0;
      while (i < 12 && xb > SEG_B[i + 1]) i++;
      const fr = (xb - SEG_B[i]) / (SEG_B[i + 1] - SEG_B[i]);
      const c = i + fr - 0.5;
      let p;
      if (c <= 0) p = SEG_PW[0];
      else if (c >= 12) p = SEG_PW[12];
      else {
        const i0 = Math.floor(c), k = c - i0;
        p = lerp(SEG_PW[i0], SEG_PW[i0 + 1], k * k * (3 - 2 * k));
      }
      if (xb < 0.04) p *= lerp(0.7, 1, E.outSine(xb / 0.04)); // neck under the head
      if (!((i === 0 && fr < 0.5) || (i === 12 && fr > 0.5))) p *= 1 - pinch * (1 - Math.pow(Math.sin(Math.PI * fr), 0.55));
      if (xb > 0.955) p *= Math.sqrt(Math.max(0, 1 - ((xb - 0.955) / 0.045) ** 2)); // rounded anal plate
      return p;
    };
    const pt = (x, n, fr) => {
      const F = fr || frame(x);
      const h = prof(x) * w * (n >= 0 ? 0.52 : 0.48);
      return [F.x + F.dx * n * h, F.y + F.dy * n * h];
    };
    const N = Math.round(clamp(len / 1.5, 40, 300));
    const Fs = [], Ps = [];
    const dors = [], vent = [];
    for (let i = 0; i <= N; i++) {
      const x = x0 + (i / N) * (1 - x0);
      const F = frame(x);
      const p = prof(x);
      Fs.push(F);
      Ps.push(p);
      dors.push([F.x + F.dx * p * w * 0.52, F.y + F.dy * p * w * 0.52]);
      vent.push([F.x - F.dx * p * w * 0.48, F.y - F.dy * p * w * 0.48]);
    }
    const outline = dors.concat(vent.slice(0, N).reverse());
    const segX = (i, fr) => xOf(SEG_B[i] + fr * (SEG_B[i + 1] - SEG_B[i]));
    const bb = L.bounds(outline);
    return { ps, len, w, hv, x0, xOf, frame, prof, pt, archAt, outline, Fs, Ps, N, segX, bb };
  }

  // ---------------------------------------------------------------- caterpillar drawing

  function filamentPts(M, which, far, q) {
    const ps = M.ps;
    const isFront = which === 'front';
    const Lf = isFront ? ps.front : ps.rear;
    const x = isFront ? M.segX(1, far ? 0.62 : 0.45) : M.segX(10, far ? 0.4 : 0.55);
    const F = M.frame(x);
    const root = M.pt(x, far ? 0.55 : 0.8, F);
    const sway = L.noise1(q * 2.3 + (isFront ? 0 : 5) + (far ? 1.7 : 0), SD('sway')) * 0.09 * Lf;
    const dir = isFront ? 1 : -1;
    const k = isFront
      ? [[0, 0], [0.2, 0.02], [0.44, 0.14], [0.62, 0.38], [0.68, 0.66], [0.6, 0.92]]
      : [[0, 0], [0.26, -0.02], [0.52, -0.22], [0.66, -0.52], [0.62, -0.86]];
    const spread = far ? 0.85 : 1;
    const n = k.length - 1;
    return k.map(([d, a], i) => {
      const u = i / n;
      const sw = sway * u * u;
      const dd = d * Lf * spread + sw, aa = a * Lf * (far ? 0.92 : 1) - (far ? dir * 0.04 * Lf * u : 0);
      return [root[0] + F.dx * dd + F.tx * aa, root[1] + F.dy * dd + F.ty * aa];
    });
  }

  function drawFilaments(ctx, M, far, q) {
    const ps = M.ps;
    const base = Math.max(1.1, ps.w * 0.14);
    for (const which of ['front', 'rear']) {
      const Lf = which === 'front' ? ps.front : ps.rear;
      if (Lf < 0.5) continue;
      const pts = L.smoothPts(filamentPts(M, which, far, q), false, Math.max(1, Lf / 18));
      if (pts.length < 2) continue;
      const col = far ? L.mix(C.veinBlack, C.inkSoft, 0.35) : C.veinBlack;
      if (Lf < 6) {
        tapered(ctx, pts, base * 1.2, base * 0.9, col, 1);
      } else {
        tapered(ctx, pts, base * (which === 'front' ? 1 : 0.85), Math.max(0.8, base * 0.14), col, 1, 1.6);
        if (!far && Lf > 15) {
          const m = Math.floor(pts.length * 0.75);
          const sh = [];
          for (let i = 1; i < m; i++) {
            const a = pts[i - 1], b = pts[i + 1];
            const tx = b[0] - a[0], ty = b[1] - a[1];
            const tl = Math.hypot(tx, ty) || 1;
            const off = lerp(base * 0.22, base * 0.05, i / m);
            sh.push([pts[i][0] + (ty / tl) * off, pts[i][1] - (tx / tl) * off]);
          }
          if (sh.length > 2) L.inkPath(ctx, sh, { width: Math.max(0.7, base * 0.16), color: C.spotWhite, alpha: 0.5, seed: SD('fsheen', which), taper: [3, 10], wobble: 0.2, tremble: 0.1 });
        }
      }
    }
  }

  function drawLegs(ctx, M) {
    const ps = M.ps, w = ps.w, pen = RS.pen;
    const lineW = Math.max(0.7, w * 0.028) * (ps.stage <= 1 ? 1.4 : 1) * pen;
    // three pairs of true legs on T1-T3
    for (let i = 0; i < 3; i++) {
      const x = M.segX(i, 0.55);
      const F = M.frame(x);
      const b = M.pt(x, -0.6, F);
      const vx = -F.dx * 0.86 + F.tx * 0.5, vy = -F.dy * 0.86 + F.ty * 0.5;
      const knee = [b[0] + vx * w * 0.3, b[1] + vy * w * 0.3];
      const tip = [knee[0] - F.dx * w * 0.04 + F.tx * w * 0.19, knee[1] - F.dy * w * 0.04 + F.ty * w * 0.19];
      tapered(ctx, [b, knee, tip], w * 0.14, w * 0.045, C.veinBlack, 1);
      tapered(ctx, [tip, [tip[0] + F.dx * w * 0.06 + F.tx * w * 0.02, tip[1] + F.dy * w * 0.06 + F.ty * w * 0.02]], w * 0.04, w * 0.01, C.veinBlack, 1);
      if (w > 20) {
        ctx.save();
        ctx.strokeStyle = C.spotWhite;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = Math.max(0.6, w * 0.012);
        ctx.beginPath();
        ctx.moveTo(lerp(b[0], knee[0], 0.25), lerp(b[1], knee[1], 0.25));
        ctx.lineTo(lerp(b[0], knee[0], 0.8), lerp(b[1], knee[1], 0.8));
        ctx.stroke();
        ctx.restore();
      }
    }
    // prolegs on A3-A6 and A10; the ones under the hump lift and step
    for (const i of [5, 6, 7, 8, 12]) {
      const { base, vx, vy, Lp } = prolegGeom(M, i);
      const px = -vy, py = vx;
      const wb = w * 0.15, wt = w * 0.115;
      const tip = [base[0] + vx * Lp, base[1] + vy * Lp];
      const pts = [
        [base[0] + px * wb, base[1] + py * wb],
        [tip[0] + px * wt, tip[1] + py * wt],
        [tip[0] + px * wt * 0.4 + vx * wt * 0.45, tip[1] + py * wt * 0.4 + vy * wt * 0.45],
        [tip[0] - px * wt * 0.4 + vx * wt * 0.45, tip[1] - py * wt * 0.4 + vy * wt * 0.45],
        [tip[0] - px * wt, tip[1] - py * wt],
        [base[0] - px * wb, base[1] - py * wb],
      ];
      const dark = ps.stage >= 2 ? 1 : ps.stage === 1 ? 0.45 : 0.15;
      const fill = L.mix(C.larvaFirst, C.veinBlack, dark);
      L.inkPath(ctx, pts, { closed: true, fill, width: lineW, seed: SD('proleg', i), wobble: Math.min(0.8, w * 0.02) * pen, tremble: 0.1 * pen, taper: [2, 4] });
      if (w > 18) {
        // crochets: a row of tiny hooks across the sole
        ctx.save();
        ctx.strokeStyle = C.tan;
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = Math.max(0.5, w * 0.012);
        ctx.beginPath();
        for (let c = -2; c <= 2; c++) {
          const sx = tip[0] + px * wt * c * 0.4 + vx * wt * 0.3, sy = tip[1] + py * wt * c * 0.4 + vy * wt * 0.3;
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + vx * w * 0.03, sy + vy * w * 0.03);
        }
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // proleg geometry on segment i (A3-A6 = 5..8, A10 = 12): base inside the body, unit direction, length
  function prolegGeom(M, i) {
    const w = M.ps.w;
    const x = M.segX(i, i === 12 ? 0.45 : 0.5);
    const F = M.frame(x);
    const lift = clamp(M.archAt(x) / (w * 0.17 + 1e-6));
    const anal = i === 12;
    let vx = -F.dx * (anal ? 0.55 : 0.95) - F.tx * (anal ? 0.85 : 0.28);
    let vy = -F.dy * (anal ? 0.55 : 0.95) - F.ty * (anal ? 0.85 : 0.28);
    if (lift > 0.05) {
      vx += F.tx * lift * 0.6;
      vy += F.ty * lift * 0.6;
    }
    const vl = Math.hypot(vx, vy) || 1;
    vx /= vl;
    vy /= vl;
    const base = M.pt(x, anal ? -0.6 : -0.7, F);
    const Lp = w * (anal ? 0.26 : 0.24) * (1 - 0.5 * lift);
    return { base, vx, vy, Lp };
  }

  // white spots on the exposed outer face of each A3-A6 proleg (4th instar on), drawn over the body
  function drawProlegSpots(ctx, M) {
    const w = M.ps.w, pen = RS.pen;
    ctx.save();
    ctx.fillStyle = C.spotWhite;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1 * pen;
    for (const i of [5, 6, 7, 8]) {
      const { base, vx, vy, Lp } = prolegGeom(M, i);
      const cx = base[0] + vx * Lp * 0.72, cy = base[1] + vy * Lp * 0.72;
      const rr = w * 0.09;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rr, rr * 0.9, Math.atan2(vy, vx), 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawHead(ctx, M) {
    const ps = M.ps, hs = ps.head, pen = RS.pen;
    const F = M.frame(M.hv * 0.5);
    const R = hs * 0.5;
    const hc = [F.x - F.dx * hs * 0.04, F.y - F.dy * hs * 0.04];
    // head coordinates: U toward the front (up the stem), V toward the ventral side (the stem), in R.
    // The face looks up and a little toward the viewer, the mouthparts sit at the top right.
    const hp = (U, V) => [hc[0] + (F.tx * U - F.dx * V) * R, hc[1] + (F.ty * U - F.dy * V) * R];
    const polar = (deg, r) => hp(Math.sin((deg * Math.PI) / 180) * r, Math.cos((deg * Math.PI) / 180) * r);
    const cap = [];
    for (let i = 0; i < 36; i++) {
      const deg = (i / 36) * 360;
      const a = (deg * Math.PI) / 180;
      const U = Math.sin(a), V = Math.cos(a);
      // slightly flattened across the face, fuller at the cheek
      cap.push(hp(U * (U > 0 ? 0.94 : 1.02), V * (V < 0 ? 1.04 : 1)));
    }
    if (hs > 11) {
      // mandibles and labrum at the mouth, a short pale antenna beside them
      const md = [hp(0.72, 0.5), hp(1.08, 0.62), hp(1.14, 0.9), hp(0.86, 0.98), hp(0.62, 0.84)];
      L.inkPath(ctx, md, { closed: true, fill: L.mix(C.bark, C.veinBlack, 0.35), width: Math.max(0.8, hs * 0.035) * pen, seed: SD('mand'), wobble: 0.3 * pen, tremble: 0.1 });
      tapered(ctx, [hp(0.84, 0.3), hp(1.12, 0.36), hp(1.28, 0.42)], hs * 0.075, hs * 0.035, C.bandWhite, 0.95);
      tapered(ctx, [hp(1.22, 0.41), hp(1.34, 0.45)], hs * 0.04, hs * 0.02, C.veinBlack, 1);
    }
    const path = new Path2D();
    polyPath(path, cap);
    ctx.save();
    ctx.fillStyle = C.veinBlack;
    ctx.fill(path);
    ctx.clip(path);
    if (ps.stage >= 1) {
      ctx.globalAlpha = ps.stage === 1 ? 0.9 : 1;
      ctx.fillStyle = C.bandYellow;
      // frons: an inverted yellow triangle on the face, base toward the vertex, apex at the mouth
      // (3rd instar on it spans about 55 percent of the capsule height, a clean triangle)
      const big = ps.stage >= 2;
      const B1 = big ? hp(0.95, -0.42) : hp(0.9, -0.3), B2 = big ? hp(0.2, -0.62) : hp(0.26, -0.52), A = big ? hp(0.72, 0.42) : hp(0.6, 0.34);
      ctx.beginPath();
      ctx.moveTo(B1[0], B1[1]);
      ctx.lineTo(B2[0], B2[1]);
      ctx.lineTo(A[0], A[1]);
      ctx.closePath();
      ctx.fill();
      // one yellow band round the cheek to the neck; on the big heads it is thin and starts clear of
      // the triangle's corner, so the two never merge into a hook
      const arc = big
        ? L.smoothPts([hp(0.02, -0.84), hp(-0.3, -0.86), hp(-0.62, -0.66), hp(-0.84, -0.3), hp(-0.88, 0.1)], false, Math.max(1, hs * 0.08))
        : L.smoothPts([hp(0.2, -0.66), hp(-0.14, -0.86), hp(-0.52, -0.74), hp(-0.8, -0.36), hp(-0.86, 0.1)], false, Math.max(1, hs * 0.08));
      const bp = new Path2D();
      ribbon(bp, arc, big ? (u) => hs * 0.07 * Math.min(1, 0.3 + u * 6) : (u) => hs * lerp(0.12, 0.06, u) * Math.min(1, 0.4 + u * 5));
      ctx.fill(bp);
      // six ocelli in a small semicircle beside the mouthparts
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.spotWhite;
      const orad = Math.max(0.4, hs * 0.026);
      for (let i = 0; i < 6; i++) {
        const deg = 130 + i * 36;
        const p = hp(0.4 + Math.sin((deg * Math.PI) / 180) * 0.22, 0.6 + Math.cos((deg * Math.PI) / 180) * 0.22);
        ctx.beginPath();
        ctx.arc(p[0], p[1], orad, 0, TAU);
        ctx.fill();
      }
    } else {
      // first instar: two pale spots by the antennae on the glossy black head
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = C.spotWhite;
      for (const p of [hp(0.62, 0.52), hp(0.46, 0.68)]) {
        ctx.beginPath();
        ctx.arc(p[0], p[1], Math.max(0.35, hs * 0.035), 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
    // glossy highlight crescent on the lit upper-left of the capsule
    const hl = [];
    for (const deg of ps.stage >= 1 ? [150, 168, 186, 204] : [100, 125, 150, 175]) hl.push(polar(deg, ps.stage >= 1 ? 0.5 : 0.66));
    const first = ps.stage === 0;
    L.inkPath(ctx, hl, { width: first ? Math.max(1.4, hs * 0.16) : Math.max(0.8, hs * 0.09), color: C.spotWhite, alpha: first ? 0.95 : 0.85, seed: SD('hhl'), taper: [3, 5].map((v) => v * Math.min(1, hs / 20)), wobble: 0.15, tremble: 0.05 });
    L.inkPath(ctx, cap, { closed: true, width: Math.max(1, ps.ink * 0.75) * pen, seed: SD('head'), wobble: Math.min(1, hs * 0.03) * pen, tremble: 0.15 * pen, taper: [4, 8] });
  }

  // curved contour hatching on the shadow (ventral, stem-side) side of the body
  function bodyContourHatch(ctx, M) {
    const ps = M.ps, w = ps.w, pen = RS.pen;
    const st = ps.stage;
    const sp1 = (st >= 3 ? 6 : st === 2 ? 4.2 : st === 1 ? 3.4 : 2.8) * pen;
    const sp2 = (st >= 3 ? 4 : st === 2 ? 3 : 0) * pen;
    const lw = (st >= 3 ? 1.4 : st === 2 ? 1.1 : st === 1 ? 0.9 : 0.75) * pen;
    const bi = L.boil(L.T);
    const bow = w * 0.15;
    const path = new Path2D();
    const layer = (sp, n0, n1, salt) => {
      const r = L.rng(SD('ch', st, salt));
      const total = M.len * (1 - M.x0);
      let s = r() * sp;
      let sid = 0;
      while (s < total) {
        const x = M.x0 + s / M.len;
        s += sp * (0.85 + 0.3 * r());
        sid++;
        const F = M.frame(x);
        const pw = M.prof(x);
        if (pw < 0.2) continue;
        const nEnd = -lerp(n0, n1, r());
        const jb = (L.h3(sid, salt, bi) - 0.5) * 0.9 * pen;
        // strokes wrap round the form and rise toward the ventral edge (the 45 degree hand),
        // so they cut across the yellow and white bands instead of hiding along their edges
        const tilt = w * (salt === 1 ? 0.2 : 0.12) * (0.85 + 0.3 * r());
        const pts = [];
        for (let m = 0; m <= 5; m++) {
          const u = m / 5;
          const n = lerp(-1.12, nEnd, u);
          const h = pw * w * (n < 0 ? 0.48 : 0.52);
          const nb = n * 0.69;
          const b = -bow * (1 - nb * nb) * pw + tilt * (1 - u) + jb * u;
          pts.push([F.x + F.dx * n * h + F.tx * b, F.y + F.dy * n * h + F.ty * b]);
        }
        ribbon(path, pts, (u) => lw * lerp(1.25, 0.25, u * u));
      }
    };
    layer(sp1, 0.2, 0.34, 1);
    if (sp2) layer(sp2, 0.66, 0.74, 2);
    ctx.save();
    ctx.fillStyle = st === 0 ? C.inkSoft : C.ink;
    ctx.globalAlpha = st >= 2 ? 0.8 : st === 1 ? 0.62 : 0.5;
    ctx.fill(path);
    ctx.restore();
  }

  function drawCaterpillar(ctx, ps, Mpre) {
    const M = Mpre || model(ps);
    const w = ps.w, pen = RS.pen;
    const q = ps.q;
    if (ps.stage >= 1) drawFilaments(ctx, M, true, q);
    drawLegs(ctx, M);

    const body = new Path2D();
    polyPath(body, M.outline);
    const base = ps.stage === 0 ? C.larvaFirst : L.mix(C.larvaFirst, C.bandWhite, ps.stage === 1 ? lerp(0.2, 0.55, clamp(ps.e)) : 1);
    ctx.save();
    ctx.fillStyle = base;
    ctx.fill(body);
    ctx.clip(body);

    // first instar: translucent gut line, dark triangular patches on T1 behind the head
    if (ps.first > 0.01) {
      ctx.globalAlpha = 0.4 * ps.first;
      const gut = [];
      for (let i = 0; i <= 12; i++) gut.push(M.pt(M.xOf(0.1 + (i / 12) * 0.8), -0.05));
      tapered(ctx, gut, w * 0.3, w * 0.2, C.milkweedDeep, 1);
      ctx.globalAlpha = 0.92 * ps.first;
      ctx.fillStyle = C.veinBlack;
      // 2 px behind the head capsule's back edge, out at the sides, so they show beside the neck
      const a = M.hv * 0.5 + (ps.head * 0.5 + 2) / M.len, b = a + (w * 0.9) / M.len;
      for (const sg of [1, -1]) {
        const tri = [M.pt(a, sg * 0.35), M.pt(a, sg * 1.25), M.pt(b, sg * 1.25)];
        ctx.beginPath();
        ctx.moveTo(tri[0][0], tri[0][1]);
        ctx.lineTo(tri[1][0], tri[1][1]);
        ctx.lineTo(tri[2][0], tri[2][1]);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // bands: edges curve round the cylinder, bowing toward the tail at mid-body
    if (ps.bands > 0.01) {
      const hh = w * 0.75;
      const bow = w * 0.15;
      const edge = (xa, j, fwd) => {
        const F = M.frame(xa);
        const out = [];
        for (let m = 0; m <= 6; m++) {
          const n = 1 - m / 3;
          const b = -bow * (1 - n * n) + j * n;
          out.push([F.x + F.dx * n * hh + F.tx * b, F.y + F.dy * n * hh + F.ty * b]);
        }
        return fwd ? out : out.reverse();
      };
      const build = (i0, i1) => {
        const paths = { k: new Path2D(), y: new Path2D() };
        for (let i = i0; i < i1; i++) {
          for (const [c, f0, f1] of STRIPES) {
            const ja = 0.6 * L.noise1(i * 3.1 + f0 * 7, SD('bj')), jb = 0.6 * L.noise1(i * 3.1 + f1 * 7, SD('bj'));
            const A = edge(M.segX(i, f0), ja, true), B = edge(M.segX(i, f1), jb, false);
            const p = paths[c];
            p.moveTo(A[0][0], A[0][1]);
            for (let m = 1; m < A.length; m++) p.lineTo(A[m][0], A[m][1]);
            for (let m = 0; m < B.length; m++) p.lineTo(B[m][0], B[m][1]);
            p.closePath();
          }
        }
        return paths;
      };
      const ab = build(3, 13), th = build(0, 3);
      ctx.save();
      ctx.globalAlpha = ps.bands;
      ctx.fillStyle = C.bandYellow;
      ctx.fill(ab.y);
      ctx.fillStyle = C.veinBlack;
      ctx.fill(ab.k);
      ctx.restore();
      if (ps.thorax > 0.01) {
        ctx.save();
        ctx.globalAlpha = ps.thorax;
        ctx.fillStyle = C.bandYellow;
        ctx.fill(th.y);
        ctx.fillStyle = C.veinBlack;
        ctx.fill(th.k);
        ctx.restore();
      }
      // the ventral (stem-side) strip turns away from the light: yellow drops to ochre and white to
      // paper shade, half strength from n -0.3 to -0.55 and full beyond, so each band reads round
      const strip = (na, nb) => {
        const p = new Path2D();
        const pts = [];
        for (let i = 0; i <= M.N; i += 2) {
          const F = M.Fs[i], h = M.Ps[i] * w * 0.48;
          pts.push([F.x + F.dx * na * h, F.y + F.dy * na * h]);
        }
        for (let i = M.N - (M.N % 2); i >= 0; i -= 2) {
          const F = M.Fs[i], h = M.Ps[i] * w * 0.48;
          pts.push([F.x + F.dx * nb * h, F.y + F.dy * nb * h]);
        }
        polyPath(p, pts);
        return p;
      };
      for (const [na, nb, a] of [[-0.3, -0.55, 0.55], [-0.55, -1.15, 1]]) {
        ctx.save();
        ctx.clip(strip(na, nb));
        ctx.globalAlpha = a * ps.bands;
        ctx.fillStyle = C.paperShade;
        ctx.fillRect(M.bb.x - 4, M.bb.y - 4, M.bb.w + 8, M.bb.h + 8);
        ctx.fillStyle = C.ochre;
        ctx.fill(ab.y);
        ctx.globalAlpha = ps.bands;
        ctx.fillStyle = C.veinBlack;
        ctx.fill(ab.k);
        if (ps.thorax > 0.01) {
          ctx.globalAlpha = a * ps.thorax;
          ctx.fillStyle = C.ochre;
          ctx.fill(th.y);
          ctx.globalAlpha = ps.thorax;
          ctx.fillStyle = C.veinBlack;
          ctx.fill(th.k);
        }
        ctx.restore();
      }
    }

    // prothoracic shield on T1 and the rounded anal plate on A10 (3rd instar on)
    if (ps.stage >= 2) {
      const plate = (xa, xb, nIn, nOut) => {
        const pts = [];
        for (let j = 0; j <= 8; j++) pts.push(M.pt(lerp(xa, xb, j / 8), nOut));
        for (let j = 8; j >= 0; j--) {
          const u = j / 8;
          pts.push(M.pt(lerp(xa, xb, u), nIn + 0.22 * Math.pow(Math.abs(u - 0.5) * 2, 2)));
        }
        return pts;
      };
      ctx.save();
      ctx.fillStyle = C.veinBlack;
      ctx.globalAlpha = ps.thorax;
      for (const pl of [plate(M.segX(0, 0.04), M.segX(0, 0.9), 0.3, 1.15), plate(M.segX(12, 0.12), M.xOf(1), 0.2, 1.15)]) {
        const pp = new Path2D();
        polyPath(pp, pl);
        ctx.fill(pp);
      }
      ctx.restore();
      const sh = [M.pt(M.segX(0, 0.22), 0.72), M.pt(M.segX(0, 0.5), 0.76), M.pt(M.segX(0, 0.72), 0.7)];
      L.inkPath(ctx, sh, { width: Math.max(0.7, w * 0.035), color: C.spotWhite, alpha: 0.6 * ps.thorax, seed: SD('shield'), taper: [2, 3], wobble: 0.1, tremble: 0.05 });
    }

    bodyContourHatch(ctx, M);
    if (ps.stage >= 2 && w > 28) {
      // velvet: fine pale stipple catching the light along the dorsal third
      const yFront = M.Fs[0].y, yEnd = M.Fs[M.N].y;
      L.stipple(ctx, M.outline, {
        spacing: 4.2 * pen, r: [0.5 * pen, 1.15 * pen], color: C.spotWhite, alpha: 0.5, seed: SD('velvet', ps.stage),
        density: (X, Y) => {
          const i = Math.round(((Y - yFront) / (yEnd - yFront || 1)) * M.N);
          if (i < 0 || i > M.N) return 0;
          const F = M.Fs[i], hw = M.Ps[i] * w * 0.5;
          if (hw < 1) return 0;
          const n = ((X - F.x) * F.dx + (Y - F.y) * F.dy) / hw;
          return sst(0.15, 0.55, n) * (1 - sst(0.8, 0.98, n)) * 0.55;
        },
      });
    }

    // dorsal rim light: a thin pale line along n +0.8 over the middle of each segment, following the
    // bulge, so the black bands turn round at the lit edge
    if (ps.stage >= 1) {
      const rim = new Path2D();
      const rw = Math.min(2, w * 0.06) * (0.6 + 0.4 * pen);
      for (let i = 0; i < 13; i++) {
        const pts = [];
        for (let m = 0; m <= 6; m++) pts.push(M.pt(M.segX(i, lerp(0.2, 0.8, m / 6)), 0.8));
        ribbon(rim, pts, (u) => rw * Math.sin(Math.PI * (0.1 + 0.8 * u)));
      }
      ctx.save();
      ctx.fillStyle = C.spotWhite;
      ctx.globalAlpha = 0.35;
      ctx.fill(rim);
      ctx.restore();
    }

    // short glints on the dorsal third, placed per segment so no column forms (about one segment in
    // four has none); the 12 fps boil only nudges them
    {
      const bi = L.boil(L.T);
      const gl = new Path2D();
      const gw = clamp(w * 0.05, 0.8, 3);
      const sc = clamp(w / 60, 0.3, 1);
      for (let i = 0; i < 13; i++) {
        if (L.h3(i, ps.stage, 74) < 0.25) continue;
        const xa = M.segX(i, lerp(0.18, 0.62, L.h3(i, 7, 71)) + 0.02 * (L.h3(i, bi, 75) - 0.5));
        const glen = lerp(5, 12, L.h3(i, 9, 72)) * sc;
        const xb = xa + glen / M.len;
        const n = ps.stage === 0 ? 0.42 + 0.1 * (L.h3(i, 11, 73) - 0.5) : lerp(0.45, 0.72, L.h3(i, 11, 73));
        const pts = [];
        for (let m = 0; m <= 3; m++) pts.push(M.pt(lerp(xa, xb, m / 3), n));
        ribbon(gl, pts, (u) => gw * Math.sin(Math.PI * (0.12 + 0.76 * u)));
      }
      ctx.save();
      ctx.fillStyle = C.spotWhite;
      ctx.globalAlpha = 0.92;
      ctx.fill(gl);
      ctx.restore();
    }

    // ruled segment lines on the early instars
    if (ps.bands < 0.9) {
      ctx.strokeStyle = C.inkSoft;
      ctx.globalAlpha = 0.8 * (1 - ps.bands);
      ctx.lineWidth = Math.max(0.5, w * 0.05) * (0.6 + 0.4 * pen);
      ctx.beginPath();
      for (let i = 1; i < 13; i++) {
        const x = M.xOf(SEG_B[i]);
        const F = M.frame(x);
        const a = M.pt(x, -1.1, F), b = M.pt(x, 1.1, F);
        const bow = -w * 0.12;
        ctx.moveTo(a[0], a[1]);
        ctx.quadraticCurveTo((a[0] + b[0]) / 2 + F.tx * bow, (a[1] + b[1]) / 2 + F.ty * bow, b[0], b[1]);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // spiracles on T1 and A1-A8
    if (w >= 13) {
      for (const i of [0, 3, 4, 5, 6, 7, 8, 9, 10]) {
        const x = M.segX(i, 0.3);
        const F = M.frame(x);
        const p = M.pt(x, -0.36, F);
        const rot = Math.atan2(F.ty, F.tx);
        ctx.save();
        ctx.fillStyle = C.bandWhite;
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.ellipse(p[0], p[1], w * 0.05, w * 0.072, rot, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = C.veinBlack;
        ctx.beginPath();
        ctx.ellipse(p[0], p[1], w * 0.03, w * 0.05, rot, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();

    // setae on the first instar
    if (ps.first > 0.01) {
      ctx.save();
      ctx.strokeStyle = C.ink;
      ctx.globalAlpha = 0.8 * ps.first;
      ctx.lineWidth = 0.7 * (0.5 + 0.5 * pen);
      ctx.beginPath();
      for (let i = 0; i < 13; i++) {
        for (const n of [1, -1]) {
          if ((i + (n > 0 ? 0 : 1)) % 2) continue;
          const x = M.segX(i, 0.5);
          const F = M.frame(x);
          const p = M.pt(x, n * 0.9, F);
          const l = w * (0.7 + 0.25 * ((i * 7) % 3) / 2);
          ctx.moveTo(p[0], p[1]);
          ctx.lineTo(p[0] + F.dx * n * l - F.tx * l * 0.35, p[1] + F.dy * n * l - F.ty * l * 0.35);
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    // outline
    L.inkPath(ctx, M.outline, {
      closed: true,
      width: ps.ink * pen,
      seed: SD('body', ps.stage),
      wobble: Math.min(1.4, w * 0.04) * pen,
      tremble: Math.min(0.4, w * 0.02) * pen,
      taper: [6, 12],
      double: ps.stage === 4 ? { offset: 5.5, width: 0.3, alpha: 0.4, from: 0.08, to: 0.42 } : false,
    });
    if (ps.stage >= 3) drawProlegSpots(ctx, M);
    if (ps.split) {
      // the old skin splitting just behind the head capsule: the cue on the drawing before the molt
      const x = M.hv * 0.5 + (ps.head * 0.5 + 1.5) / M.len;
      const F = M.frame(x);
      const pts = [];
      for (let m = 0; m <= 6; m++) {
        const n = lerp(0.95, -0.95, m / 6);
        const p = M.pt(x, n, F);
        const b = -w * 0.08 * (1 - n * n);
        pts.push([p[0] + F.tx * b, p[1] + F.ty * b]);
      }
      L.inkPath(ctx, pts, { width: Math.max(1, w * 0.035) * (0.5 + 0.5 * pen), color: C.spotWhite, alpha: 0.95, seed: SD('split', ps.stage), taper: [2, 2], wobble: 0.3 * pen, tremble: 0.1 });
    }
    if (ps.stage === 0) {
      // bumps where the filaments will grow
      ctx.save();
      ctx.fillStyle = C.veinBlack;
      for (const i of [1, 10]) {
        const p = M.pt(M.segX(i, 0.5), 1.05);
        ctx.beginPath();
        ctx.arc(p[0], p[1], 1.3, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    } else {
      drawFilaments(ctx, M, false, q);
    }
    drawHead(ctx, M);
    return M;
  }

  // ---------------------------------------------------------------- shed skin, capsules

  function drawSleeve(ctx, ps) {
    if (ps.stage === 0) return;
    const k = ps.stage - 1;
    const j = Math.floor((ps.f - MOLT_F[k]) / 2);
    if (j < 0 || j > 1) return;
    const pen = RS.pen;
    const old = INST[k];
    const sTail = ps.sHead - ps.len;
    const sl = old.len * (j === 0 ? 0.46 : 0.32);
    const top = sTail + (j === 0 ? sl * 0.25 : -old.len * 0.14);
    const hw = old.w * (j === 0 ? 0.6 : 0.52);
    const Ms = 22;
    const sd = SD('sleeve', k, j);
    const leftE = [], rightE = [];
    for (let i = 0; i <= Ms; i++) {
      const u = i / Ms;
      const p = ps.path(top - u * sl);
      const env = Math.pow(Math.sin(Math.PI * (0.12 + 0.88 * u)), 0.5) * (u < 0.1 ? 0.9 : 1);
      const cr = 1 + 0.22 * L.noise1(u * 9 + j * 4, sd) + 0.12 * Math.sin(u * 40 + k);
      const hL = hw * env * cr, hR = hw * env * (1 + 0.22 * L.noise1(u * 9 + 11, sd));
      leftE.push([p[0] + p[3] * hL, p[1] - p[2] * hL]);
      rightE.push([p[0] - p[3] * hR, p[1] + p[2] * hR]);
    }
    const pts = leftE.concat(rightE.reverse());
    const alpha = j === 0 ? 0.85 : 0.6;
    ctx.save();
    ctx.globalAlpha = alpha;
    L.inkPath(ctx, pts, { closed: true, fill: C.tan, fillAlpha: 0.75, width: Math.max(1, old.ink * 0.5) * pen, color: C.inkSoft, seed: sd, wobble: Math.min(1.2, old.w * 0.05) * pen, tremble: 0.2 * pen });
    if (old.w > 12) {
      ctx.strokeStyle = C.inkSoft;
      ctx.lineWidth = Math.max(0.6, old.w * 0.03) * (0.5 + 0.5 * pen);
      ctx.beginPath();
      for (let i = 1; i < 7; i++) {
        const u = i / 7;
        const p = ps.path(top - u * sl);
        const zig = old.w * 0.12 * (i % 2 ? 1 : -1);
        ctx.moveTo(p[0] + p[3] * hw * 0.8, p[1] + zig * 0.3);
        ctx.lineTo(p[0], p[1] + zig);
        ctx.lineTo(p[0] - p[3] * hw * 0.7, p[1] - zig * 0.2);
      }
      ctx.stroke();
      if (k >= 1) {
        ctx.globalAlpha = alpha * 0.28;
        ctx.fillStyle = C.veinBlack;
        for (let i = 1; i < 6; i++) {
          const p = ps.path(top - (i / 6) * sl);
          ctx.fillRect(p[0] - hw * 0.7, p[1] - old.w * 0.08, hw * 1.4, old.w * 0.12);
        }
      }
    }
    ctx.restore();
  }

  function capsuleAt(k, ps) {
    const mf = MOLT_F[k];
    if (ps.f < mf) return null;
    const land = CAP_LAND[k];
    const j = Math.floor((ps.f - mf) / 2);
    const size = CAP_SIZE[k];
    if (j >= 4) return { x: land[0], y: land[1], rot: 0.5 + k * 1.3, size, landed: true, since: ps.f - (mf + 8) };
    // every capsule leaves from the stem side of the new head, clear of the new body (axis + half width + 14)
    const sx = stageX(k + 1, 0) + 0.5 * INST[k + 1].w + 14, sy = HEAD_Y[k] - size;
    const onStem = k === 1 || k === 3;
    const cx = onStem ? sx + 60 : (sx + land[0]) / 2;
    const cy = onStem ? Math.min(sy, land[1]) - 70 : Math.min(sy, land[1]) - 60 - 0.3 * Math.abs(land[0] - sx);
    const p = j / 4;
    const x = (1 - p) * (1 - p) * sx + 2 * (1 - p) * p * cx + p * p * land[0];
    const y = (1 - p) * (1 - p) * sy + 2 * (1 - p) * p * cy + p * p * land[1];
    return { x, y, rot: j * 1.9 + k, size, landed: false, since: -1, j };
  }

  function drawCapsule(ctx, cp, k) {
    const s = cp.size, pen = RS.pen;
    const rx = s * 0.52, ry = s * 0.46;
    const c = Math.cos(cp.rot), sn = Math.sin(cp.rot);
    const lp = (u, v) => [cp.x + c * u * rx - sn * v * ry, cp.y + sn * u * rx + c * v * ry];
    ctx.save();
    ctx.lineCap = 'round';
    if (cp.landed) {
      ctx.fillStyle = rgba(C.ink, 0.25);
      ctx.beginPath();
      ctx.ellipse(cp.x + s * 0.18, cp.y + s * 0.26, rx * 1.05, ry * 0.75, 0.2, 0, TAU);
      ctx.fill();
      if (cp.since >= 0 && cp.since < 2) {
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 1.2 * pen;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = Math.PI * (0.15 + i * 0.23);
          ctx.moveTo(cp.x + Math.cos(a) * (s * 0.7 + 3), cp.y + Math.sin(a) * (s * 0.5 + 2));
          ctx.lineTo(cp.x + Math.cos(a) * (s * 0.7 + 9), cp.y + Math.sin(a) * (s * 0.5 + 6));
        }
        ctx.stroke();
      }
    } else if (cp.j === 0) {
      // pop accent: short ink strokes flung out round the capsule as it leaves the head
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 1.4 * pen;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI / 2 + (i - 2.5) * 0.55;
        const r0 = s * 0.75 + 4, r1 = r0 + 6 + s * 0.35;
        ctx.moveTo(cp.x + Math.cos(a) * r0, cp.y + Math.sin(a) * r0);
        ctx.lineTo(cp.x + Math.cos(a) * r1, cp.y + Math.sin(a) * r1);
      }
      ctx.stroke();
    }
    ctx.restore();
    const pts = L.ellipsePts(cp.x, cp.y, rx, ry, 22, cp.rot);
    if (!cp.landed) {
      // a pale rim keeps a flying capsule apart from any dark band it crosses
      ctx.save();
      ctx.strokeStyle = C.spotWhite;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 3 * pen + Math.max(0.8, s * 0.07) * pen;
      ctx.beginPath();
      L.tracePath(ctx, pts, true);
      ctx.stroke();
      ctx.restore();
    }
    L.inkPath(ctx, pts, { closed: true, fill: C.veinBlack, width: Math.max(0.8, s * 0.07) * pen, seed: SD('cap', k), wobble: Math.min(0.6, s * 0.03) * pen, tremble: 0.1 * pen, taper: [2, 4] });
    ctx.save();
    // the open back of the cup, brown inside with a pale lip
    const o = lp(-0.42, 0.05);
    ctx.fillStyle = C.bark;
    ctx.beginPath();
    ctx.ellipse(o[0], o[1], rx * 0.36, ry * 0.66, cp.rot, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = C.tan;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = Math.max(0.5, s * 0.06);
    ctx.stroke();
    if (k >= 1) {
      // the old face: a yellow triangle and one cheek band
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.bandYellow;
      const t0 = lp(0.2, -0.62), t1 = lp(0.86, -0.12), t2 = lp(0.62, 0.52);
      ctx.beginPath();
      ctx.moveTo(t0[0], t0[1]);
      ctx.lineTo(t1[0], t1[1]);
      ctx.lineTo(t2[0], t2[1]);
      ctx.closePath();
      ctx.fill();
      const bp = new Path2D();
      ribbon(bp, [lp(0.14, -0.72), lp(-0.32, -0.62), lp(-0.1, 0.2), lp(0.2, 0.78)], (u) => s * lerp(0.13, 0.07, u));
      ctx.fill(bp);
    }
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = C.white;
    const h = lp(0.3, -0.52);
    ctx.beginPath();
    ctx.ellipse(h[0], h[1], Math.max(0.8, s * 0.12), Math.max(0.5, s * 0.06), cp.rot - 0.5, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------- leaves and stem

  function drawLatexBead(ctx, x, y, r, sd) {
    const pen = RS.pen;
    ctx.save();
    ctx.fillStyle = rgba(C.ink, 0.2);
    ctx.beginPath();
    ctx.arc(x + r * 0.35, y + r * 0.45, r, 0, TAU);
    ctx.fill();
    ctx.restore();
    L.inkPath(ctx, L.ellipsePts(x, y, r, r * 0.95, 14), { closed: true, fill: C.white, width: 1.1 * pen, color: C.inkSoft, seed: sd, wobble: 0.2 * pen, tremble: 0.06, taper: [2, 3] });
    ctx.save();
    ctx.fillStyle = C.paperShade;
    ctx.beginPath();
    ctx.arc(x + r * 0.3, y + r * 0.3, r * 0.45, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.28, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function leafHatch(ctx, lf, bounds) {
    const pen = RS.pen;
    const bi = L.boil(L.T);
    const hw = (u) => Math.max(6, leafHW(u));
    const main = new Path2D(), cross = new Path2D(), shade = new Path2D();
    const vis = (pts) => {
      if (!RS.view) return true;
      const V = RS.view;
      for (const p of pts) if (p[0] > V.x - 20 && p[0] < V.x + V.w + 20 && p[1] > V.y - 20 && p[1] < V.y + V.h + 20) return true;
      return false;
    };
    const joint = (u, v) => sst(66, 42, Math.hypot(u - PET, v));
    const margin = (u, v) => (v < 0 && u > 80 && u < 440 ? sst(26, 10, hw(u) + v) : 0);
    // strips between neighbouring side veins
    const family = (step, sg, dens, salt, width, into = main) => {
      const r = L.rng(lf.seed + 4100 + salt);
      let sid = 0;
      for (let c = -0.34 + r() * step; c < 9.5; c += step * (0.88 + 0.24 * r())) {
        sid++;
        const pts = [];
        for (let j = 0; j <= 9; j++) {
          const t = lerp(0.03, 1.02, j / 9);
          const u = Math.min(LEAF_LEN - 4, famU0(c) + famSweep(c) * Math.pow(t, 1.6) + 4 * sg);
          pts.push(lf.W(u, sg * hw(u) * 1.03 * Math.pow(t, 0.85)));
        }
        if (!vis(pts)) continue;
        dashCurve(into, pts, { r, bi, sid: sid * 31 + salt, pen, len: [16, 42], gap: [2, 6], width: width * pen, th: ((sid * PHI + salt * 0.37) % 1) * 0.9 + 0.05, dens: (x, y) => { const [u, v] = lf.UV(x, y); return dens(u, v); } });
      }
    };
    const s8 = (8 * pen) / 38, s12 = (12 * pen) / 38, s5 = (5 * pen) / 38;
    family(s8, -1, (u, v) => (v > 1 ? 0 : 0.35 + 0.65 * sst(0.0, 0.2, -v / hw(u))), 1, 1.35);
    family(s12, 1, (u, v) => (v < -1 ? 0 : clamp(0.06 + 0.5 * sst(0.55, 0.95, v / hw(u)) + joint(u, v))), 2, 1.15);
    family(s5, -1, (u, v) => clamp(joint(u, v) + margin(u, v)), 3, 1.25);
    family(s5, 1, (u, v) => joint(u, v), 4, 1.2);
    // ink shadow: vein-parallel strokes build a dark band over the outer third of the lower half
    family(s5, -1, (u, v) => sst(0.45, 0.9, -v / hw(u)) * sst(70, 150, u) * (1 - sst(400, 450, u)), 5, 1.3, shade);
    // cross layer at 7 px: along the rolled margin, and along the midrib at the stem joint
    {
      const r = L.rng(lf.seed + 4200);
      let sid = 0;
      for (let dd = 3.5 * pen; dd < 24; dd += 7 * pen) {
        sid++;
        const pts = [];
        for (let u = 84; u <= 440; u += 6) pts.push(lf.W(u, -(hw(u) - dd)));
        if (!vis(pts)) continue;
        dashCurve(cross, pts, { r, bi, sid: sid * 17 + 5, pen, len: [18, 40], gap: [3, 8], width: 1.2 * pen, th: ((sid * PHI) % 1) * 0.5 + 0.1, dens: (x, y) => { const [u, v] = lf.UV(x, y); return 0.4 + margin(u, v); } });
      }
      for (let dd = -63 + 3.5 * pen; dd < 63; dd += 7 * pen) {
        sid++;
        const pts = [];
        for (let u = PET - 10; u <= PET + 70; u += 5) pts.push(lf.W(u, dd));
        if (!vis(pts)) continue;
        dashCurve(cross, pts, { r, bi, sid: sid * 13 + 9, pen, len: [12, 26], gap: [2, 6], width: 1.15 * pen, th: ((sid * PHI) % 1) * 0.6 + 0.2, dens: (x, y) => { const [u, v] = lf.UV(x, y); return joint(u, v); } });
      }
    }
    ctx.save();
    ctx.fillStyle = C.milkweedDeep;
    ctx.globalAlpha = 0.8;
    ctx.fill(main);
    ctx.fill(cross);
    ctx.fillStyle = C.ink;
    ctx.globalAlpha = 0.4;
    ctx.fill(shade);
    ctx.restore();
    // ink cross layer at 105 degrees, 7 px apart, in the 40 px inside the lower margin (u 150 to 380)
    {
      const band = [];
      for (let u = 150; u <= 380; u += 10) band.push(lf.W(u, -(hw(u) + 3)));
      for (let u = 380; u >= 150; u -= 10) band.push(lf.W(u, -(hw(u) - 40)));
      const bp = clipPolys([band]);
      if (bp.length) {
        L.hatch(ctx, bp, {
          angle: -Math.PI / 4 - Math.PI / 3, spacing: 7 * pen, width: 1.2 * pen, color: C.ink, alpha: 0.3, length: [10 * pen, 26 * pen], seed: lf.seed + 4300, clip: true,
          density: (x, y) => {
            const [u, v] = lf.UV(x, y);
            return sst(150, 185, u) * (1 - sst(345, 380, u)) * sst(40, 22, hw(u) + v);
          },
        });
      }
    }
    // downy stipple on the lower half (0.004 dots per px2), a trace on the upper half
    L.stipple(ctx, null, {
      bounds, spacing: 7.5 * pen, r: [0.8 * pen, 1.4 * pen], color: C.milkweedDeep, alpha: 0.85, seed: lf.seed + 40,
      density: (x, y) => {
        const v = lf.UV(x, y)[1];
        return v < 0 ? 0.2 : 0.05;
      },
    });
  }

  function drawLeaf(ctx, lf, f) {
    if (!inView(lf.bb, 20)) return;
    const pen = RS.pen;
    const holes = lf.holes.map((h) => h.pts);
    const newHoles = [];
    for (const d of lf.dyn) {
      if (f < d.fe) continue;
      const s = E.outBack(clamp((f - d.fe + 1) / 3));
      const pts = scalePts(d.pts, d.cx, d.cy, Math.max(0.05, s));
      holes.push(pts);
      newHoles.push({ d, pts });
    }
    const polys = [lf.outline].concat(holes);
    const path = new Path2D();
    for (const p of polys) polyPath(path, p);
    let bounds = lf.bb;
    if (RS.view) {
      const V = RS.view;
      const x0 = Math.max(bounds.x, V.x), y0 = Math.max(bounds.y, V.y);
      const x1 = Math.min(bounds.x + bounds.w, V.x + V.w), y1 = Math.min(bounds.y + bounds.h, V.y + V.h);
      bounds = { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
    }

    ctx.save();
    ctx.fillStyle = C.milkweed;
    ctx.fill(path, 'evenodd');
    ctx.clip(path, 'evenodd');
    // the blade folds a little along the midrib: the upper half tilts to the light and reads paler
    ctx.fillStyle = C.milkweedPale;
    ctx.globalAlpha = 0.3;
    ctx.fill(lf.upperHalf);
    ctx.globalAlpha = 1;
    leafHatch(ctx, lf, bounds);

    // veins
    for (const n of lf.net) {
      L.inkPath(ctx, n, { width: 1.0 * pen, color: C.milkweedPale, alpha: 0.55, seed: (lf.seed + n[0][0]) | 0, taper: [3, 3], wobble: 0.6 * pen, tremble: 0.2 * pen });
    }
    lf.veins.forEach((v, i) => {
      L.inkPath(ctx, v.pts, { width: 2.4 * pen, color: C.milkweedPale, alpha: 0.95, seed: lf.seed + 100 + i, taper: [4, 30], wobble: 0.8 * pen, tremble: 0.4 * pen });
      const sh = v.pts.map((p) => [p[0] + 1.6 * pen, p[1] + 1.8 * pen]);
      L.inkPath(ctx, sh, { width: 1.1 * pen, color: C.inkSoft, alpha: 0.45, seed: lf.seed + 200 + i, taper: [4, 26], wobble: 0.8 * pen, tremble: 0.4 * pen });
    });
    L.inkPath(ctx, lf.midrib, { width: 6 * pen, color: C.milkweedPale, seed: lf.seed + 300, taper: [2, 90], wobble: 0.8 * pen, tremble: 0.4 * pen });
    const mr = lf.midrib.map((p) => [p[0] + lf.nx * -4.2 * pen, p[1] + lf.ny * -4.2 * pen]);
    L.inkPath(ctx, mr, { width: 1.5 * pen, color: C.inkSoft, alpha: 0.85, seed: lf.seed + 301, taper: [2, 80], wobble: 0.8 * pen, tremble: 0.4 * pen });
    // the lower margin rolls under a little, showing a sliver of the paler downy underside
    const curl = [], curlIn = [];
    for (let u = 110; u <= 400; u += 10) {
      const h = leafHW(u) * (1 + 0.03 * L.noise1(u * 0.03, lf.seed + 2));
      const k = Math.sin((Math.PI * (u - 110)) / 290);
      curl.push(lf.W(u, -(h - 3.5 * k)));
      curlIn.push(lf.W(u, -(h - 7.5 * k)));
    }
    L.inkPath(ctx, curl, { width: 6 * pen, color: C.milkweedPale, alpha: 0.8, seed: lf.seed + 310, taper: [30, 30], wobble: 0.6 * pen, tremble: 0.3 * pen });
    L.inkPath(ctx, curlIn, { width: 1.2 * pen, color: C.inkSoft, alpha: 0.6, seed: lf.seed + 311, taper: [30, 30], wobble: 0.6 * pen, tremble: 0.3 * pen });

    // circular trench: a chewed furrow that cut the latex supply
    if (lf.trench) {
      const T = lf.trench;
      const ring = [];
      const n = 64;
      for (let i = 0; i <= n; i++) {
        const a = T.a0 + (i / n) * (T.a1 - T.a0);
        const r = T.r + 1.6 * L.noise1(i * 0.8, lf.seed + 60);
        ring.push([T.cx + Math.cos(a) * r, T.cy + Math.sin(a) * r]);
      }
      const full = T.a1 - T.a0 >= TAU - 1e-6;
      L.inkPath(ctx, ring, { closed: false, width: 8, color: C.milkweedDeep, alpha: 0.9, seed: lf.seed + 61, taper: full ? [2, 2] : [10, 10], wobble: 1 * pen });
      L.inkPath(ctx, ring, { closed: false, width: 3, color: C.tan, alpha: 0.7, seed: lf.seed + 62, taper: full ? [2, 2] : [10, 10], wobble: 1 * pen });
      const outer = ring.map((p) => [T.cx + (p[0] - T.cx) * 1.1, T.cy + (p[1] - T.cy) * 1.1]);
      const inner = ring.map((p) => [T.cx + (p[0] - T.cx) * 0.9, T.cy + (p[1] - T.cy) * 0.9]);
      L.inkPath(ctx, outer, { width: 1.4 * pen, color: C.inkSoft, alpha: 0.9, seed: lf.seed + 63, taper: [6, 6], wobble: 2 * pen });
      L.inkPath(ctx, inner, { width: 1.2 * pen, color: C.inkSoft, alpha: 0.75, seed: lf.seed + 64, taper: [6, 6], wobble: 2 * pen });
    }
    ctx.restore();

    // frass pellets
    ctx.save();
    for (const [x, y, s, rot] of lf.frass) {
      ctx.fillStyle = rgba(C.ink, 0.25);
      ctx.beginPath();
      ctx.ellipse(x + 1.2, y + 1.6, s, s * 0.72, rot, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#4A4A2E';
      ctx.beginPath();
      ctx.ellipse(x, y, s, s * 0.72, rot, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 0.8 * pen;
      ctx.stroke();
      ctx.fillStyle = rgba(C.white, 0.55);
      ctx.beginPath();
      ctx.arc(x - s * 0.35, y - s * 0.3, s * 0.22, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // margin hairs
    ctx.save();
    ctx.strokeStyle = C.white;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 0.9 * pen;
    ctx.lineCap = 'round';
    const bi = L.boil(L.T);
    ctx.beginPath();
    for (const [x, y, ox, oy, l] of lf.hairs) {
      const j = (L.h3(bi, (x * 7) | 0, (y * 3) | 0) - 0.5) * 1.2;
      ctx.moveTo(x, y);
      ctx.lineTo(x + ox * l + j, y + oy * l - j);
    }
    ctx.stroke();
    ctx.restore();

    // outline: ink margin, brown chewed edges on the notches
    if (!lf.runs) {
      L.inkPath(ctx, lf.outline, { closed: true, width: 3 * pen, seed: lf.seed + 500, taper: [10, 22], wobble: 2 * pen, tremble: 0.4 * pen, double: { offset: -4.5 * pen, width: 0.45, alpha: 0.4 } });
    } else {
      lf.runs.forEach((run, i) => {
        if (!run.cut) {
          L.inkPath(ctx, run.pts, { width: 3 * pen, seed: lf.seed + 500 + i, taper: [5, 5], swell: 0, wobble: 2 * pen, tremble: 0.4 * pen, double: run.pts.length > 40 ? { offset: -4.5 * pen, width: 0.45, alpha: 0.4 } : false });
        } else {
          const bt = lf.bites.reduce((best, b) => {
            const p = run.pts[Math.floor(run.pts.length / 2)];
            const d = Math.abs(Math.hypot(p[0] - b.cx, p[1] - b.cy) - b.r);
            return d < best.d ? { d, b } : best;
          }, { d: Infinity, b: null }).b;
          const tan = run.pts.map((p) => {
            const dx = p[0] - bt.cx, dy = p[1] - bt.cy, dl = Math.hypot(dx, dy) || 1;
            return [p[0] + (dx / dl) * 3 * pen, p[1] + (dy / dl) * 3 * pen];
          });
          L.inkPath(ctx, tan, { width: 3.2 * pen, color: C.tan, alpha: 0.75, seed: lf.seed + 550 + i, taper: [4, 4], wobble: 0.8 * pen, tremble: 0.3 * pen });
          L.inkPath(ctx, run.pts, { width: 2.1 * pen, color: C.inkSoft, seed: lf.seed + 560 + i, taper: [3, 3], swell: 0, wobble: 0.8 * pen, tremble: 0.3 * pen });
        }
      });
    }
    holes.forEach((h, i) => {
      const in2 = [];
      const bb = L.bounds(h);
      const hx = bb.x + bb.w / 2, hy = bb.y + bb.h / 2;
      for (const p of h) in2.push([hx + (p[0] - hx) * 1.12, hy + (p[1] - hy) * 1.12]);
      L.inkPath(ctx, in2, { closed: true, width: 3.2 * pen, color: C.tan, alpha: 0.75, seed: lf.seed + 600 + i, wobble: 0.8 * pen, tremble: 0.3 * pen });
      L.inkPath(ctx, h, { closed: true, width: 2.1 * pen, color: C.inkSoft, seed: lf.seed + 700 + i, wobble: 0.8 * pen, tremble: 0.3 * pen, taper: [6, 10] });
    });

    // latex beads: the trench rim swells on the opening beats
    for (const b of lf.beads) {
      let r = b.r;
      if (b.f > -50) {
        if (f < b.f) continue;
        r = b.r * E.outBack(clamp((f - b.f + 1) / 4));
      }
      if (r < 0.3) continue;
      drawLatexBead(ctx, b.x, b.y, r, lf.seed + 800 + ((b.x * 10) | 0));
    }
    // and white beads bleed where every hole and notch cut a vein
    for (const cb of lf.cutBeads) {
      let s = 1;
      if (cb.dyn) {
        if (f < cb.dyn.fe + 2) continue;
        s = E.outBack(clamp((f - cb.dyn.fe - 1) / 4));
      }
      for (const b of cb.list) drawLatexBead(ctx, b.x, b.y, b.r * s, lf.seed + 900 + ((b.x * 7 + b.y) | 0));
    }

    // crumbs flying from a fresh bite
    for (const { d } of newHoles) {
      const jj = Math.floor((f - d.fe) / 2);
      if (jj > 2) continue;
      const r = L.rng(lf.seed + d.fe);
      ctx.save();
      for (let i = 0; i < 6; i++) {
        const a = r() * TAU, sp = r.range(14, 26);
        const x = d.cx + Math.cos(a) * (18 + sp * jj), y = d.cy + Math.sin(a) * (18 + sp * jj) + 3 * jj * jj;
        const s = r.range(2, 3.6);
        ctx.fillStyle = i % 2 ? C.milkweedDeep : C.leaf;
        ctx.beginPath();
        ctx.moveTo(x - s, y - s * 0.4);
        ctx.lineTo(x + s * 0.6, y - s);
        ctx.lineTo(x + s, y + s * 0.5);
        ctx.lineTo(x - s * 0.3, y + s);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function drawStem(ctx) {
    const pen = RS.pen;
    const V = RS.view;
    const yA = V ? V.y - 30 : -100, yB = V ? V.y + V.h + 30 : 2020;
    const poly = STEM.poly;
    const path = new Path2D();
    polyPath(path, poly);
    ctx.save();
    ctx.fillStyle = C.milkweedStem;
    ctx.fill(path);
    ctx.clip(path);
    // 5 px darker band inside the shadow edge
    const band = new Path2D();
    polyPath(band, STEM.band);
    ctx.fillStyle = L.mix(C.milkweedStem, C.ink, 0.3);
    ctx.fill(band);
    // downy stipple on the lit side
    L.stipple(ctx, null, { bounds: { x: STEM_L - 6, y: yA, w: 30, h: yB - yA }, spacing: 6 * pen, r: [0.5 * pen, 1.0 * pen], color: C.milkweedPale, alpha: 0.5, density: (x) => sst(540, 522, x) * 0.6, seed: SD('stemdown') });
    // curved contour hatching across the shadow side (right 45 percent)
    const bi = L.boil(L.T);
    const hp = new Path2D();
    let sid = 0;
    for (const c of STEM.contour) {
      sid++;
      if (c.y < yA || c.y > yB) continue;
      const j0 = (L.h3(sid, 3, bi) - 0.5) * 1.6, j1 = (L.h3(sid, 5, bi) - 0.5) * 0.8;
      const pts = [];
      for (let m = 0; m <= 5; m++) {
        const x = lerp(c.xs + j0, c.xe + j1, m / 5);
        const k = Math.cos((Math.PI / 2) * clamp((x - STEM_X) / (STEM_HW + 4)));
        pts.push([x, c.y + c.bow * k + j1 * 0.4]);
      }
      ribbon(hp, pts, (u) => 1.4 * pen * c.w * lerp(0.3, 1.1, Math.sqrt(u)));
    }
    if (pen < 1) {
      // the loupe sees the stem 2.5x larger: add a row between each pair
      for (let i = 0; i + 1 < STEM.contour.length; i++) {
        const a = STEM.contour[i], b = STEM.contour[i + 1];
        const y = (a.y + b.y) / 2;
        if (y < yA || y > yB) continue;
        const pts = [];
        for (let m = 0; m <= 5; m++) {
          const x = lerp((a.xs + b.xs) / 2 + 3, (a.xe + b.xe) / 2, m / 5);
          const k = Math.cos((Math.PI / 2) * clamp((x - STEM_X) / (STEM_HW + 4)));
          pts.push([x, y + ((a.bow + b.bow) / 2) * k]);
        }
        ribbon(hp, pts, (u) => 1.2 * pen * lerp(0.3, 1.1, Math.sqrt(u)));
      }
    }
    ctx.fillStyle = C.ink;
    ctx.globalAlpha = 0.75;
    ctx.fill(hp);
    ctx.globalAlpha = 1;
    // node rings at the leaf pairs
    for (const py of PAIR_Y) {
      if (py < yA - 30 || py > yB + 30) continue;
      const ringPts = (dy, spread) => {
        const pts = [];
        for (let m = 0; m <= 8; m++) {
          const x = lerp(STEM_L - 7, STEM_R + 7, m / 8);
          const k = Math.cos((Math.PI / 2) * clamp(Math.abs(x - STEM_X) / (STEM_HW + 7)));
          pts.push([x, py + dy + spread * k]);
        }
        return pts;
      };
      L.inkPath(ctx, ringPts(-20, 6), { width: 1.8 * pen, color: C.inkSoft, alpha: 0.9, seed: SD('node', py), taper: [4, 4], wobble: 0.6 * pen });
      L.inkPath(ctx, ringPts(14, 7), { width: 2.2 * pen, color: C.inkSoft, alpha: 0.95, seed: SD('node2', py), taper: [4, 4], wobble: 0.6 * pen });
      L.inkPath(ctx, ringPts(20, 7), { width: 1.1 * pen, color: C.inkSoft, alpha: 0.55, seed: SD('node3', py), taper: [4, 4], wobble: 0.6 * pen });
    }
    ctx.restore();
    // the lit edge
    L.inkPath(ctx, [[526, yA], [525, lerp(yA, yB, 0.35)], [527, lerp(yA, yB, 0.7)], [526, yB]], { width: 2.4 * pen, color: C.milkweedPale, alpha: 0.65, seed: SD('stemlit'), wobble: 1.2 * pen });
    // hair fringe
    ctx.save();
    ctx.strokeStyle = C.inkSoft;
    ctx.lineWidth = 0.9 * pen;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const [x, y, sg, l, a] of STEM.hairs) {
      if (y < yA || y > yB) continue;
      const j = (L.h3(bi, (y * 5) | 0, 3) - 0.5) * 1.0;
      ctx.moveTo(x, y);
      ctx.lineTo(x + sg * l * a + j, y - l * (1 - a * 0.6));
    }
    ctx.globalAlpha = 0.6;
    ctx.stroke();
    ctx.restore();
    const sub = (pts) => pts.filter((p) => p[1] >= yA - 20 && p[1] <= yB + 20);
    L.inkPath(ctx, sub(STEM.left), { width: 3 * pen, seed: SD('stemedgeL'), taper: [0, 0], wobble: 2 * pen, tremble: 0.4 * pen });
    L.inkPath(ctx, sub(STEM.right), { width: 3.2 * pen, seed: SD('stemedgeR'), taper: [0, 0], wobble: 2 * pen, tremble: 0.4 * pen, double: V ? false : { offset: 4.5, width: 0.35, alpha: 0.4, from: 0.1, to: 0.9 } });
  }

  function drawBackPlants(ctx) {
    for (const st of BACK.stems) {
      const p = new Path2D();
      polyPath(p, st.poly);
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = C.milkweedPale;
      ctx.fill(p);
      ctx.restore();
      L.hatch(ctx, st.poly, { angle: -0.08, spacing: 12, width: 1.3, color: C.milkweedDeep, alpha: 0.55, density: (x, y) => sst(st.cx(y) - 4, st.cx(y) + 10, x), length: [8, 20], seed: st.sd + 3, bend: 1 });
      // ink on the shadow edge only: the lit edge melts into the stripes
      L.inkPath(ctx, st.right, { width: 1.8, color: C.inkSoft, alpha: 0.8, seed: st.sd + 2, taper: [0, 0], wobble: 2.5 });
    }
    for (const lf of BACK.leaves) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = C.milkweedPale;
      const p = new Path2D();
      polyPath(p, lf.outline);
      ctx.fill(p);
      ctx.restore();
      L.hatch(ctx, lf.outline, {
        angle: Math.atan2(lf.ay * 0.5 - lf.ny * 0.86, lf.ax * 0.5 - lf.nx * 0.86), spacing: 12, width: 1.3, color: C.milkweedDeep, alpha: 0.5, length: [14, 36], seed: lf.seed + 11,
        density: (x, y) => {
          const [u, v] = lf.UV(x, y);
          return v < 0 ? 0.85 : 0.25 * sst(0.4, 0.95, v / Math.max(8, leafHW(u)));
        },
      });
      L.inkPath(ctx, lf.midrib, { width: 1.6, color: C.inkSoft, alpha: 0.45, seed: lf.seed + 12, taper: [4, 60], wobble: 1.2 });
      for (let i = 0; i < lf.veins.length; i += 2) {
        L.inkPath(ctx, lf.veins[i].pts, { width: 1.0, color: C.inkSoft, alpha: 0.3, seed: lf.seed + 20 + i, taper: [4, 20], wobble: 0.8 });
        L.inkPath(ctx, lf.veins[i + 1].pts, { width: 1.0, color: C.inkSoft, alpha: 0.3, seed: lf.seed + 40 + i, taper: [4, 20], wobble: 0.8 });
      }
      L.inkPath(ctx, lf.outline, { closed: true, width: 1.8, color: C.inkSoft, alpha: 0.85, seed: lf.seed + 13, taper: [10, 20], wobble: 1.6 });
    }
  }

  function drawConstruction(ctx) {
    ctx.save();
    // two big construction arcs crossing the frame
    const arc = (cx, cy, r, a0, a1, sd) => {
      const pts = [];
      const n = Math.ceil((Math.abs(a1 - a0) * r) / 30);
      for (let i = 0; i <= n; i++) {
        const a = lerp(a0, a1, i / n);
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
      L.inkPath(ctx, pts, { width: 1.5, color: C.inkFaint, alpha: 0.3, seed: sd, taper: [60, 60], wobble: 3, tremble: 0.3 });
    };
    arc(1400, 1000, 1100, (100 * Math.PI) / 180, (262 * Math.PI) / 180, SD('carc', 0));
    arc(-300, 700, 900, (-78 * Math.PI) / 180, (76 * Math.PI) / 180, SD('carc', 1));
    // leaf axis lines and the centre cross each leaf was blocked in from
    for (const lf of LEAVES) {
      L.inkLine(ctx, STEM_X, lf.by, STEM_X + lf.side * 700 * LC, lf.by - 700 * LS, { width: 1.5, color: C.inkFaint, alpha: 0.3, seed: lf.seed + 899, taper: [20, 60] });
      const c = lf.W(250, 0);
      L.inkLine(ctx, c[0] - lf.nx * 150, c[1] - lf.ny * 150, c[0] + lf.nx * 150, c[1] + lf.ny * 150, { width: 1.1, color: C.inkFaint, alpha: 0.28, seed: lf.seed + 901, taper: [20, 20] });
      L.inkLine(ctx, c[0] - lf.ax * 22, c[1] - lf.ay * 22, c[0] + lf.ax * 22, c[1] + lf.ay * 22, { width: 1.1, color: C.inkFaint, alpha: 0.35, seed: lf.seed + 902, taper: [4, 4] });
    }
    for (const y of HEAD_Y) {
      L.inkLine(ctx, 380, y, 905, y, { width: 1.2, color: C.inkFaint, alpha: 0.26, seed: SD('hk', y), taper: [30, 30] });
    }
    L.guideCircle(ctx, 320, 1580, 78, { color: C.inkFaint, alpha: 0.35, width: 1.2, dash: [3, 6] });
    L.guideCircle(ctx, 760, 1590, 78, { color: C.inkFaint, alpha: 0.35, width: 1.2, dash: [3, 6] });
    for (let i = 0; i < HEAD_Y.length; i++) {
      const y = HEAD_Y[i];
      L.inkLine(ctx, STEM_L - 70, y, STEM_L - 30, y, { width: 1.6, color: C.inkFaint, alpha: 0.55, seed: SD('hkt', i), taper: [4, 4] });
    }
    for (let k = 0; k < 4; k++) {
      L.guideCircle(ctx, CAP_LAND[k][0], CAP_LAND[k][1], 40, { color: C.inkFaint, alpha: 0.3, width: 1.1, dash: [2, 5], cross: 8 });
    }
    ctx.restore();
  }

  function drawCastShadows(ctx) {
    const shadowPolys = [];
    for (const lf of LEAVES) {
      shadowPolys.push(lf.outline.map((p) => [p[0] + 16, p[1] + 22]));
      for (const h of lf.holes) shadowPolys.push(h.pts.map((p) => [p[0] + 16, p[1] + 22]));
    }
    const sp = clipPolys(shadowPolys);
    const pen = RS.pen;
    if (sp.length) {
      L.hatch(ctx, sp, { spacing: 4.5 * pen, width: 1.2 * pen, color: C.ink, alpha: 0.32, seed: SD('castL'), length: [18 * pen, 50 * pen], clip: true });
      // a 105 degree cross layer darkens the 14 px of shadow right beside each leaf's lower edge
      const bands = [];
      for (const lf of LEAVES) {
        const b = [];
        for (let u = 30; u <= LEAF_LEN - 10; u += 12) b.push(lf.W(u, -leafHW(u) + 2));
        for (let u = LEAF_LEN - 10; u >= 30; u -= 12) b.push(lf.W(u, -leafHW(u) - 14));
        bands.push(b);
      }
      const bp = clipPolys(bands);
      if (bp.length) {
        ctx.save();
        ctx.beginPath();
        for (const b of bp) L.tracePath(ctx, b, true);
        ctx.clip();
        L.hatch(ctx, sp, { angle: -Math.PI / 4 - Math.PI / 3, spacing: 7 * pen, width: 1.2 * pen, color: C.ink, alpha: 0.32, seed: SD('castX'), length: [8 * pen, 20 * pen], clip: true });
        ctx.restore();
      }
    }
    const V = RS.view;
    const yA = V ? V.y - 20 : -80, yB = V ? V.y + V.h + 20 : 2000;
    L.hatch(ctx, [[[STEM_R - 2, yA], [STEM_R + 16, yA], [STEM_R + 16, yB], [STEM_R - 2, yB]]], { angle: -0.06, spacing: 5 * pen, width: 1.2 * pen, color: C.inkFaint, alpha: 0.5, seed: SD('castS'), length: [8 * pen, 18 * pen], clip: true });
  }

  // the loupe's own ground under the magnified plant: paper fibre and the head-height construction
  // marks, so a reference tick scrolls past the held larva
  function drawLoupeGround(ctx) {
    const V = RS.view, pen = RS.pen;
    L.stipple(ctx, null, { bounds: V, spacing: 12, r: [0.6, 1.1], density: 0.5, color: C.inkFaint, alpha: 0.35, seed: SD('lpfibre') });
    for (let i = 0; i < HEAD_Y.length; i++) {
      const y = HEAD_Y[i];
      if (y < V.y - 10 || y > V.y + V.h + 10) continue;
      L.inkLine(ctx, 380, y, 905, y, { width: 1.2 * pen, color: C.inkFaint, alpha: 0.4, seed: SD('hk', y), taper: [30, 30] });
      L.inkLine(ctx, STEM_L - 70, y, STEM_L - 30, y, { width: 1.6 * pen, color: C.inkSoft, alpha: 0.75, seed: SD('hkt', i), taper: [4, 4] });
    }
  }

  // everything on the plant that the loupe also sees
  function drawPlant(ctx, f, ps, M, trail) {
    for (const lf of LEAVES) drawLeaf(ctx, lf, f);
    drawStem(ctx);

    if (trail) {
      const trailEnd = ps.stage === 0 ? ps.sHead - ps.len : WALK.s1500 + (1500 - (2000 - ps.sHead)) - ps.len;
      if (trailEnd > WALK.sStart + 4) {
        ctx.save();
        ctx.strokeStyle = C.annBlue;
        ctx.lineWidth = trail.w;
        ctx.setLineDash(trail.dash);
        ctx.lineCap = 'round';
        ctx.beginPath();
        let started = false;
        for (let s = WALK.sStart; s <= trailEnd; s += 4) {
          const p = WALK.at(s);
          if (!started) {
            ctx.moveTo(p[0], p[1]);
            started = true;
          } else ctx.lineTo(p[0], p[1]);
        }
        const pe = WALK.at(trailEnd);
        ctx.lineTo(pe[0], pe[1]);
        ctx.stroke();
        ctx.restore();
      }
    }

    const caps = [];
    for (let k = 0; k < 4; k++) {
      const cp = capsuleAt(k, ps);
      if (cp) caps.push([k, cp]);
    }
    for (const [k, cp] of caps) if (cp.landed) drawCapsule(ctx, cp, k);
    // the caterpillar's cast shadow falls down-right across the stem
    {
      const sh = M.outline.map((p) => [p[0] + 9, p[1] + 13]);
      ctx.save();
      const sp = new Path2D();
      polyPath(sp, STEM.poly);
      ctx.clip(sp);
      L.hatch(ctx, sh, { angle: -0.9, spacing: clamp(ps.w * 0.08, 2.6, 4.5) * RS.pen, width: 1.2 * RS.pen, color: C.ink, alpha: 0.6, seed: SD('catshadow'), length: [6, 16], clip: true });
      ctx.restore();
    }
    drawSleeve(ctx, ps);
    drawCaterpillar(ctx, ps, M);
    for (const [k, cp] of caps) if (!cp.landed) drawCapsule(ctx, cp, k);

    // chewing crumbs at the start, kept clear of the head so its highlight stays readable
    if (ps.chew >= 0) {
      const F = M.frame(0);
      const Fh = M.frame(M.hv * 0.5);
      const hcx = Fh.x - Fh.dx * ps.head * 0.04, hcy = Fh.y - Fh.dy * ps.head * 0.04;
      const r = L.rng(SD('chew', ps.f >> 1));
      ctx.save();
      ctx.fillStyle = C.milkweedDeep;
      let drawn = 0;
      for (let i = 0; i < 12 && drawn < 5; i++) {
        const a = r() * TAU, d = r.range(5, 14);
        const x = F.x + F.tx * 4 + Math.cos(a) * d, y = F.y + F.ty * 4 + Math.sin(a) * d;
        const rad = r.range(0.8, 1.5);
        if (Math.hypot(x - hcx, y - hcy) < ps.head * 0.7 + rad) continue;
        drawn++;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  function moltRing(ctx, sx, sy, fr, scale) {
    const pr = fr / 4;
    const r = (40 + 120 * E.outCubic(pr)) * scale;
    ctx.save();
    ctx.strokeStyle = C.annMagenta;
    ctx.globalAlpha = 1 - 0.85 * clamp((pr - 0.2) / 0.8);
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, TAU);
    ctx.stroke();
    if (fr === 0) {
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + Math.PI / 8;
        ctx.moveTo(sx + Math.cos(a) * (r + 7 * scale), sy + Math.sin(a) * (r + 7 * scale));
        ctx.lineTo(sx + Math.cos(a) * (r + 19 * scale), sy + Math.sin(a) * (r + 19 * scale));
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // external tangent points between two circles (for the loupe leader lines)
  function tangents(c1, r1, c2, r2) {
    const dx = c2[0] - c1[0], dy = c2[1] - c1[1];
    const d = Math.hypot(dx, dy);
    if (d <= Math.abs(r1 - r2) + 1) return [];
    const ux = dx / d, uy = dy / d;
    const a = Math.acos(clamp((r1 - r2) / d, -1, 1));
    const out = [];
    for (const s of [1, -1]) {
      const ca = Math.cos(s * a), sa = Math.sin(s * a);
      const nx = ux * ca - uy * sa, ny = ux * sa + uy * ca;
      out.push([[c1[0] + nx * r1, c1[1] + ny * r1], [c2[0] + nx * r2, c2[1] + ny * r2]]);
    }
    return out;
  }

  // ===========================================================================
  // Scene
  // ===========================================================================

  FILM.scene({
    id: ID,
    draw(ctx, t, info) {
      const tc = clamp(t, 0, DUR);
      const f = Math.min(LAST_F, Math.floor(tc * 24 + 1e-6));
      const z = 1 + 0.03 * E.inOutSine(tc / DUR);
      const camY = 900 + 60 / z;
      const toS = (x, y) => [540 + (x - 540) * z, 960 + (y - camY) * z];
      const ps = poseAtFrame(f);
      RS.pen = 1;
      RS.view = null;

      // ---------------------------------------------------------------- background (screen)
      L.stripes(ctx, { colors: [C.stripeCream, C.stripeSage], offset: 12 * tc, seed: SD('stripes') });

      const M = model(ps);
      L.camera(ctx, { x: 540, y: camY, zoom: z }, () => {
        drawBackPlants(ctx);
        drawConstruction(ctx);
        drawCastShadows(ctx);
        drawPlant(ctx, f, ps, M, { w: 2.5 / z, dash: [14 / z, 10 / z] });
      });

      // ---------------------------------------------------------------- loupe (screen, ink)
      const S = loupeScale(f);
      let loupe = null;
      if (S > 0.001) {
        const R0 = LP_R * S;
        const track = loupeTrack(f);
        const mag = LP_MAG * S;
        loupe = { R0, track, mag, map: (x, y) => [LP_X + (x - track[0]) * mag, LP_Y + (y - track[1]) * mag] };
        // hatched cast shadow of the loupe on the stripes
        {
          const sh = L.ellipsePts(LP_X + 14 * S, LP_Y + 20 * S, R0 + 2, R0 + 2, 72);
          const hole = L.ellipsePts(LP_X, LP_Y, R0 + 1, R0 + 1, 72);
          L.hatch(ctx, [sh, hole], { spacing: 5, width: 1.2, color: C.inkFaint, alpha: 0.5, seed: SD('lpshadow'), length: [10, 30], clip: true });
        }
        ctx.save();
        ctx.beginPath();
        ctx.arc(LP_X, LP_Y, R0, 0, TAU);
        ctx.clip();
        // one 2.5x band edge crosses the disc (not a zoom of the same sage field the larva sits in)
        L.stripes(ctx, {
          bounds: { x: LP_X - R0, y: LP_Y - R0, w: 2 * R0, h: 2 * R0 },
          colors: [C.stripeCream, C.stripeSage], width: 350, angle: -0.52, offset: 12 * tc * 2.5, seed: SD('lpstripes'),
        });
        ctx.translate(LP_X, LP_Y);
        ctx.scale(mag, mag);
        ctx.translate(-track[0], -track[1]);
        RS.pen = 0.5;
        RS.view = { x: track[0] - 78, y: track[1] - 78, w: 156, h: 156 };
        drawLoupeGround(ctx);
        drawCastShadows(ctx);
        drawPlant(ctx, f, ps, M, { w: 1.0, dash: [6, 4] });
        RS.pen = 1;
        RS.view = null;
        ctx.restore();
        // an ink millimetre scale on the loupe's left side: 5 mm at the fixed 2.5x (10.2 px per mm)
        {
          const mm = 10.2 * mag;
          const sx = LP_X - 146 * S, y0 = LP_Y + 2.5 * mm;
          const bar = [];
          for (let i = 0; i <= 5; i++) bar.push([sx, y0 - i * mm]);
          L.inkPath(ctx, bar, { width: 1.8, color: C.ink, seed: SD('lpbar'), taper: [3, 3], wobble: 0.4, tremble: 0.15, smooth: false });
          ctx.save();
          ctx.strokeStyle = C.ink;
          ctx.lineCap = 'round';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          for (let i = 0; i <= 5; i++) {
            const long = i === 0 || i === 5;
            ctx.moveTo(sx, y0 - i * mm);
            ctx.lineTo(sx + (long ? 12 : 7) * S, y0 - i * mm);
          }
          ctx.stroke();
          ctx.restore();
        }
        // inner shade: a hatched crescent inside the rim on the lower right
        {
          const outer = L.ellipsePts(LP_X, LP_Y, R0 - 10, R0 - 10, 72);
          const inner = L.ellipsePts(LP_X - 9 * S, LP_Y - 12 * S, R0 - 12, R0 - 12, 72);
          L.hatch(ctx, [outer, inner], { spacing: 4.5, width: 1.1, color: C.ink, alpha: 0.35, seed: SD('lpshade'), length: [8, 22], clip: true });
        }
        // rim: 5 px ink ring, a 1.5 px inner ring 9 px in, and reticle ticks between them
        L.inkPath(ctx, L.ellipsePts(LP_X, LP_Y, R0, R0, 96), { closed: true, width: 5, seed: SD('lprim'), wobble: 1.2, tremble: 0.3, taper: [14, 24], double: { offset: 4, width: 0.3, alpha: 0.4, from: 0.55, to: 0.9 } });
        L.inkPath(ctx, L.ellipsePts(LP_X, LP_Y, R0 - 9, R0 - 9, 96), { closed: true, width: 1.5, seed: SD('lprim2'), wobble: 0.8, tremble: 0.2, taper: [8, 14] });
        ctx.save();
        ctx.strokeStyle = C.ink;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        for (let i = 0; i < 48; i++) {
          const a = (i / 48) * TAU;
          const long = i % 4 === 0;
          const r0 = R0 - 9, r1 = R0 - (long ? 2.5 : 5.5);
          ctx.moveTo(LP_X + Math.cos(a) * r0, LP_Y + Math.sin(a) * r0);
          ctx.lineTo(LP_X + Math.cos(a) * r1, LP_Y + Math.sin(a) * r1);
        }
        ctx.stroke();
        ctx.restore();
        // the real larva: an ink ring, joined to the loupe by two leader lines
        // while the loupe closes, the ring keeps the size it had round instar 3 and shrinks with it
        const closing = f >= LP_OUT ? clamp(1 - (f - LP_OUT + 1) / 4) : 1;
        const pd = poseAtFrame(f >= LP_OUT ? LP_OUT - 1 : f - (f % 2));
        const mid = midOf(pd);
        const ms = toS(mid[0], mid[1]);
        const baseLen = f >= LP_OUT ? INST[2].len : pd.len;
        const rT = Math.max(30, baseLen * 0.55 + 8) * z * clamp(S, 0, 1) * closing;
        L.inkPath(ctx, L.ellipsePts(ms[0], ms[1], rT, rT, 48), { closed: true, width: 2.4, seed: SD('lpt'), wobble: 0.6, tremble: 0.2, taper: [6, 10] });
        for (const [a, b] of tangents([LP_X, LP_Y], R0, ms, rT)) {
          L.inkLine(ctx, a[0], a[1], b[0], b[1], { width: 1.8, color: C.inkSoft, seed: SD('lpl', a[0] | 0), taper: [4, 10], wobble: 0.5, tremble: 0.2 });
        }
      }

      // ---------------------------------------------------------------- overlays (screen space)
      // ruler
      const rp = E.outExpo((f + 1) / 6);
      const rTop = lerp(1540, 240, rp);
      ctx.save();
      ctx.strokeStyle = C.annBlue;
      ctx.lineCap = 'round';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(920, 1540);
      ctx.lineTo(920, rTop);
      for (let y = 1540, i = 0; y >= 240 - 1e-6; y -= 40, i++) {
        if (y < rTop - 1e-6) break;
        const long = i % 5 === 0;
        ctx.moveTo(920, y);
        ctx.lineTo(920 - (long ? 28 : 12), y);
      }
      ctx.moveTo(914, 240 > rTop ? 240 : rTop);
      ctx.lineTo(926, 240 > rTop ? 240 : rTop);
      ctx.stroke();
      ctx.restore();

      // brackets never drop below the safe line: one that would is lifted whole, keeping its length
      const SAFE_Y = 1540;
      const lift = (ya, yb) => {
        const dy = Math.max(0, yb - SAFE_Y);
        return [ya - dy, yb - dy];
      };
      // ghost brackets: each molt leaves the old length behind as a growth staircase
      const steps = [];
      for (let k = 0; k < 4; k++) {
        const mf = MOLT_F[k];
        if (f < mf) continue;
        const pr = E.outBack(clamp((f - mf + 1) / 3));
        const [ga, gb] = lift(toS(0, HEAD_Y[k])[1], toS(0, HEAD_Y[k] + INST[k].len)[1]);
        const gx = 884 - 16 * (4 - k);
        const cap = 8 * pr;
        steps.push([gx, ga]);
        ctx.save();
        ctx.strokeStyle = C.annYellow;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(gx - cap, ga);
        ctx.lineTo(gx, ga);
        ctx.lineTo(gx, gb);
        ctx.lineTo(gx - cap, gb);
        ctx.stroke();
        ctx.restore();
      }

      // bracket hugging head and tail
      const hF = M.frame(0), tF = M.frame(1);
      const hs = toS(hF.x + hF.tx * 1.5, hF.y + hF.ty * 1.5);
      const ts = toS(tF.x, tF.y);
      const [y0, y1] = lift(Math.min(hs[1], ts[1]), Math.max(hs[1], ts[1]));
      const bx = 884;
      if (steps.length) {
        // one dotted step line joins the head ends into a single growth chart
        steps.push([bx, y0]);
        ctx.save();
        ctx.strokeStyle = C.annYellow;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.setLineDash([1, 5]);
        ctx.beginPath();
        ctx.moveTo(steps[0][0], steps[0][1]);
        for (let i = 1; i < steps.length; i++) {
          ctx.lineTo(steps[i][0], steps[i - 1][1]);
          ctx.lineTo(steps[i][0], steps[i][1]);
        }
        ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      ctx.strokeStyle = C.annYellow;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx - 16, y0);
      ctx.lineTo(bx, y0);
      ctx.lineTo(bx, y1);
      ctx.lineTo(bx - 16, y1);
      ctx.moveTo(bx, (y0 + y1) / 2);
      ctx.lineTo(bx + 10, (y0 + y1) / 2);
      ctx.stroke();
      // leaders: two 30 px stubs on the line from each body end to its bracket end, one leaving the
      // body 16 px out, one arriving 22 px short of the bracket, so no leader crosses a leaf
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 6]);
      ctx.beginPath();
      const headUp = hs[1] <= ts[1];
      for (const [ex, ey, by] of [[hs[0], hs[1], headUp ? y0 : y1], [ts[0], ts[1], headUp ? y1 : y0]]) {
        const ax = ex + 16, bxe = bx - 22;
        const dx = bxe - ax, dy = by - ey, dl = Math.hypot(dx, dy) || 1;
        const ux = dx / dl, uy = dy / dl;
        ctx.moveTo(ax, ey);
        ctx.lineTo(ax + ux * 30, ey + uy * 30);
        ctx.moveTo(bxe - ux * 30, by - uy * 30);
        ctx.lineTo(bxe, by);
      }
      ctx.stroke();
      ctx.restore();

      // tally rings round the landed capsules
      for (let k = 0; k < 4; k++) {
        const land = MOLT_F[k] + 8;
        if (f < land) continue;
        const pr = E.outBack(clamp((f - land + 1) / 3));
        const s = toS(CAP_LAND[k][0], CAP_LAND[k][1]);
        const r = 26 * pr;
        ctx.save();
        ctx.strokeStyle = C.annYellow;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(s[0], s[1], Math.max(0.1, r), 0, TAU);
        ctx.stroke();
        ctx.lineCap = 'round';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i <= k; i++) {
          const a = -1.2 + i * 0.26;
          ctx.moveTo(s[0] + Math.cos(a) * (r + 5), s[1] + Math.sin(a) * (r + 5));
          ctx.lineTo(s[0] + Math.cos(a) * (r + 13), s[1] + Math.sin(a) * (r + 13));
        }
        ctx.stroke();
        ctx.restore();
      }

      // magenta molt rings: round the real body (kept off the loupe) and inside the loupe
      for (let k = 0; k < 4; k++) {
        const mf = MOLT_F[k];
        if (f < mf || f > mf + 4) continue;
        const cx = stageX(k + 1, 0);
        const cyW = HEAD_Y[k] + INST[k + 1].len * 0.5;
        const s = toS(cx, cyW);
        ctx.save();
        if (loupe) {
          ctx.beginPath();
          ctx.rect(0, 0, 1080, 1920);
          ctx.arc(LP_X, LP_Y, loupe.R0 + 2.5, 0, TAU, true);
          ctx.clip('evenodd');
        }
        moltRing(ctx, s[0], s[1], f - mf, 1);
        ctx.restore();
        if (loupe) {
          const ls = loupe.map(cx, cyW);
          ctx.save();
          ctx.beginPath();
          ctx.arc(LP_X, LP_Y, loupe.R0 - 10, 0, TAU);
          ctx.clip();
          moltRing(ctx, ls[0], ls[1], f - mf, clamp(S, 0, 1.1));
          ctx.restore();
        }
      }
      void info;
    },
  });
})();
