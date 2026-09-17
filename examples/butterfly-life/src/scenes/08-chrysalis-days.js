// 08 chrysalis-days: "Twelve days by the sun". T 13.0 to 16.0, illustrated, hard cut in on the G3 chrysalis.
// Twelve days, one per 8th note. Each day is three drawings on twos: sunrise, noon, night.
// The sky is a framed arched window behind the twig. The ground is a milkweed leaf laid out as a
// true perspective plane, with a sundial drawn on it and the chrysalis shadow as its hand.
(function () {
  'use strict';

  const ID = 'chrysalis-days';
  const CX = 540;
  const PX = 540, PY = 300; // silk pad (G3)
  const TAU = Math.PI * 2;
  const clamp = (v, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);

  // G7 sun-path arc: the circle through (60,520), (540,200), (1020,520)
  const ARC_CX = 540, ARC_CY = 720, ARC_R = 520;
  const ARC_A0 = Math.atan2(520 - ARC_CY, 60 - ARC_CX);
  const ARC_A1 = Math.atan2(520 - ARC_CY, 1020 - ARC_CX);

  // the arched window: opening radius, frame, sill. The sill passes behind the case 50 px below the
  // rim band (between the side gold dots at y 560 and the widest point at y 600) and stops at the case
  // outline (g.sillL, g.sillR from the G3 half-width at y 583). Deviation: the sky zone runs to y 574,
  // the storyboard says 520, so the band is never sliced by the sill.
  const WIN_R = 590, FRAME_R = 611;
  const SILL_Y0 = 574, SILL_Y1 = 592;

  const RING_X = 540, RING_Y = 620, RING_R = 400;
  const DIAL_X = 540, DIAL_Y = 1300, DIAL_RX = 280, DIAL_RY = 110;
  const FOOT = [540, 1303];
  const PASS = [540, 905];
  // light source and shadow tip per drawing (0 sunrise, 1 noon, 2 night). The sunrise tip sits on the
  // straight extension of the ray from (60,520) through (540,905). The moon sits on the G7 arc at
  // (455,207), 520 px from (540,720), clear of the 12 o'clock tally slot; its tip extends the ray
  // from the moon through (540,905).
  const SRC = [[60, 520], [540, 200], [455, 207]];
  // night tip: the line from the moon through PASS (540,905) at y 1418.
  const TIP = [[939, 1225], [548, 1418], [602.5, 1418]];

  // ---------------------------------------------------------------------------
  // the leaf plane: a ground-plane projection. Leaf coordinates (s along the midrib from the far tip,
  // w across) map to the ground (X, Z), then to the screen: x = 540 + FX X / Z, y = YH + KZ / Z.
  // The dial sits at depth Z = KZ / (1300 - YH), where a circle foreshortens to 220 / 560.
  // ---------------------------------------------------------------------------
  const YH = 650, KZ = 1270, FX = 1667;
  const LEAF_TIP = [660, 1030];
  const ZT = KZ / (LEAF_TIP[1] - YH);
  const XT = ((LEAF_TIP[0] - 540) * ZT) / FX;
  const TILT = 0.125; // midrib heading in the ground plane (about 13 degrees on screen)
  const AXL = Math.hypot(TILT, 1);
  const AX = -TILT / AXL, AZ = -1 / AXL; // toward the viewer
  const NX = -AZ, NZ = AX; // across, toward screen right
  const LEAF_S = 2.64;
  const OFF = 0.05; // intramarginal vein inset, leaf units
  function lp(s, w) {
    const X = XT + s * AX + w * NX, Z = ZT + s * AZ + w * NZ;
    return [540 + (FX * X) / Z, YH + KZ / Z];
  }
  const lz = (s, w) => ZT + s * AZ + w * NZ;
  // half-width along the midrib: a broad oval. Near the far tip the half-width rises like a circle
  // so the far margin is a rounded arc (about 160-200 px across y 1030-1070), then blends into the
  // long oval flank beyond s 0.6.
  const lhwFlank = (s) => 0.85 * Math.pow(Math.sin((clamp(s / 2.8) * Math.PI) / 2), 0.8);
  const lhwCirc = (s) => 0.85 * Math.sqrt(Math.max(0, 1 - Math.pow(1 - clamp(s / 2.8), 2)));
  const lhw = (s) => {
    const q = Math.max(0, s);
    const u = clamp(q / 0.6);
    const b = u * u * (3 - 2 * u);
    return lhwCirc(q) * (1 - b) + lhwFlank(q) * b;
  };

  // ---------------------------------------------------------------------------
  // timing
  // ---------------------------------------------------------------------------
  function timing(t) {
    const tt = Math.max(0, t);
    const frame = Math.min(71, Math.floor(tt * 24 + 1e-6)); // clamps to the final pose past the end
    const drawing = Math.min(35, Math.floor(tt * 12 + 1e-6)); // on twos
    const day = Math.floor(drawing / 3);
    const k = drawing % 3;
    const dayFrame = frame - day * 6;
    const dark = Math.max(0, Math.min(1, (drawing - 23) / 6)); // days 9 and 10
    const stage = drawing >= 30 ? drawing - 29 : 0; // days 11 and 12: 1 veins, 2 orange at 80%, 3+ full
    return { frame, drawing, day, k, dayFrame, dark, stage, wing: stage > 0 ? 1 : 0 };
  }

  // ---------------------------------------------------------------------------
  // geometry helpers
  // ---------------------------------------------------------------------------
  function resample(L, pts, M) {
    const S = [0];
    for (let i = 1; i < pts.length; i++) S.push(S[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = S[S.length - 1] || 1;
    const out = [];
    let j = 0;
    for (let m = 0; m < M; m++) {
      const s = (m / (M - 1)) * total;
      while (j < S.length - 2 && S[j + 1] < s) j++;
      const u = (s - S[j]) / (S[j + 1] - S[j] || 1);
      out.push([L.lerp(pts[j][0], pts[j + 1][0], u), L.lerp(pts[j][1], pts[j + 1][1], u)]);
    }
    return out;
  }
  // resample a polyline at a fixed pixel step
  function stepResample(pts, step) {
    const out = [pts[0].slice()];
    let carry = 0;
    for (let i = 1; i < pts.length; i++) {
      const ax = pts[i - 1][0], ay = pts[i - 1][1], bx = pts[i][0], by = pts[i][1];
      const d = Math.hypot(bx - ax, by - ay);
      let s = step - carry;
      while (s <= d) {
        out.push([ax + ((bx - ax) * s) / d, ay + ((by - ay) * s) / d]);
        s += step;
      }
      carry = d - (s - step);
    }
    return out;
  }
  function edgeLookup(pts) {
    const A = new Float32Array(2000).fill(NaN);
    for (let i = 0; i < pts.length - 1; i++) {
      const x0 = pts[i][0], y0 = pts[i][1], x1 = pts[i + 1][0], y1 = pts[i + 1][1];
      for (let y = Math.ceil(Math.min(y0, y1)); y <= Math.floor(Math.max(y0, y1)); y++) {
        if (y < 0 || y >= 2000) continue;
        const u = y1 === y0 ? 0 : (y - y0) / (y1 - y0);
        A[y] = x0 + (x1 - x0) * u;
      }
    }
    let first = -1, last = -1;
    for (let y = 0; y < 2000; y++) {
      if (A[y] === A[y]) {
        if (first < 0) first = y;
        last = y;
      }
    }
    for (let y = 0; y < first; y++) A[y] = A[first];
    for (let y = last + 1; y < 2000; y++) A[y] = A[last];
    const lookup = (y) => A[Math.max(0, Math.min(1999, Math.round(y)))];
    return lookup;
  }
  function clipRect(poly, x0, y0, x1, y1) {
    const planes = [
      [(p) => p[0] >= x0, (a, b) => [x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0])]],
      [(p) => p[0] <= x1, (a, b) => [x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0])]],
      [(p) => p[1] >= y0, (a, b) => [a[0] + ((b[0] - a[0]) * (y0 - a[1])) / (b[1] - a[1]), y0]],
      [(p) => p[1] <= y1, (a, b) => [a[0] + ((b[0] - a[0]) * (y1 - a[1])) / (b[1] - a[1]), y1]],
    ];
    let out = poly;
    for (const [inside, cut] of planes) {
      const inp = out;
      out = [];
      for (let i = 0; i < inp.length; i++) {
        const a = inp[(i + inp.length - 1) % inp.length], b = inp[i];
        const ia = inside(a), ib = inside(b);
        if (ib) {
          if (!ia) out.push(cut(a, b));
          out.push(b);
        } else if (ia) out.push(cut(a, b));
      }
    }
    return out;
  }
  function arcPts(cx, cy, r, a0, a1, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return out;
  }
  const inDial = (x, y, k) => {
    const dx = (x - DIAL_X) / (DIAL_RX * k), dy = (y - DIAL_Y) / (DIAL_RY * k);
    return dx * dx + dy * dy < 1;
  };

  // twig outline copied from 06 j-hang so the locked camera holds across 06, 07 and 08
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

  // ---------------------------------------------------------------------------
  // geometry (pure constants, built once)
  // ---------------------------------------------------------------------------
  let G = null;
  function geo(L) {
    if (G) return G;
    const g = {};
    // ---- G3 case ----
    const prof = [[540, 327], [575, 332], [612, 380], [646, 440], [664, 500], [670, 600], [667, 700], [648, 800], [618, 860], [576, 895], [540, 905]];
    const right = L.smoothPts(prof, false, 2);
    const rx = edgeLookup(right);
    g.hw = (y) => {
      const v = rx(y);
      return y < 327 || y > 905 || v !== v ? 0 : v - CX;
    };
    const left = right.slice(1, right.length - 1).reverse().map((p) => [2 * CX - p[0], p[1]]);
    g.caseOutline = right.concat(left);
    g.caseCoarse = L.smoothPts(prof.concat(prof.slice(1, prof.length - 1).reverse().map((p) => [2 * CX - p[0], p[1]])), true, 10);
    const sillHW = g.hw((SILL_Y0 + SILL_Y1) / 2);
    g.sillL = CX - sillHW - 1;
    g.sillR = CX + sillHW + 1;

    // ---- wing case ----
    g.wingLine = L.smoothPts([[430, 560], [470, 760], [560, 890]], false, 4);
    g.wingX = edgeLookup(g.wingLine);
    g.sheathRegion = g.wingLine.concat([[600, 905], [600, 960], [360, 960], [360, 560]]);
    g.wingPad = g.wingLine.slice().reverse().concat([[430, 532], [700, 532], [700, 960], [600, 960]]);
    // a point at offset d (px) to the right of the wing-case line, at height y
    g.wingOff = (y, d) => {
      const x0 = g.wingX(y - 4), x1 = g.wingX(y + 4);
      const tx = (x1 - x0) / 8, l = Math.hypot(tx, 1);
      return [g.wingX(y) + d / l, y - (d * tx) / l];
    };
    const margin = [];
    for (let y = 548; y <= 876; y += 8) margin.push(g.wingOff(y, 17));
    g.marginPts = margin;

    // ---- rim dots and low dots ----
    g.rimDots = [];
    for (let i = 0; i < 12; i++) {
      const th = -1.26 + (i / 11) * 2.52;
      const w = g.hw(521);
      g.rimDots.push({ x: CX + Math.sin(th) * (w - 7), y: 522 + 3 * Math.cos(th), rx: 6 * (0.55 + 0.45 * Math.cos(th)), ry: 6 });
    }
    g.lowDots = [];
    for (let i = 0; i < 5; i++) {
      const x = 495 + i * 22.5;
      g.lowDots.push([x, 850 - 20 * Math.pow((x - 540) / 45, 2), 5]);
    }
    g.lowDots.push([440, 560, 4.5], [459, 562, 4], [621, 562, 4], [640, 560, 4.5]);

    // ---- window ----
    const aIn = Math.asin((ARC_CY - SILL_Y0) / WIN_R), aOut = Math.asin((ARC_CY - SILL_Y0) / FRAME_R);
    g.dome = arcPts(ARC_CX, ARC_CY, WIN_R, Math.PI + aIn, TAU - aIn, 120);
    g.frameOuter = arcPts(ARC_CX, ARC_CY, FRAME_R, Math.PI + aOut, TAU - aOut, 120);
    g.frame = g.frameOuter.concat(g.dome.slice().reverse());
    const aRev = Math.asin((ARC_CY - SILL_Y0) / 576);
    // inner reveals: the shadowed one widens from nothing at the crown to 15 px down the right jamb,
    // the lit one is a thin pale strip down the left
    const revealBand = (a0, a1, wFn) => {
      const outer = [], inner = [];
      for (let i = 0; i <= 80; i++) {
        const a = L.lerp(a0, a1, i / 80);
        outer.push([ARC_CX + Math.cos(a) * (WIN_R + 1), ARC_CY + Math.sin(a) * (WIN_R + 1)]);
        const ri = WIN_R - wFn(a);
        inner.push([ARC_CX + Math.cos(a) * ri, Math.min(SILL_Y0, ARC_CY + Math.sin(a) * ri)]);
      }
      return { poly: outer.concat(inner.reverse()), inner: inner.slice().reverse() };
    };
    const rv = revealBand(-Math.PI / 2 - 0.3, -aIn + 0.02, (a) => 15 * L.smoothstep(-Math.PI / 2 - 0.3, -Math.PI / 2 + 0.35, a));
    g.reveal = rv.poly;
    g.revealInner = rv.inner;
    g.revealL = revealBand(Math.PI + aIn - 0.02, Math.PI * 1.5 + 0.2, (a) => 7 * (1 - L.smoothstep(Math.PI * 1.1, Math.PI * 1.5 + 0.2, a))).poly;
    void aRev;

    // ---- twig (06's shape and seed) ----
    g.twigSeed = (L.hash('j-hang') % 100000) + 1000;
    g.silkSeed = L.hash('j-hang') % 100000;
    g.tw = twigShape(L, g.twigSeed);
    g.aboveTwig = [[-60, -300], [1140, -300]].concat(g.tw.top.slice().reverse());

    buildLeaf(L, g);
    G = g;
    return G;
  }

  function buildLeaf(L, g) {
    const r = L.rng(L.hash(ID, 'leaf'));
    const wave = (s, side) => 0.0035 * Math.sin(s * 19 + side * 1.3) + 0.002 * L.noise1(s * 6, side > 0 ? 71 : 72);
    const hwv = (s, side) => (s <= 0 ? 0 : Math.max(0, lhw(s) + wave(s, side) * clamp(s / 0.3)));
    const R = [], Lf = [];
    const N = 150;
    for (let k = 0; k <= N; k++) {
      const s = LEAF_S * Math.pow(k / N, 1.7);
      R.push(lp(s, hwv(s, 1)));
      Lf.push(lp(s, -hwv(s, -1)));
    }
    g.leafRight = R;
    g.leafLeft = Lf;
    const raw = R.concat([[3200, 3000], [-2000, 3000]]).concat(Lf.slice().reverse());
    g.leaf = clipRect(raw, -40, 900, 1120, 1965);
    // top edge lookup by x: the visible far margin
    const yTop = new Float32Array(1201).fill(4000);
    const rast = (pts) => {
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]);
        for (let x = Math.ceil(x0); x <= Math.floor(x1); x++) {
          const xi = x + 60;
          if (xi < 0 || xi > 1200) continue;
          const u = b[0] === a[0] ? 0 : (x - a[0]) / (b[0] - a[0]);
          const y = a[1] + (b[1] - a[1]) * u;
          if (y < yTop[xi]) yTop[xi] = y;
        }
      }
    };
    rast(R);
    rast(Lf);
    g.yTop = (x) => yTop[Math.max(0, Math.min(1200, Math.round(x) + 60))];
    // the visible margin, split at the tip: left part runs frame edge -> tip, right part tip -> frame edge
    g.edgeL = Lf.filter((p) => p[0] > -60 && p[1] < 1990).reverse();
    g.edgeR = R.filter((p) => p[0] < 1140 && p[1] < 1990);

    // midrib
    const rib = [];
    for (let k = 0; k <= 80; k++) {
      const s = 0.02 + (LEAF_S - 0.02) * Math.pow(k / 80, 1.5);
      const lw = 0.004 + (0.009 * s) / LEAF_S;
      rib.push({ c: lp(s, 0), l: lp(s, -lw), r: lp(s, lw) });
    }
    g.rib = rib;
    g.midX = edgeLookup(rib.map((q) => q.c));

    // side veins: straight chevrons from the midrib toward the tip at 55 to 65 degrees
    const endT = (s0, th, inset) => {
      let lo = 0, hi = 1.6;
      for (let it = 0; it < 30; it++) {
        const t = (lo + hi) / 2;
        const f = t * Math.sin(th) - (lhw(s0 - t * Math.cos(th)) - inset);
        if (f > 0) hi = t;
        else lo = t;
      }
      return lo;
    };
    // a side vein bows off its chord by VEIN_BOW of its length at the middle, so it leaves the midrib
    // wide and arches toward the tip as it nears the margin; both ends stay put
    const VEIN_BOW = -0.08;
    const veinAt = (s0, th, side, t, tEnd) => {
      const u = clamp(t / (tEnd || 1));
      return lp(s0 - t * Math.cos(th) + 4 * u * (1 - u) * VEIN_BOW * tEnd, side * t * Math.sin(th));
    };
    const veinPts = (s0, th, side, t0, t1, n, tEnd) => {
      const pts = [];
      for (let i = 0; i <= n; i++) pts.push(veinAt(s0, th, side, L.lerp(t0, t1, i / n), tEnd != null ? tEnd : t1));
      return pts;
    };
    const veins = [];
    for (const side of [-1, 1]) {
      const list = [];
      for (let i = 0; ; i++) {
        const s0 = 0.17 + i * 0.205 + (side > 0 ? 0.08 : 0) + r.range(-0.12, 0.12) * 0.205;
        if (s0 > 2.95) break;
        const th = ((60 + r.range(-4.5, 4.5)) * Math.PI) / 180;
        const tE = endT(s0, th, OFF);
        const se = s0 - tE * Math.cos(th);
        if (lz(se, side * tE * Math.sin(th)) < 0.93) continue; // never on screen
        const pts = veinPts(s0, th, side, 0, tE, 18);
        const zm = lz(s0 - 0.5 * tE * Math.cos(th), side * 0.5 * tE * Math.sin(th));
        list.push({ side, s0, th, tE, pts, zm });
      }
      veins.push(...list);
    }
    g.veins = veins;

    // looping intramarginal vein: each side vein arches up into the next one toward the tip
    const loops = [];
    for (const side of [-1, 1]) {
      const vs = veins.filter((v) => v.side === side);
      for (let i = 0; i < vs.length; i++) {
        const A = vs[i];
        const sA = A.s0 - A.tE * Math.cos(A.th), wA = side * A.tE * Math.sin(A.th);
        let s2, w2;
        if (i === 0) {
          s2 = 0.02;
          w2 = 0;
        } else {
          const B = vs[i - 1];
          const tj = B.tE * 0.84;
          const uj = 0.84;
          s2 = B.s0 - tj * Math.cos(B.th) + 4 * uj * (1 - uj) * VEIN_BOW * B.tE;
          w2 = side * tj * Math.sin(B.th);
        }
        const sm = (sA + s2) / 2;
        const wm = side * Math.max(0, lhw(sm) - OFF * 0.35);
        const pts = [];
        for (let q = 0; q <= 14; q++) {
          const u = q / 14;
          const s = (1 - u) * (1 - u) * sA + 2 * u * (1 - u) * sm + u * u * s2;
          const w = (1 - u) * (1 - u) * wA + 2 * u * (1 - u) * wm + u * u * w2;
          pts.push(lp(s, w));
        }
        if (pts.some((p) => p[1] < 1990)) loops.push({ pts, z: lz(sA, wA) });
      }
    }
    g.loops = loops;

    // hatching between the side veins, parallel to them: dense (5 px) on each vein's shadow side
    // (just below it on screen), 8 px through the middle of the panel
    const strokes = [];
    const net = [];
    for (const side of [-1, 1]) {
      const vs = veins.filter((v) => v.side === side);
      for (let i = 0; i < vs.length - 1; i++) {
        const V = vs[i], U = vs[i + 1];
        const pA = veinAt(V.s0, V.th, side, 0.5 * V.tE, V.tE);
        if (pA[1] > 2100) continue;
        let gap = 1e9;
        for (let q = 0; q < U.pts.length - 1; q++) {
          const a = U.pts[q], b = U.pts[q + 1];
          const dx = b[0] - a[0], dy = b[1] - a[1];
          const u = clamp(((pA[0] - a[0]) * dx + (pA[1] - a[1]) * dy) / (dx * dx + dy * dy || 1));
          gap = Math.min(gap, Math.hypot(pA[0] - a[0] - dx * u, pA[1] - a[1] - dy * u));
        }
        if (!(gap > 6)) continue;
        let p = 2.5 + r() * 2;
        while (p < gap - 2) {
          const f = p / gap;
          const s0 = L.lerp(V.s0, U.s0, f), th = L.lerp(V.th, U.th, f);
          const tE = endT(s0, th, OFF + 0.014);
          const t0 = Math.min(0.02 + r() * 0.01, tE * 0.5);
          const line = stepResample(veinPts(s0, th, side, t0, tE, 20), 5);
          // tone: dark just below the upper vein, lighter toward the lit side of the vein below,
          // and the left half of the leaf faces the light
          const tone = (f < 0.3 ? 1 : 0.92 - 0.5 * ((f - 0.3) / 0.7)) * (side < 0 ? 0.74 : 1);
          let m = Math.floor(r() * 3);
          while (m < line.length - 2) {
            const n = 7 + Math.floor(r() * 16);
            // the far third of the leaf stays lighter: tone builds toward the viewer
            if (r() < tone * L.lerp(0.5, 1, L.smoothstep(1050, 1450, line[m][1]))) {
              const seg = [];
              for (let q = m; q <= Math.min(line.length - 1, m + n); q++) {
                const pt = line[q];
                if (pt[1] > 1990 || inDial(pt[0], pt[1], 1.1)) break;
                seg.push(pt);
              }
              if (seg.length >= 2) strokes.push({ pts: seg, w: r.range(1.35, 1.9), grp: (r() * 3) | 0 });
            }
            m += n + 1 + (r() < 0.5 ? 1 : 0);
          }
          p += (f < 0.3 ? 5 : 8) * (1 + (r() - 0.5) * 0.3);
        }
        // veinlets: a loose net joining the two veins
        for (let q = 0; q < 4; q++) {
          const ta = V.tE * r.range(0.15, 0.8);
          const tb = ta + (U.s0 - V.s0) * Math.cos(V.th) + r.range(-0.02, 0.02);
          if (tb > U.tE * 0.95) continue;
          const a = veinAt(V.s0, V.th, side, ta, V.tE);
          const b = veinAt(U.s0, U.th, side, tb, U.tE);
          if (Math.max(a[1], b[1]) > 1990 || inDial((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 1.05)) continue;
          net.push([a, [(a[0] + b[0]) / 2 + r.range(-8, 8), (a[1] + b[1]) / 2 + r.range(-6, 6)], b]);
        }
      }
    }
    g.leafStrokes = strokes;
    g.leafNet = net;
  }

  // ---------------------------------------------------------------------------
  // small helpers
  // ---------------------------------------------------------------------------

  // tapered pen stroke through points, appended to a Path2D so many strokes fill in one call
  function strokeTo(path, pts, w, taperEnd, dy) {
    const n = pts.length;
    if (n < 2) return;
    const o = dy || 0;
    const Lx = [], Ly = [], Rx = [], Ry = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      const s = i / (n - 1);
      const ww = w * 0.5 * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, s * 0.85 + 0.12))) * (taperEnd ? 1 - s * 0.55 : 1);
      Lx.push(pts[i][0] - ty * ww);
      Ly.push(pts[i][1] + tx * ww + o);
      Rx.push(pts[i][0] + ty * ww);
      Ry.push(pts[i][1] - tx * ww + o);
    }
    path.moveTo(Lx[0], Ly[0]);
    for (let i = 1; i < n; i++) path.lineTo(Lx[i], Ly[i]);
    for (let i = n - 1; i >= 0; i--) path.lineTo(Rx[i], Ry[i]);
    path.closePath();
  }

  function fillPaths(ctx, paths, color, alpha) {
    ctx.save();
    ctx.fillStyle = color;
    const base = ctx.globalAlpha * alpha;
    const A = [1, 0.84, 0.7];
    paths.forEach((p, i) => {
      ctx.globalAlpha = base * A[i % 3];
      ctx.fill(p);
    });
    ctx.restore();
  }

  // contour hatching across a vertical body of revolution: rows of curved strokes between u = from..to
  function contourHatch(ctx, L, o) {
    const r = L.rng(o.seed);
    const bi = L.boil(L.T);
    const paths = [new Path2D(), new Path2D(), new Path2D()];
    let row = 0;
    for (let y = o.y0; y <= o.y1; row++) {
      const w = o.hw(y);
      if (w > 8) {
        const a = o.from(y, row) + (r() - 0.5) * 0.1;
        const b = o.to(y, row) - r() * 0.05;
        if (b - a > 0.05) {
          const pts = [];
          const jb = (L.h3(row, bi, o.seed) - 0.5) * 1.3;
          for (let i = 0; i < 7; i++) {
            const u = L.lerp(a, b, i / 6);
            pts.push([o.cx + w * u, y + o.bow * w * Math.sqrt(Math.max(0, 1 - u * u)) + jb + (i === 6 ? (L.h3(row, bi, o.seed + 1) - 0.5) * 3 : 0)]);
          }
          strokeTo(paths[(r() * 3) | 0], pts, o.width * L.lerp(0.8, 1.2, r()), true);
        }
      }
      y += o.spacing * (1 + (r() - 0.5) * 0.3);
    }
    fillPaths(ctx, paths, o.color, o.alpha);
  }

  function clipPoly(ctx, L, pts) {
    ctx.beginPath();
    L.tracePath(ctx, pts, true);
    ctx.clip();
  }

  function sparkle(ctx, x, y, s, col, core, alpha) {
    const p = new Path2D();
    const arm = (ang, len, wid) => {
      const c = Math.cos(ang), si = Math.sin(ang);
      p.moveTo(x + c * len, y + si * len);
      p.lineTo(x - si * wid, y + c * wid);
      p.lineTo(x - c * len, y - si * len);
      p.lineTo(x + si * wid, y - c * wid);
      p.closePath();
    };
    arm(0, s, s * 0.14);
    arm(Math.PI / 2, s * 1.25, s * 0.14);
    arm(Math.PI / 4, s * 0.5, s * 0.1);
    arm(-Math.PI / 4, s * 0.5, s * 0.1);
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = col;
    ctx.fill(p);
    ctx.beginPath();
    ctx.arc(x, y, s * 0.16, 0, TAU);
    ctx.fillStyle = core;
    ctx.fill();
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arc(x + w - r, y + r, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x + r, y + h);
    ctx.arc(x + r, y + r, r, Math.PI / 2, (3 * Math.PI) / 2);
    ctx.closePath();
  }

  // ---------------------------------------------------------------------------
  // background: stripes, the window sky, the frame and sill
  // ---------------------------------------------------------------------------

  const skyOffset = (st) => (st.frame / 24) * 12; // 6 px per beat
  // the night sky is lifted toward duskRose so each night drawing is not a dark 4 Hz flash
  const NIGHT_LIFT = 0.66;

  // the sky seen through the window (also used to repaint knockouts behind the sun and moon)
  function drawWindowSky(ctx, L, P, g, st) {
    const off = skyOffset(st);
    const cols =
      st.k === 0 ? [P.stripeApricot, L.mix(P.stripeApricot, P.duskRose, 0.68)]
        : st.k === 1 ? [L.mix(P.stripeYellow, P.stripeCream, 0.3), L.mix(P.stripeYellow, P.sun, 0.18)]
          : [L.mix(P.night, P.duskRose, NIGHT_LIFT), L.mix(P.nightSky, P.duskRose, NIGHT_LIFT)];
    ctx.save();
    clipPoly(ctx, L, g.dome);
    L.stripes(ctx, { colors: cols, offset: off, seed: 81, bounds: [0, 100, 1080, 500] });
    if (st.k === 2) {
      L.stipple(ctx, g.dome, { spacing: 19, r: [0.8, 2.1], color: P.white, alpha: 0.85, seed: 830 + st.day, jitter: 0.5, density: 0.75 });
      const r = L.rng(L.hash(ID, 'stars', st.day));
      for (let i = 0; i < 10; i++) {
        const a = Math.PI + 0.36 + r.range(0.02, 0.98) * (Math.PI - 0.72);
        const rr = r.range(150, 575);
        const x = ARC_CX + Math.cos(a) * rr, y = ARC_CY + Math.sin(a) * rr;
        if (y > 540 || (y > 215 && y < 320) || Math.abs(x - CX) < 160) continue;
        sparkle(ctx, x, y, r.range(7, 14), P.white, P.white, 0.95);
      }
    } else {
      // hour rays from the arc centre, and a sunrise band of low haze strokes near the sill
      const rays = new Path2D();
      for (let i = 1; i < 12; i++) {
        const a = ARC_A0 + (i / 12) * (ARC_A1 - ARC_A0 + TAU * (ARC_A1 < ARC_A0 ? 1 : 0));
        rays.moveTo(ARC_CX + Math.cos(a) * 470, ARC_CY + Math.sin(a) * 470);
        rays.lineTo(ARC_CX + Math.cos(a) * 588, ARC_CY + Math.sin(a) * 588);
      }
      ctx.strokeStyle = P.inkFaint;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 1.5;
      ctx.stroke(rays);
      ctx.globalAlpha = 1;
      if (st.k === 0) {
        L.hatch(ctx, null, { bounds: [0, 490, 1080, 84], angle: 0, spacing: 7, width: 1.5, color: P.duskRose, alpha: 0.9, length: [30, 90], gap: [10, 40], seed: 850, density: (x, y) => L.smoothstep(500, 570, y) * (1 - L.smoothstep(300, 900, x)) });
      }
    }
    ctx.restore();
  }

  function drawStripes(ctx, L, P, st) {
    L.stripes(ctx, { colors: [P.stripeCream, P.stripeApricot], offset: skyOffset(st), seed: 81 });
  }

  function drawWindowFrame(ctx, L, P, g, st) {
    const wood = L.mix(P.bark, P.tan, 0.4);
    const woodLight = L.mix(P.tan, P.paper, 0.25);
    // frame body
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, g.frame, true);
    ctx.fillStyle = wood;
    ctx.fill();
    ctx.restore();
    // lit left reveal and shadowed right reveal inside the opening
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, g.revealL, true);
    ctx.fillStyle = woodLight;
    ctx.fill();
    ctx.beginPath();
    L.tracePath(ctx, g.reveal, true);
    ctx.fillStyle = L.mix(P.bark, P.tan, 0.2);
    ctx.fill();
    ctx.restore();
    L.hatch(ctx, g.reveal, { angle: -Math.PI / 4, spacing: 5, width: 1.3, color: P.ink, alpha: 0.85, length: [8, 22], gap: [1, 3], seed: 701, clip: true, inset: 0, overshoot: 2 });
    // frame hatching: 45 degrees, full on the lower-right half, a light scatter on the lit left
    L.hatch(ctx, g.frame, {
      angle: -Math.PI / 4, spacing: 5, width: 1.2, color: P.ink, alpha: 0.8, length: [8, 20], gap: [2, 6], seed: 702, clip: true,
      density: (x, y) => 0.12 + 0.8 * L.smoothstep(520, 700, x + (y - 300) * 0.4),
    });
    // grain lines along the arch
    for (let i = 0; i < 3; i++) {
      const rr = WIN_R + 5 + i * 5.5;
      const a0 = Math.PI + 0.36 + 0.05 * i, a1 = TAU - 0.36 - 0.07 * i;
      const segs = 5 + i;
      for (let q = 0; q < segs; q++) {
        const u0 = (q + 0.1 + 0.2 * L.h3(i, q, 703)) / segs, u1 = (q + 0.75 + 0.2 * L.h3(q, i, 704)) / segs;
        L.inkPath(ctx, arcPts(ARC_CX, ARC_CY, rr, L.lerp(a0, a1, u0), L.lerp(a0, a1, u1), 24), { width: 1.1, color: P.ink, alpha: 0.5, seed: 705 + i * 13 + q, taper: [20, 20], wobble: 0.8 });
      }
    }
    L.inkPath(ctx, g.frameOuter, { width: 3.2, seed: 710, taper: [0, 0], wobble: 1.1 });
    // keystone at the crown
    const ks = [];
    for (const [rr, da] of [[WIN_R - 6, -0.04], [FRAME_R + 22, -0.054], [FRAME_R + 22, 0.054], [WIN_R - 6, 0.04]]) {
      ks.push([ARC_CX + Math.cos(-Math.PI / 2 + da) * rr, ARC_CY + Math.sin(-Math.PI / 2 + da) * rr]);
    }
    L.inkPath(ctx, ks, { closed: true, smooth: false, fill: wood, width: 2.6, seed: 714, wobble: 0.4, taper: [2, 4] });
    L.hatch(ctx, ks, { angle: -Math.PI / 4, spacing: 4.5, width: 1.2, color: P.ink, alpha: 0.8, length: [6, 18], seed: 715, clip: true, inset: 0, density: (x) => L.smoothstep(530, 556, x) });
    L.inkLine(ctx, ks[0][0] + 5, ks[0][1] - 6, ks[1][0] + 6, ks[1][1] + 6, { width: 1.8, color: woodLight, alpha: 0.9, seed: 716, taper: [3, 3], wobble: 0.3 });
    L.inkPath(ctx, g.dome, { width: 1.6, seed: 711, taper: [0, 0], wobble: 0.9, alpha: 0.95 });
    L.inkPath(ctx, g.revealInner, { width: 1.3, seed: 712, taper: [60, 0], wobble: 0.8, alpha: 0.85 });

    // the sill: two pieces that stop at the case outline
    for (const [x0, x1, sd] of [[-40, g.sillL, 0], [g.sillR, 1120, 1]]) {
      // shadow the sill casts on the wall
      L.hatch(ctx, [[x0, SILL_Y1], [x1, SILL_Y1], [x1 - 6, SILL_Y1 + 13], [x0, SILL_Y1 + 13]], { angle: -Math.PI / 4, spacing: 4.5, width: 1.2, color: P.inkSoft, alpha: 0.75, length: [8, 16], seed: 720 + sd, clip: true, inset: 0 });
      ctx.save();
      ctx.fillStyle = wood;
      ctx.fillRect(x0, SILL_Y0, x1 - x0, SILL_Y1 - SILL_Y0);
      ctx.fillStyle = woodLight;
      ctx.fillRect(x0, SILL_Y0, x1 - x0, 6);
      ctx.restore();
      L.hatch(ctx, [[x0, SILL_Y0 + 6], [x1, SILL_Y0 + 6], [x1, SILL_Y1], [x0, SILL_Y1]], { angle: 0.02, spacing: 3.5, width: 1.1, color: P.ink, alpha: 0.75, length: [30, 110], gap: [6, 22], seed: 722 + sd, clip: true, inset: 0 });
      L.hatch(ctx, [[x0, SILL_Y0 + 6], [x1, SILL_Y0 + 6], [x1, SILL_Y1], [x0, SILL_Y1]], { angle: -Math.PI / 4, spacing: 5, width: 1.1, color: P.ink, alpha: 0.7, length: [6, 14], seed: 724 + sd, clip: true, inset: 0, density: (x, y) => L.smoothstep(SILL_Y0 + 6, SILL_Y1, y) });
      L.inkLine(ctx, x0, SILL_Y0, x1, SILL_Y0, { width: 3, seed: 730 + sd, taper: [0, 3], wobble: 0.6 });
      L.inkLine(ctx, x0, SILL_Y0 + 6, x1, SILL_Y0 + 6, { width: 1.2, alpha: 0.6, seed: 732 + sd, taper: [0, 6], wobble: 0.5 });
      L.inkLine(ctx, x0, SILL_Y1, x1, SILL_Y1, { width: 3, seed: 734 + sd, taper: [0, 3], wobble: 0.6 });
      const xe = sd ? x0 : x1;
      L.inkLine(ctx, xe, SILL_Y0 - 1, xe, SILL_Y1 + 1, { width: 2.6, seed: 736 + sd, taper: 0, wobble: 0.3 });
    }


  }

  // at night the daylight outside the window darkens with open hatching, not a flat fill
  function nightHatch(ctx, L, P, clip, seed, bounds, color, alpha) {
    L.hatch(ctx, clip, { angle: -Math.PI / 4, spacing: 12, width: 1.6, color: color || P.nightSky, alpha: alpha || 0.35, length: [60, 180], gap: [3, 10], seed, clip: true, inset: 0, overshoot: 0, bounds });
  }

  function drawConstruction(ctx, L, P) {
    const c = { width: 1.5, color: P.inkFaint, alpha: 0.3, taper: 0, wobble: 0.8 };
    L.inkLine(ctx, CX, 110, CX, 1440, Object.assign({ seed: 902 }, c));
    L.inkLine(ctx, 60, 520, ARC_CX, ARC_CY, Object.assign({ seed: 903 }, c, { alpha: 0.22 }));
    L.inkLine(ctx, 1020, 520, ARC_CX, ARC_CY, Object.assign({ seed: 904 }, c, { alpha: 0.22 }));
    L.inkLine(ctx, 352, 600, 728, 600, Object.assign({ seed: 905 }, c));
    L.inkLine(ctx, 392, 905, 688, 905, Object.assign({ seed: 906 }, c));
    L.inkLine(ctx, 392, 332, 688, 332, Object.assign({ seed: 907 }, c));
    // the leaf horizon, and verticals tangent to the widest case outline
    L.inkLine(ctx, 0, YH, 1080, YH, Object.assign({ seed: 908 }, c));
    L.inkLine(ctx, 410, 332, 410, 1300, Object.assign({ seed: 909 }, c));
    L.inkLine(ctx, 670, 332, 670, 1300, Object.assign({ seed: 914 }, c));
    // a light height bracket at x 720, where 07 measures the case
    L.inkLine(ctx, 720, 332, 720, 905, Object.assign({ seed: 915 }, c));
    L.inkLine(ctx, 712, 332, 728, 332, Object.assign({ seed: 916 }, c));
    L.inkLine(ctx, 712, 905, 728, 905, Object.assign({ seed: 917 }, c));
  }

  // ---------------------------------------------------------------------------
  // sun and moon
  // ---------------------------------------------------------------------------

  const SUN_R = 46;
  function sunRays(x, y) {
    const rays = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + 0.13;
      const long = i % 2 === 0;
      const right = i === 0 || i === 1 || i === 11;
      const r0 = SUN_R + 11, r1 = (SUN_R + (long ? 38 : 26)) * (right ? 1.2 : 1);
      rays.push([x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1]);
    }
    return rays;
  }

  function drawSun(ctx, L, P, x, y, rayW) {
    const seed = L.hash(ID, 'sun', Math.round(x));
    sunRays(x, y).forEach((q, i) => L.inkLine(ctx, q[0], q[1], q[2], q[3], { width: rayW, seed: seed + i, taper: [2, 8], wobble: 0.4 }));
    const disc = L.ellipsePts(x, y, SUN_R, SUN_R, 40);
    L.inkPath(ctx, disc, { closed: true, fill: P.sun, width: 3.6, seed: seed + 20 });
    L.hatch(ctx, disc, { spacing: 5, width: 1.3, color: P.ochre, alpha: 0.85, seed: seed + 21, length: [8, 26], density: (px, py) => L.smoothstep(0.05, 0.7, ((px - x) * 0.6 + (py - y) * 0.8) / SUN_R) });
    L.stipple(ctx, disc, { spacing: 7, r: [0.8, 1.4], color: P.ochre, alpha: 0.7, seed: seed + 23, density: (px, py) => 0.6 * L.smoothstep(-0.2, 0.4, ((px - x) * 0.6 + (py - y) * 0.8) / SUN_R) });
    L.inkPath(ctx, [[x - 28, y - 14], [x - 18, y - 28], [x - 4, y - 34]], { width: 3, color: P.white, alpha: 0.85, seed: seed + 22, taper: [6, 8] });
  }

  // the hollow faces up-left, away from the 12 o'clock slot
  const MOON_R = 50, MOON_ROT = 0.8 + Math.PI;
  function moonShape(x, y) {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const th = -Math.PI / 2 + (i / 24) * Math.PI;
      pts.push([-Math.cos(th) * MOON_R, Math.sin(th) * MOON_R]);
    }
    for (let i = 24; i >= 0; i--) {
      const th = -Math.PI / 2 + (i / 24) * Math.PI;
      pts.push([-Math.cos(th) * MOON_R * 0.3, Math.sin(th) * MOON_R * 0.97]);
    }
    const cr = Math.cos(MOON_ROT), sr = Math.sin(MOON_ROT);
    return pts.map(([px, py]) => [x + px * cr - py * sr, y + px * sr + py * cr]);
  }
  const MOON_STARS = [[-96, -22], [-58, -70], [64, -74], [-130, -50]]; // mirrored in x; clear of the 12 o'clock slot

  function drawMoon(ctx, L, P, x, y, day) {
    const moon = moonShape(x, y);
    const cr = Math.cos(MOON_ROT), sr = Math.sin(MOON_ROT);
    L.inkPath(ctx, moon, { closed: true, fill: P.white, width: 3.2, seed: L.hash(ID, 'moon'), taper: [4, 8] });
    L.hatch(ctx, moon, { spacing: 4.5, width: 1.1, color: P.inkSoft, alpha: 0.6, angle: -0.9, length: [6, 18], seed: 861, density: (px, py) => L.smoothstep(-16, 4, (px - x) * cr + (py - y) * sr) });
    const r = L.rng(L.hash(ID, 'moonstars', day));
    for (const [dx, dy] of MOON_STARS) {
      ctx.beginPath();
      ctx.arc(x + dx + r.range(-2, 2), y + dy + r.range(-2, 2), r.range(2.4, 3.4), 0, TAU);
      ctx.fillStyle = P.white;
      ctx.fill();
    }
  }

  // repaint the window sky in a gap around the sun or moon so the overlays pass behind it,
  // then draw the body. Everything stays behind the window frame and the twig.
  function drawSkyBody(ctx, L, P, g, st) {
    const [x, y] = SRC[st.k];
    const gapPath = new Path2D();
    const dot = (px, py, rr) => {
      gapPath.moveTo(px + rr, py);
      gapPath.arc(px, py, rr, 0, TAU);
    };
    if (st.k === 1) {
      dot(x, y, SUN_R + 6);
      for (const q of sunRays(x, y)) {
        const d = Math.hypot(q[2] - q[0], q[3] - q[1]);
        for (let s = 0; s <= d; s += 2.5) dot(L.lerp(q[0], q[2], s / d), L.lerp(q[1], q[3], s / d), 8);
      }
    } else {
      for (const p of moonShape(x, y)) dot(p[0], p[1], 8);
      gapPath.moveTo(x, y);
      L.tracePath(gapPath, moonShape(x, y), true);
    }
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, g.dome, true);
    L.tracePath(ctx, g.reveal, true);
    ctx.clip('evenodd'); // the opening minus the shadowed reveal
    clipPoly(ctx, L, g.aboveTwig);
    ctx.save();
    ctx.clip(gapPath);
    drawWindowSky(ctx, L, P, g, st);
    ctx.restore();
    if (st.k === 1) drawSun(ctx, L, P, x, y, 3.4);
    else drawMoon(ctx, L, P, x, y, st.day);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // the leaf, the dial and the shadow
  // ---------------------------------------------------------------------------

  function drawLeaf(ctx, L, P, g, st) {
    const bi = L.boil(L.T);
    const hatchCol = L.mix(P.milkweedDeep, P.ink, 0.5);
    // perspective construction: guides from the midrib's vanishing point on the leaf horizon, across
    // the wall and the leaf to the bottom edge. Drawn before the leaf clip so they run on the wall.
    const vpx = 540 + FX * (-AX / AZ), vpy = YH;
    for (const [bx, sd] of [[-420, 0], [120, 1], [980, 2], [1560, 3]]) {
      L.inkLine(ctx, vpx, vpy, bx, 1990, { width: 1.5, color: P.inkFaint, alpha: 0.3, taper: 0, wobble: 0.8, seed: 810 + sd });
    }
    L.inkPath(ctx, g.leaf, { closed: true, fill: P.milkweed, width: 0.01, alpha: 0, seed: 740, wobble: 1 });
    ctx.save();
    clipPoly(ctx, L, g.leaf);

    // the right half turns slightly from the light: one flat plane of shade
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, g.rib.map((q) => q.c).concat([[1400, 2100], [1400, 900]]), true);
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = P.milkweedDeep;
    ctx.fill();
    ctx.restore();

    // hatching between the side veins
    const hp = [new Path2D(), new Path2D(), new Path2D()];
    g.leafStrokes.forEach((sk, i) => strokeTo(hp[sk.grp], sk.pts, sk.w, true, (L.h3(i, bi, 741) - 0.5) * 1.3));
    fillPaths(ctx, hp, hatchCol, 0.9);
    // cross layer at 105 degrees only in the near shadowed corner, lower right
    L.hatch(ctx, g.leaf, {
      angle: -1.8326, spacing: 7, width: 1.35, color: hatchCol, alpha: 0.85, seed: 742, length: [30, 90], gap: [3, 10],
      density: (x, y) => L.smoothstep(1600, 1680, y) * L.smoothstep(620, 700, x) * L.smoothstep(-6, 30, x - g.midX(y)),
    });
    // turned-edge shadow just inside the right margin where it runs off the frame
    L.hatch(ctx, g.leaf, {
      angle: -Math.PI / 4, spacing: 5, width: 1.35, color: hatchCol, alpha: 0.9, seed: 745, length: [8, 20], gap: [1, 4],
      density: (x, y) => {
        const d = y - g.yTop(x);
        return L.smoothstep(990, 1015, x) * L.smoothstep(4, 8, d) * (1 - L.smoothstep(22, 28, d));
      },
    });
    // curled near margin: a hatched shadow band under the rolled edge
    const nearF = (x) => L.smoothstep(80, 460, Math.abs(x - LEAF_TIP[0]));
    L.hatch(ctx, g.leaf, {
      angle: -Math.PI / 4, spacing: 5, width: 1.3, color: hatchCol, alpha: 0.85, seed: 743, length: [8, 22], gap: [1, 4],
      density: (x, y) => {
        const nf = nearF(x);
        const d = y - g.yTop(x);
        return nf * (1 - L.smoothstep(14, 16 + 40 * nf, d));
      },
    });
    // downy hairs
    L.stipple(ctx, g.leaf, { spacing: 17, r: [1, 1.6], color: P.milkweedPale, alpha: 0.9, seed: 744, density: (x, y) => (inDial(x, y, 1.04) ? 0 : 1) });
    // veinlet net
    ctx.save();
    const net = new Path2D();
    for (const [a, m, b] of g.leafNet) {
      net.moveTo(a[0], a[1]);
      net.quadraticCurveTo(m[0], m[1], b[0], b[1]);
    }
    ctx.strokeStyle = P.milkweedPale;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1.2;
    ctx.stroke(net);
    ctx.restore();

    // intramarginal loops: one fine ink line. Side veins: a pale raised band tapering from the midrib to
    // the margin, with an ink line on its shadow side that tapers with it
    const veinW = (z) => clamp((FX * 0.0055) / z, 1.8, 8);
    g.loops.forEach((lo, i) => {
      L.inkPath(ctx, lo.pts, { width: 1.2, color: P.inkSoft, alpha: 0.6, seed: 790 + i, taper: [10, 20], wobble: 0.6 });
    });
    const veinPres = (u) => L.lerp(1.6, 0.45, u);
    g.veins.forEach((v, i) => {
      const w = veinW(v.zm);
      const n = v.pts.length - 1;
      L.inkPath(ctx, v.pts, { width: w + 2, color: P.milkweedPale, alpha: 0.95, seed: 830 + i, taper: [4, 40], wobble: 0.7, pressure: veinPres });
      L.inkPath(ctx, v.pts.map((p, q) => [p[0] + 0.5, p[1] + (w + 2) * 0.5 * veinPres(q / n) + 0.6]), { width: 1.1 + w * 0.18, color: P.inkSoft, alpha: 0.9, seed: 870 + i, taper: [6, 50], wobble: 0.7, pressure: (u) => L.lerp(1.3, 0.6, u) });
    });

    // midrib, widening toward the viewer
    const Lp = g.rib.map((q) => q.l), Rp = g.rib.map((q) => q.r);
    const ribPoly = Lp.concat(Rp.slice().reverse());
    ctx.beginPath();
    L.tracePath(ctx, ribPoly, true);
    ctx.fillStyle = P.milkweedPale;
    ctx.fill();
    L.hatch(ctx, ribPoly, { angle: 0.1, spacing: 4.5, width: 1, color: P.milkweedDeep, alpha: 0.6, seed: 792, length: [4, 10], density: (x, y) => L.smoothstep(1150, 1600, y) * L.smoothstep(-2, 6, x - g.midX(y)) });
    L.inkPath(ctx, Rp.map((p) => [p[0] + 1, p[1]]), { width: 2.4, color: P.inkSoft, seed: 793, taper: [30, 10] });
    L.inkPath(ctx, Lp.map((p) => [p[0] - 1, p[1]]), { width: 1.3, color: P.inkSoft, alpha: 0.6, seed: 794, taper: [30, 10] });

    // the rolled near margin: a pale thickness edge just inside the outline, with an ink line under it
    const inward = (pts, d) =>
      pts.map((p, i) => {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
        let nx = -(b[1] - a[1]), ny = b[0] - a[0];
        const nl = Math.hypot(nx, ny) || 1;
        nx /= nl;
        ny /= nl;
        if (ny < 0) {
          nx = -nx;
          ny = -ny;
        }
        return [p[0] + nx * d, p[1] + ny * d];
      });
    const presL = (u) => 1 - L.smoothstep(0.35, 0.92, u);
    const presR = (u) => L.smoothstep(0.1, 0.6, u);
    for (const [pts, pres, sd] of [[g.edgeL, presL, 0], [g.edgeR, presR, 1]]) {
      L.inkPath(ctx, inward(pts, 5.5), { width: 7.5, color: P.milkweedPale, alpha: 0.95, seed: 800 + sd, taper: 0, wobble: 0.7, pressure: pres, minWidth: 0 });
      L.inkPath(ctx, inward(pts, 10.5), { width: 1.7, color: P.inkSoft, alpha: 0.9, seed: 802 + sd, taper: 0, wobble: 0.7, pressure: (u) => Math.max(0.05, pres(u)), minWidth: 0 });
    }

    // night: open hatching light enough that the leaf itself stays under the flash threshold
    if (st.k === 2) nightHatch(ctx, L, P, g.leaf, 760, null, P.night, 0.22);
    ctx.restore();
    L.inkPath(ctx, g.leaf, { closed: true, width: 4.2, seed: 740, wobble: 1 });
  }

  function shadowPoly(g, F, Tp, halfW) {
    const dx = Tp[0] - F[0], dy = Tp[1] - F[1];
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    const A = [], B = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24;
      const w = (g.hw(905 - u * 573) / 130) * halfW;
      const px = F[0] + ux * len * u, py = F[1] + uy * len * u;
      A.push([px + nx * w, py + ny * w]);
      B.push([px - nx * w, py - ny * w]);
    }
    return A.concat(B.reverse());
  }

  function drawDialAndShadow(ctx, L, P, g, st) {
    const night = st.k === 2;
    const c = { width: 1.5, color: P.inkFaint, alpha: 0.32, taper: 0, wobble: 0.6 };
    // construction: the perspective square around the dial and its axes
    L.inkPath(ctx, [[DIAL_X - DIAL_RX - 34, DIAL_Y - DIAL_RY], [DIAL_X + DIAL_RX + 34, DIAL_Y - DIAL_RY], [DIAL_X + DIAL_RX + 64, DIAL_Y + DIAL_RY], [DIAL_X - DIAL_RX - 64, DIAL_Y + DIAL_RY]], Object.assign({ closed: true, smooth: false, seed: 910 }, c));
    L.inkLine(ctx, DIAL_X - DIAL_RX - 130, DIAL_Y, DIAL_X + DIAL_RX + 130, DIAL_Y, Object.assign({ seed: 911 }, c));
    L.inkLine(ctx, DIAL_X - DIAL_RX - 34, DIAL_Y - DIAL_RY, DIAL_X + DIAL_RX + 64, DIAL_Y + DIAL_RY, Object.assign({ seed: 912 }, c, { alpha: 0.2 }));
    L.inkLine(ctx, DIAL_X + DIAL_RX + 34, DIAL_Y - DIAL_RY, DIAL_X - DIAL_RX - 64, DIAL_Y + DIAL_RY, Object.assign({ seed: 913 }, c, { alpha: 0.2 }));

    // pale dial face
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = P.milkweedPale;
    ctx.beginPath();
    ctx.ellipse(DIAL_X, DIAL_Y, DIAL_RX, DIAL_RY, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    // hour lines radiating from the gnomon foot
    const hours = new Path2D();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      hours.moveTo(DIAL_X + Math.cos(a) * 16, DIAL_Y + 3 + Math.sin(a) * 6);
      hours.lineTo(DIAL_X + Math.cos(a) * (DIAL_RX - 36), DIAL_Y + Math.sin(a) * (DIAL_RY - 14));
    }

    // the chrysalis shadow, a sundial hand swinging opposite the sun. It keeps one spindle shape in
    // every drawing; at night it is a pale dashed ghost of the same hand
    const F = FOOT;
    const Tp = TIP[st.k];
    const halfW = st.k === 0 ? 30 : 14;
    const sh = shadowPoly(g, F, Tp, halfW);
    ctx.save();
    ctx.globalAlpha = night ? 0.25 : 0.5;
    ctx.beginPath();
    L.tracePath(ctx, sh, true);
    ctx.fillStyle = P.milkweedDeep;
    ctx.fill();
    ctx.restore();
    if (night) {
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = P.milkweedDeep;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      L.tracePath(ctx, sh, true);
      ctx.stroke();
      ctx.restore();
    } else {
      L.crossHatch(ctx, sh, { spacing: 4, crossSpacing: 5.5, width: 1.4, color: L.mix(P.milkweedDeep, P.ink, 0.4), alpha: 0.95, seed: 920 + st.k, layers: 2, length: [10, 30], inset: 1, overshoot: 1 });
      L.inkPath(ctx, sh, { closed: true, width: 1.5, color: L.mix(P.milkweedDeep, P.ink, 0.3), alpha: 0.9, seed: 924, taper: [4, 8] });
      const ux = Tp[0] - F[0], uy = Tp[1] - F[1];
      const ln = Math.hypot(ux, uy);
      L.inkLine(ctx, Tp[0], Tp[1], Tp[0] + (ux / ln) * 34, Tp[1] + (uy / ln) * 34, { width: 4, color: P.milkweedDeep, alpha: 0.95, seed: 925, taper: [2, 12] });
    }

    // dial ring, inner ring, hour ticks
    L.inkPath(ctx, L.ellipsePts(DIAL_X, DIAL_Y, DIAL_RX, DIAL_RY, 72), { closed: true, width: 2.8, color: P.inkSoft, seed: 930 });
    L.inkPath(ctx, L.ellipsePts(DIAL_X, DIAL_Y, DIAL_RX - 36, DIAL_RY - 14, 64), { closed: true, width: 1.3, color: P.inkSoft, alpha: 0.6, seed: 931 });
    const minor = new Path2D();
    for (let i = 0; i < 48; i++) {
      if (i % 4 === 0) continue;
      const a = (i / 48) * TAU;
      minor.moveTo(DIAL_X + Math.cos(a) * DIAL_RX, DIAL_Y + Math.sin(a) * DIAL_RY);
      minor.lineTo(DIAL_X + Math.cos(a) * (DIAL_RX - 14), DIAL_Y + Math.sin(a) * (DIAL_RY - 5.5));
    }
    ctx.save();
    ctx.strokeStyle = P.inkSoft;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.1;
    ctx.stroke(minor);
    ctx.restore();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const cs = Math.cos(a), sn = Math.sin(a);
      const major = i % 3 === 0;
      const d0 = major ? -8 : 0, d1 = major ? 40 : 26;
      L.inkLine(ctx, DIAL_X + cs * (DIAL_RX - d0), DIAL_Y + sn * (DIAL_RY - d0 * 0.4), DIAL_X + cs * (DIAL_RX - d1), DIAL_Y + sn * (DIAL_RY - d1 * 0.4), { width: major ? 3 : 2, color: P.inkSoft, seed: 940 + i, taper: [2, 5], wobble: 0.3 });
    }
    ctx.save();
    ctx.strokeStyle = P.inkSoft;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1.2;
    ctx.setLineDash([6, 5]);
    ctx.stroke(hours);
    ctx.restore();
    L.inkCircle(ctx, F[0], F[1], 7, { ry: 4, width: 2, color: P.inkSoft, seed: 960, fill: P.milkweedPale });
  }

  // ---------------------------------------------------------------------------
  // twig, silk pad, cremaster (copied from 06 j-hang)
  // ---------------------------------------------------------------------------

  function drawTwig(ctx, L, P, g) {
    const seed = g.twigSeed;
    const tw = g.tw;
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
      ctx.ellipse(PX, PY + 1, 37, 9, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    const n = front ? 34 : 90;
    for (let i = 0; i < n; i++) {
      const a = r() * TAU;
      const rad = Math.sqrt(r());
      const spread = front ? 30 : i < 22 ? 92 : 42;
      const cx = PX + Math.cos(a) * rad * spread;
      const cy = PY + (front ? 5 : -2) + Math.sin(a) * rad * (front ? 10 : 12);
      const len = front ? r.range(8, 22) : r.range(10, 34);
      const ang = (r() - 0.5) * (front ? 2.2 : 0.9);
      const jb = (L.h3(i, b, seed + (front ? 7 : 3)) - 0.5) * 1.6;
      const x0 = cx - (Math.cos(ang) * len) / 2, y0 = cy - (Math.sin(ang) * len) / 2 + jb;
      const x1 = cx + (Math.cos(ang) * len) / 2, y1 = cy + (Math.sin(ang) * len) / 2 - jb;
      const bend = (r() - 0.5) * 14;
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

  function drawCremaster(ctx, L, P, seed) {
    L.inkPath(ctx, [[PX, PY - 2], [PX, PY + 14], [PX + 1, PY + 34]], { width: 10, color: P.veinBlack, taper: [0, 0], swell: 0, seed, wobble: 0.4 });
    L.inkPath(ctx, [[PX - 9, PY + 1], [PX, PY + 6], [PX + 9, PY + 1]], { width: 3, color: P.veinBlack, seed: seed + 1, taper: [2, 2] });
  }

  // ---------------------------------------------------------------------------
  // the chrysalis on G3
  // ---------------------------------------------------------------------------

  function drawChrysalis(ctx, L, P, g, st) {
    const night = st.k === 2;
    const s = st.dark;
    let fill = P.chrysalis;
    if (s > 0) fill = s < 0.5 ? L.mix(P.chrysalis, P.teal, s * 2) : L.mix(P.teal, P.chrysalisDark, (s - 0.5) * 2);
    if (night) fill = L.mix(fill, P.nightSky, 0.06);
    const deep = s > 0 ? L.mix(P.chrysalisDeep, P.veinBlack, s * 0.8) : P.chrysalisDeep;
    const hatchCol = L.mix(deep, P.ink, 0.35);
    const hw = g.hw;
    const wing = st.wing > 0;

    L.inkPath(ctx, g.caseOutline, { closed: true, fill, width: 5, seed: 500, taper: [0, 0], overlap: 30, double: { offset: -6.5, width: 0.3, alpha: 0.55, from: 0.52, to: 0.86 } });

    ctx.save();
    clipPoly(ctx, L, g.caseCoarse);

    if (wing) drawWingInside(ctx, L, P, g, st);

    // abdominal segment rings above the rim band
    const segCol = wing ? L.mix(P.chrysalisDark, P.spotWhite, 0.3) : hatchCol;
    for (let i = 0; i < 5; i++) {
      const y = 352 + i * 32;
      const w = hw(y);
      const pts = [];
      for (let j = 0; j <= 12; j++) {
        const u = -0.96 + (j / 12) * 1.92;
        pts.push([CX + w * u, y + 0.07 * w * Math.sqrt(1 - u * u)]);
      }
      L.inkPath(ctx, pts, { width: 1.8, color: segCol, alpha: 0.75, seed: 510 + i, taper: [24, 24] });
    }

    // contour hatching on the shadow side (one fixed drawing, so the case does not flicker at 4 Hz)
    const reach = 0.15;
    const hs = L.hash(ID, 'ch');
    const hc = wing ? deep : hatchCol;
    contourHatch(ctx, L, {
      y0: 336, y1: 900, spacing: 6, cx: CX, hw, bow: 0.08, width: 1.8, color: hc, alpha: 0.88, seed: hs,
      from: (y, row) => reach + 0.14 * L.noise1(row * 0.21, 531) - 0.2 * L.smoothstep(720, 900, y),
      to: () => 1.02,
    });
    contourHatch(ctx, L, {
      y0: 339, y1: 900, spacing: 6, cx: CX, hw, bow: 0.08, width: 1.5, color: hc, alpha: 0.85, seed: hs + 1,
      from: (y, row) => reach + 0.4 + 0.12 * L.noise1(row * 0.27, 532) - 0.2 * L.smoothstep(760, 900, y),
      to: () => 1.02,
    });
    // cross layer at 105 degrees in the deepest shade
    L.hatch(ctx, g.caseCoarse, {
      angle: -1.8326, spacing: 7, width: 1.35, color: hc, alpha: 0.85, seed: 540, length: [10, 34],
      density: (x, y) => L.smoothstep(0.66, 0.8, (x - CX) / (hw(y) || 1)),
    });
    // form turning under at the head end, lower left
    contourHatch(ctx, L, {
      y0: 760, y1: 898, spacing: 6, cx: CX, hw, bow: 0.08, width: 1.4, color: hc, alpha: 0.7, seed: hs + 2,
      from: () => -1.02,
      to: (y) => -0.78 + 0.25 * L.smoothstep(780, 900, y),
    });
    L.stipple(ctx, g.caseCoarse, { spacing: 6.5, r: [0.7, 1.4], color: hc, alpha: 0.6, seed: 545, density: (x, y) => { const u = (x - CX) / (hw(y) || 1); return 0.75 * L.smoothstep(-0.2, 0.2, u) * (1 - L.smoothstep(0.2, 0.5, u)); } });
    // shadow under the rim band's overhang
    L.hatch(ctx, [[400, 522], [680, 522], [680, 550], [400, 550]], { angle: -Math.PI / 4, spacing: 5, width: 1.4, color: hc, alpha: 0.9, seed: 546, length: [6, 18], clip: true, inset: 0, density: (x, y) => 1 - L.smoothstep(536, 550, y) });
    // reflected light along the right edge
    const refl = [];
    for (let y = 420; y <= 860; y += 10) refl.push([CX + hw(y) - 8, y]);
    L.inkPath(ctx, refl, { width: 5, color: L.mix(wing ? P.chrysalisDark : P.chrysalis, P.white, 0.35), alpha: wing ? 0.5 : 0.9, seed: 547, taper: [60, 60], wobble: 0.6 });

    if (!wing) {
      // wing-case line and its echo, faint venation in the pad, sheaths in the ventral crescent
      L.inkPath(ctx, g.wingLine, { width: 3, color: hatchCol, alpha: 0.95, seed: 550, taper: [20, 30] });
      L.inkPath(ctx, g.wingLine.map((p) => [p[0] - 9, p[1] + 5]), { width: 1.5, color: hatchCol, alpha: 0.6, seed: 551, taper: [40, 40] });
      // the future venation, only just readable through the jade cuticle
      wingVeins(g).forEach((v, i) => {
        if (i > 2 && i < 13) L.inkPath(ctx, v[0], { width: 1.3, color: hatchCol, alpha: 0.28, seed: 555 + i, taper: [30, 30], wobble: 0.8 });
      });
      for (let i = 0; i < 2; i++) {
        const f = 0.36 + i * 0.3;
        const pts = [];
        for (let y = 700; y <= 870; y += 10) pts.push([L.lerp(CX - hw(y) + 6, g.wingX(y), f), y]);
        L.inkPath(ctx, pts, { width: 1.4, color: hatchCol, alpha: 0.6, seed: 565 + i, taper: [20, 20] });
      }
    }

    // rim band: a black band 10 px tall at y 515 with a slight contour bow
    const band = [];
    const wTop = hw(510), wBot = hw(520);
    for (let j = 0; j <= 16; j++) {
      const u = -1.05 + (j / 16) * 2.1;
      band.push([CX + wTop * u, 510 + 3 * Math.sqrt(Math.max(0, 1 - u * u))]);
    }
    for (let j = 16; j >= 0; j--) {
      const u = -1.05 + (j / 16) * 2.1;
      band.push([CX + wBot * u, 520 + 3 * Math.sqrt(Math.max(0, 1 - u * u))]);
    }
    ctx.beginPath();
    L.tracePath(ctx, band, true);
    ctx.fillStyle = P.veinBlack;
    ctx.fill();
    L.inkPath(ctx, band.slice(0, 17).map((p) => [p[0], p[1] - 3]), { width: 1.6, color: P.gold, alpha: 0.9, seed: 560, taper: [30, 30] });

    // sheen: highlight hatches on the lit upper left (over the wing once it shows)
    const hl = wing ? [[[470, 700], [484, 600]], [[492, 650], [502, 590]]] : [[[450, 474], [472, 418]], [[444, 548], [455, 510]], [[472, 392], [492, 364]]];
    hl.forEach((q, i) => L.inkLine(ctx, q[0][0], q[0][1], q[1][0], q[1][1], { width: wing ? 3.5 : i === 0 ? 5 : 3.5, color: P.white, alpha: wing ? 0.75 : 0.85, seed: 570 + i, taper: [6, 10] }));
    if (wing) L.inkLine(ctx, 450, 474, 472, 418, { width: 4, color: P.white, alpha: 0.6, seed: 573, taper: [6, 10] });
    ctx.restore();

    // rim gold dots: dim until their day lights them
    g.rimDots.forEach((d, i) => {
      const lit = i <= st.day;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.rx, d.ry, 0, 0, TAU);
      ctx.fillStyle = lit ? P.gold : L.mix(P.gold, deep, 0.75);
      ctx.fill();
      if (lit) {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = P.goldLight;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(d.x - d.rx * 0.3, d.y - 2, Math.max(1, d.rx * 0.36), 0, TAU);
        ctx.fillStyle = P.white;
        ctx.globalAlpha = 0.9;
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.lineWidth = 1;
        ctx.strokeStyle = P.ink;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });
    for (const [x, y, rad] of g.lowDots) {
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, TAU);
      ctx.fillStyle = P.gold;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = P.ink;
      ctx.globalAlpha = 0.7;
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(x - rad * 0.3, y - rad * 0.3, rad * 0.35, 0, TAU);
      ctx.fillStyle = P.goldLight;
      ctx.fill();
    }
  }

  // monarch forewing venation folded into the wing pad: [points, base width, tip width]
  function wingVeins(g) {
    const B = [662, 552];
    const C1 = [618, 744], C2 = [554, 716]; // discal cell end corners, costal and anal
    const mEnd = (y) => g.wingOff(y, 26);
    return [
      [[B, [652, 650], C1], 9, 5.5], // radius stem, costal edge of the cell
      [[B, [600, 612], C2], 9, 5.5], // cubitus stem, anal edge of the cell
      [[C1, [586, 736], C2], 4.5, 4], // cross vein closing the cell
      [[[656, 610], [668, 660], [676, 720]], 4.5, 3], // R1 to the costa
      [[[646, 690], [660, 750], [664, 800]], 4.5, 3], // R2
      [[C1, [634, 800], [632, 846]], 4.5, 3], // R3
      [[C1, [612, 810], [598, 866]], 4.5, 3], // R4+5 into the apex
      [[[590, 740], [572, 810], mEnd(868)], 4.5, 3], // M1
      [[[572, 728], [534, 790], mEnd(836)], 4.5, 3], // M2
      [[C2, [510, 766], mEnd(796)], 4.5, 3], // M3
      [[[578, 670], [512, 706], mEnd(724)], 5, 3], // Cu1
      [[[608, 608], [528, 640], mEnd(656)], 5, 3], // Cu2
      [[B, [560, 580], mEnd(596)], 6, 3.5], // 2A toward the tornus
    ];
  }

  // the folded forewing seen through the darkened case. Base under the band on the dorsal side,
  // costa down the right edge to the apex at the head end, outer margin back up the wing-case line.
  function drawWingInside(ctx, L, P, g, st) {
    const stage = st.stage;
    const orangeA = stage <= 1 ? 0 : stage === 2 ? 0.8 : 1;
    const glazeA = stage <= 1 ? 0.35 : stage === 2 ? 0.25 : 0.18;
    const spotA = stage <= 1 ? 0.6 : 1;
    const glaze = L.mix(P.chrysalisDark, P.veinBlack, 0.3);
    const hw = g.hw;

    // ventral crescent: dark sheaths with pale paired lines
    ctx.save();
    clipPoly(ctx, L, g.sheathRegion);
    ctx.fillStyle = glaze;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(360, 540, 260, 380);
    ctx.globalAlpha = 1;
    for (let i = 0; i < 3; i++) {
      const f = 0.25 + i * 0.25;
      const pts = [];
      for (let y = 590; y <= 880; y += 10) pts.push([L.lerp(CX - hw(y) + 5, g.wingX(y), f), y]);
      L.inkPath(ctx, pts, { width: 1.3, color: L.mix(P.chrysalisDark, P.spotWhite, 0.4), alpha: 0.8, seed: 571 + i, taper: [20, 20] });
    }
    ctx.restore();

    ctx.save();
    clipPoly(ctx, L, g.wingPad);
    if (orangeA > 0) {
      ctx.globalAlpha = orangeA;
      ctx.fillStyle = P.monarch;
      ctx.fillRect(400, 530, 300, 400);
      // orange hatching: darker toward the case edge and toward the head end
      L.hatch(ctx, g.wingPad, { clip: true, angle: -0.8, spacing: 5, width: 1.3, color: P.monarchDeep, alpha: 0.85, seed: 580, length: [10, 30], density: (x, y) => 0.12 + 0.6 * L.smoothstep(0.35, 0.9, (x - CX) / (hw(y) || 1)) + 0.3 * L.smoothstep(740, 880, y) });
      L.stipple(ctx, g.wingPad, { spacing: 8, r: [0.8, 1.4], color: P.monarchDeep, alpha: 0.7, seed: 581, density: 0.5 });
      ctx.globalAlpha = 1;
    }

    // venation
    wingVeins(g).forEach((v, i) => L.inkPath(ctx, v[0], { width: v[1], color: P.veinBlack, seed: 585 + i, taper: [0, 0], smooth: true, wobble: 0.7, pressure: (u) => L.lerp(1, v[2] / v[1], u) }));
    // black costal edge down the dorsal side, and the black inner margin under the band
    const costa = [];
    for (let y = 556; y <= 836; y += 14) costa.push([CX + hw(y) - 5, y]);
    L.inkPath(ctx, costa, { width: 18, color: P.veinBlack, seed: 598, taper: [2, 2], wobble: 0.6 });
    L.inkPath(ctx, [[428, 541], [520, 536], [600, 535], [690, 540]], { width: 15, color: P.veinBlack, seed: 599, taper: [2, 2], wobble: 0.6 });
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(668, 556, 36, 24, 0.5, 0, TAU);
    ctx.fillStyle = P.veinBlack;
    ctx.globalAlpha = 0.92;
    ctx.fill();
    ctx.restore();

    // black apex at the head end
    const apex = [[498, 820], [528, 800], [578, 784], [628, 768], [664, 786], [652, 852], [622, 886], [580, 904], [536, 906], [506, 880]];
    ctx.beginPath();
    L.tracePath(ctx, L.smoothPts(apex, true, 6), true);
    ctx.fillStyle = P.veinBlack;
    ctx.fill();
    // outer margin band, 40 px, along the wing-case line
    L.inkPath(ctx, g.marginPts, { width: 40, color: P.veinBlack, seed: 610, taper: [4, 4], wobble: 0.6, widthJitter: 0.08, swell: 0 });

    // the darkened cuticle over the wing: a glaze and the case's own contour hatching
    ctx.globalAlpha = glazeA;
    ctx.fillStyle = P.chrysalisDark;
    ctx.fillRect(400, 530, 300, 400);
    ctx.globalAlpha = 1;
    // soft falloff into the case edge
    L.hatch(ctx, g.wingPad, { clip: true, angle: -Math.PI / 4, spacing: 4.5, width: 1.3, color: P.chrysalisDark, alpha: 0.8, seed: 615, length: [8, 22], density: (x, y) => L.smoothstep(0.8, 0.97, (x - CX) / (hw(y) || 1)) + L.smoothstep(885, 905, y) });
    contourHatch(ctx, L, {
      y0: 540, y1: 900, spacing: 6, cx: CX, hw, bow: 0.08, width: 1.5, color: P.veinBlack, alpha: 0.6, seed: 616,
      from: (y, row) => 0.45 + 0.15 * L.noise1(row * 0.3, 617),
      to: () => 1.02,
    });
    // white spots: two rows in each cell between the vein ends, clearly apart
    ctx.save();
    ctx.globalAlpha = spotA * 0.92;
    ctx.fillStyle = L.mix(P.spotWhite, P.chrysalisDark, 0.1);
    const ends = [556, 596, 656, 724, 796, 836];
    const rs = L.rng(L.hash(ID, 'spots'));
    for (let c = 0; c < ends.length - 1; c++) {
      const y0 = ends[c], y1 = ends[c + 1];
      const span = y1 - y0;
      const outer = span > 48 ? [0.3, 0.7] : [0.5];
      for (const f of outer) {
        const y = L.lerp(y0, y1, f);
        const p = g.wingOff(y, 8.5);
        const q = g.wingOff(y + 4, 8.5);
        ctx.beginPath();
        ctx.ellipse(p[0], p[1], rs.range(4.6, 5.4), rs.range(3.2, 3.8), Math.atan2(q[1] - p[1], q[0] - p[0]), 0, TAU);
        ctx.fill();
      }
      const inner = span > 48 ? [0.5] : [0.5];
      for (const f of inner) {
        const p = g.wingOff(L.lerp(y0, y1, f), 26);
        ctx.beginPath();
        ctx.arc(p[0], p[1], rs.range(2.7, 3.2), 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
    // subapical band: 5 white spots on a straight diagonal across the black apex, orange spots toward the tip
    ctx.save();
    ctx.fillStyle = P.spotWhite;
    for (let i = 0; i < 5; i++) {
      const u = i / 4;
      ctx.beginPath();
      ctx.ellipse(L.lerp(642, 566, u), L.lerp(784, 828, u), 7.5, 5.5, -0.5, 0, TAU);
      ctx.fill();
    }
    if (orangeA > 0) {
      ctx.globalAlpha = orangeA;
      ctx.fillStyle = P.monarch;
      for (const [x, y] of [[606, 858], [618, 844], [584, 872]]) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();

    ctx.restore();
    L.inkPath(ctx, g.wingLine, { width: 2.6, color: P.veinBlack, alpha: 0.95, seed: 599, taper: [10, 20] });

    // sheen lens down the lit left side
    ctx.save();
    ctx.globalAlpha = 0.14;
    const lens = [];
    for (let y = 350; y <= 860; y += 20) lens.push([CX - hw(y) + 10, y]);
    for (let y = 860; y >= 350; y -= 20) lens.push([CX - hw(y) * 0.7, y]);
    ctx.beginPath();
    L.tracePath(ctx, lens, true);
    ctx.fillStyle = P.white;
    ctx.fill();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // overlays
  // ---------------------------------------------------------------------------

  function drawOverlays(ctx, L, P, g, st) {
    // G7 dotted sun-path arc
    ctx.save();
    ctx.strokeStyle = P.annYellow;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.setLineDash([0.01, 4]);
    ctx.beginPath();
    ctx.arc(ARC_CX, ARC_CY, ARC_R, ARC_A0, ARC_A1);
    ctx.stroke();
    ctx.restore();

    // blue ray: from the rim of the sun or moon, straight through the chrysalis to the shadow tip.
    // It passes behind the case and breaks over the twig, pad and cremaster.
    const src = SRC[st.k], tip = TIP[st.k];
    const dx = tip[0] - src[0], dy = tip[1] - src[1];
    const len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    const a = [src[0] + ux * (SUN_R + 8), src[1] + uy * (SUN_R + 8)];
    const segs = [];
    if (a[1] < 233) segs.push([a, [a[0] + ((233 - a[1]) / uy) * ux, 233]]);
    // by day the ray reappears under the cremaster; the night ray, off to the left, reappears under the twig
    const yBack = st.k === 2 ? 308 : 336;
    const b0 = a[1] < yBack ? [a[0] + ((yBack - a[1]) / uy) * ux, yBack] : a;
    segs.push([b0, tip]);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-10, -10, 1100, 1940);
    L.tracePath(ctx, g.caseCoarse, true);
    ctx.clip('evenodd');
    ctx.strokeStyle = P.annBlue;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    if (st.k === 2) ctx.setLineDash([14, 10]);
    ctx.beginPath();
    for (const [p, q] of segs) {
      ctx.moveTo(p[0], p[1]);
      ctx.lineTo(q[0], q[1]);
    }
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = P.annBlue;
    ctx.fillStyle = P.annBlue;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(tip[0], tip[1], 10, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(PASS[0], PASS[1], 5, 0, TAU);
    ctx.fill();
    ctx.restore();

    // sundial sweep: an annYellow arc on the dial rim from the sunrise hand round to the noon hand,
    // drawn on at 24 fps over each day's first 4 frames
    {
      const pa = (p) => {
        const th = Math.atan2(p[1] - FOOT[1], p[0] - FOOT[0]);
        return Math.atan2(Math.sin(th) / DIAL_RY, Math.cos(th) / DIAL_RX);
      };
      const t0 = pa(TIP[0]), t1 = pa(TIP[1]);
      const prog = L.ease.outExpo((st.dayFrame + 0.5) / 4);
      const erx = DIAL_RX + 20, ery = DIAL_RY + 10;
      const te = t0 + (t1 - t0) * prog;
      ctx.save();
      ctx.strokeStyle = P.annYellow;
      ctx.fillStyle = P.annYellow;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.ellipse(DIAL_X, DIAL_Y, erx, ery, 0, t0, te, false);
      ctx.stroke();
      ctx.beginPath();
      for (const tt of prog >= 0.999 ? [t0, te] : [t0]) {
        const px = DIAL_X + Math.cos(tt) * erx, py = DIAL_Y + Math.sin(tt) * ery;
        let nx = Math.cos(tt) / erx, ny = Math.sin(tt) / ery;
        const nl = Math.hypot(nx, ny);
        nx /= nl;
        ny /= nl;
        ctx.moveTo(px - nx * 5, py - ny * 5);
        ctx.lineTo(px + nx * 5, py + ny * 5);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(DIAL_X + Math.cos(te) * erx, DIAL_Y + Math.sin(te) * ery, 5, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // tally ring: 12 slots filling clockwise from 12 o'clock
    const lenH = 26, widH = 11;
    const gapA = Math.asin((widH + 6) / RING_R);
    ctx.save();
    ctx.strokeStyle = P.annYellow;
    ctx.fillStyle = P.annYellow;
    ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const a0 = -Math.PI / 2 + (i / 12) * TAU + gapA;
      const a1 = -Math.PI / 2 + ((i + 1) / 12) * TAU - gapA;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(RING_X, RING_Y, RING_R, a0, a1);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let m = 1; m < 5; m++) {
        const am = L.lerp(a0, a1, m / 5);
        const c = Math.cos(am), s = Math.sin(am), l = m === 2 || m === 3 ? 6 : 9;
        ctx.moveTo(RING_X + c * (RING_R - l), RING_Y + s * (RING_R - l));
        ctx.lineTo(RING_X + c * (RING_R + l), RING_Y + s * (RING_R + l));
      }
      ctx.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const ang = -Math.PI / 2 + (i / 12) * TAU;
      const filled = i <= st.day;
      ctx.save();
      ctx.translate(RING_X + Math.cos(ang) * RING_R, RING_Y + Math.sin(ang) * RING_R);
      ctx.rotate(ang);
      ctx.beginPath();
      if (filled) {
        if (i === st.day && st.dayFrame < 3) {
          const sc = L.ease.outBack((st.dayFrame + 0.5) / 3);
          ctx.scale(sc, sc);
        }
        roundRect(ctx, -lenH, -widH, lenH * 2, widH * 2, widH);
        ctx.fill();
      } else {
        roundRect(ctx, -lenH + 1.5, -widH + 1.5, lenH * 2 - 3, widH * 2 - 3, widH - 1.5);
        ctx.fillStyle = P.paper;
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();

    // magenta change ring at T 15.5
    const mf = st.frame - 60;
    if (mf >= 0 && mf < 10) {
      const p = (mf + 1) / 10;
      ctx.save();
      ctx.strokeStyle = P.annMagenta;
      ctx.globalAlpha = 1 - L.smoothstep(0.35, 1, p);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(540, 620, L.lerp(150, 560, L.ease.outExpo(p)), 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  FILM.scene({
    id: ID,
    draw(ctx, t, info) {
      const L = info.lib, P = L.pal;
      const g = geo(L);
      const st = timing(t);

      drawStripes(ctx, L, P, st);
      drawWindowSky(ctx, L, P, g, st);
      if (st.k === 0) {
        ctx.save();
        clipPoly(ctx, L, g.dome);
        drawSun(ctx, L, P, 60, 520, 4);
        ctx.restore();
      }
      drawWindowFrame(ctx, L, P, g, st);
      drawConstruction(ctx, L, P);
      drawLeaf(ctx, L, P, g, st);
      drawDialAndShadow(ctx, L, P, g, st);
      drawTwig(ctx, L, P, g);
      drawSilk(ctx, L, P, g.silkSeed, false);
      drawChrysalis(ctx, L, P, g, st);
      drawCremaster(ctx, L, P, g.silkSeed + 3500);
      drawSilk(ctx, L, P, g.silkSeed, true);
      if (st.dayFrame < 2) {
        const d = g.rimDots[st.day];
        sparkle(ctx, d.x, d.y, st.dayFrame === 0 ? 32 : 20, P.goldLight, P.white, 1);
      }
      // overlays pass behind the noon sun. At night drawSkyBody repaints the sky round the visible
      // moon, so overlays over the twig stay whole where the moon is hidden behind it
      ctx.save();
      if (st.k === 1) {
        ctx.beginPath();
        ctx.rect(-20, -20, 1120, 1960);
        ctx.moveTo(SRC[1][0] + SUN_R + 6, SRC[1][1]);
        ctx.arc(SRC[1][0], SRC[1][1], SUN_R + 6, 0, TAU);
        ctx.clip('evenodd');
      }
      drawOverlays(ctx, L, P, g, st);
      ctx.restore();
      if (st.k !== 0) drawSkyBody(ctx, L, P, g, st);
    },
  });
})();
