// 07 inside-chrysalis: Rebuilt, not melted (schematic, T 11.5 to 13.0).
// The G3 chrysalis as a lavender blueprint, abdomen up and head down. Larval crawling muscles
// fracture into drifting stipple, the gut narrows to a nectar tube, the nerve cord is kept and
// shortens, and the eye, antenna, leg and wing primordia ignite and wire to four node glyphs.
(function () {
  'use strict';
  const FILM = window.FILM;
  const L = FILM.lib;
  const P = L.pal;
  const TAU = Math.PI * 2;
  const ID = 'inside-chrysalis';
  const SEED = L.hash(ID);

  // ---------------------------------------------------------------------------
  // Colours (hoisted: pal is a proxy)
  // ---------------------------------------------------------------------------
  const C = {
    lav: P.lavender,
    white: P.lineWhite,
    glow: P.glow,
    mag: P.magenta,
    gold: P.schemGold,
    navy: P.navy,
    navyLight: P.navyLight,
    paleBlue: P.paleBlue,
  };

  // ---------------------------------------------------------------------------
  // G3 chrysalis geometry (shared, exact numbers)
  // ---------------------------------------------------------------------------
  const G3 = [[332, 35], [380, 72], [440, 106], [500, 124], [600, 130], [700, 127], [800, 108], [860, 78], [895, 36], [905, 0]];
  const AX = 540;

  // monotone cubic Hermite through the half-width table (no overshoot between knots)
  const hw = (function makeMonotone(pts) {
    const n = pts.length;
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const d = [], m = new Array(n);
    for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
    m[0] = d[0];
    m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i];
      const s = a * a + b * b;
      if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
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
  })(G3);

  function outlineYs() {
    const ys = [];
    for (let y = 332; y < 880; y += 7) ys.push(y);
    for (let y = 880; y < 905; y += 2.5) ys.push(y);
    return ys;
  }
  const OUTER = (function () {
    const ys = outlineYs();
    const right = ys.map((y) => [AX + hw(y), y]);
    const left = ys.slice().reverse().map((y) => [AX - hw(y), y]);
    // a low dome over the top, as 06 draws it, so the silhouette holds across the cut
    return right.concat([[AX, 905]], left, [[AX - 21, 327.5], [AX, 325], [AX + 21, 327.5]]);
  })();
  // inner outline 9 px inside, offset along averaged normals
  const INNER = (function () {
    const n = OUTER.length;
    const out = [];
    for (let i = 0; i < n; i++) {
      const a = OUTER[(i - 2 + n) % n], b = OUTER[(i + 2) % n];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl; ty /= tl;
      // polygon runs clockwise on screen (right side down), so the inward normal is (ty, -tx) rotated
      let nx = -ty, ny = tx;
      const p = OUTER[i];
      const cy = L.clamp(p[1], 420, 820);
      if ((AX - p[0]) * nx + (cy - p[1]) * ny < 0) { nx = -nx; ny = -ny; }
      out.push([p[0] + nx * 9, p[1] + ny * 9]);
    }
    return out;
  })();
  // gold dots: 12 along the rim band's lower edge, 5 on a shallow arc near the bottom, 2 each side at y 560
  const GOLD = (function () {
    const out = [];
    // spaced as on a cylinder, between the positions 06 and 08 use so both match cuts hold
    for (let i = 0; i < 12; i++) {
      const th = ((-67 + (134 * i) / 11) * Math.PI) / 180;
      const lam = Math.sin(th) * 115 / 126;
      out.push([AX + 115 * Math.sin(th), 521 + 1.5 * (1 - lam * lam), 0.55 + 0.45 * Math.cos(th)]);
    }
    for (let i = 0; i < 5; i++) {
      const u = (i - 2) / 2;
      out.push([AX + u * 45, 850 - 20 * u * u]);
    }
    for (const x of [445, 466, 614, 635]) out.push([x, 560]);
    return out;
  })();

  // ---------------------------------------------------------------------------
  // Timing (local seconds, t = T - 11.5)
  // ---------------------------------------------------------------------------
  const F = 1 / 24;
  const TM = {
    fracStart: 2 * F, // 11.583
    fracEnd: 10 * F, // 11.917
    gut: 0.5, // 12.000, 6 frames
    ignite: [0.5, 0.625, 0.75, 0.875], // eye, antenna, leg, wing
    // each connector lands on its own 16th: eye 12.25, antenna 12.375, wing alone on the 12.5 beat, leg 12.625
    conStart: [0.625, 0.75, 0.875, 0.875],
    conEnd: [0.75, 0.875, 1.125, 1.0],
    flash: 1.0, // 12.500
    fibres: 1.0, // 8 frames
  };
  // magenta flicker length per muscle break: the last drawing (frame 10) gets 2 frames so 12.0 opens clean
  const flickerFrames = (seg) => (seg.fBreak >= 10 ? 2 : 4);

  // ---------------------------------------------------------------------------
  // Small drawing helpers
  // ---------------------------------------------------------------------------
  const boilNow = () => L.boil(L.T);

  // a thin schematic polyline that boils on the 12 fps clock
  function sline(ctx, pts, o) {
    if (!pts || pts.length < 2) return;
    const amp = o.amp != null ? o.amp : 0.6;
    const seed = (o.seed | 0) + boilNow() * 131;
    const closed = !!o.closed;
    ctx.save();
    ctx.globalAlpha *= o.alpha != null ? o.alpha : 1;
    ctx.strokeStyle = o.color || C.lav;
    ctx.lineWidth = o.width || 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (o.dash) ctx.setLineDash(o.dash);
    ctx.beginPath();
    let s = 0;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      if (i > 0) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      const dd = amp ? amp * L.noise1(s * 0.02, seed) : 0;
      const x = p[0] - (ty / tl) * dd, y = p[1] + (tx / tl) * dd;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    if (closed) ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  function circlePts(cx, cy, r, n = 48, a0 = 0, span = TAU) {
    const out = [];
    const full = Math.abs(span - TAU) < 1e-6;
    const m = full ? n : n + 1;
    for (let i = 0; i < m; i++) {
      const a = a0 + (span * i) / n;
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return out;
  }

  function dots(ctx, list, color, alpha) {
    const p = new Path2D();
    for (const d of list) {
      p.moveTo(d[0] + d[2], d[1]);
      p.arc(d[0], d[1], d[2], 0, TAU);
    }
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    ctx.fill(p);
    ctx.restore();
  }

  function cubic(p0, p1, p2, p3, n) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      out.push([
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
      ]);
    }
    return out;
  }

  function partial(pts, p) {
    if (p >= 1) return pts;
    if (p <= 0) return [];
    let total = 0;
    const acc = [0];
    for (let i = 1; i < pts.length; i++) {
      total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      acc.push(total);
    }
    const target = total * p;
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      if (acc[i] <= target) out.push(pts[i]);
      else {
        const k = (target - acc[i - 1]) / (acc[i] - acc[i - 1] || 1);
        out.push([L.lerp(pts[i - 1][0], pts[i][0], k), L.lerp(pts[i - 1][1], pts[i][1], k)]);
        break;
      }
    }
    return out;
  }

  // ---------------------------------------------------------------------------
  // Precomputed structure (pure functions of fixed seeds)
  // ---------------------------------------------------------------------------

  // abdomen segments y 350 to 560, six bands of 35 px
  const SEGS = [];
  for (let k = 0; k < 6; k++) {
    const y0 = 350 + k * 35;
    // breaks land on the twos grid, top down, from frame 2 (T 11.583) to frame 10 (T 11.917)
    SEGS.push({ y0, y1: y0 + 35, ym: y0 + 17.5, tBreak: [2, 4, 6, 8, 10, 10][k] / 24, fBreak: [2, 4, 6, 8, 10, 10][k] });
  }
  const bowY = (y, x, bow) => {
    const h = hw(y);
    const u = h > 0 ? (x - AX) / h : 0;
    return y + bow * (1 - u * u);
  };
  // larval nerve-cord beads at rest (before the cord shortens), used to keep muscles clear of them
  const CORD_REST = [];
  for (let i = 0; i < 12; i++) CORD_REST.push([470, 420 + i * 40]);
  // Larval crawling muscles run lengthwise under the cuticle: in each segment a longitudinal pair on the
  // ventral wall (left) and one on the dorsal wall (right), 16 and 24 px in from the case outline,
  // following the wall so none crosses the gut. Together the six pairs make one white rail down each wall.
  // On the ventral side the rail is cut only where it passes under a nerve-cord bead and its knock-out.
  const MUSCLE_OFF = [16, 24];
  const underBead = (x, y) => {
    for (const b of CORD_REST) {
      const dx = (x - b[0]) / 9.4, dy = (y - b[1]) / 11;
      if (dx * dx + dy * dy < 1) return true;
    }
    return false;
  };
  function musclePair(seg) {
    const lines = [];
    for (const side of [-1, 1]) {
      // runs of samples where both lines of the pair are clear, so each run is a closed band
      const runs = [];
      let run = null;
      for (let y = seg.y0 + 3; y <= seg.y0 + 32 + 0.01; y += 2.9) {
        const xa = AX + side * (hw(y) - MUSCLE_OFF[0]), xb = AX + side * (hw(y) - MUSCLE_OFF[1]);
        if (side > 0 || (!underBead(xa, y) && !underBead(xb, y))) {
          if (!run) runs.push((run = { a: [], b: [] }));
          run.a.push([xa, y]);
          run.b.push([xb, y]);
        } else run = null;
      }
      for (const r of runs) if (r.a.length >= 2) lines.push({ side, a: r.a, b: r.b });
    }
    return lines;
  }
  const PAIRS = SEGS.map(musclePair);
  const SPIRACLE_DY = [24, 24, 22, 22, 10, 14];

  // stipple dots that each muscle pair breaks into, laid along the same lengthwise lines
  const MDOTS = SEGS.map((seg, k) => {
    const r = L.rng(L.hash(ID, 'mdots', k));
    const out = [];
    for (const pr of PAIRS[k]) {
      const side = pr.side;
      const y0 = pr.a[0][1], y1 = pr.a[pr.a.length - 1][1];
      for (const off of MUSCLE_OFF) {
        for (let y = y0; y <= y1; y += r.range(2.4, 3.8)) {
          const x = AX + side * (hw(y) - off);
          out.push({ side, x: x + r.range(-1.2, 1.2), y: y + r.range(-1.2, 1.2), r: r.range(1.4, 2.4), fade: r.range(0.3, 1), seed: (r() * 1e6) | 0 });
        }
      }
      // striation dots between the two lines of the pair
      for (let y = y0 + 2; y <= y1 - 2; y += 5) {
        if (r() < 0.6) out.push({ side, x: AX + side * (hw(y) - 20) + r.range(-1.5, 1.5), y: y + r.range(-1, 1), r: r.range(1.4, 2.0), fade: r.range(0.2, 0.8), seed: (r() * 1e6) | 0 });
      }
    }
    return out;
  });

  // leaf matter packed in the larval gut: about 650 stipple dots (0.012 per px2) and 40 short fragments, laid
  // in screen space inside the wide peristaltic tube, so a narrowing wall culls them rather than scaling them.
  // Built on first use because the gut model is declared further down.
  let LEAF = null;
  function leafMatter() {
    if (LEAF) return LEAF;
    const G = gutModel(0);
    const r = L.rng(L.hash(ID, 'leaf'));
    const dots = [], frags = [];
    for (let i = 0; i < 4000 && dots.length < 650; i++) {
      const x = r.range(AX - 70, AX + 70), y = r.range(GUT_Y0 + 2, GUT_Y1 - 2);
      if (Math.abs(x - G.cx(y)) > G.half * G.prof(y) - 3) continue;
      dots.push({ x, y, r: r.range(1.0, 2.0), s: (r() * 1e6) | 0 });
    }
    for (let i = 0; i < 400 && frags.length < 40; i++) {
      const x = r.range(AX - 60, AX + 60), y = r.range(GUT_Y0 + 8, GUT_Y1 - 8);
      const len = r.range(4, 8), a = r() * TAU;
      const dx = (Math.cos(a) * len) / 2, dy = (Math.sin(a) * len) / 2;
      const inside = (px, py) => Math.abs(px - G.cx(py)) < G.half * G.prof(py) - 4;
      if (!inside(x - dx, y - dy) || !inside(x + dx, y + dy)) continue;
      frags.push({ x, y, dx, dy, bend: r.range(-1.5, 1.5) });
    }
    LEAF = { dots, frags };
    return LEAF;
  }

  // tissue stipple (fat body) weighted to the dorsal right side and the abdomen
  const TISSUE = (function () {
    const r = L.rng(L.hash(ID, 'tissue'));
    const out = [];
    for (let i = 0; i < 1400 && out.length < 520; i++) {
      const y = r.range(340, 900);
      const h = hw(y) - 10;
      if (h <= 4) continue;
      const u = r.range(-1, 1);
      const x = AX + u * h;
      const w = 0.25 + 0.55 * L.smoothstep(-0.4, 1, u) * (1 - L.smoothstep(600, 900, y)) + 0.35 * Math.pow(Math.abs(u), 3);
      if (r() > w) continue;
      out.push([x, y, r.range(0.8, 1.5)]);
    }
    return out;
  })();

  // wing pad: the G3 wing-case line and the ventral wall below it
  const WINGLINE = L.smoothPts([[430, 560], [446, 660], [470, 760], [508, 836], [560, 890]], false, 6);
  const WINGPAD = (function () {
    const out = WINGLINE.slice();
    for (let y = 896; y >= 560; y -= 8) out.push([AX - hw(y) + 4, y]);
    return out;
  })();
  const WING_BASE = [431, 588];
  const WING_VEINS = (function () {
    const ts = [0.2, 0.36, 0.52, 0.67, 0.8, 0.92];
    return ts.map((u, i) => {
      const k = Math.min(WINGLINE.length - 1, Math.round(u * (WINGLINE.length - 1)));
      const e = WINGLINE[k];
      const tx = e[0] - 5, ty = e[1] - 4;
      const mx = L.lerp(WING_BASE[0], tx, 0.5) - 6 - i, my = L.lerp(WING_BASE[1], ty, 0.5) + 4;
      return L.smoothPts([WING_BASE, [mx, my], [tx, ty]], false, 6);
    });
  })();

  // Appendage sheaths on the left front: the antenna, three legs and the proboscis lie side by side along the
  // inner edge of the wing case, fanning up from the head beside the eye. Each is a pair of lines offset from
  // the G3 wing-case line by d, closed at a tapered tip.
  function sheath(d, yTop, yBase, halfW) {
    const src = WINGLINE.filter((q) => q[1] >= yTop - 3 && q[1] <= yBase + 3);
    const mid = [];
    for (let i = src.length - 1; i >= 0; i--) {
      const a = src[Math.max(0, i - 1)], b = src[Math.min(src.length - 1, i + 1)];
      const tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      mid.push([src[i][0] + (ty / tl) * d, src[i][1] - (tx / tl) * d]);
    }
    const n = mid.length;
    const side = (sgn) => mid.map((q, i) => {
      const a = mid[Math.max(0, i - 1)], b = mid[Math.min(n - 1, i + 1)];
      const tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      const w = halfW * (0.3 + 0.7 * L.smoothstep(n - 1, n - 5, i)) * (0.8 + 0.2 * L.smoothstep(0, 3, i));
      return [q[0] - (ty / tl) * w * sgn, q[1] + (tx / tl) * w * sgn];
    });
    return { mid, a: side(1), b: side(-1) };
  }
  const ANTENNA = sheath(21, 722, 846, 2);
  const LEGS = [sheath(31, 800, 850, 2.6), sheath(40, 760, 852, 2.6), sheath(49, 722, 852, 2.5)];
  const PROBOSCIS = sheath(58, 706, 856, 1.5);

  // primordium ignite points and their nodes
  const NODE_R = 55;
  const NODES = [
    { key: 'eye', origin: [520, 872], y: 1040, ctrl: 390, bar: 5 },
    { key: 'antenna', origin: null, y: 1190, ctrl: 315, bar: 4 },
    { key: 'leg', origin: null, y: 1340, ctrl: 240, bar: 6 },
    { key: 'wing', origin: [448, 672], y: 1490, ctrl: 165, bar: 12 },
  ];
  NODES[1].origin = ANTENNA.mid[Math.round((ANTENNA.mid.length - 1) * 0.28)].slice();
  NODES[2].origin = LEGS[2].mid[Math.round((LEGS[2].mid.length - 1) * 0.62)].slice();
  for (const n of NODES) {
    n.path = cubic(n.origin, [n.ctrl, n.origin[1]], [n.ctrl, n.y], [AX - NODE_R - 8, n.y], 90);
  }

  // ---------------------------------------------------------------------------
  // Layers
  // ---------------------------------------------------------------------------

  function drawBackdrop(ctx, tt, dur) {
    L.blueprint(ctx, { center: [540, 860], seed: 707 });
    // guide circle, radius 430 around the chrysalis, 48 ticks, turning 4 degrees across the shot
    const rot = -Math.PI / 2 + ((4 * Math.PI) / 180) * (tt / dur);
    L.guideCircle(ctx, 540, 610, 430, { alpha: 0.17, width: 1.5 });
    L.guideCircle(ctx, 540, 610, 452, { alpha: 0.08, width: 1, dash: [2, 9] });
    L.ticks(ctx, 540, 610, { r: 430, n: 48, len: 10, major: 12, majorLen: 24, rot, color: C.lav, alpha: 0.45, width: 1.4, inward: true });
    L.ticks(ctx, 540, 610, { r: 430, n: 240, len: 4, rot, color: C.lav, alpha: 0.18, width: 1 });
    L.guideCircle(ctx, 540, 610, 6, { alpha: 0.3, cross: 16, width: 1 });
    // centre axis and construction lines
    sline(ctx, [[540, 190], [540, 1580]], { alpha: 0.1, dash: [10, 8], amp: 0 });
    for (const y of [332, 515, 600, 905]) sline(ctx, [[96, y], [984, y]], { alpha: 0.07, width: 1, amp: 0, dash: [2, 6] });
    // cross-section ellipses give the case volume
    for (const y of [440, 600, 760]) {
      const h = hw(y);
      sline(ctx, L.ellipsePts(540, y, h, h * 0.17, 56), { closed: true, alpha: 0.14, dash: [3, 5], amp: 0.3, seed: y });
    }
    // the node column's own dial, turning against the upper circle
    const rot2 = -Math.PI / 2 - ((4 * Math.PI) / 180) * (tt / dur);
    L.guideCircle(ctx, 540, 1265, 360, { alpha: 0.15, width: 1.5 });
    L.ticks(ctx, 540, 1265, { r: 360, n: 48, len: 10, major: 12, majorLen: 20, rot: rot2, color: C.lav, alpha: 0.35, width: 1.4, inward: true });
  }

  function drawTwig(ctx) {
    const gap = (y) => {
      const dy = Math.abs(y - 300);
      if (dy >= 72) return null;
      const dx = Math.sqrt(72 * 72 - dy * dy);
      return [900 - dx, 900 + dx];
    };
    for (const [y, a] of [[235, 0.62], [300, 0.7]]) {
      const g = gap(y);
      if (g) {
        sline(ctx, [[-10, y], [g[0], y]], { alpha: a, width: 1.6, seed: SEED + y, amp: 0.7 });
        sline(ctx, [[g[1], y], [1090, y]], { alpha: a, width: 1.6, seed: SEED + y + 1, amp: 0.7 });
      } else sline(ctx, [[-10, y], [1090, y]], { alpha: a, width: 1.6, seed: SEED + y, amp: 0.7 });
    }
    // bark grain: lengthwise dashes between the two lines
    const r = L.rng(L.hash(ID, 'bark'));
    const p = new Path2D();
    for (let i = 0; i < 70; i++) {
      const y = r.range(244, 292);
      const x = r.range(-20, 1080);
      const len = r.range(20, 90);
      if (x + len > 826 && x < 974) continue;
      p.moveTo(x, y);
      p.quadraticCurveTo(x + len / 2, y + r.range(-2, 2), x + len, y + r.range(-1.5, 1.5));
    }
    ctx.save();
    ctx.strokeStyle = C.lav;
    ctx.globalAlpha = 0.16;
    ctx.lineWidth = 1;
    ctx.stroke(p);
    ctx.restore();
    for (const [x, y, rx, ry] of [[236, 266, 20, 10], [772, 262, 15, 8]]) {
      sline(ctx, L.ellipsePts(x, y, rx, ry, 28), { closed: true, alpha: 0.3, seed: x });
      sline(ctx, L.ellipsePts(x, y, rx * 0.45, ry * 0.4, 18), { closed: true, alpha: 0.22, seed: x + 3 });
    }
    // silk pad: a small scribbled circle
    const sr = L.rng(L.hash(ID, 'silk'));
    const pts = [];
    // a looping pen scribble travelling round a ring (a trochoid with jitter), flattened under the twig
    for (let i = 0; i <= 150; i++) {
      const a = (i / 100) * TAU + 0.4;
      const R = 19 + 3 * L.noise1(i * 0.07, 44);
      const r = 6.5 + 2 * L.noise1(i * 0.11, 45);
      pts.push([540 + Math.cos(a) * R + Math.cos(a * 7.3) * r + sr.range(-0.8, 0.8), 308 + (Math.sin(a) * R + Math.sin(a * 7.3) * r) * 0.55 + sr.range(-0.8, 0.8)]);
    }
    sline(ctx, pts, { color: C.white, alpha: 0.42, width: 1, amp: 0.8, seed: SEED + 91 });
    // cremaster: a short double stalk with hooks into the silk
    sline(ctx, [[535, 332], [536, 302]], { color: C.white, alpha: 0.75, width: 1.5, amp: 0.3, seed: SEED + 92 });
    sline(ctx, [[545, 332], [544, 302]], { color: C.white, alpha: 0.75, width: 1.5, amp: 0.3, seed: SEED + 93 });
    for (let i = 0; i < 5; i++) {
      const x = 531 + i * 4.5;
      const dir = i < 2 ? -1 : i > 2 ? 1 : 0;
      sline(ctx, [[x, 303], [x + dir * 3, 296], [x + dir * 7, 295], [x + dir * 8, 299]], { color: C.white, alpha: 0.5, width: 1, amp: 0 });
    }
  }

  // fat-body clusters on the dorsal side: small lobes packed with stipple
  const FAT = (function () {
    const at = [[618, 497], [621, 541], [612, 583], [643, 591], [652, 636], [648, 694], [612, 779], [633, 806], [611, 830], [589, 853], [566, 588], [655, 663]];
    return at.map(([x, y], i) => {
      const r = L.rng(L.hash(ID, 'fat', i));
      const R = r.range(5.5, 6.5);
      const n = r.int(8, 12);
      const ds = [];
      for (let k = 0; k < n; k++) {
        const a = (k / n) * TAU + r.range(-0.3, 0.3);
        const rad = k === 0 ? 0 : Math.sqrt(r.range(0.15, 1)) * (R - 1.8);
        ds.push([x + Math.cos(a) * rad, y + Math.sin(a) * rad, r.range(1.0, 1.6)]);
      }
      return { x, y, R, ds, seed: (r() * 1e6) | 0 };
    });
  })();

  function drawTissue(ctx, tq) {
    // tissue cells fill the case around the gut, and spread into the space the gut gives up as it narrows
    const gut = gutModel(tq).shape;
    L.hexLattice(ctx, [OUTER, gut], { r: 15, alpha: 0.24, width: 1, seed: SEED + 5, jitter: 1.4 });
    dots(ctx, TISSUE, C.lav, 0.28);
    // cellular soup of the thorax and head: 0.004 dots per px2 on the ventral wall rising to 0.014 on the
    // dorsal half, seeded once and shimmering up to 0.7 px on each boil drawing
    L.stipple(ctx, [INNER, gut], {
      spacing: 9, r: [1.0, 1.8], color: C.lav, alpha: 0.35, seed: SEED + 40, boilAmp: 0.7,
      density: (x, y) => {
        if (y < 560 || y > 880) return 0;
        const fall = L.smoothstep(560, 580, y) * (1 - L.smoothstep(866, 880, y));
        return fall * L.lerp(0.286, 1, L.clamp((x - (AX - hw(y))) / hw(y)));
      },
    });
    // fat-body lobes
    const lobes = new Path2D();
    const fill = new Path2D();
    const bi = boilNow();
    for (const f of FAT) {
      const pts = [];
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * TAU;
        const rr = f.R * (1 + 0.12 * L.noise1(k * 0.9 + bi * 0.37, f.seed & 1023));
        pts.push([f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr]);
      }
      L.tracePath(lobes, pts, true);
      for (const d of f.ds) {
        fill.moveTo(d[0] + d[2], d[1]);
        fill.arc(d[0], d[1], d[2], 0, TAU);
      }
    }
    ctx.save();
    ctx.strokeStyle = C.lav;
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = 1;
    ctx.stroke(lobes);
    ctx.fillStyle = C.lav;
    ctx.globalAlpha = 0.62;
    ctx.fill(fill);
    ctx.restore();
    // cuticle: a stippled band just inside the case wall, denser toward the lower right
    L.stipple(ctx, OUTER, {
      spacing: 4.2, r: [0.7, 1.3], color: C.lav, alpha: 0.5, seed: SEED + 6,
      density: (x, y) => {
        const h = hw(y);
        if (h < 1) return 0;
        const edge = 1 - L.clamp((h - Math.abs(x - AX)) / 16);
        const side = 0.45 + 0.55 * L.smoothstep(-40, 110, (x - AX) + (y - 620) * 0.35);
        return edge * edge * side;
      },
    });
  }

  // segment rings of the body wall, drawn under the gut so the tube reads in front of them
  function drawRings(ctx) {
    for (let k = 0; k <= 6; k++) {
      const y = 350 + k * 35;
      const h = hw(y) - 2;
      const pts = [];
      for (let x = AX - h; x <= AX + h + 0.01; x += 8) pts.push([x, bowY(y, x, 5)]);
      sline(ctx, pts, { alpha: 0.24, width: 1.4, seed: SEED + 300 + k, amp: 0.5 });
    }
  }

  function drawSegments(ctx, tq, tt) {
    // spiracles on the side of the body, part way between the dorsal and ventral edges: each sits in the
    // clear lane between the larval gut wall and the dorsal muscle pair, forward in its segment
    const larvalGut = gutModel(0);
    for (let k = 0; k < 6; k++) {
      const y = SEGS[k].y0 + SPIRACLE_DY[k];
      const gutEdge = y > GUT_Y0 ? larvalGut.half * larvalGut.prof(y) : 20;
      const x = AX + (gutEdge + hw(y) - MUSCLE_OFF[1]) / 2;
      sline(ctx, L.ellipsePts(x, y, 2.5, 1.5, 12), { closed: true, alpha: 0.45, width: 1.2, amp: 0 });
      dots(ctx, [[x, y, 0.8]], C.lav, 0.45);
    }
    const frame = Math.floor(tt * 24 + 1e-3);
    for (let k = 0; k < 6; k++) {
      const seg = SEGS[k];
      const broken = tq + 1e-6 >= seg.tBreak;
      if (!broken) {
        // each lengthwise pair is a band: a pale fill between two bright edges, cross-striated
        const band = new Path2D();
        const p = new Path2D();
        for (const pr of PAIRS[k]) {
          L.tracePath(band, pr.a.concat(pr.b.slice().reverse()), true);
          sline(ctx, pr.a, { color: C.white, alpha: 0.7, width: 2, seed: SEED + 400 + k * 4 + (pr.side + 1), amp: 0.35 });
          sline(ctx, pr.b, { color: C.white, alpha: 0.7, width: 2, seed: SEED + 401 + k * 4 + (pr.side + 1), amp: 0.35 });
          // five short striation ticks between the two lines
          const ya = pr.a[0][1], yb = pr.a[pr.a.length - 1][1];
          const nT = Math.max(1, Math.round((5 * (yb - ya)) / 29));
          for (let j = 1; j <= nT; j++) {
            const y = ya + ((yb - ya) * j) / (nT + 1);
            const xa = AX + pr.side * (hw(y) - MUSCLE_OFF[0]), xb = AX + pr.side * (hw(y) - MUSCLE_OFF[1]);
            p.moveTo(xa, y - 0.6);
            p.lineTo(xb, y + 0.6);
          }
        }
        ctx.save();
        ctx.fillStyle = C.white;
        ctx.globalAlpha = 0.15;
        ctx.fill(band);
        ctx.strokeStyle = C.white;
        ctx.globalAlpha = 0.55;
        ctx.lineWidth = 1.1;
        ctx.stroke(p);
        ctx.restore();
        continue;
      }
      // broken: each rail crumbles into a cloud that drifts inward on a noise flow field, on twos,
      // stopping short of the gut wall
      const bt = seg.tBreak;
      const steps = Math.max(0, Math.round((tq - bt) * 12));
      const list = [];
      const age = tq - bt;
      const G = gutModel(tq);
      for (const d of MDOTS[k]) {
        let x = d.x, y = d.y;
        for (let s = 0; s < steps; s++) {
          const a = L.noise2(x * 0.012, y * 0.012 + s * 0.05, SEED + 17) * Math.PI * 1.5 + Math.PI * 0.5;
          const sp = 2 * (1.9 + 1.0 * L.noise2(x * 0.03 + 9.1, y * 0.03, d.seed & 1023));
          x += Math.cos(a) * sp * 0.8;
          y += Math.sin(a) * sp * 0.6;
          x -= d.side * 2.5;
          if (y < 342) y = 342;
          const h = hw(y) - 10;
          if (x > AX + h) x = AX + h;
          if (x < AX - h) x = AX - h;
          const c = y > GUT_Y0 && y < GUT_Y1 ? G.cx(y) : AX;
          const lim = y > GUT_Y0 && y < GUT_Y1 ? G.half * G.prof(y) + 6 : 6;
          if (d.side * (x - c) < lim) x = c + d.side * Math.min(lim, h);
        }
        const a = 1 - (1 - d.fade) * L.clamp(age / 1.0);
        list.push([x, y, d.r * (0.8 + 0.2 * a)]);
      }
      dots(ctx, list, C.white, L.lerp(0.9, 0.35, L.clamp(age / Math.max(1e-3, 0.75 - bt))));
      // magenta flicker along each lengthwise pair as it breaks (4 frames, 2 for the last drawing so 12.0 is clean)
      const fb = frame - seg.fBreak;
      const FL = [1, 0.3, 0.8, 0.3];
      if (fb >= 0 && fb < flickerFrames(seg)) {
        const r = L.rng(L.hash(ID, 'crack', k, fb));
        for (const pr of PAIRS[k]) {
          for (const line of [pr.a, pr.b]) {
            // cracked: the line is drawn in dashes with random gaps
            let i = 0;
            while (i < line.length - 1) {
              const n = r.int(2, 4);
              const piece = line.slice(i, Math.min(line.length, i + n + 1));
              sline(ctx, piece, { color: C.mag, alpha: FL[fb], width: 2.4, amp: 0.8, seed: SEED + 500 + i });
              i += n + r.int(1, 2);
            }
          }
          const mid = pr.b[Math.floor(pr.b.length / 2)] || [AX, seg.ym];
          if (pr.b.length < 6) continue;
          L.glowDot(ctx, mid[0] - pr.side * 4, mid[1] + (r() - 0.5) * 12, 4.5, { color: C.mag, core: '#ffd0e6', rays: 0, glow: 6, intensity: FL[fb] * 0.8, seed: SEED + k * 2 + pr.side });
        }
      }
    }
  }

  function gutHalf(tq) {
    const e = L.ease.inOutCubic(L.clamp((tq - TM.gut) / 0.25));
    return L.lerp(60, 20, e);
  }

  // the gut tube: a wide larval midgut that rebuilds as a narrow nectar tube with a crop in the front of
  // the abdomen, passing ventral of the flight muscles through the thorax
  const GUT_Y0 = 380, GUT_Y1 = 860;
  // constrictions of the larval gut wall; -1 at each constriction, +1 midway between
  const PERI_Y = [355, 450, 545, 640, 735, 815, 895];
  function peri(y) {
    let i = 0;
    while (i < PERI_Y.length - 2 && y > PERI_Y[i + 1]) i++;
    const ph = (y - PERI_Y[i]) / (PERI_Y[i + 1] - PERI_Y[i]);
    return -Math.cos(TAU * L.clamp(ph));
  }
  function gutModel(tq) {
    const half = gutHalf(tq);
    const nar = 1 - (half - 20) / 40;
    const cap = Math.min(40, half * 1.3);
    const prof = (y) => {
      let k = 1;
      if (y < GUT_Y0 + cap) k = Math.sqrt(Math.max(0, 1 - Math.pow((GUT_Y0 + cap - y) / cap, 2)));
      if (y > GUT_Y1 - cap) k = Math.sqrt(Math.max(0, 1 - Math.pow((y - (GUT_Y1 - cap)) / cap, 2)));
      const bulb = 1 + 0.45 * nar * Math.exp(-Math.pow((y - 574) / 22, 2));
      // peristaltic profile of the feeding gut, smoothing out as the tube narrows
      return k * bulb * (1 + 0.12 * (1 - nar) * peri(y)) * (1 + 0.035 * nar * Math.sin((y - GUT_Y0) * 0.045));
    };
    const cx = (y) => AX - 16 * nar * L.smoothstep(582, 630, y) * (1 - L.smoothstep(790, 850, y));
    const shape = [];
    const left = [];
    for (let y = GUT_Y0; y <= GUT_Y1; y += 6) {
      const w = half * prof(y), c = cx(y);
      shape.push([c + w, y]);
      left.push([c - w, y]);
    }
    return { half, nar, prof, cx, shape: shape.concat(left.reverse()) };
  }

  function drawGut(ctx, tq) {
    const G = gutModel(tq);
    const { half, prof, cx, shape } = G;
    const y0 = GUT_Y0, y1 = GUT_Y1;
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, shape, true);
    ctx.fillStyle = C.navy;
    ctx.globalAlpha = 0.2;
    ctx.fill();
    ctx.restore();
    // leaf matter: stipple and short fragments; whatever falls outside the narrowing wall is squeezed out
    const leaf = leafMatter();
    const bi = boilNow();
    const inside = (x, y, m) => y > y0 + 1 && y < y1 - 1 && Math.abs(x - cx(y)) < half * prof(y) - m;
    const list = [];
    for (let i = 0; i < leaf.dots.length; i++) {
      const d = leaf.dots[i];
      if (!inside(d.x, d.y, 3)) continue;
      list.push([d.x + (L.h3(i, bi, 7) - 0.5) * 0.7, d.y + (L.h3(bi, i, 8) - 0.5) * 0.7, d.r]);
    }
    dots(ctx, list, C.lav, 0.45 - 0.12 * G.nar);
    const fp = new Path2D();
    for (let i = 0; i < leaf.frags.length; i++) {
      const f = leaf.frags[i];
      if (!inside(f.x - f.dx, f.y - f.dy, 3) || !inside(f.x + f.dx, f.y + f.dy, 3)) continue;
      const jx = (L.h3(i, bi, 9) - 0.5) * 0.6, jy = (L.h3(bi, i, 10) - 0.5) * 0.6;
      fp.moveTo(f.x - f.dx + jx, f.y - f.dy + jy);
      fp.quadraticCurveTo(f.x - f.dy * 0.2 * f.bend + jx, f.y + f.dx * 0.2 * f.bend + jy, f.x + f.dx + jx, f.y + f.dy + jy);
    }
    ctx.save();
    ctx.strokeStyle = C.lav;
    ctx.globalAlpha = 0.35 - 0.1 * G.nar;
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.stroke(fp);
    ctx.restore();
    // epithelium: a row of rectangular cells just inside each wall
    const depth = L.lerp(8, 5, G.nar);
    const cellP = new Path2D();
    for (const sgn of [-1, 1]) {
      const inner = [];
      for (let y = y0 + 12; y <= y1 - 12; y += 4) {
        const w = half * prof(y) - depth;
        if (w < 2) continue;
        inner.push([cx(y) + sgn * w, y]);
      }
      sline(ctx, inner, { alpha: 0.3, width: 1, seed: SEED + 601 + (sgn + 1) / 2 });
      for (let y = y0 + 14; y <= y1 - 14; y += 8) {
        const w = half * prof(y);
        if (w - depth < 2) continue;
        cellP.moveTo(cx(y) + sgn * (w - 1), y);
        cellP.lineTo(cx(y) + sgn * (w - depth), y);
      }
    }
    ctx.save();
    ctx.strokeStyle = C.lav;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1;
    ctx.stroke(cellP);
    ctx.restore();
    sline(ctx, shape, { closed: true, alpha: 0.66, width: 1.6, seed: SEED + 600, amp: 0.5 });
  }

  function drawNerveCord(ctx, tq, tt) {
    const top = cordTop(tq);
    const beads = [];
    for (let i = 0; i < 12; i++) {
      const y = L.lerp(top, 860, i / 11);
      const x = 470 + Math.max(0, (y - 790) / 70) * 8;
      beads.push([x, y]);
    }
    const keep = L.clamp((tt - TM.gut) / 0.3);
    const squeeze = top > 500 ? 0.8 : 1;
    const beadR = (i) => [(i === 11 ? 11 : 6.2) * squeeze, (i === 11 ? 9.5 : 7.8) * squeeze];
    // ghost of the larval cord: once it shortens, its old beads stay behind as dashed outlines
    if (top > 421) {
      const gp = new Path2D();
      for (const b of CORD_REST) {
        gp.moveTo(b[0] + 6.2, b[1]);
        gp.ellipse(b[0], b[1], 6.2, 7.8, 0, 0, TAU);
      }
      for (let i = 0; i < CORD_REST.length - 1; i++) {
        gp.moveTo(CORD_REST[i][0], CORD_REST[i][1] + 7.8);
        gp.lineTo(CORD_REST[i + 1][0], CORD_REST[i + 1][1] - 7.8);
      }
      ctx.save();
      ctx.strokeStyle = C.lav;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 1.3;
      ctx.setLineDash([2, 3]);
      ctx.stroke(gp);
      ctx.restore();
    }
    // engraver's knock-out: a navy gap round the cord breaks every line it crosses
    {
      const kp = new Path2D();
      for (const off of [-2.6, 2.6]) {
        kp.moveTo(beads[0][0] + off, beads[0][1]);
        for (let i = 1; i < 12; i++) kp.lineTo(beads[i][0] + off, beads[i][1]);
      }
      const kf = new Path2D();
      for (let i = 0; i < 12; i++) {
        const [rx, ry] = beadR(i);
        kp.moveTo(beads[i][0] + rx + 2, beads[i][1]);
        kp.ellipse(beads[i][0], beads[i][1], rx + 2, ry + 2, 0, 0, TAU);
        kf.moveTo(beads[i][0] + rx + 2, beads[i][1]);
        kf.ellipse(beads[i][0], beads[i][1], rx + 2, ry + 2, 0, 0, TAU);
      }
      ctx.save();
      ctx.strokeStyle = C.navy;
      ctx.fillStyle = C.navy;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 4.5;
      ctx.lineJoin = 'round';
      ctx.stroke(kp);
      ctx.fill(kf);
      ctx.restore();
    }
    // paired connectives
    for (const off of [-2.6, 2.6]) {
      sline(ctx, beads.map((b) => [b[0] + off, b[1]]), { color: C.white, alpha: 0.5, width: 1, seed: SEED + 700 + off * 10, amp: 0.3 });
    }
    // lateral nerves
    const p = new Path2D();
    for (let i = 0; i < 12; i++) {
      const [x, y] = beads[i];
      p.moveTo(x - 6, y);
      p.quadraticCurveTo(x - 12, y + 2, x - 16, y + 6);
      p.moveTo(x + 6, y);
      p.quadraticCurveTo(x + 16, y - 1, x + 24 + (i % 3) * 4, y + 5);
    }
    ctx.save();
    ctx.strokeStyle = C.white;
    ctx.globalAlpha = 0.24;
    ctx.lineWidth = 1;
    ctx.stroke(p);
    ctx.restore();
    // ganglia
    for (let i = 0; i < 12; i++) {
      const [x, y] = beads[i];
      const [rx, ry] = beadR(i);
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
      ctx.fillStyle = C.white;
      ctx.globalAlpha = 0.18 + 0.1 * keep;
      ctx.fill();
      ctx.restore();
      sline(ctx, L.ellipsePts(x, y, rx, ry, 16), { closed: true, color: C.white, alpha: 0.85, width: 1.3, seed: SEED + 720 + i, amp: 0.25 });
    }
    if (keep > 0) L.glowDot(ctx, beads[11][0], beads[11][1], 6, { rays: 0, glow: 6, intensity: 0.35 * keep, seed: SEED + 731 });
  }

  function drawWingPad(ctx, tq, tt) {
    const lit = L.clamp((tt - TM.ignite[3]) / 0.12);
    const pulse = wingPulse(tq);
    // wing disc cells and scale-forming stipple
    L.hexLattice(ctx, WINGPAD, { r: 8, alpha: Math.min(0.25, 0.14 + 0.11 * lit), width: 0.9, color: lit > 0 ? C.white : C.lav, seed: SEED + 803, jitter: 0.7 });
    L.stipple(ctx, WINGPAD, { spacing: 9, density: 0.45, color: C.lav, alpha: 0.25 + 0.2 * lit, r: [0.8, 1.3], seed: SEED + 800 });
    sline(ctx, WINGPAD, { closed: true, alpha: 0.18 + 0.2 * lit, width: 1, seed: SEED + 804, amp: 0.4 });
    sline(ctx, WINGLINE, { alpha: 0.85, width: 1.9, seed: SEED + 801, amp: 0.5 });
    sline(ctx, WINGLINE.map((p) => [p[0] - 6, p[1] + 3]), { alpha: 0.3, width: 1, seed: SEED + 802, amp: 0.5 });
    const k = 1 + 0.06 * pulse;
    for (let i = 0; i < WING_VEINS.length; i++) {
      const v = WING_VEINS[i].map((p) => [WING_BASE[0] + (p[0] - WING_BASE[0]) * k, WING_BASE[1] + (p[1] - WING_BASE[1]) * k]);
      sline(ctx, v, { color: lit > 0 ? C.white : C.lav, alpha: (0.35 + 0.4 * lit) * L.lerp(0.55, 1, lit), width: 1.1 + 0.3 * lit, seed: SEED + 810 + i, amp: 0.4 });
    }
    // cross-veins closing the discal cell
    const a = WING_VEINS[1], b = WING_VEINS[3];
    const ia = Math.floor(a.length * 0.45), ib = Math.floor(b.length * 0.4);
    sline(ctx, [a[ia], b[ib]], { color: lit > 0 ? C.white : C.lav, alpha: (0.3 + 0.3 * lit) * L.lerp(0.55, 1, lit), width: 1, amp: 0.3, seed: SEED + 820 });
    dots(ctx, [[WING_BASE[0], WING_BASE[1], 2.6]], lit > 0 ? C.white : C.lav, 0.7);
  }

  function drawSheath(ctx, sh, o) {
    sline(ctx, sh.a, { color: o.color, alpha: o.alpha, width: o.width || 1.1, seed: o.seed, amp: 0.3, dash: o.dash });
    sline(ctx, sh.b, { color: o.color, alpha: o.alpha, width: o.width || 1.1, seed: o.seed + 1, amp: 0.3, dash: o.dash });
    const n = sh.mid.length - 1;
    const ta = sh.a[n], tb = sh.b[n], tm = sh.mid[n], tq = sh.mid[n - 1];
    const ex = tm[0] + (tm[0] - tq[0]) * 0.5, ey = tm[1] + (tm[1] - tq[1]) * 0.5;
    sline(ctx, [ta, [ex, ey], tb], { color: o.color, alpha: o.alpha, width: o.width || 1.1, amp: 0 });
    if (!o.marks || !o.marks.length) return;
    const p = new Path2D();
    for (const f of o.marks) {
      const j = Math.round(f * n);
      p.moveTo(sh.a[j][0], sh.a[j][1]);
      p.lineTo(sh.b[j][0], sh.b[j][1]);
    }
    ctx.save();
    ctx.strokeStyle = o.color;
    ctx.globalAlpha = o.alpha * (o.markAlpha || 0.8);
    ctx.lineWidth = 1;
    ctx.stroke(p);
    ctx.restore();
  }

  function drawPrimordia(ctx, tt) {
    const litA = L.clamp((tt - TM.ignite[1]) / 0.12);
    const litL = L.clamp((tt - TM.ignite[2]) / 0.12);
    const litE = L.clamp((tt - TM.ignite[0]) / 0.12);
    // sheaths stay at 55 percent until their own primordium ignites; the proboscis has no node and stays low
    const dimL = L.lerp(0.55, 1, litL), dimA = L.lerp(0.55, 1, litA);
    // proboscis: the two galeae as a narrow dashed pair
    drawSheath(ctx, PROBOSCIS, { color: C.lav, alpha: 0.4 * 0.55, width: 1, seed: SEED + 930, dash: [5, 3] });
    // legs: coxa, femur, tibia and tarsus joints as cross marks, with a claw at the tip
    for (let j = 0; j < 3; j++) {
      const col = litL ? C.white : C.lav;
      drawSheath(ctx, LEGS[j], { color: col, alpha: (0.5 + 0.35 * litL) * dimL, width: 1.15, seed: SEED + 910 + j * 2, marks: [0.18, 0.46, 0.72, 0.84, 0.92] });
      const m = LEGS[j].mid, n = m.length - 1;
      const tx = m[n][0] - m[n - 1][0], ty = m[n][1] - m[n - 1][1];
      const tl = Math.hypot(tx, ty) || 1;
      const ux = tx / tl, uy = ty / tl;
      const c0 = [m[n][0] + ux * 3, m[n][1] + uy * 3];
      sline(ctx, [c0, [c0[0] + ux * 3 + uy * 3, c0[1] + uy * 3 - ux * 3]], { color: col, alpha: (0.5 + 0.35 * litL) * dimL, width: 1, amp: 0 });
    }
    // antenna: annulated, swelling into a club at the tip
    const colA = litA ? C.white : C.lav;
    const ann = [];
    for (let f = 0.1; f < 0.8; f += 0.07) ann.push(f);
    drawSheath(ctx, ANTENNA, { color: colA, alpha: (0.55 + 0.35 * litA) * dimA, width: 1.2, seed: SEED + 900, marks: ann, markAlpha: 0.6 });
    const am = ANTENNA.mid, an = am.length - 1;
    const tip = am[an - 2], pre = am[an - 5];
    sline(ctx, L.ellipsePts(tip[0], tip[1], 3.6, 10, 16, Math.atan2(tip[1] - pre[1], tip[0] - pre[0]) - Math.PI / 2), { closed: true, color: colA, alpha: (0.65 + 0.3 * litA) * dimA, width: 1.2, amp: 0 });
    // compound eye patch, 60 px, hex lattice
    const eye = L.ellipsePts(520, 870, 30, 30, 36);
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, INNER, true);
    ctx.clip();
    ctx.beginPath();
    L.tracePath(ctx, eye, true);
    ctx.fillStyle = C.navy;
    ctx.globalAlpha = 0.5;
    ctx.fill();
    L.hexLattice(ctx, eye, { r: 6.5, alpha: 0.38 + 0.2 * litE, width: 1, color: litE ? C.white : C.lav, seed: SEED + 940, jitter: 0.5 });
    sline(ctx, eye, { closed: true, alpha: 0.6 + 0.3 * litE, width: 1.4, seed: SEED + 941, amp: 0.3, color: litE ? C.white : C.lav });
    ctx.restore();
  }

  // 30 near-straight striated fibres in 5 bundles of 6: the dorsal longitudinal flight muscles
  const FIB = { y0: 606, y1: 754, x0: 548, s: 2.7, gap: 4, taper: 10 };
  const FIBRES = (function () {
    const out = [];
    for (let j = 0; j < 5; j++) {
      const bw = 5 * FIB.s;
      const bx = FIB.x0 + j * (bw + FIB.gap);
      const xc = bx + bw / 2;
      for (let k = 0; k < 6; k++) {
        const r = L.rng(L.hash(ID, 'fibre', j, k));
        out.push({ j, k, x: bx + k * FIB.s, xc, lean: r.range(-0.5, 0.5), seed: (r() * 1e6) | 0, y0: FIB.y0 + r.range(0, 2), y1: FIB.y1 - r.range(0, 2) });
      }
    }
    return out;
  })();
  // myonuclei, two per bundle at staggered heights
  const MYO_NUC = [0, 1, 2, 3, 4].map((j) => (j % 2 ? [652 + j * 3, 712 + j * 2] : [632 + j * 4, 694 + j * 3]));
  const fibreX = (f, y) => {
    const s = (y - f.y0) / (f.y1 - f.y0);
    let x = f.x + f.lean * Math.sin(Math.PI * s) + 0.35 * L.noise1(y * 0.05, f.seed & 1023);
    // taper toward the bundle's tendon only in the last 10 px at each end
    const dEnd = Math.min(y - f.y0, f.y1 - y);
    if (dEnd < FIB.taper) {
      const u = 1 - dEnd / FIB.taper;
      x = L.lerp(x, f.xc, 0.12 * u * u);
    }
    return x;
  };

  // myoblasts waiting in the empty zone: they drift on twos toward the fibre lines and vanish as fibres grow over them
  const ZONE_MYO = (function () {
    const r = L.rng(L.hash(ID, 'zonemyo'));
    const out = [];
    for (let i = 0; i < 16; i++) {
      const f = FIBRES[r.int(0, 29)];
      const y = r.range(620, 742);
      out.push({ f, y, sx: f.x + r.range(-14, 14), sy: y + r.range(-10, 10), seed: (r() * 1e6) | 0 });
    }
    return out;
  })();

  function drawFlightZone(ctx, tt) {
    const x0 = 540, x1 = 640, y0 = 600, y1 = 760;
    const arm = 12;
    const p = new Path2D();
    for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
      p.moveTo(x + sx * arm, y);
      p.lineTo(x, y);
      p.lineTo(x, y + sy * arm);
    }
    ctx.save();
    ctx.strokeStyle = C.lav;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.3;
    ctx.stroke(p);
    ctx.restore();
    sline(ctx, L.rectPts(x0 + 5, y0 + 5, x1 - x0 - 10, y1 - y0 - 10, 20), { closed: true, alpha: 0.13, dash: [3, 5], amp: 0 });
    // empty zone: faint diagonal construction hatch marks the reserved space
    const hp = new Path2D();
    for (let d = -160; d < 100; d += 14) {
      const xa = Math.max(x0 + 8, x0 + 8 + d), ya = y0 + 8 + Math.max(0, -d);
      const len = Math.min(x1 - 8 - xa, y1 - 8 - ya);
      if (len <= 0) continue;
      hp.moveTo(xa, ya);
      hp.lineTo(xa + len, ya + len);
    }
    const fibreP = L.clamp((tt - TM.fibres) / (8 / 24));
    ctx.save();
    ctx.strokeStyle = C.lav;
    ctx.globalAlpha = 0.07 * (1 - fibreP);
    ctx.lineWidth = 1;
    ctx.stroke(hp);
    ctx.restore();
    {
      const tq = L.onTwos(tt);
      const gather = L.ease.inOutSine(L.clamp(tq / TM.fibres));
      const ring = new Path2D(), core = new Path2D();
      for (const m of ZONE_MYO) {
        const s0 = TM.fibres + (m.f.j / 4) * (4 / 24) - 1 / 24;
        const front = L.lerp(m.f.y0, m.f.y1, L.ease.outCubic(L.clamp((tt - s0) / (4 / 24))));
        if (tt >= s0 && front >= m.y) continue;
        const x = L.lerp(m.sx, m.f.x, gather), y = L.lerp(m.sy, m.y, gather);
        ring.moveTo(x + 3, y);
        ring.arc(x, y, 3, 0, TAU);
        core.moveTo(x + 1.3, y);
        core.arc(x, y, 1.3, 0, TAU);
      }
      ctx.save();
      ctx.strokeStyle = C.lav;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1;
      ctx.stroke(ring);
      ctx.fillStyle = C.lav;
      ctx.globalAlpha = 0.7;
      ctx.fill(core);
      ctx.restore();
    }
    if (tt < TM.fibres - 1e-6) return;
    // fibres draw on top-down over 8 frames, bundle by bundle
    const fp = new Path2D();
    const sp = new Path2D();
    const tp = new Path2D();
    const tips = [];
    for (let i = 0; i < FIBRES.length; i++) {
      const f = FIBRES[i];
      const s0 = TM.fibres + (f.j / 4) * (4 / 24) - 1 / 24;
      const pr = L.ease.outCubic(L.clamp((tt - s0) / (4 / 24)));
      if (pr <= 0) continue;
      const yb = L.lerp(f.y0, f.y1, pr);
      let first = true;
      for (let y = f.y0; y <= yb + 0.01; y += 3) {
        const x = fibreX(f, y);
        if (first) fp.moveTo(x, y);
        else fp.lineTo(x, y);
        first = false;
      }
      if (pr < 1) {
        const x = fibreX(f, yb);
        fp.lineTo(x, yb);
        if (f.k % 2 === 0) tips.push([x, yb]);
      }
      // striations: short perpendicular ticks every 4 px on alternate fibres, in register across the bundle
      if (f.k % 2 === 0) {
        for (let y = f.y0 + FIB.taper + 2; y < Math.min(yb, f.y1 - FIB.taper); y += 4) {
          const x = fibreX(f, y);
          sp.moveTo(x - 1.05, y);
          sp.lineTo(x + 1.05, y);
        }
      }
    }
    // each bundle ends on a flat tendon plate, with a tendon from the plate to the zone's edge
    const plates = new Path2D();
    const nucO = new Path2D(), nucF = new Path2D();
    for (let j = 0; j < 5; j++) {
      const f = FIBRES[j * 6];
      const s0 = TM.fibres + (j / 4) * (4 / 24) - 1 / 24;
      const pr = L.clamp((tt - s0) / (4 / 24));
      if (pr <= 0) continue;
      const bx0 = f.xc - 8, bx1 = f.xc + 8;
      plates.moveTo(bx0, FIB.y0 - 2);
      plates.lineTo(bx1, FIB.y0 - 2);
      tp.moveTo(f.xc, FIB.y0 - 2);
      tp.lineTo(f.xc, y0);
      if (pr >= 1) {
        plates.moveTo(bx0, FIB.y1 + 2);
        plates.lineTo(bx1, FIB.y1 + 2);
        tp.moveTo(f.xc, FIB.y1 + 2);
        tp.lineTo(f.xc, y1);
      }
      // two myonuclei per bundle, staggered, appearing as the fibres grow past them
      const yb = L.lerp(FIB.y0, FIB.y1, L.ease.outCubic(pr));
      for (const ny of MYO_NUC[j]) {
        if (yb < ny + 6) continue;
        nucO.moveTo(f.xc + 2.4, ny);
        nucO.ellipse(f.xc, ny, 2.4, 5.5, 0, 0, TAU);
        nucF.moveTo(f.xc + 1.1, ny);
        nucF.arc(f.xc, ny, 1.1, 0, TAU);
      }
    }
    ctx.save();
    ctx.strokeStyle = C.white;
    ctx.lineCap = 'round';
    ctx.lineWidth = 0.95;
    ctx.globalAlpha = 0.5;
    ctx.stroke(fp);
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.55;
    ctx.stroke(tp);
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    ctx.stroke(sp);
    ctx.strokeStyle = C.lav;
    ctx.lineCap = 'butt';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.7;
    ctx.stroke(plates);
    ctx.fillStyle = C.navy;
    ctx.globalAlpha = 0.75;
    ctx.fill(nucO);
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 1.1;
    ctx.globalAlpha = 0.8;
    ctx.stroke(nucO);
    ctx.fillStyle = C.white;
    ctx.fill(nucF);
    ctx.restore();
    for (const tp2 of tips) dots(ctx, [[tp2[0], tp2[1], 1.5]], C.glow, 0.95);
  }

  function drawCase(ctx) {
    // gold dots sit in a navy knock-out, so the lattice, sheaths and rails stop short of them
    const ko = new Path2D();
    for (const g of GOLD) {
      ko.moveTo(g[0] + 8.5, g[1]);
      ko.arc(g[0], g[1], 8.5, 0, TAU);
    }
    ctx.save();
    ctx.fillStyle = C.navy;
    ctx.globalAlpha = 0.8;
    ctx.fill(ko);
    ctx.restore();
    // soft halo so the silhouette reads at phone size, then the double lavender outline on G3
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    L.tracePath(ctx, OUTER, true);
    ctx.strokeStyle = C.lav;
    ctx.lineJoin = 'round';
    for (const [w, a] of [[16, 0.035], [8, 0.06], [4, 0.08]]) {
      ctx.lineWidth = w;
      ctx.globalAlpha = a;
      ctx.stroke();
    }
    ctx.restore();
    L.inkPath(ctx, OUTER, { closed: true, width: 2.5, color: C.lav, alpha: 0.88, seed: SEED + 1, wobble: 0.8, tremble: 0.2, rough: 0.15, taper: [6, 10], widthJitter: 0.18, boilAmp: 0.5, minWidth: 0.5 });
    L.inkPath(ctx, INNER, { closed: true, width: 1.5, color: C.lav, alpha: 0.5, seed: SEED + 2, wobble: 0.8, tremble: 0.2, rough: 0.12, taper: [6, 10], widthJitter: 0.18, boilAmp: 0.5, minWidth: 0.5 });
    // rim band as a dotted line at y 515
    const h = hw(515);
    const rim = new Path2D();
    for (let x = AX - h + 3; x <= AX + h - 3; x += 6.5) {
      rim.moveTo(x + 1.4, 515);
      rim.arc(x, 515, 1.4, 0, TAU);
    }
    ctx.save();
    ctx.fillStyle = C.lav;
    ctx.globalAlpha = 0.8;
    ctx.fill(rim);
    ctx.restore();
    sline(ctx, [[AX - hw(510), 510], [AX + hw(510), 510]], { alpha: 0.2, width: 1, amp: 0.3, seed: SEED + 20 });
    sline(ctx, [[AX - hw(520), 520], [AX + hw(520), 520]], { alpha: 0.2, width: 1, amp: 0.3, seed: SEED + 21 });
    // gold dots: 12 on the rim's lower edge, 5 near the bottom, 2 each side at y 560
    const bi = boilNow();
    for (let i = 0; i < GOLD.length; i++) {
      const [x, y] = GOLD[i];
      L.glowDot(ctx, x, y, 2.8, { color: C.gold, core: '#fff4d0', rays: 0, glow: 5, intensity: 0.2, twinkle: 0.1, seed: SEED + 60 + i });
    }
    const gl = GOLD.map((g, i) => [g[0] + (L.h3(i, bi, 3) - 0.5) * 0.5, g[1] + (L.h3(bi, i, 4) - 0.5) * 0.5, g[2] || 1]);
    const ring = new Path2D();
    for (const g of gl) {
      ring.moveTo(g[0] + 6 * g[2], g[1]);
      ring.ellipse(g[0], g[1], 6 * g[2], 6, 0, 0, TAU);
    }
    ctx.save();
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;
    ctx.stroke(ring);
    ctx.restore();
    const core = new Path2D();
    for (const g of gl) {
      core.moveTo(g[0] + 2.8 * g[2], g[1]);
      core.ellipse(g[0], g[1], 2.8 * g[2], 2.8, 0, 0, TAU);
    }
    ctx.save();
    ctx.fillStyle = C.gold;
    ctx.globalAlpha = 0.85;
    ctx.fill(core);
    ctx.restore();
  }

  function drawBracket(ctx) {
    sline(ctx, [[AX + 40, 332], [736, 332]], { alpha: 0.28, dash: [4, 4], amp: 0 });
    sline(ctx, [[AX + 6, 905], [736, 905]], { alpha: 0.28, dash: [4, 4], amp: 0 });
    L.bracket(ctx, 720, 332, 720, 905, { alpha: 0.65, cap: 16 });
    L.ticks(ctx, 728, 332, { kind: 'linear', length: 573, angle: Math.PI / 2, n: 24, len: 6, major: 6, majorLen: 13, side: -1, alpha: 0.4, color: C.lav, width: 1, baseline: false });
  }

  // segment index marks on the dorsal side: solid while the larval muscles hold, hollow once broken
  function drawSegmentMarks(ctx, tq, tt) {
    const frame = Math.floor(tt * 24 + 1e-3);
    for (let k = 0; k < 6; k++) {
      const seg = SEGS[k];
      const x = AX + hw(seg.ym) + 12;
      const broken = tq + 1e-6 >= seg.tBreak;
      sline(ctx, [[x, seg.ym], [x + 22, seg.ym]], { color: broken ? C.lav : C.white, alpha: broken ? 0.35 : 0.7, width: 1.3, amp: 0 });
      if (broken) sline(ctx, circlePts(x + 28, seg.ym, 3.5, 12), { closed: true, alpha: 0.55, amp: 0 });
      else dots(ctx, [[x + 28, seg.ym, 3]], C.white, 0.8);
      const fb = frame - seg.fBreak;
      if (fb >= 0 && fb < flickerFrames(seg)) sline(ctx, circlePts(x + 28, seg.ym, 5 + fb * 3, 16), { closed: true, color: C.mag, alpha: 1 - fb / 4, width: 2, amp: 0 });
    }
    sline(ctx, [[AX + hw(350) + 30, 350], [AX + hw(560) + 30, 560]].map((p) => [p[0] + 18, p[1]]), { alpha: 0.2, amp: 0, dash: [2, 3] });
  }

  // nerve cord length: a dimension on the ventral side that shortens with the cord (on twos)
  function cordTop(tq) {
    return L.lerp(420, 600, L.ease.inOutCubic(L.clamp((tq - TM.gut) / 0.25)));
  }
  function drawMeasures(ctx, tq) {
    const top = cordTop(tq);
    const bx = 372;
    sline(ctx, [[bx - 8, top], [462, top]], { alpha: 0.3, dash: [3, 4], amp: 0 });
    sline(ctx, [[bx - 8, 860], [462, 860]], { alpha: 0.3, dash: [3, 4], amp: 0 });
    L.bracket(ctx, bx, top, bx, 860, { color: C.white, alpha: 0.6, cap: 14 });
    // ghost of the larval length: a dashed bracket over the full old cord, beside the live one
    if (top > 421) {
      const gx = 356;
      sline(ctx, [[gx, 420], [gx, 860]], { alpha: 0.3, width: 1.5, amp: 0, dash: [4, 4] });
      sline(ctx, [[gx - 7, 420], [gx + 7, 420]], { alpha: 0.3, width: 1.5, amp: 0 });
      sline(ctx, [[gx - 7, 860], [gx + 7, 860]], { alpha: 0.3, width: 1.5, amp: 0 });
      sline(ctx, [[gx - 4, 429], [gx, 421], [gx + 4, 429]], { alpha: 0.3, width: 1.5, amp: 0 });
      sline(ctx, [[gx, 420], [462, 420]], { alpha: 0.25, amp: 0, dash: [2, 3] });
    }
    // gut width: a dimension over the top of the tube that narrows 120 to 40 px
    const half = gutHalf(tq);
    const y = 368;
    L.bracket(ctx, AX - half, y, AX + half, y, { color: C.white, alpha: 0.55, cap: 10 });
    sline(ctx, [[AX - half, y + 5], [AX - half, 392]], { alpha: 0.3, amp: 0, dash: [2, 3] });
    sline(ctx, [[AX + half, y + 5], [AX + half, 392]], { alpha: 0.3, amp: 0, dash: [2, 3] });
  }

  function wingPulse(tq) {
    const d = tq - TM.flash;
    if (d < 0) return 0;
    if (d < 2 / 24) return 1;
    return Math.max(0, 1 - (d - 2 / 24) / (6 / 24));
  }

  function drawNetwork(ctx, tt, tq) {
    const frame = Math.floor(tt * 24 + 1e-3);
    // the axis the nodes hang on
    sline(ctx, [[AX, 968], [AX, 1560]], { alpha: 0.22, width: 1, amp: 0, dash: [2, 5] });
    // node baselines and a tick scale down the axis between the nodes
    for (const n of NODES) sline(ctx, [[70, n.y], [1010, n.y]], { alpha: 0.14, width: 1, amp: 0, dash: [8, 10] });
    for (let k = 0; k < 3; k++) {
      const ya = NODES[k].y + NODE_R + 10, yb = NODES[k + 1].y - NODE_R - 10;
      L.ticks(ctx, AX + 4, ya, { kind: 'linear', length: yb - ya, angle: Math.PI / 2, n: 6, len: 5, major: 3, majorLen: 9, side: -1, color: C.lav, alpha: 0.45, width: 1, baseline: false });
    }
    for (let i = 0; i < NODES.length; i++) {
      const n = NODES[i];
      const cx = AX, cy = n.y;
      const pc = L.clamp((tt - TM.conStart[i]) / (TM.conEnd[i] - TM.conStart[i]));
      const pe = L.ease.outCubic(pc);
      const arrive = TM.conEnd[i];
      const nodeP = tt + 1e-6 >= arrive ? L.ease.outExpo(L.clamp((tt - arrive) / (6 / 24) + 1 / 6)) : 0;
      // planned route and empty slot: the adult parts are already laid out
      sline(ctx, n.path, { alpha: 0.35, width: 1.5, amp: 0, dash: [1.5, 6] });
      if (nodeP < 1) {
        const g = 1 - nodeP;
        // once its primordium ignites, the empty slot wakes: brighter, turning, waiting for the wire
        const woke = tt + 1e-6 >= TM.ignite[i] ? 1 : 0;
        const spin = woke ? (tt - TM.ignite[i]) * 1.4 : 0;
        sline(ctx, circlePts(cx, cy, NODE_R, 64, spin), { closed: true, color: woke ? C.white : C.lav, alpha: (0.5 + 0.25 * woke) * g, width: 1.4 + 0.3 * woke, dash: [5, 5], amp: 0 });
        if (woke) L.ticks(ctx, cx, cy, { r: NODE_R + 6, n: 4, len: 8, rot: -spin, color: C.white, alpha: 0.6 * g, width: 1.5 });
        sline(ctx, circlePts(cx, cy, NODE_R - 9, 64), { closed: true, alpha: 0.25 * g, amp: 0 });
        ctx.save();
        ctx.globalAlpha *= 0.35 * g;
        if (n.key === "eye") iconEye(ctx, cx, cy);
        else if (n.key === "antenna") iconAntenna(ctx, cx, cy);
        else if (n.key === "leg") iconLeg(ctx, cx, cy);
        else iconWing(ctx, cx, cy, 0, 0);
        ctx.restore();
      }
      drawBar(ctx, i, cy, tt, nodeP);
      // connector
      if (pe > 0) {
        const part = partial(n.path, pe);
        sline(ctx, part, { alpha: 0.7, width: 1.6, seed: SEED + 1000 + i, amp: 0.5 });
        sline(ctx, part.map((p) => [p[0] + 4, p[1] + 3]), { alpha: 0.16, width: 1, seed: SEED + 1010 + i, amp: 0.5 });
        const tip = part[part.length - 1];
        if (pc < 1) L.glowDot(ctx, tip[0], tip[1], 3.8, { rays: 4, rayLen: 3, glow: 5, intensity: 1, seed: SEED + 1020 + i });
        sline(ctx, circlePts(n.origin[0], n.origin[1], 6, 16), { closed: true, color: C.white, alpha: 0.45, amp: 0 });
        // signal dots travel the wire once it has arrived (on twos)
        if (pc >= 1) {
          for (let k = 0; k < 3; k++) {
            const u = (Math.max(0, tq - arrive) * 1.25 + k / 3) % 1;
            const pt = n.path[L.clamp(Math.floor(u * (n.path.length - 1)), 0, n.path.length - 1)];
            dots(ctx, [[pt[0], pt[1], 2.4]], C.white, 0.8);
          }
        }
      }
      if (nodeP <= 0) continue;
      drawNode(ctx, i, cx, cy, nodeP, tt, tq, frame);
    }
  }

  // growth marks beside each node, in the plate's measurement language: an arc annotation round the node
  // and a bracket sliding out along a tick rule, one step per frame after the node arrives
  function drawBar(ctx, i, cy, tt, nodeP) {
    const n = NODES[i];
    const arrive = TM.conEnd[i];
    const filled = nodeP > 0 ? Math.min(n.bar, Math.max(0, Math.floor((tt - arrive) * 24 + 1e-3) + 1)) : 0;
    const bx = 632, len = 235;
    const flashF = Math.floor(tt * 24 + 1e-3) - Math.round(TM.flash * 24);
    const hot = i === 3 && flashF >= 0 && flashF < 6;
    const col = hot ? C.mag : C.white;
    if (filled > 0) {
      L.arcAnnotation(ctx, AX, cy, 70, -Math.PI / 2, -Math.PI / 2 + (TAU * filled) / 12, { color: col, width: 2, endTicks: 8 });
    }
    // the tick rule (planned length) and its ghost bracket
    L.ticks(ctx, bx, cy + 3, { kind: 'linear', length: len, angle: 0, n: 24, len: 4, major: 2, majorLen: 9, color: C.lav, alpha: 0.4, width: 1, baseline: false });
    sline(ctx, [[bx, cy + 3], [bx + len, cy + 3]], { alpha: 0.28, width: 1, amp: 0 });
    L.bracket(ctx, bx, cy - 6, bx + len, cy - 6, { style: 'square', offset: -1, cap: 7, alpha: 0.2, width: 1, color: C.lav });
    sline(ctx, [[AX + 76, cy], [bx - 6, cy]], { alpha: 0.2 + 0.3 * nodeP, dash: [3, 3], amp: 0 });
    if (filled > 0) {
      L.bracket(ctx, bx, cy - 6, bx + (len * filled) / 12, cy - 6, { style: 'square', offset: -1, cap: 7, alpha: 0.95, width: 2, color: col });
    }
  }

  function drawNode(ctx, i, cx, cy, p, tt, tq, frame) {
    const n = NODES[i];
    const flashF = frame - Math.round(TM.flash * 24);
    const isWing = i === 3;
    const hot = isWing && flashF >= 0 && flashF < 6 ? 1 - flashF / 6 : 0;
    // inset disc
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, (NODE_R - 1) * (0.6 + 0.4 * p), 0, TAU);
    ctx.fillStyle = C.navyLight;
    ctx.globalAlpha = 0.85 * p;
    ctx.fill();
    ctx.restore();
    // outer double ring, drawing on from the entry point
    const outer = circlePts(cx, cy, NODE_R, 72, Math.PI, TAU * p);
    sline(ctx, outer, { closed: p >= 1, color: C.lav, alpha: 0.92, width: 2.5, seed: SEED + 1100 + i, amp: 0.4 });
    if (hot > 0) sline(ctx, circlePts(cx, cy, NODE_R, 72), { closed: true, color: C.mag, alpha: hot, width: 3, seed: SEED + 1110, amp: 0.4 });
    sline(ctx, circlePts(cx, cy, NODE_R - 9, 64, Math.PI, -TAU * p), { closed: p >= 1, alpha: 0.5, width: 1.5, seed: SEED + 1120 + i, amp: 0.3 });
    L.ticks(ctx, cx, cy, { r: NODE_R + 5, n: 24, len: 4, major: 6, majorLen: 7, rot: Math.PI, color: C.lav, alpha: 0.45 * p, width: 1, p });
    sline(ctx, [[cx - NODE_R - 14, cy], [cx - NODE_R + 3, cy]], { color: C.white, alpha: 0.85 * p, width: 1.6, amp: 0 });
    ctx.save();
    ctx.globalAlpha *= p;
    if (n.key === 'eye') iconEye(ctx, cx, cy);
    else if (n.key === 'antenna') iconAntenna(ctx, cx, cy);
    else if (n.key === 'leg') iconLeg(ctx, cx, cy);
    else iconWing(ctx, cx, cy, wingPulse(tq), hot);
    ctx.restore();
  }

  function iconEye(ctx, cx, cy) {
    const clip = L.ellipsePts(cx, cy, 36, 36, 40);
    L.hexLattice(ctx, clip, {
      r: 6.4, alpha: 0.6, width: 1.1, color: C.lav, seed: SEED + 1200, jitter: 0.4,
      cellFn: (x, y) => {
        const d = Math.hypot(x - cx + 11, y - cy + 11);
        return d < 18 ? { fill: C.white, alpha: 0.1 + 0.14 * (1 - d / 18) } : true;
      },
    });
    // facet shading toward the lower right, stippled
    L.stipple(ctx, clip, { spacing: 5, density: (x, y) => L.clamp(((x - cx) + (y - cy)) / 50), color: C.navy, alpha: 0.5, r: [0.8, 1.4], seed: SEED + 1203 });
    sline(ctx, circlePts(cx, cy, 36, 48), { closed: true, color: C.white, alpha: 0.85, width: 1.8, seed: SEED + 1201, amp: 0.3 });
    sline(ctx, circlePts(cx, cy, 28, 20, -2.7, 1.3), { color: C.white, alpha: 0.55, width: 1.4, amp: 0 });
  }

  function iconAntenna(ctx, cx, cy) {
    const pts = L.smoothPts([[cx - 30, cy + 32], [cx - 12, cy + 10], [cx + 6, cy - 10], [cx + 17, cy - 21]], false, 4);
    for (const off of [-1.8, 1.8]) {
      sline(ctx, pts.map((q, k) => [q[0] + off * 0.7 * (1 - (0.4 * k) / pts.length), q[1] + off * 0.7 * (1 - (0.4 * k) / pts.length)]), { color: C.white, alpha: 0.9, width: 1.4, seed: SEED + 1300 + off, amp: 0.3 });
    }
    const p = new Path2D();
    for (let k = 2; k < pts.length - 1; k += 2) {
      const a = pts[k - 1], b = pts[k + 1];
      const tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      const nx = -ty / tl, ny = tx / tl;
      p.moveTo(pts[k][0] - nx * 3.5, pts[k][1] - ny * 3.5);
      p.lineTo(pts[k][0] + nx * 3.5, pts[k][1] + ny * 3.5);
    }
    ctx.save();
    ctx.strokeStyle = C.white;
    ctx.globalAlpha *= 0.55;
    ctx.lineWidth = 1;
    ctx.stroke(p);
    ctx.restore();
    // club
    const club = L.ellipsePts(cx + 24, cy - 28, 7, 14, 22, Math.PI / 4.2);
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, club, true);
    ctx.fillStyle = C.white;
    ctx.globalAlpha *= 0.3;
    ctx.fill();
    ctx.restore();
    sline(ctx, club, { closed: true, color: C.white, alpha: 0.95, width: 1.8, seed: SEED + 1301, amp: 0.2 });
    for (let k = 1; k < 4; k++) {
      const c = [cx + 24 + (k - 2) * 5.6, cy - 28 - (k - 2) * 5.6];
      sline(ctx, [[c[0] - 4, c[1] - 4], [c[0] + 4, c[1] + 4]], { color: C.white, alpha: 0.5, width: 1, amp: 0 });
    }
    sline(ctx, circlePts(cx - 31, cy + 33, 5.5, 14), { closed: true, color: C.white, alpha: 0.75, width: 1.3, amp: 0 });
  }

  function iconLeg(ctx, cx, cy) {
    const J = [[-38, -30], [-25, -12], [16, -30], [24, 16], [40, 34]].map((q) => [cx + q[0], cy + q[1]]);
    const frame = (a, b) => {
      const tx = b[0] - a[0], ty = b[1] - a[1];
      const len = Math.hypot(tx, ty) || 1;
      const ux = tx / len, uy = ty / len;
      return { len, ux, uy, nx: -uy, ny: ux, at: (s, w) => [a[0] + ux * s - uy * w, a[1] + uy * s + ux * w] };
    };
    // a segment outline from a half-width profile, trimmed clear of the joint rings
    const segment = (fr, s0, s1, half) => {
      const left = [], right = [];
      for (let k = 0; k <= 12; k++) {
        const u = k / 12, s = L.lerp(s0, s1, u), w = half(u);
        left.push(fr.at(s, w));
        right.push(fr.at(s, -w));
      }
      return { left, right, poly: left.concat(right.slice().reverse()) };
    };
    const fill = (poly, a) => {
      ctx.save();
      ctx.beginPath();
      L.tracePath(ctx, poly, true);
      ctx.fillStyle = C.white;
      ctx.globalAlpha *= a;
      ctx.fill();
      ctx.restore();
    };
    const edges = (sg, seed, width) => {
      sline(ctx, sg.left, { color: C.white, alpha: 0.9, width, seed, amp: 0.3 });
      sline(ctx, sg.right, { color: C.white, alpha: 0.9, width, seed: seed + 1, amp: 0.3 });
    };
    // coxa: a short block from the body
    const fc = frame(J[0], J[1]);
    const coxa = segment(fc, 1, fc.len - 4.5, (u) => L.lerp(5.5, 4, u));
    fill(coxa.poly, 0.14);
    edges(coxa, SEED + 1400, 1.4);
    // femur: a spindle 14 px across at mid-length, stippled
    const ff = frame(J[1], J[2]);
    const femur = segment(ff, 4.5, ff.len - 4.5, (u) => 3 + 4 * Math.sin(Math.PI * u));
    fill(femur.poly, 0.1);
    L.stipple(ctx, femur.poly, { spacing: 7.5, density: 1, r: [0.8, 1.2], color: C.lav, alpha: 0.85, seed: SEED + 1405 });
    edges(femur, SEED + 1402, 1.6);
    // tibia: a slimmer shaft, 7 px, with two spurs at its lower end
    const ft = frame(J[2], J[3]);
    const tibia = segment(ft, 4.5, ft.len - 4.5, (u) => L.lerp(3.2, 3.6, u));
    fill(tibia.poly, 0.14);
    edges(tibia, SEED + 1404, 1.4);
    const sp = new Path2D();
    // setae along the femur's outer edge and the tibia
    for (let k = 2; k < 11; k += 2) {
      const q = femur.left[k];
      sp.moveTo(q[0], q[1]);
      sp.lineTo(q[0] + ff.nx * 4 + ff.ux * 3, q[1] + ff.ny * 4 + ff.uy * 3);
    }
    for (let k = 3; k < 10; k += 3) {
      const q = tibia.right[k];
      sp.moveTo(q[0], q[1]);
      sp.lineTo(q[0] - ft.nx * 3.5 + ft.ux * 3, q[1] - ft.ny * 3.5 + ft.uy * 3);
    }
    ctx.save();
    ctx.strokeStyle = C.white;
    ctx.globalAlpha *= 0.55;
    ctx.lineWidth = 1;
    ctx.stroke(sp);
    ctx.restore();
    for (const sg of [-1, 1]) {
      const b0 = ft.at(ft.len - 7, sg * 3.4);
      const tipS = ft.at(ft.len - 7 + 4.5, sg * (3.4 + 2.2));
      sline(ctx, [b0, tipS], { color: C.white, alpha: 0.9, width: 1.3, amp: 0 });
    }
    // tarsus: five beads shrinking from 5 to 3 px, then a two-hook claw
    const fa = frame(J[3], J[4]);
    const beads = new Path2D();
    let s = 4;
    for (let k = 0; k < 5; k++) {
      const d = L.lerp(5, 3, k / 4);
      s += d / 2 - 0.2;
      const c = fa.at(s, 0);
      beads.moveTo(c[0] + d / 2, c[1]);
      beads.arc(c[0], c[1], d / 2, 0, TAU);
      s += d / 2 - 0.2;
    }
    ctx.save();
    ctx.fillStyle = C.white;
    ctx.strokeStyle = C.white;
    const a0 = ctx.globalAlpha;
    ctx.globalAlpha = a0 * 0.35;
    ctx.fill(beads);
    ctx.globalAlpha = a0 * 0.95;
    ctx.lineWidth = 1.2;
    ctx.stroke(beads);
    ctx.restore();
    const base = fa.at(s + 0.5, 0);
    for (const sg of [-1, 1]) {
      const p1 = fa.at(s + 3, sg * 2.5), p2 = fa.at(s + 6.5, sg * 4), p3 = fa.at(s + 6, sg * 1.5);
      sline(ctx, [base, p1, p2, p3], { color: C.white, alpha: 0.95, width: 1.3, amp: 0 });
    }
    for (let k = 1; k < 4; k++) sline(ctx, circlePts(J[k][0], J[k][1], 4, 12), { closed: true, color: C.white, alpha: 0.95, width: 1.3, amp: 0 });
  }

  function iconWing(ctx, cx, cy, pulse, hot) {
    const base = [cx - 32, cy + 28];
    const k = 1 + 0.1 * pulse;
    const sc = (q) => [base[0] + (cx + q[0] - base[0]) * k, base[1] + (cy + q[1] - base[1]) * k];
    const outline = L.smoothPts([[-32, 28], [-31, -6], [-20, -31], [16, -37], [37, -24], [36, 2], [16, 22], [-10, 32]].map(sc), true, 5);
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, outline, true);
    ctx.fillStyle = C.white;
    ctx.globalAlpha *= 0.08;
    ctx.fill();
    ctx.restore();
    // margin band with a row of spots
    const inner = outline.map((q) => [base[0] + (q[0] - base[0]) * 0.86, base[1] + (q[1] - base[1]) * 0.86]);
    sline(ctx, outline, { closed: true, color: C.lav, alpha: 0.75, width: 1.5, seed: SEED + 1500, amp: 0.3 });
    const spots = [];
    for (let s = 6; s < outline.length - 4; s += 3) {
      const q = outline[s], w = inner[s];
      spots.push([(q[0] + w[0]) / 2, (q[1] + w[1]) / 2, 1.5]);
    }
    dots(ctx, spots, C.white, 0.6);
    const ends = [[-29, -14], [-15, -30], [6, -34], [27, -27], [35, -8], [22, 12]];
    for (let v = 0; v < 6; v++) {
      const e = sc(ends[v]);
      const m = [L.lerp(base[0], e[0], 0.5) - 3, L.lerp(base[1], e[1], 0.5) + 2];
      sline(ctx, L.smoothPts([base, m, e], false, 5), { color: hot > 0 ? C.mag : C.white, alpha: 0.9, width: 1.6, seed: SEED + 1510 + v, amp: 0.3 });
    }
    const d = [sc([-18, 6]), sc([-4, -11]), sc([9, -9]), sc([-5, 12])];
    sline(ctx, d, { closed: true, color: C.white, alpha: 0.45, width: 1.1, amp: 0 });
    dots(ctx, [[base[0], base[1], 3]], C.white, 0.9);
  }

  // ---------------------------------------------------------------------------
  // Transverse section through the abdomen at y 470 (segment 4), shown in an inset circle
  // ---------------------------------------------------------------------------
  const SEC = { x: 205, y: 470, r: 88, y0: 470 };
  const SEC_SEG = 3;
  const SEC_BLOCKS = (function () {
    const out = [];
    const r = L.rng(L.hash(ID, 'section'));
    for (let b = 0; b < 8; b++) {
      const a0 = (b / 8) * TAU + 0.12, a1 = a0 + TAU / 8 - 0.2;
      const ro = SEC.r - 12, ri = SEC.r - 26;
      const poly = [];
      for (let k = 0; k <= 6; k++) poly.push([Math.cos(L.lerp(a0, a1, k / 6)) * ro, Math.sin(L.lerp(a0, a1, k / 6)) * ro]);
      for (let k = 6; k >= 0; k--) poly.push([Math.cos(L.lerp(a0, a1, k / 6)) * ri, Math.sin(L.lerp(a0, a1, k / 6)) * ri]);
      const dotsB = [];
      for (let k = 0; k < 26; k++) {
        const a = r.range(a0, a1), rad = r.range(ri + 1, ro - 1);
        dotsB.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad, r: r.range(1.3, 2.2), vx: r.range(-1, 1), vy: r.range(-1, 1) });
      }
      out.push({ a0, a1, ro, ri, poly, dots: dotsB });
    }
    return out;
  })();

  function drawSection(ctx, tq, tt) {
    const { x: cx, y: cy, r: R } = SEC;
    const frame = Math.floor(tt * 24 + 1e-3);
    // cutting-plane marks on the case at y 470, arrows looking up the abdomen
    // the cutting plane itself, a dash-dot line across the case
    sline(ctx, [[380, 470], [700, 470]], { color: C.white, alpha: 0.45, width: 1.5, amp: 0, dash: [12, 4, 2, 4] });
    for (const side of [-1, 1]) {
      const xw = AX + side * (hw(470) + 10);
      sline(ctx, [[xw, 470], [xw + side * 22, 470]], { color: C.white, alpha: 0.8, width: 2, amp: 0 });
      const xa = xw + side * 16;
      sline(ctx, [[xa - 5, 462], [xa, 452], [xa + 5, 462]], { color: C.white, alpha: 0.7, width: 1.4, amp: 0 });
      sline(ctx, [[xa, 470], [xa, 453]], { color: C.white, alpha: 0.7, width: 1.2, amp: 0 });
    }
    sline(ctx, [[cx + R + 6, cy], [AX - hw(470) - 34, 470]], { alpha: 0.55, dash: [4, 5], amp: 0 });
    // inset plate
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fillStyle = C.navyLight;
    ctx.globalAlpha = 0.75;
    ctx.fill();
    ctx.restore();
    const plate = L.ellipsePts(cx, cy, R - 7, R - 7, 48);
    L.hexLattice(ctx, plate, { r: 9, alpha: 0.1, width: 1, seed: SEED + 2000, jitter: 1 });
    L.stipple(ctx, plate, { spacing: 7, density: (x, y) => 0.35 * L.smoothstep(R - 40, R - 8, Math.hypot(x - cx, y - cy)), color: C.lav, alpha: 0.4, r: [0.7, 1.2], seed: SEED + 2001, boilAmp: 0.7 });
    sline(ctx, circlePts(cx, cy, R, 72), { closed: true, alpha: 0.85, width: 2, seed: SEED + 2002, amp: 0.4 });
    sline(ctx, circlePts(cx, cy, R - 7, 72), { closed: true, alpha: 0.45, width: 1.2, seed: SEED + 2003, amp: 0.4 });
    L.ticks(ctx, cx, cy, { r: R + 4, n: 48, len: 4, major: 12, majorLen: 10, color: C.lav, alpha: 0.4, width: 1 });
    // muscle blocks around the body wall, breaking with segment 4
    const seg = SEGS[SEC_SEG];
    const broken = tq + 1e-6 >= seg.tBreak;
    const bt = seg.tBreak;
    const steps = broken ? Math.round((tq - bt) * 12) : 0;
    const list = [];
    for (let b = 0; b < SEC_BLOCKS.length; b++) {
      const B = SEC_BLOCKS[b];
      if (!broken) {
        sline(ctx, B.poly.map((q) => [cx + q[0], cy + q[1]]), { closed: true, color: C.white, alpha: 0.55, width: 1.1, seed: SEED + 2010 + b, amp: 0.3 });
        const p = new Path2D();
        for (let k = 1; k < 6; k++) {
          const a = L.lerp(B.a0, B.a1, k / 6);
          p.moveTo(cx + Math.cos(a) * (B.ri + 2), cy + Math.sin(a) * (B.ri + 2));
          p.lineTo(cx + Math.cos(a) * (B.ro - 2), cy + Math.sin(a) * (B.ro - 2));
        }
        ctx.save();
        ctx.strokeStyle = C.white;
        ctx.globalAlpha = 0.25;
        ctx.lineWidth = 1;
        ctx.stroke(p);
        ctx.restore();
      } else {
        for (const d of B.dots) {
          let x = d.x, y = d.y;
          for (let s = 0; s < steps; s++) {
            x += d.vx * 1.6 + L.noise2(x * 0.05, y * 0.05 + s * 0.1, SEED + 2020) * 2.2;
            y += d.vy * 1.6 + L.noise2(x * 0.05 + 5, y * 0.05, SEED + 2021) * 2.2;
            const rr = Math.hypot(x, y);
            if (rr > R - 12) { x *= (R - 12) / rr; y *= (R - 12) / rr; }
          }
          list.push([cx + x, cy + y, d.r]);
        }
      }
    }
    if (broken) dots(ctx, list, C.white, 0.8);
    const fb = frame - seg.fBreak;
    if (fb >= 0 && fb < 4) {
      const A = [1, 0.3, 0.8, 0.3][fb];
      for (let b = 0; b < SEC_BLOCKS.length; b++) {
        const B = SEC_BLOCKS[b];
        sline(ctx, circlePts(cx, cy, (B.ri + B.ro) / 2, 8, B.a0, B.a1 - B.a0), { color: C.mag, alpha: A, width: 2.4, amp: 0.8, seed: SEED + 2030 + b });
      }
    }
    // gut in section: 30 px radius narrowing to 10 with the tube
    const gr = (gutHalf(tq) / 60) * 30;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx + 4, cy, gr, 0, TAU);
    ctx.fillStyle = C.navy;
    ctx.globalAlpha = 0.6;
    ctx.fill();
    ctx.restore();
    sline(ctx, circlePts(cx + 4, cy, gr, 40), { closed: true, alpha: 0.8, width: 1.5, seed: SEED + 2040, amp: 0.4 });
    sline(ctx, circlePts(cx + 4, cy, Math.max(3, gr - 5), 32), { closed: true, alpha: 0.3, width: 1, seed: SEED + 2041, amp: 0.3 });
    if (gr > 12) {
      const gd = [];
      const r = L.rng(L.hash(ID, 'secgut'));
      for (let k = 0; k < 18; k++) {
        const a = r() * TAU, rad = Math.sqrt(r()) * (gr - 7);
        gd.push([cx + 4 + Math.cos(a) * rad, cy + Math.sin(a) * rad, r.range(0.9, 1.6)]);
      }
      dots(ctx, gd, C.lav, 0.55);
    }
    // ventral nerve cord (paired connectives) on the left, dorsal vessel on the right
    const nx = cx - R + 34;
    for (const dy of [-5.5, 5.5]) {
      sline(ctx, L.ellipsePts(nx, cy + dy, 5, 5, 14), { closed: true, color: C.white, alpha: 0.9, width: 1.3, amp: 0 });
      dots(ctx, [[nx, cy + dy, 2]], C.white, 0.5);
    }
    L.glowDot(ctx, nx, cy, 4, { rays: 0, glow: 5, intensity: 0.3, seed: SEED + 2042 });
    sline(ctx, circlePts(cx + R - 36, cy, 6, 16), { closed: true, alpha: 0.7, width: 1.2, amp: 0 });
    sline(ctx, circlePts(cx + R - 36, cy, 2.5, 10), { closed: true, alpha: 0.5, width: 1, amp: 0 });
    // tracheae from the lateral spiracles
    const tp = new Path2D();
    for (const sy of [-1, 1]) {
      const y0 = cy + sy * (R - 8);
      tp.moveTo(cx + 2, y0);
      tp.quadraticCurveTo(cx - 2, cy + sy * (R - 30), cx - 12, cy + sy * (R - 44));
      tp.moveTo(cx, cy + sy * (R - 26));
      tp.quadraticCurveTo(cx + 10, cy + sy * (R - 38), cx + 22, cy + sy * (R - 42));
    }
    ctx.save();
    ctx.strokeStyle = C.lav;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1;
    ctx.stroke(tp);
    ctx.restore();
    // the same cutting plane seen edge-on, across the inset's diameter
    sline(ctx, [[cx - R + 8, cy], [cx + R - 8, cy]], { color: C.white, alpha: 0.3, width: 1.5, amp: 0, dash: [12, 4, 2, 4] });
    // orientation marks: ventral (left) and dorsal (right) as a small bracket across the diameter
    L.bracket(ctx, cx - R, cy + R + 22, cx + R, cy + R + 22, { alpha: 0.35, cap: 10, width: 1 });
  }

  // ---------------------------------------------------------------------------
  // Detail of the flight-muscle zone, shown in an inset circle on the right: myoblasts gather along empty
  // templates, then at 12.5 striated myofibrils draw on and the myoblasts become the fibres' nuclei
  // ---------------------------------------------------------------------------
  const MI = { x: 858, y: 690, r: 84, origin: [626, 700], originR: 12 };
  const MI_FIB = [0, 1, 2, 3, 4].map((k) => MI.x + (k - 2) * 26);
  const MI_NUC = (function () {
    const r = L.rng(L.hash(ID, 'myonuclei'));
    const out = [];
    for (let k = 0; k < 5; k++) {
      for (let j = 0; j < 4; j++) {
        const side = (j + k) % 2 ? 1 : -1;
        const x = MI_FIB[k] + side * 8.5;
        const y = 628 + j * 40 + ((k * 17) % 30) + r.range(-3, 3);
        if (Math.hypot(x - MI.x, y - MI.y) > MI.r - 12) continue;
        const a = r() * TAU, d = r.range(14, 34);
        out.push({ k, x, y, sx: L.clamp(x + Math.cos(a) * d, MI.x - 70, MI.x + 70), sy: y + Math.sin(a) * d, seed: (r() * 1e6) | 0 });
      }
    }
    return out;
  })();
  // mitochondria packed between the myofibrils (flight muscle is full of them)
  const MI_MITO = (function () {
    const r = L.rng(L.hash(ID, 'mito'));
    const out = [];
    for (let k = 0; k < 4; k++) {
      const x = (MI_FIB[k] + MI_FIB[k + 1]) / 2;
      for (let y = MI.y - MI.r + 6 + r.range(0, 8); y < MI.y + MI.r; y += r.range(15, 19)) {
        if (Math.hypot(x - MI.x, y - MI.y) > MI.r - 12) continue;
        if (MI_NUC.some((nd) => Math.abs(nd.x - x) < 8 && Math.abs(nd.y - y) < 11)) continue;
        out.push({ k, x: x + r.range(-0.8, 0.8), y, ry: r.range(4.5, 6.5) });
      }
    }
    return out;
  })();
  const miFront = (tt, k) => {
    const s0 = TM.fibres + (k / 4) * (4 / 24) - 1 / 24;
    return L.lerp(MI.y - MI.r, MI.y + MI.r, L.ease.outCubic(L.clamp((tt - s0) / (4 / 24))));
  };

  function drawMuscleInset(ctx, tq, tt) {
    const { x: cx, y: cy, r: R } = MI;
    // callout: a small ring on the zone and two leader lines out to the inset
    sline(ctx, circlePts(MI.origin[0], MI.origin[1], MI.originR, 24), { closed: true, color: C.white, alpha: 0.7, width: 1.3, amp: 0 });
    const ang = Math.atan2(cy - MI.origin[1], cx - MI.origin[0]);
    for (const sgn of [-1, 1]) {
      const a0 = ang + sgn * Math.PI / 2;
      const p0 = [MI.origin[0] + Math.cos(a0) * MI.originR, MI.origin[1] + Math.sin(a0) * MI.originR];
      const p1 = [cx + Math.cos(a0) * R, cy + Math.sin(a0) * R];
      sline(ctx, [p0, p1], { alpha: 0.45, width: 1.2, dash: [4, 5], amp: 0 });
    }
    // plate
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fillStyle = C.navyLight;
    ctx.globalAlpha = 0.75;
    ctx.fill();
    ctx.restore();
    const plate = L.ellipsePts(cx, cy, R - 7, R - 7, 48);
    L.hexLattice(ctx, plate, { r: 9, alpha: 0.1, width: 1, seed: SEED + 2100, jitter: 1 });
    L.stipple(ctx, plate, { spacing: 7, density: (x, y) => 0.3 * L.smoothstep(R - 40, R - 8, Math.hypot(x - cx, y - cy)), color: C.lav, alpha: 0.4, r: [0.7, 1.2], seed: SEED + 2101, boilAmp: 0.7 });
    sline(ctx, circlePts(cx, cy, R, 72), { closed: true, alpha: 0.85, width: 2, seed: SEED + 2102, amp: 0.4 });
    sline(ctx, circlePts(cx, cy, R - 7, 72), { closed: true, alpha: 0.45, width: 1.2, seed: SEED + 2103, amp: 0.4 });
    L.ticks(ctx, cx, cy, { r: R + 4, n: 48, len: 4, major: 12, majorLen: 10, color: C.lav, alpha: 0.4, width: 1 });
    L.bracket(ctx, cx - R, cy + R + 22, cx + R, cy + R + 22, { alpha: 0.35, cap: 10, width: 1 });

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R - 8, 0, TAU);
    ctx.clip();
    // templates: dashed guides where each myofibril will lie
    const tp = new Path2D();
    for (const fx of MI_FIB) {
      for (const sx of [-6, 6]) {
        tp.moveTo(fx + sx, cy - R);
        tp.lineTo(fx + sx, cy + R);
      }
    }
    ctx.save();
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = C.lav;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.26;
    ctx.stroke(tp);
    ctx.restore();
    // myofibrils: sarcomeres between Z-lines, a lit A-band and a faint M-line in each
    const edges = new Path2D(), zl = new Path2D(), ab = new Path2D(), ml = new Path2D();
    let any = false;
    const mito = new Path2D();
    for (let k = 0; k < 5; k++) {
      const yb = miFront(tt, k);
      if (yb <= cy - R) continue;
      any = true;
      const fx = MI_FIB[k];
      const y0 = cy - R;
      for (const sx of [-6, 6]) {
        edges.moveTo(fx + sx, y0);
        edges.lineTo(fx + sx, yb);
      }
      for (let z = y0 + ((k * 5) % 18); z < yb; z += 18) {
        zl.moveTo(fx - 6, z);
        zl.lineTo(fx + 6, z);
        const a0 = z + 4, a1 = Math.min(yb, z + 14);
        if (a1 > a0) ab.rect(fx - 5, a0, 10, a1 - a0);
        if (z + 9 < yb) {
          ml.moveTo(fx - 4, z + 9);
          ml.lineTo(fx + 4, z + 9);
        }
      }
    }
    for (const m of MI_MITO) {
      if (miFront(tt, m.k) < m.y + m.ry) continue;
      mito.moveTo(m.x + 3, m.y);
      mito.ellipse(m.x, m.y, 3, m.ry, 0, 0, TAU);
      mito.moveTo(m.x - 1.5, m.y - m.ry + 2.5);
      mito.lineTo(m.x + 1.5, m.y - 1);
      mito.moveTo(m.x - 1.5, m.y + 1);
      mito.lineTo(m.x + 1.5, m.y + m.ry - 2.5);
    }
    if (any) {
      ctx.save();
      ctx.strokeStyle = C.lav;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = 1;
      ctx.stroke(mito);
      ctx.fillStyle = C.lav;
      ctx.globalAlpha = 0.42;
      ctx.fill(ab);
      ctx.strokeStyle = C.white;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 1.1;
      ctx.stroke(edges);
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 1.4;
      ctx.stroke(zl);
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1;
      ctx.stroke(ml);
      ctx.restore();
    }
    // myoblasts drift in on twos to their places along the templates, then fuse into the fibres as nuclei
    const gather = L.ease.inOutSine(L.clamp(tq / TM.fibres));
    const bi = boilNow();
    for (const nd of MI_NUC) {
      const fused = miFront(tt, nd.k) >= nd.y;
      if (fused) {
        sline(ctx, L.ellipsePts(nd.x, nd.y, 2.4, 5.5, 14), { closed: true, color: C.white, alpha: 0.85, width: 1.1, amp: 0 });
        dots(ctx, [[nd.x, nd.y, 1.2]], C.white, 0.8);
        continue;
      }
      const jx = (L.h3(nd.seed, bi, 5) - 0.5) * 0.8, jy = (L.h3(bi, nd.seed, 6) - 0.5) * 0.8;
      const x = L.lerp(nd.sx, nd.x, gather) + jx, y = L.lerp(nd.sy, nd.y, gather) + jy;
      sline(ctx, circlePts(x, y, 3.6, 12), { closed: true, alpha: 0.75, width: 1.1, amp: 0 });
      dots(ctx, [[x, y, 1.5]], C.lav, 0.9);
    }
    ctx.restore();
    // one sarcomere measured once the fibres are complete
    const bp = L.ease.outExpo(L.clamp((tt - (TM.fibres + 8 / 24)) / (6 / 24)));
    if (bp > 0) {
      const fx = MI_FIB[4] + 12, z0 = cy - R + ((4 * 5) % 18) + 18 * 4;
      L.bracket(ctx, fx, z0, fx, z0 + 18, { style: 'square', offset: 0, cap: 5, color: C.white, alpha: 0.85, width: 1.3, p: bp });
    }
  }

  function drawIgnites(ctx, tt) {
    for (let i = 0; i < NODES.length; i++) {
      const t0 = TM.ignite[i];
      if (tt < t0) continue;
      const n = NODES[i];
      const [x, y] = n.origin;
      const d = tt - t0;
      // navy knock-out so each origin punches a hole in the sheath / wing / eye braid
      {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, 8.5, 0, TAU);
        ctx.fillStyle = C.navy;
        ctx.globalAlpha = 0.85;
        ctx.fill();
        ctx.restore();
      }
      if (d >= 6 / 24 - 1e-6) {
        // settled: a small hollow ring with four short ticks, so only the newest ignite carries the burst
        sline(ctx, circlePts(x, y, 5, 16), { closed: true, color: C.white, alpha: 0.6, width: 1.5, amp: 0 });
        L.ticks(ctx, x, y, { r: 8, n: 4, len: 8, rot: i * 0.13 + 0.26 + Math.PI / 4, color: C.white, alpha: 0.7, width: 1.5 });
        continue;
      }
      const e = L.ease.outExpo(L.clamp(d / (6 / 24)));
      const pop = d < 2 / 24 ? L.ease.outBack((d + 1 / 24) / (3 / 24)) : 1;
      L.glowDot(ctx, x, y, 8.5 * pop, { rays: 8, rayLen: L.lerp(3.2, 1.5, e), glow: 4.7, intensity: L.lerp(1.3, 0.75, e), seed: SEED + 1600 + i });
      L.ticks(ctx, x, y, { r: L.lerp(12, 19, e), n: 12, len: L.lerp(22, 14, e), rot: i * 0.13 + 0.26, color: C.white, alpha: L.lerp(1, 0.7, e), width: 1.5 });
      if (d < 8 / 24) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, L.lerp(14, 52, e), 0, TAU);
        ctx.strokeStyle = C.white;
        ctx.globalAlpha = 0.6 * (1 - d / (8 / 24));
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  function drawFlash(ctx, tt) {
    const d = tt - TM.flash;
    if (d < 0 || d >= 10 / 24) return;
    const cx = AX, cy = NODES[3].y;
    const e = L.ease.outExpo(d / (10 / 24));
    const a = 1 - d / (10 / 24);
    ctx.save();
    ctx.strokeStyle = C.mag;
    ctx.lineWidth = 3;
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(cx, cy, L.lerp(58, 118, e), 0, TAU);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = a * 0.6;
    ctx.beginPath();
    ctx.arc(cx, cy, L.lerp(58, 150, e), 0, TAU);
    ctx.stroke();
    ctx.restore();
    L.glowDot(ctx, cx, cy, 6, { color: C.mag, core: '#ffe0ef', rays: 16, rayLen: 3, rayWidth: 0.16, glow: 6, intensity: a * 0.8, seed: SEED + 1700 });
  }

  function drawCycleGlyph(ctx) {
    const cx = 900, cy = 300, r = 44;
    const gapA = 0.14;
    for (let k = 0; k < 4; k++) {
      const a0 = -Math.PI / 2 + (k * Math.PI) / 2 + gapA;
      const a1 = a0 + Math.PI / 2 - 2 * gapA;
      const cur = k === 2;
      const pts = circlePts(cx, cy, r, 20, a0, a1 - a0);
      sline(ctx, pts, { color: cur ? C.white : C.lav, alpha: cur ? 1 : 0.25, width: cur ? 2.6 : 2, seed: SEED + 1800 + k, amp: 0.3 });
    }
    const p = new Path2D();
    for (let k = 0; k < 4; k++) {
      const a = -Math.PI / 2 + (k * Math.PI) / 2;
      p.moveTo(cx + Math.cos(a) * (r - 7), cy + Math.sin(a) * (r - 7));
      p.lineTo(cx + Math.cos(a) * (r + 7), cy + Math.sin(a) * (r + 7));
    }
    ctx.save();
    ctx.strokeStyle = C.lav;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1.5;
    ctx.stroke(p);
    ctx.restore();
    L.guideCircle(ctx, cx, cy, 30, { alpha: 0.12, width: 1, dash: [2, 4] });
    const am = Math.PI * 0.75;
    L.glowDot(ctx, cx + Math.cos(am) * r, cy + Math.sin(am) * r, 3.5, { rays: 0, glow: 5, intensity: 0.7, seed: SEED + 1810 });
  }

  // ---------------------------------------------------------------------------
  // Scene
  // ---------------------------------------------------------------------------
  FILM.scene({
    id: ID,
    draw(ctx, t, info) {
      const dur = info.dur;
      const tt = L.clamp(t, 0, dur);
      const tq = L.onTwos(tt);

      drawBackdrop(ctx, tt, dur);
      drawTwig(ctx);
      drawCycleGlyph(ctx);
      drawBracket(ctx);

      // inside the case
      ctx.save();
      ctx.beginPath();
      L.tracePath(ctx, OUTER, true);
      ctx.fillStyle = C.navy;
      ctx.globalAlpha = 0.45;
      ctx.fill();
      ctx.restore();
      drawTissue(ctx, tq);
      drawRings(ctx);
      drawGut(ctx, tq);
      drawSegments(ctx, tq, tt);
      drawWingPad(ctx, tq, tt);
      drawPrimordia(ctx, tt);
      drawNerveCord(ctx, tq, tt);
      drawFlightZone(ctx, tt);
      drawCase(ctx);
      drawSegmentMarks(ctx, tq, tt);
      drawMeasures(ctx, tq);
      drawSection(ctx, tq, tt);
      drawMuscleInset(ctx, tq, tt);

      drawNetwork(ctx, tt, tq);
      drawIgnites(ctx, tt);
      drawFlash(ctx, tt);
    },
  });
})();
