// 06 j-hang: The J, then the chrysalis. Illustrated, global T 9.5 to 11.5 (2.0 s at 120 bpm).
//
// Layer plan (frame px, camera locked at zoom 1):
//   1  paper under stripeCream / stripeApricot stripes (140 px, 30 deg, 6 px drift per beat), a paperDeep
//      45 deg hatch vignette below the safe area (y 1560-1920)
//   2  hatched cast shadows of the twig and of the subject (offset +44, +36, light from the upper left),
//      construction lines: swing-limit rays, the J's curl circle, the chrysalis levels (inkFaint 50%),
//      full-width leaders at y 905 and 1098, r 605 and r 798 length arcs (open on the axis x 400-680)
//   3  d12-21: dotted ghost of the J, an annBlue ruler at x 780 and inkSoft brackets (larva vs chrysalis)
//   4  annYellow pendulum arcs r 1200 / 1164 with a 36 px degree band, vertical inkSoft plumb line to an
//      inked brass bob whose tip sits at (540, 1500) inside a r 12 annYellow ring, an annYellow swing axis
//   5  bark twig across the top (underside y 300, top y 235), silk pad at (540, 300) with trailing strands
//   6  subject: 5th instar on G2, straight hang, torn skin worked up over the jade pupa, chrysalis on G3
//   7  silk pad front strands, the cremaster, the shed-skin wad
//   8  overlays: annMagenta wave ticks and split rings, annYellow pad ring and twist arcs, annBlue fall line
//
// Timing, by drawing index d = onTwos(t) * 12 (characters move on twos):
//   d 0-5    T  9.500  the J sways +-3 deg about the pad
//   d 6-7    T 10.000  it straightens (legs stay on the right, filaments on the left)
//   d 8-11            a contraction wave runs up the body in 4 drawings
//   d 12     T 10.500  the skin tears on the dorsal side behind the head and slides up 70 px (pluck 1)
//   d 13-14           the tear widens, the skin bunches into folds above a 860 px rim, the pupa wriggles
//   d 15     T 10.750  the skin is worked up to y 560 (pluck 2); d 15-17 the pupa rolls its wing case left
//   d 17              the skin is a 110 px collar round the pad, the pupa is 96% of the way to G3
//   d 18     T 11.000  the cremaster locks (thrust -4 deg, dy -6), the yellow ring snaps, the skin drops (pluck 3)
//   d 19-21           twists +8 / -8 / +8, d 22-23 settles exactly on G3; the wad is cut by the bottom edge on d 20
//   T 11.250 (24 fps) the 21 gold dots pop on over 6 frames, 3 or 4 per frame
(function () {
  'use strict';

  const ID = 'j-hang';
  const PX = 540, PY = 300;
  const DEG = Math.PI / 180;
  const HALF_PI = Math.PI / 2;
  const TAU = Math.PI * 2;

  // ---- shared geometry (docs/storyboard.md) ----
  const G2 = [[540, 300], [540, 760], [556, 840], [600, 880], [660, 870], [705, 830]];
  const G2_HEAD = [720, 790];
  const G3_Y = [332, 380, 440, 500, 600, 700, 800, 860, 895, 905];
  const G3_W = [35, 72, 106, 124, 130, 127, 108, 78, 36, 0];
  const G3_TOP = 332;
  const G3_LEN = 905 - PY;
  const V0 = (G3_TOP - PY) / G3_LEN;
  const LARVA_TIP = 1098; // lowest point of the straight-hanging larva, head included

  // larval half-width along material m (0 at the pad, 1 behind the head, then the collar tucking under the head)
  const LARVA_M = [0, 0.05, 0.14, 0.3, 0.637, 0.84, 0.95, 1, 1.015, 1.03];
  const LARVA_HW = [35, 42, 51, 57, 60, 57, 52, 50, 45, 32];
  const M_END = 1.03;

  // the fresh pupa: long and slim, along v (0 at the pad, 1 at the head tip)
  const LONG_LEN = 790;
  const LONG_V = [V0, 0.1, 0.22, 0.4, 0.6, 0.78, 0.9, 0.96, 0.99, 1];
  const LONG_HW = [30, 44, 54, 58, 59, 55, 45, 30, 14, 0];

  // 13 body segments from the pad (A10) to the head (T1)
  const SEG_NAMES = ['A10', 'A9', 'A8', 'A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'A1', 'T3', 'T2', 'T1'];
  const SEG_W = [0.055, 0.06, 0.075, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.065, 0.06, 0.055];
  const SEG_B = (() => {
    const tot = SEG_W.reduce((a, b) => a + b, 0);
    const out = [0];
    let acc = 0;
    for (const w of SEG_W) out.push((acc += w / tot));
    out[out.length - 1] = 1;
    return out;
  })();
  const segIdx = (name) => SEG_NAMES.indexOf(name);
  const segMid = (name) => (SEG_B[segIdx(name)] + SEG_B[segIdx(name) + 1]) / 2;
  // band pattern inside one segment, posterior to anterior: y yellow, k black, w white
  const BANDS = [['y', 0.14], ['k', 0.1], ['w', 0.13], ['k', 0.26], ['w', 0.13], ['k', 0.1], ['y', 0.14]];
  const BOW = 0.22; // ring bow toward the head, as a fraction of the half-width

  const lerp = (a, b, u) => a + (b - a) * u;
  const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);

  // ---- monotone cubic through a table (exact at the table points) ----
  function monotone(xs, ys) {
    const n = xs.length;
    const d = [];
    const m = new Array(n);
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    m[0] = d[0];
    m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) {
        m[i] = 0;
        m[i + 1] = 0;
        continue;
      }
      const a = m[i] / d[i], b = m[i + 1] / d[i];
      const h = a * a + b * b;
      if (h > 9) {
        const tau = 3 / Math.sqrt(h);
        m[i] = tau * a * d[i];
        m[i + 1] = tau * b * d[i];
      }
    }
    return (x) => {
      if (x <= xs[0]) return ys[0];
      if (x >= xs[n - 1]) return ys[n - 1];
      let i = 0;
      while (x > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i];
      const u = (x - xs[i]) / h;
      const u2 = u * u, u3 = u2 * u;
      return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * m[i + 1];
    };
  }

  // ---- geometry built once (pure) ----
  let GEO = null;
  function geo(L) {
    if (GEO) return GEO;
    const dense = L.smoothPts(G2.concat([G2_HEAD]), false, 0.5);
    const n = dense.length;
    const cum = new Float64Array(n);
    for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]);
    let best = 1e9, sNeck = 0;
    for (let i = 0; i < n; i++) {
      const dd = Math.hypot(dense[i][0] - G2[5][0], dense[i][1] - G2[5][1]);
      if (dd < best) {
        best = dd;
        sNeck = cum[i];
      }
    }
    const DS = 2;
    const total = cum[n - 1];
    const N = Math.ceil((total + 200) / DS);
    const th = new Float64Array(N);
    let j = 0, prev = HALF_PI;
    for (let i = 0; i < N; i++) {
      const s = (i + 0.5) * DS;
      let a = prev;
      if (s < total) {
        while (j < n - 2 && cum[j + 1] < s) j++;
        a = Math.atan2(dense[j + 1][1] - dense[j][1], dense[j + 1][0] - dense[j][0]);
        while (a - prev > Math.PI) a -= TAU;
        while (a - prev < -Math.PI) a += TAU;
      }
      th[i] = a;
      prev = a;
    }
    GEO = {
      th, DS, N, sNeck, headOff: total - sNeck,
      g3: monotone(G3_Y, G3_W),
      long: monotone(LONG_V, LONG_HW),
      larva: monotone(LARVA_M, LARVA_HW),
      poses: new Map(),
      ghost: null,
    };
    return GEO;
  }

  // centreline for straighten amount k (0 = the J on G2, 1 = hanging straight down); rotation is applied by ctx
  function poseLine(g, k) {
    const key = Math.round(k * 1000);
    let C = g.poses.get(key);
    if (C) return C;
    const X = new Float64Array(g.N + 1), Y = new Float64Array(g.N + 1), TH = new Float64Array(g.N);
    X[0] = PX;
    Y[0] = PY;
    for (let i = 0; i < g.N; i++) {
      const a = HALF_PI + (g.th[i] - HALF_PI) * (1 - k);
      TH[i] = a;
      X[i + 1] = X[i] + Math.cos(a) * g.DS;
      Y[i + 1] = Y[i] + Math.sin(a) * g.DS;
    }
    C = { X, Y, TH, DS: g.DS, N: g.N };
    g.poses.set(key, C);
    return C;
  }

  function lineAt(C, s) {
    let f = s / C.DS;
    if (f < 0) f = 0;
    if (f > C.N - 1e-6) f = C.N - 1e-6;
    const i = Math.floor(f), u = f - i;
    const x = C.X[i] + (C.X[i + 1] - C.X[i]) * u;
    const y = C.Y[i] + (C.Y[i + 1] - C.Y[i]) * u;
    const a = f - 0.5;
    const ia = Math.floor(a), ua = a - ia;
    const i0 = Math.max(0, Math.min(C.N - 1, ia)), i1 = Math.max(0, Math.min(C.N - 1, ia + 1));
    const th = C.TH[i0] + (C.TH[i1] - C.TH[i0]) * ua;
    const tx = Math.cos(th), ty = Math.sin(th);
    return { x, y, tx, ty, nx: -ty, ny: tx, th };
  }

  // a point on the body tube: lateral lam in [-1, 1] along the normal, bowed toward the head like a ring
  function tube(f, lam, bowK, z) {
    const b = bowK * f.hw * Math.sqrt(Math.max(0, 1 - lam * lam)) + (z || 0);
    return [f.x + f.nx * lam * f.hw + f.tx * b, f.y + f.ny * lam * f.hw + f.ty * b];
  }
  function ring(f, l0, l1, n, bowK, zFn) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const lam = lerp(l0, l1, i / n);
      out.push(tube(f, lam, bowK, zFn ? zFn(lam) : 0));
    }
    return out;
  }

  // the J on G2 as a plain outline, for the dotted ghost
  function ghostJ(g) {
    if (g.ghost) return g.ghost;
    const C = poseLine(g, 0);
    const pos = [], neg = [];
    for (let i = 0; i <= 90; i++) {
      const m = (i / 90) * M_END;
      const f = lineAt(C, m * g.sNeck);
      const hw = g.larva(m);
      pos.push([f.x + f.nx * hw, f.y + f.ny * hw]);
      neg.push([f.x - f.nx * hw, f.y - f.ny * hw]);
    }
    const h = lineAt(C, g.sNeck + g.headOff);
    g.ghost = { poly: pos.concat(neg.reverse()), head: [h.x, h.y] };
    return g.ghost;
  }

  // ---- pupa profile ----
  const pupaLen = (cp) => lerp(LONG_LEN, G3_LEN, cp);
  function pupaHW(g, yl, cp) {
    const len = pupaLen(cp);
    const v = yl / len;
    if (v < V0 || v > 1) return 0;
    return lerp(g.long(v), g.g3(PY + v * G3_LEN), cp);
  }
  // maps a point given on G3 to the current pupa shape
  function onPupa(g, cp, x, y) {
    const v = (y - PY) / G3_LEN;
    const h3 = g.g3(y);
    const ratio = h3 > 0.5 ? pupaHW(g, v * pupaLen(cp), cp) / h3 : 1;
    return [PX + (x - PX) * ratio, PY + v * pupaLen(cp)];
  }

  // ---- the choreography, per drawing ----
  //                  d12   d13   d14   d15   d16   d17
  const SK_RIM = [685, 560, 546, 260, 188, 110]; // torn rim, px below the pad
  const SK_FOLD = [36, 118, 136, 260, 188, 110]; // height of the bunched folds above the rim
  const SK_MC = [0.9, 0.66, 0.6, 0, 0, 0]; // material still smooth above the folds
  const SK_SLIT = [24, 40, 36, 0, 0, 0]; // width of the dorsal tear at the rim
  const SK_SLITLEN = [122, 118, 108, 0, 0, 0];
  const SPLIT_CP = [0, 0.1, 0.16, 0.42, 0.66, 0.96];
  const SPLIT_BEND = [0, 4, -4, 4, -4, 2];
  const SPLIT_ROT = [0, 0.8, -0.8, 1, -1, 0.4];
  const SPLIT_ROLL = [-1, -1, -1, -0.35, 0.4, 1]; // pupa wing case: -1 on the right edge, 1 on G3 (left)
  const TWIST = [-4, 8, -8, 8, -2, 0, 0];
  const SEAM_PT = [500, 924]; // centre of the tear at d12 (straight hang), for the magenta rings

  function poseAt(d) {
    const s = { d, k: 0, rot: 0, roll: 1, wave: null, phase: 'J', cp: 0, dy: 0, wad: -1, bend: 0, pr: 1, skin: null, rimInk: 0 };
    if (d <= 5) {
      s.rot = 3 * DEG * Math.sin((d / 6) * TAU);
      return s;
    }
    if (d <= 11) {
      s.phase = 'hang';
      s.k = [0.72, 1.06, 0.98, 1, 1, 1][d - 6];
      s.rot = [-1.4, 1.2, -0.6, 0.3, 0, 0][d - 6] * DEG;
      if (d >= 8) s.wave = { mw: [0.9, 0.66, 0.42, 0.18][d - 8], a: 0.4, b: 0.2, sig: 0.055 };
      return s;
    }
    s.k = 1;
    if (d <= 17) {
      const i = d - 12;
      s.phase = 'split';
      s.skin = { sR: SK_RIM[i], sC: SK_RIM[i] - SK_FOLD[i], mC: SK_MC[i], slit: SK_SLIT[i], slitLen: SK_SLITLEN[i], legs: i === 0 };
      s.cp = SPLIT_CP[i];
      s.bend = SPLIT_BEND[i];
      s.rot = SPLIT_ROT[i] * DEG;
      s.pr = SPLIT_ROLL[i];
      s.rimInk = i === 5 ? 0.5 : 0;
      return s;
    }
    s.phase = 'chrysalis';
    s.cp = 1;
    s.rot = TWIST[Math.min(6, d - 18)] * DEG;
    s.dy = d === 18 ? -6 : 0;
    s.wad = d <= 21 ? d - 18 : -1;
    s.rimInk = 1;
    return s;
  }

  // =====================================================================================
  // Background, construction, measurement, pendulum
  // =====================================================================================

  function drawBackground(ctx, L, P, T) {
    L.paper(ctx, { seed: 6 });
    ctx.save();
    ctx.globalAlpha = 0.86;
    L.stripes(ctx, { colors: [P.stripeCream, P.stripeApricot], width: 140, angle: -0.52, offset: 12 * T, seed: 606 });
    ctx.restore();
    // below the safe area: a paperDeep 45 degree hatch vignette, 8 px apart, fading upward
    L.hatch(ctx, [[-30, 1540], [1110, 1540], [1110, 1950], [-30, 1950]], {
      angle: -Math.PI / 4, spacing: 8, width: 1.7, color: P.paperDeep, alpha: 0.25, length: [18, 60], gap: [3, 9], seed: 6060,
      density: (x, y) => (x > AXIS_L && x < AXIS_R ? 0 : 1) * L.smoothstep(1560, 1860, y),
    });
  }

  // an open stroke with a gap on the subject's axis (x 400-680), so the match-cut silhouettes stay clean
  const AXIS_L = 400, AXIS_R = 680;

  function circum(a, b, c) {
    const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
    const ux = ((a[0] ** 2 + a[1] ** 2) * (b[1] - c[1]) + (b[0] ** 2 + b[1] ** 2) * (c[1] - a[1]) + (c[0] ** 2 + c[1] ** 2) * (a[1] - b[1])) / d;
    const uy = ((a[0] ** 2 + a[1] ** 2) * (c[0] - b[0]) + (b[0] ** 2 + b[1] ** 2) * (a[0] - c[0]) + (c[0] ** 2 + c[1] ** 2) * (b[0] - a[0])) / d;
    return [ux, uy, Math.hypot(a[0] - ux, a[1] - uy)];
  }

  function constructionStroke(ctx, P, fn, alpha, width) {
    ctx.save();
    ctx.strokeStyle = P.inkFaint;
    ctx.globalAlpha = alpha != null ? alpha : 0.3;
    ctx.lineWidth = width || 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    fn(ctx);
    ctx.stroke();
    ctx.restore();
  }

  // an arc about the pad, left open where it crosses the subject's axis band
  function openArc(c, R, spanDeg) {
    const gap = Math.asin(Math.min(1, (AXIS_R - PX) / R));
    c.moveTo(PX + Math.cos(HALF_PI + spanDeg * DEG) * R, PY + Math.sin(HALF_PI + spanDeg * DEG) * R);
    c.arc(PX, PY, R, HALF_PI + spanDeg * DEG, HALF_PI + gap, true);
    c.moveTo(PX + Math.cos(HALF_PI - gap) * R, PY + Math.sin(HALF_PI - gap) * R);
    c.arc(PX, PY, R, HALF_PI - gap, HALF_PI - spanDeg * DEG, true);
    return gap;
  }

  function drawConstruction(ctx, L, P, st) {
    // the chrysalis length as an arc of radius 605 about the pad, 5 degree ticks
    constructionStroke(ctx, P, (c) => {
      const gap = openArc(c, 605, 38);
      for (let a = -35; a <= 35; a += 5) {
        if (Math.abs(a * DEG) < gap) continue;
        const ang = HALF_PI + a * DEG, l = a % 15 === 0 ? 20 : 12;
        c.moveTo(PX + Math.cos(ang) * 605, PY + Math.sin(ang) * 605);
        c.lineTo(PX + Math.cos(ang) * (605 + l), PY + Math.sin(ang) * (605 + l));
      }
    }, 0.5, 1.8);
    // the straight larva's length, dotted at radius 798, so the two arcs show how much it shrinks
    ctx.save();
    ctx.setLineDash([2, 8]);
    constructionStroke(ctx, P, (c) => {
      openArc(c, LARVA_TIP - PY, 30);
    }, 0.5, 1.8);
    ctx.restore();
    constructionStroke(ctx, P, (c) => {
      const R = LARVA_TIP - PY;
      const gap = Math.asin((AXIS_R - PX) / R);
      for (let a = -30; a <= 30; a += 5) {
        if (Math.abs(a * DEG) < gap) continue;
        const ang = HALF_PI + a * DEG;
        c.moveTo(PX + Math.cos(ang) * (R - 7), PY + Math.sin(ang) * (R - 7));
        c.lineTo(PX + Math.cos(ang) * (R + 7), PY + Math.sin(ang) * (R + 7));
      }
    }, 0.5, 1.8);
    constructionStroke(ctx, P, (c) => {
      // the bob's protractor: a small circle, a crosshair and 15 degree ticks
      c.moveTo(PX + 64, PY + 1200);
      c.arc(PX, PY + 1200, 64, 0, TAU);
      c.moveTo(PX - 96, PY + 1200);
      c.lineTo(PX - 40, PY + 1200);
      c.moveTo(PX + 40, PY + 1200);
      c.lineTo(PX + 96, PY + 1200);
      c.moveTo(PX, PY + 1200 + 16);
      c.lineTo(PX, PY + 1200 + 40);
      for (let k = 0; k < 24; k++) {
        const a = (k * TAU) / 24, l = k % 6 === 0 ? 14 : 7;
        c.moveTo(PX + Math.cos(a) * 64, PY + 1200 + Math.sin(a) * 64);
        c.lineTo(PX + Math.cos(a) * (64 + l), PY + 1200 + Math.sin(a) * (64 + l));
      }
    }, 0.45, 1.5);
    // level leaders across the full width at the rim (515), the chrysalis tip (905) and the straight larva's tip (1098)
    constructionStroke(ctx, P, (c) => {
      for (const y of [515, 905, LARVA_TIP]) {
        c.moveTo(60, y);
        c.lineTo(AXIS_L, y);
        c.moveTo(AXIS_R, y);
        c.lineTo(1020, y);
        for (const x of [60, 1020]) {
          c.moveTo(x, y - 8);
          c.lineTo(x, y + 8);
        }
        for (let x = 120; x < 1000; x += 60) {
          if (x > AXIS_L - 4 && x < AXIS_R + 4) continue;
          c.moveTo(x, y - 4);
          c.lineTo(x, y + 4);
        }
      }
    }, 0.5, 1.8);
    if (st.phase === 'J' || (st.phase === 'hang' && st.d <= 7)) {
      const [cx, cy, cr] = circum(G2[2], G2[3], G2[4]);
      ctx.save();
      ctx.translate(PX, PY);
      ctx.rotate(st.rot);
      ctx.translate(-PX, -PY);
      constructionStroke(ctx, P, (c) => {
        c.moveTo(cx + cr, cy);
        c.arc(cx, cy, cr, 0, TAU);
        c.moveTo(cx - 14, cy);
        c.lineTo(cx + 14, cy);
        c.moveTo(cx, cy - 14);
        c.lineTo(cx, cy + 14);
        c.moveTo(380, cy + cr);
        c.lineTo(860, cy + cr);
        c.moveTo(G2_HEAD[0] - 60, G2_HEAD[1] + 160);
        c.lineTo(G2_HEAD[0] + 40, G2_HEAD[1] - 106);
        c.moveTo(PX - 60, 760);
        c.lineTo(PX + 180, 760);
      }, st.phase === 'J' ? 0.42 : 0.22);
      ctx.restore();
    } else if (st.phase !== 'hang') {
      ctx.save();
      ctx.translate(PX, PY + st.dy);
      ctx.rotate(st.rot);
      ctx.translate(-PX, -PY);
      constructionStroke(ctx, P, (c) => {
        for (const [y, hw] of [[515, 126], [600, 130]]) {
          c.moveTo(PX - 222, y);
          c.lineTo(PX + hw + 90, y);
          c.moveTo(PX - 222, y - 8);
          c.lineTo(PX - 222, y + 8);
        }
      }, 0.5, 1.8);
      constructionStroke(ctx, P, (c) => {
        // lines from the pad past the widest points
        for (const sg of [-1, 1]) {
          c.moveTo(PX, PY);
          c.lineTo(PX + sg * 130 * 2.35, PY + 300 * 2.35);
        }
        c.moveTo(PX + 170, 332);
        c.lineTo(PX + 170, 905);
        c.moveTo(PX + 160, 332);
        c.lineTo(PX + 180, 332);
        c.moveTo(PX + 160, 905);
        c.lineTo(PX + 180, 905);
      }, st.phase === 'split' ? 0.3 : 0.42);
      // the rim band sits a third of the way down: a thirds bracket on the left
      const bp = new Path2D();
      const X = PX - 210;
      bp.moveTo(X + 8, 332);
      bp.lineTo(X, 332);
      bp.lineTo(X, 905);
      bp.lineTo(X + 8, 905);
      for (let k = 1; k < 15; k++) {
        const y = 332 + (573 * k) / 15;
        const third = k % 5 === 0;
        bp.moveTo(X, y);
        bp.lineTo(X + (third ? 16 : 6), y);
      }
      ctx.strokeStyle = P.inkSoft;
      ctx.globalAlpha = st.phase === 'split' ? 0.45 : 0.75;
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      ctx.stroke(bp);
      ctx.restore();
    }
  }

  // d12-21: where the larva was, and how much shorter the chrysalis is
  function drawMeasure(ctx, L, P, g, tc) {
    if (tc < 1.0 - 1e-6 || tc >= 1.834) return;
    const pOn = L.ease.outExpo(clamp((tc - 1.0 + 1 / 24) / 0.25));
    const fade = 1 - clamp((tc - 1.667) / 0.1667);
    if (fade <= 0) return;
    const gh = ghostJ(g);
    ctx.save();
    ctx.globalAlpha = 0.4 * fade;
    ctx.strokeStyle = P.inkFaint;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.setLineDash([0.5, 7]);
    ctx.beginPath();
    L.tracePath(ctx, gh.poly, true);
    ctx.moveTo(gh.head[0] + 29, gh.head[1]);
    ctx.arc(gh.head[0], gh.head[1], 29, 0, TAU);
    ctx.stroke();
    ctx.restore();
    // (the two tips' leaders run full width in drawConstruction)
    // annBlue ruler at x 780, 12 px ticks every 20 px and 28 px ticks every 100 px
    const y1 = 300 + 800 * pOn;
    const rp = new Path2D();
    rp.moveTo(780, 300);
    rp.lineTo(780, y1);
    for (let y = 300; y <= y1 + 0.01; y += 20) {
      const long = (y - 300) % 100 === 0;
      rp.moveTo(780, y);
      rp.lineTo(780 - (long ? 28 : 12), y);
    }
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.strokeStyle = P.annBlue;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke(rp);
    ctx.restore();
    // inkSoft brackets: the larva's length against the chrysalis's
    ctx.save();
    ctx.globalAlpha = fade;
    L.bracket(ctx, 814, 300, 814, LARVA_TIP, { color: P.inkSoft, alpha: 0.85, width: 1.6, cap: 16, p: pOn });
    L.bracket(ctx, 846, 300, 846, 905, { color: P.inkSoft, alpha: 0.85, width: 1.6, cap: 16, p: pOn });
    ctx.restore();
  }

  function drawPendulum(ctx, L, P, tc, rot) {
    const R = 1200, R2 = 1164;
    const pr = L.ease.outExpo(clamp(tc / 0.25));
    const span = 28 * DEG * pr;
    // construction rays to the swing limits (+-3 deg for the J, +-8 deg for the twists)
    ctx.save();
    ctx.strokeStyle = P.inkFaint;
    ctx.globalAlpha = 0.45 * pr;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([10, 9]);
    ctx.beginPath();
    for (const a of [-8, -3, 3, 8]) {
      const ang = HALF_PI + a * DEG;
      ctx.moveTo(PX + Math.cos(ang) * 960, PY + Math.sin(ang) * 960);
      ctx.lineTo(PX + Math.cos(ang) * (R + 60), PY + Math.sin(ang) * (R + 60));
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(PX, PY, R + 44, HALF_PI - span * 0.9, HALF_PI + span * 0.9);
    ctx.stroke();
    ctx.restore();
    // double arc, a 36 px band with a tick every degree and a full-height tick every 5 degrees, all at 100%
    ctx.save();
    ctx.strokeStyle = P.annYellow;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(PX, PY, R, HALF_PI - span, HALF_PI + span);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(PX, PY, R2, HALF_PI - span * 0.97, HALF_PI + span * 0.97);
    ctx.stroke();
    const tk = new Path2D(), tkM = new Path2D();
    for (let a = -27; a <= 27; a += 1) {
      if (Math.abs(a * DEG) > span) continue;
      const major = a % 5 === 0;
      const p = major ? tkM : tk;
      const ang = HALF_PI + a * DEG;
      const l = major ? R - R2 : 14;
      p.moveTo(PX + Math.cos(ang) * R, PY + Math.sin(ang) * R);
      p.lineTo(PX + Math.cos(ang) * (R - l), PY + Math.sin(ang) * (R - l));
    }
    ctx.lineWidth = 1.6;
    ctx.stroke(tk);
    ctx.lineWidth = 2.5;
    ctx.stroke(tkM);
    // limit markers: small yellow triangles at +-3 and +-8 deg
    ctx.fillStyle = P.annYellow;
    for (const a of [-8, -3, 3, 8]) {
      if (Math.abs(a * DEG) > span) continue;
      const ang = HALF_PI + a * DEG;
      const x = PX + Math.cos(ang) * (R + 8), y = PY + Math.sin(ang) * (R + 8);
      const tx = -Math.sin(ang), ty = Math.cos(ang);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * 12 + tx * 6, y + Math.sin(ang) * 12 + ty * 6);
      ctx.lineTo(x + Math.cos(ang) * 12 - tx * 6, y + Math.sin(ang) * 12 - ty * 6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // plumb line: always vertical, from the pad to the bob's cap
    const BOB_TOP = PY + R - 58;
    L.inkLine(ctx, PX, PY + 4, PX, BOB_TOP - 5, {
      width: 1.8, color: P.inkSoft, alpha: 0.9, seed: 61, taper: [0, 10], wobble: 0.8, swell: 0,
    });
    drawBob(ctx, L, P, BOB_TOP);
    ctx.save();
    ctx.strokeStyle = P.annYellow;
    ctx.fillStyle = P.annYellow;
    ctx.lineCap = 'round';
    if (Math.abs(rot) > 0.5 * DEG) {
      const ang = HALF_PI + rot;
      const ex = PX + Math.cos(ang) * R, ey = PY + Math.sin(ang) * R;
      // the swinging axis, a separate line from the pad through the subject tip
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(PX + Math.cos(ang) * 40, PY + Math.sin(ang) * 40);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      // the angle between the plumb line and the axis, on the scale
      ctx.globalAlpha = 1;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(PX, PY, R, HALF_PI, ang, rot < 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(ex, ey, 4.5, 0, TAU);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(PX, PY, 520, HALF_PI, ang, rot < 0);
      ctx.stroke();
    }
    // the r 12 ring round the bob's tip
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(PX, PY + R, 12, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // an inked brass plumb bob, 36 x 58 px, its tip on (540, 1500)
  function bobShape(top) {
    const pts = [];
    const H = 58, HW = 18;
    const hwAt = (u) => (u < 0.36 ? HW * Math.sqrt(Math.max(0, 1 - Math.pow((0.36 - u) / 0.36, 2))) : HW * Math.pow(1 - (u - 0.36) / 0.64, 1.15));
    const N = 22;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      pts.push([PX + hwAt(u), top + u * H]);
    }
    for (let i = N - 1; i > 0; i--) {
      const u = i / N;
      pts.push([PX - hwAt(u), top + u * H]);
    }
    return pts;
  }
  function drawBob(ctx, L, P, top) {
    const pts = bobShape(top);
    const cx = PX, cy = top + 26;
    ctx.save();
    ctx.fillStyle = P.ochre;
    ctx.beginPath();
    L.tracePath(ctx, pts, true);
    ctx.fill();
    ctx.restore();
    // 45 degree hatching 5 px apart on the lower-right half
    L.hatch(ctx, pts, {
      angle: -Math.PI / 4, spacing: 5, width: 1.3, color: P.ink, alpha: 0.85, length: [8, 30], gap: [2, 4], seed: 6100, clip: true, inset: 1,
      density: (x, y) => L.smoothstep(-4, 4, (x - cx) + (y - cy)),
    });
    // cap and shackle
    L.inkPath(ctx, [[PX - 9, top + 2], [PX + 9, top + 2]], { width: 3, seed: 6101, smooth: false, taper: 0, wobble: 0.3 });
    L.inkPath(ctx, L.ellipsePts(PX, top - 3, 3.5, 4, 12), { closed: true, width: 1.8, seed: 6102, wobble: 0.2 });
    L.inkPath(ctx, pts, { closed: true, width: 3, seed: 6103, wobble: 0.5 });
    // a tan highlight tick upper left
    L.inkPath(ctx, [[PX - 10, top + 9], [PX - 12.5, top + 17], [PX - 11, top + 26]], { width: 2.6, color: P.tan, seed: 6104, taper: [3, 5], wobble: 0.2 });
    L.inkPath(ctx, [[PX - 3, top + 6], [PX + 3, top + 5]], { width: 1.6, color: P.white, alpha: 0.7, seed: 6105, taper: [1, 2], wobble: 0.1 });
  }

  // =====================================================================================
  // Twig and silk
  // =====================================================================================

  function twigShape(L, seed) {
    const top = [], bot = [];
    for (let x = -60; x <= 1140; x += 12) {
      const f = L.smoothstep(40, 240, Math.abs(x - PX));
      let ty = 235 + f * (8 * L.noise1(x * 0.004 + 1.3, seed + 11) + 2.5 * L.noise1(x * 0.021, seed + 12));
      let by = 300 + f * (6 * L.noise1(x * 0.005 + 7.1, seed + 13) + 2 * L.noise1(x * 0.027, seed + 14));
      if (x > PX) {
        ty += f * (x - PX) * 0.012;
        by -= f * (x - PX) * 0.004;
      }
      ty -= 9 * Math.exp(-Math.pow((x - 300) / 26, 2));
      by += 7 * Math.exp(-Math.pow((x - 822) / 22, 2));
      top.push([x, ty]);
      bot.push([x, by]);
    }
    return { top, bot, poly: top.concat(bot.slice().reverse()) };
  }

  // the twig's cast shadow on the stripes, offset right (light from the upper left)
  function drawTwigShadow(ctx, L, P, seed) {
    const tw = twigShape(L, seed);
    const top = tw.bot.map(([x, y]) => [x + 14, y - 4]);
    const bot = tw.bot.slice().reverse().map(([x, y]) => [x + 14, y + 30 + 4 * L.noise1(x * 0.013, seed + 5)]);
    const poly = top.concat(bot);
    L.hatch(ctx, poly, {
      angle: -Math.PI / 4, spacing: 6, width: 1.3, color: P.inkFaint, alpha: 0.4, length: [8, 22], gap: [2, 5], seed: seed + 2, clip: true,
      density: (x, y) => 1 - L.smoothstep(312, 334, y),
    });
  }

  // the subject's cast shadow on the stripe plane: its silhouette offset +44, +36 (light from the upper left),
  // filled with 45 degree hatching 6 px apart
  function drawSubjectShadow(ctx, L, P, g, st, seed) {
    const polys = [];
    if (st.phase === 'J' || st.phase === 'hang' || st.phase === 'split') {
      const o = drawLarva(ctx, L, P, g, st, seed + 2000, true);
      polys.push(o.poly);
      if (o.head) polys.push(L.ellipsePts(o.head[0], o.head[1], 29, 29, 28));
    }
    if (st.phase === 'split' || st.phase === 'chrysalis') {
      const len = pupaLen(st.cp);
      polys.push(pupaOutline(g, st.cp).pts.map(([x, y]) => [x + (st.bend ? st.bend * Math.sin(Math.PI * clamp((y - PY) / len)) : 0), y]));
    }
    const c = Math.cos(st.rot), sn = Math.sin(st.rot);
    const path = new Path2D();
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const poly of polys) {
      let area = 0;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) area += (poly[j][0] - poly[i][0]) * (poly[j][1] + poly[i][1]);
      const pts = area < 0 ? poly.slice().reverse() : poly;
      pts.forEach(([x, y], i) => {
        const dx = x - PX, dy = y - PY;
        const X = PX + dx * c - dy * sn + 44, Y = PY + st.dy + dx * sn + dy * c + 36;
        if (i === 0) path.moveTo(X, Y);
        else path.lineTo(X, Y);
        if (X < x0) x0 = X;
        if (X > x1) x1 = X;
        if (Y < y0) y0 = Y;
        if (Y > y1) y1 = Y;
      });
      path.closePath();
    }
    L.hatch(ctx, path, {
      angle: -Math.PI / 4, spacing: 6, width: 1.5, color: P.inkFaint, alpha: 0.4, length: [14, 44], gap: [2, 6], seed: seed + 9100,
      bounds: { x: x0 - 8, y: y0 - 8, w: x1 - x0 + 16, h: y1 - y0 + 16 },
    });
  }

  function drawTwig(ctx, L, P, seed) {
    const tw = twigShape(L, seed);
    // side shoot rising up-left off the top edge
    const shL = [[262, 250], [228, 180], [176, 90], [120, -10], [96, -60]];
    const shR = [[196, 246], [170, 176], [124, 92], [74, -2], [52, -60]];
    const sh = shL.concat(shR.slice().reverse());
    const shPts = L.smoothPts(sh, true, 6);
    ctx.save();
    ctx.fillStyle = P.bark;
    ctx.beginPath();
    L.tracePath(ctx, shPts, true);
    ctx.fill();
    ctx.restore();
    L.hatch(ctx, shPts, { angle: -2.05, spacing: 7, width: 1.6, color: P.tan, alpha: 0.45, length: [14, 44], seed: seed + 4, density: (x, y) => 1 - clamp((x - 80 - (250 - y) * 0.55) / 40) });
    L.hatch(ctx, shPts, { angle: -2.05, spacing: 4.5, width: 1.3, color: P.ink, alpha: 0.8, length: [20, 70], seed: seed + 3, density: (x, y) => clamp((x - 95 - (250 - y) * 0.55) / 40) });
    L.inkPath(ctx, L.smoothPts(shL, false, 6), { width: 3, seed: seed + 5, taper: [4, 20] });
    L.inkPath(ctx, L.smoothPts(shR, false, 6), { width: 3, seed: seed + 6, taper: [4, 20] });
    L.inkPath(ctx, L.ellipsePts(150, 70, 7, 5, 12, -1.1), { closed: true, width: 1.6, fill: L.mix(P.bark, P.tan, 0.3), seed: seed + 8 });

    // main twig
    ctx.save();
    ctx.fillStyle = P.bark;
    ctx.beginPath();
    L.tracePath(ctx, tw.poly, true);
    ctx.fill();
    ctx.restore();
    L.hatch(ctx, tw.poly, {
      angle: 0.01, spacing: 5.5, width: 1.7, color: P.tan, alpha: 0.55, length: [16, 70], gap: [4, 14], seed: seed + 7,
      density: (x, y) => 1 - L.smoothstep(240, 270, y + 4 * L.noise1(x * 0.03, seed + 8)),
    });
    L.hatch(ctx, tw.poly, {
      angle: 0.015, spacing: 4, width: 1.35, color: P.ink, alpha: 0.85, length: [24, 110], gap: [3, 9], seed: seed + 9,
      density: (x, y) => L.smoothstep(250, 294, y + 5 * L.noise1(x * 0.02, seed + 10)),
    });
    L.hatch(ctx, tw.poly, {
      angle: -0.5, spacing: 4.5, width: 1.2, color: P.ink, alpha: 0.75, length: [8, 16], seed: seed + 15,
      density: (x, y) => L.smoothstep(280, 302, y),
    });
    const r = L.rng(seed + 20);
    for (let i = 0; i < 20; i++) {
      const x0 = r.range(-40, 1080), len = r.range(60, 190), y0 = r.range(244, 292);
      const pts = [];
      for (let k = 0; k <= 5; k++) pts.push([x0 + (len * k) / 5, y0 + 2.5 * L.noise1(k * 0.9 + i, seed + 21)]);
      if (Math.abs(x0 + len / 2 - 300) < 50 || Math.abs(x0 + len / 2 - 822) < 40) continue;
      L.inkPath(ctx, pts, { width: r.range(1.2, 2.2), color: P.ink, alpha: 0.9, seed: seed + 30 + i, taper: [10, 20] });
    }
    L.stipple(ctx, tw.poly, { spacing: 6, r: [0.9, 1.8], color: P.sage, alpha: 0.75, seed: seed + 16, density: (x, y) => (y < 250 ? 0.35 * clamp(L.noise1(x * 0.02, seed + 17) * 2) : 0) });
    const knot = (x, y, rx, ry, s) => {
      L.inkPath(ctx, L.ellipsePts(x, y, rx, ry, 28, -0.05), { closed: true, width: 2.4, fill: L.mix(P.bark, P.ink, 0.35), seed: s });
      L.inkPath(ctx, L.ellipsePts(x + 1, y + 1, rx * 0.62, ry * 0.58, 24, -0.05), { closed: true, width: 1.6, color: P.ink, seed: s + 1 });
      L.inkPath(ctx, L.ellipsePts(x + 2, y + 1.5, rx * 0.3, ry * 0.28, 16), { closed: true, width: 1.4, fill: P.veinBlack, seed: s + 2 });
      L.inkPath(ctx, [[x - rx * 0.8, y - ry * 0.3], [x - rx * 0.3, y - ry * 0.85], [x + rx * 0.3, y - ry * 0.9]], { width: 1.8, color: P.tan, alpha: 0.75, seed: s + 3, taper: [6, 10] });
      for (const side of [-1, 1]) {
        L.inkPath(ctx, [[x - rx * 2.4, y + side * ry * 0.4], [x - rx * 1.1, y + side * ry * 1.25], [x, y + side * ry * 1.45], [x + rx * 1.1, y + side * ry * 1.25], [x + rx * 2.4, y + side * ry * 0.4]], {
          width: 1.3, color: P.ink, alpha: 0.8, seed: s + 5 + side, taper: [12, 12],
        });
      }
    };
    knot(300, 257, 24, 14, seed + 60);
    knot(822, 279, 18, 11, seed + 70);
    L.inkPath(ctx, tw.top.filter((p) => p[0] < 190), { width: 3, seed: seed + 80, taper: [0, 12] });
    L.inkPath(ctx, tw.top.filter((p) => p[0] > 262), { width: 3, seed: seed + 81, taper: [12, 0] });
    L.inkPath(ctx, tw.bot, { width: 3.4, seed: seed + 82, taper: 0, double: { offset: 4, alpha: 0.35, from: 0.55, to: 0.85 } });
  }

  function drawSilk(ctx, L, P, seed, front) {
    const b = L.boil(L.T);
    const r = L.rng(seed + (front ? 901 : 900));
    const white = new Path2D(), under = new Path2D();
    if (!front) {
      ctx.save();
      ctx.fillStyle = P.white;
      ctx.globalAlpha = 0.92;
      ctx.beginPath();
      ctx.ellipse(PX, PY + 1, 34, 8, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      // loose strands trailing along the twig's underside
      const rs = L.rng(seed + 905);
      for (let k = 0; k < 8; k++) {
        const side = k % 2 ? 1 : -1;
        const x0 = PX + side * rs.range(18, 32), len = rs.range(40, 80);
        const x1 = x0 + side * len;
        const y0 = PY + rs.range(-1, 4), y1 = PY + rs.range(-1, 3) + (L.h3(k, b, seed + 9) - 0.5) * 1.2;
        const qy = Math.max(y0, y1) + rs.range(2, 7);
        white.moveTo(x0, y0);
        white.quadraticCurveTo((x0 + x1) / 2 + rs.range(-8, 8), qy, x1, y1);
        under.moveTo(x0, y0 + 1.4);
        under.quadraticCurveTo((x0 + x1) / 2, qy + 1.4, x1, y1 + 1.4);
      }
    }
    const n = front ? 34 : 84;
    for (let i = 0; i < n; i++) {
      const a = r() * TAU;
      const rad = Math.sqrt(r());
      // a 70-80 px tangle with 4 strays reaching 110 px
      const spread = front ? 24 : i < 4 ? 42 : 28;
      const cx = PX + Math.cos(a) * rad * spread;
      const cy = PY + (front ? 5 : -2) + Math.sin(a) * rad * (front ? 10 : 11);
      const len = front ? r.range(8, 18) : i < 4 ? r.range(18, 26) : r.range(10, 22);
      const ang = (r() - 0.5) * (front ? 2.2 : 0.9);
      const jb = (L.h3(i, b, seed + (front ? 7 : 3)) - 0.5) * 1.6;
      const x0 = cx - (Math.cos(ang) * len) / 2, y0 = cy - (Math.sin(ang) * len) / 2 + jb;
      const x1 = cx + (Math.cos(ang) * len) / 2, y1 = cy + (Math.sin(ang) * len) / 2 - jb;
      const bend = (r() - 0.5) * 12;
      const qx = cx - Math.sin(ang) * bend, qy = cy + Math.cos(ang) * bend;
      white.moveTo(x0, y0);
      white.quadraticCurveTo(qx, qy, x1, y1);
      if (Math.max(y0, y1, qy) > PY + 3) {
        under.moveTo(x0, y0 + 1.2);
        under.quadraticCurveTo(qx, qy + 1.2, x1, y1 + 1.2);
      }
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = P.inkSoft;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2.3;
    ctx.stroke(under);
    ctx.strokeStyle = P.white;
    ctx.globalAlpha = 0.95;
    ctx.lineWidth = 1.15;
    ctx.stroke(white);
    ctx.restore();
  }

  // =====================================================================================
  // The caterpillar (and its skin while it is worked up the pupa)
  // =====================================================================================

  function bandAt(m) {
    if (m < 0 || m >= 1) return 'k';
    let i = 0;
    while (i < 12 && m >= SEG_B[i + 1]) i++;
    const u = (m - SEG_B[i]) / (SEG_B[i + 1] - SEG_B[i]);
    let acc = 0;
    for (const [c, w] of BANDS) {
      acc += w;
      if (u < acc) return c;
    }
    return 'y';
  }

  // a limp, crinkled filament: droops toward gravity with a seeded crinkle
  function filament(ctx, L, P, x, y, dx, dy, len, width, seed, b, crinkle, droop, color, splay) {
    let ang = Math.atan2(dy, dx);
    const n = Math.max(5, Math.round(len / 7));
    const st = len / n;
    const pts = [[x, y]];
    let px = x, py = y;
    const rk = L.rng(seed + 91);
    const kinks = [];
    if (crinkle >= 0.45) {
      const nK = 2 + (rk() > 0.45 ? 1 : 0);
      for (let k = 0; k < nK; k++) kinks.push(Math.floor(rk.range(2, n - 2)));
    }
    for (let i = 0; i < n; i++) {
      let da = HALF_PI - ang;
      while (da > Math.PI) da -= TAU;
      while (da < -Math.PI) da += TAU;
      ang += da * droop * (0.4 + i / n) + crinkle * L.noise1(i * 0.85 + 0.3, seed) + (L.h3(i, b, seed) - 0.5) * 0.06;
      if (kinks.includes(i)) ang += rk.sign() * rk.range(0.5, 0.9);
      if (i >= n - 2) ang += da * 0.35;
      px += Math.cos(ang) * st;
      py += Math.sin(ang) * st;
      const u = (i + 1) / n;
      pts.push(splay ? [px + splay[0] * u * u, py + splay[1] * u * u] : [px, py]);
    }
    L.inkPath(ctx, pts, { width, color: color || P.veinBlack, taper: [2, len * 0.7], minWidth: 0.18, swell: 0, wobble: 0.5, seed });
  }

  // a crushed filament: short straight runs joined by sharp kinks, drooping
  function kinkedFilament(ctx, L, P, x, y, dx, dy, len, width, seed, b, color) {
    const r = L.rng(seed + 17);
    let ang = Math.atan2(dy, dx);
    const runs = [0.3, 0.26, 0.24, 0.2];
    const pts = [[x, y]];
    let px = x, py = y;
    for (let k = 0; k < runs.length; k++) {
      if (k > 0) ang += (k % 2 ? 1 : -1) * r.range(0.6, 0.95);
      let da = HALF_PI - ang;
      while (da > Math.PI) da -= TAU;
      while (da < -Math.PI) da += TAU;
      ang += da * 0.16;
      const l = runs[k] * len;
      const bend = r.range(-1.5, 1.5) + (L.h3(k, b, seed) - 0.5) * 0.8;
      pts.push([px + Math.cos(ang) * l * 0.5 - Math.sin(ang) * bend, py + Math.sin(ang) * l * 0.5 + Math.cos(ang) * bend]);
      px += Math.cos(ang) * l;
      py += Math.sin(ang) * l;
      pts.push([px, py]);
    }
    L.inkPath(ctx, pts, { width, color: color || P.veinBlack, taper: [2, len * 0.45], minWidth: 0.22, swell: 0, wobble: 0.3, smooth: false, seed });
  }

  // piecewise-linear lookup in [[s, z], ...]
  function knotAt(K, s) {
    if (!K || !K.length || s <= K[0][0]) return K && K.length ? K[0][1] : 0;
    for (let i = 1; i < K.length; i++) {
      if (s <= K[i][0]) {
        const u = (s - K[i - 1][0]) / Math.max(1e-6, K[i][0] - K[i - 1][0]);
        return lerp(K[i - 1][1], K[i][1], u);
      }
    }
    return K[K.length - 1][1];
  }

  function drawLarva(ctx, L, P, g, st, seed, outlineOnly) {
    const sk = st.skin;
    const skin = !!sk;
    const C = poseLine(g, st.k);
    const lamV = -st.roll, lamD = st.roll;
    const b = L.boil(L.T);
    const mEnd = skin ? 1 : M_END;
    const plen = pupaLen(st.cp);

    // ---- material m to arc length s ----
    const bump = (m) => (st.wave ? Math.exp(-Math.pow((m - st.wave.mw) / st.wave.sig, 2)) : 0);
    let sOf, mOfS;
    if (skin) {
      sOf = (m) => {
        if (m <= sk.mC) return sk.mC > 0 ? (m / sk.mC) * sk.sC : 0;
        return sk.sC + ((Math.min(m, 1) - sk.mC) / (1 - sk.mC)) * (sk.sR - sk.sC);
      };
      mOfS = (s) => {
        if (s <= sk.sC) return sk.sC > 0 ? (s / sk.sC) * sk.mC : 0;
        return sk.mC + (clamp((s - sk.sC) / (sk.sR - sk.sC))) * (1 - sk.mC);
      };
    } else {
      const MS = 240;
      const sTab = new Float64Array(MS + 1);
      let acc = 0;
      for (let i = 1; i <= MS; i++) {
        const m = ((i - 0.5) / MS) * mEnd;
        acc += (1 - (st.wave ? st.wave.a * bump(m) : 0)) * (mEnd / MS);
        sTab[i] = acc * g.sNeck;
      }
      sOf = (m) => {
        const f = clamp(m / mEnd) * MS;
        const i = Math.min(MS - 1, Math.floor(f));
        return sTab[i] + (sTab[i + 1] - sTab[i]) * (f - i);
      };
      mOfS = null;
    }
    const at = (m) => {
      const s = sOf(m);
      const f = lineAt(C, s);
      if (st.bend) f.x += st.bend * Math.sin(Math.PI * clamp(s / plen));
      let hw = g.larva(Math.min(m, M_END)) * (1 + (st.wave ? st.wave.b * bump(m) : 0));
      if (skin) {
        const ph = Math.max(30, pupaHW(g, s, st.cp));
        // the torn rim tucks in 7 px over the pupa instead of flaring
        hw = s <= sk.sC + 0.01 ? Math.max(hw * 0.97, ph + 3) : ph + 6 - 8 * L.smoothstep(sk.sR - 32, sk.sR, s);
      }
      f.hw = hw;
      f.m = m;
      f.s = s;
      return f;
    };
    const atS = (s) => at(mOfS(s));

    // ---- the skin's folds: 8-10 tilted accordion folds, zig-zag valleys 8-12 px deep ----
    let folds = null, zigP = null, zigN = null;
    const rr = L.rng(seed + 7000 + st.d * 13);
    if (skin && sk.sR - sk.sC > 4) {
      const span = sk.sR - sk.sC;
      const nF = span < 80 ? Math.max(2, Math.round(span / 13)) : 8 + Math.floor(rr() * 3);
      const hs = [];
      let tot = 0;
      for (let i = 0; i < nF; i++) {
        const h = rr.range(0.7, 1.32);
        hs.push(h);
        tot += h;
      }
      const V = [sk.sC];
      let acc = sk.sC;
      for (let i = 0; i < nF; i++) V.push((acc += (hs[i] * span) / tot));
      V[nF] = sk.sR;
      folds = V.map((s, k) => {
        const inner = k > 0 && k < nF;
        const gap = inner ? Math.min(s - V[k - 1], V[k + 1] - s) : 0;
        const o = inner ? Math.min(9, gap * 0.34) : 0;
        const amp = () => (inner ? Math.min(rr.range(8, 12), gap * 0.8) : k === 0 ? (sk.mC > 0 ? 4 : 0) : 3);
        return { s, oP: rr.range(-o, o), oN: rr.range(-o, o), aP: amp(), aN: amp(), bow: rr.range(0.05, 0.32), rk: rr.range(0.3, 0.64) };
      });
      const mkZig = (sg) => {
        const K = [];
        for (let k = 0; k < folds.length; k++) {
          const fo = folds[k];
          const sv = fo.s + (sg > 0 ? fo.oP : fo.oN), z = sg > 0 ? fo.aP : fo.aN;
          K.push([sv, z]);
          if (k < folds.length - 1) {
            const nx = folds[k + 1];
            const sn = nx.s + (sg > 0 ? nx.oP : nx.oN), zn = sg > 0 ? nx.aP : nx.aN, dz = sn - sv;
            K.push([sv + dz * fo.rk, -0.5]);
          }
        }
        return K;
      };
      zigP = mkZig(1);
      zigN = mkZig(-1);
    }
    // dorsal tear: a notch open at the rim, pushing the dorsal outline out 9 px
    const slit = skin && sk.slit > 0 ? { top: sk.sR - sk.slitLen, W: sk.slit, lc: lamD * 0.7 } : null;
    const bulgeAt = (s) => {
      if (!slit) return 0;
      const u = (s - (slit.top - 16)) / (sk.sR - slit.top + 16);
      if (u <= 0 || u > 1.001) return 0;
      return 9 * Math.pow(Math.sin(Math.PI * (0.06 + 0.84 * u)), 0.8);
    };
    // crumple lobes jutting 8-14 px out of each side, 10-18 px tall, alternating side to side
    const lobes = [];
    if (folds) {
      const span = sk.sR - sk.sC;
      const nL = span < 60 ? 0 : span < 150 ? 3 : 4;
      const rl = L.rng(seed + 7300 + st.d * 11);
      for (let q = 0; q < nL * 2; q++) {
        const sg = q % 2 ? -1 : 1;
        const u = 0.1 + (0.74 * (q + 0.5)) / (nL * 2) + rl.range(-0.03, 0.03);
        lobes.push({ sg, s: sk.sC + u * span, amp: rl.range(8, 14), half: rl.range(5, 9) });
      }
    }
    const lobeAt = (s, sg) => {
      let z = 0;
      for (const lb of lobes) {
        if (lb.sg !== sg) continue;
        const d = Math.abs(s - lb.s) / lb.half;
        if (d < 1) z = Math.max(z, lb.amp * Math.pow(1 - d * d, 0.55));
      }
      return z;
    };
    const sideHW = (f, sg) => {
      let h = f.hw;
      if (skin) {
        if (folds && f.s > sk.sC + 0.01) h -= knotAt(sg > 0 ? zigP : zigN, f.s) - lobeAt(f.s, sg);
        if (slit && sg === lamD) h += bulgeAt(f.s);
      }
      return h;
    };
    const edge = (f, sg) => {
      const h = sideHW(f, sg);
      return [f.x + f.nx * sg * h, f.y + f.ny * sg * h];
    };

    // ---- outline polygon ----
    const NS = 140;
    const F = [];
    const sideF = [];
    if (!skin) {
      for (let i = 0; i <= NS; i++) F.push(at((i / NS) * mEnd));
      for (const f of F) sideF.push(f);
    } else {
      const nI = Math.max(1, Math.ceil(sk.sC / 5));
      if (sk.sC > 0) for (let i = 0; i <= nI; i++) sideF.push(atS((i / nI) * sk.sC));
      else sideF.push(at(0));
      for (let s = sk.sC + 1.5; s < sk.sR; s += 1.5) sideF.push(atS(s));
      sideF.push(atS(sk.sR));
    }
    const poly = [];
    for (const f of sideF) poly.push(edge(f, 1));
    const fr = sideF[sideF.length - 1];
    const rimPts = [];
    if (skin) {
      // torn rim: ragged teeth pointing toward the head
      const hP = sideHW(fr, 1), hN = sideHW(fr, -1);
      const nT = Math.max(9, Math.round((hP + hN) / 7));
      for (let i = 1; i < nT; i++) {
        const lam = lerp(hP, -hN, i / nT) / fr.hw + rr.range(-0.02, 0.02);
        const z = i % 2 ? rr.range(6, 12) : rr.range(-2, 3);
        const p = tube(fr, lam, BOW * 0.8, z);
        poly.push(p);
        rimPts.push(p);
      }
    } else {
      for (let i = 1; i < 8; i++) poly.push(tube(fr, 1 - (2 * i) / 8, 0.35));
    }
    for (let i = sideF.length - 1; i >= 0; i--) poly.push(edge(sideF[i], -1));
    const F0 = sideF[0];
    for (let i = 1; i < 6; i++) poly.push(tube(F0, -1 + (2 * i) / 6, -0.2));
    if (outlineOnly) {
      let head = null;
      if (!skin) {
        const hf = lineAt(C, sOf(1) + g.headOff);
        head = [hf.x, hf.y];
      }
      return { poly, head };
    }

    // ---- behind the body: far filaments, legs, prolegs ----
    const vis = clamp((Math.abs(st.roll) - 0.5) / 0.5);
    const farCol = L.mix(P.veinBlack, P.inkSoft, 0.35);
    const fil = (name, dm, len, w, toward, col, near) => {
      const f = at(segMid(name) + dm);
      const crushed = skin && folds && f.s > sk.sC;
      const el = sideHW(f, lamD) / f.hw;
      const base = tube(f, lamD * el * (near ? 0.9 : 0.6), 0);
      const tilt = toward > 0 ? 0.3 : -0.35;
      const dx = f.nx * lamD * Math.cos(tilt) + f.tx * toward * Math.sin(tilt);
      const dy = f.ny * lamD * Math.cos(tilt) + f.ty * toward * Math.sin(tilt);
      const fSeed = seed + Math.round(dm * 1000) + len + (near ? 0 : 3571) + (crushed ? st.d : 0);
      if (crushed && name === 'T2') {
        if (st.d === 12) {
          // just split: the pair hangs down beside the rim, pulled in against the body
          filament(ctx, L, P, base[0], base[1], dx, dy, len * 0.62, w * 0.9, fSeed, b, 0.3, 0.5, col);
        } else {
          // worked up with the skin: a crushed stub sticking out 40-60 px with sharp kinks
          kinkedFilament(ctx, L, P, base[0], base[1], dx, dy, near ? 56 : 44, w * 0.85, fSeed, b, col);
        }
        return;
      }
      const lim = crushed ? 0.6 : skin ? 0.9 : 1;
      const T2 = name === 'T2';
      const droop = toward > 0 ? (skin ? 0.16 : 0.3) : 0.34;
      // the far front filament splays 16 px away from the near one at its tip
      const splay = T2 && !near && !skin ? [-f.nx * lamD * 16, -f.ny * lamD * 16] : null;
      filament(ctx, L, P, base[0], base[1], dx, dy, len * lim, w * (crushed ? 0.85 : 1), fSeed, b, crushed ? 0.6 : skin ? 0.36 : 0.55, droop, col, splay);
    };
    fil('T2', 0.006, 150, 6, 1, farCol, false);
    fil('A8', 0.006, 60, 5, -1, farCol, false);

    const showLegs = !skin || sk.legs;
    const legPath = (name, far) => {
      const f = at(segMid(name) + (far ? 0.005 : -0.004));
      const vx = f.nx * lamV, vy = f.ny * lamV;
      const lg = (20 + 3 * segIdx(name) - 30) * vis * (skin ? 0.8 : 1);
      if (lg <= 1) return;
      const base = tube(f, lamV * 0.78, 0);
      const out = f.hw * 0.22;
      const droop = skin ? 0.35 : 0;
      const j1 = [base[0] + vx * (out + lg * 0.45) + f.tx * lg * (0.12 + droop), base[1] + vy * (out + lg * 0.45) + f.ty * lg * (0.12 + droop)];
      const tip = [j1[0] + vx * lg * 0.3 + f.tx * lg * (0.5 + droop), j1[1] + vy * lg * 0.3 + f.ty * lg * (0.5 + droop)];
      L.inkPath(ctx, [base, j1, tip], { width: far ? 6 : 8, color: far ? farCol : P.veinBlack, taper: [0, 18], minWidth: 0.25, swell: 0, smooth: false, seed: seed + 200 + segIdx(name) * 3 + (far ? 1 : 0) });
      ctx.save();
      ctx.fillStyle = P.bandWhite;
      ctx.globalAlpha = far ? 0.3 : 0.6;
      ctx.beginPath();
      ctx.arc(j1[0], j1[1], 1.5, 0, TAU);
      ctx.fill();
      ctx.restore();
    };
    const proleg = (name, far) => {
      const f = at(segMid(name) + (far ? 0.007 : -0.004));
      const vx = f.nx * lamV, vy = f.ny * lamV;
      const pl = 13 * vis * (skin ? 0.7 : 1);
      if (pl <= 1) return;
      const bw = 10 * (skin ? 0.8 : 1);
      const base = tube(f, lamV * 0.72, 0);
      const out = f.hw * 0.28 + pl;
      const P0 = (u, w) => [base[0] + vx * out * u + f.tx * w, base[1] + vy * out * u + f.ty * w];
      const pts = [P0(0, -bw), P0(0.72, -bw * 0.92), P0(0.94, -bw * 0.6), P0(1.02, 0), P0(0.94, bw * 0.6), P0(0.72, bw * 0.92), P0(0, bw)];
      L.inkPath(ctx, pts, { closed: true, width: 2, fill: far ? farCol : L.mix(P.veinBlack, P.inkSoft, 0.15), seed: seed + 300 + segIdx(name) * 3 + (far ? 1 : 0), wobble: 0.5 });
      if (!far) {
        const sp = P0(0.8, -2);
        ctx.save();
        ctx.fillStyle = P.spotWhite;
        ctx.beginPath();
        ctx.arc(sp[0], sp[1], 3, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = P.tan;
        ctx.lineWidth = 1.1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let k = -3; k <= 3; k++) {
          const q = P0(1.0, k * 2.2);
          ctx.moveTo(q[0], q[1]);
          ctx.lineTo(q[0] + vx * 3.5, q[1] + vy * 3.5);
        }
        ctx.stroke();
        ctx.restore();
      }
    };
    if (showLegs) {
      for (const nm of ['T1', 'T2', 'T3']) legPath(nm, true);
      for (const nm of ['A3', 'A4', 'A5', 'A6']) proleg(nm, true);
      for (const nm of ['A3', 'A4', 'A5', 'A6']) proleg(nm, false);
      for (const nm of ['T1', 'T2', 'T3']) legPath(nm, false);
    }

    // ---- body fill, bands, rings, tone (clipped) ----
    const mSmooth = skin ? sk.mC : mEnd;
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, poly, true);
    ctx.fillStyle = skin ? L.mix(P.bandWhite, P.tan, 0.12) : P.bandWhite;
    ctx.fill();
    ctx.clip();
    const pk = new Path2D(), py = new Path2D(), sheen = new Path2D();
    const whiteShade = [];
    let bi = 0;
    for (let si = 0; si < 13; si++) {
      const m0 = SEG_B[si], m1 = SEG_B[si + 1];
      if (m0 >= mSmooth) break;
      let acc = 0;
      for (let q = 0; q < BANDS.length; q++) {
        const col = BANDS[q][0];
        const a = m0 + (m1 - m0) * acc;
        const e = m0 + (m1 - m0) * (acc + BANDS[q][1]);
        acc += BANDS[q][1];
        bi++;
        if (a >= mSmooth) continue;
        if (col === 'w') {
          // the shadow half of each white band, for its own 45 degree hatch
          const fa = at(a), fb = at(Math.min(e, mSmooth)), fm = at((a + Math.min(e, mSmooth)) / 2);
          const sd = (fm.nx + fm.ny) / Math.SQRT2 >= 0 ? 1 : -1;
          whiteShade.push(ring(fa, sd * 0.1, sd * 1.4, 6, BOW).concat(ring(fb, sd * 1.4, sd * 0.1, 6, BOW)));
          continue;
        }
        const fa = at(a), fb = at(e);
        const za = (lam) => 1.2 * L.noise1(lam * 2.2 + bi * 3.7, seed + 5) + 0.5 * L.noise1(lam * 3 + bi, seed + b * 3);
        const zb = (lam) => 1.2 * L.noise1(lam * 2.2 + (bi + 1) * 3.7, seed + 5) + 0.5 * L.noise1(lam * 3 + bi + 1, seed + b * 3);
        const rA = ring(fa, -1.4, 1.4, 10, BOW, za), rB = ring(fb, 1.4, -1.4, 10, BOW, zb);
        const p = col === 'k' ? pk : py;
        const all = rA.concat(rB);
        p.moveTo(all[0][0], all[0][1]);
        for (let k = 1; k < all.length; k++) p.lineTo(all[k][0], all[k][1]);
        p.closePath();
        // velvet sheen: short ticks along the ring's bow, upper-left quarter of each black band only
        if (col === 'k') {
          const nT = 2 + Math.floor(L.h3(bi, 3, seed + 60) * 3);
          for (let q2 = 0; q2 < nT; q2++) {
            const u = 0.22 + 0.3 * L.h3(bi, q2, seed + 61);
            const f = at(lerp(a, e, u));
            const dd = (f.nx + f.ny) / Math.SQRT2;
            const lit = dd >= 0 ? -1 : 1;
            const lam = lit * (0.34 + 0.15 * q2 + 0.1 * (L.h3(q2, bi, seed + 62) - 0.5));
            const lenPx = 3 + 3 * L.h3(bi, q2, seed + 63);
            const dl = lenPx / 2 / f.hw;
            const p0 = tube(f, lam - dl, BOW), p1 = tube(f, lam + dl, BOW);
            const jb = (L.h3(bi + q2, b, seed + 64) - 0.5) * 0.6;
            sheen.moveTo(p0[0] + f.tx * jb, p0[1] + f.ty * jb);
            sheen.lineTo(p1[0] + f.tx * jb, p1[1] + f.ty * jb);
          }
        }
      }
    }
    ctx.fillStyle = P.bandYellow;
    ctx.fill(py);
    ctx.fillStyle = P.veinBlack;
    ctx.fill(pk);
    // the rear (A10) is solid black where it clasps the pad, and so is the collar tucked under the head
    {
      const fa = at(0), fb = at(SEG_B[1] * 0.6);
      const all = ring(fa, -1.4, 1.4, 6, -0.3).concat(ring(fb, 1.4, -1.4, 6, BOW));
      ctx.beginPath();
      L.tracePath(ctx, all, true);
      if (!skin) {
        const fc = at(0.992), fd = at(M_END);
        const col = ring(fc, -1.3, 1.3, 8, BOW).concat(ring(fd, 1.3, -1.3, 8, 0.6));
        L.tracePath(ctx, col, true);
      }
      ctx.fill();
    }

    // contour hatching on the shadow side (light from the upper left), following the rings
    const hp = new Path2D(), hp2 = new Path2D(), hp3 = new Path2D();
    const sEnd = skin ? sk.sC : sOf(mEnd);
    const count = Math.floor(sEnd / (!skin && st.d <= 7 ? 3.5 : 5)); // twice the strokes on the J
    for (let i = 0; i < count; i++) {
      const m = ((i + 0.5) / count) * mSmooth;
      const f = at(m);
      const dd = (f.nx + f.ny) / Math.SQRT2;
      const side = dd >= 0 ? 1 : -1;
      const j1 = L.h3(i, b, seed + 41) - 0.5, j2 = L.h3(b, i, seed + 42) - 0.5;
      const la = side * clamp(0.12 + 0.4 * (1 - Math.abs(dd)) + 0.18 * j1, 0, 0.9);
      const lb = side * 1.08;
      const p0 = tube(f, la, BOW), p2 = tube(f, lb, BOW), pm = tube(f, (la + lb) / 2, BOW * 1.2);
      const sh = j2 * 2;
      hp.moveTo(p0[0] + f.tx * sh, p0[1] + f.ty * sh);
      hp.quadraticCurveTo(pm[0], pm[1], p2[0] - f.tx * sh, p2[1] - f.ty * sh);
      if (i % 2 === 0) {
        const lc = side * (0.58 + 0.12 * j2);
        const q0 = tube(f, lc, BOW, -5), q2 = tube(f, side * 1.08, 0, 5);
        hp2.moveTo(q0[0], q0[1]);
        hp2.lineTo(q2[0], q2[1]);
      }
      if (i % 3 === 0) {
        const lc = side * (0.8 + 0.08 * j1);
        const q0 = tube(f, lc, BOW, 5), q2 = tube(f, side * 1.08, 0, -4);
        hp3.moveTo(q0[0], q0[1]);
        hp3.lineTo(q2[0], q2[1]);
      }
    }
    ctx.lineCap = 'round';
    ctx.strokeStyle = P.ink;
    ctx.globalAlpha = 0.72;
    ctx.lineWidth = 1.35;
    ctx.stroke(hp);
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1.2;
    ctx.stroke(hp2);
    ctx.stroke(hp3);
    ctx.globalAlpha = 1;

    // the white bands darken on their shadow half: inkSoft, 45 degrees, 8 px
    if (whiteShade.length) {
      L.hatch(ctx, whiteShade, {
        angle: -Math.PI / 4, spacing: 8, width: 1.3, color: P.inkSoft, alpha: 0.6, length: [6, 18], gap: [2, 5], seed: seed + 45, clip: true, inset: 1, overshoot: 2,
      });
    }
    // deep shadow: a 105 degree cross layer, 7 px, over the shadow 30 percent and the J's curl
    if (sEnd > 20) {
      const CS = 4;
      let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9;
      for (const p of poly) {
        if (p[0] < bx0) bx0 = p[0];
        if (p[0] > bx1) bx1 = p[0];
        if (p[1] < by0) by0 = p[1];
        if (p[1] > by1) by1 = p[1];
      }
      bx0 -= 8;
      by0 -= 8;
      const GW = Math.ceil((bx1 - bx0 + 16) / CS), GH = Math.ceil((by1 - by0 + 16) / CS);
      const grid = new Uint8Array(GW * GH);
      const mark = (x, y) => {
        const gx = Math.floor((x - bx0) / CS), gy = Math.floor((y - by0) / CS);
        for (let oy = 0; oy <= 1; oy++) {
          for (let ox = 0; ox <= 1; ox++) {
            const X = gx + ox, Y = gy + oy;
            if (X >= 0 && Y >= 0 && X < GW && Y < GH) grid[Y * GW + X] = 1;
          }
        }
      };
      const nS = Math.ceil(sEnd / 3);
      let any = false;
      for (let i = 0; i <= nS; i++) {
        const f = at((i / nS) * mSmooth);
        const curl = Math.abs(f.th - HALF_PI) > 40 * DEG;
        const sd = (f.nx + f.ny) / Math.SQRT2 >= 0 ? 1 : -1;
        for (let lam = -1.16; lam <= 1.161; lam += 0.07) {
          const on = curl ? lam > -0.02 || lam < -0.55 : sd * lam > 0.7;
          if (!on) continue;
          const p = tube(f, lam, BOW);
          mark(p[0], p[1]);
          any = true;
        }
      }
      if (any) {
        L.hatch(ctx, poly, {
          angle: -105 * DEG, spacing: 7, width: 1.3, color: P.ink, alpha: 0.7, length: [10, 30], gap: [2, 6], seed: seed + 46,
          density: (x, y) => {
            const gx = Math.floor((x - bx0) / CS), gy = Math.floor((y - by0) / CS);
            return gx >= 0 && gy >= 0 && gx < GW && gy < GH ? grid[gy * GW + gx] : 0;
          },
        });
      }
    }

    L.stipple(ctx, poly, {
      spacing: 7, r: [0.8, 1.5], color: P.ink, alpha: 0.5, seed: seed + 50,
      density: (x, y) => (skin && y > PY + sk.sC ? 0 : clamp(((x - PX) * 0.8 + (y - 820) * 0.25) / 90 - 0.1) * 0.8),
    });

    ctx.strokeStyle = P.white;
    ctx.globalAlpha = 0.33;
    ctx.lineWidth = 1;
    ctx.stroke(sheen);
    ctx.globalAlpha = 1;

    // segment rings
    for (let si = 1; si < 13; si++) {
      if (SEG_B[si] >= mSmooth - 0.004) break;
      const f = at(SEG_B[si]);
      L.inkPath(ctx, ring(f, -1, 1, 10, BOW), { width: 1.8, color: P.inkSoft, alpha: skin ? 0.75 : 0.9, seed: seed + 100 + si, taper: [6, 6], wobble: 0.6 });
    }
    // spiracles: black ovals ringed in white, in the first white band of T1 and A1 to A8
    for (const nm of ['T1', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8']) {
      const i = segIdx(nm);
      const m = SEG_B[i] + (SEG_B[i + 1] - SEG_B[i]) * 0.3;
      if (m >= mSmooth) continue;
      const f = at(m);
      const p = tube(f, lamV * 0.4, BOW);
      ctx.save();
      ctx.translate(p[0], p[1]);
      ctx.rotate(f.th);
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.2, 5.4, 0, 0, TAU);
      ctx.fillStyle = P.spotWhite;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(0, 0, 3, 4, 0, 0, TAU);
      ctx.fillStyle = P.veinBlack;
      ctx.fill();
      ctx.restore();
    }

    // ---- the bunched folds: an accordion of old segments ----
    if (folds) {
      const fC = atS(sk.sC), fR = atS(sk.sR);
      const reg = ring(fC, -1.9, 1.9, 12, sk.mC > 0 ? BOW : -0.3);
      reg.push(tube(fR, 1.9, 0, 40), tube(fR, -1.9, 0, 40));
      ctx.beginPath();
      L.tracePath(ctx, reg, true);
      ctx.fillStyle = P.veinBlack;
      ctx.fill();
      const r2 = L.rng(seed + 7100 + st.d * 7);
      // a point in fold k: lam across the body, u down the fold (0 at its upper valley, 1 at its lower)
      const foldPt = (k, lam, u, z) => {
        const fa = folds[k], fb = folds[k + 1];
        const w = (lam + 1) / 2;
        const sTop = fa.s + lerp(fa.oN, fa.oP, w), sBot = fb.s + lerp(fb.oN, fb.oP, w);
        const f = atS(lerp(sTop, sBot, u));
        return tube(f, lam, lerp(fa.bow, fb.bow, u), z || 0);
      };
      const addLine = (path, pts, close) => {
        path.moveTo(pts[0][0], pts[0][1]);
        for (let q = 1; q < pts.length; q++) path.lineTo(pts[q][0], pts[q][1]);
        if (close) path.closePath();
      };
      const bands = new Map();
      const upper = new Path2D(), ridgeHi = new Path2D(), tick = new Path2D(), crease = new Path2D(), wrinkle = new Path2D();
      for (let k = 0; k < folds.length - 1; k++) {
        const fa = folds[k];
        const hgt = folds[k + 1].s - fa.s;
        const hwK = atS(fa.s + hgt / 2).hw;
        const ma = mOfS(fa.s), mb = mOfS(folds[k + 1].s);
        const rk = fa.rk;
        // the upper face of the fold: black, not brown, only on the shadow side (lam > 0.3)
        {
          const top = [], bot = [];
          const l1 = Math.max(0.3, r2.range(0.3, 0.55));
          for (let q = 0; q <= 8; q++) {
            const lam = lerp(1.25, l1, q / 8);
            top.push(foldPt(k, lam, 0.04));
            bot.push(foldPt(k, lam, rk * lerp(1, 0.55, (q / 8) ** 2)));
          }
          addLine(upper, top.concat(bot.reverse()), true);
          const hi = [];
          const l2 = r2.range(0.0, 0.5);
          for (let q = 0; q <= 5; q++) hi.push(foldPt(k, lerp(1.05, l2, q / 5), rk, (L.h3(k, q, seed + 81) - 0.5) * 1.5));
          addLine(ridgeHi, hi);
        }
        // the squeezed band pattern: the yellow and white bands of this stretch of skin, as broken wavy pieces
        const rows = [];
        for (let si = 0; si < 13; si++) {
          const m0 = SEG_B[si], m1 = SEG_B[si + 1];
          if (m1 <= ma || m0 >= mb) continue;
          let acc = 0;
          for (const [col, bw] of BANDS) {
            const bc = m0 + (m1 - m0) * (acc + bw / 2);
            acc += bw;
            if (col === 'k' || bc < ma || bc >= mb) continue;
            rows.push({ col, u: (bc - ma) / (mb - ma), thick: clamp((((m1 - m0) * bw) / (mb - ma)) * hgt, 1.8, 3.6) });
          }
        }
        const keep = rows.filter((r) => r.u > 0.14 && r.u < 0.88).sort((a, b) => Math.abs(a.u - rk) - Math.abs(b.u - rk)).slice(0, hgt > 20 ? 3 : 2);
        // one continuous yellow band and one white band per fold, 65-85% of the width
        {
          const spanLam = r2.range(0.65, 0.85) * 2.2;
          const lam0 = r2.range(-1.08, 1.08 - spanLam);
          const lam1 = lam0 + spanLam;
          const uY = clamp(rk * r2.range(0.32, 0.62), 0.14, 0.82);
          const uW = clamp(uY + r2.range(0.1, 0.22), 0.16, 0.9);
          const yPts = [], wPts = [];
          for (let q = 0; q <= 8; q++) {
            const t = q / 8;
            yPts.push(foldPt(k, lerp(lam0, lam1, t), uY + ((q === 2 || q === 6) ? r2.range(-0.04, 0.04) : 0)));
            wPts.push(foldPt(k, lerp(lam0, lam1, t), uW + ((q === 3 || q === 5) ? r2.range(-0.04, 0.04) : 0)));
          }
          if (!bands.has('yC')) bands.set('yC', new Path2D());
          if (!bands.has('wC')) bands.set('wC', new Path2D());
          addLine(bands.get('yC'), yPts);
          addLine(bands.get('wC'), wPts);
        }
        for (const row of keep) {
          let lam = 1.1 - r2.range(0, 0.35);
          while (lam > -1.1) {
            const lenPx = r2.range(6, 20);
            const lamB = Math.max(-1.12, lam - lenPx / hwK);
            if (r2() > 0.3) {
              const u0 = clamp(row.u + r2.range(-0.12, 0.12), 0.08, 0.92), u1 = clamp(u0 + r2.range(-0.14, 0.14), 0.08, 0.92);
              const pts = [];
              for (let q = 0; q <= 3; q++) pts.push(foldPt(k, lerp(lam, lamB, q / 3), lerp(u0, u1, q / 3) + (q === 1 || q === 2 ? r2.range(-0.05, 0.05) : 0)));
              const um = (u0 + u1) / 2, lm = (lam + lamB) / 2;
              const shade = lm < -0.3 || um > rk + 0.08 ? 's' : '';
              const key = row.col + shade + (row.thick > 2.6 ? 'T' : 't');
              if (!bands.has(key)) bands.set(key, new Path2D());
              addLine(bands.get(key), pts);
            }
            lam = lamB - r2.range(4, 14) / hwK;
          }
        }
        // velvet ticks on the lit ridge
        for (let q = 0; q < 2; q++) {
          const lam = 0.36 + 0.28 * q + r2.range(-0.08, 0.08);
          const dl = r2.range(3, 6) / hwK / 2;
          const uu = rk * r2.range(0.45, 0.8);
          addLine(tick, [foldPt(k, lam + dl, uu), foldPt(k, lam - dl, uu)]);
        }
        // a diagonal wrinkle running into the valley below
        if (hgt > 13 && r2() < 0.6) {
          const l0 = r2.range(-0.6, 0.8), l1 = l0 + r2.sign() * r2.range(0.1, 0.25);
          addLine(wrinkle, [foldPt(k, l0, rk), foldPt(k, (l0 * 2 + l1) / 3, rk + (1 - rk) * 0.5), foldPt(k, l1, 0.98)]);
        }
      }
      // creases along the inner valleys, 3 px, in two or three runs
      for (let k = 1; k < folds.length - 1; k++) {
        const hwK = atS(folds[k].s).hw;
        let lam = 1.12;
        while (lam > -1.12) {
          const lamE = Math.max(-1.12, lam - r2.range(18, 64) / hwK);
          const edgeRun = lam > 1 || lamE < -1;
          const du = edgeRun ? 0 : r2.range(-0.12, 0.12);
          const pts = [];
          for (let q = 0; q <= 5; q++) {
            const kk = du < 0 ? k - 1 : k;
            const uu = du < 0 ? 1 + du * (1 - Math.abs(q / 5 - 0.5)) : du * (1 - Math.abs(q / 5 - 0.5));
            pts.push(foldPt(kk, lerp(lam, lamE, q / 5), uu, (L.h3(k * 7 + q, Math.round(lam * 10), seed + st.d) - 0.5) * 2.4));
          }
          addLine(crease, pts);
          lam = lamE - r2.range(5, 18) / hwK;
        }
      }
      for (let k = 0; k < folds.length - 1; k++) {
        if (r2() > 0.55) continue;
        const hwK = atS(folds[k].s).hw;
        const l0 = r2.range(-0.8, 0.9), l1 = l0 - r2.range(18, 40) / hwK;
        const u0 = r2.range(0.4, 0.72), u1 = clamp(u0 + r2.range(-0.25, 0.25), 0.2, 0.9);
        addLine(crease, [foldPt(k, l0, u0), foldPt(k, (l0 + l1) / 2, (u0 + u1) / 2 + 0.05), foldPt(k, l1, u1)]);
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.fillStyle = L.mix(P.veinBlack, P.bark, 0.55);
      ctx.globalAlpha = 0.25;
      ctx.fill(upper);
      ctx.globalAlpha = 1;
      const colOf = { y: P.bandYellow, ys: L.mix(P.bandYellow, P.ink, 0.45), w: P.bandWhite, ws: L.mix(P.bandWhite, P.ink, 0.5) };
      if (bands.has('yC')) {
        ctx.strokeStyle = P.bandYellow;
        ctx.lineWidth = 4.6;
        ctx.stroke(bands.get('yC'));
        bands.delete('yC');
      }
      if (bands.has('wC')) {
        ctx.strokeStyle = P.bandWhite;
        ctx.lineWidth = 3.5;
        ctx.stroke(bands.get('wC'));
        bands.delete('wC');
      }
      for (const [key, path] of bands) {
        ctx.strokeStyle = colOf[key.slice(0, key.length - 1)];
        ctx.lineWidth = key.endsWith('T') ? 3.1 : 2.2;
        ctx.stroke(path);
      }
      ctx.strokeStyle = L.mix(P.tan, P.bandWhite, 0.25);
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 1.3;
      ctx.stroke(ridgeHi);
      ctx.strokeStyle = P.white;
      ctx.globalAlpha = 0.33;
      ctx.lineWidth = 1;
      ctx.stroke(tick);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = P.ink;
      ctx.lineWidth = 2.4;
      ctx.stroke(wrinkle);
      ctx.lineWidth = 3;
      ctx.stroke(crease);
      // shadow side: 45 degree hatching over the band pieces
      L.hatch(ctx, reg, {
        angle: -Math.PI / 4, spacing: 4.5, width: 1.3, color: P.veinBlack, alpha: 0.8, length: [6, 16], seed: seed + 7200 + st.d,
        density: (x, y) => clamp((x - PX - 10) / 40),
      });
    }
    ctx.restore();

    // ---- near filaments in front ----
    fil('T2', -0.004, 184, 7, 1, null, true);
    fil('A8', -0.004, 68, 6, -1, null, true);

    // ---- outline ----
    if (skin) {
      L.inkPath(ctx, poly, { closed: true, width: 5, seed: seed + 1, wobble: 0.7 });
      // the torn rim's cut edge catches a little light on the lit side
      if (rimPts.length > 4) {
        const half = rimPts.slice(0, Math.ceil(rimPts.length * 0.55)).map((p) => [p[0], p[1] - 4]);
        L.inkPath(ctx, half, { width: 1.4, color: P.tan, alpha: 0.75, seed: seed + 2, taper: [6, 10], wobble: 0.4 });
      }
    } else {
      L.inkPath(ctx, poly, { closed: true, width: 5, seed: seed + 1, wobble: 1.1, double: { offset: 4, alpha: 0.4, from: 0.08, to: 0.4 } });
    }

    // anal claspers gripping the pad
    for (const side of [-1, 1]) {
      const f = at(0.01);
      const p = tube(f, side * 0.95, 0);
      L.inkPath(ctx, L.ellipsePts(p[0] + side * 4, p[1] - 5, 8, 10, 16), { closed: true, width: 2, fill: P.veinBlack, seed: seed + 400 + side });
    }

    // ---- shrivelled prolegs and true legs sticking out of the folds ----
    if (folds && !sk.legs) {
      for (const nm of ['A4', 'A5']) {
        const m = segMid(nm);
        if (sOf(m) <= sk.sC + 2 || sOf(m) >= sk.sR - 4) continue;
        const f = at(m);
        const h = sideHW(f, lamV);
        const vx = f.nx * lamV, vy = f.ny * lamV;
        const bx0 = f.x + vx * (h + 6), by0 = f.y + vy * (h + 6);
        const pts = [];
        for (let q = 0; q <= 10; q++) {
          const a = (q / 10) * Math.PI - HALF_PI;
          pts.push([bx0 + vx * Math.cos(a) * 10 + f.tx * Math.sin(a) * 6.5, by0 + vy * Math.cos(a) * 10 + f.ty * Math.sin(a) * 6.5]);
        }
        L.inkPath(ctx, pts, { closed: true, width: 1.8, fill: P.veinBlack, seed: seed + 440 + segIdx(nm), wobble: 0.3 });
        ctx.fillStyle = P.spotWhite;
        ctx.beginPath();
        ctx.arc(bx0 + vx * 5.5 - f.tx * 1.5, by0 + vy * 5.5 - f.ty * 1.5, 2.2, 0, TAU);
        ctx.fill();
      }
    }

    // ---- the tear on the dorsal side ----
    if (slit) {
      const ext = pupaHW(g, sk.sR + 14, st.cp) > 0.7 * atS(sk.sR).hw + sk.slit / 2 + 2;
      drawSlit(ctx, L, P, st, atS, slit, sk, lamD, seed + 500, ext);
    }

    // ---- the head sits in front of the collar ----
    if (!skin) {
      const hf = lineAt(C, sOf(1) + g.headOff);
      drawHead(ctx, L, P, hf.x, hf.y, hf.th, lamV, seed + 600);
    } else if (st.d === 12) {
      // one black cap, ~50 px, tilted 35 deg, slid 14 px toward the ventral side
      const f = fr;
      const p = tube(f, lamV * 0.55, BOW);
      const hx = p[0] + f.tx * 8 + f.nx * lamV * 14, hy = p[1] + f.ty * 8 + f.ny * lamV * 14;
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(f.th + 35 * DEG * lamV);
      L.inkPath(ctx, L.ellipsePts(0, 0, 25, 23, 32), { closed: true, width: 3, fill: P.veinBlack, seed: seed + 620 + st.d, wobble: 0.5 });
      ctx.beginPath();
      ctx.moveTo(-8, -11);
      ctx.lineTo(-8, 11);
      ctx.lineTo(16, 0);
      ctx.closePath();
      ctx.fillStyle = P.bandYellow;
      ctx.fill();
      ctx.strokeStyle = P.bandWhite;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-14, -17);
      ctx.quadraticCurveTo(4, -14, 20, -2);
      ctx.stroke();
      ctx.restore();
    } else {
      // later drawings: a half-hidden cap in the last fold
      const f = fr;
      const side = lamV;
      const hs = st.d <= 14 ? 1 : 0.75;
      const p = tube(f, side * 0.72, BOW);
      const hx = p[0] + f.tx * 12 + f.nx * side * 10, hy = p[1] + f.ty * 12 + f.ny * side * 10;
      const half = [];
      for (let k = 0; k <= 10; k++) {
        const a = f.th + side * 0.55 - HALF_PI + (k / 10) * Math.PI;
        half.push([hx + Math.cos(a) * 17 * hs, hy + Math.sin(a) * 14 * hs]);
      }
      L.inkPath(ctx, half, { closed: true, width: 3, fill: P.veinBlack, seed: seed + 620 + side + st.d });
      L.inkPath(ctx, [[hx + f.tx * 2 + f.nx * side * 4, hy + f.ty * 2 + f.ny * side * 4], [hx + f.tx * 10 + f.nx * side * 9, hy + f.ty * 10 + f.ny * side * 9]], { width: 2.4, color: P.bandWhite, alpha: 0.9, seed: seed + 630 + side, taper: [2, 4] });
    }
    return { at, sOf, rimY: fr.y + 6 };
  }

  // the dorsal tear: jade bulging through, black lips with jagged teeth curling outward
  function drawSlit(ctx, L, P, st, atS, slit, sk, lamD, seed, ext) {
    const n = 18;
    const rs = L.rng(seed + st.d * 5);
    const S = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const f = atS(lerp(slit.top, sk.sR, u));
      S.push({ f, half: (slit.W / 2) * Math.pow(Math.sin(HALF_PI * Math.min(1, u * 1.7)), 0.7), jA: rs.range(-1.2, 1.2), jB: rs.range(-1.2, 1.2), tooth: u < 0.4 ? rs.range(3, 4) : rs.range(6, 8) });
    }
    // a point beside the tear: sg +1 on its outer (dorsal) edge, -1 on its inner edge, extra px further out
    const at = (i, sg, extra, z) => {
      const { f, half } = S[i];
      return tube(f, slit.lc + (sg * lamD * (half + extra)) / f.hw, 0, z || 0);
    };
    const A = S.map((q, i) => at(i, 1, i ? q.jA : 0)), B = S.map((q, i) => at(i, -1, i ? q.jB : 0));
    const open = A.concat([at(n, 1, 0, ext ? 16 : 3), at(n, -1, 0, ext ? 16 : 3)], B.slice().reverse());
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, open, true);
    ctx.fillStyle = L.mix(P.chrysalis, P.bandWhite, 0.35);
    ctx.fill();
    ctx.clip();
    // the bulging pupa: light along the lit lip, a deeper line along the other, segment arcs across
    const hl = [], dk = [];
    for (let i = 5; i <= n; i++) {
      hl.push(at(i, 1, -S[i].half * 0.4));
      dk.push(at(i, -1, -S[i].half * 0.32));
    }
    L.inkPath(ctx, hl, { width: 2.6, color: P.white, alpha: 0.85, seed: seed + 1, taper: [10, 4], wobble: 0.4 });
    L.inkPath(ctx, dk, { width: 1.8, color: P.chrysalisDeep, alpha: 0.9, seed: seed + 2, taper: [10, 4], wobble: 0.4 });
    for (const u of [0.42, 0.62, 0.82]) {
      const i = Math.round(u * n);
      const { f, half } = S[i];
      const pts = [];
      for (let q = 0; q <= 4; q++) {
        const e = lerp(-1, 1, q / 4);
        pts.push(tube(f, slit.lc + (lamD * half * e) / f.hw, 0, 3.5 * (1 - e * e)));
      }
      L.inkPath(ctx, pts, { width: 1.4, color: P.chrysalisDeep, alpha: 0.7, seed: seed + 3 + i, taper: [3, 3], wobble: 0.2, swell: 0 });
    }
    // ink hatching inside both lips, 5 px apart
    const hp = new Path2D();
    for (let s = slit.top + 10; s < sk.sR - 2; s += 5) {
      const u = (s - slit.top) / (sk.sR - slit.top);
      const f = atS(s);
      const half = (slit.W / 2) * Math.pow(Math.sin(HALF_PI * Math.min(1, u * 1.7)), 0.7);
      const l = Math.min(4.5, half * 0.35);
      for (const sg of [1, -1]) {
        const e = tube(f, slit.lc + (sg * lamD * (half + 1)) / f.hw, 0, -1.5);
        const i2 = tube(f, slit.lc + (sg * lamD * (half - l)) / f.hw, 0, 2.5);
        hp.moveTo(e[0], e[1]);
        hp.lineTo(i2[0], i2[1]);
      }
    }
    ctx.strokeStyle = P.ink;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.stroke(hp);
    ctx.restore();
    // the lips: black skin edges with 6-8 px teeth pointing away from the opening, curling up
    for (const [E, sg, jk] of [[A, 1, 'jA'], [B, -1, 'jB']]) {
      const outer = [];
      for (let i = n; i >= 1; i--) outer.push(at(i, sg, S[i][jk] + 4.5 + (i % 2 ? S[i].tooth : 0), i % 2 ? -3.5 : 0));
      L.inkPath(ctx, E.concat(outer), { closed: true, width: 1.6, fill: P.veinBlack, seed: seed + 10 + sg, wobble: 0.3, smooth: false });
      for (const i of [6, 11, 16]) {
        L.inkPath(ctx, [at(i, sg, 6), at(i, sg, 13, -2), at(i, sg, 15, -8)], { width: 2.2, color: P.veinBlack, seed: seed + 20 + i * sg, taper: [1, 5], wobble: 0.3 });
      }
    }
  }

  function drawHead(ctx, L, P, x, y, ang, lamV, seed) {
    const sv = lamV >= 0 ? 1 : -1; // local +y side is dorsal when sv < 0
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    // antenna stubs poke past the capsule edge on the ventral front
    L.inkPath(ctx, [[14, sv * 20], [19, sv * 26], [21, sv * 30]], { width: 2.6, color: P.veinBlack, taper: [0, 3], minWidth: 0.5, swell: 0, seed: seed + 1, wobble: 0.2 });
    ctx.fillStyle = P.spotWhite;
    ctx.beginPath();
    ctx.arc(21.5, sv * 30.5, 1.3, 0, TAU);
    ctx.fill();
    // the capsule: mostly black
    L.inkPath(ctx, L.ellipsePts(0, 0, 27, 29, 40), { closed: true, width: 5, fill: P.veinBlack, seed, wobble: 0.6 });
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(0, 0, 25, 27, 0, 0, TAU);
    ctx.clip();
    // frons: an inverted yellow triangle, base toward the crown, apex toward the mouth
    const fy = sv * 3;
    ctx.beginPath();
    ctx.moveTo(-7, fy - 11);
    ctx.lineTo(-7, fy + 11);
    ctx.lineTo(15, fy);
    ctx.closePath();
    ctx.fillStyle = P.bandYellow;
    ctx.fill();
    // two white arcs framing it, 3 px
    ctx.strokeStyle = P.bandWhite;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-13, fy - 17);
    ctx.quadraticCurveTo(4, fy - 15, 19, fy - 3);
    ctx.moveTo(-13, fy + 17);
    ctx.quadraticCurveTo(4, fy + 15, 19, fy + 3);
    ctx.stroke();
    // six stemmata near the lower lateral edge
    ctx.fillStyle = P.spotWhite;
    ctx.globalAlpha = 0.9;
    for (let k = 0; k < 6; k++) {
      const a = -1.25 + (k * 2.5) / 5;
      ctx.beginPath();
      ctx.arc(6 + Math.cos(a) * 6, sv * (19 + Math.sin(a) * 5), 1.2, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // mandible notch at the mouth
    ctx.strokeStyle = P.tan;
    ctx.lineWidth = 1.4;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(19, sv * 7);
    ctx.lineTo(25, sv * 9);
    ctx.lineTo(21, sv * 12);
    ctx.lineTo(25.5, sv * 15);
    ctx.stroke();
    ctx.restore();
    // gloss toward the light (upper left of the frame)
    const la = Math.atan2(Math.sin(ang) - Math.cos(ang), -Math.cos(ang) - Math.sin(ang));
    ctx.strokeStyle = P.white;
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, 20, la - 0.32, la + 0.32);
    ctx.stroke();
    ctx.restore();
  }

  // =====================================================================================
  // The pupa / chrysalis
  // =====================================================================================

  function pupaOutline(g, cp) {
    const len = pupaLen(cp);
    const K = 110;
    const R = [], Lf = [];
    for (let i = 0; i <= K; i++) {
      const u = i / K;
      const v = V0 + (1 - V0) * Math.sin(u * HALF_PI);
      const yl = v * len;
      const hw = i === K ? 0 : pupaHW(g, yl, cp);
      R.push([PX + hw, PY + yl]);
      Lf.push([PX - hw, PY + yl]);
    }
    const hw0 = R[0][0] - PX, y0 = R[0][1];
    const out = R.slice();
    for (let i = K - 1; i >= 0; i--) out.push(Lf[i]);
    out.push([PX - hw0 * 0.6, y0 - 4.5], [PX, y0 - 7], [PX + hw0 * 0.6, y0 - 4.5]);
    return { pts: out, len };
  }

  const RIM_DOTS = (() => {
    const out = [];
    for (let i = 0; i < 12; i++) {
      const a = lerp(-62, 62, i / 11) * DEG;
      const x = PX + 112 * Math.sin(a);
      const lam = (x - PX) / 126;
      out.push([x, 520 + 0.12 * 126 * Math.sqrt(Math.max(0, 1 - lam * lam))]);
    }
    return out;
  })();
  const SIDE_DOTS = [[450, 560], [472, 560], [608, 560], [630, 560]];
  const BOTTOM_DOTS = [495, 517.5, 540, 562.5, 585].map((x) => [x, 850 - 20 * Math.pow((x - 540) / 45, 2)]);
  const ALL_DOTS = RIM_DOTS.concat(SIDE_DOTS, BOTTOM_DOTS); // rim left to right, sides, bottom
  const DOT_CUM = [4, 7, 11, 14, 18, 21]; // dots shown on each frame from T 11.25

  function drawPupa(ctx, L, P, g, st, seed) {
    const cp = st.cp, pr = st.pr;
    const final = st.phase === 'chrysalis';
    const b = L.boil(L.T);
    const len = pupaLen(cp);
    const bx = (y) => (st.bend ? st.bend * Math.sin(Math.PI * clamp((y - PY) / len)) : 0);
    const O = pupaOutline(g, cp).pts.map(([x, y]) => [x + bx(y), y]);
    const fill = final ? P.chrysalis : L.mix(P.chrysalis, P.milkweedYoung, 0.4 * (1 - cp));
    // G3 points onto the current pupa: M mirrors the ventral features with the roll, Wg does not
    const M = (pts) => pts.map(([x, y]) => {
      const q = onPupa(g, cp, PX + (x - PX) * pr, y);
      return [q[0] + bx(q[1]), q[1]];
    });
    const Wg = (pts) => pts.map(([x, y]) => {
      const q = onPupa(g, cp, x, y);
      return [q[0] + bx(q[1]), q[1]];
    });
    const hwAt = (yl) => pupaHW(g, yl, cp);
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, O, true);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.clip();

    // flat light shape on the lit (upper left) side
    {
      const hi = [];
      const n = 26;
      for (let k = 0; k <= n; k++) {
        const yl = lerp(V0 * len + 10, len * 0.9, k / n);
        hi.push([PX - hwAt(yl) * 0.86 + bx(PY + yl), PY + yl]);
      }
      for (let k = n; k >= 0; k--) {
        const yl = lerp(V0 * len + 10, len * 0.9, k / n);
        const u = k / n;
        hi.push([PX - hwAt(yl) * (0.86 - (0.5 + 0.12 * L.noise1(u * 4, seed + 9)) * Math.sin(Math.PI * Math.min(1, u * 1.15))) + bx(PY + yl), PY + yl]);
      }
      ctx.fillStyle = L.mix(fill, P.white, 0.2);
      ctx.beginPath();
      L.tracePath(ctx, L.smoothPts(hi, true, 8), true);
      ctx.fill();
    }
    // a paler wing pad on the ventral front
    const wingPad = M([[430, 560], [470, 760], [560, 890], [520, 910], [440, 880], [405, 780], [400, 640], [410, 560]]);
    ctx.fillStyle = L.mix(fill, P.white, 0.14);
    ctx.beginPath();
    L.tracePath(ctx, L.smoothPts(wingPad, true, 8), true);
    ctx.fill();

    // contour hatching: arcs on the ring ellipses, 6-8 px apart, over the right 40 percent
    const hp = new Path2D(), hp2 = new Path2D();
    {
      let i = 0;
      for (let yl = V0 * len + 9; yl < len - 7; i++) {
        const hw = hwAt(yl);
        const v = yl / len;
        const j1 = L.h3(i, 7, seed + 1) - 0.5;
        const jb = (L.h3(i, b, seed + 2) - 0.5) * 1.2;
        if (hw > 10) {
          const la = clamp(0.22 + 0.16 * j1 - 0.08 * L.smoothstep(0.35, 0.85, v), 0.08, 0.5);
          const sag = 0.12 * hw;
          for (let k = 0; k <= 8; k++) {
            const lam = lerp(la, 1.04, k / 8);
            const y = PY + yl + sag * Math.sqrt(Math.max(0, 1 - lam * lam)) + jb;
            const x = PX + hw * lam + bx(y);
            if (k === 0) hp.moveTo(x, y);
            else hp.lineTo(x, y);
          }
        }
        yl += 7 + 2 * j1;
      }
      // a light half-tone layer, 12-14 px apart, where the lit side turns into shadow
      i = 0;
      for (let yl = V0 * len + 16; yl < len - 20; i++) {
        const hw = hwAt(yl);
        const j1 = L.h3(i, 9, seed + 4) - 0.5;
        if (hw > 30) {
          const la = -0.08 + 0.1 * j1, lb = 0.3 + 0.08 * (L.h3(i, 11, seed + 4) - 0.5);
          const sag = 0.12 * hw;
          for (let k = 0; k <= 4; k++) {
            const lam = lerp(la, lb, k / 4);
            const y = PY + yl + sag * Math.sqrt(Math.max(0, 1 - lam * lam)) + (L.h3(i, b, seed + 5) - 0.5);
            const x = PX + hw * lam + bx(y);
            if (k === 0) hp2.moveTo(x, y);
            else hp2.lineTo(x, y);
          }
        }
        yl += 13 + 2 * j1;
      }
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = P.chrysalisDeep;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 1.45;
    ctx.stroke(hp);
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.3;
    ctx.stroke(hp2);
    ctx.globalAlpha = 1;
    // shadow under the rim band
    if (st.rimInk > 0) {
      const sp = new Path2D();
      for (let x = PX - 118; x < PX + 124; x += 5) {
        const lam = (x - PX) / 126;
        const [, yy] = onPupa(g, cp, x, 523 + 0.12 * 126 * Math.sqrt(Math.max(0, 1 - lam * lam)));
        const l = 7 + 7 * clamp(lam + 0.4);
        sp.moveTo(x + bx(yy), yy + 1);
        sp.lineTo(x + 3 + bx(yy), yy + l);
      }
      ctx.strokeStyle = P.chrysalisDeep;
      ctx.globalAlpha = 0.9 * st.rimInk;
      ctx.lineWidth = 1.3;
      ctx.stroke(sp);
      ctx.globalAlpha = 1;
    }
    // cross layer at 105 degrees, 7 px, only in the lower-right core
    L.hatch(ctx, O, {
      angle: -105 * DEG, spacing: 7, width: 1.25, color: L.mix(P.chrysalisDeep, P.chrysalisDark, 0.45), alpha: 0.75, length: [14, 34], seed: seed + 8, clip: true,
      density: (x, y) => {
        const yl = y - PY;
        const hw = hwAt(yl);
        if (hw < 20) return 0;
        const lam = (x - PX - bx(y)) / hw;
        const v = yl / len;
        return L.smoothstep(0.36, 0.5, lam) * (1 - L.smoothstep(0.86, 0.96, lam)) * L.smoothstep(0.5, 0.56, v) * (1 - L.smoothstep(0.9, 0.96, v));
      },
    });
    L.stipple(ctx, O, {
      spacing: 9, r: [0.8, 1.4], color: P.chrysalisDeep, alpha: 0.45, seed: seed + 3,
      density: (x, y) => clamp((x - PX) / 150 + 0.1),
    });
    // reflected light: a 3 px lighter strip just inside the right outline
    {
      const refl = [];
      for (let k = 0; k <= 16; k++) {
        const yl = lerp(0.2, 0.92, k / 16) * len;
        refl.push([PX + hwAt(yl) - 7 + bx(PY + yl), PY + yl]);
      }
      L.inkPath(ctx, refl, { width: 3, color: L.mix(fill, P.white, 0.28), alpha: 0.85, seed: seed + 33, taper: [30, 40], swell: 0, wobble: 0.5 });
    }

    // abdominal segment rings: ellipse arcs bowing down, fading out on the lit left third
    const segRing = (yl, alpha, sd) => {
      const hw = hwAt(yl);
      if (hw < 12) return;
      const pts = [];
      for (let k = 0; k <= 14; k++) {
        const lam = lerp(-0.75, 1.02, k / 14);
        const y = PY + yl + 0.12 * hw * Math.sqrt(Math.max(0, 1 - lam * lam));
        pts.push([PX + hw * lam + bx(y), y]);
      }
      L.inkPath(ctx, pts, { width: 2.2, color: L.mix(P.chrysalisDeep, P.chrysalisDark, 0.25), alpha, seed: sd, taper: [0, 8], wobble: 0.6, swell: 0, pressure: (u) => L.smoothstep(0, 0.28, u) });
      L.inkPath(ctx, pts.slice(3, 12).map((p) => [p[0], p[1] + 2.6]), { width: 1.2, color: L.mix(P.chrysalis, P.white, 0.35), alpha: 0.7, seed: sd + 1, taper: [6, 10], wobble: 0.5, swell: 0 });
      ctx.fillStyle = P.chrysalisDeep;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.ellipse(PX + hw * 0.72 + bx(PY + yl), PY + yl + 0.12 * hw * 0.69 + 10, 2, 3, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    };
    if (final) {
      for (const ys of [352, 380, 410, 442, 476]) segRing(onPupa(g, cp, PX, ys)[1] - PY, 0.85, seed + ys);
    } else if (st.skin && st.skin.sR < 400) {
      const cap = st.rimInk > 0 ? onPupa(g, cp, PX, 505)[1] - PY : len * 0.6;
      for (let k = 0; k < 6; k++) {
        const yl = st.skin.sR + 0.07 * (hwAt(st.skin.sR) + 6) + 22 + k * 22;
        if (yl > cap) break;
        segRing(yl, 0.85, seed + 700 + k);
      }
    }

    // wing case, and the sheaths beside it
    L.inkPath(ctx, M([[430, 560], [470, 760], [560, 890]]), { width: 3, color: L.mix(P.chrysalisDeep, P.chrysalisDark, 0.35), alpha: 1, seed: seed + 20, taper: [8, 16], double: { offset: -4 * (pr >= 0 ? 1 : -1), alpha: 0.5, width: 0.4, from: 0.2, to: 0.8 } });
    L.inkPath(ctx, M([[437, 566], [476, 758], [563, 882]]), { width: 1.4, color: P.white, alpha: 0.45, seed: seed + 24, taper: [14, 20] });
    L.inkPath(ctx, M([[500, 700], [522, 790], [570, 872]]), { width: 1.5, color: P.chrysalisDeep, alpha: 0.6, seed: seed + 21, taper: [10, 14] });
    L.inkPath(ctx, M([[520, 740], [538, 800], [578, 862]]), { width: 1.3, color: P.chrysalisDeep, alpha: 0.5, seed: seed + 22, taper: [10, 14] });
    // antenna and proboscis sheaths
    L.inkPath(ctx, M([[472, 700], [482, 790], [512, 880]]), { width: 1.3, color: P.chrysalisDeep, alpha: 0.42, seed: seed + 26, taper: [10, 12] });
    L.inkPath(ctx, M([[490, 708], [498, 792], [524, 874]]), { width: 1.2, color: P.chrysalisDeep, alpha: 0.38, seed: seed + 27, taper: [10, 12] });
    // four veins inside the wing case, fanning from the base
    for (const [k, v] of [[436, 590, 410, 700], [444, 604, 418, 780], [452, 622, 448, 840], [462, 640, 498, 876]].entries()) {
      L.inkPath(ctx, M([[v[0], v[1]], [lerp(v[0], v[2], 0.5) - 6, lerp(v[1], v[3], 0.5)], [v[2], v[3]]]), { width: 1.2, color: P.chrysalisDeep, alpha: 0.35 + 0.03 * k, seed: seed + 90 + k, taper: [12, 16] });
    }
    // shoulder shadow under the cremaster, right side
    L.hatch(ctx, O, {
      angle: -0.8, spacing: 6, width: 1.2, color: P.chrysalisDeep, alpha: 0.7, length: [8, 20], seed: seed + 28,
      density: (x, y) => clamp((x - PX - 12) / 50) * (1 - L.smoothstep(PY + 0.1 * len, PY + 0.24 * len, y)),
    });
    // glossy highlights, upper left
    L.inkPath(ctx, Wg([[474, 392], [460, 440], [456, 490]]), { width: 3.6, color: P.white, alpha: 0.9, seed: seed + 30, taper: [8, 14] });
    L.inkPath(ctx, Wg([[490, 370], [482, 392]]), { width: 2.2, color: P.white, alpha: 0.8, seed: seed + 32, taper: [4, 6] });
    L.inkPath(ctx, Wg([[474, 600], [466, 650], [470, 700]]), { width: 2.6, color: P.white, alpha: 0.6, seed: seed + 31, taper: [8, 12] });

    // black rim band with a gold edge, bowed like the segment rings
    if (st.rimInk > 0) {
      const top = [], bot = [], ridge = [], lit = [];
      for (let k = 0; k <= 16; k++) {
        const lam = -1.1 + (2.2 * k) / 16;
        const bow = 0.12 * 126 * Math.sqrt(Math.max(0, 1 - lam * lam));
        const edgePx = Math.min(Math.abs(lam + 1.1), Math.abs(lam - 1.1)) * 126;
        const uEnd = 1 - L.smoothstep(0, 12, edgePx);
        const half = lerp(5, 3, uEnd);
        const yMid = 515 + bow;
        const [, yt] = onPupa(g, cp, PX, yMid - half);
        const [, yb] = onPupa(g, cp, PX, yMid + half);
        top.push([PX + 126 * lam + bx(yt), yt]);
        bot.push([PX + 126 * lam + bx(yb), yb]);
        const [, yr] = onPupa(g, cp, PX, yMid - half - 4);
        ridge.push([PX + 126 * lam + bx(yr), yr]);
        if (lam < -0.2) {
          const [, yw] = onPupa(g, cp, PX, yMid + half + 3);
          lit.push([PX + 126 * lam + bx(yw), yw]);
        }
      }
      ctx.globalAlpha = st.rimInk * 0.6;
      ctx.beginPath();
      L.tracePath(ctx, top.concat(bot.slice().reverse()), true);
      ctx.fillStyle = P.veinBlack;
      ctx.fill();
      const midTop = top.slice(1, -1), midBot = bot.slice(1, -1);
      ctx.globalAlpha = st.rimInk;
      ctx.beginPath();
      L.tracePath(ctx, midTop.concat(midBot.slice().reverse()), true);
      ctx.fill();
      ctx.globalAlpha = 1;
      L.inkPath(ctx, top.map((p) => [p[0], p[1] - 1.5]), { width: 2.4, color: P.gold, alpha: st.rimInk, seed: seed + 40, taper: 0, wobble: 0.4 });
      L.inkPath(ctx, ridge, { width: 1.5, color: P.chrysalisDark, alpha: st.rimInk, seed: seed + 41, taper: [8, 8], wobble: 0.3, swell: 0 });
      if (lit.length > 2) {
        L.inkPath(ctx, lit, { width: 1.2, color: P.white, alpha: 0.85 * st.rimInk, seed: seed + 42, taper: [6, 8], wobble: 0.3, swell: 0 });
      }
    }
    ctx.restore();

    // outline, with a quiet second pen line inside the shadow edge
    L.inkPath(ctx, O, { closed: true, width: 5, seed: seed + 50, wobble: 1, double: { offset: 4, alpha: 0.4, width: 0.3, from: 0.1, to: 0.4 } });
    {
      const inner = [];
      for (let k = 0; k <= 30; k++) {
        const yl = lerp(0.12, 0.93, k / 30) * len;
        inner.push([PX + hwAt(yl) - 12 + bx(PY + yl), PY + yl]);
      }
      L.inkPath(ctx, inner, { width: 1.4, color: P.chrysalisDark, alpha: 0.35, seed: seed + 51, taper: [40, 60] });
    }
    return O;
  }

  function drawGoldDots(ctx, L, P, tc, seed) {
    if (tc < 1.75 - 1e-6) return;
    const fr = Math.min(5, Math.floor((tc - 1.75) * 24 + 1e-6));
    const shown = DOT_CUM[fr];
    const SC = [0.62, 1.08, 1];
    for (let k = 0; k < shown; k++) {
      let born = 0;
      while (DOT_CUM[born] <= k) born++;
      const age = fr - born;
      const [x, y] = ALL_DOTS[k];
      goldDot(ctx, L, P, x, y, 6 * SC[Math.min(2, age)], age < 3, seed + 70 + k, age);
    }
  }

  function goldDot(ctx, L, P, x, y, r, sparkle, seed, age) {
    const R = (5.2 + 1.6 * ((L.hash(seed, 91) % 1000) / 999)) * (r / 6);
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, R, 0, TAU);
    ctx.fillStyle = P.gold;
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, R, 0, TAU);
    ctx.clip();
    ctx.fillStyle = L.mix(P.gold, P.ochre, 0.65);
    ctx.beginPath();
    ctx.arc(x + R * 0.38, y + R * 0.4, R * 0.88, 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = P.ink;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = P.white;
    ctx.beginPath();
    ctx.arc(x - R * 0.38, y - R * 0.38, 1.6, 0, TAU);
    ctx.fill();
    if (sparkle) {
      ctx.strokeStyle = P.goldLight;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.globalAlpha = age === 2 ? 0.55 : 1;
      ctx.beginPath();
      const rot = L.h3(seed, 1, 2) * 0.6;
      const r0 = 6 * 1.4, r1 = 6 * (age === 0 ? 2.2 : 2.9);
      for (let k = 0; k < 4; k++) {
        const a = rot + (k * Math.PI) / 2;
        ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0);
        ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawCremaster(ctx, L, P, seed) {
    L.inkPath(ctx, [[PX, PY - 2], [PX, PY + 14], [PX + 1, PY + 34]], { width: 10, color: P.veinBlack, taper: [0, 0], swell: 0, seed, wobble: 0.4 });
    L.inkPath(ctx, [[PX - 9, PY + 1], [PX, PY + 6], [PX + 9, PY + 1]], { width: 3, color: P.veinBlack, seed: seed + 1, taper: [2, 2] });
  }

  // cast shadow of the torn rim on the jade, 45 degree ink hatching 20 px deep
  function drawRimShadow(ctx, L, P, g, st, O, seed) {
    const sR = st.skin.sR;
    const hwR = Math.max(30, pupaHW(g, sR, st.cp)) + 6;
    const rimY = (x) => {
      const lam = clamp((x - PX) / hwR, -1, 1);
      return PY + sR + 0.8 * BOW * hwR * Math.sqrt(1 - lam * lam) + 9;
    };
    L.hatch(ctx, O, {
      angle: -Math.PI / 4, spacing: 5, width: 1.3, color: P.ink, alpha: 0.8, length: [8, 22], seed, clip: true,
      density: (x, y) => {
        const dy = y - rimY(x) - 3 * L.noise1(x * 0.05, seed + 1);
        return dy < -12 ? 0 : 1 - L.smoothstep(12, 22, dy);
      },
    });
  }

  // =====================================================================================
  // The falling skin
  // =====================================================================================

  // d18 tucked under the cremaster behind the case, then the drop to the bottom edge
  const WAD = [[578, 334, -0.3], [704, 700, 0.9], [884, 1880, 2.2], [906, 1946, 3.1]];
  const WAD_KNOTS = [[578, 334], [668, 452], [704, 700], [884, 1880], [906, 1946]];
  const WAD_KNOT_OF = [0, 2, 3, 4]; // knot index per wad drawing
  let WAD_TRAIL = null;
  function wadTrail(L) {
    if (WAD_TRAIL) return WAD_TRAIL;
    const pts = L.smoothPts(WAD_KNOTS, false, 3);
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const knotS = WAD_KNOTS.map((k) => {
      let best = 1e9, bi = 0;
      pts.forEach((p, i) => {
        const dd = Math.hypot(p[0] - k[0], p[1] - k[1]);
        if (dd < best) {
          best = dd;
          bi = i;
        }
      });
      return cum[bi];
    });
    WAD_TRAIL = { pts, cum, knotS };
    return WAD_TRAIL;
  }
  // u in wad drawings (0..3) to an arc length along the trail
  function trailS(tr, u) {
    const i = Math.max(0, Math.min(2, Math.floor(u)));
    const f = clamp(u - i, 0, 1);
    return lerp(tr.knotS[WAD_KNOT_OF[i]], tr.knotS[WAD_KNOT_OF[i + 1]], f);
  }

  function drawWad(ctx, L, P, x, y, rot, seed) {
    const b = L.boil(L.T);
    const r = L.rng(seed);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    const N = 28, RX = 26, RY = 42; // ~1.6:1 along the fall
    const notch = [];
    while (notch.length < 5) {
      const k = Math.floor(r() * N);
      if (notch.every((q) => Math.abs(q - k) > 2 && Math.abs(q - k) < N - 2)) notch.push(k);
    }
    const pts = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * TAU;
      let rad = 0.88 + 0.28 * L.noise1(i * 0.9 + 0.4, seed + 1);
      if (notch.includes(i)) rad *= 0.66;
      pts.push([Math.cos(a) * RX * rad, Math.sin(a) * RY * rad]);
    }
    // limp torn skin flap trailing 24-34 px behind (up the fall, local -y)
    const flapLen = r.range(24, 34);
    L.inkPath(ctx, [[-7, -RY * 0.15], [r.range(-5, 5), -RY * 0.45 - flapLen * 0.45], [r.range(-10, 8), -RY * 0.55 - flapLen], [6, -RY * 0.2]], {
      closed: true, width: 2, fill: P.veinBlack, seed: seed + 80, wobble: 0.7,
    });
    // two crinkled filament stubs, 20-30 px, hanging off the mass
    for (const [sx, sy, dir] of [[-RX * 0.45, RY * 0.55, 1], [RX * 0.25, RY * 0.7, -1]]) {
      const c = [[sx, sy]];
      let a = HALF_PI + dir * 0.25, px = sx, py = sy;
      const n = 8, step = r.range(2.6, 3.6);
      for (let k = 0; k < n; k++) {
        a += dir * (k === 3 || k === 6 ? r.range(0.5, 0.85) : 0.08) + (L.h3(k, b, seed + 40) - 0.5) * 0.14;
        px += Math.cos(a) * step;
        py += Math.sin(a) * step;
        c.push([px, py]);
      }
      L.inkPath(ctx, c, { width: 1.6, color: P.veinBlack, taper: [0, 8], minWidth: 0.3, swell: 0, wobble: 0.25, seed: seed + 50 + dir });
    }
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, L.smoothPts(pts, true, 3), true);
    ctx.fillStyle = L.mix(P.veinBlack, P.bark, 0.1);
    ctx.fill();
    ctx.clip();
    const yP = new Path2D(), wP = new Path2D();
    const nY = 6 + r.int(0, 2);
    for (let k = 0; k < nY; k++) {
      const a = r() * TAU, rad = Math.sqrt(r()) * 0.72;
      const cx = Math.cos(a) * RX * rad, cy = Math.sin(a) * RY * rad;
      const ang = r() * TAU, l = r.range(3, 6);
      yP.moveTo(cx - (Math.cos(ang) * l) / 2, cy - (Math.sin(ang) * l) / 2);
      yP.lineTo(cx + (Math.cos(ang) * l) / 2, cy + (Math.sin(ang) * l) / 2);
    }
    const nW = Math.max(3, Math.round(nY * 0.5));
    for (let k = 0; k < nW; k++) {
      const a = r() * TAU, rad = Math.sqrt(r()) * 0.7;
      const cx = Math.cos(a) * RX * rad, cy = Math.sin(a) * RY * rad;
      const ang = r() * TAU, l = r.range(3, 6);
      wP.moveTo(cx - (Math.cos(ang) * l) / 2, cy - (Math.sin(ang) * l) / 2);
      wP.lineTo(cx + (Math.cos(ang) * l) / 2, cy + (Math.sin(ang) * l) / 2);
    }
    ctx.lineCap = 'round';
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = P.bandYellow;
    ctx.stroke(yP);
    ctx.strokeStyle = P.bandWhite;
    ctx.lineWidth = 2.6;
    ctx.stroke(wP);
    const cr = new Path2D();
    for (const k of notch) {
      const [nx, ny] = pts[k];
      cr.moveTo(nx, ny);
      cr.quadraticCurveTo(nx * 0.6 + r.range(-6, 6), ny * 0.6 + r.range(-6, 6), nx * 0.15 + r.range(-8, 8), ny * 0.15 + r.range(-8, 8));
    }
    ctx.strokeStyle = P.ink;
    ctx.lineWidth = 3;
    ctx.stroke(cr);
    L.hatch(ctx, pts, { angle: -Math.PI / 4 - rot, spacing: 4.5, width: 1.2, color: P.veinBlack, alpha: 0.85, length: [6, 14], seed: seed + 60, density: (px, py) => clamp((px * 0.5 + py) / 30 + 0.2) });
    ctx.restore();
    L.inkPath(ctx, pts, { closed: true, width: 3, seed: seed + 4, wobble: 0.5 });
    ctx.restore();
  }

  // d18: ragged collar remnant under the pad, clipped behind the case
  function drawCollarRemnant(ctx, L, P, seed) {
    const r = L.rng(seed);
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const u = i / 16;
      const spike = i % 2 ? r.range(6, 12) : r.range(0, 4);
      pts.push([515 + 50 * u + r.range(-2, 2), 306 + spike]);
    }
    for (let i = 16; i >= 0; i--) {
      const u = i / 16;
      const dip = Math.sin(u * Math.PI);
      pts.push([515 + 50 * u + r.range(-3, 3), 342 + r.range(2, 12) * dip]);
    }
    L.inkPath(ctx, pts, { closed: true, width: 2, fill: P.veinBlack, seed, wobble: 0.85 });
  }

  // =====================================================================================
  // Scene
  // =====================================================================================

  FILM.scene({
    id: ID,
    draw(ctx, t, info) {
      const L = info.lib, P = L.pal;
      const g = geo(L);
      const S0 = L.hash(ID) % 100000;
      const tc = clamp(t, 0, info.dur);
      const d = Math.min(24, Math.round(L.onTwos(tc) * 12));
      const st = poseAt(d);

      drawBackground(ctx, L, P, info.T);
      drawTwigShadow(ctx, L, P, S0 + 1000);
      drawSubjectShadow(ctx, L, P, g, st, S0 + 2000);
      drawConstruction(ctx, L, P, st);
      drawMeasure(ctx, L, P, g, tc);
      drawPendulum(ctx, L, P, tc, st.rot);
      drawTwig(ctx, L, P, S0 + 1000);
      drawSilk(ctx, L, P, S0, false);
      if (st.wad === 0) drawCollarRemnant(ctx, L, P, S0 + 4000);

      // ---- subject ----
      ctx.save();
      ctx.translate(PX, PY + st.dy);
      ctx.rotate(st.rot);
      ctx.translate(-PX, -PY);
      let body = null;
      if (st.phase === 'split') {
        const O = drawPupa(ctx, L, P, g, st, S0 + 3000);
        drawRimShadow(ctx, L, P, g, st, O, S0 + 3600 + d);
        body = drawLarva(ctx, L, P, g, st, S0 + 2000);
      } else if (st.phase === 'chrysalis') {
        drawPupa(ctx, L, P, g, st, S0 + 3000);
        drawCremaster(ctx, L, P, S0 + 3500);
        drawGoldDots(ctx, L, P, tc, S0);
      } else {
        body = drawLarva(ctx, L, P, g, st, S0 + 2000);
      }
      // construction: a segment scale beside the hanging body, its ticks squeezing with the wave
      if (st.phase === 'hang' && d >= 8 && body) {
        const sp = new Path2D();
        const X = PX - 150;
        const y0 = PY + body.sOf(0), y1 = PY + body.sOf(1);
        sp.moveTo(X, y0);
        sp.lineTo(X, y1);
        for (let k = 0; k <= 13; k++) {
          const y = PY + body.sOf(SEG_B[k]);
          const l = k === 0 || k === 13 ? 16 : 9;
          sp.moveTo(X - l, y);
          sp.lineTo(X + l, y);
        }
        sp.moveTo(X + 16, y1);
        sp.lineTo(PX - 70, y1);
        ctx.save();
        ctx.strokeStyle = P.inkFaint;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'round';
        ctx.stroke(sp);
        ctx.restore();
      }
      // overlay: magenta ticks riding the contraction wave
      if (st.wave && body) {
        ctx.save();
        ctx.strokeStyle = P.annMagenta;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (const side of [-1, 1]) {
          for (const dm of [-0.03, 0, 0.03]) {
            const f = body.at(st.wave.mw + dm);
            const a0 = side * (1 + 16 / f.hw), a1 = side * (1 + (dm === 0 ? 62 : 44) / f.hw);
            const p0 = tube(f, a0, 0), p1 = tube(f, a1, 0);
            ctx.moveTo(p0[0], p0[1]);
            ctx.lineTo(p1[0], p1[1]);
          }
          const f = body.at(st.wave.mw - 0.085);
          const c0 = tube(f, side * (1 + 36 / f.hw), 0);
          ctx.moveTo(c0[0] + f.tx * 14 + f.nx * 13, c0[1] + f.ty * 14 + f.ny * 13);
          ctx.lineTo(c0[0] - f.tx * 4, c0[1] - f.ty * 4);
          ctx.lineTo(c0[0] + f.tx * 14 - f.nx * 13, c0[1] + f.ty * 14 - f.ny * 13);
        }
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      drawSilk(ctx, L, P, S0, true);

      // ---- falling skin wad ----
      if (st.wad >= 1) drawWad(ctx, L, P, WAD[st.wad][0], WAD[st.wad][1], WAD[st.wad][2], S0 + 4000);

      // ---- overlays ----
      // magenta rings on the tear: one bursts out, one snaps in over 3 frames
      if (tc >= 1.0 - 1e-6 && tc < 1.25) {
        const fr = Math.round((tc - 1.0) * 24);
        const [sx, sy] = SEAM_PT;
        ctx.save();
        ctx.strokeStyle = P.annMagenta;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 1 - Math.pow(fr / 6, 2);
        ctx.beginPath();
        ctx.arc(sx, sy, 34 + 120 * L.ease.outExpo((fr + 1) / 6), 0, TAU);
        ctx.stroke();
        const rIn = fr < 3 ? lerp(130, 44, L.ease.outExpo((fr + 1) / 3)) : 44;
        ctx.globalAlpha = fr < 3 ? 1 : 1 - (fr - 2) / 4;
        ctx.beginPath();
        ctx.arc(sx, sy, rIn, 0, TAU);
        ctx.stroke();
        ctx.restore();
      }
      // the J's sway: an arc under it spanning +-3 degrees, a dot riding it
      if (st.phase === 'J') {
        const pOn = L.ease.outExpo(clamp((tc + 1 / 24) / 0.25));
        L.arcAnnotation(ctx, PX, PY, 700, HALF_PI - 3.4 * DEG, HALF_PI + 3.4 * DEG, { color: P.annYellow, width: 3, alpha: 0.95, endTicks: 8, p: pOn });
        ctx.save();
        ctx.fillStyle = P.annYellow;
        ctx.beginPath();
        ctx.arc(PX + Math.cos(HALF_PI + st.rot) * 700, PY + Math.sin(HALF_PI + st.rot) * 700, 5, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      // yellow ring snapping tight round the pad as the cremaster locks
      if (tc >= 1.5) {
        const u = clamp((tc - 1.5) / (3 / 24));
        const rr = lerp(104, 46, L.ease.outExpo(u));
        ctx.save();
        ctx.strokeStyle = P.annYellow;
        ctx.lineWidth = 3;
        ctx.globalAlpha = tc < 1.75 ? 1 : 0.85;
        ctx.beginPath();
        ctx.arc(PX, PY + 8, rr, 0, TAU);
        ctx.stroke();
        if (u >= 1) {
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          for (let k = 0; k < 4; k++) {
            const a = Math.PI / 4 + (k * Math.PI) / 2;
            ctx.moveTo(PX + Math.cos(a) * (rr + 6), PY + 8 + Math.sin(a) * (rr + 6));
            ctx.lineTo(PX + Math.cos(a) * (rr + 18), PY + 8 + Math.sin(a) * (rr + 18));
          }
          ctx.stroke();
        }
        ctx.restore();
      }
      // yellow arcs beside the widest point, on the side each twist swings toward
      // last arc is gone by d22 (t = 1.833) so T 11.458 is clean for the match cut
      if (tc >= 1.5 && tc < 1.833 - 1e-6) {
        for (let e = 0; e < 4; e++) {
          const age = (tc - (1.5 + e / 12)) * 24;
          if (age < -1e-6 || age >= 5) continue;
          const cur = TWIST[e] * DEG, prev = e === 0 ? SPLIT_ROT[5] * DEG : TWIST[e - 1] * DEG;
          const lead = cur > prev ? Math.PI : 0;
          const c = Math.cos(cur), sn = Math.sin(cur);
          const cx = PX - 310 * sn, cy = PY + (e === 0 ? -6 : 0) + 310 * c;
          const fi = Math.floor(age + 1e-6);
          const alpha = fi < 2 ? 1 : Math.max(0, 1 - (fi - 1) / 3);
          if (alpha <= 0) continue;
          const a = lead + cur;
          L.arcAnnotation(ctx, cx, cy, 150, a - 20 * DEG, a + 20 * DEG, { color: P.annYellow, width: 3, alpha, endTicks: 10 });
          L.arcAnnotation(ctx, cx, cy, 176, a - 20 * DEG, a + 20 * DEG, { color: P.annYellow, width: 3, alpha, endTicks: 10 });
          if (fi === 0) {
            L.arcAnnotation(ctx, cx, cy, 202, a - 12 * DEG, a + 12 * DEG, { color: P.annYellow, width: 3, alpha: 1, endTicks: 8 });
          }
        }
      }
      // blue motion line trailing the falling skin: one dashed line, offset, ending short of the wad
      if (tc >= 1.5 && tc < 1.95) {
        const c = (tc - 1.5) * 12;
        const head = Math.min(3, Math.floor(c + 1e-6));
        const tail = Math.max(0.2, head - 0.9);
        if (head > tail + 0.05) {
          const tr = wadTrail(L);
          const s0 = trailS(tr, tail), s1 = trailS(tr, head) - 36;
          const ox = -18 / Math.SQRT2, oy = -18 / Math.SQRT2;
          ctx.save();
          ctx.strokeStyle = P.annBlue;
          ctx.lineCap = 'round';
          ctx.globalAlpha = 1 - clamp((c - 3) / 1.4);
          ctx.lineWidth = 2.5;
          ctx.setLineDash([14, 10]);
          ctx.beginPath();
          let started = false;
          const along = [];
          for (let i = 1; i < tr.pts.length; i++) {
            const s = tr.cum[i];
            if (s < s0 || s > s1) continue;
            const p = tr.pts[i], q = tr.pts[i - 1];
            const x = p[0] + ox, y = p[1] + oy;
            if (!started) {
              ctx.moveTo(x, y);
              started = true;
            } else ctx.lineTo(x, y);
            along.push([x, y, p[0] - q[0], p[1] - q[1], s]);
          }
          ctx.stroke();
          ctx.setLineDash([]);
          if (along.length > 4) {
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            for (const ts of [s1 - 28, s1 - 56, s1 - 84]) {
              let best = 0, bd = 1e9;
              for (let k = 0; k < along.length; k++) {
                const d = Math.abs(along[k][4] - ts);
                if (d < bd) { bd = d; best = k; }
              }
              const [tx, ty, dx, dy] = along[best];
              const dl = Math.hypot(dx, dy) || 1;
              const nx = -dy / dl, ny = dx / dl;
              ctx.moveTo(tx - nx * 6, ty - ny * 6);
              ctx.lineTo(tx + nx * 6, ty + ny * 6);
            }
            ctx.stroke();
          }
          ctx.restore();
        }
      }
    },
  });

})();
