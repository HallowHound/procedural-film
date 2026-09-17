// Shot 09 eclosion: "Emergence". Illustrated, global T 16.0 to 18.0 (2.0 s).
// The G3 shell tears open along its bottom, the adult comes out head first, swings up to grip the
// torn rim and hangs on G4, pumps its crumpled wings to full size on three beats (16.5, 17.0, 17.5)
// and releases its meconium on 17.75.
// Layers, back to front:
//   1. stripes (stripeCream / stripeApricot), dust, 08's milkweed leaf (clipped), construction
//   2. cast shadow, twig with stub and bud (as in 08), silk pad, cremaster
//   3. the shell: 08's dark case on the first drawing, then a clear empty skin torn at y 872 (as in 10)
//   4. the adult: hindwing, body, forewing, legs on the torn flaps, antennae, proboscis halves, meconium
//   5. overlays: annBlue vein pulses, swing and shake arcs, drip line; annYellow rings, arc, ruler
(function () {
  'use strict';
  const FILM = window.FILM;
  const L = FILM.lib;
  const TAU = Math.PI * 2;
  const ID = 'eclosion';
  const ID08 = 'chrysalis-days';

  const C = [540, 995]; // G4 thorax centre (pose origin)
  const WB = [565, 985]; // G4 forewing base (wing growth origin)
  const PUMPS = [0.5, 1.0, 1.5];
  const SIZES = [0.35, 0.55, 0.8, 1.0];
  const TWELFTH = 1 / 12;
  const EPS = 1e-6;

  const lerp = (a, b, u) => a + (b - a) * u;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const sd = (...k) => L.hash(ID, ...k);

  // ---------------------------------------------------------------------------
  // polyline helpers
  // ---------------------------------------------------------------------------
  function cumLen(pts) {
    const c = [0];
    for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return c;
  }
  function pointAt(pts, cum, d) {
    if (d <= 0) return pts[0].slice();
    const n = pts.length - 1;
    if (d >= cum[n]) return pts[n].slice();
    let i = 1;
    while (i < n && cum[i] < d) i++;
    const u = (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
    return [lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)];
  }
  function subPath(pts, cum, d0, d1) {
    const out = [pointAt(pts, cum, d0)];
    for (let i = 0; i < pts.length; i++) if (cum[i] > d0 && cum[i] < d1) out.push(pts[i]);
    out.push(pointAt(pts, cum, d1));
    return out;
  }
  function tracePoly(ctx, pts) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, pts[i][0], pts[i][1]);
    ctx.closePath();
  }
  function fillPoly(ctx, pts, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    tracePoly(ctx, pts);
    ctx.fill();
    ctx.restore();
  }
  // unit normals of an open polyline, flipped to point toward (cx, cy)
  function normalsToward(pts, cx, cy) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let nx = -(b[1] - a[1]), ny = b[0] - a[0];
      const l = Math.hypot(nx, ny) || 1;
      nx /= l;
      ny /= l;
      if ((cx - pts[i][0]) * nx + (cy - pts[i][1]) * ny < 0) {
        nx = -nx;
        ny = -ny;
      }
      out.push([nx, ny]);
    }
    return out;
  }
  // a band polygon inside a margin polyline: outer edge pushed out by ext, inner edge in by width(u)
  function bandLocal(pts, normals, widthFn, ext) {
    const cum = cumLen(pts);
    const T = cum[cum.length - 1] || 1;
    const outer = [], inner = [];
    for (let i = 0; i < pts.length; i++) {
      const u = cum[i] / T;
      const [nx, ny] = normals[i];
      outer.push([pts[i][0] - nx * ext, pts[i][1] - ny * ext]);
      inner.push([pts[i][0] + nx * widthFn(u), pts[i][1] + ny * widthFn(u)]);
    }
    return outer.concat(inner.reverse());
  }
  function distPts(pts, x, y) {
    let m = Infinity;
    for (let i = 1; i < pts.length; i++) {
      const ax = pts[i - 1][0], ay = pts[i - 1][1];
      const vx = pts[i][0] - ax, vy = pts[i][1] - ay;
      const l2 = vx * vx + vy * vy || 1;
      let u = ((x - ax) * vx + (y - ay) * vy) / l2;
      u = u < 0 ? 0 : u > 1 ? 1 : u;
      const dx = ax + vx * u - x, dy = ay + vy * u - y;
      const dd = dx * dx + dy * dy;
      if (dd < m) m = dd;
    }
    return Math.sqrt(m);
  }
  function strokePts(ctx, pts, color, width, alpha, dash, dashOffset) {
    if (pts.length < 2 || alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(alpha);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dash) {
      ctx.setLineDash(dash);
      ctx.lineDashOffset = dashOffset || 0;
    }
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
    ctx.restore();
  }
  function ring(ctx, x, y, r, color, width, alpha) {
    if (alpha <= 0 || r <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(alpha);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  function arcStroke(ctx, x, y, r, a0, a1, color, width, alpha, dash) {
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = clamp(alpha);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.arc(x, y, r, a0, a1, a1 < a0);
    ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // G3 case, torn open at y 872 exactly as shot 10 draws it
  // ---------------------------------------------------------------------------
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
  const G3 = [[332, 35], [380, 72], [440, 106], [500, 124], [600, 130], [700, 127], [800, 108], [860, 78], [895, 36], [905, 0]];
  const hw3 = monotone(G3);
  const SPLIT_Y = 872;
  const XL = 540 - hw3(SPLIT_Y), XR = 540 + hw3(SPLIT_Y);
  // shot 10's torn flaps, relative to the flap roots (XL, 872) and (XR, 872)
  const JAG_L = [[3, 9], [10, 7], [15, 15], [22, 13], [28, 21], [35, 20]];
  const JAG_R = [[3, 9], [10, 7], [16, 16], [23, 14], [29, 22], [36, 21]];
  const SIDE_L = [], SIDE_R = [];
  for (let y = 332; y <= SPLIT_Y; y += 7) {
    SIDE_L.push([540 - hw3(y), y]);
    SIDE_R.push([540 + hw3(y), y]);
  }
  const SHELL_IN_L = [], SHELL_IN_R = [];
  for (let y = 346; y <= SPLIT_Y - 8; y += 8) {
    SHELL_IN_L.push([540 - hw3(y) + 9, y]);
    SHELL_IN_R.push([540 + hw3(y) - 9, y]);
  }

  // bend: extra outward rotation of the flaps (radians) while the adult pushes through
  function shellGeom(bend) {
    const c = Math.cos(bend), s = Math.sin(bend);
    const jl = JAG_L.map(([dx, dy]) => [XL + dx * c - dy * s, SPLIT_Y + dx * s + dy * c]);
    const jr = JAG_R.map(([dx, dy]) => [XR - (dx * c - dy * s), SPLIT_Y + dx * s + dy * c]);
    const lt = jl[jl.length - 1], rt = jr[jr.length - 1];
    const bot = Math.max(lt[1], rt[1]) + 4;
    const open = jl.slice().reverse().concat(SIDE_L.slice().reverse(), [[526, 331], [554, 331]], SIDE_R, jr);
    const outline = open.concat([[lerp(rt[0], lt[0], 0.3), bot], [lerp(rt[0], lt[0], 0.7), bot]]);
    // the inside of the tear: a dark sliver along the jag line and across the opening
    const up = (p, k) => [p[0] + (p[0] < 540 ? 1 : -1) * k * 0.3, p[1] - k];
    const sliver = [[XL, SPLIT_Y]].concat(
      jl,
      [[lerp(lt[0], rt[0], 0.3), bot], [lerp(lt[0], rt[0], 0.7), bot]],
      jr.slice().reverse(),
      [[XR, SPLIT_Y]],
      jr.map((p) => up(p, 5)),
      [[lerp(rt[0], lt[0], 0.3), bot - 6], [lerp(rt[0], lt[0], 0.7), bot - 6]],
      jl.slice().reverse().map((p) => up(p, 5))
    );
    return { open, outline, sliver, jl: [[XL, SPLIT_Y - 1]].concat(jl), jr: [[XR, SPLIT_Y - 1]].concat(jr), lt, rt };
  }
  // ---------------------------------------------------------------------------
  // Set: stripes, dust, construction
  // ---------------------------------------------------------------------------
  function stripeOpts(P, Tg) {
    return { colors: [P.stripeCream, P.stripeApricot], width: 140, angle: -0.52, offset: (Tg / 0.5) * 6, seed: sd('stripes') };
  }
  const DUST_TOP = [[0, 0], [1080, 0], [1080, 222], [0, 222]];
  const DUST_BOT = [[0, 1500], [1080, 1500], [1080, 1920], [0, 1920]];
  function drawBackground(ctx, P, Tg) {
    L.stripes(ctx, stripeOpts(P, Tg));
    // stripe edge ink: a faint ruled line on each band edge, like a pencilled layout
    ctx.save();
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = P.inkSoft;
    ctx.lineWidth = 1;
    const a = -0.52, nx = -Math.sin(a), ny = Math.cos(a);
    const off = ((((Tg / 0.5) * 6) % 280) + 280) % 280;
    ctx.beginPath();
    for (let k = -12; k <= 12; k++) {
      const v = k * 140 + off;
      const cx = 540 + nx * v, cy = 960 + ny * v;
      ctx.moveTo(cx - Math.cos(a) * 1300, cy - Math.sin(a) * 1300);
      ctx.lineTo(cx + Math.cos(a) * 1300, cy + Math.sin(a) * 1300);
    }
    ctx.stroke();
    ctx.restore();
    // sparse pencil dust above and below the subject (0.003 dots per px2)
    for (const [poly, k] of [[DUST_TOP, 0], [DUST_BOT, 1]]) {
      L.stipple(ctx, poly, { spacing: 11, r: [0.8, 1.5], color: P.inkFaint, alpha: 0.55, density: 0.33, seed: sd('dust', k) });
    }
  }

  function clipRect(poly, x0, y0, x1, y1) {
    const planes = [
      [(p) => p[0] >= x0, (a, b) => [x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0] || 1)]],
      [(p) => p[0] <= x1, (a, b) => [x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0] || 1)]],
      [(p) => p[1] >= y0, (a, b) => [a[0] + ((b[0] - a[0]) * (y0 - a[1])) / (b[1] - a[1] || 1), y0]],
      [(p) => p[1] <= y1, (a, b) => [a[0] + ((b[0] - a[0]) * (y1 - a[1])) / (b[1] - a[1] || 1), y1]],
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

  // 08's milkweed leaf as full-bleed scenery, clipped to y >= 1470 and x <= 520 so the
  // drop lane (x 540-600) and the wing apex stay clear.
  const YH = 650, KZ = 1270, FX = 1667;
  const LEAF_TIP = [660, 1030];
  const ZT = KZ / (LEAF_TIP[1] - YH);
  const XT = ((LEAF_TIP[0] - 540) * ZT) / FX;
  const TILT = 0.125;
  const AXL = Math.hypot(TILT, 1);
  const AX = -TILT / AXL, AZ = -1 / AXL;
  const NX = -AZ, NZ = AX;
  const LEAF_S = 2.64, OFF = 0.05, TIP_ROUND = 0.3;
  function lp(s, w) {
    const X = XT + s * AX + w * NX, Z = ZT + s * AZ + w * NZ;
    return [540 + (FX * X) / Z, YH + KZ / Z];
  }
  const lhwFlank = (s) => 0.85 * Math.pow(Math.sin((clamp(s / 2.8) * Math.PI) / 2), 0.8);
  const lhw = (s) => {
    const f = lhwFlank(s), q = Math.max(0, s);
    return Math.sqrt(f * f + TIP_ROUND * q * Math.exp(-q / 0.12));
  };

  let LEAF09 = null;
  function leafGeom() {
    if (LEAF09) return LEAF09;
    const r = L.rng(L.hash(ID08, 'leaf'));
    const wave = (s, side) => 0.0035 * Math.sin(s * 19 + side * 1.3) + 0.002 * L.noise1(s * 6, side > 0 ? 71 : 72);
    const hwv = (s, side) => (s <= 0 ? 0 : Math.max(0, lhw(s) + wave(s, side) * clamp(s / 0.3)));
    const R = [], Lf = [];
    const N = 150;
    for (let k = 0; k <= N; k++) {
      const s = LEAF_S * Math.pow(k / N, 1.7);
      R.push(lp(s, hwv(s, 1)));
      Lf.push(lp(s, -hwv(s, -1)));
    }
    const raw = R.concat([[3200, 3000], [-2000, 3000]]).concat(Lf.slice().reverse());
    const poly = clipRect(raw, -40, 1470, 520, 1965);
    const rib = [];
    for (let k = 0; k <= 80; k++) {
      const s = 0.02 + (LEAF_S - 0.02) * Math.pow(k / 80, 1.5);
      const lw = 0.004 + (0.009 * s) / LEAF_S;
      const c = lp(s, 0), left = lp(s, -lw), right = lp(s, lw);
      if (c[1] >= 1455 && left[0] <= 525) rib.push({ c, l: left, r: right });
    }
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
    const VEIN_BOW = -0.08;
    const veinAt = (s0, th, side, t, tEnd) => {
      const u = clamp(t / (tEnd || 1));
      return lp(s0 - t * Math.cos(th) + 4 * u * (1 - u) * VEIN_BOW * tEnd, side * t * Math.sin(th));
    };
    const all = [];
    for (const side of [-1, 1]) {
      for (let i = 0; ; i++) {
        const s0 = 0.17 + i * 0.205 + (side > 0 ? 0.08 : 0) + r.range(-0.12, 0.12) * 0.205;
        if (s0 > 2.95) break;
        const th = ((60 + r.range(-4.5, 4.5)) * Math.PI) / 180;
        const tE = endT(s0, th, OFF);
        const pts = [];
        for (let j = 0; j <= 18; j++) pts.push(veinAt(s0, th, side, (j / 18) * tE, tE));
        all.push({ side, s0, th, tE, pts });
      }
    }
    const vis = all.filter((v) => v.pts.some((p) => p[1] >= 1470 && p[0] <= 520));
    const net = [];
    const leftV = vis.filter((v) => v.side < 0);
    for (let i = 0; i < leftV.length - 1; i++) {
      const V = leftV[i], U = leftV[i + 1];
      for (let q = 0; q < 4; q++) {
        const ta = V.tE * r.range(0.15, 0.8);
        const tb = ta + (U.s0 - V.s0) * Math.cos(V.th) + r.range(-0.02, 0.02);
        if (tb > U.tE * 0.95 || tb < 0) continue;
        const a = veinAt(V.s0, V.th, -1, ta, V.tE);
        const b = veinAt(U.s0, U.th, -1, tb, U.tE);
        if (Math.max(a[1], b[1]) < 1470 || Math.min(a[0], b[0]) > 520) continue;
        net.push([a, [(a[0] + b[0]) / 2 + r.range(-8, 8), (a[1] + b[1]) / 2 + r.range(-6, 6)], b]);
      }
    }
    const edge = Lf.filter((p) => p[1] >= 1460 && p[0] <= 530);
    LEAF09 = { poly, rib, veins: vis.map((v) => v.pts), net, edge };
    return LEAF09;
  }

  function drawLeaf(ctx, P) {
    const g = leafGeom();
    if (!g.poly || g.poly.length < 4) return;
    fillPoly(ctx, g.poly, P.milkweed);
    ctx.save();
    clipPoly(ctx, g.poly);
    L.hatch(ctx, g.poly, {
      angle: 2.4, spacing: 8, width: 1.4, color: P.milkweedDeep, alpha: 0.8,
      length: [24, 80], gap: [3, 10], seed: sd('leafHatch'),
    });
    ctx.save();
    ctx.strokeStyle = P.milkweedPale;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const [a, m, b] of g.net) {
      ctx.moveTo(a[0], a[1]);
      ctx.quadraticCurveTo(m[0], m[1], b[0], b[1]);
    }
    ctx.stroke();
    ctx.restore();
    for (let i = 0; i < g.veins.length; i++) {
      L.inkPath(ctx, g.veins[i], { width: 2.2, color: P.milkweedPale, alpha: 0.95, seed: sd('lv', i), taper: [6, 30], wobble: 0.7 });
    }
    if (g.rib.length > 2) {
      const Lp = g.rib.map((q) => q.l), Rp = g.rib.map((q) => q.r);
      fillPoly(ctx, Lp.concat(Rp.slice().reverse()), P.milkweedPale);
      L.inkPath(ctx, Lp, { width: 3, color: P.ink, seed: sd('leafRib'), taper: [20, 10] });
    }
    ctx.restore();
    if (g.edge.length > 1) L.inkPath(ctx, g.edge, { width: 3, color: P.ink, seed: sd('leafEdge'), taper: [10, 10] });
    // soften the knife-cuts at y 1470 and x 520 so the patch reads as leaf, not a panel
    ctx.save();
    clipPoly(ctx, g.poly);
    ctx.globalCompositeOperation = 'destination-out';
    const fadeT = ctx.createLinearGradient(0, 1470, 0, 1535);
    fadeT.addColorStop(0, 'rgba(0,0,0,1)');
    fadeT.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fadeT;
    ctx.fillRect(-40, 1470, 580, 65);
    const fadeR = ctx.createLinearGradient(485, 0, 520, 0);
    fadeR.addColorStop(0, 'rgba(0,0,0,0)');
    fadeR.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = fadeR;
    ctx.fillRect(485, 1470, 40, 500);
    ctx.restore();
  }

  function drawGuides(ctx, P, s, d, t, landed) {
    const bi = L.boil(L.T);
    const jit = (i, k) => (L.h3(i, bi, k) - 0.5) * 1.2;
    // body axis to the bottom edge, ruled every 46.5 px like the wing ruler
    L.inkPath(ctx, [[540, 334], [540, 1100], [540, 1930]], { width: 1.5, color: P.inkFaint, alpha: 0.5, taper: 0, wobble: 0.8, seed: sd('axis') });
    ctx.save();
    ctx.strokeStyle = P.inkFaint;
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    for (let j = 0; 985 + j * 46.5 <= 1920; j++) {
      const y = 985 + j * 46.5 + jit(j, 3) * 0.5;
      const len = j % 5 === 0 ? 28 : 12;
      ctx.moveTo(540, y);
      ctx.lineTo(540 - len + jit(j, 5), y + jit(j, 7) * 0.4);
    }
    ctx.stroke();
    // grip line across the rim, with end ticks
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(392, 900 + jit(1, 9));
    ctx.lineTo(688, 900 + jit(2, 9));
    for (const x of [392, 688]) {
      ctx.moveTo(x, 888);
      ctx.lineTo(x, 912);
    }
    ctx.stroke();
    // wing-size arcs about the wing base, radial guides to apex and tornus
    ctx.lineWidth = 1.3;
    for (let i = 0; i < 4; i++) {
      ctx.globalAlpha = i <= landed ? 0.6 : 0.3;
      ctx.setLineDash(i === 3 ? [2, 6] : [9, 6]);
      ctx.beginPath();
      ctx.arc(WB[0], WB[1], 516 * SIZES[i], 0.8, 1.95);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.38;
    ctx.beginPath();
    for (const a of [Math.atan2(465, 225), Math.atan2(305, -5)]) {
      ctx.moveTo(WB[0] + Math.cos(a) * 40, WB[1] + Math.sin(a) * 40);
      ctx.lineTo(WB[0] + Math.cos(a) * 720, WB[1] + Math.sin(a) * 720);
    }
    ctx.stroke();
    // a long pendulum arc from the cremaster, and a second family about the grip point
    ctx.globalAlpha = 0.32;
    ctx.setLineDash([3, 7]);
    ctx.beginPath();
    ctx.arc(540, 300, 1250, 1.2, 1.94);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    for (const r of [700, 900]) {
      ctx.moveTo(540 + Math.cos(0.5) * r, 900 + Math.sin(0.5) * r);
      ctx.arc(540, 900, r, 0.5, 2.64);
    }
    // cross ticks where the family crosses the axis, and quarter ticks along it
    for (const r of [700, 900]) {
      for (const a of [Math.PI / 2, Math.PI / 2 - 0.35, Math.PI / 2 + 0.35, Math.PI / 2 - 0.7, Math.PI / 2 + 0.7]) {
        const k = a === Math.PI / 2 ? 16 : 8;
        ctx.moveTo(540 + Math.cos(a) * (r - k), 900 + Math.sin(a) * (r - k));
        ctx.lineTo(540 + Math.cos(a) * (r + k), 900 + Math.sin(a) * (r + k));
      }
    }
    ctx.stroke();
    ctx.restore();
    // long diagonals through the grip point, crossing the whole frame
    L.inkPath(ctx, [[540 - 1100 * 0.5, 900 - 1100 * 0.866], [540 + 1100 * 0.5, 900 + 1100 * 0.866]], { width: 1.3, color: P.inkFaint, alpha: 0.32, taper: 0, wobble: 1, seed: sd('diagA') });
    L.inkPath(ctx, [[540 + 1100 * 0.5, 900 - 1100 * 0.866], [540 - 1100 * 0.5, 900 + 1100 * 0.866]], { width: 1.3, color: P.inkFaint, alpha: 0.32, taper: 0, wobble: 1, seed: sd('diagB') });
    // the full-size wing it will fill, laid in as a light pencil tone
    L.hatch(ctx, FW_OUTLINE, { angle: -Math.PI / 4, spacing: 10, width: 1.3, color: P.inkFaint, alpha: 0.46, length: [20, 60], gap: [4, 12], seed: sd('ghostTone') });
    L.hatch(ctx, HW_OUTLINE, { angle: -1.8326, spacing: 12, width: 1.1, color: P.inkFaint, alpha: 0.4, length: [16, 40], gap: [4, 12], density: (x, y) => (L.polyContains(FW_OUTLINE, x, y) ? 0 : 1), seed: sd('ghostToneH') });
    // growth ghosts: the forewing at 35, 55, 80 and 100 percent, dashed pencil
    for (let i = 0; i < 4; i++) {
      const k = SIZES[i];
      const pts = FW_GHOST.map((p) => [WB[0] + (p[0] - WB[0]) * k, WB[1] + (p[1] - WB[1]) * k]);
      const reached = i <= landed;
      strokePts(ctx, pts, P.inkFaint, 1.5, reached ? 0.5 : 0.72, [6, 7], i * 3);
    }
    // pencil height dimension of the case: extension lines and a divided scale at x 742
    {
      const dim = [[[676, 332], [760, 332]], [[676, 905], [760, 905]], [[742, 332], [742, 905]]];
      for (let i = 1; i < 10; i++) dim.push([[742 - (i % 5 ? 6 : 12), 332 + 57.3 * i], [742 + (i % 5 ? 6 : 12), 332 + 57.3 * i]]);
      for (let i = 0; i < dim.length; i++) L.inkPath(ctx, dim[i], { width: 1.3, color: P.inkFaint, alpha: 0.55, taper: 0, wobble: 0.4, smooth: false, seed: sd('dim', i) });
      L.inkPath(ctx, [[392, 560], [440, 560]], { width: 1.3, color: P.inkFaint, alpha: 0.5, taper: 0, smooth: false, seed: sd('dimW') });
    }
    // shot 10's guide set, so the match cut rhymes
    L.guideCircle(ctx, 560, 1000, 620, { color: P.inkFaint, alpha: 0.35, width: 1.5 });
    L.guideCircle(ctx, 560, 1000, 648, { color: P.inkFaint, alpha: 0.35, width: 1.5, dash: [8, 8] });
    L.ticks(ctx, 560, 1000, { r: 620, n: 72, len: 9, major: 6, majorLen: 22, color: P.inkFaint, alpha: 0.35, width: 1.5, inward: true });
    if (d >= 3) L.guideCircle(ctx, 540, 935, 46, { color: P.inkFaint, alpha: 0.45, width: 1.2, cross: 0, quadrants: 7 });
  }

  // ---------------------------------------------------------------------------
  // Twig, silk pad and cremaster, copied from shot 08 (which copies 06) so nothing moves across the flash
  // ---------------------------------------------------------------------------
  const PX = 540, PY = 300;
  const TWIG_SEED = (L.hash('j-hang') % 100000) + 1000;
  const SILK_SEED = L.hash('j-hang') % 100000;
  const TWIG = (() => {
    const top = [], bot = [];
    for (let x = -60; x <= 1140; x += 12) {
      const f = L.smoothstep(40, 240, Math.abs(x - PX));
      let ty = 235 + f * (8 * L.noise1(x * 0.004 + 1.3, TWIG_SEED + 11) + 2.5 * L.noise1(x * 0.021, TWIG_SEED + 12));
      let by = 300 + f * (6 * L.noise1(x * 0.005 + 7.1, TWIG_SEED + 13) + 2 * L.noise1(x * 0.027, TWIG_SEED + 14));
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
  })();

  function clipPoly(ctx, pts) {
    ctx.beginPath();
    L.tracePath(ctx, pts, true);
    ctx.clip();
  }

  function drawTwig(ctx, P) {
    const seed = TWIG_SEED;
    const tw = TWIG;
    // side shoot rising up-left off the top edge
    const shL = [[262, 250], [228, 180], [176, 90], [120, -10], [96, -60]];
    const shR = [[196, 246], [170, 176], [124, 92], [74, -2], [52, -60]];
    const shPts = L.smoothPts(shL.concat(shR.slice().reverse()), true, 6);
    fillPoly(ctx, shPts, P.bark);
    L.hatch(ctx, shPts, { angle: -2.05, spacing: 7, width: 1.6, color: P.tan, alpha: 0.45, length: [14, 44], seed: seed + 4, density: (x, y) => 1 - clamp((x - 80 - (250 - y) * 0.55) / 40) });
    L.hatch(ctx, shPts, { angle: -2.05, spacing: 4.5, width: 1.3, color: P.ink, alpha: 0.8, length: [20, 70], seed: seed + 3, density: (x, y) => clamp((x - 95 - (250 - y) * 0.55) / 40) });
    L.inkPath(ctx, L.smoothPts(shL, false, 6), { width: 3, seed: seed + 5, taper: [4, 20] });
    L.inkPath(ctx, L.smoothPts(shR, false, 6), { width: 3, seed: seed + 6, taper: [4, 20] });
    L.inkPath(ctx, L.ellipsePts(150, 70, 7, 5, 12, -1.1), { closed: true, width: 1.6, fill: L.mix(P.bark, P.tan, 0.3), seed: seed + 8 });
    // main twig
    fillPoly(ctx, tw.poly, P.bark);
    L.hatch(ctx, tw.poly, { angle: 0.01, spacing: 5.5, width: 1.7, color: P.tan, alpha: 0.55, length: [16, 70], gap: [4, 14], seed: seed + 7, density: (x, y) => 1 - L.smoothstep(240, 270, y + 4 * L.noise1(x * 0.03, seed + 8)) });
    L.hatch(ctx, tw.poly, { angle: 0.015, spacing: 4, width: 1.35, color: P.ink, alpha: 0.85, length: [24, 110], gap: [3, 9], seed: seed + 9, density: (x, y) => L.smoothstep(250, 294, y + 5 * L.noise1(x * 0.02, seed + 10)) });
    L.hatch(ctx, tw.poly, { angle: -0.5, spacing: 4.5, width: 1.2, color: P.ink, alpha: 0.75, length: [8, 16], seed: seed + 15, density: (x, y) => L.smoothstep(280, 302, y) });
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
        L.inkPath(ctx, [[x - rx * 2.4, y + side * ry * 0.4], [x - rx * 1.1, y + side * ry * 1.25], [x, y + side * ry * 1.45], [x + rx * 1.1, y + side * ry * 1.25], [x + rx * 2.4, y + side * ry * 0.4]], { width: 1.3, color: P.ink, alpha: 0.8, seed: s + 5 + side, taper: [12, 12] });
      }
    };
    knot(300, 257, 24, 14, seed + 60);
    knot(822, 279, 18, 11, seed + 70);
    L.inkPath(ctx, tw.top.filter((p) => p[0] < 190), { width: 3, seed: seed + 80, taper: [0, 12] });
    L.inkPath(ctx, tw.top.filter((p) => p[0] > 262), { width: 3, seed: seed + 81, taper: [12, 0] });
    L.inkPath(ctx, tw.bot, { width: 3.4, seed: seed + 82, taper: 0, double: { offset: 4, alpha: 0.35, from: 0.55, to: 0.85 } });
  }

  function drawSilk(ctx, P, front) {
    const seed = SILK_SEED;
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
  function drawCremaster(ctx, P) {
    const seed = SILK_SEED + 3500;
    L.inkPath(ctx, [[PX, PY - 2], [PX, PY + 14], [PX + 1, PY + 34]], { width: 10, color: P.veinBlack, taper: [0, 0], swell: 0, seed, wobble: 0.4 });
    L.inkPath(ctx, [[PX - 9, PY + 1], [PX, PY + 6], [PX + 9, PY + 1]], { width: 3, color: P.veinBlack, seed: seed + 1, taper: [2, 2] });
  }

  // tapered pen stroke through points, appended to a Path2D so many strokes fill in one call (from 08)
  function strokeTo(path, pts, w, taperEnd) {
    const n = pts.length;
    if (n < 2) return;
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
      Ly.push(pts[i][1] + tx * ww);
      Rx.push(pts[i][0] + ty * ww);
      Ry.push(pts[i][1] - tx * ww);
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

  // ---------------------------------------------------------------------------
  // Shot 08's last case (dark, the folded wing showing), for the first drawing under the flash
  // ---------------------------------------------------------------------------
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
    return (y) => A[Math.max(0, Math.min(1999, Math.round(y)))];
  }
  let G08 = null;
  function geo08() {
    if (G08) return G08;
    const g = {};
    const prof = [[540, 327], [575, 332], [612, 380], [646, 440], [664, 500], [670, 600], [667, 700], [648, 800], [618, 860], [576, 895], [540, 905]];
    const right = L.smoothPts(prof, false, 2);
    const rx = edgeLookup(right);
    g.hw = (y) => {
      const v = rx(y);
      return y < 327 || y > 905 || v !== v ? 0 : v - 540;
    };
    const left = right.slice(1, right.length - 1).reverse().map((p) => [1080 - p[0], p[1]]);
    g.caseOutline = right.concat(left);
    g.caseCoarse = L.smoothPts(prof.concat(prof.slice(1, prof.length - 1).reverse().map((p) => [1080 - p[0], p[1]])), true, 10);
    g.wingLine = L.smoothPts([[430, 560], [470, 760], [560, 890]], false, 4);
    g.wingX = edgeLookup(g.wingLine);
    g.sheathRegion = g.wingLine.concat([[600, 905], [600, 960], [360, 960], [360, 560]]);
    g.wingPad = g.wingLine.slice().reverse().concat([[430, 532], [700, 532], [700, 960], [600, 960]]);
    g.wingOff = (y, d) => {
      const x0 = g.wingX(y - 4), x1 = g.wingX(y + 4);
      const tx = (x1 - x0) / 8, l = Math.hypot(tx, 1);
      return [g.wingX(y) + d / l, y - (d * tx) / l];
    };
    const margin = [];
    for (let y = 548; y <= 876; y += 8) margin.push(g.wingOff(y, 17));
    g.marginPts = margin;
    g.rimDots = [];
    for (let i = 0; i < 12; i++) {
      const th = -1.26 + (i / 11) * 2.52;
      const w = g.hw(521);
      g.rimDots.push({ x: 540 + Math.sin(th) * (w - 7), y: 522 + 3 * Math.cos(th), rx: 6 * (0.55 + 0.45 * Math.cos(th)), ry: 6 });
    }
    g.lowDots = [];
    for (let i = 0; i < 5; i++) {
      const x = 495 + i * 22.5;
      g.lowDots.push([x, 850 - 20 * Math.pow((x - 540) / 45, 2), 5]);
    }
    g.lowDots.push([440, 560, 4.5], [459, 562, 4], [621, 562, 4], [640, 560, 4.5]);
    G08 = g;
    return g;
  }
  function contourHatch(ctx, o) {
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
            const u = lerp(a, b, i / 6);
            pts.push([o.cx + w * u, y + o.bow * w * Math.sqrt(Math.max(0, 1 - u * u)) + jb + (i === 6 ? (L.h3(row, bi, o.seed + 1) - 0.5) * 3 : 0)]);
          }
          strokeTo(paths[(r() * 3) | 0], pts, o.width * lerp(0.8, 1.2, r()), true);
        }
      }
      y += o.spacing * (1 + (r() - 0.5) * 0.3);
    }
    fillPaths(ctx, paths, o.color, o.alpha);
  }
  // 08's drawChrysalis on its last drawing: night, fully dark, wing stage 6, all 12 rim dots lit
  function drawDarkCase(ctx, P) {
    const g = geo08();
    const CX = 540;
    const fill = L.mix(P.chrysalisDark, P.nightSky, 0.06);
    const deep = L.mix(P.chrysalisDeep, P.veinBlack, 0.8);
    const hw = g.hw;
    L.inkPath(ctx, g.caseOutline, { closed: true, fill, width: 5, seed: 500, taper: [0, 0], overlap: 30, double: { offset: -6.5, width: 0.3, alpha: 0.55, from: 0.52, to: 0.86 } });
    ctx.save();
    clipPoly(ctx, g.caseCoarse);
    drawWingInside(ctx, P, g);
    const segCol = L.mix(P.chrysalisDark, P.spotWhite, 0.3);
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
    const reach = 0.15;
    const hs = L.hash(ID08, 'ch');
    const hc = deep;
    contourHatch(ctx, { y0: 336, y1: 900, spacing: 6, cx: CX, hw, bow: 0.08, width: 1.8, color: hc, alpha: 0.88, seed: hs, from: (y, row) => reach + 0.14 * L.noise1(row * 0.21, 531) - 0.2 * L.smoothstep(720, 900, y), to: () => 1.02 });
    contourHatch(ctx, { y0: 339, y1: 900, spacing: 6, cx: CX, hw, bow: 0.08, width: 1.5, color: hc, alpha: 0.85, seed: hs + 1, from: (y, row) => reach + 0.4 + 0.12 * L.noise1(row * 0.27, 532) - 0.2 * L.smoothstep(760, 900, y), to: () => 1.02 });
    L.hatch(ctx, g.caseCoarse, { angle: -1.8326, spacing: 7, width: 1.35, color: hc, alpha: 0.85, seed: 540, length: [10, 34], density: (x, y) => L.smoothstep(0.66, 0.8, (x - CX) / (hw(y) || 1)) });
    contourHatch(ctx, { y0: 760, y1: 898, spacing: 6, cx: CX, hw, bow: 0.08, width: 1.4, color: hc, alpha: 0.7, seed: hs + 2, from: () => -1.02, to: (y) => -0.78 + 0.25 * L.smoothstep(780, 900, y) });
    L.stipple(ctx, g.caseCoarse, { spacing: 6.5, r: [0.7, 1.4], color: hc, alpha: 0.6, seed: 545, density: (x, y) => { const u = (x - CX) / (hw(y) || 1); return 0.75 * L.smoothstep(-0.2, 0.2, u) * (1 - L.smoothstep(0.2, 0.5, u)); } });
    L.hatch(ctx, [[400, 522], [680, 522], [680, 550], [400, 550]], { angle: -Math.PI / 4, spacing: 5, width: 1.4, color: hc, alpha: 0.9, seed: 546, length: [6, 18], clip: true, inset: 0, density: (x, y) => 1 - L.smoothstep(536, 550, y) });
    const refl = [];
    for (let y = 420; y <= 860; y += 10) refl.push([CX + hw(y) - 8, y]);
    L.inkPath(ctx, refl, { width: 5, color: L.mix(P.chrysalisDark, P.white, 0.35), alpha: 0.5, seed: 547, taper: [60, 60], wobble: 0.6 });
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
    fillPoly(ctx, band, P.veinBlack);
    L.inkPath(ctx, band.slice(0, 17).map((p) => [p[0], p[1] - 3]), { width: 1.6, color: P.gold, alpha: 0.9, seed: 560, taper: [30, 30] });
    const hl = [[[470, 700], [484, 600]], [[492, 650], [502, 590]]];
    hl.forEach((q, i) => L.inkLine(ctx, q[0][0], q[0][1], q[1][0], q[1][1], { width: 3.5, color: P.white, alpha: 0.75, seed: 570 + i, taper: [6, 10] }));
    L.inkLine(ctx, 450, 474, 472, 418, { width: 4, color: P.white, alpha: 0.6, seed: 573, taper: [6, 10] });
    ctx.restore();
    g.rimDots.forEach((dd) => {
      ctx.beginPath();
      ctx.ellipse(dd.x, dd.y, dd.rx, dd.ry, 0, 0, TAU);
      ctx.fillStyle = P.gold;
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = P.goldLight;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(dd.x - dd.rx * 0.3, dd.y - 2, Math.max(1, dd.rx * 0.36), 0, TAU);
      ctx.fillStyle = P.white;
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.globalAlpha = 1;
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
  function wingVeins08(g) {
    const B = [662, 552];
    const C1 = [618, 744], C2 = [554, 716];
    const mEnd = (y) => g.wingOff(y, 26);
    return [
      [[B, [652, 650], C1], 9, 5.5],
      [[B, [600, 612], C2], 9, 5.5],
      [[C1, [586, 736], C2], 4.5, 4],
      [[[656, 610], [668, 660], [676, 720]], 4.5, 3],
      [[[646, 690], [660, 750], [664, 800]], 4.5, 3],
      [[C1, [634, 800], [632, 846]], 4.5, 3],
      [[C1, [612, 810], [598, 866]], 4.5, 3],
      [[[590, 740], [572, 810], mEnd(868)], 4.5, 3],
      [[[572, 728], [534, 790], mEnd(836)], 4.5, 3],
      [[C2, [510, 766], mEnd(796)], 4.5, 3],
      [[[578, 670], [512, 706], mEnd(724)], 5, 3],
      [[[608, 608], [528, 640], mEnd(656)], 5, 3],
      [[B, [560, 580], mEnd(596)], 6, 3.5],
    ];
  }
  function drawWingInside(ctx, P, g) {
    const CX = 540;
    const glaze = L.mix(P.chrysalisDark, P.veinBlack, 0.3);
    const hw = g.hw;
    ctx.save();
    clipPoly(ctx, g.sheathRegion);
    ctx.fillStyle = glaze;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(360, 540, 260, 380);
    ctx.globalAlpha = 1;
    for (let i = 0; i < 3; i++) {
      const f = 0.25 + i * 0.25;
      const pts = [];
      for (let y = 590; y <= 880; y += 10) pts.push([lerp(CX - hw(y) + 5, g.wingX(y), f), y]);
      L.inkPath(ctx, pts, { width: 1.3, color: L.mix(P.chrysalisDark, P.spotWhite, 0.4), alpha: 0.8, seed: 571 + i, taper: [20, 20] });
    }
    ctx.restore();
    ctx.save();
    clipPoly(ctx, g.wingPad);
    ctx.fillStyle = P.monarch;
    ctx.fillRect(400, 530, 300, 400);
    L.hatch(ctx, g.wingPad, { clip: true, angle: -0.8, spacing: 5, width: 1.3, color: P.monarchDeep, alpha: 0.85, seed: 580, length: [10, 30], density: (x, y) => 0.12 + 0.6 * L.smoothstep(0.35, 0.9, (x - CX) / (hw(y) || 1)) + 0.3 * L.smoothstep(740, 880, y) });
    L.stipple(ctx, g.wingPad, { spacing: 8, r: [0.8, 1.4], color: P.monarchDeep, alpha: 0.7, seed: 581, density: 0.5 });
    wingVeins08(g).forEach((v, i) => L.inkPath(ctx, v[0], { width: v[1], color: P.veinBlack, seed: 585 + i, taper: [0, 0], smooth: true, wobble: 0.7, pressure: (u) => lerp(1, v[2] / v[1], u) }));
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
    fillPoly(ctx, L.smoothPts([[498, 820], [528, 800], [578, 784], [628, 768], [664, 786], [652, 852], [622, 886], [580, 904], [536, 906], [506, 880]], true, 6), P.veinBlack);
    L.inkPath(ctx, g.marginPts, { width: 40, color: P.veinBlack, seed: 610, taper: [4, 4], wobble: 0.6, widthJitter: 0.08, swell: 0 });
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = P.chrysalisDark;
    ctx.fillRect(400, 530, 300, 400);
    ctx.globalAlpha = 1;
    L.hatch(ctx, g.wingPad, { clip: true, angle: -Math.PI / 4, spacing: 4.5, width: 1.3, color: P.chrysalisDark, alpha: 0.8, seed: 615, length: [8, 22], density: (x, y) => L.smoothstep(0.8, 0.97, (x - CX) / (hw(y) || 1)) + L.smoothstep(885, 905, y) });
    contourHatch(ctx, { y0: 540, y1: 900, spacing: 6, cx: CX, hw, bow: 0.08, width: 1.5, color: P.veinBlack, alpha: 0.6, seed: 616, from: (y, row) => 0.45 + 0.15 * L.noise1(row * 0.3, 617), to: () => 1.02 });
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = L.mix(P.spotWhite, P.chrysalisDark, 0.1);
    const ends = [556, 596, 656, 724, 796, 836];
    const rs = L.rng(L.hash(ID08, 'spots'));
    for (let c = 0; c < ends.length - 1; c++) {
      const y0 = ends[c], y1 = ends[c + 1];
      const outer = y1 - y0 > 48 ? [0.3, 0.7] : [0.5];
      for (const f of outer) {
        const y = lerp(y0, y1, f);
        const p = g.wingOff(y, 8.5), q = g.wingOff(y + 4, 8.5);
        ctx.beginPath();
        ctx.ellipse(p[0], p[1], rs.range(4.6, 5.4), rs.range(3.2, 3.8), Math.atan2(q[1] - p[1], q[0] - p[0]), 0, TAU);
        ctx.fill();
      }
      const p = g.wingOff(lerp(y0, y1, 0.5), 26);
      ctx.beginPath();
      ctx.arc(p[0], p[1], rs.range(2.7, 3.2), 0, TAU);
      ctx.fill();
    }
    for (const [x, y, rr] of [[630, 790, 5.2], [612, 800, 5], [594, 809, 4.7], [576, 817, 4.3]]) {
      ctx.beginPath();
      ctx.ellipse(x, y, rr, rr * 0.82, -0.5, 0, TAU);
      ctx.fill();
    }
    for (const [x, y] of [[606, 858], [618, 844], [584, 872]]) {
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, TAU);
      ctx.fillStyle = P.monarchPale;
      ctx.fill();
    }
    ctx.restore();
    ctx.restore();
    L.inkPath(ctx, g.wingLine, { width: 2.6, color: P.veinBlack, alpha: 0.95, seed: 599, taper: [10, 20] });
    ctx.save();
    ctx.globalAlpha = 0.14;
    const lens = [];
    for (let y = 350; y <= 860; y += 20) lens.push([CX - hw(y) + 10, y]);
    for (let y = 860; y >= 350; y -= 20) lens.push([CX - hw(y) * 0.7, y]);
    fillPoly(ctx, lens, P.white);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // The empty skin
  // ---------------------------------------------------------------------------
  const CREASES = [
    [[484, 877], [479, 846], [473, 812]],
    [[510, 871], [505, 838], [510, 800]],
    [[540, 872], [544, 840], [538, 806]],
    [[568, 871], [574, 836], [569, 802]],
    [[596, 877], [601, 846], [607, 816]],
  ];
  // 08's dot layout, dulled
  const RIM_DOTS = (() => {
    const g = { hw: (y) => hw3(y) };
    const out = [];
    for (let i = 0; i < 12; i++) {
      const th = -1.26 + (i / 11) * 2.52;
      out.push([540 + Math.sin(th) * (g.hw(521) - 7), 522 + 3 * Math.cos(th), 6 * (0.55 + 0.45 * Math.cos(th)), 6]);
    }
    for (let i = 0; i < 5; i++) {
      const x = 495 + i * 22.5;
      out.push([x, 850 - 20 * Math.pow((x - 540) / 45, 2), 5, 5]);
    }
    out.push([440, 560, 4.5, 4.5], [459, 562, 4, 4], [621, 562, 4, 4], [640, 560, 4.5, 4.5]);
    return out;
  })();

  function drawShellBack(ctx, P, g) {
    // a thin mist glaze so the stripes read through the empty skin
    fillPoly(ctx, g.outline, P.mist, 0.1);
    // the back wall seen through the skin, 9 px inside the silhouette
    L.inkPath(ctx, SHELL_IN_L, { width: 1.3, color: P.inkSoft, alpha: 0.35, taper: [30, 14], wobble: 0.8, seed: sd('inL') });
    L.inkPath(ctx, SHELL_IN_R, { width: 1.3, color: P.inkSoft, alpha: 0.35, taper: [30, 14], wobble: 0.8, seed: sd('inR') });
    // the inside of the torn opening
    L.inkPath(ctx, g.sliver, { closed: true, width: 1.2, color: P.ink, alpha: 0.8, fill: L.mix(P.ink, P.inkSoft, 0.35), fillAlpha: 0.85, smooth: false, wobble: 0.3, seed: sd('sliver') });
  }

  function drawShellFront(ctx, P, g) {
    const poly = g.outline;
    // shadow side only: contour hatch, a 105-degree cross layer at the far edge, stipple
    L.hatch(ctx, poly, {
      angle: 0.08, spacing: 7, width: 1.25, color: P.inkSoft, alpha: 0.62, bend: 1.2, length: [18, 52], gap: [2, 5],
      density: (x) => L.smoothstep(580, 645, x) * 0.95, seed: sd('shellHatch'),
    });
    L.hatch(ctx, poly, { angle: -1.8326, spacing: 7, width: 1.15, color: P.inkSoft, alpha: 0.5, length: [10, 26], density: (x) => L.smoothstep(622, 664, x), seed: sd('shellCross') });
    L.stipple(ctx, poly, { spacing: 10, r: [0.7, 1.3], color: P.inkFaint, alpha: 0.45, density: (x) => 0.06 + 0.5 * L.smoothstep(560, 660, x), seed: sd('shellSt') });
    ctx.save();
    clipPoly(ctx, poly);
    // rim band at y 515, translucent now
    const band = [];
    const wTop = hw3(510), wBot = hw3(520);
    for (let j = 0; j <= 16; j++) {
      const u = -1.05 + (j / 16) * 2.1;
      band.push([540 + wTop * u, 510 + 3 * Math.sqrt(Math.max(0, 1 - u * u))]);
    }
    for (let j = 16; j >= 0; j--) {
      const u = -1.05 + (j / 16) * 2.1;
      band.push([540 + wBot * u, 520 + 3 * Math.sqrt(Math.max(0, 1 - u * u))]);
    }
    fillPoly(ctx, band, L.mix(P.veinBlack, P.mist, 0.3), 0.72);
    // highlight hatches on the lit upper left
    L.hatch(ctx, [[452, 360], [500, 345], [500, 470], [440, 480]], { angle: -1.25, spacing: 9, width: 1.6, color: P.white, alpha: 0.8, length: [30, 60], seed: sd('glint') });
    L.hatch(ctx, [[438, 560], [470, 560], [470, 700], [436, 700]], { angle: -1.45, spacing: 10, width: 1.4, color: P.white, alpha: 0.6, length: [24, 50], seed: sd('glint2') });
    ctx.restore();
    const dull = L.mix(P.gold, P.mist, 0.5);
    ctx.save();
    for (const [x, y, rx, ry] of RIM_DOTS) {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = dull;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = P.inkSoft;
      ctx.globalAlpha = 0.5;
      ctx.stroke();
    }
    ctx.restore();
    // empty sheaths of the antennae, proboscis and legs moulded in the cuticle
    const sheath = { width: 1.5, color: P.inkSoft, alpha: 0.5, taper: [24, 24] };
    L.inkPath(ctx, [[478, 590], [492, 700], [508, 780], [516, 832]], Object.assign({ seed: sd('sh', 1) }, sheath));
    L.inkPath(ctx, [[602, 590], [588, 700], [572, 780], [564, 832]], Object.assign({ seed: sd('sh', 2) }, sheath));
    L.inkPath(ctx, [[540, 650], [539, 740], [540, 800]], Object.assign({ seed: sd('sh', 3) }, sheath));
    L.inkPath(ctx, [[512, 690], [522, 760], [528, 806]], Object.assign({ seed: sd('sh', 4) }, sheath, { alpha: 0.32 }));
    L.inkPath(ctx, [[568, 690], [558, 760], [552, 806]], Object.assign({ seed: sd('sh', 5) }, sheath, { alpha: 0.32 }));
    // wing-case line, ending where the case tore
    L.inkPath(ctx, [[430, 560], [446, 660], [470, 760], [498, 830]], { width: 1.8, color: P.inkSoft, alpha: 0.6, seed: sd('wcl'), taper: [20, 30] });
    // cremaster-end segment rings, faint
    for (const [y, w] of [[372, 62], [404, 88], [440, 104]]) {
      L.inkPath(ctx, [[540 - w, y], [540, y + 7], [540 + w, y]], { width: 1.4, color: P.inkSoft, alpha: 0.45, seed: sd('seg', y), taper: [16, 16] });
    }
    // crumple creases radiating up from the tear
    for (let i = 0; i < CREASES.length; i++) {
      L.inkPath(ctx, CREASES[i], { width: 1.5, color: P.inkSoft, alpha: 0.85, smooth: false, taper: [3, 14], wobble: 0.6, seed: sd('crease', i) });
    }
    // outline: faint ink with an occasional retrace; the torn edges as hard zigzags
    L.inkPath(ctx, g.open, { width: 3, color: P.ink, alpha: 0.66, seed: sd('shellLine'), taper: [6, 6], double: { alpha: 0.3, from: 0.3, to: 0.62 } });
    L.inkPath(ctx, g.jl, { width: 1.8, color: P.ink, alpha: 0.95, seed: sd('tornL'), smooth: false, taper: [2, 5], wobble: 0.3 });
    L.inkPath(ctx, g.jr, { width: 1.8, color: P.ink, alpha: 0.95, seed: sd('tornR'), smooth: false, taper: [2, 5], wobble: 0.3 });
  }

  // ---------------------------------------------------------------------------
  // Wing templates, authored at full G4 size in frame coordinates
  // ---------------------------------------------------------------------------
  const FW_ENDS = [0.03, 0.12, 0.27, 0.43, 0.6, 0.8, 0.97];
  const FW_IN = [0.571, -0.821]; // inward normal of the forewing outer margin
  function fwMargin(f) {
    const px = 790 - 230 * f, py = 1450 - 160 * f;
    const ends = [0].concat(FW_ENDS, [1]);
    let k = 0;
    while (k < ends.length - 2 && f > ends[k + 1]) k++;
    const w = (f - ends[k]) / Math.max(1e-6, ends[k + 1] - ends[k]);
    const b = 10 * Math.sin(Math.PI * f) + 3 * Math.sin(Math.PI * clamp(w));
    return [px - FW_IN[0] * b, py - FW_IN[1] * b];
  }
  const M = fwMargin;
  const marginRun = (f0, f1, n = 8) => {
    const out = [];
    for (let i = 0; i <= n; i++) out.push(M(lerp(f0, f1, i / n)));
    return out;
  };
  const FW_COSTA = [[565, 985], [588, 1000], [625, 1045], [670, 1110], [712, 1185], [745, 1260], [770, 1335], [784, 1400], [790, 1450]];
  const FW_INNER = [[560, 1290], [558, 1200], [560, 1100], [562, 1030]];
  const FW_MARGIN = [];
  for (let i = 1; i <= 40; i++) FW_MARGIN.push(M(i / 40));
  const FW_OUTLINE = L.smoothPts(FW_COSTA.concat(FW_MARGIN.slice(0, 39), FW_INNER), true, 7);
  const FW_GHOST = FW_OUTLINE.concat([FW_OUTLINE[0]]);

  const VS = (p) => L.smoothPts(p, false, 12);
  const V = {
    Sc: VS([[567, 990], [615, 1035], [668, 1100], [712, 1175], [744, 1250]]),
    R: VS([[570, 995], [612, 1040], [655, 1100], [690, 1168]]),
    DC: VS([[690, 1168], [668, 1178], [648, 1186], [628, 1190]]),
    Cu: VS([[569, 1005], [574, 1060], [596, 1130], [628, 1190]]),
    R1: VS([[662, 1112], [712, 1196], [760, 1300]]),
    R2: VS([[680, 1148], [730, 1240], [774, 1352]]),
    R35: VS([[690, 1168], [724, 1245], [748, 1300]]),
    R3: VS([[748, 1300], [770, 1360], [786, 1414]]),
    R45: VS([[748, 1300], [768, 1380], M(0.03)]),
    M1: VS([[690, 1168], [730, 1272], M(0.12)]),
    M2: VS([[668, 1178], [701, 1284], M(0.27)]),
    M3: VS([[648, 1186], [667, 1290], M(0.43)]),
    Cu1: VS([[618, 1172], [631, 1266], M(0.6)]),
    Cu2: VS([[599, 1138], [603, 1236], M(0.8)]),
    A2: VS([[566, 1000], [565, 1150], M(0.97)]),
  };
  const FW_VEINS = [
    { p: V.Sc, w: 0.5 }, { p: V.R, w: 0.8 }, { p: V.DC, w: 0.6 }, { p: V.Cu, w: 0.8 }, { p: V.R1, w: 0.6 }, { p: V.R2, w: 0.6 },
    { p: V.R35, w: 0.75 }, { p: V.R3, w: 0.55 }, { p: V.R45, w: 0.55 }, { p: V.M1, w: 0.72 }, { p: V.M2, w: 0.72 }, { p: V.M3, w: 0.72 },
    { p: V.Cu1, w: 0.82 }, { p: V.Cu2, w: 0.82 }, { p: V.A2, w: 0.6 },
  ];
  const rev = (a) => a.slice().reverse();
  // orange cells between veins, each with its left (inner-margin side) and right (costa side) vein
  const FW_CELLS = [
    { poly: V.A2.concat(marginRun(0.97, 0.8), rev(V.Cu2), [[588, 1100], [575, 1052], [569, 1005]]), left: V.A2, right: V.Cu2, cross: true },
    { poly: V.Cu2.concat(marginRun(0.8, 0.6), rev(V.Cu1), [[608, 1156]]), left: V.Cu2, right: V.Cu1, cross: true },
    { poly: V.Cu1.concat(marginRun(0.6, 0.43), rev(V.M3), [[628, 1190]]), left: V.Cu1, right: V.M3 },
    { poly: V.M3.concat(marginRun(0.43, 0.27), rev(V.M2), [[658, 1182]]), left: V.M3, right: V.M2 },
    { poly: V.M2.concat(marginRun(0.27, 0.12), rev(V.M1), [[679, 1173]]), left: V.M2, right: V.M1 },
    { poly: V.Cu.concat(rev(V.DC), rev(V.R)), left: V.Cu, right: V.R, discal: true },
    { poly: V.R.concat(V.R35, V.R3, rev(FW_COSTA)), left: V.R.concat(V.R35, V.R3), right: FW_COSTA, costa: true },
  ];
  const DISCAL = V.R.concat(V.DC.slice(1), rev(V.Cu).slice(1));

  const addN = (p, n, d) => [p[0] + n[0] * d, p[1] + n[1] * d];
  const FW_SPOTS = (() => {
    const s = [];
    const ends = [0.02].concat(FW_ENDS, [1]);
    for (let k = 0; k < ends.length - 1; k++) {
      const a = ends[k], b = ends[k + 1], m = (a + b) / 2, w = 42 - 12 * m;
      if (k > 0) s.push(addN(M(m), FW_IN, w * 0.64).concat([6.5 - 1.5 * m]));
      s.push(addN(M(a + (b - a) * 0.3), FW_IN, w * 0.26).concat([3.6]));
      s.push(addN(M(a + (b - a) * 0.72), FW_IN, w * 0.26).concat([3.6]));
    }
    // subapical band on the yellow-brown tip
    for (const [f, r] of [[0.2, 5.5], [0.29, 6.5], [0.37, 5.5]]) s.push(addN(M(f), FW_IN, 62).concat([r]));
    return s;
  })();
  const FW_APEX = [[748, 1268], [770, 1335], [784, 1400], [792, 1452], M(0.1), M(0.2), M(0.3), M(0.4), [695, 1345], [715, 1305]];
  const FW_BANDS = [
    { pts: FW_MARGIN.slice(0, 40), inward: FW_MARGIN.map(() => FW_IN), width: (u) => 42 - 12 * u, ext: 10 },
    { pts: L.smoothPts(FW_COSTA, false, 12), center: [640, 1220], width: (u) => 4 + 11 * u * u, ext: 10 },
    { pts: L.smoothPts(FW_INNER.concat([[565, 985]]), false, 12), center: [660, 1150], width: () => 5, ext: 10 },
  ];
  // the stretch of the forewing margin that lies over the hindwing lobe, pushed 3.5 px outward
  const FW_OVER_HW = [];
  for (let i = 0; i <= 30; i++) {
    const p = M(lerp(0.12, 1, i / 30));
    FW_OVER_HW.push([p[0] - FW_IN[0] * 3.6, p[1] - FW_IN[1] * 3.6]);
  }

  const HW_OUTLINE_RAW = [[570, 1005], [600, 1015], [645, 1060], [688, 1130], [722, 1220], [745, 1300], [748, 1345], [735, 1378], [710, 1400], [670, 1414], [620, 1420], [592, 1410], [576, 1385], [570, 1340], [570, 1200], [570, 1080]];
  const HW_OUTLINE = L.smoothPts(HW_OUTLINE_RAW, true, 7);
  const HW_MARGIN = L.smoothPts([[745, 1300], [748, 1345], [735, 1378], [710, 1400], [670, 1414], [620, 1420], [592, 1410], [576, 1385]], false, 10);
  const HW_VEINS = [
    { p: [[575, 1012], [630, 1120], [660, 1215]], w: 0.9 },
    { p: [[660, 1215], [650, 1230], [640, 1240]], w: 0.6 },
    { p: [[640, 1240], [605, 1200], [580, 1100], [572, 1010]], w: 0.9 },
    { p: [[640, 1080], [700, 1150], [745, 1250], [762, 1330]], w: 0.75 },
    { p: [[660, 1215], [712, 1300], [746, 1374]], w: 0.85 },
    { p: [[652, 1225], [690, 1320], [708, 1401]], w: 0.85 },
    { p: [[640, 1240], [656, 1330], [668, 1414]], w: 0.85 },
    { p: [[622, 1224], [622, 1330], [621, 1420]], w: 0.85 },
    { p: [[605, 1200], [592, 1300], [585, 1403]], w: 0.85 },
    { p: [[580, 1110], [572, 1250], [571, 1352]], w: 0.8 },
  ].map((v) => ({ p: L.smoothPts(v.p, false, 12), w: v.w }));
  const HW_BANDS = [{ pts: HW_MARGIN, center: [660, 1250], width: () => 16, ext: 10 }];
  const HW_SPOTS = (() => {
    const s = [];
    const nrm = normalsToward(HW_MARGIN, 660, 1250);
    const cum = cumLen(HW_MARGIN);
    const T = cum[cum.length - 1];
    const idx = (d) => {
      let i = 0;
      while (i < cum.length - 1 && cum[i] < d) i++;
      return i;
    };
    for (let k = 0; k < 11; k++) {
      const d = T * (0.05 + (0.9 * k) / 10);
      s.push(addN(pointAt(HW_MARGIN, cum, d), nrm[idx(d)], 4.5).concat([2.4]));
    }
    for (let k = 0; k < 6; k++) {
      const d = T * (0.12 + (0.76 * k) / 5);
      s.push(addN(pointAt(HW_MARGIN, cum, d), nrm[idx(d)], 11.5).concat([3.1]));
    }
    return s;
  })();

  // zigzag wrinkle lines, generated once in wing space
  function genWrinkles(outline, n, seed, avoid) {
    const r = L.rng(seed);
    const b = L.bounds(outline);
    const out = [];
    let guard = 0;
    while (out.length < n && guard++ < 4000) {
      const x = b.x + r() * b.w, y = b.y + r() * b.h;
      if (!L.polyContains(outline, x, y)) continue;
      if (avoid && L.polyContains(avoid, x, y)) continue;
      if (Math.hypot(x - WB[0], y - WB[1]) < 80) continue;
      if (out.some((w) => Math.hypot(w.c[0] - x, w.c[1] - y) < 34)) continue;
      const a = 2.69 + r.range(-0.7, 0.7);
      const len = r.range(46, 96);
      const k = r.int(3, 5);
      const pts = [];
      for (let i = 0; i <= k; i++) {
        const u = i / k - 0.5;
        const off = (i % 2 ? 1 : -1) * r.range(6, 12);
        pts.push([x + Math.cos(a) * u * len - Math.sin(a) * off, y + Math.sin(a) * u * len + Math.cos(a) * off]);
      }
      out.push({ c: [x, y], pts });
    }
    return out;
  }
  const FW_WRINKLES = genWrinkles(FW_OUTLINE, 22, sd('fwWr'));
  const HW_WRINKLES = genWrinkles(HW_OUTLINE, 8, sd('hwWr'), FW_OUTLINE);

  // ---------------------------------------------------------------------------
  // Maps from G4 space to the frame: crumple, grow about the wing base, shake, then pose
  // ---------------------------------------------------------------------------
  const CR = [sd('crA'), sd('crB'), sd('crC'), sd('crD')].map((v) => v & 0x7fffffff);
  function wingMap(s, amp, shake, pose) {
    const turn = shake + (pose.fold || 0);
    const cr = Math.cos(turn), sr = Math.sin(turn);
    const pc = Math.cos(pose.rot), ps = Math.sin(pose.rot);
    return (x, y) => {
      let dx = 0, dy = 0;
      if (amp > 0) {
        const k = amp * L.smoothstep(40, 170, Math.hypot(x - WB[0], y - WB[1]));
        dx = k * (22 * L.noise2(x / 50, y / 50, CR[0]) + 10 * L.noise2(x / 13, y / 13, CR[2]));
        dy = k * (22 * L.noise2(x / 50, y / 50, CR[1]) + 10 * L.noise2(x / 13, y / 13, CR[3]));
      }
      const rx = s * (x + dx - WB[0]), ry = s * (y + dy - WB[1]);
      const qx = WB[0] + rx * cr - ry * sr - C[0], qy = WB[1] + rx * sr + ry * cr - C[1];
      return [pose.x + qx * pc - qy * ps, pose.y + qx * ps + qy * pc];
    };
  }
  function bodyMap(pose) {
    const pc = Math.cos(pose.rot), ps = Math.sin(pose.rot);
    return (x, y) => {
      const qx = x - C[0], qy = y - C[1];
      return [pose.x + qx * pc - qy * ps, pose.y + qx * ps + qy * pc];
    };
  }

  // ---------------------------------------------------------------------------
  // Wing painter
  // ---------------------------------------------------------------------------
  function bandPoly(b) {
    if (!b.poly) b.poly = bandLocal(b.pts, b.inward || normalsToward(b.pts, b.center[0], b.center[1]), b.width, b.ext);
    return b.poly;
  }
  const thin = (pts, k) => pts.filter((p, i) => i % k === 0 || i === pts.length - 1);

  function toneForewing(ctx, P, W, mp, poly, bb) {
    const deepInk = L.mix(P.monarchDeep, P.veinBlack, 0.3);
    const apex = mp(FW_APEX);
    const inApex = (x, y) => (L.polyContains(apex, x, y) ? 0 : 1);
    // a light overall 45-degree layer, heavier toward the lower right of the wing
    L.hatch(ctx, poly, {
      angle: -Math.PI / 4, spacing: 7, width: 1.3, color: P.monarchDeep, alpha: 0.85, length: [10, 40],
      density: (x, y) => inApex(x, y) * Math.max(0.35, L.smoothstep(0.35, 1.05, (0.55 * (x - bb.x)) / bb.w + (0.55 * (y - bb.y)) / bb.h)), seed: W.seed + 1,
    });
    // each cell shaded on its lower-right half, scale rows ticked across it
    for (let i = 0; i < FW_CELLS.length; i++) {
      const cell = FW_CELLS[i];
      const cp = mp(cell.poly);
      const lv = mp(thin(cell.left, 2)), rv = mp(thin(cell.right, 2));
      const half = (x, y) => {
        const dl = distPts(lv, x, y), dr = distPts(rv, x, y);
        return dl / (dl + dr + 1e-6);
      };
      const tone = cell.discal ? 0.55 : 1;
      L.hatch(ctx, cp, { angle: -Math.PI / 4, spacing: 7, width: 1.5, color: deepInk, alpha: 0.82, length: [8, 26], gap: [2, 5], density: (x, y) => inApex(x, y) * tone * L.smoothstep(0.4, 0.62, half(x, y)), seed: W.seed + 20 + i });
      if (cell.cross || cell.costa) {
        L.hatch(ctx, cp, { angle: -1.8326, spacing: 7, width: 1.3, color: deepInk, alpha: 0.75, length: [8, 22], gap: [2, 6], density: (x, y) => inApex(x, y) * L.smoothstep(cell.costa ? 0.45 : 0.3, cell.costa ? 0.8 : 0.7, half(x, y)), seed: W.seed + 40 + i });
      }
      // scale rows: tiny ticks in rows 9 px apart, running across the cell perpendicular to its veins
      const a = lv[0], b = lv[lv.length - 1];
      const va = Math.atan2(b[1] - a[1], b[0] - a[0]);
      L.hatch(ctx, cp, { angle: va + Math.PI / 2, spacing: 9, width: 1.9, color: deepInk, alpha: 0.7, length: [4, 6], gap: [2, 5], taper: 0.6, bow: 0.2, spacingJitter: 0.12, flow: 0.02, edge: 0.05, inset: 4, overshoot: 0, density: inApex, seed: W.seed + 60 + i });
    }
  }

  function paintWing(ctx, P, W, map, s, amp, o) {
    const mp = (pts) => pts.map((p) => map(p[0], p[1]));
    const poly = mp(W.outline);
    const bb = L.bounds(poly);
    fillPoly(ctx, poly, W.fill);
    ctx.save();
    tracePoly(ctx, poly);
    ctx.clip();
    let apex = null;
    if (W.apex) {
      apex = mp(W.apex);
      fillPoly(ctx, apex, P.monarchUnder);
    }
    if (W.fore) {
      // the discal cell sits lit, a shade paler
      fillPoly(ctx, mp(DISCAL), L.mix(P.monarch, P.monarchUnder, 0.3));
      toneForewing(ctx, P, W, mp, poly, bb);
      L.hatch(ctx, apex, {
        angle: -Math.PI / 4, spacing: 8, width: 1.3, color: L.mix(P.monarchUnder, P.monarchDeep, 0.5), alpha: 0.9, length: [10, 30],
        density: (x, y) => {
          const b = L.bounds(apex);
          return L.smoothstep(0.35, 0.8, (0.55 * (x - b.x)) / b.w + (0.55 * (y - b.y)) / b.h);
        },
        seed: W.seed + 5,
      });
      L.inkPath(ctx, mp(V.R3), { width: 1.5, color: P.monarchDeep, alpha: 0.95, taper: [4, 8], seed: W.seed + 6 });
      L.inkPath(ctx, mp(V.M1), { width: 1.5, color: P.monarchDeep, alpha: 0.95, taper: [4, 8], seed: W.seed + 7 });
    } else {
      L.crossHatch(ctx, poly, { spacing: 8, crossSpacing: 7, width: 1.2, color: L.mix(P.monarchUnder, P.monarchDeep, 0.6), alpha: 0.7, tone: 0.34, length: [10, 34], seed: W.seed + 1 });
    }
    L.stipple(ctx, poly, { spacing: 8, r: [0.7, 1.3], color: P.monarchDeep, alpha: 0.4, density: 0.45, seed: W.seed + 2 });
    // pale edging along the veins
    if (W.veinEdge) {
      for (let i = 0; i < W.veins.length; i++) {
        const v = W.veins[i];
        L.inkPath(ctx, mp(v.p), { width: Math.max(2.2, 9.5 * s * v.w) + 4 * Math.max(0.5, s), color: P.spotWhite, alpha: 0.45, wobble: 0.8, taper: [4, 2], minWidth: 0.5, swell: 0, seed: W.seed + 40 + i, pressure: (u) => lerp(1, 0.6, u) });
      }
    }
    // black borders
    for (const b of W.bands) fillPoly(ctx, mp(bandPoly(b)), P.veinBlack);
    // veins: filled bands tapering to the margin
    for (let i = 0; i < W.veins.length; i++) {
      const v = W.veins[i];
      L.inkPath(ctx, mp(v.p), { width: Math.max(1.6, 9.5 * s * v.w), color: P.veinBlack, wobble: 0.8, tremble: 0.3, taper: [3, 6], minWidth: 0.5, swell: 0, seed: W.seed + 10 + i, pressure: (u) => lerp(1.05, 0.5, u) });
    }
    if (W.fore) {
      // the closed discal cell, one continuous border
      L.inkPath(ctx, mp(DISCAL), { closed: true, width: Math.max(2.5, 6.5 * s), color: P.veinBlack, wobble: 0.5, taper: [0, 0], seed: W.seed + 90 });
    }
    // white spots
    ctx.fillStyle = P.spotWhite;
    ctx.beginPath();
    for (let i = 0; i < W.spots.length; i++) {
      const sp = W.spots[i];
      const q = map(sp[0], sp[1]);
      const r = Math.max(1, sp[2] * s * (0.9 + 0.2 * L.h3(i, W.seed, 5)));
      ctx.moveTo(q[0] + r, q[1]);
      ctx.arc(q[0], q[1], r, 0, TAU);
    }
    ctx.fill();
    // wrinkles: ink zigzags with a pale fold highlight, the count halves on each pump
    const nW = Math.round(W.wrinkles.length * amp);
    for (let i = 0; i < nW; i++) {
      const pts = mp(W.wrinkles[i].pts);
      L.inkPath(ctx, pts.map((p) => [p[0] - 1.8, p[1] - 1.6]), { width: 1.3, color: P.spotWhite, alpha: 0.7, smooth: false, taper: [3, 3], seed: W.seed + 200 + i });
      L.inkPath(ctx, pts, { width: 1.8, color: P.ink, alpha: 0.9, smooth: false, taper: [3, 5], seed: W.seed + 100 + i });
    }
    ctx.restore();
    if (W.fore && o.hwPoly) {
      // a paper gap between the forewing margin and the hindwing lobe below it
      ctx.save();
      tracePoly(ctx, o.hwPoly);
      ctx.clip();
      strokePts(ctx, mp(FW_OVER_HW), P.paper, 3.2 * Math.max(0.6, s), 1);
      ctx.restore();
    }
    L.inkPath(ctx, poly, { closed: true, width: o.width, color: P.ink, seed: W.seed + 3, double: o.double ? { alpha: 0.35 } : false });
    return poly;
  }

  const FW = { outline: FW_OUTLINE, fill: L.pal.monarch, apex: FW_APEX, veins: FW_VEINS, bands: FW_BANDS, spots: FW_SPOTS, wrinkles: FW_WRINKLES, seed: sd('fw') & 0xffffff, fore: true };
  const HW = { outline: HW_OUTLINE, fill: L.pal.monarchUnder, apex: null, veins: HW_VEINS, bands: HW_BANDS, spots: HW_SPOTS, wrinkles: HW_WRINKLES, seed: sd('hw') & 0xffffff, veinEdge: true };

  // ---------------------------------------------------------------------------
  // Body
  // ---------------------------------------------------------------------------
  const ABD_PROFILE = [[0, 0.6], [0.08, 0.86], [0.22, 1], [0.42, 0.97], [0.62, 0.84], [0.78, 0.64], [0.9, 0.4], [0.97, 0.18], [1, 0]];
  function abdProfile(u) {
    for (let i = 1; i < ABD_PROFILE.length; i++) {
      if (u <= ABD_PROFILE[i][0]) {
        const a = ABD_PROFILE[i - 1], b = ABD_PROFILE[i];
        return lerp(a[1], b[1], (u - a[0]) / (b[0] - a[0]));
      }
    }
    return 0;
  }
  function abdomenLocal(sz, squeeze) {
    const hw = (lerp(84, 50, sz) * (1 - 0.15 * squeeze)) / 2;
    const top = 1027, bot = lerp(1240, 1175, sz) - 12 * squeeze;
    const R = [], Lf = [];
    for (let k = 0; k <= 16; k++) {
      const u = k / 16;
      const y = lerp(top, bot, u);
      R.push([540 + hw * abdProfile(u), y]);
      Lf.push([540 - hw * abdProfile(u), y]);
    }
    return { poly: L.smoothPts(R.concat(Lf.reverse()), true, 6), hw, top, bot };
  }

  // shot 10's four gripping legs (hip, knee, ankle, foot), so the legs hold their pixels across the cut.
  // 0 and 1: upper hips to the inner feet; 2 and 3: lower hips to the outer feet
  const LEGS10 = [
    [[519, 990], [494, 961], [487, 924], [491, 897]],
    [[558, 987], [581, 957], [588, 922], [584, 898]],
    [[521, 1009], [483, 984], [468, 940], [477, 899]],
    [[561, 1004], [597, 976], [604, 936], [597, 899]],
  ];
  // the feet ride the flaps: rotate each G4 foot about its flap root by the flaps' extra bend
  function feetFor(bend) {
    const c = Math.cos(bend), s = Math.sin(bend);
    return LEGS10.map((leg) => {
      const f = leg[3];
      const left = f[0] < 540;
      const dx = left ? f[0] - XL : XR - f[0], dy = f[1] - SPLIT_Y;
      const rx = dx * c - dy * s, ry = dx * s + dy * c;
      return [left ? XL + rx : XR - rx, SPLIT_Y + ry];
    });
  }
  // a leg's bent shape carried from its G4 hip-to-foot line onto a new hip and foot
  function legPts(i, hip, foot, mirror) {
    const g = LEGS10[i], h = g[0], f = g[3];
    const ax = f[0] - h[0], ay = f[1] - h[1], al = Math.hypot(ax, ay) || 1;
    const ux = ax / al, uy = ay / al;
    const bx = foot[0] - hip[0], by = foot[1] - hip[1], bl = Math.hypot(bx, by) || 1;
    const vx = bx / bl, vy = by / bl;
    return g.map((p) => {
      const px = p[0] - h[0], py = p[1] - h[1];
      const along = (px * ux + py * uy) / al;
      const across = ((-px * uy + py * ux) / al) * (mirror ? -1 : 1);
      return [hip[0] + (along * vx - across * vy) * bl, hip[1] + (along * vy + across * vx) * bl];
    });
  }

  function drawLeg(ctx, P, pts, k) {
    const [hip, knee, ank, foot] = pts;
    L.inkPath(ctx, [hip, knee], { width: 4.4, color: P.veinBlack, smooth: false, taper: [2, 3], minWidth: 0.7, seed: sd('femur', k) });
    L.inkPath(ctx, [knee, ank], { width: 3.3, color: P.veinBlack, smooth: false, taper: [2, 2], minWidth: 0.6, seed: sd('tibia', k) });
    L.inkPath(ctx, [ank, foot], { width: 2.3, color: P.veinBlack, smooth: false, taper: [1, 2], minWidth: 0.6, seed: sd('tars', k) });
    // tarsal claws hooked over the torn edge
    const ux = foot[0] - ank[0], uy = foot[1] - ank[1], ul = Math.hypot(ux, uy) || 1;
    const tx = ux / ul, ty = uy / ul;
    for (const c of [-1, 1]) {
      L.inkPath(ctx, [foot, [foot[0] + tx * 4 - c * 3 * ty, foot[1] + ty * 4 + c * 3 * tx], [foot[0] + tx * 2 - c * 5 * ty, foot[1] + ty * 2 + c * 5 * tx + 4]], { width: 1.2, color: P.ink, smooth: false, taper: [1, 2], seed: sd('claw', k, c) });
    }
    ctx.save();
    ctx.fillStyle = P.spotWhite;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    for (const u of [0.35, 0.7]) {
      const q = [lerp(hip[0], knee[0], u), lerp(hip[1], knee[1], u)];
      ctx.moveTo(q[0] + 1.3, q[1]);
      ctx.arc(q[0], q[1], 1.3, 0, TAU);
    }
    for (const q of [knee, ank]) {
      ctx.moveTo(q[0] + 1.7, q[1]);
      ctx.arc(q[0], q[1], 1.7, 0, TAU);
    }
    ctx.fill();
    ctx.restore();
  }
  function drawLegs(ctx, P, bm, pose, feet) {
    const flip = Math.cos(pose.rot) < 0; // head down: the body's left legs reach the right-hand flap
    for (let i = 0; i < 4; i++) {
      const j = flip ? [1, 0, 3, 2][i] : i;
      const hip = bm(LEGS10[i][0][0], LEGS10[i][0][1]);
      const pts = !pose.rot && !pose.bend ? LEGS10[i] : legPts(i, hip, feet[j], flip);
      drawLeg(ctx, P, pts, i);
    }
  }

  function drawDrop(ctx, P, x, y, rx, ry, neck) {
    const pts = [[x, y - ry - neck]];
    for (let k = 0; k <= 18; k++) {
      const a = -0.28 * Math.PI + (k / 18) * 1.56 * Math.PI;
      pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]);
    }
    L.inkPath(ctx, pts, { closed: true, width: 2, color: P.ink, fill: P.meconium, seed: sd('drop'), wobble: 0.5, taper: [4, 8] });
    ctx.save();
    ctx.fillStyle = P.white;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(x - rx * 0.38, y - ry * 0.2, rx * 0.24, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawAdult(ctx, P, st) {
    const { pose, s, amp, shake, sz, squeeze, feet } = st;
    const bm = bodyMap(pose);
    const wm = wingMap(s, amp, shake, pose);
    const mp = (pts) => pts.map((p) => bm(p[0], p[1]));
    const inv = (x, y) => {
      const c = Math.cos(-pose.rot), sn = Math.sin(-pose.rot), qx = x - pose.x, qy = y - pose.y;
      return [C[0] + qx * c - qy * sn, C[1] + qx * sn + qy * c];
    };

    // antennae, straight to the G4 clubs; antK < 1 tips them up toward the clubs while the body swings
    const ak = pose.antK != null ? pose.antK : 1;
    for (const [bx, cx, k] of [[531, 495, 0], [549, 590, 1]]) {
      const a = bm(bx, 910);
      const lx = cx - bx, ly = 760 - 910;
      const ra = pose.rot * ak;
      const b = [a[0] + lx * Math.cos(ra) - ly * Math.sin(ra), a[1] + lx * Math.sin(ra) + ly * Math.cos(ra)];
      L.inkPath(ctx, [a, b], { width: 3, color: P.veinBlack, smooth: false, taper: [2, 1], minWidth: 0.6, swell: 0, wobble: 0.6, seed: sd('ant', k) });
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      L.inkPath(ctx, L.ellipsePts(b[0], b[1], 13, 5.5, 18, ang), { closed: true, width: 1.6, color: P.ink, fill: P.veinBlack, seed: sd('club', k) });
      ctx.save();
      ctx.fillStyle = P.tan;
      ctx.beginPath();
      ctx.arc(b[0] + Math.cos(ang) * 10, b[1] + Math.sin(ang) * 10, 2.6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = P.spotWhite;
      ctx.globalAlpha = 0.6;
      for (let u = 0.12; u < 0.86; u += 0.09) {
        ctx.beginPath();
        ctx.arc(lerp(a[0], b[0], u), lerp(a[1], b[1], u), 0.9, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    // abdomen: swollen, then slimmer on each pump
    const ab = abdomenLocal(sz, squeeze);
    const abPoly = mp(ab.poly);
    fillPoly(ctx, abPoly, P.veinBlack);
    L.hatch(ctx, abPoly, {
      angle: pose.rot + Math.PI / 2, spacing: 6, width: 1.2, color: P.spotWhite, alpha: 0.55, bend: 2.4, length: [8, 22], gap: [2, 5],
      density: (x, y) => L.smoothstep(-0.15, -0.4, (inv(x, y)[0] - 540) / ab.hw), seed: sd('abHi'),
    });
    ctx.save();
    for (let i = 0; i < 8; i++) {
      const u = 0.12 + i * 0.105;
      const y = lerp(ab.top, ab.bot, u);
      const h = ab.hw * abdProfile(u) * 0.96;
      L.inkPath(ctx, mp([[540 - h, y], [540 - h * 0.5, y + 4], [540 - h * 0.18, y + 4.5]]), { width: 1.2, color: P.spotWhite, alpha: 0.4, taper: [5, 5], seed: sd('ring', i) });
      const d1 = bm(540 - h * 0.58, y + 9), d2 = bm(540 + h * 0.5, y + 9);
      ctx.fillStyle = P.spotWhite;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(d1[0], d1[1], 2.4, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.arc(d2[0], d2[1], 1.8, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    const litEdge = [];
    for (let k = 0; k <= 10; k++) {
      const u = lerp(0.15, 0.55, k / 10);
      litEdge.push([540 - ab.hw * abdProfile(u), lerp(ab.top, ab.bot, u)]);
    }
    L.inkPath(ctx, mp(litEdge), { width: 3, color: P.spotWhite, alpha: 0.7, taper: [8, 8], seed: sd('abEdge') });
    L.inkPath(ctx, abPoly, { closed: true, width: 4, color: P.ink, seed: sd('abLine') });

    // thorax with a hairy fringe and white spots
    const thPoly = mp(L.ellipsePts(540, 995, 28, 36, 40));
    ctx.save();
    ctx.strokeStyle = P.veinBlack;
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    const bi = L.boil(L.T);
    for (let k = 0; k < 52; k++) {
      const a = (k / 52) * TAU + L.h3(k, 3, 7) * 0.1;
      const l = 4 + 6 * L.h3(k, bi, 11);
      const p0 = bm(540 + Math.cos(a) * 26, 995 + Math.sin(a) * 34), p1 = bm(540 + Math.cos(a + 0.08) * (28 + l), 995 + Math.sin(a + 0.08) * (36 + l));
      ctx.moveTo(p0[0], p0[1]);
      ctx.lineTo(p1[0], p1[1]);
    }
    ctx.stroke();
    ctx.restore();
    L.inkPath(ctx, thPoly, { closed: true, width: 4.5, color: P.ink, fill: P.veinBlack, seed: sd('thLine') });
    L.hatch(ctx, thPoly, {
      angle: pose.rot + Math.PI / 2, spacing: 6, width: 1.2, color: P.spotWhite, alpha: 0.55, bend: 2, length: [6, 16],
      density: (x, y) => L.smoothstep(-0.15, -0.4, (inv(x, y)[0] - 540) / 28), seed: sd('thHi'),
    });
    ctx.save();
    ctx.fillStyle = P.spotWhite;
    for (const [x, y, r] of [[519, 993, 2.8], [561, 993, 2.8], [540, 1012, 2.3], [530, 1022, 2], [550, 1022, 2]]) {
      const q = bm(x, y);
      ctx.beginPath();
      ctx.arc(q[0], q[1], r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // head: a black capsule with big dark compound eyes on its sides
    const hc = bm(540, 935);
    L.inkPath(ctx, L.ellipsePts(hc[0], hc[1], 28, 28, 36), { closed: true, width: 4.5, color: P.ink, fill: P.veinBlack, seed: sd('head') });
    const eyeCol = L.mix(P.inkSoft, P.veinBlack, 0.62);
    for (const [ex, k] of [[520, 0], [560, 1]]) {
      const e = bm(ex, 936);
      const ePoly = L.ellipsePts(e[0], e[1], 12, 17, 28, pose.rot);
      L.inkPath(ctx, ePoly, { closed: true, width: 2, color: P.ink, fill: eyeCol, seed: sd('eye', k), wobble: 0.4 });
      L.hexLattice(ctx, ePoly, { r: 3, color: P.inkFaint, alpha: 0.5, width: 0.8, jitter: 0.25, boilAmp: 0.15, seed: sd('facets', k) });
      const g = bm(ex + (k ? 4 : -4), 928);
      ctx.save();
      ctx.fillStyle = P.spotWhite;
      ctx.beginPath();
      ctx.arc(g[0], g[1], 1.5, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.fillStyle = P.spotWhite;
    for (const [x, y, r] of [[540, 913, 3], [540, 926, 1.8], [536, 954, 1.8], [544, 954, 1.8]]) {
      const q = bm(x, y);
      ctx.beginPath();
      ctx.arc(q[0], q[1], r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    // wings: hindwing behind, forewing in front
    const hwPoly = paintWing(ctx, P, HW, wm, s, amp, { width: 3.4 });
    const fwPoly = paintWing(ctx, P, FW, wm, s, amp, { width: 4.2, double: true, hwPoly });

    // forelegs folded against the thorax
    for (const [pts, k] of [[[[524, 972], [506, 986], [512, 1008]], 0], [[[556, 972], [572, 984], [567, 1004]], 1]]) {
      const mapped = mp(pts);
      L.inkPath(ctx, mapped, { width: 2.6, color: P.veinBlack, smooth: false, taper: [2, 3], seed: sd('fore', k) });
      L.inkPath(ctx, mapped.map((p) => [p[0] - 1.5, p[1] - 0.4]), { width: 1.2, color: P.spotWhite, alpha: 0.6, smooth: false, taper: [2, 3], seed: sd('foreE', k) });
      ctx.save();
      ctx.fillStyle = P.spotWhite;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(mapped[1][0], mapped[1][1], 1.7, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    // the two proboscis halves, still separate, coiled in front of the thorax
    for (const [cx, dir, k] of [[532, -1, 0], [548, 1, 1]]) {
      const pts = [bm(540 + dir * 2, 958), bm(cx + dir * 1, 964)];
      for (let i = 0; i <= 34; i++) {
        const u = i / 34;
        const a = -Math.PI / 2 + dir * u * 1.85 * TAU;
        const r = 8 * (1 - u * 0.78);
        pts.push(bm(cx + Math.cos(a) * r, 974 + Math.sin(a) * r));
      }
      L.inkPath(ctx, pts, { width: 5, color: P.ink, taper: [1, 3], wobble: 0.25, tremble: 0.1, swell: 0, seed: sd('probI', k) });
      L.inkPath(ctx, pts, { width: 2.3, color: P.tan, taper: [1, 3], wobble: 0.25, tremble: 0.1, swell: 0, seed: sd('probT', k) });
    }
    // gripping legs
    if (feet) drawLegs(ctx, P, bm, pose, feet);

    return { bm, wm, ab, fwPoly };
  }

  function adultSilhouette(st) {
    const bm = bodyMap(st.pose), wm = wingMap(st.s, st.amp, st.shake, st.pose);
    const mp = (pts, m) => pts.map((p) => m(p[0], p[1]));
    return [
      mp(abdomenLocal(st.sz, st.squeeze).poly, bm),
      mp(L.ellipsePts(540, 995, 30, 38, 20), bm),
      mp(L.ellipsePts(540, 935, 30, 30, 20), bm),
      mp(HW_OUTLINE.filter((p, i) => i % 3 === 0), wm),
      mp(FW_OUTLINE.filter((p, i) => i % 3 === 0), wm),
    ];
  }
  // polygons hatched one by one (exact spans, cheap); the same row grid keeps overlaps from doubling much
  // the clear skin keeps its own face clean: no wall shadow reads through it
  function drawShadow(ctx, P, polys, skin) {
    const ox = 54, oy = 40;
    const sb = L.bounds(skin);
    const off = (x, y) => (x + ox < sb.x || x + ox > sb.x + sb.w || y + oy < sb.y || y + oy > sb.y + sb.h || !L.polyContains(skin, x + ox, y + oy) ? 1 : 0);
    const shell = polys[1];
    const adults = polys.slice(2);
    const overlap = (x, y) => {
      if (!off(x, y) || !L.polyContains(shell, x, y)) return 0;
      for (let i = 0; i < adults.length; i++) if (L.polyContains(adults[i], x, y)) return 1;
      return 0;
    };
    ctx.save();
    ctx.translate(ox, oy);
    for (let i = 0; i < polys.length; i++) {
      L.hatch(ctx, polys[i], { angle: -Math.PI / 4, spacing: 5, width: 1.4, color: P.inkSoft, alpha: 0.6, length: [14, 44], spacingJitter: 0.1, inset: 2, overshoot: 0, edge: 0, density: off, seed: sd('shadow', i) });
    }
    for (let i = 2; i < polys.length; i++) {
      L.hatch(ctx, polys[i], { angle: -1.8326, spacing: 7, width: 1.4, color: P.inkSoft, alpha: 0.6, length: [10, 28], spacingJitter: 0.1, inset: 2, overshoot: 0, edge: 0, density: overlap, seed: sd('shadowX', i) });
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Inset: a magnifier on the underside of the head, the two proboscis halves still unzipped
  // ---------------------------------------------------------------------------
  const INS = [250, 1260, 150];
  const PROB = [539, 971]; // the coils on the adult
  function galeaPts(side, coil) {
    const cx = INS[0] + side * 44, cy = INS[1] + 48;
    const pts = [[INS[0] + side * 14, INS[1] - 92], [INS[0] + side * 22, INS[1] - 40]];
    const turns = 2.1 + 0.25 * coil;
    const a0 = side < 0 ? -Math.PI * 0.35 : -Math.PI * 0.65;
    for (let i = 0; i <= 60; i++) {
      const u = i / 60;
      const a = a0 - side * u * turns * TAU;
      const r = lerp(46, 7, Math.pow(u, 0.8));
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return pts;
  }
  function insetScale(t) {
    if (t < 0.375 - 1 / 24 - EPS) return 0;
    return L.ease.outBack(clamp((t - 0.375 + 1 / 24) / (3 / 24)));
  }
  function drawInset(ctx, P, t, coil) {
    const [x, y, R] = INS;
    const k = insetScale(t);
    if (k <= 1e-4) return;
    // leader lines from the coils, out through the gap in the yellow arc, to the lens tangents
    const [hx, hy] = PROB;
    const dx = x - hx, dy = y - hy, dl = Math.hypot(dx, dy);
    const base = Math.atan2(dy, dx), off = Math.asin(Math.min(1, (R * k) / dl));
    for (const sgn of [-1, 1]) {
      const a = base + sgn * off;
      const tl = Math.sqrt(Math.max(0, dl * dl - R * k * R * k));
      const p1 = [hx + Math.cos(a) * tl, hy + Math.sin(a) * tl];
      strokePts(ctx, [[hx + Math.cos(a) * 31, hy + Math.sin(a) * 31], p1], P.annYellow, 2, 1);
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k, k);
    ctx.translate(-x, -y);
    const circ = L.ellipsePts(x, y, R, R, 72);
    fillPoly(ctx, circ, P.paper);
    ctx.save();
    tracePoly(ctx, circ);
    ctx.clip();
    L.stripes(ctx, { colors: [P.stripeCream, P.stripeApricot], width: 70, angle: -0.52, bounds: { x: x - R, y: y - R, w: 2 * R, h: 2 * R }, seed: sd('insStripes') });
    const dome = L.ellipsePts(x, y - 190, 150, 92, 48);
    L.inkPath(ctx, dome, { closed: true, width: 4, color: P.ink, fill: P.veinBlack, seed: sd('insDome') });
    L.stipple(ctx, dome, { spacing: 7, r: [0.8, 1.6], color: P.spotWhite, alpha: 0.55, density: (px, py) => 0.25 + 0.5 * L.smoothstep(y - 100, y - 180, py), seed: sd('insScales') });
    L.hatch(ctx, dome, { angle: -0.35, spacing: 5, width: 1.2, color: P.spotWhite, alpha: 0.35, length: [6, 14], density: (px) => L.smoothstep(x + 20, x - 90, px), seed: sd('insDomeHi') });
    L.inkPath(ctx, [[x - 30, y - 140], [x - 12, y - 158], [x + 12, y - 158], [x + 30, y - 140]], { width: 1.6, color: P.inkSoft, seed: sd('frons') });
    for (const sgn of [-1, 1]) {
      const eye = L.ellipsePts(x + sgn * 112, y - 160, 58, 66, 40);
      L.inkPath(ctx, eye, { closed: true, width: 3, color: P.ink, fill: L.mix(P.inkSoft, P.veinBlack, 0.5), seed: sd('insEye', sgn) });
      L.hexLattice(ctx, eye, { r: 7, color: P.inkFaint, alpha: 0.55, width: 1, jitter: 0.8, seed: sd('insFacets', sgn) });
      ctx.save();
      ctx.fillStyle = P.spotWhite;
      ctx.beginPath();
      ctx.arc(x + sgn * 112 - 18, y - 172, 3, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    for (const sgn of [-1, 1]) {
      const palp = [[x + sgn * 34, y - 96], [x + sgn * 62, y - 92], [x + sgn * 72, y - 40], [x + sgn * 60, y + 6], [x + sgn * 44, y - 20], [x + sgn * 36, y - 70]];
      const pp = L.smoothPts(palp, true, 5);
      L.inkPath(ctx, pp, { closed: true, width: 2.6, color: P.ink, fill: P.veinBlack, seed: sd('palp', sgn) });
      L.hatch(ctx, pp, { angle: -1.3 * sgn, spacing: 5, width: 1.2, color: P.spotWhite, alpha: 0.55, length: [5, 12], gap: [3, 8], seed: sd('palpHair', sgn) });
    }
    for (const sgn of [-1, 1]) {
      const g = L.smoothPts(galeaPts(sgn, coil), false, 3);
      L.inkPath(ctx, g, { width: 17, color: P.ink, taper: [2, 16], minWidth: 0.35, swell: 0, wobble: 0.8, seed: sd('galI', sgn) });
      L.inkPath(ctx, g, { width: 11, color: P.tan, taper: [2, 14], minWidth: 0.3, swell: 0, wobble: 0.8, seed: sd('galI', sgn) });
      const cum = cumLen(g);
      const T = cum[cum.length - 1];
      ctx.save();
      ctx.strokeStyle = P.inkSoft;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let dd = 20; dd < T - 30; dd += 9) {
        const p = pointAt(g, cum, dd), q = pointAt(g, cum, dd + 2);
        const tx = q[0] - p[0], ty = q[1] - p[1], tl = Math.hypot(tx, ty) || 1;
        const w = 5 * (1 - (dd / T) * 0.7);
        ctx.moveTo(p[0] - (ty / tl) * w, p[1] + (tx / tl) * w);
        ctx.lineTo(p[0] + (ty / tl) * w, p[1] - (tx / tl) * w);
      }
      ctx.stroke();
      ctx.restore();
      L.inkPath(ctx, g.map((p) => [p[0] - 2, p[1] - 2]).slice(0, Math.floor(g.length * 0.75)), { width: 1.4, color: P.white, alpha: 0.75, taper: [4, 20], seed: sd('galHi', sgn) });
    }
    L.hatch(ctx, circ, { spacing: 6, width: 1.2, color: P.inkSoft, alpha: 0.45, length: [10, 30], density: (px, py) => L.smoothstep(R * 0.7, R, Math.hypot(px - x + 40, py - y + 40)), seed: sd('lensShade') });
    ctx.restore();
    L.inkPath(ctx, circ, { closed: true, width: 4.5, color: P.ink, seed: sd('lensRim'), double: { alpha: 0.4 } });
    ring(ctx, x, y, R, P.annYellow, 3, 1);
    L.guideCircle(ctx, x, y, R + 12, { color: P.inkFaint, alpha: 0.5, width: 1.2, quadrants: 8 });
    ctx.restore();
    // attention arc on the coils, open toward the lens
    const gapMid = base;
    arcStroke(ctx, hx, hy, 26, gapMid + Math.PI / 4, gapMid + Math.PI * 2 - Math.PI / 4, P.annYellow, 3, 1);
  }

  // ---------------------------------------------------------------------------
  // Overlays
  // ---------------------------------------------------------------------------
  const BLUE_WING = [
    L.smoothPts([[570, 995], [612, 1040], [655, 1100], [690, 1168], [730, 1272], M(0.12)], false, 10),
    L.smoothPts([[570, 1004], [574, 1060], [596, 1130], [618, 1172], [631, 1266], M(0.6)], false, 10),
    L.smoothPts([[569, 1005], [574, 1060], [596, 1130], [599, 1138], [603, 1236], M(0.8)], false, 10),
  ];
  function bluePaths(bm, wm, ab) {
    const yA = lerp(ab.top, ab.bot, 0.62);
    const body = [[550, yA], [552, yA - 50], [556, 1040], [564, 1012]].map((p) => bm(p[0], p[1]));
    return BLUE_WING.map((w) => {
      const pts = body.concat(w.map((p) => wm(p[0], p[1])));
      return { pts, cum: cumLen(pts) };
    });
  }

  // ---------------------------------------------------------------------------
  // Drawings for the emergence (t 0 .. 1/3, on twos), then the G4 pose
  // ---------------------------------------------------------------------------
  const POSES = [
    { x: 540, y: 850, rot: Math.PI, bend: 0.14 }, // the head breaks out of the dark case
    { x: 540, y: 1004, rot: Math.PI, bend: 0.42 }, // head down, legs reaching up to the torn rim
    { x: 522, y: 985, rot: Math.PI * 0.22, bend: 0.22, antK: 0.35 }, // swinging up on the rim, abdomen down-left
    { x: 540, y: 995, rot: 0, bend: 0 }, // G4
  ];
  const STEP_AMP = [1, 0.5, 0.25, 0];

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const P = L.pal;
      const t = clamp(tIn, 0, info.dur);
      const Tg = info.shot.start + t;
      const tw = L.onTwos(t);
      const frame = Math.floor(t * 24 + EPS);
      const d = Math.min(3, Math.floor(tw * 12 + EPS));
      let pose = POSES[d];

      // pumps on 16.5, 17.0, 17.5: snap drawings land on the beat frame
      const snap = PUMPS.map((tp) => clamp((tw - tp + TWELFTH) / (3 * TWELFTH)));
      let s = SIZES[0];
      for (let i = 0; i < 3; i++) s += (SIZES[i + 1] - SIZES[i]) * L.ease.outBack(snap[i]);
      const lin = snap[0] + snap[1] + snap[2];
      const k = Math.min(3, Math.floor(lin));
      const amp = k >= 3 ? 0 : lerp(STEP_AMP[k], STEP_AMP[k + 1], lin - k);
      const squeeze = PUMPS.some((tp) => tw >= tp - EPS && tw < tp + TWELFTH - EPS) ? 1 : 0;
      const shakeK = tw >= 1.75 - EPS && tw < 1.75 + TWELFTH - EPS ? 1 : tw >= 1.75 + TWELFTH - EPS && tw < 1.75 + 2 * TWELFTH - EPS ? -1 : 0;
      const shake = shakeK * 0.0349;

      // the crumpled stubs lie folded along the abdomen until the first pump opens them
      const fold = d < 3 ? 0.36 : 0.16 * (1 - snap[0]);
      pose = Object.assign({}, POSES[d], { fold });
      const shell = shellGeom(pose.bend);
      const feet = d >= 1 ? feetFor(pose.bend) : null;
      const st = { pose, s, amp, shake, sz: lin / 3, squeeze, feet };

      // 1. background, leaf ground plane, construction
      drawBackground(ctx, P, Tg);
      drawLeaf(ctx, P);
      drawGuides(ctx, P, s, d, t, snap.filter((v) => v > 0).length);

      // cast shadow of twig, shell and adult on the wall behind, lit from the upper left
      drawShadow(ctx, P, [TWIG.poly, shell.outline].concat(adultSilhouette(st)), shell.outline);

      // 2. twig, pad, cremaster
      drawTwig(ctx, P);
      drawSilk(ctx, P, false);

      // 3-4. shell and adult
      let A;
      if (d === 0) {
        A = drawAdult(ctx, P, st);
        ctx.save();
        tracePoly(ctx, shell.outline);
        ctx.clip();
        drawDarkCase(ctx, P);
        ctx.restore();
        drawCremaster(ctx, P);
        drawSilk(ctx, P, true);
        L.inkPath(ctx, shell.jl, { width: 2.4, color: P.ink, seed: sd('tornL0'), smooth: false, taper: [2, 5], wobble: 0.3 });
        L.inkPath(ctx, shell.jr, { width: 2.4, color: P.ink, seed: sd('tornR0'), smooth: false, taper: [2, 5], wobble: 0.3 });
      } else if (d === 1) {
        drawShellBack(ctx, P, shell);
        const legs = st.feet;
        st.feet = null;
        A = drawAdult(ctx, P, st);
        // the part still inside reads as the abdomen behind clear cuticle
        ctx.save();
        tracePoly(ctx, shell.outline);
        ctx.clip();
        ctx.beginPath();
        for (const poly of adultSilhouette(st)) L.tracePath(ctx, poly, true);
        ctx.clip();
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = P.veinBlack;
        ctx.fillRect(0, 0, 1080, 1920);
        ctx.globalAlpha = 1;
        const abIn = abdomenLocal(st.sz, st.squeeze);
        for (let i = 0; i < 5; i++) {
          const u = 0.18 + i * 0.15;
          const y = lerp(abIn.top, abIn.bot, u);
          const h = abIn.hw * abdProfile(u) * 0.92;
          L.inkPath(ctx, [[540 - h, y], [540, y + 5], [540 + h, y]].map((p) => A.bm(p[0], p[1])), { width: 1.4, color: P.inkSoft, alpha: 0.9, taper: [12, 12], seed: sd('inSeg', i) });
        }
        ctx.restore();
        drawShellFront(ctx, P, shell);
        drawCremaster(ctx, P);
        drawSilk(ctx, P, true);
        drawLegs(ctx, P, A.bm, pose, legs);
      } else {
        drawShellBack(ctx, P, shell);
        drawShellFront(ctx, P, shell);
        drawCremaster(ctx, P);
        drawSilk(ctx, P, true);
        A = drawAdult(ctx, P, st);
      }

      // meconium: hangs from the abdomen tip, lets go on 17.75 and falls out of the frame
      let dropInfo = null;
      if (d >= 3) {
        const tip = A.bm(540, A.ab.bot);
        const kd = tw < 1.75 - EPS ? -1 : Math.floor((tw - 1.75) * 12 + EPS);
        if (kd < 0) {
          drawDrop(ctx, P, tip[0], tip[1] + 13, 10, 10, 5);
        } else if (kd <= 2) {
          const ys = [tip[1] + 40, 1480, 2050];
          const y = ys[kd];
          if (kd === 0) {
            // stretched teardrop, the neck strand snapping
            strokePts(ctx, [[tip[0], tip[1] + 4], [tip[0] + 0.5, tip[1] + 13]], P.ink, 1, 0.9);
            strokePts(ctx, [[tip[0] + 0.5, tip[1] + 18], [tip[0], y - 24]], P.ink, 1, 0.9);
            drawDrop(ctx, P, tip[0], y, 9, 12, 12);
          } else if (kd === 1) {
            drawDrop(ctx, P, tip[0], y, 10, 11, 7);
            for (const dx of [-7, 0, 7]) L.inkPath(ctx, [[tip[0] + dx, y - 30 - Math.abs(dx) * 2], [tip[0] + dx, y - 100]], { width: 1.5, color: P.ink, alpha: 0.7, smooth: false, taper: [2, 10], seed: sd('fall', dx) });
          } else {
            for (const dx of [-7, 0, 7]) L.inkPath(ctx, [[tip[0] + dx, 1850], [tip[0] + dx, 1925]], { width: 1.5, color: P.ink, alpha: 0.7, smooth: false, taper: [2, 10], seed: sd('fall', dx) });
          }
          dropInfo = { tip, y, kd };
        }
      }

      drawInset(ctx, P, t, lin / 3);

      // 5. overlays
      // the tear: an attention ring on the opening
      if (t < 0.42) {
        const u = t / 0.42;
        ring(ctx, 540, 884, 24 + 120 * L.ease.outExpo(u), P.annYellow, 3, 1 - u);
      }
      // the swing up onto the rim: a pencil pendulum arc and a blue motion arc beside the abdomen
      if (d === 2) {
        L.arcAnnotation(ctx, 540, 900, 200, 2.45, 1.62, { color: P.inkFaint, width: 1.5, dash: [7, 6], endTicks: 10, arrow: 12 });
        const tip = A.bm(540, abdomenLocal(0, 0).bot);
        const r = Math.hypot(tip[0] - 540, tip[1] - 900);
        const a = Math.atan2(tip[1] - 900, tip[0] - 540);
        // speed lines trail behind the tip along its swing
        arcStroke(ctx, 540, 900, r - 6, a + 0.04, a + 0.3, P.annBlue, 2, 1);
        arcStroke(ctx, 540, 900, r + 6, a + 0.04, a + 0.24, P.annBlue, 2, 1);
      }
      if (d >= 3) {
        const paths = bluePaths(A.bm, A.wm, A.ab);
        const on = L.ease.outExpo((t - 4 * TWELFTH) / 0.25);
        for (const p of paths) {
          const len = p.cum[p.cum.length - 1];
          strokePts(ctx, subPath(p.pts, p.cum, 0, len * on), P.annBlue, 2, 1);
          const end = p.pts[p.pts.length - 1];
          ring(ctx, end[0], end[1], 5, P.annBlue, 2, on);
        }
        const o0 = paths[0].pts[0];
        ring(ctx, o0[0], o0[1], 7, P.annBlue, 2, on);
        for (let i = 0; i < 3; i++) {
          const tp = PUMPS[i];
          const dt = t - tp;
          if (dt < 0 || dt > 0.62) continue;
          const u = clamp(dt / 0.3);
          for (const p of paths) {
            const len = p.cum[p.cum.length - 1];
            const h = L.ease.outCubic(u) * len;
            if (u < 1) {
              strokePts(ctx, subPath(p.pts, p.cum, Math.max(0, h - 80), h), P.annBlue, 6, 1);
              const q = pointAt(p.pts, p.cum, h);
              ring(ctx, q[0], q[1], 9, P.annBlue, 2.5, 1);
            } else {
              const v = (dt - 0.3) / 0.32;
              const end = p.pts[p.pts.length - 1];
              ring(ctx, end[0], end[1], 6 + 20 * L.ease.outExpo(v), P.annBlue, 2, 1 - v);
            }
          }
          const v0 = dt / 0.3;
          ring(ctx, o0[0], o0[1], 8 + 26 * L.ease.outExpo(v0), P.annBlue, 2.5, 1 - v0);
          const apex = A.wm(790, 1450);
          const va = dt / (10 / 24);
          ring(ctx, apex[0], apex[1], 12 + 62 * L.ease.outExpo(va), P.annYellow, 3, 1 - Math.pow(va, 1.4));
        }
        // the shake: short blue motion arcs about the wing base, just outside the apex
        if (shakeK !== 0) {
          const aA = Math.atan2(1450 - WB[1], 790 - WB[0]) + shake;
          // trailing the swing: +2 degrees moves the apex toward larger angles, so the lines sit behind it
          const lo = shakeK > 0 ? aA - 0.3 : aA + 0.05, hi = shakeK > 0 ? aA - 0.05 : aA + 0.3;
          arcStroke(ctx, WB[0], WB[1], 534, lo, hi, P.annBlue, 2, 1);
          arcStroke(ctx, WB[0], WB[1], 550, lo + (shakeK > 0 ? 0.08 : 0), hi - (shakeK > 0 ? 0 : 0.08), P.annBlue, 2, 1);
        }
        // wing-length ruler at x 880, growing with the wing
        const y1 = 985 + 465 * s;
        const rp = [[[880, 985], [880, y1]]];
        for (let j = 0; j * 46.5 <= 465 * s + 0.5; j++) {
          const y = 985 + j * 46.5;
          rp.push([[880, y], [880 + (j % 5 === 0 ? 28 : 12), y]]);
        }
        rp.push([[868, y1], [896, y1]]);
        for (const seg of rp) strokePts(ctx, seg, P.annYellow, 2, 1);
        const apex = A.wm(790, 1450);
        strokePts(ctx, [[apex[0] + 16, apex[1]], [868, y1]], P.annYellow, 2, 0.9, [14, 10]);
      }
      // the meconium's drip line and release ring
      if (dropInfo) {
        const { tip, y, kd } = dropInfo;
        const fr = frame - 42;
        strokePts(ctx, [[tip[0] + 16, tip[1] + 10], [tip[0] + 16, kd === 2 ? 1920 : y - 6]], P.annBlue, 2.5, 1, [14, 10], -fr * 8);
        if (fr >= 0 && fr < 8) ring(ctx, tip[0], tip[1] + 24, 10 + 36 * L.ease.outExpo((fr + 1) / 8), P.annYellow, 3, 1 - fr / 8);
      }
    },
  });
})();
