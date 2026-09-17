// 10 wing-veins: Veins as plumbing (schematic, T 18.0 to 19.5).
// The G4 hanging adult as a lavender blueprint under the empty G3 case. White veins grow from the
// wing bases out to the margins with a bright travelling tip, four waves of hemolymph pulse from a
// thoracic pump glyph along every vein on the 8ths, an inset section presses a pleated two-sheet fan
// flat, and a reticle locks magenta on the forewing margin target while the camera eases to zoom 1.08.
//
// Layers (frame px at zoom 1):
//   plate     blueprint centred (560,1000), guide circle r620 + tick rings, diagonals through the target,
//             ticked body axis x 540, rulers at y 1640 and 1760
//   midground twig underside y 300 as a hatched support, silk pad, cremaster, dim empty G3 case
//   subject   wing glow, G4 hindwing lobe and forewing: scale rows per cell, cell stipple, border band
//             with two rows of spots, vein network, body, legs gripping the torn flaps, antennae
//   overlays  pump glyph (540,995) with tick ring r70 and guide r140, hemolymph waves, streamlines to
//             the node glyphs, section line + inset (250,1260) r150, plumbing map, height bracket x 880,
//             pressure trace y 1500, reticle on (735,1400)
//   screen    cycle glyph (900,300), adult arc lit, drawn after the camera
(function () {
  'use strict';
  const FILM = window.FILM;
  const L = FILM.lib;
  const P = L.pal;
  const E = L.ease;
  const TAU = Math.PI * 2;
  const ID = 'wing-veins';
  const SEED = L.hash(ID);
  const FR = 1 / 24;
  const DUR = 1.5;
  const clamp = L.clamp;
  const lerp = L.lerp;
  const rgba = L.rgba;

  // colours hoisted (pal is a proxy)
  const C = {
    lav: P.lavender,
    white: P.lineWhite,
    glow: P.glow,
    mag: P.magenta,
    hemo: P.hemolymph,
    navy: P.navy,
    navyDeep: P.navyDeep,
    navyLight: P.navyLight,
    pale: P.paleBlue,
  };

  // ---------------------------------------------------------------------------
  // Timing (local seconds, t = T - 18)
  // ---------------------------------------------------------------------------
  const TM = {
    veinDur: 6 * FR, // T 18.000, outExpo draw-on
    ret: 0.25, // reticle pops in at 160 px
    waves: [0.5, 0.75, 1.0, 1.25], // hemolymph waves on the 8ths
    waveDur: 0.5,
    lock: 1.0, // reticle snaps 160 -> 90 and turns magenta
    cam0: 1.25,
    cam1: 1.5,
  };

  const AX = 540;
  const TARGET = [735, 1400];
  const PUMP = [540, 995];

  // ---------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------
  const boilNow = () => L.boil(L.T);

  function traceWobble(path, pts, amp, seed, closed) {
    const n = pts.length;
    let s = 0;
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      if (i > 0) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
      let x = p[0], y = p[1];
      if (amp) {
        const a = pts[i > 0 ? i - 1 : i], b = pts[i < n - 1 ? i + 1 : i];
        const tx = b[0] - a[0], ty = b[1] - a[1];
        const tl = Math.hypot(tx, ty) || 1;
        const d = amp * L.noise1(s * 0.025, seed);
        x -= (ty / tl) * d;
        y += (tx / tl) * d;
      }
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    }
    if (closed) path.closePath();
  }

  // a thin schematic polyline that boils on the 12 fps clock
  function bline(ctx, pts, o) {
    if (!pts || pts.length < 2) return;
    o = o || {};
    const seed = ((o.seed | 0) + boilNow() * 131) | 0;
    ctx.save();
    ctx.globalAlpha *= o.alpha != null ? o.alpha : 1;
    ctx.strokeStyle = o.color || C.lav;
    ctx.lineWidth = o.width || 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    if (o.lighter) ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    traceWobble(ctx, pts, o.amp != null ? o.amp : 0.5, seed, !!o.closed);
    ctx.stroke();
    ctx.restore();
  }

  function arcPts(cx, cy, rx, ry, a0, a1, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    return out;
  }

  function measure(pts) {
    const c = new Float64Array(pts.length);
    for (let i = 1; i < pts.length; i++) c[i] = c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return c;
  }
  function pointAt(pts, c, d) {
    const n = pts.length;
    if (d <= 0) return pts[0];
    if (d >= c[n - 1]) return pts[n - 1];
    let lo = 0, hi = n - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (c[m] <= d) lo = m;
      else hi = m;
    }
    const k = (d - c[lo]) / (c[hi] - c[lo] || 1);
    return [lerp(pts[lo][0], pts[hi][0], k), lerp(pts[lo][1], pts[hi][1], k)];
  }
  function headOf(pts, c, d) {
    if (d <= 0) return null;
    if (d >= c[c.length - 1]) return pts;
    const out = [];
    for (let i = 0; i < pts.length && c[i] < d; i++) out.push(pts[i]);
    out.push(pointAt(pts, c, d));
    return out.length > 1 ? out : null;
  }
  function tangentAt(pts, c, d) {
    const a = pointAt(pts, c, d - 2), b = pointAt(pts, c, d + 2);
    const tx = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    return [tx / l, ty / l];
  }

  function chaikin(pts, iters, closed) {
    let Q = pts;
    for (let k = 0; k < iters; k++) {
      const out = [];
      const n = Q.length;
      const m = closed ? n : n - 1;
      if (!closed) out.push(Q[0]);
      for (let i = 0; i < m; i++) {
        const a = Q[i], b = Q[(i + 1) % n];
        out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
      }
      if (!closed) out.push(Q[n - 1]);
      Q = out;
    }
    return Q;
  }

  function segDist(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy || 1;
    const u = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2);
    return Math.hypot(p[0] - a[0] - u * dx, p[1] - a[1] - u * dy);
  }
  function nearestOn(poly, p) {
    let best = null, bd = Infinity;
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const l2 = dx * dx + dy * dy || 1;
      const u = clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2);
      const q = [a[0] + u * dx, a[1] + u * dy];
      const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
      if (d < bd) {
        bd = d;
        best = q;
      }
    }
    return best;
  }

  // inner outline d px inside a closed polygon; corner loops are dropped
  function insetPoly(poly, d) {
    const n = poly.length;
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = poly[(i - 2 + n) % n], b = poly[(i + 2) % n];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      let nx = -ty, ny = tx;
      const p = poly[i];
      if (!L.polyContains(poly, p[0] + nx * 1.5, p[1] + ny * 1.5)) {
        nx = -nx;
        ny = -ny;
      }
      out.push([p[0] + nx * d, p[1] + ny * d]);
    }
    const keep = [];
    for (const q of out) {
      let ok = L.polyContains(poly, q[0], q[1]);
      for (let j = 0; j < n && ok; j++) if (segDist(q, poly[j], poly[(j + 1) % n]) < d * 0.86) ok = false;
      if (ok) keep.push(q);
    }
    return keep;
  }

  function monotone(pts) {
    const n = pts.length;
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const d = [], m = new Array(n);
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    m[0] = d[0];
    m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) {
        m[i] = m[i + 1] = 0;
        continue;
      }
      const a = m[i] / d[i], b = m[i + 1] / d[i];
      const s = a * a + b * b;
      if (s > 9) {
        const k = 3 / Math.sqrt(s);
        m[i] = k * a * d[i];
        m[i + 1] = k * b * d[i];
      }
    }
    return (y) => {
      if (y <= xs[0]) return ys[0];
      if (y >= xs[n - 1]) return ys[n - 1];
      let i = 0;
      while (i < n - 2 && y > xs[i + 1]) i++;
      const h = xs[i + 1] - xs[i], t = (y - xs[i]) / h;
      const t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
    };
  }

  // ---------------------------------------------------------------------------
  // Glow sprite (pure: keyed by colour, radii and render scale)
  // ---------------------------------------------------------------------------
  function sprite(color, r, gr) {
    const S = FILM.S || 1;
    return L.cached(['wing-veins-sprite', color, r, gr, S].join('|'), () => {
      const px = Math.ceil(gr * 2 * S) + 2;
      const c = FILM.makeCanvas(px, px);
      const g = c.getContext('2d');
      const m = px / 2;
      let grd = g.createRadialGradient(m, m, 0, m, m, gr * S);
      grd.addColorStop(0, rgba(color, 0.75));
      grd.addColorStop((r / gr) * 1.2, rgba(color, 0.3));
      grd.addColorStop((r / gr) * 2.4, rgba(color, 0.08));
      grd.addColorStop(1, rgba(color, 0));
      g.fillStyle = grd;
      g.fillRect(0, 0, px, px);
      grd = g.createRadialGradient(m, m, 0, m, m, r * S);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.55, 'rgba(255,255,255,0.92)');
      grd.addColorStop(1, rgba(color, 0));
      g.fillStyle = grd;
      g.beginPath();
      g.arc(m, m, r * S, 0, TAU);
      g.fill();
      return { c, s: px / S };
    });
  }
  function blit(ctx, sp, x, y, a, k) {
    if (a <= 0.004) return;
    const s = sp.s * (k || 1);
    ctx.globalAlpha = Math.min(1, a);
    ctx.drawImage(sp.c, x - s / 2, y - s / 2, s, s);
  }

  // ---------------------------------------------------------------------------
  // G3 case (shared geometry)
  // ---------------------------------------------------------------------------
  const G3 = [[332, 35], [380, 72], [440, 106], [500, 124], [600, 130], [700, 127], [800, 108], [860, 78], [895, 36], [905, 0]];
  const hw3 = monotone(G3);
  const SPLIT_Y = 872;
  const SHELL_OPEN = (function () {
    const left = [];
    const right = [];
    for (let y = 332; y <= SPLIT_Y; y += 7) {
      left.push([AX - hw3(y), y]);
      right.push([AX + hw3(y), y]);
    }
    return left.slice().reverse().concat([[AX - 14, 331], [AX + 14, 331]], right);
  })();
  // torn flaps, bent a little inward where the adult pushed out: smooth curls, 4-6 px ripple
  const FLAPS = (function () {
    const xl = AX - hw3(SPLIT_Y), xr = AX + hw3(SPLIT_Y);
    const mk = (x0, sgn) => {
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const u = i / 10;
        pts.push([x0 + sgn * 44 * u, SPLIT_Y + 26 * Math.sin(Math.min(1, u / 0.55) * (Math.PI / 2)) - 3 * clamp((u - 0.7) / 0.3) + 1.5 * Math.sin(u * 9) * u]);
      }
      return L.smoothPts(pts, false, 3);
    };
    return [mk(xl, 1), mk(xr, -1)];
  })();
  const SHELL_CLOSED = (function () {
    const pts = [];
    for (let y = 332; y <= SPLIT_Y; y += 8) pts.push([AX + hw3(y), y]);
    pts.push([AX + hw3(SPLIT_Y) - 30, SPLIT_Y + 22], [AX - hw3(SPLIT_Y) + 30, SPLIT_Y + 22]);
    for (let y = SPLIT_Y; y >= 332; y -= 8) pts.push([AX - hw3(y), y]);
    return pts;
  })();
  const SHELL_IN_L = [], SHELL_IN_R = [];
  for (let y = 346; y <= SPLIT_Y - 8; y += 8) {
    SHELL_IN_L.push([AX - hw3(y) + 9, y]);
    SHELL_IN_R.push([AX + hw3(y) - 9, y]);
  }
  const GOLD = (function () {
    const out = [];
    for (let i = 0; i < 12; i++) {
      const th = ((-67 + (134 * i) / 11) * Math.PI) / 180;
      out.push([AX + 115 * Math.sin(th), 521, 0.55 + 0.45 * Math.cos(th)]);
    }
    for (let i = 0; i < 5; i++) {
      const u = (i - 2) / 2;
      out.push([AX + u * 45, 850 - 20 * u * u, 1]);
    }
    for (const x of [445, 466, 614, 635]) out.push([x, 560, 1]);
    return out;
  })();

  // ---------------------------------------------------------------------------
  // G4 forewing: authored in a local frame (s along base -> apex, w toward the tornus)
  // ---------------------------------------------------------------------------
  const FB = [565, 985], FA = [790, 1450], FT = [560, 1290];
  const E1 = (function () {
    const dx = FA[0] - FB[0], dy = FA[1] - FB[1], l = Math.hypot(dx, dy);
    return [dx / l, dy / l];
  })();
  const E2 = [-E1[1], E1[0]];
  const LA = (FA[0] - FB[0]) * E1[0] + (FA[1] - FB[1]) * E1[1];
  const TS = (FT[0] - FB[0]) * E1[0] + (FT[1] - FB[1]) * E1[1];
  const TW = (FT[0] - FB[0]) * E2[0] + (FT[1] - FB[1]) * E2[1];
  const fw = (s, w) => [FB[0] + E1[0] * s + E2[0] * w, FB[1] + E1[1] * s + E2[1] * w];
  const toLocal = (p) => {
    const dx = p[0] - FB[0], dy = p[1] - FB[1];
    return [dx * E1[0] + dy * E1[1], dx * E2[0] + dy * E2[1]];
  };
  const costaW = (s) => -46 * Math.pow(Math.sin(Math.PI * clamp(s / LA)), 0.8);
  const MN = (function () {
    const dx = TS - LA, dy = TW, l = Math.hypot(dx, dy);
    return [dy / l, -dx / l];
  })();
  const MARGIN_DIR = (function () {
    const a = fw(LA, 0), b = fw(TS, TW);
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy);
    return [dx / l, dy / l];
  })();
  // outer margin bulge: full near the apex third, easing to the tornus (between the profiles of 09 and 11,
  // so the push-in spot of 11 at (735, 1415.5) sits inside this shot's border band)
  const marginBow = (v) => 57 * Math.pow(clamp(v), 0.55) * Math.pow(1 - clamp(v), 1.6);
  const marginL = (v) => {
    const b = marginBow(v);
    return [lerp(LA, TS, v) + MN[0] * b, lerp(0, TW, v) + MN[1] * b];
  };
  const IN = (function () {
    const dx = -TS, dy = -TW, l = Math.hypot(dx, dy);
    return [-dy / l, dx / l];
  })();
  const innerL = (v) => {
    const b = 5 * Math.sin(Math.PI * v);
    return [lerp(TS, 0, v) + IN[0] * b, lerp(TW, 0, v) + IN[1] * b];
  };
  const FWL = (function () {
    const out = [];
    const nC = 90;
    for (let i = 0; i < nC; i++) {
      const s = (i / nC) * LA;
      out.push([s, costaW(s)]);
    }
    const nM = 48;
    for (let i = 0; i < nM; i++) out.push(marginL(i / nM));
    const nI = 52;
    for (let i = 0; i < nI; i++) out.push(innerL(i / nI));
    return chaikin(out, 1, true);
  })();
  const FW = FWL.map((p) => fw(p[0], p[1]));
  const FW_IN = insetPoly(FW, 9);

  // ---------------------------------------------------------------------------
  // G4 hindwing (frame coordinates): base (570,1005), inner margin x 570, lowest point (620,1420)
  // ---------------------------------------------------------------------------
  const HB = [570, 1005];
  const HW = L.smoothPts(
    [
      [570, 1005], [600, 1015], [645, 1060], [688, 1130], [722, 1220], [745, 1300], [748, 1345], [735, 1378],
      [710, 1400], [670, 1414], [620, 1420], [592, 1410], [576, 1385], [570, 1340], [570, 1260], [570, 1160], [570, 1070],
    ],
    true,
    5
  );
  const HW_IN = insetPoly(HW, 9);
  const inFW = (x, y) => L.polyContains(FW, x, y);

  // ---------------------------------------------------------------------------
  // Vein network
  // ---------------------------------------------------------------------------
  const mL = (v) => marginL(v);
  const TARGET_L = toLocal(TARGET);
  // M2 runs through the push-in target, then bends toward the apex (as the target vein of 11 does),
  // leaving the white spot of 11 at (735, 1415.5) clear on its tornus side
  const M2_AFTER = toLocal([757, 1420]);
  const M2END = (function () {
    const d = toLocal([565 + 0.42 * 100, 985 + 0.91 * 100]);
    const o = toLocal([565, 985]);
    let dx = d[0] - o[0], dy = d[1] - o[1];
    const l = Math.hypot(dx, dy);
    dx /= l;
    dy /= l;
    let p = M2_AFTER.slice();
    for (let i = 0; i < 300; i++) {
      const q = [p[0] + dx * 0.5, p[1] + dy * 0.5];
      if (!L.polyContains(FWL, q[0], q[1])) break;
      p = q;
    }
    return p;
  })();

  const FWV = [
    { id: 'fSc', root: true, stem: true, ctrl: [[0, 0], [60, -12], [120, -22], [180, -31], [235, costaW(235) + 1]], edge: true },
    { id: 'fR', root: true, stem: true, ctrl: [[0, 0], [80, -6], [170, -13], [252, -19]] },
    { id: 'fCu', root: true, stem: true, ctrl: [[0, 0], [70, 14], [160, 31], [236, 48]] },
    { id: 'f1A', root: true, stem: true, ctrl: [[0, 0], [90, 27], [180, 66], [245, 104], mL(0.985)], edge: true },
    { id: 'fDC', parent: 'fR', at: 'end', ctrl: [null, [249, 14], [236, 48]], node: true },
    { id: 'fR1', parent: 'fR', at: 150, ctrl: [null, [220, -27], [288, costaW(288) + 1]], edge: true },
    { id: 'fR2', parent: 'fR', at: 215, ctrl: [null, [285, -30], [345, costaW(345) + 1]], edge: true },
    { id: 'fRs', parent: 'fR', at: 'end', ctrl: [null, [320, -21], [380, -22]] },
    { id: 'fR3', parent: 'fRs', at: 'end', ctrl: [null, [396, -26], [410, costaW(410) + 1]], edge: true },
    { id: 'fR45', parent: 'fRs', at: 'end', ctrl: [null, [428, -18]] },
    { id: 'fR4', parent: 'fR45', at: 'end', ctrl: [null, [450, -17], [466, costaW(466) + 0.8]], edge: true },
    { id: 'fR5', parent: 'fR45', at: 'end', ctrl: [null, [468, -12], [503, costaW(503) + 0.8]], edge: true },
    { id: 'fM1', parent: 'fR', at: 'end', ctrl: [null, [340, -7], [440, -2], mL(0.012)], edge: true },
    { id: 'fM2', parent: 'fDC', at: 'mid', ctrl: [null, [350, 21], toLocal([721, 1360]), TARGET_L, M2_AFTER, M2END], edge: true },
    { id: 'fM3', parent: 'fDC', at: 'end', ctrl: [null, [320, 62], mL(0.32)], edge: true },
    { id: 'fCuA1', parent: 'fCu', at: 185, ctrl: [null, [270, 66], mL(0.53)], edge: true },
    { id: 'fCuA2', parent: 'fCu', at: 110, ctrl: [null, [200, 56], [262, 90], mL(0.76)], edge: true },
  ];
  const HWV = [
    { id: 'hSc', root: true, stem: true, ctrl: [HB, [604, 1030], [652, 1090], [700, 1165], [733, 1245], [750, 1318]], edge: true },
    { id: 'hR', root: true, stem: true, ctrl: [HB, [606, 1072], [636, 1150], [660, 1215]] },
    { id: 'hCu', root: true, stem: true, ctrl: [HB, [579, 1100], [603, 1192], [640, 1240]] },
    { id: 'h1A', root: true, stem: true, ctrl: [HB, [574, 1120], [572, 1250], [572, 1370]], edge: true },
    { id: 'hDC', parent: 'hR', at: 'end', ctrl: [null, [650, 1230], [640, 1240]], node: true },
    { id: 'hRs', parent: 'hR', at: 'end', ctrl: [null, [712, 1296], [744, 1370]], edge: true },
    { id: 'hM1', parent: 'hR', at: 'end', ctrl: [null, [694, 1300], [720, 1392]], edge: true },
    { id: 'hM2', parent: 'hDC', at: 'mid', ctrl: [null, [676, 1318], [694, 1408]], edge: true },
    { id: 'hM3', parent: 'hDC', at: 'end', ctrl: [null, [656, 1330], [666, 1416]], edge: true },
    { id: 'hCuA1', parent: 'hCu', at: [622, 1224], ctrl: [null, [624, 1330], [626, 1422]], edge: true },
    { id: 'hCuA2', parent: 'hCu', at: [604, 1194], ctrl: [null, [594, 1300], [590, 1408]], edge: true },
  ];
  const CHANNELS = [
    { id: 'cF', ctrl: [PUMP, [553, 987], FB] },
    { id: 'cH', ctrl: [PUMP, [556, 1003], HB] },
  ];

  const VEINS = [];
  const VBY = {};
  (function buildVeins() {
    const add = (v, wing, framePts, D0) => {
      const pts = L.smoothPts(framePts, false, 3);
      const c = measure(pts);
      const o = { id: v.id, wing, pts, c, len: c[c.length - 1], D0, stem: !!v.stem, edge: !!v.edge, node: !!v.node };
      VEINS.push(o);
      VBY[v.id] = o;
      return o;
    };
    for (const ch of CHANNELS) add(ch, 'c', ch.ctrl, 0);
    const cF = VBY.cF.len, cH = VBY.cH.len;
    const place = (v, wing) => {
      let D0 = wing === 'f' ? cF : cH;
      let ctrl = v.ctrl.map((p) => (p && wing === 'f' ? fw(p[0], p[1]) : p));
      if (v.parent) {
        const par = VBY[v.parent];
        let idx;
        if (v.at === 'end') idx = par.pts.length - 1;
        else if (v.at === 'mid') {
          idx = 0;
          while (idx < par.pts.length - 1 && par.c[idx] < par.len / 2) idx++;
        } else {
          const q = typeof v.at === 'number' ? fw(v.at, 0) : v.at;
          // number: the parent sample whose local s is closest; point: the nearest sample
          let bd = Infinity;
          idx = 0;
          for (let i = 0; i < par.pts.length; i++) {
            let d;
            if (typeof v.at === 'number') d = Math.abs(toLocal(par.pts[i])[0] - v.at);
            else d = Math.hypot(par.pts[i][0] - q[0], par.pts[i][1] - q[1]);
            if (d < bd) {
              bd = d;
              idx = i;
            }
          }
        }
        D0 = par.D0 + par.c[idx];
        ctrl[0] = par.pts[idx];
      }
      if (v.edge) {
        const poly = wing === 'f' ? FW : HW;
        const last = ctrl[ctrl.length - 1], prev = ctrl[ctrl.length - 2];
        const q = nearestOn(poly, last);
        const dx = prev[0] - q[0], dy = prev[1] - q[1], l = Math.hypot(dx, dy) || 1;
        ctrl[ctrl.length - 1] = [q[0] + (dx / l) * 1.2, q[1] + (dy / l) * 1.2];
      }
      add(v, wing, ctrl, D0);
    };
    for (const v of FWV) place(v, 'f');
    for (const v of HWV) place(v, 'h');
  })();
  for (const v of FWV.concat(HWV)) VBY[v.id].parentIdx = VEINS.indexOf(VBY[v.parent || (FWV.includes(v) ? 'cF' : 'cH')]);
  VBY.cF.parentIdx = VBY.cH.parentIdx = -1;
  const FW_CELL = VBY.fR.pts.concat(VBY.fDC.pts.slice(1), VBY.fCu.pts.slice().reverse().slice(1));
  const DMAX = VEINS.reduce((m, v) => Math.max(m, v.D0 + v.len), 0);
  const WING_VEINS = VEINS.filter((v) => v.wing !== 'c');

  // G4 wing as shared geometry for the 10 -> 11 match cut: the frame-space forewing and hindwing outlines
  // and every vein polyline this shot evaluates (edge veins run to the margin), built once from FWV and HWV.
  // Shot 11 reads FILM.shared.g4Wing to centre its black vein bands and use FW as its silhouette.
  (function publishG4Wing() {
    const copy = (pts) => Object.freeze(pts.map((p) => Object.freeze([p[0], p[1]])));
    const pick = (wing, edgeOnly) =>
      Object.freeze(WING_VEINS.filter((v) => v.wing === wing && (!edgeOnly || v.edge)).map((v) => Object.freeze({ id: v.id, edge: v.edge, pts: copy(v.pts) })));
    FILM.shared = FILM.shared || {};
    FILM.shared.g4Wing = Object.freeze({
      FW: copy(FW),
      HW: copy(HW),
      veins: Object.freeze({ f: pick('f', true), h: pick('h', true) }),
      allVeins: Object.freeze({ f: pick('f', false), h: pick('h', false) }),
      target: Object.freeze([TARGET[0], TARGET[1]]),
    });
  })();

  // cell corner junctions (glow when a wave passes)
  const JUNCTIONS = (function () {
    const out = [];
    for (const id of ['fR', 'fCu', 'hR', 'hCu']) {
      const v = VBY[id];
      out.push({ p: v.pts[v.pts.length - 1], D: v.D0 + v.len, wing: v.wing });
    }
    for (const id of ['fDC', 'hDC']) {
      const v = VBY[id];
      out.push({ p: pointAt(v.pts, v.c, v.len / 2), D: v.D0 + v.len / 2, wing: v.wing });
    }
    return out;
  })();

  // stem tube walls: offset lines that taper from the base
  const WALLS = (function () {
    const out = [];
    for (const v of VEINS) {
      if (!v.stem) continue;
      const lim = v.len * 0.7;
      for (const side of [-1, 1]) {
        const pts = [];
        const ds = [];
        for (let d = 3; d <= lim; d += 4) {
          const p = pointAt(v.pts, v.c, d);
          const tg = tangentAt(v.pts, v.c, d);
          const off = lerp(3.4, 1.3, d / lim);
          pts.push([p[0] - tg[1] * off * side, p[1] + tg[0] * off * side]);
          ds.push(d);
        }
        out.push({ v, pts, ds, wing: v.wing });
      }
    }
    return out;
  })();

  // ---------------------------------------------------------------------------
  // Cell map: each wing rasterised at 1 px, veins and the outline stamped as walls, and the cells
  // between them flood-filled. Pure function of the geometry above, built once.
  // ---------------------------------------------------------------------------
  const RX0 = 530, RY0 = 960, RW = 300, RH = 520;
  function rasterPoly(poly) {
    const m = new Uint8Array(RW * RH);
    const n = poly.length;
    const xs = [];
    for (let j = 0; j < RH; j++) {
      const y = RY0 + j + 0.5;
      xs.length = 0;
      for (let i = 0; i < n; i++) {
        const a = poly[i], b = poly[(i + 1) % n];
        if (a[1] <= y !== b[1] <= y) xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const i0 = Math.max(0, Math.ceil(xs[k] - RX0 - 0.5)), i1 = Math.min(RW - 1, Math.floor(xs[k + 1] - RX0 - 0.5));
        for (let i = i0; i <= i1; i++) m[j * RW + i] = 1;
      }
    }
    return m;
  }
  function stampLine(m, pts, r, closed) {
    const n = pts.length;
    const segs = closed ? n : n - 1;
    for (let s = 0; s < segs; s++) {
      const a = pts[s], b = pts[(s + 1) % n];
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const steps = Math.max(1, Math.ceil(l));
      for (let k = 0; k <= steps; k++) {
        const x = lerp(a[0], b[0], k / steps) - RX0, y = lerp(a[1], b[1], k / steps) - RY0;
        for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++) {
          if (yy < 0 || yy >= RH) continue;
          for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
            if (xx < 0 || xx >= RW) continue;
            if ((xx + 0.5 - x) * (xx + 0.5 - x) + (yy + 0.5 - y) * (yy + 0.5 - y) <= r * r) m[yy * RW + xx] = 1;
          }
        }
      }
    }
  }
  function buildCells(wing) {
    const inside = rasterPoly(wing === 'f' ? FW : HW);
    const wall = new Uint8Array(RW * RH);
    stampLine(wall, wing === 'f' ? FW : HW, 2.4, true);
    if (wing === 'h') {
      // only the lobe that shows below the forewing
      const fwM = rasterPoly(FW);
      for (let i = 0; i < wall.length; i++) if (fwM[i]) inside[i] = 0;
      stampLine(wall, FW, 3, true);
    }
    for (const v of VEINS) if (v.wing === wing) stampLine(wall, v.pts, 2.6, false);
    const lab = new Int16Array(RW * RH).fill(-1);
    const cells = [];
    const stack = new Int32Array(RW * RH);
    const target = [TARGET[0] - RX0, TARGET[1] - RY0];
    for (let start = 0; start < lab.length; start++) {
      if (!inside[start] || wall[start] || lab[start] !== -1) continue;
      const id = cells.length;
      let sp = 0, n = 0, sx = 0, sy = 0, near = Infinity;
      const pix = [];
      stack[sp++] = start;
      lab[start] = id;
      while (sp) {
        const p = stack[--sp];
        pix.push(p);
        const x = p % RW, y = (p - x) / RW;
        n++;
        sx += x;
        sy += y;
        near = Math.min(near, Math.hypot(x + 0.5 - target[0], y + 0.5 - target[1]));
        if (x > 0 && inside[p - 1] && !wall[p - 1] && lab[p - 1] === -1) (lab[p - 1] = id), (stack[sp++] = p - 1);
        if (x < RW - 1 && inside[p + 1] && !wall[p + 1] && lab[p + 1] === -1) (lab[p + 1] = id), (stack[sp++] = p + 1);
        if (y > 0 && inside[p - RW] && !wall[p - RW] && lab[p - RW] === -1) (lab[p - RW] = id), (stack[sp++] = p - RW);
        if (y < RH - 1 && inside[p + RW] && !wall[p + RW] && lab[p + RW] === -1) (lab[p + RW] = id), (stack[sp++] = p + RW);
      }
      cells.push({ id, n, cx: RX0 + sx / n + 0.5, cy: RY0 + sy / n + 0.5, near, pix, small: n < 70 });
    }
    const at = (x, y) => {
      const i = Math.floor(x) - RX0, j = Math.floor(y) - RY0;
      if (i < 0 || j < 0 || i >= RW || j >= RH) return -1;
      return lab[j * RW + i];
    };
    return { lab, cells, at };
  }
  const CELLS = { f: buildCells('f'), h: buildCells('h') };

  // nearest vein (same wing) to a point: its unit tangent there, oriented away from the wing base
  function veinTangent(wing, x, y) {
    let best = null, bd = Infinity;
    for (const v of VEINS) {
      if (v.wing !== wing) continue;
      for (let i = 0; i < v.pts.length - 1; i++) {
        const d = segDist([x, y], v.pts[i], v.pts[i + 1]);
        if (d < bd) {
          bd = d;
          best = [v.pts[i + 1][0] - v.pts[i][0], v.pts[i + 1][1] - v.pts[i][1]];
        }
      }
    }
    const l = Math.hypot(best[0], best[1]) || 1;
    return [best[0] / l, best[1] / l];
  }
  const M2_TAN = (function () {
    const v = VBY.fM2;
    let bi = 0, bd = Infinity;
    for (let i = 0; i < v.pts.length; i++) {
      const d = Math.hypot(v.pts[i][0] - TARGET[0], v.pts[i][1] - TARGET[1]);
      if (d < bd) (bd = d), (bi = i);
    }
    return tangentAt(v.pts, v.c, v.c[bi]);
  })();

  // ---------------------------------------------------------------------------
  // Scale rows: rounded scales about 11 x 7 px in rows 7 px apart, each row offset half a scale,
  // rows parallel to the nearest vein, each scale drawn as its distal arc and clipped to its cell
  // ---------------------------------------------------------------------------
  const NB = 10;
  const SC_L = 11, SC_W = 7, SC_R = 3;
  const SCALE_ITEMS = (function () {
    const out = { f: [], h: [] };
    for (const wing of ['f', 'h']) {
      const map = CELLS[wing];
      const base = wing === 'f' ? FB : HB;
      for (const cell of map.cells) {
        if (cell.small) continue;
        let tg = cell.near < 80 && wing === 'f' ? M2_TAN.slice() : veinTangent(wing, cell.cx, cell.cy);
        if (tg[0] * (cell.cx - base[0]) + tg[1] * (cell.cy - base[1]) < 0) tg = [-tg[0], -tg[1]];
        const nx = -tg[1], ny = tg[0];
        let u0 = Infinity, u1 = -Infinity, v0 = Infinity, v1 = -Infinity;
        for (const p of cell.pix) {
          const x = (p % RW) + RX0 + 0.5 - cell.cx, y = Math.floor(p / RW) + RY0 + 0.5 - cell.cy;
          const u = x * tg[0] + y * tg[1], v = x * nx + y * ny;
          if (u < u0) u0 = u;
          if (u > u1) u1 = u;
          if (v < v0) v0 = v;
          if (v > v1) v1 = v;
        }
        const r = L.rng(L.hash(ID, 'rows', wing, cell.id));
        const phV = r() * SC_W, phU = r() * SC_L;
        const kMin = Math.floor((v0 - phV) / SC_W) - 1, kMax = Math.ceil((v1 - phV) / SC_W) + 1;
        for (let k = kMin; k <= kMax; k++) {
          const v = phV + k * SC_W;
          const off = k & 1 ? SC_L / 2 : 0;
          const mMin = Math.floor((u0 - phU - off) / SC_L) - 1, mMax = Math.ceil((u1 - phU - off) / SC_L) + 1;
          for (let m = mMin; m <= mMax; m++) {
            const u = phU + off + m * SC_L;
            const X = (a, b) => cell.cx + (u + a) * tg[0] + (v + b) * nx;
            const Y = (a, b) => cell.cy + (u + a) * tg[1] + (v + b) * ny;
            let ok = true;
            for (const [a, b] of [[0, 0], [SC_L / 2, 0], [SC_L / 2 - 1.5, -SC_W / 2 + 0.5], [SC_L / 2 - 1.5, SC_W / 2 - 0.5], [-SC_L / 2 + 1, 0]]) {
              if (map.at(X(a, b), Y(a, b)) !== cell.id) {
                ok = false;
                break;
              }
            }
            if (!ok) continue;
            const x = X(0, 0), y = Y(0, 0);
            const D = wing === 'f' ? VBY.cF.len + toLocal([x, y])[0] : VBY.cH.len + Math.hypot(x - HB[0], y - HB[1]);
            const span = wing === 'f' ? LA : 430;
            out[wing].push({
              x, y, tx: tg[0], ty: tg[1],
              strong: ((k % 3) + 3) % 3 === 0,
              band: Math.max(0, Math.min(NB - 1, Math.floor(((D - (wing === 'f' ? VBY.cF.len : VBY.cH.len)) / span) * NB))),
              j: [r(), r(), r(), r(), r(), r()],
            });
          }
        }
      }
    }
    return out;
  })();
  let scalePaths = null;
  function getScalePaths() {
    if (scalePaths) return scalePaths;
    const build = (items) => {
      const variants = [];
      for (let vr = 0; vr < 3; vr++) {
        const bands = [];
        for (let b = 0; b < NB; b++) bands.push([new Path2D(), new Path2D()]);
        for (const it of items) {
          const p = bands[it.band][it.strong ? 1 : 0];
          const cx = it.x + (it.j[vr * 2] - 0.5) * 0.7, cy = it.y + (it.j[vr * 2 + 1] - 0.5) * 0.7;
          const ca = it.tx, sa = it.ty;
          // the free end of the scale; its sides run back 4 px, so each row reads as a dashed course
          const hl = SC_L / 2, w = SC_W / 2 - 0.6, rr = SC_R - 0.4;
          const X = (u, q) => cx + u * ca - q * sa;
          const Y = (u, q) => cy + u * sa + q * ca;
          p.moveTo(X(hl - rr - 4, -w), Y(hl - rr - 4, -w));
          p.lineTo(X(hl - rr, -w), Y(hl - rr, -w));
          p.quadraticCurveTo(X(hl, -w), Y(hl, -w), X(hl, -w + rr), Y(hl, -w + rr));
          p.lineTo(X(hl, w - rr), Y(hl, w - rr));
          p.quadraticCurveTo(X(hl, w), Y(hl, w), X(hl - rr, w), Y(hl - rr, w));
          p.lineTo(X(hl - rr - 4, w), Y(hl - rr - 4, w));
        }
        variants.push(bands);
      }
      return variants;
    };
    scalePaths = { f: build(SCALE_ITEMS.f), h: build(SCALE_ITEMS.h) };
    return scalePaths;
  }

  // ---------------------------------------------------------------------------
  // Border bands (the black monarch margin as dense stipple) and two rows of white spots
  // ---------------------------------------------------------------------------
  const bandWidthF = (v) => 20 + 14 * (1 - L.smoothstep(0.1, 0.7, v));
  const FW_MARGIN_F = (function () {
    const out = [];
    for (let i = 0; i <= 60; i++) {
      const v = i / 60;
      const m = marginL(v);
      out.push({ v, p: fw(m[0], m[1]) });
    }
    return out;
  })();
  function offsetInward(pts, poly, widthAt) {
    const n = pts.length;
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      let nx = -ty, ny = tx;
      if (!L.polyContains(poly, pts[i][0] + nx * 4, pts[i][1] + ny * 4)) (nx = -nx), (ny = -ny);
      const w = widthAt(i / (n - 1));
      out.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
    }
    return out;
  }
  const FW_BAND_OUT = FW_MARGIN_F.map((q) => q.p);
  const FW_BAND_IN = offsetInward(FW_BAND_OUT, FW, bandWidthF);
  const FW_BAND_POLY = FW_BAND_OUT.concat(FW_BAND_IN.slice().reverse());
  // hindwing: the lobe margin that shows below the forewing
  const HW_MARGIN_PTS = (function () {
    const out = [];
    const c = measure(HW);
    for (let d = 0; d < c[c.length - 1]; d += 4) {
      const p = pointAt(HW, c, d);
      if (p[1] > 1300 && p[0] > 571.5 && !inFW(p[0], p[1])) out.push(p);
    }
    return out;
  })();
  const HW_BAND_IN = offsetInward(HW_MARGIN_PTS, HW, () => 20);
  const HW_BAND_POLY = HW_MARGIN_PTS.concat(HW_BAND_IN.slice().reverse());

  const SPOT_TARGET = [735, 1415.5];
  function veinDist(x, y, wing) {
    let bd = Infinity;
    for (const v of VEINS) {
      if (v.wing !== wing) continue;
      for (let i = 0; i < v.pts.length - 1; i++) bd = Math.min(bd, segDist([x, y], v.pts[i], v.pts[i + 1]));
    }
    return bd;
  }
  const SPOTS = (function () {
    const out = [{ p: SPOT_TARGET, r: 4.5, key: true }];
    const clearOf = (p, r) => out.every((q) => Math.hypot(q.p[0] - p[0], q.p[1] - p[1]) > q.r + r + 3);
    // a row of candidate points at a fixed depth inside a margin polyline (outer points, inner points)
    const row = (outer, inner, depth, n) => {
      const res = [];
      for (let k = 0; k <= n; k++) {
        const u = k / n;
        const f = u * (outer.length - 1);
        const i = Math.min(outer.length - 2, Math.floor(f)), t = f - i;
        const o = [lerp(outer[i][0], outer[i + 1][0], t), lerp(outer[i][1], outer[i + 1][1], t)];
        const q = [lerp(inner[i][0], inner[i + 1][0], t), lerp(inner[i][1], inner[i + 1][1], t)];
        const w = Math.hypot(q[0] - o[0], q[1] - o[1]) || 1;
        res.push([o[0] + ((q[0] - o[0]) / w) * depth, o[1] + ((q[1] - o[1]) / w) * depth]);
      }
      return res;
    };
    // split a row into the stretches between vein crossings; place spots inside each stretch
    const place = (cands, wing, r, perStretch) => {
      const dist = cands.map((p) => veinDist(p[0], p[1], wing));
      const ok = (p) => L.polyContains(wing === 'h' ? HW : FW, p[0], p[1]) && !(wing === 'h' && inFW(p[0], p[1]));
      let i = 0;
      while (i < cands.length) {
        while (i < cands.length && (dist[i] < r + 3.5 || !ok(cands[i]))) i++;
        const j0 = i;
        while (i < cands.length && dist[i] >= r + 3.5 && ok(cands[i])) i++;
        const j1 = i - 1;
        if (j1 - j0 < 2) continue;
        const picks = perStretch === 1 ? [0.5] : [0.3, 0.7];
        for (const fq of picks) {
          const p = cands[Math.round(lerp(j0, j1, fq))];
          if (clearOf(p, r)) out.push({ p, r, h: wing === 'h' });
        }
      }
    };
    place(row(FW_BAND_OUT, FW_BAND_IN, 19, 260), 'f', 5, 1);
    place(row(FW_BAND_OUT, FW_BAND_IN, 8.5, 260), 'f', 3.5, 2);
    place(row(HW_MARGIN_PTS, HW_BAND_IN, 12.5, 120), 'h', 4.5, 1);
    place(row(HW_MARGIN_PTS, HW_BAND_IN, 5.5, 120), 'h', 3, 2);
    return out;
  })();

  // section across the forewing at s = 300, shown in the inset
  const SEC_S = 300;
  const SEC_A = fw(SEC_S, costaW(SEC_S) - 18);
  const SEC_B = fw(SEC_S, 142);
  const INSET = { x: 250, y: 1260, r: 150 };
  const FOLD0 = (38 * Math.PI) / 180; // inset pleat angle at the start
  const LEADER = (function () {
    const a = -0.42;
    const rim = [INSET.x + Math.cos(a) * INSET.r, INSET.y + Math.sin(a) * INSET.r];
    return L.smoothPts([SEC_B, [528, 1338], [452, 1262], rim], false, 4);
  })();

  // ---------------------------------------------------------------------------
  // Body parts (G4)
  // ---------------------------------------------------------------------------
  const HEAD = L.ellipsePts(540, 935, 28, 28, 56);
  const HEAD_IN = L.ellipsePts(540, 935, 23, 23, 44);
  // frontal view: two large compound eyes
  const EYES = [L.ellipsePts(523, 933, 10.5, 14, 36), L.ellipsePts(557, 933, 10.5, 14, 36)];
  // white spots of the head and thorax, at the world positions shot 11 uses
  const BODY_SPOTS = [[540, 913, 3.2], [532, 956, 2.2], [548, 956, 2.2], [526, 972, 3.4], [554, 972, 3.4], [519, 993, 2.8], [561, 993, 2.8], [540, 1022, 2.3], [530, 1022, 2], [550, 1022, 2]];
  const THORAX = L.ellipsePts(540, 995, 28, 36, 64);
  const THORAX_IN = L.ellipsePts(540, 995, 22, 30, 52);
  const ABDOMEN = L.capsulePts(540, 1103, 144, 25, Math.PI / 2, 72);
  const ABDOMEN_IN = L.capsulePts(540, 1103, 134, 19.5, Math.PI / 2, 60);
  const ANT = [
    L.smoothPts([[533, 909], [521, 860], [507, 806], [495, 760]], false, 3),
    L.smoothPts([[547, 909], [559, 860], [576, 806], [590, 760]], false, 3),
  ];
  // middle and hind legs reach up to the torn flaps; each claw grips a flap edge
  const flapAt = (side, u) => {
    const pts = FLAPS[side];
    const c = measure(pts);
    return pointAt(pts, c, c[c.length - 1] * u);
  };
  const LEGS = [
    { pts: [[521, 1009], [480, 984], [470, 940], flapAt(0, 0.5)], far: false },
    { pts: [[519, 990], [496, 961], [494, 928], flapAt(0, 0.76)], far: false },
    { pts: [[559, 987], [584, 957], [586, 928], flapAt(1, 0.76)], far: true },
    { pts: [[561, 1004], [600, 976], [610, 940], flapAt(1, 0.5)], far: true },
  ];
  // the tiny forelegs, folded flat against the thorax on both sides
  const FORELEGS = [
    L.smoothPts([[516, 973], [506, 963], [502, 976], [508, 988]], false, 2),
    L.smoothPts([[564, 973], [574, 963], [578, 976], [572, 988]], false, 2),
  ];
  const PROBOSCIS = (function () {
    const out = [[523, 951]];
    for (let a = 0; a <= TAU * 2.1; a += 0.25) {
      const r = 9.5 - a * 0.62;
      out.push([512 + Math.cos(a + 0.5) * r, 959 + Math.sin(a + 0.5) * r]);
    }
    return out;
  })();
  // the right half of the proboscis, still unzipped: the left coil mirrored about x 540 (coil centre (568, 959))
  const PROBOSCIS_R = PROBOSCIS.map((p) => [1080 - p[0], p[1]]);

  // ---------------------------------------------------------------------------
  // Waves
  // ---------------------------------------------------------------------------
  const WAVE_REACH = DMAX + 24;
  function waveFront(tq, i) {
    const u = (tq - TM.waves[i]) / TM.waveDur;
    if (u < 0) return null;
    return { u, D: WAVE_REACH * E.outQuad(clamp(u)), Dp: WAVE_REACH * E.outQuad(clamp(u - (2 * FR) / TM.waveDur)) };
  }
  function wavesStarted(t) {
    let k = 0;
    for (const w of TM.waves) if (t + 1e-6 >= w) k++;
    return k;
  }
  function beatOf(tt) {
    const k = wavesStarted(tt);
    const since = k > 0 ? tt - TM.waves[k - 1] : 9;
    return { k, since, beat: k > 0 ? Math.max(0, 1 - since / (6 * FR)) : 0 };
  }
  // stepped flattening of the inset pleats, one outBack step per wave (on twos)
  function flatten(tq) {
    let k = 0;
    for (const w of TM.waves) k += 0.25 * E.outBack(clamp((tq - w) / (3 * FR)));
    return k;
  }

  // ---------------------------------------------------------------------------
  // Draw-on: every vein grows with outExpo over 6 frames, started up to 3 frames late by its root
  // distance, so the front visibly travels out to the margins. A parent is always drawn far enough to
  // carry a child that has already started, so the network never floats apart.
  // ---------------------------------------------------------------------------
  const VDELAY = VEINS.map((v) => (v.D0 / DMAX) * 3 * FR);
  function veinReach(tt) {
    const n = VEINS.length;
    const vis = new Float64Array(n);
    const own = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const v = VEINS[i];
      const tip = (v.D0 + v.len) * E.outExpo(clamp((tt - VDELAY[i]) / (6 * FR)));
      vis[i] = clamp(tip - v.D0, 0, v.len);
      own[i] = 1;
    }
    for (let i = n - 1; i >= 0; i--) {
      const pi = VEINS[i].parentIdx;
      if (pi == null || pi < 0 || vis[i] <= 0) continue;
      const need = Math.min(VEINS[pi].len, VEINS[i].D0 - VEINS[pi].D0);
      if (need > vis[pi]) {
        vis[pi] = need;
        own[pi] = 0;
      }
    }
    let front = 0;
    for (let i = 0; i < n; i++) if (vis[i] > 0) front = Math.max(front, VEINS[i].D0 + vis[i]);
    return { vis, own, front };
  }
  function segOf(pts, c, d0, d1) {
    d0 = Math.max(0, d0);
    d1 = Math.min(c[c.length - 1], d1);
    if (d1 - d0 < 0.3) return null;
    const out = [pointAt(pts, c, d0)];
    for (let i = 0; i < pts.length; i++) if (c[i] > d0 && c[i] < d1) out.push(pts[i]);
    out.push(pointAt(pts, c, d1));
    return out;
  }

  // arrival rings: only on the longest veins of each wing, small and short-lived
  const RING_VEINS = (function () {
    const endOf = (v) => v.pts[v.pts.length - 1];
    const pick = (wing, k) =>
      WING_VEINS.filter((v) => v.wing === wing && v.edge && !(wing === 'h' && inFW(endOf(v)[0], endOf(v)[1])))
        .sort((a, b) => b.len - a.len)
        .slice(0, k);
    return pick('f', 5)
      .concat(pick('h', 4))
      .map((v) => {
        const i = VEINS.indexOf(v);
        let tDraw = 0;
        for (let f = 0; f < 48; f++) {
          if (veinReach(f * FR).vis[i] >= v.len - 1.5) {
            tDraw = f * FR;
            break;
          }
        }
        const D = v.D0 + v.len;
        const e = endOf(v);
        return { e, tDraw, uWave: 1 - Math.sqrt(Math.max(0, 1 - D / WAVE_REACH)), nearTarget: Math.hypot(e[0] - TARGET[0], e[1] - TARGET[1]) < 70 };
      });
  })();

  // ---------------------------------------------------------------------------
  // Drawing: plate and scaffolding
  // ---------------------------------------------------------------------------
  function drawPlate(ctx, tt) {
    L.blueprint(ctx, { center: [560, 1000], seed: 1010, circles: 0, diagonals: 0 });
    const rot = -Math.PI / 2 + ((3 * Math.PI) / 180) * (tt / DUR);
    L.guideCircle(ctx, 560, 1000, 620, { alpha: 0.17, width: 1.5 });
    L.guideCircle(ctx, 560, 1000, 648, { alpha: 0.08, width: 1, dash: [2, 9] });
    L.ticks(ctx, 560, 1000, { r: 620, n: 72, len: 9, major: 6, majorLen: 22, rot, color: C.lav, alpha: 0.42, width: 1.3, inward: true });
    L.ticks(ctx, 560, 1000, { r: 620, n: 360, len: 4, rot, color: C.lav, alpha: 0.15, width: 1 });
    L.ticks(ctx, 560, 1000, { r: 656, n: 120, len: 5, major: 10, majorLen: 12, rot: -rot * 0.5, color: C.lav, alpha: 0.16, width: 1 });
    L.guideCircle(ctx, 560, 1000, 330, { alpha: 0.09, width: 1, dash: [3, 7] });
    // long diagonals through the push-in target: the wing axis, the outer margin, and a 45 degree pair
    for (const [d, a] of [[E1, 0.13], [MARGIN_DIR, 0.13], [[Math.SQRT1_2, Math.SQRT1_2], 0.08], [[Math.SQRT1_2, -Math.SQRT1_2], 0.08]]) {
      const k = 2600;
      bline(ctx, [[TARGET[0] - d[0] * k, TARGET[1] - d[1] * k], [TARGET[0] + d[0] * k, TARGET[1] + d[1] * k]], { alpha: a, width: 1, amp: 0 });
    }
    // body axis: a construction line from the twig to the bottom edge, ticked every 60 px
    bline(ctx, [[AX, 300], [AX, 1880]], { alpha: 0.12, width: 1, amp: 0 });
    L.ticks(ctx, AX, 300, { kind: 'linear', length: 1560, angle: Math.PI / 2, n: 26, len: 8, major: 5, majorLen: 28, side: 1, color: C.lav, alpha: 0.24, width: 1, baseline: false });
    for (const y of [760, 935, 995, 1175]) bline(ctx, [[400, y], [470, y]], { alpha: 0.18, width: 1, amp: 0, dash: [2, 5] });
    // cross-section ellipses give the empty case volume
    for (const y of [440, 600, 760]) {
      const h = hw3(y);
      bline(ctx, L.ellipsePts(AX, y, h, h * 0.17, 56), { closed: true, alpha: 0.08, dash: [3, 5], amp: 0.3, seed: y });
    }
    // edge rulers, and a long ruler below the safe area
    L.ticks(ctx, 70, 1640, { kind: 'linear', length: 940, angle: 0, n: 94, len: 5, major: 10, majorLen: 14, side: 1, color: C.lav, alpha: 0.24, width: 1 });
    L.ticks(ctx, 44, 380, { kind: 'linear', length: 1160, angle: Math.PI / 2, n: 58, len: 5, major: 5, majorLen: 12, side: -1, color: C.lav, alpha: 0.2, width: 1 });
    L.ticks(ctx, 60, 1760, { kind: 'linear', length: 960, angle: 0, n: 80, len: 12, major: 5, majorLen: 28, side: -1, color: C.lav, alpha: 0.22, width: 1 });
    L.guideCircle(ctx, AX, 1640, 6, { alpha: 0.35, cross: 16, width: 1 });
    L.guideCircle(ctx, AX, 1760, 10, { alpha: 0.3, cross: 22, width: 1 });
  }

  // the twig underside as a fixed support: one line at y 300 and short 45 degree hatches above it,
  // broken around the screen-fixed cycle glyph (900, 300) only while the twig's screen y is within 50 px
  // of it; the break is placed in screen space, so it stays on the glyph as the camera zooms
  function drawTwig(ctx, zoom) {
    const sy = 1400 + (300 - 1400) * zoom;
    const gap = Math.abs(sy - 300) <= 50 ? [TARGET[0] + (848 - TARGET[0]) / zoom, TARGET[0] + (952 - TARGET[0]) / zoom] : null;
    if (gap) {
      bline(ctx, [[-80, 300], [gap[0], 300]], { width: 2, alpha: 0.72, seed: SEED + 300, amp: 0.4 });
      bline(ctx, [[gap[1], 300], [1160, 300]], { width: 2, alpha: 0.72, seed: SEED + 301, amp: 0.4 });
    } else bline(ctx, [[-80, 300], [1160, 300]], { width: 2, alpha: 0.72, seed: SEED + 300, amp: 0.4 });
    const hp = new Path2D();
    const bs = boilNow();
    for (let x = -84; x < 1160; x += 12) {
      if (gap && x + 20 > gap[0] && x < gap[1]) continue;
      const j = (L.h3(x, bs, 5) - 0.5) * 0.8;
      hp.moveTo(x + j, 300);
      hp.lineTo(x + 20 + j, 280);
    }
    ctx.save();
    ctx.strokeStyle = C.lav;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.stroke(hp);
    ctx.restore();
    // silk pad scribble and the cremaster
    const sr = L.rng(L.hash(ID, 'silk'));
    const pts = [];
    for (let i = 0; i <= 150; i++) {
      const a = (i / 100) * TAU + 0.4;
      const R = 19 + 3 * L.noise1(i * 0.07, 44);
      const rr = 6.5 + 2 * L.noise1(i * 0.11, 45);
      pts.push([AX + Math.cos(a) * R + Math.cos(a * 7.3) * rr + sr.range(-0.8, 0.8), 308 + (Math.sin(a) * R + Math.sin(a * 7.3) * rr) * 0.55 + sr.range(-0.8, 0.8)]);
    }
    bline(ctx, pts, { color: C.white, alpha: 0.32, width: 1, amp: 0.8, seed: SEED + 91 });
    bline(ctx, [[535, 332], [536, 302]], { color: C.white, alpha: 0.5, width: 1.5, amp: 0.3, seed: SEED + 92 });
    bline(ctx, [[545, 332], [544, 302]], { color: C.white, alpha: 0.5, width: 1.5, amp: 0.3, seed: SEED + 93 });
  }

  function halo(ctx, pts, closed, k) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    L.tracePath(ctx, pts, closed);
    ctx.strokeStyle = C.lav;
    ctx.lineJoin = 'round';
    for (const [w, a] of [[16, 0.03], [8, 0.055], [4, 0.075]]) {
      ctx.lineWidth = w;
      ctx.globalAlpha = a * k;
      ctx.stroke();
    }
    ctx.restore();
  }
  const outline = (ctx, pts, o) =>
    L.inkPath(ctx, pts, Object.assign({ closed: true, width: 2.5, color: C.lav, alpha: 0.85, wobble: 0.8, tremble: 0.2, rough: 0.15, taper: [6, 10], widthJitter: 0.18, boilAmp: 0.5, minWidth: 0.5 }, o));
  function fillPoly(ctx, pts, color, a) {
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, pts, true);
    ctx.fillStyle = color;
    ctx.globalAlpha = a;
    ctx.fill();
    ctx.restore();
  }

  // the empty case, pushed back: one thin outline, a dim lattice and faint imprints
  function drawShell(ctx) {
    fillPoly(ctx, SHELL_CLOSED, C.navy, 0.3);
    L.hexLattice(ctx, SHELL_CLOSED, { r: 16, alpha: 0.11, seed: SEED + 30 });
    L.stipple(ctx, SHELL_CLOSED, {
      spacing: 8,
      color: C.lav,
      alpha: 0.24,
      r: [0.6, 1.2],
      seed: SEED + 31,
      density: (x, y) => 0.12 + 0.2 * clamp((y - 700) / 180) + 0.1 * L.noise2(x * 0.02, y * 0.02, 7),
    });
    L.inkPath(ctx, SHELL_OPEN, { closed: false, width: 1.5, color: C.lav, alpha: 0.32, wobble: 0.6, tremble: 0.15, rough: 0.1, taper: [10, 16], widthJitter: 0.12, boilAmp: 0.5, minWidth: 0.4, seed: SEED + 1 });
    for (let i = 0; i < 2; i++) {
      bline(ctx, FLAPS[i], { width: 1.2, alpha: 0.5, seed: SEED + 4 + i, amp: 0.3 });
      bline(ctx, FLAPS[i].map((p) => [p[0], p[1] - 5]).slice(2), { width: 1, alpha: 0.2, seed: SEED + 6 + i, amp: 0.3, dash: [3, 3] });
    }
    bline(ctx, SHELL_IN_L, { alpha: 0.15, width: 1.1, seed: SEED + 2 });
    bline(ctx, SHELL_IN_R, { alpha: 0.15, width: 1.1, seed: SEED + 3 });
    // rim band, dotted, and the dulled gold dot sockets
    const h = hw3(515);
    const rim = new Path2D();
    for (let x = AX - h + 3; x <= AX + h - 3; x += 6.5) {
      rim.moveTo(x + 1.2, 515);
      rim.arc(x, 515, 1.2, 0, TAU);
    }
    ctx.save();
    ctx.fillStyle = C.lav;
    ctx.globalAlpha = 0.32;
    ctx.fill(rim);
    ctx.restore();
    bline(ctx, [[AX - hw3(509), 509], [AX + hw3(509), 509]], { alpha: 0.12, amp: 0.3, seed: SEED + 20 });
    bline(ctx, [[AX - hw3(521), 521], [AX + hw3(521), 521]], { alpha: 0.12, amp: 0.3, seed: SEED + 21 });
    const ring = new Path2D();
    for (const g of GOLD) {
      ring.moveTo(g[0] + 5 * g[2], g[1]);
      ring.ellipse(g[0], g[1], 5 * g[2], 5, 0, 0, TAU);
    }
    ctx.save();
    ctx.strokeStyle = C.lav;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.2;
    ctx.stroke(ring);
    ctx.restore();
    // the empty cuticle keeps the imprint of what grew inside: wing pad, antenna and leg sheaths,
    // the proboscis sheath and eye caps, plus the pupal abdominal rings above the rim band
    const ghost = new Path2D();
    const gb = boilNow() * 131;
    traceWobble(ghost, L.smoothPts([[430, 560], [470, 760], [520, 850]], false, 5), 0.3, SEED + 22 + gb, false);
    traceWobble(ghost, L.smoothPts([[446, 574], [482, 748], [526, 832]], false, 5), 0.3, SEED + 23 + gb, false);
    traceWobble(ghost, L.smoothPts([[452, 612], [488, 770], [512, 858]], false, 5), 0.3, SEED + 24 + gb, false);
    traceWobble(ghost, L.smoothPts([[458, 612], [494, 768], [518, 856]], false, 5), 0.3, SEED + 25 + gb, false);
    traceWobble(ghost, [[531, 866], [529, 780], [528, 700]], 0.3, SEED + 26 + gb, false);
    traceWobble(ghost, [[538, 866], [536, 780], [535, 700]], 0.3, SEED + 27 + gb, false);
    for (const [x0, y0, x1, y1] of [[496, 842], [506, 848]].map((p) => [p[0], p[1], p[0] + 16, p[1] - 80])) {
      traceWobble(ghost, [[x0, y0], [x1, y1]], 0.3, SEED + 28 + x0 + gb, false);
    }
    traceWobble(ghost, arcPts(560, 866, 17, 12, Math.PI * 0.9, Math.PI * 2.1, 16), 0.3, SEED + 29 + gb, false);
    for (let y = 365; y <= 485; y += 30) {
      const hh = hw3(y) - 6;
      const pts = [];
      for (let i = 0; i <= 16; i++) {
        const u = -1 + (2 * i) / 16;
        pts.push([AX + u * hh, y + 8 * (1 - u * u)]);
      }
      traceWobble(ghost, pts, 0.3, SEED + 30 + y + gb, false);
    }
    ctx.save();
    ctx.strokeStyle = C.lav;
    ctx.globalAlpha = 0.17;
    ctx.lineWidth = 1.1;
    ctx.setLineDash([5, 4]);
    ctx.stroke(ghost);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Wings
  // ---------------------------------------------------------------------------
  function clipOutsideFW(ctx) {
    ctx.beginPath();
    ctx.rect(-400, -400, 1900, 2800);
    L.tracePath(ctx, FW, true);
    ctx.clip('evenodd');
  }
  function clipInsideFW(ctx) {
    ctx.beginPath();
    L.tracePath(ctx, FW, true);
    ctx.clip();
  }

  // 0 at the wing base, 1 where a ray from the base meets the outline (the margin, for most directions)
  function radialFrac(base, poly) {
    const B = 180;
    const maxD = new Float64Array(B);
    const c = measure(poly.concat([poly[0]]));
    const closedPts = poly.concat([poly[0]]);
    for (let d = 0; d < c[c.length - 1]; d += 1.5) {
      const p = pointAt(closedPts, c, d);
      const a = Math.atan2(p[1] - base[1], p[0] - base[0]);
      const bi = (((Math.floor(((a + Math.PI) / TAU) * B)) % B) + B) % B;
      maxD[bi] = Math.max(maxD[bi], Math.hypot(p[0] - base[0], p[1] - base[1]));
    }
    for (let pass = 0; pass < B; pass++) {
      let any = false;
      for (let i = 0; i < B; i++) {
        if (maxD[i] > 0) continue;
        const m = Math.max(maxD[(i + 1) % B], maxD[(i + B - 1) % B]);
        if (m > 0) (maxD[i] = m), (any = true);
      }
      if (!any) break;
    }
    const fn = (x, y) => {
      const a = Math.atan2(y - base[1], x - base[0]);
      const bi = (((Math.floor(((a + Math.PI) / TAU) * B)) % B) + B) % B;
      return clamp(Math.hypot(x - base[0], y - base[1]) / (maxD[bi] || 1));
    };
    // the region whose radial fraction is below f, pulled in by off px along each ray (a star polygon)
    const dirs = [];
    for (let i = 0; i < B; i++) {
      const a = ((i + 0.5) / B) * TAU - Math.PI;
      dirs.push([Math.cos(a), Math.sin(a)]);
    }
    fn.star = (f, off, map) => {
      const out = [];
      for (let i = 0; i < B; i++) {
        const r = Math.max(0, f * maxD[i] - off);
        const p = [base[0] + dirs[i][0] * r, base[1] + dirs[i][1] * r];
        out.push(map ? map(p) : p);
      }
      return out;
    };
    return fn;
  }
  const FW_FRAC = radialFrac(FB, FW);
  const HW_FRAC = radialFrac(HB, HW);

  // Hemolymph filling the membrane: each wave floods the wing from the base to the margin at alpha 0.04
  // (additive), so the fill steps up on every 8th and sits near 0.16 once the fourth wave has passed.
  // The front is a 20 px soft ramp, and the newest front carries a thin bright pressure edge.
  const FILL_A = 0.04;
  function hemoFill(ctx, wing, tq, map) {
    const frac = wing === 'f' ? FW_FRAC : HW_FRAC;
    const base = wing === 'f' ? VBY.cF.len : VBY.cH.len;
    const span = wing === 'f' ? LA : 430;
    const RAMP = 4;
    for (let i = 0; i < 4; i++) {
      const wf = waveFront(tq, i);
      if (!wf) continue;
      const f = (wf.D - base) / span;
      if (f <= 0) continue;
      if (f >= 1.12) {
        ctx.globalAlpha = FILL_A;
        ctx.fillRect(-200, -200, 1500, 2400);
        continue;
      }
      ctx.globalAlpha = FILL_A / RAMP;
      for (let s = 0; s < RAMP; s++) {
        ctx.beginPath();
        L.tracePath(ctx, frac.star(f, (20 * (s + 0.5)) / RAMP, map), true);
        ctx.fill();
      }
      // pressure edge: a 10 px band just behind the front, fading as the wave spends itself
      const edge = 0.07 * (1 - clamp(wf.u)) * clamp(f / 0.08);
      if (edge > 0.004) {
        ctx.globalAlpha = edge;
        ctx.beginPath();
        L.tracePath(ctx, frac.star(f, 0, map), true);
        L.tracePath(ctx, frac.star(f, 10, map).reverse(), true);
        ctx.fill('nonzero');
      }
    }
  }
  function drawHemoFill(ctx, wing, tq) {
    ctx.save();
    if (wing === 'h') clipOutsideFW(ctx);
    ctx.beginPath();
    L.tracePath(ctx, wing === 'f' ? FW : HW, true);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = C.hemo;
    hemoFill(ctx, wing, tq);
    ctx.restore();
  }
  const DOTS_PER_UNIT_6 = 1 / (6 * 6 * 0.866); // lib.stipple dots per px2 at spacing 6, density 1

  function drawWingGlow(ctx) {
    ctx.save();
    const g = ctx.createRadialGradient(650, 1230, 0, 650, 1230, 330);
    g.addColorStop(0, rgba(C.glow, 0.1));
    g.addColorStop(0.5, rgba(C.glow, 0.045));
    g.addColorStop(1, rgba(C.glow, 0));
    ctx.fillStyle = g;
    ctx.fillRect(320, 900, 660, 660);
    ctx.restore();
  }
  // lifts the membrane inside a wing so it has tonal mass at phone size
  function wingLift(ctx, k) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(660, 1250, 0, 660, 1250, 280);
    g.addColorStop(0, rgba(C.lav, 0.085 * k));
    g.addColorStop(1, rgba(C.lav, 0.02 * k));
    ctx.fillStyle = g;
    ctx.fillRect(520, 960, 320, 520);
    ctx.restore();
  }

  function drawScales(ctx, wing, front, tq) {
    const paths = getScalePaths()[wing];
    const variant = paths[((boilNow() % 3) + 3) % 3];
    const base = wing === 'f' ? VBY.cF.len : VBY.cH.len;
    const span = wing === 'f' ? LA : 430;
    ctx.save();
    ctx.strokeStyle = C.lav;
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let b = 0; b < NB; b++) {
      const need = base + ((b + 0.2) / NB) * span;
      const a = clamp((front - need) / 60);
      if (a <= 0) continue;
      // the rows a pulse is passing through catch a little light
      const Db = base + ((b + 0.5) / NB) * span;
      let boost = 0;
      for (let i = 0; i < 4; i++) {
        const wf = waveFront(tq, i);
        if (wf && wf.u <= 1) boost = Math.max(boost, Math.exp(-Math.abs(wf.D - Db) / 45) * (1 - wf.u));
      }
      ctx.globalAlpha = (0.2 + 0.14 * boost) * a;
      ctx.stroke(variant[b][0]);
      ctx.globalAlpha = (0.34 + 0.18 * boost) * a;
      ctx.stroke(variant[b][1]);
    }
    ctx.restore();
  }

  function cellStipple(ctx, wing, front, seed) {
    const map = CELLS[wing];
    const frac = wing === 'f' ? FW_FRAC : HW_FRAC;
    const base = wing === 'f' ? VBY.cF.len : VBY.cH.len;
    const span = wing === 'f' ? LA : 430;
    L.stipple(ctx, wing === 'f' ? FW : HW, {
      spacing: 6,
      r: [0.8, 1.35],
      color: C.lav,
      alpha: 0.62,
      seed,
      density: (x, y) => {
        if (map.at(x, y) < 0) return 0;
        const f = frac(x, y);
        const rev = clamp((front - base - f * span * 0.85) / 60);
        return (rev * lerp(0.012, 0.004, f)) / DOTS_PER_UNIT_6;
      },
    });
  }

  function drawHindwing(ctx, front, tq) {
    fillPoly(ctx, HW, C.navyLight, 0.92);
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, HW, true);
    ctx.clip();
    wingLift(ctx, 1);
    ctx.restore();
    drawScales(ctx, 'h', front, tq);
    drawHemoFill(ctx, 'h', tq);
    cellStipple(ctx, 'h', front, SEED + 47);
    ctx.save();
    clipOutsideFW(ctx);
    halo(ctx, HW, true, 1);
    outline(ctx, HW, { seed: SEED + 5 });
    bline(ctx, HW_IN, { closed: true, alpha: 0.5, width: 1.5, seed: SEED + 6 });
    ctx.restore();
  }

  function drawForewing(ctx, front, tq) {
    fillPoly(ctx, FW, C.navyLight, 0.95);
    ctx.save();
    clipInsideFW(ctx);
    wingLift(ctx, 1);
    // hindwing seen through the forewing membrane, a shade darker
    fillPoly(ctx, HW, C.navy, 0.22);
    ctx.restore();
    drawScales(ctx, 'f', front, tq);
    drawHemoFill(ctx, 'f', tq);
    cellStipple(ctx, 'f', front, SEED + 44);
    // the closed discal cell, a little denser so it reads as one chamber
    const cellA = clamp((front - VBY.fDC.D0 - VBY.fDC.len) / 40);
    if (cellA > 0) L.stipple(ctx, FW_CELL, { spacing: 6, r: [0.7, 1.1], color: C.lav, alpha: 0.4 * cellA, seed: SEED + 45, density: 0.3 });
    halo(ctx, FW, true, 1);
    outline(ctx, FW, { seed: SEED + 7 });
    bline(ctx, FW_IN, { closed: true, alpha: 0.5, width: 1.5, seed: SEED + 8 });
    // hindwing edge seen through the forewing
    ctx.save();
    clipInsideFW(ctx);
    bline(ctx, HW, { closed: true, alpha: 0.26, width: 1.2, dash: [5, 5], seed: SEED + 9 });
    ctx.restore();
  }

  // the black border: a dense stipple band inside each outer margin, and two rows of white spots
  function drawBands(ctx, tt) {
    const a = clamp((tt - 4 * FR) / (4 * FR));
    if (a <= 0) return;
    const inSpot = (x, y) => {
      for (const s of SPOTS) if (Math.abs(x - s.p[0]) < s.r + 2 && Math.abs(y - s.p[1]) < s.r + 2 && Math.hypot(x - s.p[0], y - s.p[1]) < s.r + 1.6) return true;
      return false;
    };
    ctx.save();
    ctx.globalAlpha = a;
    ctx.save();
    clipInsideFW(ctx);
    fillPoly(ctx, FW_BAND_POLY, C.lav, 0.1);
    ctx.restore();
    ctx.save();
    clipOutsideFW(ctx);
    fillPoly(ctx, HW_BAND_POLY, C.lav, 0.1);
    ctx.restore();
    L.stipple(ctx, FW_BAND_POLY, { spacing: 6, r: [1.0, 1.4], color: C.lav, alpha: 0.72, seed: SEED + 46, density: (x, y) => (inFW(x, y) && !inSpot(x, y) ? 0.62 : 0) });
    L.stipple(ctx, HW_BAND_POLY, { spacing: 6, r: [1.0, 1.4], color: C.lav, alpha: 0.72, seed: SEED + 48, density: (x, y) => (!inFW(x, y) && L.polyContains(HW, x, y) && !inSpot(x, y) ? 0.62 : 0) });
    bline(ctx, FW_BAND_IN.filter((p) => inFW(p[0], p[1])), { alpha: 0.4, width: 1, seed: SEED + 40 });
    bline(ctx, HW_BAND_IN.filter((p) => !inFW(p[0], p[1])), { alpha: 0.4, width: 1, seed: SEED + 41 });
    const fillP = new Path2D();
    const ringP = new Path2D();
    const dots = new Path2D();
    const bs = boilNow();
    for (const s of SPOTS) {
      const jx = (L.h3(bs, s.p[0] | 0, 3) - 0.5) * 0.5, jy = (L.h3(s.p[1] | 0, bs, 4) - 0.5) * 0.5;
      fillP.moveTo(s.p[0] + s.r, s.p[1]);
      fillP.arc(s.p[0], s.p[1], s.r, 0, TAU);
      ringP.moveTo(s.p[0] + jx + s.r, s.p[1] + jy);
      ringP.arc(s.p[0] + jx, s.p[1] + jy, s.r, 0, TAU);
      dots.moveTo(s.p[0] + 0.9, s.p[1]);
      dots.arc(s.p[0], s.p[1], 0.9, 0, TAU);
    }
    ctx.fillStyle = C.navyLight;
    ctx.globalAlpha = a * 0.85;
    ctx.fill(fillP);
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = a * 0.7;
    ctx.stroke(ringP);
    ctx.fillStyle = C.white;
    ctx.globalAlpha = a * 0.55;
    ctx.fill(dots);
    ctx.restore();
  }

  function drawVeins(ctx, tt, R) {
    const lv = wavesStarted(tt);
    const bs = boilNow() * 131;
    const main = { f: new Path2D(), h: new Path2D(), c: new Path2D() };
    const lead = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    const tips = [];
    for (let i = 0; i < VEINS.length; i++) {
      const v = VEINS[i];
      const vis = R.vis[i];
      if (vis <= 0.5) continue;
      const pts = headOf(v.pts, v.c, vis);
      if (!pts) continue;
      traceWobble(main[v.wing], pts, 0.45, SEED + 400 + i * 7 + bs, false);
      if (R.own[i] && vis < v.len - 0.75 && v.wing !== 'c') {
        const tip = pointAt(v.pts, v.c, vis);
        if (v.wing === 'h' && inFW(tip[0], tip[1])) continue;
        tips.push(tip);
        // the newest 40 px behind the tip: bright and thick, tapering back to the vein width
        for (let k = 0; k < 4; k++) {
          const seg = segOf(v.pts, v.c, vis - 40 + k * 10, vis - 30 + k * 10 + 0.5);
          if (seg) traceWobble(lead[k], seg, 0, 0, false);
        }
      }
    }
    const walls = { f: new Path2D(), h: new Path2D() };
    for (const w of WALLS) {
      const vis = R.vis[VEINS.indexOf(w.v)];
      if (vis <= 3) continue;
      let n = 0;
      while (n < w.ds.length && w.ds[n] <= vis) n++;
      if (n < 2) continue;
      traceWobble(walls[w.wing], w.pts.slice(0, n), 0.35, SEED + 900 + WALLS.indexOf(w) + bs, false);
    }
    const stroke = (path, color, width, alpha, lighter, dash) => {
      ctx.save();
      if (lighter) ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.globalAlpha = alpha;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (dash) ctx.setLineDash(dash);
      ctx.stroke(path);
      ctx.restore();
    };
    const haloA = 0.1 + 0.035 * lv;
    // hindwing: visible lobe solid, the part behind the forewing dashed
    ctx.save();
    clipOutsideFW(ctx);
    stroke(main.h, C.lav, 6, haloA, true);
    stroke(walls.h, C.lav, 1, 0.45);
    stroke(main.h, C.white, 1.5, 0.92);
    ctx.restore();
    ctx.save();
    clipInsideFW(ctx);
    stroke(main.h, C.lav, 1.1, 0.3, false, [4, 5]);
    ctx.restore();
    // forewing and the pump channels
    stroke(main.f, C.lav, 6, haloA, true);
    stroke(main.c, C.lav, 6, haloA, true);
    stroke(walls.f, C.lav, 1, 0.45);
    stroke(main.f, C.white, 1.5, 0.95);
    stroke(main.c, C.white, 2, 0.95);
    for (let k = 0; k < 4; k++) stroke(lead[k], C.white, [1.9, 2.3, 2.7, 3][k], 1);
    for (let i = 0; i < tips.length; i++) L.glowDot(ctx, tips[i][0], tips[i][1], 4, { rays: 0, glow: 3, core: C.white, color: C.glow, intensity: 1, twinkle: 0, seed: SEED + 700 + i });
    // vein ends: a small socket where each vein reaches the margin
    const ends = new Path2D();
    for (const v of WING_VEINS) {
      if (!v.edge || R.vis[VEINS.indexOf(v)] < v.len - 0.5) continue;
      const p = v.pts[v.pts.length - 1];
      if (v.wing === 'h' && inFW(p[0], p[1])) continue;
      ends.moveTo(p[0] + 2.2, p[1]);
      ends.arc(p[0], p[1], 2.2, 0, TAU);
    }
    ctx.save();
    ctx.fillStyle = C.white;
    ctx.globalAlpha = 0.85;
    ctx.fill(ends);
    ctx.restore();
  }

  // small rings pop where the longest veins reach the margin: white on the draw-on, hemolymph on each wave
  function drawEndRings(ctx, tt) {
    const white = [new Path2D(), new Path2D()];
    const hemo = [new Path2D(), new Path2D()];
    const add = (arr, e, u) => {
      const r = lerp(2.5, 6, E.outExpo(u));
      const p = arr[u < 0.5 ? 0 : 1];
      p.moveTo(e[0] + r, e[1]);
      p.arc(e[0], e[1], r, 0, TAU);
    };
    for (const a of RING_VEINS) {
      if (a.nearTarget && tt >= TM.lock - 1e-6) continue;
      const fd = (tt - a.tDraw) / (4 * FR);
      if (fd >= 0 && fd < 1) add(white, a.e, fd);
      for (const w of TM.waves) {
        // arrival lands on the twos grid like the dots that carry it
        const tArr = Math.ceil((w + a.uWave * TM.waveDur) * 12 - 1e-6) / 12;
        const fw2 = (tt - tArr) / (4 * FR);
        if (fw2 >= 0 && fw2 < 1) add(hemo, a.e, fw2);
      }
    }
    ctx.save();
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 2; i++) {
      ctx.globalAlpha = [0.45, 0.25][i];
      ctx.strokeStyle = C.white;
      ctx.stroke(white[i]);
      ctx.strokeStyle = C.hemo;
      ctx.stroke(hemo[i]);
    }
    ctx.restore();
  }

  function drawJunctions(ctx, tt, tq, front) {
    const sp = sprite(C.hemo, 2.6, 10);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const j of JUNCTIONS) {
      if (front < j.D) continue;
      let hot = 0;
      for (let i = 0; i < 4; i++) {
        const wf = waveFront(tq, i);
        if (!wf || wf.u > 1) continue;
        hot = Math.max(hot, Math.exp(-Math.abs(wf.D - j.D) / 30));
      }
      blit(ctx, sp, j.p[0], j.p[1], 0.35 + 0.65 * hot, 1 + 0.5 * hot);
    }
    ctx.restore();
    const ring = new Path2D();
    for (const j of JUNCTIONS) {
      if (front < j.D) continue;
      ring.moveTo(j.p[0] + 5, j.p[1]);
      ring.arc(j.p[0], j.p[1], 5, 0, TAU);
    }
    ctx.save();
    ctx.strokeStyle = C.lav;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1;
    ctx.stroke(ring);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Body
  // ---------------------------------------------------------------------------
  function offsetSeg(a, b, d) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l;
    return [[a[0] + nx * d, a[1] + ny * d], [b[0] + nx * d, b[1] + ny * d]];
  }
  function drawLeg(ctx, leg, i) {
    const k = leg.far ? 0.6 : 1;
    const [cx0, knee, ankle, end] = leg.pts;
    const outerP = new Path2D(), innerP = new Path2D();
    const bs = boilNow() * 131;
    for (const [a, b] of [[cx0, knee], [knee, ankle]]) {
      // the outer wall is the one farther from the body axis
      const plus = offsetSeg(a, b, 1.5);
      const s = Math.abs((plus[0][0] + plus[1][0]) / 2 - AX) > Math.abs((a[0] + b[0]) / 2 - AX) ? 1.5 : -1.5;
      traceWobble(outerP, offsetSeg(a, b, s), 0.3, SEED + 60 + i * 3 + bs, false);
      traceWobble(innerP, offsetSeg(a, b, -s), 0.3, SEED + 61 + i * 3 + bs, false);
    }
    ctx.save();
    ctx.strokeStyle = C.lav;
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.7 * k;
    ctx.stroke(outerP);
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4 * k;
    ctx.stroke(innerP);
    // tarsus: three short tarsomeres, then a paired claw hooked over the torn rim
    const tar = new Path2D();
    const dots = new Path2D();
    const segs = 3;
    for (let s = 0; s < segs; s++) {
      const u0 = s / segs + 0.04, u1 = (s + 1) / segs - 0.04;
      tar.moveTo(lerp(ankle[0], end[0], u0), lerp(ankle[1], end[1], u0));
      tar.lineTo(lerp(ankle[0], end[0], u1), lerp(ankle[1], end[1], u1));
      if (s > 0) {
        const q = [lerp(ankle[0], end[0], s / segs), lerp(ankle[1], end[1], s / segs)];
        dots.moveTo(q[0] + 1.3, q[1]);
        dots.arc(q[0], q[1], 1.3, 0, TAU);
      }
    }
    for (const q of [knee, ankle]) {
      dots.moveTo(q[0] + 2.4, q[1]);
      dots.arc(q[0], q[1], 2.4, 0, TAU);
    }
    tar.moveTo(end[0], end[1]);
    tar.quadraticCurveTo(end[0] - 4.5, end[1] - 4, end[0] - 4, end[1] + 1.2);
    tar.moveTo(end[0], end[1]);
    tar.quadraticCurveTo(end[0] + 4.5, end[1] - 4, end[0] + 4, end[1] + 1.2);
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.72 * k;
    ctx.stroke(tar);
    ctx.fillStyle = C.lav;
    ctx.globalAlpha = 0.75 * k;
    ctx.fill(dots);
    ctx.restore();
  }

  function drawBody(ctx, tt, tq) {
    // legs behind the body
    for (let i = 0; i < LEGS.length; i++) drawLeg(ctx, LEGS[i], i);
    // abdomen
    fillPoly(ctx, ABDOMEN, C.navyLight, 0.95);
    L.stipple(ctx, ABDOMEN_IN, { spacing: 6.5, color: C.lav, alpha: 0.35, r: [0.6, 1.2], seed: SEED + 70, density: (x) => 0.2 + 0.4 * clamp((AX - x + 15) / 30) });
    const seg = new Path2D();
    for (let k = 1; k <= 7; k++) {
      const y = 1031 + k * 18;
      const hwid = y > 1150 ? Math.sqrt(Math.max(0, 25 * 25 - (y - 1150) * (y - 1150))) : 25;
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const u = -1 + (2 * i) / 12;
        pts.push([AX + u * (hwid - 3), y + 3.5 * (1 - u * u)]);
      }
      traceWobble(seg, pts, 0.3, SEED + 80 + k + boilNow() * 131, false);
      seg.moveTo(AX - hwid + 9.6, y - 8);
      seg.arc(AX - hwid + 8, y - 8, 1.6, 0, TAU);
    }
    ctx.save();
    ctx.strokeStyle = C.lav;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1;
    ctx.stroke(seg);
    ctx.restore();
    // dorsal vessel with hemolymph drifting toward the thorax (on twos)
    bline(ctx, [[553, 1165], [555, 1100], [553, 1036]], { alpha: 0.35, width: 1, dash: [3, 3], amp: 0 });
    const sp = sprite(C.hemo, 1.6, 6);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 6; k++) {
      const y = 1162 - ((tq * 150 + k * 22) % 128);
      blit(ctx, sp, 554, y, 0.7);
    }
    ctx.restore();
    halo(ctx, ABDOMEN, true, 0.8);
    outline(ctx, ABDOMEN, { seed: SEED + 11 });
    bline(ctx, ABDOMEN_IN, { closed: true, alpha: 0.45, width: 1.2, seed: SEED + 12 });
    // thorax with flight-muscle fibres
    fillPoly(ctx, THORAX, C.navyLight, 0.95);
    const fib = [];
    for (let x = 524; x <= 556; x += 5.5) {
      const u = (x - AX) / 22;
      const hh = 30 * Math.sqrt(Math.max(0, 1 - u * u));
      fib.push([[x, 995 - hh + 3], [x + 1.5 * Math.sign(u || 1), 995], [x, 995 + hh - 3]]);
    }
    const fp = new Path2D();
    for (let i = 0; i < fib.length; i++) traceWobble(fp, L.smoothPts(fib[i], false, 4), 0.4, SEED + 120 + i + boilNow() * 131, false);
    ctx.save();
    ctx.strokeStyle = C.lav;
    ctx.globalAlpha = 0.24;
    ctx.lineWidth = 1;
    ctx.stroke(fp);
    ctx.restore();
    {
      // hemolymph pooled under the pump, brightening on each beat
      const { beat } = beatOf(tt);
      L.stipple(ctx, THORAX_IN, { spacing: 5, r: [0.7, 1.3], color: C.hemo, alpha: 0.3 + 0.45 * beat, seed: SEED + 125, density: (x, y) => clamp((y - 990) / 22) * 0.8 });
    }
    halo(ctx, THORAX, true, 0.8);
    outline(ctx, THORAX, { seed: SEED + 13 });
    bline(ctx, THORAX_IN, { closed: true, alpha: 0.45, width: 1.2, seed: SEED + 14 });
    // both tiny forelegs folded against the thorax, brush-like
    for (let f = 0; f < 2; f++) {
      const fl = FORELEGS[f];
      const dir = f === 0 ? -1 : 1;
      bline(ctx, fl, { alpha: 0.7, width: 1.3, seed: SEED + 15 + f, amp: 0.2 });
      for (let i = 1; i < fl.length - 1; i += 3) {
        const q = fl[i];
        bline(ctx, [q, [q[0] + dir * 3.5, q[1] + 2]], { alpha: 0.45, width: 0.9, amp: 0 });
      }
    }
    // head, eye lattice, palps, proboscis
    fillPoly(ctx, HEAD, C.navyLight, 0.95);
    for (let e = 0; e < 2; e++) {
      L.hexLattice(ctx, EYES[e], { r: 2.8, alpha: 0.45, seed: SEED + 16 + e * 40, jitter: 0.3 });
      bline(ctx, EYES[e], { closed: true, alpha: 0.75, width: 1.2, seed: SEED + 17 + e * 40 });
    }
    halo(ctx, HEAD, true, 0.8);
    outline(ctx, HEAD, { seed: SEED + 18 });
    bline(ctx, HEAD_IN, { closed: true, alpha: 0.4, width: 1.1, seed: SEED + 19 });
    // labial palps on both sides of the face
    for (const sx of [-1, 1]) {
      bline(ctx, [[AX + sx * 5, 945], [AX + sx * 9, 951], [AX + sx * 9.5, 959]], { alpha: 0.6, width: 1.2, seed: SEED + 23 + sx, amp: 0.2 });
    }
    {
      const sp = new Path2D();
      for (const [x, y, r] of BODY_SPOTS) {
        sp.moveTo(x + r, y);
        sp.arc(x, y, r, 0, TAU);
      }
      ctx.save();
      ctx.strokeStyle = C.white;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.7;
      ctx.stroke(sp);
      ctx.restore();
    }
    bline(ctx, PROBOSCIS, { alpha: 0.75, width: 1.3, seed: SEED + 25, amp: 0.2 });
    bline(ctx, PROBOSCIS_R, { alpha: 0.75, width: 1.3, seed: SEED + 1990, amp: 0.2 });
    // antennae with annulations and clubs
    for (let i = 0; i < 2; i++) {
      const pts = ANT[i];
      bline(ctx, pts, { alpha: 0.85, width: 1.6, seed: SEED + 26 + i, amp: 0.4 });
      const c = measure(pts);
      const tk = new Path2D();
      for (let d = 10; d < c[c.length - 1] - 14; d += 9) {
        const p = pointAt(pts, c, d), tg = tangentAt(pts, c, d);
        tk.moveTo(p[0] - tg[1] * 2.6, p[1] + tg[0] * 2.6);
        tk.lineTo(p[0] + tg[1] * 2.6, p[1] - tg[0] * 2.6);
      }
      ctx.save();
      ctx.strokeStyle = C.lav;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      ctx.stroke(tk);
      ctx.restore();
      const end = pts[pts.length - 1], tg = tangentAt(pts, c, c[c.length - 1] - 3);
      const club = L.ellipsePts(end[0] + tg[0] * 2, end[1] + tg[1] * 2, 13, 4.6, 24, Math.atan2(tg[1], tg[0]));
      fillPoly(ctx, club, C.lav, 0.25);
      bline(ctx, club, { closed: true, alpha: 0.9, width: 1.3, seed: SEED + 28 + i });
    }
  }

  // ---------------------------------------------------------------------------
  // Pump glyph and hemolymph waves
  // ---------------------------------------------------------------------------
  function drawPump(ctx, tt, tq) {
    const { k, since, beat } = beatOf(tt);
    const pop = k > 0 && since < 3 * FR ? E.outBack(since / (3 * FR)) : 1;
    const swell = k > 0 && since < 6 * FR ? 1 + 0.45 * Math.sin(Math.PI * clamp(since / (6 * FR))) : 1;
    const rot = (k * Math.PI) / 16;
    L.guideCircle(ctx, PUMP[0], PUMP[1], 140, { alpha: 0.1, width: 1, dash: [4, 6] });
    L.ticks(ctx, PUMP[0], PUMP[1], { r: 70, n: 24, len: 6, rot: -rot, color: C.lav, alpha: 0.4, width: 1.2 });
    L.guideCircle(ctx, PUMP[0], PUMP[1], 40, { alpha: 0.3, width: 1, dash: [2, 4] });
    L.ticks(ctx, PUMP[0], PUMP[1], { r: 40, n: 24, len: 4, rot, color: C.lav, alpha: 0.35, width: 1 });
    L.glowDot(ctx, PUMP[0], PUMP[1], 9 * swell * (0.9 + 0.1 * pop), { rays: 0, glow: 4.4, intensity: 0.85 + 0.35 * beat, seed: SEED + 130 });
    L.ticks(ctx, PUMP[0], PUMP[1], { r: 13 + 3 * beat, n: 12, len: 14 + 8 * beat, major: 3, majorLen: 20 + 8 * beat, rot, color: C.white, alpha: 0.7, width: 1.5 });
    if (k > 0 && since < 10 * FR) {
      const u = since / (10 * FR);
      L.guideCircle(ctx, PUMP[0], PUMP[1], lerp(14, 70, E.outExpo(u)), { color: C.white, alpha: 0.7 * (1 - u), width: 1.5 });
    }
  }

  function drawWaves(ctx, tt, tq) {
    const big = sprite(C.hemo, 4, 22);
    const small = sprite(C.hemo, 2.6, 10);
    const clearTarget = tt >= TM.lock - 1e-6;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const wf = waveFront(tq, i);
      if (!wf || wf.u > 1.001) continue;
      const fade = wf.u > 0.8 ? clamp((1 - wf.u) / 0.2) * 0.8 + 0.2 : 1;
      const trail = Math.max(22, (wf.D - wf.Dp) * 0.85);
      // the stretch of vein the pulse has just filled glows behind the front
      const lit = { f: new Path2D(), h: new Path2D(), c: new Path2D() };
      for (const v of VEINS) {
        const a = wf.D - v.D0;
        if (a < 0 || a - trail * 1.8 > v.len) continue;
        const d0 = Math.max(0, a - trail * 1.8), d1 = Math.min(v.len, a);
        const seg = [];
        for (let d = d0; d < d1; d += 4) seg.push(pointAt(v.pts, v.c, d));
        seg.push(pointAt(v.pts, v.c, d1));
        if (seg.length > 1) traceWobble(lit[v.wing], seg, 0, 0, false);
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = C.hemo;
      for (const key of ['f', 'c', 'h']) {
        ctx.save();
        if (key === 'h') clipOutsideFW(ctx);
        ctx.lineWidth = 7;
        ctx.globalAlpha = 0.12 * fade;
        ctx.stroke(lit[key]);
        ctx.lineWidth = 2.4;
        ctx.globalAlpha = 0.55 * fade;
        ctx.stroke(lit[key]);
        ctx.restore();
      }
      for (const v of VEINS) {
        const a = wf.D - v.D0;
        if (a < 0) continue;
        const hidden = v.wing === 'h';
        if (a - trail > v.len) {
          // pooled glow where the wave reached a margin (kept off the push-in target after the lock)
          if (v.edge && a - v.len < trail + 60) {
            const e = v.pts[v.pts.length - 1];
            if (hidden && inFW(e[0], e[1])) continue;
            if (clearTarget && Math.hypot(e[0] - TARGET[0], e[1] - TARGET[1]) < 70) continue;
            blit(ctx, small, e[0], e[1], fade * 0.8 * (1 - (a - v.len - trail) / 60), 1.3);
          }
          continue;
        }
        const n = 6;
        for (let k = 0; k < n; k++) {
          const d = a - (trail * k) / (n - 1);
          if (d < 0 || d > v.len) continue;
          const p = pointAt(v.pts, v.c, d);
          let al = fade * (1 - k / n);
          if (hidden && inFW(p[0], p[1])) al *= 0.35;
          if (k === 0) blit(ctx, big, p[0], p[1], al);
          else blit(ctx, small, p[0], p[1], al * 0.8);
        }
      }
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Section line, inset, bracket, trace, reticle
  // ---------------------------------------------------------------------------
  function drawSection(ctx, tt) {
    const p = E.outExpo(clamp((tt - 3 * FR) / (6 * FR)));
    if (p <= 0) return;
    const pts = [SEC_A, [lerp(SEC_A[0], SEC_B[0], p), lerp(SEC_A[1], SEC_B[1], p)]];
    bline(ctx, pts, { color: C.lav, alpha: 0.7, width: 1.3, dash: [7, 4], amp: 0 });
    // section arrows (view along the wing axis) and end bars
    for (const q of [SEC_A, SEC_B]) {
      const bar = [[q[0] - E1[0] * 10, q[1] - E1[1] * 10], [q[0] + E1[0] * 16, q[1] + E1[1] * 16]];
      bline(ctx, bar, { alpha: 0.75 * p, width: 1.4, amp: 0 });
      const tip = bar[1];
      bline(ctx, [[tip[0] - E1[0] * 6 + E2[0] * 4, tip[1] - E1[1] * 6 + E2[1] * 4], tip, [tip[0] - E1[0] * 6 - E2[0] * 4, tip[1] - E1[1] * 6 - E2[1] * 4]], { alpha: 0.75 * p, width: 1.4, amp: 0 });
    }
    const c = measure(LEADER);
    const lead = headOf(LEADER, c, c[c.length - 1] * p);
    if (lead) bline(ctx, lead, { alpha: 0.5, width: 1.2, seed: SEED + 140, amp: 0.4 });
    ctx.save();
    ctx.fillStyle = C.lav;
    ctx.globalAlpha = 0.8 * p;
    ctx.beginPath();
    ctx.arc(SEC_B[0], SEC_B[1], 2.6, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  // a polyline whose interior vertices are rounded with circular fillets; returns the dense points and
  // the apex of each fillet (the fold point)
  function filletLine(V, radii, step) {
    const out = [V[0].slice()];
    const apex = [];
    let prev = V[0];
    const line = (a, b) => {
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.max(1, Math.ceil(l / step));
      for (let k = 1; k <= n; k++) out.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]);
    };
    for (let i = 1; i < V.length - 1; i++) {
      const a = V[i - 1], b = V[i], c = V[i + 1];
      let d1x = b[0] - a[0], d1y = b[1] - a[1];
      const l1 = Math.hypot(d1x, d1y) || 1;
      d1x /= l1;
      d1y /= l1;
      let d2x = c[0] - b[0], d2y = c[1] - b[1];
      const l2 = Math.hypot(d2x, d2y) || 1;
      d2x /= l2;
      d2y /= l2;
      const theta = Math.acos(clamp(-(d1x * d2x + d1y * d2y), -1, 1));
      if (theta > Math.PI * 0.985) {
        line(prev, b);
        prev = b;
        apex.push(b.slice());
        continue;
      }
      const half = theta / 2;
      const tl = Math.min(radii[i] / Math.tan(half), 0.46 * Math.min(l1, l2));
      const rho = tl * Math.tan(half);
      const p1 = [b[0] - d1x * tl, b[1] - d1y * tl], p2 = [b[0] + d2x * tl, b[1] + d2y * tl];
      let bx = -d1x + d2x, by = -d1y + d2y;
      const bl = Math.hypot(bx, by) || 1;
      bx /= bl;
      by /= bl;
      const dc = rho / Math.sin(half);
      const o = [b[0] + bx * dc, b[1] + by * dc];
      line(prev, p1);
      const a1 = Math.atan2(p1[1] - o[1], p1[0] - o[0]), a2 = Math.atan2(p2[1] - o[1], p2[0] - o[0]);
      let da = a2 - a1;
      while (da > Math.PI) da -= TAU;
      while (da < -Math.PI) da += TAU;
      const n = Math.max(2, Math.ceil((Math.abs(da) * rho) / step));
      for (let k = 1; k <= n; k++) {
        const aa = a1 + (da * k) / n;
        out.push([o[0] + Math.cos(aa) * rho, o[1] + Math.sin(aa) * rho]);
      }
      apex.push([b[0] + bx * (dc - rho), b[1] + by * (dc - rho)]);
      prev = p2;
    }
    line(prev, V[V.length - 1]);
    return { pts: out, apex };
  }

  // Inset: the wing in section. Two membrane sheets folded into a six-leg fan with a vein tube in the
  // middle fold and two smaller tubes at the outer folds; each wave presses the fan a step flatter.
  function drawInset(ctx, tt, tq) {
    const { x: cx, y: cy, r: R } = INSET;
    const pIn = E.outBack(clamp((tt - 2 * FR) / (3 * FR)));
    if (pIn <= 0) return;
    const k = flatten(tq);
    const kk = clamp(k);
    const kv = clamp(k, 0, 1.04);
    const { beat, k: ks, since } = beatOf(tt);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(pIn, pIn);
    ctx.translate(-cx, -cy);
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fillStyle = C.navyLight;
    ctx.globalAlpha = 0.96;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R - 3, 0, TAU);
    ctx.clip();
    // fine grid
    const g = new Path2D();
    for (let x = cx - R; x <= cx + R; x += 15) {
      g.moveTo(x, cy - R);
      g.lineTo(x, cy + R);
    }
    for (let y = cy - R; y <= cy + R; y += 15) {
      g.moveTo(cx - R, y);
      g.lineTo(cx + R, y);
    }
    ctx.strokeStyle = C.lav;
    ctx.globalAlpha = 0.07;
    ctx.lineWidth = 1;
    ctx.stroke(g);
    ctx.globalAlpha = 1;
    // the flat target the pleats press down to
    bline(ctx, [[cx - R, cy], [cx + R, cy]], { alpha: 0.25, dash: [5, 4], amp: 0 });

    // the fan: 6 straight facets of fixed length, folded +-38 degrees at the start and pressed to 0 in
    // four outBack steps, so the fan grows from 197 to 250 px wide as it flattens
    const N = 6;
    const LF = 250 / N;
    const ang = FOLD0 * (1 - kv);
    const W = N * LF * Math.cos(ang);
    const A = (LF * Math.sin(ang)) / 2;
    const x0 = cx - W / 2;
    const V = [];
    for (let i = 0; i <= N; i++) V.push([x0 + i * LF * Math.cos(ang), cy + (i % 2 ? A : -A)]);
    const fl = filletLine(V, [0, 2.5, 2.5, 2.5, 2.5, 2.5, 0], 2);
    const cl = fl.pts;
    const cc = measure(cl);
    const TL = cc[cc.length - 1];
    const gap = lerp(12, 7, kk);
    const tubes = [
      { c: fl.apex[2], r: 12, ri: 8.5, main: true },
      { c: fl.apex[0], r: 7, ri: 4.2 },
      { c: fl.apex[4], r: 7, ri: 4.2 },
    ];
    // facet normals, and each sheet as a mitred offset of the facets (sharp creases, no loops), pinched
    // toward the centreline at the two free ends
    const FN = [];
    for (let i = 0; i < N; i++) {
      const dx = V[i + 1][0] - V[i][0], dy = V[i + 1][1] - V[i][1], l = Math.hypot(dx, dy) || 1;
      FN.push([-dy / l, dx / l, dx / l, dy / l]);
    }
    const miter = (i) => {
      const a = FN[i - 1], b = FN[i];
      let mx = a[0] + b[0], my = a[1] + b[1];
      const ml = Math.hypot(mx, my) || 1;
      mx /= ml;
      my /= ml;
      const s = 1 / Math.max(0.3, mx * b[0] + my * b[1]);
      return [mx * s, my * s];
    };
    const sheet = (sgn, off) => {
      const o = sgn * off;
      const f0 = FN[0], f1 = FN[N - 1];
      const P = [[V[0][0] + f0[0] * o * 0.25, V[0][1] + f0[1] * o * 0.25], [V[0][0] + f0[2] * 14 + f0[0] * o, V[0][1] + f0[3] * 14 + f0[1] * o]];
      for (let i = 1; i < N; i++) {
        const m = miter(i);
        P.push([V[i][0] + m[0] * o, V[i][1] + m[1] * o]);
      }
      P.push([V[N][0] - f1[2] * 14 + f1[0] * o, V[N][1] - f1[3] * 14 + f1[1] * o], [V[N][0] + f1[0] * o * 0.25, V[N][1] + f1[1] * o * 0.25]);
      // densify, then push the sheet around the vein tubes it wraps
      const out = [];
      for (let i = 0; i < P.length - 1; i++) {
        const a = P[i], b = P[i + 1];
        const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2));
        for (let k2 = i === 0 ? 0 : 1; k2 <= n; k2++) {
          let q = [lerp(a[0], b[0], k2 / n), lerp(a[1], b[1], k2 / n)];
          let wrap = false;
          for (const tb of tubes) {
            const rr = tb.r + 2.5;
            const dx = q[0] - tb.c[0], dy = q[1] - tb.c[1], d = Math.hypot(dx, dy);
            if (d < rr) {
              const ux = d > 1e-3 ? dx / d : 0, uy = d > 1e-3 ? dy / d : sgn;
              q = [tb.c[0] + ux * rr, tb.c[1] + uy * rr];
              wrap = true;
            }
          }
          q.wrap = wrap;
          out.push(q);
        }
      }
      return out;
    };
    const up = sheet(-1, gap / 2), dn = sheet(1, gap / 2);
    // hemolymph in the space between the sheets, draining as they press flat
    const gapPoly = up.concat(dn.slice().reverse());
    fillPoly(ctx, gapPoly, C.hemo, 0.03 + 0.07 * (1 - kk));
    if (kk < 0.999) {
      L.stipple(ctx, gapPoly, {
        spacing: 7.5,
        r: [1.0, 1.6],
        color: C.hemo,
        alpha: 0.8,
        seed: SEED + 152,
        density: (x, y) => {
          for (const tb of tubes) if (Math.hypot(x - tb.c[0], y - tb.c[1]) < tb.r + 1) return 0;
          return 1 - kk;
        },
      });
    }
    // scales on the outer face of each sheet: 3 px strokes every 6 px, leaning toward the margin (right)
    const sh = new Path2D();
    for (const [pts, sgn] of [[up, -1], [dn, 1]]) {
      const c = measure(pts);
      const Lc = c[c.length - 1];
      for (let d = 10; d < Lc - 10; d += 6) {
        const q = pointAt(pts, c, d);
        let near = false;
        for (const tb of tubes) if (Math.hypot(q[0] - tb.c[0], q[1] - tb.c[1]) < tb.r + 5) near = true;
        if (near) continue;
        const tg = tangentAt(pts, c, d);
        let nx = -tg[1] * sgn, ny = tg[0] * sgn;
        const lx = nx * 0.87 + Math.abs(tg[0]) * 0.5, ly = ny * 0.87 + tg[1] * Math.sign(tg[0] || 1) * 0.5;
        sh.moveTo(q[0] + nx * 1.6, q[1] + ny * 1.6);
        sh.lineTo(q[0] + nx * 1.6 + lx * 3, q[1] + ny * 1.6 + ly * 3);
      }
    }
    ctx.strokeStyle = C.lav;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.stroke(sh);
    ctx.globalAlpha = 1;
    // the two membrane sheets
    bline(ctx, up, { color: C.lav, alpha: 0.85, width: 2, seed: SEED + 150, amp: 0.25 });
    bline(ctx, dn, { color: C.lav, alpha: 0.85, width: 2, seed: SEED + 151, amp: 0.25 });
    // a crease tick on the convex side of every fold
    {
      const ct = new Path2D();
      for (let i = 1; i < N; i++) {
        const m = miter(i);
        const ml = Math.hypot(m[0], m[1]) || 1;
        const sgn = i % 2 ? 1 : -1;
        let ux = m[0] / ml, uy = m[1] / ml;
        if (uy * sgn < 0) (ux = -ux), (uy = -uy);
        const tb = tubes.find((t) => Math.hypot(t.c[0] - V[i][0], t.c[1] - V[i][1]) < 4);
        const r0 = tb ? tb.r + 5 : (gap / 2) * ml + 3;
        ct.moveTo(V[i][0] + ux * r0, V[i][1] + uy * r0);
        ct.lineTo(V[i][0] + ux * (r0 + 6), V[i][1] + uy * (r0 + 6));
      }
      ctx.save();
      ctx.strokeStyle = C.white;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';
      ctx.stroke(ct);
      ctx.restore();
    }
    // tubes: a double wall with hatching, hemolymph glowing inside
    for (let i = 0; i < tubes.length; i++) {
      const tb = tubes[i];
      fillPoly(ctx, L.ellipsePts(tb.c[0], tb.c[1], tb.r, tb.r, 32), C.navy, 0.95);
      const hp = new Path2D();
      const nh = tb.main ? 16 : 9;
      for (let j = 0; j < nh; j++) {
        const a = (j / nh) * TAU + 0.3;
        hp.moveTo(tb.c[0] + Math.cos(a) * (tb.ri + 0.8), tb.c[1] + Math.sin(a) * (tb.ri + 0.8));
        hp.lineTo(tb.c[0] + Math.cos(a + 0.35) * (tb.r - 0.8), tb.c[1] + Math.sin(a + 0.35) * (tb.r - 0.8));
      }
      ctx.strokeStyle = C.lav;
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1;
      ctx.stroke(hp);
      ctx.globalAlpha = 1;
      bline(ctx, L.ellipsePts(tb.c[0], tb.c[1], tb.r, tb.r, 36), { closed: true, color: C.white, alpha: 0.95, width: tb.main ? 2.5 : 1.8, seed: SEED + 160 + i, amp: 0.2 });
      bline(ctx, L.ellipsePts(tb.c[0], tb.c[1], tb.ri, tb.ri, 32), { closed: true, color: C.white, alpha: tb.main ? 0.7 : 0.55, width: tb.main ? 1.5 : 1, seed: SEED + 165 + i, amp: 0.2 });
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const t0 = tubes[0];
    const dotS = sprite(C.hemo, 4, 10);
    for (let j = 0; j < 4; j++) {
      const a = (j * TAU) / 4 + tq * 2.4;
      const rr = 5.4;
      blit(ctx, dotS, t0.c[0] + Math.cos(a) * rr, t0.c[1] + Math.sin(a) * rr, 0.42 + 0.3 * beat, 0.8 + 0.3 * beat);
    }
    const dotSm = sprite(C.hemo, 2.6, 8);
    for (let i = 1; i < tubes.length; i++) blit(ctx, dotSm, tubes[i].c[0], tubes[i].c[1], 0.35 + 0.45 * beat, 1 + 0.3 * beat);
    if (beat > 0) blit(ctx, sprite(C.hemo, 4, 22), t0.c[0], t0.c[1], 0.45 * beat, 1.3);
    ctx.restore();
    if (ks > 0 && since < 8 * FR) {
      // pressure chevrons run outward from the main tube along the gap (on twos)
      const u = L.onTwos(since) / (8 * FR);
      let ai = 0, bd = Infinity;
      for (let i = 0; i < cl.length; i++) {
        const d = Math.hypot(cl[i][0] - t0.c[0], cl[i][1] - t0.c[1]);
        if (d < bd) (bd = d), (ai = i);
      }
      for (const dir of [-1, 1]) {
        for (const lagk of [0, 1]) {
          const uu = u - lagk * 0.18;
          if (uu < 0) continue;
          const d = cc[ai] + dir * (t0.r + 12 + 80 * uu);
          if (d < 6 || d > TL - 6) continue;
          const q = pointAt(cl, cc, d), tg = tangentAt(cl, cc, d);
          const bx = -tg[0] * dir * 5, by = -tg[1] * dir * 5;
          bline(ctx, [[q[0] + bx - tg[1] * 5, q[1] + by + tg[0] * 5], q, [q[0] + bx + tg[1] * 5, q[1] + by - tg[0] * 5]], { color: C.hemo, alpha: (1 - u) * (lagk ? 0.5 : 1), width: 1.6, amp: 0 });
        }
      }
    }
    // construction: the fold points projected up to a ruler whose ticks spread as the fan opens
    const rulerY = cy - 72;
    const ruler = new Path2D();
    ruler.moveTo(x0, rulerY);
    ruler.lineTo(x0 + W, rulerY);
    const proj = new Path2D();
    const foldX = [x0].concat(fl.apex.map((p) => p[0]), [x0 + W]);
    const foldY = [cy - A].concat(fl.apex.map((p) => p[1]), [cy - A]);
    for (let i = 0; i < foldX.length; i++) {
      ruler.moveTo(foldX[i], rulerY - (i % 2 ? 6 : 11));
      ruler.lineTo(foldX[i], rulerY + 4);
      proj.moveTo(foldX[i], rulerY + 8);
      proj.lineTo(foldX[i], foldY[i] - (i % 2 ? 20 : gap / 2 + 6));
    }
    ctx.save();
    ctx.strokeStyle = C.lav;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.1;
    ctx.stroke(ruler);
    ctx.globalAlpha = 0.18;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 4]);
    ctx.stroke(proj);
    ctx.restore();
    // fold angle at the second fold, closing as the fan flattens
    if (A > 3) {
      const v = V[2], a1 = Math.atan2(V[1][1] - v[1], V[1][0] - v[0]), a2 = Math.atan2(V[3][1] - v[1], V[3][0] - v[0]);
      bline(ctx, arcPts(v[0], v[1] - 2, 24, 24, a2, a1 + (a1 < a2 ? TAU : 0), 18), { alpha: 0.45 * clamp(A / 12), width: 1, amp: 0 });
    }
    // width arrow tied to the sheet ends, and the stack thickness while the fan is still folded
    const ay = cy + 72;
    const arrow = new Path2D();
    arrow.moveTo(x0 + 2, ay);
    arrow.lineTo(x0 + W - 2, ay);
    for (const [ex, sgn] of [[x0, 1], [x0 + W, -1]]) {
      arrow.moveTo(ex + sgn * 8, ay - 4);
      arrow.lineTo(ex + sgn * 1, ay);
      arrow.lineTo(ex + sgn * 8, ay + 4);
      arrow.moveTo(ex, ay - 8);
      arrow.lineTo(ex, ay + 8);
    }
    ctx.save();
    ctx.strokeStyle = C.lav;
    ctx.globalAlpha = 0.62;
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.stroke(arrow);
    ctx.restore();
    for (const ex of [cl[0][0], cl[cl.length - 1][0]]) bline(ctx, [[ex, cy + (A > 0 ? -A + 10 : 8)], [ex, ay - 10]], { alpha: 0.25, dash: [2, 3], amp: 0 });
    const thickA = 0.55 * clamp((A - 2) / 8);
    if (thickA > 0.01) {
      const top = cy - A - gap / 2 - 2, bot = cy + A + gap / 2 + 2;
      L.bracket(ctx, x0 - 14, top, x0 - 14, bot, { cap: 8, alpha: thickA, width: 1.1 });
    }
    ctx.restore();
    // rim
    halo(ctx, L.ellipsePts(cx, cy, R, R, 72), true, 0.45);
    bline(ctx, L.ellipsePts(cx, cy, R, R, 96), { closed: true, alpha: 0.6, width: 2.5, seed: SEED + 170, amp: 0.4 });
    bline(ctx, L.ellipsePts(cx, cy, R - 9, R - 9, 96), { closed: true, alpha: 0.4, width: 1.2, seed: SEED + 171, amp: 0.4 });
    L.ticks(ctx, cx, cy, { r: R + 4, n: 72, len: 5, major: 9, majorLen: 12, color: C.lav, alpha: 0.45, width: 1 });
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Network nodes: the abdominal pump in section, a vein tube in flow and the frame that stiffens (left),
  // and a close-up of the scale rows (right)
  // ---------------------------------------------------------------------------
  const NODES = {
    gauge: { x: 215, y: 470, r: 56, t: 4 * FR },
    flow: { x: 215, y: 700, r: 56, t: 3 * FR },
    frame: { x: 215, y: 930, r: 56, t: 5 * FR },
    scales: { x: 830, y: 700, r: 58, t: 4 * FR },
  };
  const SCALE_SRC = fw(160, -18);
  const rimPt = (n, a, extra) => [n.x + (n.r + (extra || 0)) * Math.cos(a), n.y + (n.r + (extra || 0)) * Math.sin(a)];
  const CONNECT = {
    flow: L.smoothPts([[516, 1024], [440, 1040], [348, 900], rimPt(NODES.flow, 0.38)], false, 4),
    gauge: [[215, 644], [215, 526]],
    frame: [[215, 756], [215, 874]],
    scales: L.smoothPts([[SCALE_SRC[0] + 10, SCALE_SRC[1] - 10], [700, 1000], [748, 870], rimPt(NODES.scales, 2.45)], false, 4),
  };
  // scale close-up: shingled rows at 30 degrees; a vein band crosses and a white spot sits below
  // groups run across the scale axis; draw the distal group first so proximal free ends overlap it
  const CLOSE_SCALES = (function () {
    const out = [];
    const ang = -0.5;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let i = 7; i >= -7; i--) {
      const group = [];
      for (let j = -7; j <= 7; j++) {
        const u = i * 13 + (j & 1 ? 6.5 : 0), v = j * 11.5;
        const x = u * ca - v * sa, y = u * sa + v * ca;
        if (x * x + y * y > 72 * 72) continue;
        const band = Math.abs(v + u * 0.1 + 3) < 12;
        const spot = (x + 8) * (x + 8) + (y - 32) * (y - 32) < 19 * 19;
        group.push({ x, y, band, spot });
      }
      out.push(group);
    }
    return { rows: out, ca, sa };
  })();

  function nodeFrame(ctx, n, p, seed) {
    const k = E.outBack(clamp(p));
    if (k <= 0) return 0;
    ctx.save();
    ctx.translate(n.x, n.y);
    ctx.scale(k, k);
    ctx.translate(-n.x, -n.y);
    fillPoly(ctx, L.ellipsePts(n.x, n.y, n.r, n.r, 48), C.navyLight, 0.94);
    halo(ctx, L.ellipsePts(n.x, n.y, n.r, n.r, 48), true, 0.35);
    bline(ctx, L.ellipsePts(n.x, n.y, n.r, n.r, 64), { closed: true, alpha: 0.6, width: 2, seed, amp: 0.3 });
    bline(ctx, L.ellipsePts(n.x, n.y, n.r - 6, n.r - 6, 64), { closed: true, alpha: 0.3, width: 1, seed: seed + 1, amp: 0.3 });
    L.ticks(ctx, n.x, n.y, { r: n.r + 3, n: 48, len: 3.5, major: 12, majorLen: 8, color: C.lav, alpha: 0.42, width: 1 });
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r - 3, 0, TAU);
    ctx.clip();
    return k;
  }

  function drawConnector(ctx, pts, p, seed) {
    if (p <= 0) return;
    const c = measure(pts);
    const h = headOf(pts, c, c[c.length - 1] * clamp(p));
    if (!h) return;
    bline(ctx, h, { alpha: 0.5, width: 1.2, seed, amp: 0.4 });
    const s = pts[0];
    ctx.save();
    ctx.fillStyle = C.lav;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(s[0], s[1], 2.8, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawNodes(ctx, tt, tq) {
    const { k: ks, since, beat } = beatOf(tt);
    const k = clamp(flatten(tq), 0, 1.1);

    // connectors draw on first, the nodes pop at their ends
    for (const key of ['flow', 'gauge', 'frame', 'scales']) {
      const n = NODES[key];
      drawConnector(ctx, CONNECT[key], E.outExpo(clamp((tt - n.t + 3 * FR) / (5 * FR))), SEED + 300 + key.length);
    }
    // wave packets travel the pump -> flow connector on each beat (on twos)
    const cf = measure(CONNECT.flow);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const d = tq - TM.waves[i];
      if (d < 0 || d > 0.25) continue;
      const q = pointAt(CONNECT.flow, cf, cf[cf.length - 1] * E.outQuad(d / 0.25));
      blit(ctx, sprite(C.hemo, 3, 12), q[0], q[1], 1 - d / 0.3);
    }
    ctx.restore();
    // magnifier on the wing where the scale close-up is taken
    const pm = E.outBack(clamp((tt - NODES.scales.t) / (3 * FR)));
    if (pm > 0) bline(ctx, L.ellipsePts(SCALE_SRC[0], SCALE_SRC[1], 15 * pm, 15 * pm, 32), { closed: true, alpha: 0.75, width: 1.2, dash: [3, 3], amp: 0 });

    // the abdominal pump in cross-section: a four-segment ring lights one segment per wave, and the
    // abdomen squeezes 10 percent on each wave, ejecting hemolymph toward its connector
    let n = NODES.gauge;
    if (nodeFrame(ctx, n, (tt - n.t) / (3 * FR), SEED + 310)) {
      const gapA = 0.17;
      for (let s = 0; s < 4; s++) {
        const a0 = -Math.PI / 2 + (s * Math.PI) / 2 + gapA, a1 = a0 + Math.PI / 2 - 2 * gapA;
        const lit = s < ks;
        const pop = lit ? E.outBack(clamp((tt - TM.waves[s]) / (3 * FR))) : 0;
        bline(ctx, arcPts(n.x, n.y, 44, 44, a0, a1, 16), { color: lit ? C.white : C.lav, alpha: lit ? 0.95 : 0.28, width: lit ? 1.4 + 1.4 * Math.min(1.1, pop) : 1.6, amp: 0.2, seed: SEED + 312 + s });
        const am = -Math.PI / 2 + (s * Math.PI) / 2;
        bline(ctx, [[n.x + Math.cos(am) * 38, n.y + Math.sin(am) * 38], [n.x + Math.cos(am) * 50, n.y + Math.sin(am) * 50]], { alpha: 0.45, width: 1.1, amp: 0 });
      }
      const sq = ks > 0 ? Math.sin(Math.PI * clamp(L.onTwos(since) / (4 * FR))) : 0;
      const S = 1 - 0.1 * sq;
      const ax = n.x, ay = n.y - 3;
      const ring = L.ellipsePts(ax, ay, 27 * S, 23 * S, 48);
      fillPoly(ctx, ring, C.navy, 0.7);
      // haemocoel stipple, then the organs: dorsal vessel, gut, ventral nerve cord, muscle bands
      L.stipple(ctx, ring, { spacing: 4.2, r: [0.6, 1.1], color: C.hemo, alpha: 0.35 + 0.4 * beat, seed: SEED + 318, boilAmp: 0.4 });
      const gut = L.ellipsePts(ax, ay + 1 * S, 9 * S, 8 * S, 28);
      fillPoly(ctx, gut, C.navyLight, 1);
      {
        const fold = [];
        for (let i = 0; i <= 40; i++) {
          const a = (i / 40) * TAU;
          const rr = (5.2 + 1.3 * Math.sin(a * 7)) * S;
          fold.push([ax + Math.cos(a) * rr, ay + 1 * S + Math.sin(a) * rr * 0.9]);
        }
        bline(ctx, fold, { alpha: 0.55, width: 1, amp: 0.2, seed: SEED + 319 });
      }
      bline(ctx, gut, { closed: true, alpha: 0.8, width: 1.2, seed: SEED + 322, amp: 0.2 });
      bline(ctx, L.ellipsePts(ax, ay - 14 * S, 4, 3.4, 16), { closed: true, color: C.white, alpha: 0.85, width: 1.2, amp: 0.2, seed: SEED + 323 });
      const organs = new Path2D();
      for (const dx of [-2.4, 2.4]) {
        organs.moveTo(ax + dx + 1.6, ay + 16 * S);
        organs.arc(ax + dx, ay + 16 * S, 1.6, 0, TAU);
      }
      ctx.save();
      ctx.fillStyle = C.lav;
      ctx.globalAlpha = 0.85;
      ctx.fill(organs);
      ctx.restore();
      const mus = new Path2D();
      for (const sgn of [-1, 1]) {
        for (const a of [-0.6, 0, 0.6]) {
          const c = Math.cos(a) * sgn, s2 = Math.sin(a);
          mus.moveTo(ax + c * 12 * S, ay + s2 * 10 * S);
          mus.lineTo(ax + c * 21 * S, ay + s2 * 17 * S);
        }
      }
      ctx.save();
      ctx.strokeStyle = C.lav;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1;
      ctx.stroke(mus);
      ctx.restore();
      bline(ctx, ring, { closed: true, color: C.white, alpha: 0.9, width: 1.9, seed: SEED + 320, amp: 0.3 });
      bline(ctx, L.ellipsePts(ax, ay, 23.5 * S, 19.5 * S, 44), { closed: true, alpha: 0.45, width: 1, seed: SEED + 321, amp: 0.3 });
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      blit(ctx, sprite(C.hemo, 2.4, 9), ax, ay - 14 * S, 0.5 + 0.5 * beat);
      if (ks > 0 && since < 8 * FR) {
        const u = L.onTwos(since) / (8 * FR);
        for (let j = 0; j < 3; j++) {
          const uu = clamp(u * 1.3 - j * 0.16);
          if (uu <= 0 || uu >= 1) continue;
          blit(ctx, sprite(C.hemo, 2.6, 10), ax + (j - 1) * 6 * (1 - uu), ay + 23 * S + uu * 34, 1 - uu * 0.6);
        }
      }
      ctx.restore();
      ctx.restore();
    }

    // flow: a vein tube that branches, dots streaming through and a packet on every beat
    n = NODES.flow;
    if (nodeFrame(ctx, n, (tt - n.t) / (3 * FR), SEED + 320)) {
      const trunk = [[n.x - 60, n.y], [n.x + 8, n.y]];
      const br1 = L.smoothPts([[n.x + 8, n.y], [n.x + 30, n.y - 8], [n.x + 60, n.y - 30]], false, 3);
      const br2 = L.smoothPts([[n.x + 8, n.y], [n.x + 30, n.y + 8], [n.x + 60, n.y + 30]], false, 3);
      const wall = (pts, w, seed) => {
        const c = measure(pts);
        for (const side of [-1, 1]) {
          const o = [];
          for (let d = 0; d <= c[c.length - 1]; d += 3) {
            const q = pointAt(pts, c, d), tg = tangentAt(pts, c, d);
            o.push([q[0] - tg[1] * w * side, q[1] + tg[0] * w * side]);
          }
          bline(ctx, o, { color: C.white, alpha: 0.85, width: 1.4, seed: seed + side, amp: 0.3 });
        }
      };
      wall(trunk, 9, SEED + 330);
      wall(br1, 5.5, SEED + 333);
      wall(br2, 5.5, SEED + 336);
      const sp = sprite(C.hemo, 1.8, 7);
      const spb = sprite(C.hemo, 2.6, 10);
      const spLead = sprite(C.hemo, 3.5, 14);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const [pts, cnt, w] of [[trunk, 14, 6], [br1, 7, 3], [br2, 7, 3]]) {
        const c = measure(pts);
        const Lp = c[c.length - 1];
        for (let i = 0; i < cnt; i++) {
          const d = (i * (Lp / cnt) + tq * 60) % Lp;
          const q = pointAt(pts, c, d), tg = tangentAt(pts, c, d);
          const off = (L.h3(i, 3, SEED + w) - 0.5) * 2 * w;
          blit(ctx, sp, q[0] - tg[1] * off, q[1] + tg[0] * off, 0.6);
        }
      }
      if (ks > 0 && since < 0.3) {
        const u = L.onTwos(since) / 0.3;
        const ct = measure(trunk);
        const total = ct[ct.length - 1];
        const d = u * (total + 50);
        // the train shows the direction: a r 3.5 leading dot, then smaller dots trailing behind it
        for (let j = 0; j < 4; j++) {
          const dd = d - j * 8;
          if (dd < 0) continue;
          const spj = j === 0 ? spLead : spb;
          const kj = j === 0 ? 1 : 1 - j * 0.18;
          if (dd <= total) {
            const q = pointAt(trunk, ct, dd);
            blit(ctx, spj, q[0], q[1], (1 - j / 5) * (1 - u * 0.5), kj);
          } else {
            for (const br of [br1, br2]) {
              const cb = measure(br);
              const q = pointAt(br, cb, dd - total);
              blit(ctx, spj, q[0], q[1], (1 - j / 5) * (1 - u * 0.5), kj);
            }
          }
        }
      }
      ctx.restore();
      ctx.restore();
    }

    // frame: a hex lattice patch, 16 px cells, that stiffens a step on each wave (the veins becoming the
    // wing's stiff frame): its vertices settle and its lines step from lavender 30% to lineWhite 70%
    n = NODES.frame;
    if (nodeFrame(ctx, n, (tt - n.t) / (3 * FR), SEED + 340)) {
      const s = clamp(k);
      const patch = L.ellipsePts(n.x, n.y, 45, 45, 48);
      fillPoly(ctx, patch, C.navy, 0.35 * s);
      L.hexLattice(ctx, patch, {
        r: 16 / Math.sqrt(3),
        color: L.mix(C.lav, C.white, s),
        alpha: Math.min(1, lerp(0.3, 0.7, s) + 0.2 * beat),
        width: lerp(1, 1.5, s),
        jitter: lerp(3.2, 0.4, s),
        dots: s > 0.2 ? 0.9 : 0,
        seed: SEED + 350,
      });
      bline(ctx, patch, { closed: true, alpha: 0.3 + 0.3 * s, width: 1, seed: SEED + 352, amp: 0.3, dash: [3, 3] });
      ctx.restore();
    }

    // scale close-up
    n = NODES.scales;
    if (nodeFrame(ctx, n, (tt - n.t) / (3 * FR), SEED + 360)) {
      const { rows, ca, sa } = CLOSE_SCALES;
      const glint = Math.floor(tq * 12) % (rows.length + 6);
      for (let j = 0; j < rows.length; j++) {
        const fillP = new Path2D();
        const strokeP = new Path2D();
        const bandP = new Path2D();
        const ridge = new Path2D();
        const sock = new Path2D();
        for (const s of rows[j]) {
          const cx = n.x + s.x, cy = n.y + s.y;
          const hl = 10, hw = 5.6;
          const X = (u, v) => cx + u * ca - v * sa;
          const Y = (u, v) => cy + u * sa + v * ca;
          const shape = (p) => {
            p.moveTo(X(-hl, -hw * 0.8), Y(-hl, -hw * 0.8));
            p.lineTo(X(hl - hw, -hw), Y(hl - hw, -hw));
            p.quadraticCurveTo(X(hl + 1.5, -hw), Y(hl + 1.5, -hw), X(hl + 1.5, 0), Y(hl + 1.5, 0));
            p.quadraticCurveTo(X(hl + 1.5, hw), Y(hl + 1.5, hw), X(hl - hw, hw), Y(hl - hw, hw));
            p.lineTo(X(-hl, hw * 0.8), Y(-hl, hw * 0.8));
            p.closePath();
          };
          shape(fillP);
          shape(s.band ? bandP : strokeP);
          for (const v of [-2.8, 0, 2.8]) {
            ridge.moveTo(X(-hl + 4, v * 0.85), Y(-hl + 4, v * 0.85));
            ridge.lineTo(X(hl - 1, v), Y(hl - 1, v));
          }
          sock.moveTo(X(-hl + 2.5, 0) + 1.2, Y(-hl + 2.5, 0));
          sock.arc(X(-hl + 2.5, 0), Y(-hl + 2.5, 0), 1.2, 0, TAU);
        }
        ctx.save();
        ctx.fillStyle = C.navyLight;
        ctx.globalAlpha = 1;
        ctx.fill(fillP);
        ctx.fillStyle = C.lav;
        ctx.globalAlpha = 0.35;
        ctx.fill(sock);
        ctx.strokeStyle = C.lav;
        ctx.globalAlpha = 0.28;
        ctx.lineWidth = 0.8;
        ctx.stroke(ridge);
        ctx.lineWidth = 1.1;
        ctx.globalAlpha = Math.abs(j - glint) < 1 ? 0.95 : 0.6;
        ctx.stroke(strokeP);
        ctx.strokeStyle = C.white;
        ctx.globalAlpha = 0.95;
        ctx.lineWidth = 1.4;
        ctx.stroke(bandP);
        ctx.restore();
      }
      // white spot outline
      L.stipple(ctx, L.ellipsePts(n.x - 8, n.y + 32, 18, 18, 32), { spacing: 4.2, r: [0.7, 1.2], color: C.white, alpha: 0.55, seed: SEED + 365 });
      bline(ctx, L.ellipsePts(n.x - 8, n.y + 32, 20, 20, 32), { closed: true, color: C.white, alpha: 0.75, width: 1.2, dash: [3, 3], amp: 0 });
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // Plumbing map: the wing again at 0.3 scale, its forewing base on (720, 440) and its apex near
  // (788, 580). The mini veins light as each wave front passes and the mini membrane fills in the same
  // four steps as the big wing, so the map reads as this wing, not a chart.
  // ---------------------------------------------------------------------------
  const MINI_K = 0.3;
  const MINI_O = [720, 440];
  const mini = (p) => [MINI_O[0] + (p[0] - FB[0]) * MINI_K, MINI_O[1] + (p[1] - FB[1]) * MINI_K];
  const MINI = (function () {
    const fwP = FW.map(mini);
    return {
      fw: fwP,
      fwIn: insetPoly(fwP, 3),
      hw: HW.map(mini),
      veins: VEINS.map((v) => (v.wing === 'h' ? null : v.pts.map(mini))),
      pump: mini(PUMP),
      target: mini(TARGET),
      apex: mini(FA),
      bracketX: mini([880, 0])[0],
      rulerA: mini([633, 952]),
      rulerB: mini([858, 1417]),
    };
  })();

  // dotted streamlines from the pump to each node glyph
  const STREAMS = (function () {
    const quad = (p0, c, p2) => {
      const pts = [];
      for (let i = 0; i <= 48; i++) {
        const u = i / 48;
        pts.push([(1 - u) * (1 - u) * p0[0] + 2 * u * (1 - u) * c[0] + u * u * p2[0], (1 - u) * (1 - u) * p0[1] + 2 * u * (1 - u) * c[1] + u * u * p2[1]]);
      }
      const cc = measure(pts);
      return { pts, c: cc, len: cc[cc.length - 1] };
    };
    return [
      quad([524, 984], [380, 720], rimPt(NODES.gauge, 0.95, 4)),
      quad([522, 1004], [400, 962], rimPt(NODES.frame, 0.16, 4)),
      quad([556, 984], [720, 950], rimPt(NODES.scales, 1.95, 4)),
      quad([558, 978], [770, 690], [MINI.pump[0] - 7, MINI.pump[1] + 7]),
      quad([514, 1012], [440, 1120], [INSET.x + (INSET.r + 4) * Math.cos(-0.55), INSET.y + (INSET.r + 4) * Math.sin(-0.55)]),
    ];
  })();
  function flowOffset(tt) {
    let o = 0;
    for (const w of TM.waves) {
      const f = clamp((tt - w) * 24, 0, 6);
      o += f <= 3 ? 3 * f : 9 + (f - 3);
    }
    return o;
  }
  function drawStreams(ctx, tt, tq) {
    const p = E.outExpo(clamp((tt - 4 * FR) / (6 * FR)));
    if (p <= 0) return;
    const path = new Path2D();
    for (const s of STREAMS) {
      const h = headOf(s.pts, s.c, s.len * p);
      if (h) traceWobble(path, h, 0, 0, false);
    }
    ctx.save();
    ctx.strokeStyle = C.lav;
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.setLineDash([2, 6]);
    ctx.lineDashOffset = -flowOffset(tt);
    ctx.stroke(path);
    ctx.restore();
    // a hemolymph packet rides each stream on every wave (on twos)
    const sp = sprite(C.hemo, 2.4, 10);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const w of TM.waves) {
      const d = tq - w;
      if (d < 0 || d >= 0.25) continue;
      for (const s of STREAMS) {
        const q = pointAt(s.pts, s.c, s.len * E.outQuad(d / 0.25));
        blit(ctx, sp, q[0], q[1], 0.9 * (1 - d / 0.3));
      }
    }
    ctx.restore();
  }

  function drawMini(ctx, tt, tq, R) {
    const pin = clamp((tt - 2 * FR) / (4 * FR));
    if (pin <= 0) return;
    const M = MINI;
    const { beat } = beatOf(tt);
    // membrane, and the hemolymph steps
    fillPoly(ctx, M.hw, C.navyLight, 0.9 * pin);
    fillPoly(ctx, M.fw, C.navyLight, 0.95 * pin);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = C.hemo;
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, M.fw, true);
    ctx.clip();
    hemoFill(ctx, 'f', tq, mini);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.rect(600, 380, 400, 300);
    L.tracePath(ctx, M.fw, true);
    ctx.clip('evenodd');
    ctx.beginPath();
    L.tracePath(ctx, M.hw, true);
    ctx.clip();
    hemoFill(ctx, 'h', tq, mini);
    ctx.restore();
    ctx.restore();
    // veins, following the big draw-on
    const bs = boilNow() * 131;
    const vp = new Path2D();
    for (let i = 0; i < VEINS.length; i++) {
      const mv = M.veins[i];
      const vis = R.vis[i];
      if (!mv || vis <= 0.5) continue;
      const v = VEINS[i];
      const h = vis >= v.len - 0.01 ? mv : (headOf(v.pts, v.c, vis) || []).map(mini);
      if (h.length > 1) traceWobble(vp, h, 0.2, SEED + 560 + i + bs, false);
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.7 * pin;
    ctx.stroke(vp);
    ctx.restore();
    // outline: a double lavender line 3 px apart, and the hindwing lobe below it
    ctx.save();
    ctx.beginPath();
    ctx.rect(600, 380, 400, 300);
    L.tracePath(ctx, M.fw, true);
    ctx.clip('evenodd');
    bline(ctx, M.hw, { closed: true, alpha: 0.6 * pin, width: 1.2, seed: SEED + 540, amp: 0.25 });
    ctx.restore();
    bline(ctx, M.fw, { closed: true, alpha: 0.6 * pin, width: 1.5, seed: SEED + 541, amp: 0.25 });
    bline(ctx, M.fwIn, { closed: true, alpha: 0.35 * pin, width: 1, seed: SEED + 542, amp: 0.25 });
    // each wave lights the stretch of mini vein its front has just passed, with a dot at the front
    const dot = sprite(C.hemo, 1.5, 6);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = C.hemo;
    for (let w = 0; w < 4; w++) {
      const wf = waveFront(tq, w);
      if (!wf || wf.u > 1.001) continue;
      const fade = wf.u > 0.8 ? clamp((1 - wf.u) / 0.2) * 0.8 + 0.2 : 1;
      const trail = Math.max(22, (wf.D - wf.Dp) * 0.85) * 1.8;
      const lit = new Path2D();
      const fronts = [];
      for (let i = 0; i < VEINS.length; i++) {
        if (!M.veins[i]) continue;
        const v = VEINS[i];
        const a = wf.D - v.D0;
        if (a < 0 || a - trail > v.len) continue;
        const seg = segOf(v.pts, v.c, a - trail, Math.min(v.len, a));
        if (seg) traceWobble(lit, seg.map(mini), 0, 0, false);
        if (a <= v.len) fronts.push(mini(pointAt(v.pts, v.c, a)));
      }
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.16 * fade;
      ctx.stroke(lit);
      ctx.lineWidth = 1.3;
      ctx.globalAlpha = 0.8 * fade;
      ctx.stroke(lit);
      for (const q of fronts) blit(ctx, dot, q[0], q[1], fade);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // the plate's own construction at 0.3: height bracket, chord ruler, corner marks, and the reticle
    L.bracket(ctx, M.bracketX, MINI_O[1], M.bracketX, M.apex[1], { alpha: 0.5 * pin, cap: 6, width: 1 });
    {
      const mk = new Path2D();
      const a = M.rulerA, b = M.rulerB;
      mk.moveTo(a[0], a[1]);
      mk.lineTo(b[0], b[1]);
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let d = 0; d <= len + 0.1; d += 6) {
        const major = Math.round(d / 6) % 5 === 0;
        const l = major ? 5 : 2.5;
        const x = a[0] + RULER_T[0] * d, y = a[1] + RULER_T[1] * d;
        mk.moveTo(x, y);
        mk.lineTo(x + RULER_N[0] * l, y + RULER_N[1] * l);
      }
      for (const [x, y, sx, sy] of [[704, 424, 1, 1], [896, 424, -1, 1], [704, 596, 1, -1], [896, 596, -1, -1]]) {
        mk.moveTo(x + sx * 12, y);
        mk.lineTo(x, y);
        mk.lineTo(x, y + sy * 12);
      }
      ctx.save();
      ctx.strokeStyle = C.lav;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4 * pin;
      ctx.stroke(mk);
      ctx.restore();
    }
    // the pump at the root, and the push-in target: hunting brackets that lock magenta with the big reticle
    L.glowDot(ctx, M.pump[0], M.pump[1], 2.6, { rays: 0, glow: 4, intensity: (0.6 + 0.4 * beat) * pin, seed: SEED + 520 });
    if (tt >= TM.ret) {
      const locked = tt >= TM.lock - 1e-6;
      const h = locked ? 7 : 11, arm = locked ? 3.5 : 4.5;
      const rp = new Path2D();
      for (const sx of [-1, 1]) {
        for (const sy of [-1, 1]) {
          rp.moveTo(M.target[0] + sx * h, M.target[1] + sy * (h - arm));
          rp.lineTo(M.target[0] + sx * h, M.target[1] + sy * h);
          rp.lineTo(M.target[0] + sx * (h - arm), M.target[1] + sy * h);
        }
      }
      ctx.save();
      ctx.strokeStyle = locked ? C.mag : C.white;
      ctx.lineWidth = locked ? 1.6 : 1;
      ctx.globalAlpha = locked ? 0.95 : 0.6;
      ctx.stroke(rp);
      ctx.restore();
    }
  }

  // length ruler parallel to the base-to-apex chord, 75 px outside it: (633, 952) to (858, 1417), minor
  // ticks every 20 px, majors every 100 px, drawn on with the veins; its apex end tick pulses on each wave
  const RULER_N = [E2[0] * -1, E2[1] * -1]; // (0.901, -0.436), away from the wing
  const RULER_A = [633, 952], RULER_B = [858, 1417];
  const RULER_LEN = Math.hypot(RULER_B[0] - RULER_A[0], RULER_B[1] - RULER_A[1]);
  const RULER_T = [(RULER_B[0] - RULER_A[0]) / RULER_LEN, (RULER_B[1] - RULER_A[1]) / RULER_LEN];
  function drawRuler(ctx, tt) {
    const p = E.outExpo(clamp((tt - 3 * FR) / (6 * FR)));
    if (p <= 0) return;
    const at = (d, o) => [RULER_A[0] + RULER_T[0] * d + RULER_N[0] * o, RULER_A[1] + RULER_T[1] * d + RULER_N[1] * o];
    const reach = RULER_LEN * p;
    const line = new Path2D();
    const a = at(0, 0), b = at(reach, 0);
    line.moveTo(a[0], a[1]);
    line.lineTo(b[0], b[1]);
    for (let d = 20; d < RULER_LEN - 4 && d <= reach; d += 20) {
      const q = at(d, 0), e = at(d, d % 100 === 0 ? 14 : 6);
      line.moveTo(q[0], q[1]);
      line.lineTo(e[0], e[1]);
    }
    ctx.save();
    ctx.strokeStyle = C.lav;
    ctx.lineCap = 'round';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;
    ctx.stroke(line);
    const ends = new Path2D();
    for (const d of [0, RULER_LEN]) {
      if (d > reach + 0.5) continue;
      const q = at(d, -8), e = at(d, 8);
      ends.moveTo(q[0], q[1]);
      ends.lineTo(e[0], e[1]);
    }
    ctx.globalAlpha = 0.6;
    ctx.stroke(ends);
    ctx.restore();
    if (reach < RULER_LEN - 0.5) return;
    const { k, since } = beatOf(tt);
    if (k > 0 && since < 6 * FR) {
      const u = since / (6 * FR);
      const q = at(RULER_LEN, -10 - 4 * (1 - u)), e = at(RULER_LEN, 10 + 4 * (1 - u));
      bline(ctx, [q, e], { color: C.white, alpha: 1 - u, width: lerp(3, 1.4, u), amp: 0 });
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      blit(ctx, sprite(C.hemo, 2.4, 10), RULER_B[0], RULER_B[1], 1 - u);
      ctx.restore();
    }
  }

  function drawBracket(ctx, tt) {
    const p = E.outExpo(clamp(tt / (6 * FR)));
    if (p <= 0) return;
    bline(ctx, [[580, 985], [lerp(580, 900, p), 985]], { alpha: 0.28, dash: [4, 4], amp: 0 });
    bline(ctx, [[800, 1450], [lerp(800, 900, p), 1450]], { alpha: 0.28, dash: [4, 4], amp: 0 });
    L.bracket(ctx, 880, 985, 880, 1450, { alpha: 0.65, cap: 16, p });
    L.ticks(ctx, 890, 985, { kind: 'linear', length: 465, angle: Math.PI / 2, n: 30, len: 6, major: 5, majorLen: 13, side: -1, alpha: 0.4, color: C.lav, width: 1, baseline: false, p });
  }

  function signal(tau) {
    let s = 2 + 1.3 * L.noise1(tau * 60, 5) + 0.8 * L.noise1(tau * 170, 6);
    for (let i = 0; i < 4; i++) {
      const d = tau - TM.waves[i];
      if (d < 0) continue;
      const rise = clamp(d / 0.018);
      s += (20 + 7 * i) * rise * Math.exp(-Math.max(0, d - 0.018) * 15) * (1 + 0.25 * Math.sin(d * 90) * Math.exp(-d * 20));
    }
    return s;
  }
  function drawTrace(ctx, tt) {
    const x0 = 100, x1 = 400, yb = 1510;
    bline(ctx, [[x0, yb], [x1, yb]], { alpha: 0.35, width: 1, amp: 0 });
    bline(ctx, [[x0, yb - 52], [x0, yb + 6]], { alpha: 0.3, width: 1, amp: 0 });
    L.ticks(ctx, x0, yb + 5, { kind: 'linear', length: x1 - x0, angle: 0, n: 12, len: 5, major: 4, majorLen: 10, side: 1, color: C.lav, alpha: 0.35, width: 1, baseline: false });
    for (let i = 0; i < 4; i++) {
      const x = x0 + ((x1 - x0) * TM.waves[i]) / DUR;
      bline(ctx, [[x, yb - 50], [x, yb]], { alpha: 0.12, width: 1, dash: [2, 4], amp: 0 });
    }
    const head = x0 + (x1 - x0) * clamp(tt / DUR);
    const pts = [];
    for (let x = x0; x <= head; x += 1.5) pts.push([x, yb - 3 - signal(((x - x0) / (x1 - x0)) * DUR)]);
    if (pts.length > 1) {
      bline(ctx, pts, { color: C.white, alpha: 0.85, width: 1.4, amp: 0.2, seed: SEED + 180 });
      const e = pts[pts.length - 1];
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      blit(ctx, sprite(C.hemo, 2.6, 10), e[0], e[1], 1);
      ctx.restore();
    }
  }

  function drawReticle(ctx, tt, tq) {
    if (tt < TM.ret) return;
    const pin = E.outBack(clamp((tt - TM.ret) / (3 * FR)));
    const locked = tt >= TM.lock;
    const lf = Math.floor((tt - TM.lock) * 24 + 1e-6);
    let size = locked ? lerp(160, 90, E.outBack(clamp((tt - TM.lock) / (3 * FR)))) : 160;
    size *= lerp(1.35, 1, pin);
    let cx = TARGET[0], cy = TARGET[1];
    if (!locked) {
      // hunting on twos, settling toward the lock
      const amp = 7 * (1 - clamp((tq - TM.ret) / (TM.lock - TM.ret)));
      const bi = Math.floor(tq * 12 + 1e-6);
      cx += amp * (L.h3(bi, 7, SEED) - 0.5) * 2;
      cy += amp * (L.h3(bi, 9, SEED) - 0.5) * 2;
    }
    const magA = locked ? (lf < 6 ? 1 : lerp(1, 0.72, clamp((lf - 6) / 6))) : 0;
    const col = locked ? C.mag : C.white;
    const width = locked ? 3 : 1.6;
    const alpha = locked ? magA : 0.8 * clamp(pin);
    const h = size / 2, arm = size * 0.27;
    const p = new Path2D();
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        p.moveTo(cx + sx * h, cy + sy * (h - arm));
        p.lineTo(cx + sx * h, cy + sy * h);
        p.lineTo(cx + sx * (h - arm), cy + sy * h);
      }
    }
    // centre cross ticks
    const q = new Path2D();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      q.moveTo(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9);
      q.lineTo(cx + Math.cos(a) * (locked ? 16 : 20), cy + Math.sin(a) * (locked ? 16 : 20));
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (locked) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = C.mag;
      ctx.lineWidth = 8;
      ctx.globalAlpha = 0.12 * magA;
      ctx.stroke(p);
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.strokeStyle = col;
    ctx.lineWidth = width;
    ctx.globalAlpha = alpha;
    ctx.stroke(p);
    ctx.lineWidth = 1.3;
    ctx.globalAlpha = alpha * 0.8;
    ctx.stroke(q);
    ctx.restore();
    // leader to the height bracket
    bline(ctx, [[cx + h + 8, cy], [872, cy]], { color: locked ? C.mag : C.lav, alpha: locked ? 0.55 * magA : 0.35 * clamp(pin), width: 1.2, dash: [3, 4], amp: 0 });
    bline(ctx, [[866, TARGET[1]], [894, TARGET[1]]], { color: locked ? C.mag : C.white, alpha: locked ? magA : 0.6 * clamp(pin), width: locked ? 3 : 1.5, amp: 0 });
    if (locked) {
      if (lf < 9) {
        const u = (tt - TM.lock) / (9 * FR);
        L.guideCircle(ctx, TARGET[0], TARGET[1], lerp(10, 86, E.outExpo(u)), { color: C.mag, alpha: 1 - u, width: 3 });
      }
      L.glowDot(ctx, TARGET[0], TARGET[1], 4, { color: C.mag, core: '#ffe6f2', rays: 8, rayLen: 3, glow: 6, intensity: magA * 0.9, seed: SEED + 190 });
    }
  }

  // ---------------------------------------------------------------------------
  // Cycle glyph at (900, 300), screen-fixed: adult arc lit
  // ---------------------------------------------------------------------------
  function drawCycleGlyph(ctx) {
    const cx = 900, cy = 300, r = 44;
    const gapA = 0.14;
    for (let k = 0; k < 4; k++) {
      const a0 = -Math.PI / 2 + (k * Math.PI) / 2 + gapA;
      const a1 = a0 + Math.PI / 2 - 2 * gapA;
      const cur = k === 3;
      bline(ctx, arcPts(cx, cy, r, r, a0, a1, 20), { color: cur ? C.white : C.lav, alpha: cur ? 1 : 0.25, width: cur ? 2.6 : 2, seed: SEED + 1800 + k, amp: 0.3 });
    }
    const p = new Path2D();
    for (let k = 0; k < 4; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 2;
      p.moveTo(cx + Math.cos(a) * (r - 5), cy + Math.sin(a) * (r - 5));
      p.lineTo(cx + Math.cos(a) * (r + 5), cy + Math.sin(a) * (r + 5));
    }
    ctx.save();
    ctx.strokeStyle = C.lav;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1.2;
    ctx.stroke(p);
    ctx.restore();
    L.guideCircle(ctx, cx, cy, 30, { alpha: 0.12, width: 1, dash: [2, 4] });
    const am = Math.PI * 1.25;
    L.glowDot(ctx, cx + Math.cos(am) * r, cy + Math.sin(am) * r, 3.5, { rays: 0, glow: 5, intensity: 0.7, seed: SEED + 1810 });
  }

  // ---------------------------------------------------------------------------
  // Scene
  // ---------------------------------------------------------------------------
  FILM.scene({
    id: ID,
    draw(ctx, t, info) {
      const dur = info.dur || DUR;
      // clamp to the last drawn frame, so anything asked for past the end holds the final pose
      const tt = clamp(t, 0, dur - FR);
      const tq = L.onTwos(tt);
      // the ease is normalised over the drawn frames so the last frame (T 19.458) lands on zoom 1.08
      const u = clamp((tt - TM.cam0) / (TM.cam1 - FR - TM.cam0));
      const zoom = lerp(1, 1.08, E.inOutSine(u));
      const R = veinReach(tt);
      const front = R.front;
      L.camera(ctx, { x: TARGET[0] - 195 / zoom, y: TARGET[1] - 440 / zoom, zoom }, (c) => {
        drawPlate(c, tt);
        drawTwig(c, zoom);
        drawShell(c);
        drawWingGlow(c);
        drawHindwing(c, front, tq);
        drawForewing(c, front, tq);
        drawBands(c, tt);
        drawVeins(c, tt, R);
        drawJunctions(c, tt, tq, front);
        drawBody(c, tt, tq);
        drawWaves(c, tt, tq);
        drawEndRings(c, tt);
        drawPump(c, tt, tq);
        drawSection(c, tt);
        drawStreams(c, tt, tq);
        drawNodes(c, tt, tq);
        drawMini(c, tt, tq, R);
        drawInset(c, tt, tq);
        drawBracket(c, tt);
        drawRuler(c, tt);
        drawTrace(c, tt);
        drawReticle(c, tt, tq);
      });
      drawCycleGlyph(ctx);
    },
  });
})();
