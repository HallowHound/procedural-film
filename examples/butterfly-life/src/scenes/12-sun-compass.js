// 12 sun-compass : "A clock in the antennae" (schematic, global T 22.0 to 23.5)
//
// Layers, back to front:
//   1 blueprint plate, guide circle r 520 at (540, 960), two frame diagonals, construction lines, rulers, brackets,
//     the dotted heading guide to the frame edge, the tick ruler at y 1660 and registration crosses
//   2 sky dome r 450 at (540, 700): armillary wireframe, skylight polarisation dashes and sky stipple centred on
//     the sun, double outline, hour ticks, sun trail, altitude arc
//   3 compass r 290 at (540, 1240): 32-point rose, dotted scale rings, stipple bezel, angle sectors (current and
//     ghosts), angle arc, azimuth line, 72 ticks, north tick, magenta heading line. Where the dial passes under the
//     head it is drawn as dashed hidden lines, so the head outline stays whole.
//   4 head from above r 110 at (540, 900): capsule, schemOrange scale stipple and inner line, white spots, palps,
//     brain (hidden lines), the sun-compass region at (540, 930) as a nucleus, compound eyes with hex lattice and
//     dorsal rim, proboscis coil at (540, 1000) as a dashed hidden spiral
//   5 antennae to spindle clubs at (330, 620) and (750, 620), a clock dial r 26 engraved on each, nerve pulses on twos
//   6 node glyphs: an enlarged copy of the left club clock (175, 1080) and the compass cells (880, 1080)
//   7 sun glyph on the dome, cycle glyph (900, 300) with the adult arc lit, heading pulse and extension
//
// Beats (local t): 0.0 draw-on and sun pop, 0.5 sun step to 40 degrees, 1.0 sun step to 80 degrees plus the
// heading pulse and extension off the lower-left edge. Clamped to the final pose for t > dur.
(function () {
  'use strict';

  const ID = 'sun-compass';
  const L = FILM.lib;
  const P = L.pal;
  const E = L.ease;
  const TAU = Math.PI * 2;
  const DEG = Math.PI / 180;
  const FR = 1 / 24;
  const SEED = L.hash(ID) % 100000;

  const LAV = P.lavender;
  const WHITE = P.lineWhite;
  const GLOW = P.glow;
  const MAG = P.magenta;
  const PALE = P.paleBlue;
  const NAVY = P.navy;
  const ORANGE = P.schemOrange; // the shot's one subject tint: dots and lines only, never fills

  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sstep = (a, b, x) => {
    const u = clamp((x - a) / (b - a));
    return u * u * (3 - 2 * u);
  };

  // ---------------------------------------------------------------------------
  // Geometry (docs/storyboard.md, section 12)
  // ---------------------------------------------------------------------------

  const DOME = { x: 540, y: 700, r: 450 };
  const HRY = 44; // horizon ellipse half-height: the dome is seen from slightly above
  const HEAD = { x: 540, y: 900, r: 110 };
  const EYES = [
    { x: 455, y: 890, rx: 45, ry: 60, s: -1 },
    { x: 625, y: 890, rx: 45, ry: 60, s: 1 },
  ];
  const COIL = { x: 540, y: 1000, r: 24 };
  const ANT = [
    { bx: 500, by: 800, cx: 330, cy: 620, s: -1 },
    { bx: 580, by: 800, cx: 750, cy: 620, s: 1 },
  ];
  const CLOCK_R = 26;
  const LENS = { x: 540, y: 930 };
  const COMP = { x: 540, y: 1240, r: 290 };
  const HEADING = 135 * DEG; // canvas angle (y down): down-left, screen angle 225 degrees
  const HEAD_LEN = 290;
  const EXT_LEN = 860;
  const GUIDE = { x: 540, y: 960, r: 520 };
  const NODE_L = { x: 175, y: 1080, r: 52 };
  const NODE_R = { x: 880, y: 1080, r: 52 };

  // ---------------------------------------------------------------------------
  // Small helpers
  // ---------------------------------------------------------------------------

  function arcPts(cx, cy, r, a0, a1, step = 5, ry = r) {
    const n = Math.max(2, Math.ceil((Math.abs(a1 - a0) * Math.max(r, ry)) / step));
    const out = [];
    for (let i = 0; i <= n; i++) {
      const a = lerp(a0, a1, i / n);
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * ry]);
    }
    return out;
  }

  function lengthOf(pts) {
    let s = 0;
    for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return s;
  }

  // first fraction u of a polyline, by arc length
  function cut(pts, u) {
    if (u >= 1) return pts;
    if (u <= 0 || pts.length < 2) return [];
    const target = lengthOf(pts) * u;
    const out = [pts[0]];
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc + d >= target) {
        const f = d ? (target - acc) / d : 0;
        out.push([lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]);
        break;
      }
      out.push(pts[i]);
      acc += d;
    }
    return out;
  }

  function pointAt(pts, u) {
    const target = lengthOf(pts) * clamp(u);
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (acc + d >= target) {
        const f = d ? (target - acc) / d : 0;
        return [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)];
      }
      acc += d;
    }
    return pts[pts.length - 1];
  }

  function quadPts(x0, y0, cx, cy, x1, y1, n = 40) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, v = 1 - u;
      out.push([v * v * x0 + 2 * u * v * cx + u * u * x1, v * v * y0 + 2 * u * v * cy + u * u * y1]);
    }
    return out;
  }

  // a schematic line: thin, even, boiling on the 12 fps clock
  function sl(ctx, pts, o) {
    if (!pts || pts.length < 2) return;
    L.inkPath(
      ctx,
      pts,
      Object.assign(
        { width: 1.5, color: LAV, alpha: 0.6, wobble: 0.7, tremble: 0.12, boilAmp: 0.55, taper: [3, 3], minWidth: 0.55, widthJitter: 0.1, swell: 0, rough: 0.1, step: 3 },
        o
      )
    );
  }

  // closed outline with draw-on progress u
  function outline(ctx, pts, u, o) {
    if (u <= 0) return;
    if (u >= 0.999) sl(ctx, pts, Object.assign({ closed: true, overlap: 6 }, o));
    else sl(ctx, cut(pts.concat([pts[0]]), u), o);
  }

  // art bible 3.2 primary double outline: outer 2.5 px lavender 85 percent, inner 1.5 px 50 percent
  function doubleOutline(ctx, outer, inner, u, seed, closed = true, o = {}) {
    const a = o.alpha != null ? o.alpha : 1;
    const col = o.color || LAV;
    if (closed) {
      outline(ctx, outer, u, { width: 2.5, alpha: 0.85 * a, seed, color: col });
      outline(ctx, inner, u, { width: 1.5, alpha: 0.5 * a, seed: seed + 1, color: col });
    } else {
      sl(ctx, cut(outer, u), { width: 2.5, alpha: 0.85 * a, seed, color: col });
      sl(ctx, cut(inner, u), { width: 1.5, alpha: 0.5 * a, seed: seed + 1, color: col });
    }
  }

  function strokeP(ctx, p, color, alpha, width, dash) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha *= alpha;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (dash) ctx.setLineDash(dash);
    ctx.stroke(p);
    ctx.restore();
  }

  function fillP(ctx, p, color, alpha) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha *= alpha;
    ctx.fill(p);
    ctx.restore();
  }

  // boil jitter for hand-built Path2D geometry
  const jit = (i, k, bi, amp = 0.45) => (L.h3(i, k * 31 + 7, bi * 13 + SEED) - 0.5) * 2 * amp;

  // radial ticks along an arc, boiling; dir +1 outward, -1 inward
  function tickArc(ctx, cx, cy, r, o) {
    const n = o.n;
    const a0 = o.a0 != null ? o.a0 : 0;
    const span = o.span != null ? o.span : TAU;
    const full = Math.abs(span - TAU) < 1e-6;
    const dir = o.dir || 1;
    const bi = o.bi || 0;
    const prog = o.p != null ? clamp(o.p) : 1;
    const minor = new Path2D();
    const major = new Path2D();
    const count = full ? n : n + 1;
    const shown = Math.round(count * prog);
    for (let i = 0; i < shown; i++) {
      if (o.skip && o.skip(i)) continue;
      const a = a0 + (i / n) * span + jit(i, 1, bi, 0.002);
      const isMajor = o.major && i % o.major === 0;
      const len = (isMajor ? o.majorLen : o.len) * dir;
      const c = Math.cos(a), s = Math.sin(a);
      const r0 = r + jit(i, 2, bi, 0.4), r1 = r + len + jit(i, 3, bi, 0.5);
      const tgt = isMajor ? major : minor;
      tgt.moveTo(cx + c * r0, cy + s * r0);
      tgt.lineTo(cx + c * r1, cy + s * r1);
    }
    strokeP(ctx, minor, o.color || LAV, o.alpha != null ? o.alpha : 0.5, o.width || 1.2, o.dash);
    if (o.major) strokeP(ctx, major, o.majorColor || o.color || WHITE, o.majorAlpha != null ? o.majorAlpha : 0.6, o.majorWidth || 1.5, o.dash);
  }

  // the head silhouette (capsule circle plus both eyes) as a clip: inside it, or outside it
  function headShape(p, pad = 0) {
    p.moveTo(HEAD.x + HEAD.r + pad, HEAD.y);
    p.arc(HEAD.x, HEAD.y, HEAD.r + pad, 0, TAU);
    for (const e of EYES) {
      p.moveTo(e.x + e.rx + pad, e.y);
      p.ellipse(e.x, e.y, e.rx + pad, e.ry + pad, 0, 0, TAU);
    }
  }
  function clipInsideHead(ctx, pad = 0) {
    ctx.beginPath();
    headShape(ctx, pad);
    ctx.clip('nonzero');
  }
  function clipOutsideHead(ctx, pad = 0) {
    // two nested even-odd clips, so the overlap of the capsule and an eye is still cut out
    ctx.beginPath();
    ctx.rect(-50, -50, 1180, 2020);
    ctx.moveTo(HEAD.x + HEAD.r + pad, HEAD.y);
    ctx.arc(HEAD.x, HEAD.y, HEAD.r + pad, 0, TAU);
    ctx.clip('evenodd');
    ctx.beginPath();
    ctx.rect(-50, -50, 1180, 2020);
    for (const e of EYES) {
      ctx.moveTo(e.x + e.rx + pad, e.y);
      ctx.ellipse(e.x, e.y, e.rx + pad, e.ry + pad, 0, 0, TAU);
    }
    ctx.clip('evenodd');
  }
  // draw fn twice: solid outside the head, and as a dashed hidden line (fnHidden) inside it
  function underHead(ctx, fn, fnHidden) {
    ctx.save();
    clipOutsideHead(ctx);
    fn(ctx);
    ctx.restore();
    if (fnHidden) {
      ctx.save();
      clipInsideHead(ctx);
      fnHidden(ctx);
      ctx.restore();
    }
  }
  const HIDDEN = [4, 4];

  // local progress helpers
  // stepK: the move is already under way on the beat frame (1/frames of the way), nothing on the frame before
  const stepK = (t, tb, frames) => clamp((t - tb + FR - 1e-4) / (frames * FR));
  // decay: full on the beat frame, fading to nothing over the given frames
  const decay = (t, tb, frames) => {
    const u = (t - tb + 1e-4) / (frames * FR);
    return u < 0 || u > 1 ? 0 : (1 - u) * (1 - u);
  };

  // ---------------------------------------------------------------------------
  // 1 Background plate and guides
  // ---------------------------------------------------------------------------

  function drawPlate(ctx, u, bi, t) {
    L.blueprint(ctx, { center: [540, 960], circles: 0, diagonals: 0, seed: 12 });
    // two long frame diagonals crossing at the guide centre
    const diag = new Path2D();
    diag.moveTo(-40, -71);
    diag.lineTo(1120, 1991);
    diag.moveTo(1120, -71);
    diag.lineTo(-40, 1991);
    strokeP(ctx, diag, LAV, 0.12, 1);
    // guide circle r 520 at (540, 960), with a slow tick ring
    L.guideCircle(ctx, GUIDE.x, GUIDE.y, GUIDE.r, { alpha: 0.18, width: 1.5, p: u, start: -Math.PI / 2 });
    // graduated scale through both flanks and the arc below the dial
    tickArc(ctx, GUIDE.x, GUIDE.y, GUIDE.r, {
      n: 50,
      a0: 15 * DEG,
      span: 150 * DEG,
      len: 8,
      major: 10,
      majorLen: 16,
      color: LAV,
      alpha: 0.35,
      majorColor: WHITE,
      majorAlpha: 0.45,
      width: 1.2,
      majorWidth: 1.5,
      bi,
      p: u,
    });
    const g548 = new Path2D();
    g548.arc(GUIDE.x, GUIDE.y, 548, 15 * DEG, 15 * DEG + 150 * DEG * u);
    strokeP(ctx, g548, LAV, 0.15, 1, [2, 8]);
    L.guideCircle(ctx, GUIDE.x, GUIDE.y, GUIDE.r - 22, { alpha: 0.08, width: 1, dash: [2, 8], p: u });
    // construction lines: the dome horizon, the compass centre line, the frame axis
    const cons = new Path2D();
    cons.moveTo(0, DOME.y);
    cons.lineTo(1080, DOME.y);
    cons.moveTo(0, COMP.y);
    cons.lineTo(1080, COMP.y);
    strokeP(ctx, cons, LAV, 0.1 * u, 1);
    const axis = new Path2D();
    axis.moveTo(540, 120);
    axis.lineTo(540, 1800);
    strokeP(ctx, axis, LAV, 0.1 * u, 1, [10, 8]);
    // tangents from the dome feet down to the dial
    const tan = new Path2D();
    for (const sgn of [-1, 1]) {
      const px = DOME.x + sgn * DOME.r, py = DOME.y;
      const dxp = px - COMP.x, dyp = py - COMP.y;
      const dd = Math.hypot(dxp, dyp);
      const base = Math.atan2(dyp, dxp);
      const off = Math.acos(COMP.r / dd);
      const ta = base - sgn * off;
      const tx = COMP.x + Math.cos(ta) * COMP.r, ty = COMP.y + Math.sin(ta) * COMP.r;
      tan.moveTo(px, py);
      tan.lineTo(tx + (tx - px) * 0.35, ty + (ty - py) * 0.35);
    }
    strokeP(ctx, tan, LAV, 0.13 * u, 1, [8, 6]);
    // the heading direction as a faint construction diagonal, back from the compass centre up-right
    const hd = new Path2D();
    hd.moveTo(COMP.x + 60, COMP.y - 60);
    hd.lineTo(COMP.x + 700, COMP.y - 700);
    strokeP(ctx, hd, LAV, 0.07 * u, 1, [3, 9]);
    // dotted guide laid along the heading from the rim to the frame edge, ready for the extension on T 23.0:
    // 1 px lavender at 14 percent, 3 px dots every 10 px
    const hx0 = COMP.x + Math.cos(HEADING) * COMP.r, hy0 = COMP.y + Math.sin(HEADING) * COMP.r;
    const hLen = (hx0 - 0) / -Math.cos(HEADING);
    const gl = new Path2D();
    gl.moveTo(hx0, hy0);
    gl.lineTo(hx0 + Math.cos(HEADING) * (hLen + 10) * u, hy0 + Math.sin(HEADING) * (hLen + 10) * u);
    strokeP(ctx, gl, LAV, 0.14, 1, [3, 7]);
    // heading tolerance cone: lavender stipple ±8 degrees around the heading, r 300 to the frame edge
    {
      const conePulse = decay(t, 1.0, 12);
      ctx.save();
      ctx.globalAlpha *= u;
      L.stipple(ctx, sectorPoly(COMP.x, COMP.y, 300, 980, 127 * DEG, 143 * DEG), {
        spacing: 9,
        r: [0.8, 1.6],
        color: LAV,
        alpha: 0.3 + 0.3 * conePulse,
        seed: SEED + 12,
        density: (x, y) => {
          const d = Math.hypot(x - COMP.x, y - COMP.y);
          if (d < 300) return 0;
          return lerp(0.49, 0.98, sstep(300, 900, d));
        },
      });
      ctx.restore();
    }
    // a fine scale along the guide, longer every 150 px
    const gt = new Path2D();
    const gnx = -Math.sin(HEADING), gny = Math.cos(HEADING);
    for (let s = 50; s <= hLen * u; s += 50) {
      const x = hx0 + Math.cos(HEADING) * s + jit(s, 60, bi, 0.3), y = hy0 + Math.sin(HEADING) * s;
      const l = s % 150 === 0 ? 12 : 6;
      gt.moveTo(x - gnx * l, y - gny * l);
      gt.lineTo(x + gnx * l, y + gny * l);
    }
    strokeP(ctx, gt, LAV, 0.16, 1);
    // tick ruler along the bottom at y 1660, with registration crosses under its ends
    const RY = 1660, RX0 = 100, RX1 = 980;
    const rl = new Path2D();
    const rlMaj = new Path2D();
    const rxEnd = lerp(RX0, RX1, u);
    rl.moveTo(RX0, RY);
    rl.lineTo(rxEnd, RY);
    for (let x = RX0, i = 0; x <= rxEnd + 0.1; x += 30, i++) {
      const maj = i % 5 === 0;
      const tgt = maj ? rlMaj : rl;
      tgt.moveTo(x + jit(i, 61, bi, 0.3), RY);
      tgt.lineTo(x + jit(i, 62, bi, 0.3), RY + (maj ? 24 : 12));
    }
    strokeP(ctx, rl, LAV, 0.35, 1.5);
    strokeP(ctx, rlMaj, LAV, 0.35, 1.5);
    // finer half-steps between the ticks
    const rf = new Path2D();
    for (let x = RX0 + 15, i = 0; x <= rxEnd; x += 30, i++) {
      rf.moveTo(x, RY);
      rf.lineTo(x, RY + 5 + jit(i, 63, bi, 0.4));
    }
    strokeP(ctx, rf, LAV, 0.22, 1);
    const reg = new Path2D();
    for (const x of [RX0, RX1]) {
      const y = 1760;
      reg.moveTo(x - 18, y);
      reg.lineTo(x + 18, y);
      reg.moveTo(x, y - 18);
      reg.lineTo(x, y + 18);
      reg.moveTo(x + 9, y);
      reg.arc(x, y, 9, 0, TAU);
    }
    strokeP(ctx, reg, LAV, 0.4 * u, 1.2);
    const regLink = new Path2D();
    regLink.moveTo(RX0, RY + 30);
    regLink.lineTo(RX0, 1742);
    regLink.moveTo(RX1, RY + 30);
    regLink.lineTo(RX1, 1742);
    strokeP(ctx, regLink, LAV, 0.14 * u, 1, [2, 5]);
    // left ruler
    const rule = new Path2D();
    const majorRule = new Path2D();
    rule.moveTo(60, 230);
    rule.lineTo(60, 1530);
    for (let y = 240, i = 0; y <= 1520; y += 20, i++) {
      const tgt = i % 5 === 0 ? majorRule : rule;
      tgt.moveTo(60, y + jit(i, 5, bi, 0.3));
      tgt.lineTo(60 + (i % 5 === 0 ? 20 : 9), y + jit(i, 6, bi, 0.3));
    }
    strokeP(ctx, rule, LAV, 0.3 * u, 1);
    strokeP(ctx, majorRule, LAV, 0.45 * u, 1.3);
    // measurement brackets (no numbers): dome height at the right edge, compass width below
    L.bracket(ctx, 1012, DOME.y - DOME.r, 1012, DOME.y, { p: u, alpha: 0.45, cap: 16 });
    L.bracket(ctx, COMP.x - COMP.r, 1590, COMP.x + COMP.r, 1590, { p: u, alpha: 0.4, cap: 16 });
    const ext = new Path2D();
    ext.moveTo(COMP.x - COMP.r, 1250);
    ext.lineTo(COMP.x - COMP.r, 1600);
    ext.moveTo(COMP.x + COMP.r, 1250);
    ext.lineTo(COMP.x + COMP.r, 1600);
    ext.moveTo(990, DOME.y - DOME.r);
    ext.lineTo(1024, DOME.y - DOME.r);
    strokeP(ctx, ext, LAV, 0.14 * u, 1, [2, 5]);
  }

  // ---------------------------------------------------------------------------
  // 2 Sky dome
  // ---------------------------------------------------------------------------

  const domeProj = (X, Y, Z) => [DOME.x + X * DOME.r, DOME.y - Y * DOME.r + Z * HRY];
  const DOME_SIL = arcPts(DOME.x, DOME.y, DOME.r, Math.PI, TAU, 5);
  const DOME_SIL_IN = arcPts(DOME.x, DOME.y, DOME.r - 9, Math.PI + 0.02, TAU - 0.02, 5);
  const DOME_CLIP = DOME_SIL.concat([[DOME.x + DOME.r, DOME.y], [DOME.x - DOME.r, DOME.y]]);

  const MERIDIANS = [30, 60, 90, 120, 150].map((phi) => {
    const front = [], back = [];
    const cp = Math.cos(phi * DEG), sp = Math.sin(phi * DEG);
    for (let h = 0; h <= 180; h += 3) {
      const ch = Math.cos(h * DEG), shh = Math.sin(h * DEG);
      const pt = domeProj(ch * cp, shh, ch * sp);
      if (h <= 90) front.push(pt);
      if (h >= 90) back.push(pt);
    }
    return { front, back };
  });
  const ALMUCANTARS = [15, 30, 45, 60, 75].map((alt) => {
    const front = [], back = [];
    const ca = Math.cos(alt * DEG), sa = Math.sin(alt * DEG);
    for (let th = 0; th <= 360; th += 4) {
      const pt = domeProj(ca * Math.cos(th * DEG), sa, ca * Math.sin(th * DEG));
      if (th <= 180) front.push(pt);
      if (th >= 180) back.push(pt);
    }
    return { front, back };
  });
  const HORIZON_FRONT = arcPts(DOME.x, DOME.y, DOME.r, 0, Math.PI, 6, HRY);
  const HORIZON_BACK = arcPts(DOME.x, DOME.y, DOME.r, Math.PI, TAU, 6, HRY);

  const sunXY = (along) => [DOME.x - DOME.r * Math.cos(along * DEG), DOME.y - DOME.r * Math.sin(along * DEG)];

  // distance from (x, y) to the segment a-b
  function segDist(x, y, ax, ay, bx, by) {
    const vx = bx - ax, vy = by - ay;
    const w = clamp(((x - ax) * vx + (y - ay) * vy) / (vx * vx + vy * vy || 1));
    return Math.hypot(x - ax - vx * w, y - ay - vy * w);
  }

  // skylight polarisation: short dashes on a 34 px triangular lattice, each tangent to the circle centred on the
  // sun (the e-vector pattern the dorsal rim of the eye reads), stronger with distance from the sun
  const POL_PTS = (() => {
    const out = [];
    const sp = 34, rowH = sp * 0.866;
    for (let i = 0; i * rowH <= DOME.r + 10; i++) {
      const y = DOME.y - 14 - i * rowH;
      const off = i & 1 ? sp / 2 : 0;
      for (let x = DOME.x - DOME.r + off; x <= DOME.x + DOME.r; x += sp) {
        if (Math.hypot(x - DOME.x, y - DOME.y) > DOME.r - 20) continue;
        let skip = false;
        for (const A of ANT) {
          const dx = A.cx - A.bx, dy = A.cy - A.by;
          const l = Math.hypot(dx, dy);
          const ux = dx / l, uy = dy / l;
          if (segDist(x, y, A.cx - ux * 178, A.cy - uy * 178, A.cx + ux * 72, A.cy + uy * 72) < 40) skip = true;
          if (segDist(x, y, A.bx, A.by, A.cx, A.cy) < 12) skip = true;
        }
        if (!skip) out.push([x, y, out.length]);
      }
    }
    return out;
  })();

  function drawPolarisation(ctx, u, bi, sx, sy) {
    if (u <= 0) return;
    const near = new Path2D();
    const far = new Path2D();
    const shown = Math.round(POL_PTS.length * u);
    for (let k = 0; k < shown; k++) {
      const [x0, y0, i] = POL_PTS[k];
      const x = x0 + jit(i, 70, bi, 0.7), y = y0 + jit(i, 71, bi, 0.7);
      const dx = x - sx, dy = y - sy;
      const d = Math.hypot(dx, dy);
      if (d < 50) continue;
      const a = Math.atan2(dy, dx) + Math.PI / 2 + jit(i, 72, bi, 0.04);
      const hl = 5.5;
      const tgt = d < 150 ? near : far;
      tgt.moveTo(x - Math.cos(a) * hl, y - Math.sin(a) * hl);
      tgt.lineTo(x + Math.cos(a) * hl, y + Math.sin(a) * hl);
    }
    strokeP(ctx, near, LAV, 0.13, 1);
    strokeP(ctx, far, LAV, 0.22, 1);
  }

  function drawDome(ctx, u, bi, along, stepsDone, t) {
    // armillary wireframe: back halves dashed and faint, front halves solid
    for (let i = 0; i < MERIDIANS.length; i++) {
      const m = MERIDIANS[i];
      sl(ctx, cut(m.back, u), { width: 1, alpha: 0.13, seed: SEED + 20 + i, wobble: 0.5 });
      sl(ctx, cut(m.front, u), { width: 1.1, alpha: 0.24, seed: SEED + 30 + i, wobble: 0.5 });
    }
    for (let i = 0; i < ALMUCANTARS.length; i++) {
      const a = ALMUCANTARS[i];
      const pb = new Path2D();
      L.tracePath(pb, cut(a.back, u), false);
      strokeP(ctx, pb, LAV, 0.14, 1, [3, 6]);
      sl(ctx, cut(a.front, u), { width: 1.1, alpha: 0.22, seed: SEED + 40 + i, wobble: 0.5 });
    }
    const hb = new Path2D();
    L.tracePath(hb, cut(HORIZON_BACK, u), false);
    strokeP(ctx, hb, LAV, 0.3, 1.2, [5, 6]);
    sl(ctx, cut(HORIZON_FRONT, u), { width: 1.5, alpha: 0.5, seed: SEED + 50 });

    // sky light: stipple built by distance from the sun, 0.015 dots/px2 within 80 px falling to 0.003 at 350 px
    // (spacing 7.5 gives 0.0205 dots/px2 at density 1)
    const [hsx, hsy] = sunXY(along);
    ctx.save();
    ctx.globalAlpha *= u;
    L.stipple(ctx, DOME_CLIP, {
      spacing: 7.5,
      r: [0.6, 1.5],
      color: LAV,
      alpha: 0.5,
      seed: SEED + 60,
      density: (x, y) => {
        const d = Math.hypot(x - hsx, y - hsy);
        if (d < 34) return 0;
        return lerp(0.73, 0.146, sstep(80, 350, d));
      },
    });
    ctx.restore();
    drawPolarisation(ctx, u, bi, hsx, hsy);

    // baseline, a thick segment across the dome feet
    sl(ctx, cut([[DOME.x - DOME.r - 30, DOME.y], [DOME.x + DOME.r + 30, DOME.y]], u), { width: 1.6, alpha: 0.55, seed: SEED + 51, smooth: false });

    // double outline
    halo(ctx, cut(DOME_SIL, u), false, 0.06, 12);
    doubleOutline(ctx, DOME_SIL, DOME_SIL_IN, u, SEED + 52, false);

    // hour ticks: majors every 15 degrees, quarter-hour minors, outward
    tickArc(ctx, DOME.x, DOME.y, DOME.r + 3, { n: 48, a0: Math.PI, span: Math.PI, len: 9, major: 4, majorLen: 22, dir: 1, color: LAV, alpha: 0.5, majorColor: WHITE, majorAlpha: 0.62, width: 1.2, majorWidth: 1.6, bi, p: u });
    // fine inner scale
    tickArc(ctx, DOME.x, DOME.y, DOME.r - 12, { n: 180, a0: Math.PI, span: Math.PI, len: 4, dir: -1, color: LAV, alpha: 0.22, width: 1, bi, p: u });

    // observer at the dome centre
    const obs = new Path2D();
    obs.moveTo(DOME.x - 14, DOME.y);
    obs.lineTo(DOME.x + 14, DOME.y);
    obs.moveTo(DOME.x, DOME.y - 14);
    obs.lineTo(DOME.x, DOME.y + 6);
    obs.moveTo(DOME.x + 6, DOME.y);
    obs.arc(DOME.x, DOME.y, 6, 0, TAU);
    strokeP(ctx, obs, LAV, 0.5 * u, 1.2);

    if (u < 0.2) return;
    const [sx, sy] = sunXY(along);
    // sky brightness contours around the sun, clipped to the dome
    ctx.save();
    ctx.beginPath();
    L.tracePath(ctx, DOME_CLIP, true);
    ctx.clip();
    const iso = new Path2D();
    const isoFine = new Path2D();
    for (const [rr, dots] of [[70, 0], [118, 1], [178, 0], [250, 1], [335, 1]]) {
      const n = Math.round((rr * TAU) / (dots ? 9 : 5));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rr * 0.01;
        const x = sx + Math.cos(a) * (rr + jit(i, rr, bi, 0.6)), y = sy + Math.sin(a) * rr;
        const tgt = dots ? isoFine : iso;
        tgt.moveTo(x + (dots ? 1.3 : 1.6), y);
        tgt.arc(x, y, dots ? 1.3 : 1.6, 0, TAU);
      }
    }
    fillP(ctx, iso, GLOW, 0.26 * u);
    fillP(ctx, isoFine, LAV, 0.28 * u);
    ctx.restore();
    // sun path: past trail in glow dots, the rest of the day faint
    const trail = new Path2D();
    const future = new Path2D();
    for (let a = 0; a <= 180; a += 2.5) {
      const r = DOME.r - 24;
      const x = DOME.x - r * Math.cos(a * DEG), y = DOME.y - r * Math.sin(a * DEG);
      if (a <= along) {
        trail.moveTo(x + 2, y);
        trail.arc(x, y, 2, 0, TAU);
      } else if (a % 5 === 0) {
        future.moveTo(x + 1.2, y);
        future.arc(x, y, 1.2, 0, TAU);
      }
    }
    fillP(ctx, trail, GLOW, 0.6 * u);
    fillP(ctx, future, LAV, 0.3 * u);
    // ghost suns at the positions already left
    const ghosts = new Path2D();
    for (let k = 0; k < stepsDone; k++) {
      const [gx, gy] = sunXY(k * 40);
      ghosts.moveTo(gx + 12, gy);
      ghosts.arc(gx, gy, 12, 0, TAU);
      ghosts.moveTo(gx + 3, gy);
      ghosts.arc(gx, gy, 3, 0, TAU);
    }
    strokeP(ctx, ghosts, LAV, 0.45, 1.2);
    // step measures: a 40 degree arc annotation inside the dome for each step taken, drawn on with the step
    for (let k = 0; k < 2; k++) {
      const tb = 0.5 + k * 0.5;
      const p = E.outExpo(stepK(t, tb, 6));
      if (p <= 0) continue;
      const a0 = Math.PI + k * 40 * DEG, a1 = Math.PI + (k + 1) * 40 * DEG;
      L.arcAnnotation(ctx, DOME.x, DOME.y, 398, a0, a1, { color: LAV, alpha: 0.55, width: 1.3, p, endTicks: 10 });
      // the mid-arc tick
      if (p >= 1) {
        const am = (a0 + a1) / 2;
        const mt = new Path2D();
        mt.moveTo(DOME.x + Math.cos(am) * 394, DOME.y + Math.sin(am) * 394);
        mt.lineTo(DOME.x + Math.cos(am) * 402, DOME.y + Math.sin(am) * 402);
        strokeP(ctx, mt, LAV, 0.4, 1);
      }
    }
    // altitude: radius to the sun, drop line to the horizon, and a small angle arc at the observer
    const rad = new Path2D();
    rad.moveTo(DOME.x, DOME.y);
    rad.lineTo(sx, sy);
    strokeP(ctx, rad, LAV, 0.28, 1, [6, 5]);
    const drop = new Path2D();
    drop.moveTo(sx, sy + 20);
    drop.lineTo(sx, DOME.y);
    strokeP(ctx, drop, LAV, 0.25, 1, [2, 5]);
    L.arcAnnotation(ctx, DOME.x, DOME.y, 78, Math.PI, Math.PI + Math.max(0.001, along * DEG), { color: LAV, alpha: 0.6, width: 1.5, endTicks: 8 });
  }

  function drawSightLines(ctx, along, u) {
    if (u <= 0) return;
    const [sx, sy] = sunXY(along);
    for (const e of EYES) {
      const tx = e.x + e.s * 6, ty = e.y - e.ry + 4;
      const p = new Path2D();
      const d = Math.hypot(tx - sx, ty - sy);
      const ux = (tx - sx) / d, uy = (ty - sy) / d;
      p.moveTo(sx + ux * 52, sy + uy * 52);
      p.lineTo(tx - ux * 14, ty - uy * 14);
      strokeP(ctx, p, PALE, 0.5 * u, 1.3, [8, 6]);
      const hit = new Path2D();
      hit.moveTo(tx + 5, ty);
      hit.arc(tx, ty, 5, 0, TAU);
      strokeP(ctx, hit, PALE, 0.7 * u, 1.3);
    }
  }

  function drawSun(ctx, along, pop, pulse, bi) {
    if (pop <= 0) return;
    const [sx, sy] = sunXY(along);
    const s = pop;
    L.glowDot(ctx, sx, sy, 11 * s, { rays: 12, rayLen: 3.3, rayWidth: 0.24, glow: 5.5, intensity: 1.05 + 0.7 * pulse, seed: SEED + 70, rot: 0.13 + bi * 0.02 });
    const ring = new Path2D();
    ring.arc(sx, sy, 24 * s, 0, TAU);
    strokeP(ctx, ring, WHITE, 0.55, 1.3);
    tickArc(ctx, sx, sy, 32 * s, { n: 16, len: 14 * s, major: 2, majorLen: 20 * s, color: WHITE, alpha: 0.45, majorColor: WHITE, majorAlpha: 0.7, width: 1.3, majorWidth: 1.5, bi, a0: bi * 0.03 });
    if (pulse > 0) {
      const pr = new Path2D();
      pr.arc(sx, sy, lerp(80, 30, pulse), 0, TAU);
      strokeP(ctx, pr, GLOW, 0.55 * pulse, 2);
    }
  }

  // ---------------------------------------------------------------------------
  // 3 Compass
  // ---------------------------------------------------------------------------

  const COMP_OUT = L.ellipsePts(COMP.x, COMP.y, COMP.r, COMP.r, 180, -Math.PI / 2);
  const COMP_IN = L.ellipsePts(COMP.x, COMP.y, COMP.r - 9, COMP.r - 9, 180, -Math.PI / 2);

  function sectorPoly(cx, cy, r0, r1, a0, a1) {
    const out = arcPts(cx, cy, r1, a0, a1, 8);
    const inner = arcPts(cx, cy, r0, a1, a0, 8);
    return out.concat(inner);
  }

  // soft additive halo under a primary outline, so it reads at phone size
  function halo(ctx, pts, closed, alpha, width = 9, color = LAV) {
    if (!pts || pts.length < 2) return;
    const p = new Path2D();
    L.tracePath(p, pts, closed);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    strokeP(ctx, p, color, alpha, width);
    strokeP(ctx, p, color, alpha * 0.8, width * 0.45);
    ctx.restore();
  }

  // everything inside the dial that sits under the head
  function drawCompassUnder(ctx, u, uHead, bi, az, prevAz, uNodes) {
    const { x: cx, y: cy, r } = COMP;
    // faint inner discs
    L.guideCircle(ctx, cx, cy, 250, { alpha: 0.28, width: 1, dash: [3, 7], p: u });
    L.guideCircle(ctx, cx, cy, 60, { alpha: 0.14, width: 1, p: u });
    L.guideCircle(ctx, cx, cy, 36, { alpha: 0.1, width: 1, dash: [2, 4], p: u });
    // dotted scale rings at r 120 and r 200, each with a 36-tick scale
    for (const [rr, sd] of [[120, 0], [200, 1]]) {
      const n = Math.round((rr * TAU) / 7);
      const dots = new Path2D();
      const shown = Math.round(n * u);
      for (let i = 0; i < shown; i++) {
        const a = -Math.PI / 2 + (i / n) * TAU;
        const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        dots.moveTo(x + 1.1, y);
        dots.arc(x, y, 1.1, 0, TAU);
      }
      fillP(ctx, dots, LAV, 0.4);
      tickArc(ctx, cx, cy, rr + 2, { n: 36, a0: -Math.PI / 2 + sd * (Math.PI / 36), len: 6, dir: 1, color: LAV, alpha: 0.35, width: 1, bi, p: u });
    }
    // 32-point rose: radial hairlines from r 60 to r 250, the eight principal points a shade brighter
    const rose = new Path2D();
    const roseMaj = new Path2D();
    for (let k = 1; k < 32; k++) {
      const a = -Math.PI / 2 + (k * TAU) / 32;
      const r1 = lerp(60, 250, u);
      const tgt = k % 4 === 0 ? roseMaj : rose;
      tgt.moveTo(cx + Math.cos(a) * 60 + jit(k, 8, bi, 0.3), cy + Math.sin(a) * 60);
      tgt.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 + jit(k, 9, bi, 0.3));
    }
    strokeP(ctx, rose, LAV, 0.12, 1);
    strokeP(ctx, roseMaj, LAV, 0.2, 1);
    // north rose spoke r 60 to r 196, brighter than the rest, no letter
    const nSpoke = new Path2D();
    const nR1 = lerp(60, 196, u);
    nSpoke.moveTo(cx, cy - 60);
    nSpoke.lineTo(cx, cy - nR1);
    strokeP(ctx, nSpoke, WHITE, 0.55, 1.5);
    // small diamonds on the cardinal and intercardinal spokes, no letters
    const dia = new Path2D();
    for (let k = 1; k < 8; k++) {
      const a = -Math.PI / 2 + (k * TAU) / 8;
      const rr = k % 2 ? 214 : 232;
      const s = k % 2 ? 4 : 6;
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      const ca = Math.cos(a), sa = Math.sin(a);
      dia.moveTo(x + ca * s * 1.6, y + sa * s * 1.6);
      dia.lineTo(x - sa * s, y + ca * s);
      dia.lineTo(x - ca * s * 1.6, y - sa * s * 1.6);
      dia.lineTo(x + sa * s, y - ca * s);
      dia.closePath();
    }
    strokeP(ctx, dia, LAV, 0.45 * u, 1.1);

    // shade on the dial face: a sparse stipple tone gathering toward the lower right, away from the light
    if (uNodes > 0) {
      ctx.save();
      ctx.globalAlpha *= uNodes;
      L.stipple(ctx, null, {
        bounds: [cx - 250, cy - 250, 500, 500],
        spacing: 7,
        r: [0.6, 1.2],
        color: LAV,
        alpha: 0.38,
        seed: SEED + 86,
        density: (x, y) => {
          const d = Math.hypot(x - cx, y - cy);
          if (d > 248 || d < 64) return 0;
          const side = ((x - cx) * 0.6 + (y - cy) * 0.8) / d;
          return 0.28 * sstep(-0.1, 0.95, side) * sstep(64, 200, d);
        },
      });
      ctx.restore();
    }

    // stipple bezel r 255 to 280 around the full ring: full density on the shadow side, half on the lit side
    if (uNodes > 0) {
      ctx.save();
      ctx.globalAlpha *= uNodes;
      L.stipple(ctx, null, {
        bounds: [cx - r, cy - r, 2 * r, 2 * r],
        spacing: 5.5,
        r: [0.6, 1.3],
        color: LAV,
        alpha: 0.5,
        seed: SEED + 82,
        density: (x, y) => {
          const d = Math.hypot(x - cx, y - cy);
          if (d > 280 || d < 255) return 0;
          const side = ((x - cx) * 0.6 + (y - cy) * 0.8) / d;
          const edge = sstep(255, 262, d) * (1 - sstep(274, 280, d));
          return (0.3 + 0.3 * sstep(-0.3, 0.8, side)) * edge;
        },
      });
      ctx.restore();
    }

    // the angle held between the sun and the heading: stippled sector, with ghost sectors for the earlier azimuths
    // so the history of the angle builds up over the beats
    const a0 = HEADING, a1 = az < HEADING ? az + TAU : az;
    if (uNodes > 0) {
      ctx.save();
      ctx.globalAlpha *= uNodes;
      for (let k = 0; k < prevAz.length; k++) {
        const pa = prevAz[k] < HEADING ? prevAz[k] + TAU : prevAz[k];
        L.stipple(ctx, sectorPoly(cx, cy, 40, 246, a0, pa), {
          spacing: 6.5,
          r: [0.6, 1.3],
          color: LAV,
          alpha: 0.45,
          seed: SEED + 84 + k * 3,
          density: 0.12,
        });
      }
      L.stipple(ctx, sectorPoly(cx, cy, 40, 246, a0, a1), {
        spacing: 6.5,
        r: [0.7, 1.5],
        color: PALE,
        alpha: 0.7,
        seed: SEED + 80,
        density: (x, y) => 0.35 + 0.55 * sstep(40, 246, Math.hypot(x - cx, y - cy)),
      });
      ctx.restore();
    }

    // knurled bezel: short radial strokes building shade on the lower right
    if (uNodes > 0) {
      const kn = new Path2D();
      const nK = 240;
      for (let i = 0; i < nK; i++) {
        const a = (i / nK) * TAU;
        const shade = sstep(-0.05, 0.85, Math.cos(a - 0.93));
        if (shade <= 0.02 || L.h3(i, 3, SEED) > shade) continue;
        const r0 = r - 16 - shade * 8 + jit(i, 40, bi, 0.5), r1 = r - 14 + jit(i, 41, bi, 0.4);
        const aj = a + jit(i, 42, bi, 0.003);
        kn.moveTo(cx + Math.cos(aj) * r0, cy + Math.sin(aj) * r0);
        kn.lineTo(cx + Math.cos(aj) * r1, cy + Math.sin(aj) * r1);
      }
      strokeP(ctx, kn, LAV, 0.42 * uNodes, 1);
    }
    // fine degree ring
    tickArc(ctx, cx, cy, r - 36, { n: 360, a0: -Math.PI / 2, len: 4, major: 10, majorLen: 8, dir: -1, color: LAV, alpha: 0.24, majorColor: LAV, majorAlpha: 0.4, width: 0.9, majorWidth: 1, bi, p: u });

    // centre
    const cc = new Path2D();
    cc.moveTo(cx - 16, cy);
    cc.lineTo(cx + 16, cy);
    cc.moveTo(cx, cy - 16);
    cc.lineTo(cx, cy + 16);
    cc.moveTo(cx + 9, cy);
    cc.arc(cx, cy, 9, 0, TAU);
    strokeP(ctx, cc, LAV, 0.6 * u, 1.2);

    // ghosts of the earlier azimuths and their arcs
    for (let k = 0; k < prevAz.length; k++) {
      const g = new Path2D();
      const pa = prevAz[k];
      g.moveTo(cx + Math.cos(pa) * 30, cy + Math.sin(pa) * 30);
      g.lineTo(cx + Math.cos(pa) * (r - 12), cy + Math.sin(pa) * (r - 12));
      strokeP(ctx, g, LAV, 0.32, 1, [4, 6]);
      const ga = new Path2D();
      const rr = 150 + (k + 1) * 16;
      ga.arc(cx, cy, rr, HEADING, pa < HEADING ? pa + TAU : pa);
      strokeP(ctx, ga, LAV, 0.32, 1.1, [2, 4]);
    }

    // azimuth line toward the sun, from the centre to the rim: additive lavender under a white stroke
    if (uHead > 0) {
      const ex = cx + Math.cos(az) * r, ey = cy + Math.sin(az) * r;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const gz = new Path2D();
      gz.moveTo(cx, cy);
      gz.lineTo(ex, ey);
      strokeP(ctx, gz, LAV, 0.12 * uHead, 10);
      ctx.restore();
      sl(ctx, cut([[cx, cy], [ex, ey]], uHead), { width: 2.5, alpha: 0.9, seed: SEED + 95, smooth: false, color: WHITE });
    }

    // visible north pointer on the dial axis just below the head
    if (u > 0.3) {
      const nv = new Path2D();
      nv.moveTo(528, 1048);
      nv.lineTo(540, 1036);
      nv.lineTo(552, 1048);
      strokeP(ctx, nv, NAVY, 1, 4);
      strokeP(ctx, nv, WHITE, 1, 2);
    }
  }

  function drawAngleArc(ctx, az, arcU) {
    if (arcU <= 0) return;
    const { x: cx, y: cy } = COMP;
    const a1 = az < HEADING ? az + TAU : az;
    L.arcAnnotation(ctx, cx, cy, 135, HEADING, a1, { color: PALE, width: 2, p: arcU, endTicks: 8, alpha: 1 });
    const par = new Path2D();
    par.arc(cx, cy, 143, HEADING, HEADING + (a1 - HEADING) * arcU);
    strokeP(ctx, par, PALE, 0.5, 1);
  }

  // the dial rim, drawn after the head: solid outside the head silhouette, dashed hidden lines under it
  function drawCompassRing(ctx, u, uHead, bi, az) {
    const { x: cx, y: cy, r } = COMP;
    const northTick = (p) => {
      p.moveTo(cx + jit(1, 11, bi, 0.3), cy - r);
      p.lineTo(cx + jit(2, 11, bi, 0.3), cy - 248);
    };
    underHead(
      ctx,
      (c) => {
        halo(c, u >= 1 ? COMP_OUT : cut(COMP_OUT.concat([COMP_OUT[0]]), u), u >= 1, 0.05, 12);
        doubleOutline(c, COMP_OUT, COMP_IN, u, SEED + 90);
        // 72 ticks inward, majors at the quarters, north drawn on its own
        tickArc(c, cx, cy, r - 9, { n: 72, a0: -Math.PI / 2, len: -12, major: 18, majorLen: -20, dir: 1, color: WHITE, alpha: 0.62, majorColor: WHITE, majorAlpha: 0.75, width: 1.5, majorWidth: 1.7, bi, p: u, skip: (i) => i === 0 });
        // outer ticks every 30 degrees
        tickArc(c, cx, cy, r + 4, { n: 12, a0: -Math.PI / 2, len: 8, dir: 1, color: LAV, alpha: 0.5, width: 1.3, bi, p: u, skip: (i) => i === 0 });
        if (u > 0.3) {
          const nt = new Path2D();
          northTick(nt);
          strokeP(c, nt, WHITE, 0.95, 2);
        }
      },
      (c) => {
        // hidden: the same rim, ticks and north tick as dashed lines at 30 percent
        const rim = new Path2D();
        const aEnd = -Math.PI / 2 + Math.max(0.001, u) * TAU;
        rim.arc(cx, cy, r, -Math.PI / 2, aEnd);
        rim.moveTo(cx, cy - (r - 9));
        rim.arc(cx, cy, r - 9, -Math.PI / 2, aEnd);
        strokeP(c, rim, LAV, 0.3, 1.5, HIDDEN);
        tickArc(c, cx, cy, r - 9, { n: 72, a0: -Math.PI / 2, len: -12, major: 18, majorLen: -20, dir: 1, color: WHITE, alpha: 0.3, majorColor: WHITE, majorAlpha: 0.3, width: 1.2, majorWidth: 1.4, bi, p: u, skip: (i) => i === 0, dash: HIDDEN });
        if (u > 0.3) {
          const nt = new Path2D();
          northTick(nt);
          strokeP(c, nt, WHITE, 0.3, 2, HIDDEN);
        }
      }
    );
    // where the azimuth meets the rim: marker just outside at r 306, tick back to the rim
    if (uHead > 0) {
      const mx = cx + Math.cos(az) * 306, my = cy + Math.sin(az) * 306;
      const rx = cx + Math.cos(az) * r, ry = cy + Math.sin(az) * r;
      underHead(
        ctx,
        (c) => {
          const tk = new Path2D();
          tk.moveTo(rx, ry);
          tk.lineTo(mx, my);
          strokeP(c, tk, WHITE, 0.6 * uHead, 1.5);
          const mk = new Path2D();
          mk.moveTo(mx + 5.5, my);
          mk.arc(mx, my, 5.5, 0, TAU);
          strokeP(c, mk, WHITE, 0.85 * uHead, 1.5);
          L.glowDot(c, mx, my, 3, { rays: 4, glow: 6, intensity: 0.8 * uHead, seed: SEED + 96, rot: Math.PI / 4 });
        },
        (c) => {
          const mk = new Path2D();
          mk.moveTo(mx + 5.5, my);
          mk.arc(mx, my, 5.5, 0, TAU);
          strokeP(c, mk, WHITE, 0.4 * uHead, 1.2, [2, 2]);
        }
      );
    }
  }

  // dotted line on from the rim to the sun, kept off the head
  function drawAzimuthToSun(ctx, az, sun, u, t) {
    if (u <= 0) return;
    const { x: cx, y: cy, r } = COMP;
    const p = new Path2D();
    const x0 = cx + Math.cos(az) * (r + 26), y0 = cy + Math.sin(az) * (r + 26);
    p.moveTo(x0, y0);
    p.lineTo(sun[0], sun[1]);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, 1080, 1920);
    ctx.moveTo(HEAD.x + HEAD.r + 14, HEAD.y);
    ctx.arc(HEAD.x, HEAD.y, HEAD.r + 14, 0, TAU, true);
    for (const e of EYES) {
      ctx.moveTo(e.x + e.rx + 14, e.y);
      ctx.ellipse(e.x, e.y, e.rx + 14, e.ry + 14, 0, 0, TAU, true);
    }
    ctx.clip('evenodd');
    strokeP(ctx, p, LAV, 0.55 * u, 1.5, [3, 6]);
    for (const tb of [0.5, 1.0]) {
      const q = (t - tb) / (6 * FR);
      if (q < 0 || q > 1) continue;
      L.glowDot(ctx, lerp(x0, sun[0], q), lerp(y0, sun[1], q), 5, {
        rays: 6,
        rayLen: 2.2,
        glow: 3,
        intensity: 1,
        seed: SEED + 97,
        rot: Math.PI / 4,
      });
    }
    ctx.restore();
  }

  function drawHeading(ctx, t, uHead, bi) {
    if (uHead <= 0) return;
    const { x: cx, y: cy, r } = COMP;
    const dx = Math.cos(HEADING), dy = Math.sin(HEADING);
    const ext = E.outExpo(stepK(t, 1.0, 6));
    const pulse = decay(t, 1.0, 12);
    const len = lerp(HEAD_LEN, EXT_LEN, ext) * uHead;
    // glow under the line
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gp = new Path2D();
    gp.moveTo(cx, cy);
    gp.lineTo(cx + dx * len, cy + dy * len);
    strokeP(ctx, gp, MAG, 0.14 + 0.3 * pulse, 9 + 16 * pulse);
    strokeP(ctx, gp, MAG, 0.22 + 0.3 * pulse, 4 + 4 * pulse);
    ctx.restore();
    sl(ctx, [[cx, cy], [cx + dx * Math.min(len, HEAD_LEN), cy + dy * Math.min(len, HEAD_LEN)]], { width: 3.2 + 1.5 * pulse, color: MAG, alpha: 1, seed: SEED + 100, smooth: false, taper: [2, 2], minWidth: 0.8 });
    if (len > HEAD_LEN + 1) {
      sl(ctx, [[cx + dx * HEAD_LEN, cy + dy * HEAD_LEN], [cx + dx * len, cy + dy * len]], { width: 2.6 + pulse, color: MAG, alpha: 0.95, seed: SEED + 101, smooth: false, taper: [2, 10], minWidth: 0.6 });
    }
    // arrowhead at the tip of the line until the extension carries it off the frame, and a rim crossing tick
    const nx = -dy, ny = dx;
    if (len < EXT_LEN - 40) {
      const hx = cx + dx * len, hy = cy + dy * len;
      const ah = new Path2D();
      ah.moveTo(hx - dx * 24 + nx * 12, hy - dy * 24 + ny * 12);
      ah.lineTo(hx + dx * 2, hy + dy * 2);
      ah.lineTo(hx - dx * 24 - nx * 12, hy - dy * 24 - ny * 12);
      strokeP(ctx, ah, MAG, 1, 3.2);
    }
    const rm = new Path2D();
    rm.moveTo(cx + dx * (r - 22) + nx * 12, cy + dy * (r - 22) + ny * 12);
    rm.lineTo(cx + dx * (r - 22) - nx * 12, cy + dy * (r - 22) - ny * 12);
    rm.moveTo(cx + dx * (r + 8) + nx * 8, cy + dy * (r + 8) + ny * 8);
    rm.lineTo(cx + dx * (r + 8) - nx * 8, cy + dy * (r + 8) - ny * 8);
    strokeP(ctx, rm, MAG, 0.9 * uHead, 2.4);
    // after the pulse: chevrons flowing out along the extension at 24 fps
    if (ext > 0) {
      const ch = new Path2D();
      const speed = 220;
      const phase = ((t - 1.0) * speed) % 70;
      for (let s = HEAD_LEN + 40 + phase; s < len - 10; s += 70) {
        const px = cx + dx * s, py = cy + dy * s;
        ch.moveTo(px - dx * 16 + nx * 11, py - dy * 16 + ny * 11);
        ch.lineTo(px, py);
        ch.lineTo(px - dx * 16 - nx * 11, py - dy * 16 - ny * 11);
      }
      strokeP(ctx, ch, MAG, 0.75 * ext, 2.4);
    }
    // centre change ring on the pulse, 10 frames
    if (pulse > 0) {
      const fr = (t - 1.0 + FR) * 24;
      const cr = new Path2D();
      cr.arc(cx, cy, lerp(18, 150, E.outExpo(fr / 8)), 0, TAU);
      strokeP(ctx, cr, MAG, clamp(1 - fr / 10), 3);
    }
    // centre node
    L.glowDot(ctx, cx, cy, 5, { rays: 8, rayLen: 3, glow: 6, intensity: 0.9 + 0.8 * pulse, seed: SEED + 102, rot: 0.2 });
  }

  // ---------------------------------------------------------------------------
  // 4 Head from above
  // ---------------------------------------------------------------------------

  const CAPS_OUT = L.ellipsePts(HEAD.x, HEAD.y, HEAD.r, HEAD.r, 110);
  const CAPS_IN = L.ellipsePts(HEAD.x, HEAD.y, HEAD.r - 9, HEAD.r - 9, 104);
  const CAPS_TINT = L.ellipsePts(HEAD.x, HEAD.y, HEAD.r - 16, HEAD.r - 16, 100);
  const EYE_OUT = EYES.map((e) => L.ellipsePts(e.x, e.y, e.rx, e.ry, 72));
  const EYE_IN = EYES.map((e) => L.ellipsePts(e.x, e.y, e.rx - 8, e.ry - 8, 64));
  const inEye = (x, y) => EYES.some((e) => ((x - e.x) / e.rx) ** 2 + ((y - e.y) / e.ry) ** 2 < 1.08);
  // labial palps: 4 by 9 px, touching the front edge of the capsule (y 786 to 795), stipple only
  const PALPS = [-1, 1].map((s) => L.ellipsePts(540 + s * 5, 790.5, 2, 4.5, 20, s * 0.12));

  function clipOutsideEyes(ctx) {
    ctx.beginPath();
    ctx.rect(0, 0, 1080, 1920);
    for (const e of EYES) {
      ctx.moveTo(e.x + e.rx + 1, e.y);
      ctx.ellipse(e.x, e.y, e.rx + 1, e.ry + 1, 0, 0, TAU, true);
    }
    ctx.clip('evenodd');
  }

  // the sun-compass region of the brain as a schematic nucleus held inside the central brain
  function drawCompassRegion(ctx, uDet, bi, pulse, along) {
    if (uDet <= 0) return;
    const { x: nx, y: ny } = LENS;
    // protocerebral bridge: a 64 px handlebar, 1 px lavender at 40 percent, split into 16 columns
    const br = quadPts(nx - 32, 914, nx, 898, nx + 32, 914, 32);
    const brTop = quadPts(nx - 32, 910, nx, 894, nx + 32, 910, 32).map(([x, y]) => [x, y - 1]);
    sl(ctx, cut(br, uDet), { width: 1, alpha: 0.4, seed: SEED + 126, wobble: 0.3, taper: [2, 2] });
    const cols = new Path2D();
    for (let i = 0; i <= 16; i++) {
      const q = i / 16;
      const [x, y] = pointAt(br, q);
      const [xt, yt] = pointAt(brTop, q);
      cols.moveTo(x + jit(i, 80, bi, 0.25), y);
      cols.lineTo(xt + jit(i, 81, bi, 0.25), yt);
    }
    strokeP(ctx, cols, WHITE, (0.28 + 0.22 * pulse) * uDet, 1);
    // a narrow cone of rays from the sun's side feeds the active column (no glow star on the bridge)
    const [sunX, sunY] = sunXY(along);
    const colI = clamp(Math.floor(((Math.atan2(sunY - ny, sunX - nx) + Math.PI) / Math.PI) * 16), 0, 15);
    const [c0x, c0y] = pointAt(br, (colI + 0.5) / 16);
    let rdx = c0x - sunX, rdy = c0y - 3 - sunY;
    const rl = Math.hypot(rdx, rdy) || 1;
    rdx /= rl;
    rdy /= rl;
    const pnx = -rdy, pny = rdx;
    const rays = new Path2D();
    for (let k = -1; k <= 1; k++) {
      rays.moveTo(c0x - rdx * 20 + pnx * k * 3, c0y - 3 - rdy * 20 + pny * k * 3);
      rays.lineTo(c0x - rdx * 6 + pnx * k * 1, c0y - 3 - rdy * 6 + pny * k * 1);
    }
    strokeP(ctx, rays, LAV, 0.45 * uDet, 1);
    const ring = new Path2D();
    ring.arc(nx, ny, 12, bi * 0.07, bi * 0.07 + TAU);
    strokeP(ctx, ring, LAV, (0.4 + 0.25 * pulse) * uDet, 1, [3, 3]);
    // 12 radial ticks, 8 and 10 px
    const tk = new Path2D();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + jit(i, 83, bi, 0.02);
      const len = i % 2 ? 8 : 10;
      tk.moveTo(nx + Math.cos(a) * 4.5, ny + Math.sin(a) * 4.5);
      tk.lineTo(nx + Math.cos(a) * (4.5 + len), ny + Math.sin(a) * (4.5 + len));
    }
    strokeP(ctx, tk, WHITE, Math.min(1, 0.7 + 0.3 * pulse) * uDet, 1);
    // core r 4, halo at most 18 px (glow 4.5 * r)
    L.glowDot(ctx, nx, ny, 4, { rays: 0, glow: 4.5, intensity: (0.85 + 0.45 * pulse) * uDet, seed: SEED + 128 });
  }

  function drawHead(ctx, u, uDet, bi, pulse, along) {
    const { x: hx, y: hy, r } = HEAD;
    // the head sits over the dial: knock back what lies beneath, tint the eyes a shade lighter
    if (u > 0) {
      const ko = new Path2D();
      ko.arc(hx, hy, r, 0, TAU);
      for (const e of EYES) {
        ko.moveTo(e.x + e.rx, e.y);
        ko.ellipse(e.x, e.y, e.rx, e.ry, 0, 0, TAU);
      }
      ctx.save();
      ctx.fillStyle = NAVY;
      ctx.globalAlpha *= 0.8 * u;
      ctx.fill(ko, 'nonzero');
      ctx.restore();
      const et = new Path2D();
      for (const e of EYES) {
        et.moveTo(e.x + e.rx, e.y);
        et.ellipse(e.x, e.y, e.rx, e.ry, 0, 0, TAU);
      }
      fillP(ctx, et, P.navyLight, 0.9 * u);
      halo(ctx, CAPS_OUT, true, 0.05 * u, 12);
      for (let k = 0; k < 2; k++) halo(ctx, EYE_OUT[k], true, 0.06 * u, 12);
    }
    // scale and hair stipple on the capsule in the monarch tint, denser toward the rim and on the shadow side
    if (uDet > 0) {
      ctx.save();
      ctx.globalAlpha *= uDet;
      L.stipple(ctx, CAPS_OUT, {
        spacing: 5.2,
        r: [0.6, 1.3],
        color: ORANGE,
        alpha: 0.55,
        seed: SEED + 110,
        density: (x, y) => {
          if (inEye(x, y)) return 0;
          const d = Math.hypot(x - hx, y - hy);
          if (d < 26 && y > 900) return 0; // keep the nucleus clean
          return 0.1 + 0.55 * sstep(50, 108, d) * (0.55 + 0.45 * sstep(-60, 90, x - hx + (y - hy) * 0.6));
        },
      });
      ctx.restore();
    }
    // capsule outline and its tinted inner line, hidden where the eyes bulge over them
    ctx.save();
    clipOutsideEyes(ctx);
    doubleOutline(ctx, CAPS_OUT, CAPS_IN, u, SEED + 120);
    outline(ctx, CAPS_TINT, uDet, { width: 2, alpha: 0.85, color: ORANGE, seed: SEED + 124 });
    ctx.restore();
    // cervical edge: the neck opening at the back of the capsule
    sl(ctx, cut(arcPts(hx, hy, r - 24, 58 * DEG, 122 * DEG, 5), u), { width: 1.2, alpha: 0.35, seed: SEED + 122 });

    // brain as an organ that holds the nucleus: solid lobes, hex tissue, then the nucleus on top
    if (uDet > 0) {
      const brn = new Path2D();
      L.tracePath(brn, L.ellipsePts(540, 928, 48, 30, 48), true);
      for (const s of [-1, 1]) L.tracePath(brn, L.ellipsePts(540 + s * 51, 910, 12, 25, 36, s * 0.3), true);
      ctx.save();
      ctx.globalAlpha *= uDet;
      L.hexLattice(
        ctx,
        (c) => {
          c.ellipse(540, 928, 48, 30, 0, 0, TAU);
          for (const s of [-1, 1]) c.ellipse(540 + s * 51, 910, 12, 25, s * 0.3, 0, TAU);
        },
        { r: 14, width: 1, alpha: 0.25, seed: SEED + 125, bounds: [468, 880, 144, 82] }
      );
      ctx.restore();
      strokeP(ctx, brn, LAV, 0.6 * uDet, 1.5);
      const ln = new Path2D();
      for (const s of [-1, 1]) {
        ln.moveTo(540 + s * 30, 912);
        ln.bezierCurveTo(540 + s * 34, 880, 540 + s * 40, 830, 540 + s * 40, 806);
      }
      strokeP(ctx, ln, LAV, 0.3 * uDet, 1, [2, 4]);
      drawCompassRegion(ctx, uDet, bi, pulse, along);
    }

    // palps: stipple only, in the monarch tint
    if (uDet > 0) {
      for (let k = 0; k < 2; k++) {
        ctx.save();
        ctx.globalAlpha *= uDet;
        L.stipple(ctx, PALPS[k], { spacing: 2.3, r: [0.55, 0.95], color: ORANGE, alpha: 0.85, seed: SEED + 142 + k, density: 1, jitter: 0.25 });
        ctx.restore();
      }
    }

    // compound eyes: hex lattice of ommatidia, the dorsal rim lit, shade stippled on the outer side
    for (let k = 0; k < 2; k++) {
      const e = EYES[k];
      if (uDet > 0) {
        ctx.save();
        ctx.globalAlpha *= uDet;
        L.hexLattice(ctx, EYE_OUT[k], {
          r: 7,
          width: 0.9,
          alpha: 0.42,
          dots: 0.9,
          seed: SEED + 150 + k,
          jitter: 0.5,
        });
        // dorsal-rim cells: restroke only, no fill, so the top of the eye is not a lid
        L.hexLattice(ctx, EYE_OUT[k], {
          r: 7,
          width: 1,
          color: WHITE,
          alpha: 0.45 + 0.4 * pulse,
          seed: SEED + 150 + k,
          jitter: 0.5,
          dots: 0,
          cellFn: (x, y) => {
            const dy = (y - e.y) / e.ry;
            const dx = (x - e.x) / e.rx;
            return dy < -0.62 && dx * e.s > -0.55;
          },
        });
        L.stipple(ctx, EYE_OUT[k], {
          spacing: 5,
          r: [0.7, 1.5],
          color: NAVY,
          alpha: 0.75,
          seed: SEED + 160 + k,
          density: (x, y) => sstep(0.1, 1.0, ((x - e.x) / e.rx) * e.s * 0.8 + ((y - e.y) / e.ry) * 0.55),
        });
        ctx.restore();
      }
      doubleOutline(ctx, EYE_OUT[k], EYE_IN[k], u, SEED + 170 + k * 3);
      // dorsal rim arc inside the eye: top 70 degrees, nothing above the outline
      if (uDet > 0) {
        const rim = arcPts(e.x, e.y, e.rx - 5, -125 * DEG, -55 * DEG, 4, e.ry - 5);
        sl(ctx, rim, { width: 1.5, color: PALE, alpha: (0.55 + 0.4 * pulse) * uDet, seed: SEED + 175 + k });
      }
    }

    // white head spots of the monarch, along the inner eye margins and at the back of the head
    if (uDet > 0) {
      const sp = new Path2D();
      const spots = [[507, 842, 4], [573, 842, 4], [505, 866, 3.5], [575, 866, 3.5], [510, 968, 4], [570, 968, 4]];
      for (const [x, y, rr] of spots) {
        const jx = x + jit(x, 12, bi, 0.3);
        sp.moveTo(jx + rr, y);
        sp.arc(jx, y, rr, 0, TAU);
      }
      fillP(ctx, sp, WHITE, 0.85 * uDet);
    }
  }

  // proboscis coiled flat under the head: a dashed hidden spiral, no fill, so it reads as out of sight
  function drawCoil(ctx, u) {
    if (u <= 0) return;
    const p1 = new Path2D();
    const p2 = new Path2D();
    const turns = 3;
    const nn = 90;
    const shown = Math.max(2, Math.round(nn * u));
    for (let i = 0; i <= shown; i++) {
      const th = (i / nn) * turns * TAU;
      const rr = 3 + (COIL.r - 3) * (i / nn);
      const a = th - Math.PI / 2;
      const r2 = Math.max(1, rr - 2.6);
      if (i === 0) {
        p1.moveTo(COIL.x + Math.cos(a) * rr, COIL.y + Math.sin(a) * rr);
        p2.moveTo(COIL.x + Math.cos(a) * r2, COIL.y + Math.sin(a) * r2);
      } else {
        p1.lineTo(COIL.x + Math.cos(a) * rr, COIL.y + Math.sin(a) * rr);
        p2.lineTo(COIL.x + Math.cos(a) * r2, COIL.y + Math.sin(a) * r2);
      }
    }
    strokeP(ctx, p1, LAV, 0.4, 1.2, [3, 3]);
    strokeP(ctx, p2, LAV, 0.22, 1, [2, 4]);
  }

  // ---------------------------------------------------------------------------
  // 5 Antennae and their clocks
  // ---------------------------------------------------------------------------

  // Each antenna: a shaft from the socket, thickening gradually into a spindle club. Arc length s is measured along
  // the centreline from the club centre (negative toward the socket). The club starts widening at s -170, is widest
  // (62 px) at s 0 where the clock sits, and ends in a rounded tip at s +70.
  const CLUB_START = -170, CLUB_TIP = 70, CLUB_HW = 31, SHAFT_HW0 = 5.2, SHAFT_HW1 = 4.2;
  const clubHW = (s, sBase) => {
    if (s <= CLUB_START) return lerp(SHAFT_HW0, SHAFT_HW1, clamp((s - sBase) / (CLUB_START - sBase)));
    if (s <= 0) {
      // gradual, convex thickening: gentle out of the shaft, rounding into the widest point
      const v = 1 + s / -CLUB_START;
      return SHAFT_HW1 + (CLUB_HW - SHAFT_HW1) * Math.pow(Math.sin((v * Math.PI) / 2), 1.15);
    }
    return CLUB_HW * Math.pow(Math.max(0, 1 - (s / CLUB_TIP) ** 2), 0.8);
  };

  const ANT_GEOM = ANT.map((A) => {
    const dx = A.cx - A.bx, dy = A.cy - A.by;
    const len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    const px = -uy, py = ux;
    const out = A.s < 0 ? 1 : -1; // bow away from the axis of the frame
    const bow = 6 * out;
    const mx = (A.bx + A.cx) / 2 + px * 2 * bow, my = (A.by + A.cy) / 2 + py * 2 * bow;
    const q = quadPts(A.bx, A.by, mx, my, A.cx, A.cy, 90);
    // end tangent carries the tip past the centre
    let tx = A.cx - mx, ty = A.cy - my;
    const tl = Math.hypot(tx, ty);
    tx /= tl;
    ty /= tl;
    const pts = q.slice();
    for (let s = 3; s <= CLUB_TIP; s += 3) pts.push([A.cx + tx * s, A.cy + ty * s]);
    // arc length, zero at the club centre
    const S = [0];
    for (let i = 1; i < pts.length; i++) S.push(S[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const s0 = S[q.length - 1];
    for (let i = 0; i < S.length; i++) S[i] -= s0;
    const sBase = S[0];
    const left = [], right = [], nrm = [], hw = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let ex = b[0] - a[0], ey = b[1] - a[1];
      const el = Math.hypot(ex, ey) || 1;
      ex /= el;
      ey /= el;
      const w = clubHW(S[i], sBase);
      nrm.push([-ey, ex]);
      hw.push(w);
      left.push([pts[i][0] - ey * w, pts[i][1] + ex * w]);
      right.push([pts[i][0] + ey * w, pts[i][1] - ex * w]);
    }
    const idx = (s) => {
      let best = 0;
      for (let i = 0; i < S.length; i++) if (Math.abs(S[i] - s) < Math.abs(S[best] - s)) best = i;
      return best;
    };
    const iStart = idx(CLUB_START), iOverlap = idx(CLUB_START - 18), iIn = idx(CLUB_START + 38);
    // shaft edges from the socket to where the club begins
    const shaftL = left.slice(0, iStart + 1), shaftR = right.slice(0, iStart + 1);
    // the club outline as one stroke: down the left edge, round the tip, back up the right edge
    const clubOuter = left.slice(iOverlap).concat(right.slice(iOverlap).reverse().slice(1));
    // inner line of the double outline, 4.5 px inside
    const inL = [], inR = [];
    for (let i = iIn; i < pts.length; i++) {
      const w = Math.max(0, hw[i] - 4.5);
      if (S[i] > CLUB_TIP - 4.5) break;
      inL.push([pts[i][0] - nrm[i][0] * -w, pts[i][1] - nrm[i][1] * -w]);
      inR.push([pts[i][0] + nrm[i][0] * -w, pts[i][1] + nrm[i][1] * -w]);
    }
    const tipIn = [A.cx + tx * (CLUB_TIP - 4.5), A.cy + ty * (CLUB_TIP - 4.5)];
    const clubInner = inL.concat([tipIn], inR.reverse());
    // closed club silhouette for clipping stipple
    const clubPoly = left.slice(iStart).concat(right.slice(iStart).reverse());
    // nerve from below the dial (s = -80) down the antenna into the sun-compass region
    const toBase = pts.slice(0, idx(-80) + 1).reverse();
    const inner = [
      [A.bx, A.by],
      [A.bx + A.s * -4, A.by + 30],
      [540 + A.s * 36, 880],
      [540 + A.s * 24, 916],
      [LENS.x + A.s * 19, LENS.y - 4],
    ];
    const nerve = toBase.concat(inner.slice(1));
    return { ux, uy, px, py, tx, ty, pts, S, left, right, nrm, hw, shaftL, shaftR, clubOuter, clubInner, clubPoly, nerve, inner, iStart, sBase };
  });

  function drawAntennae(ctx, u, uClock, bi, handA, pulse) {
    for (let k = 0; k < 2; k++) {
      const A = ANT[k];
      const G = ANT_GEOM[k];
      // socket
      const so = new Path2D();
      so.moveTo(A.bx + 10, A.by);
      so.arc(A.bx, A.by, 10, 0, TAU);
      so.moveTo(A.bx + 4, A.by);
      so.arc(A.bx, A.by, 4, 0, TAU);
      strokeP(ctx, so, LAV, 0.7 * u, 1.3);
      // navy knock-out along the shaft so the dome wireframe does not show through
      const shaftKo = new Path2D();
      L.tracePath(shaftKo, cut(G.pts.slice(0, G.iStart + 1), u), false);
      strokeP(ctx, shaftKo, NAVY, 0.85, 12);
      // shaft edges
      sl(ctx, cut(G.shaftL, u), { width: 1.4, alpha: 0.85, seed: SEED + 200 + k });
      sl(ctx, cut(G.shaftR, u), { width: 1.4, alpha: 0.85, seed: SEED + 202 + k });
      // flagellomere rings every 9 px along the shaft
      const rings = new Path2D();
      const sEndShaft = lerp(G.sBase, CLUB_START, u);
      for (let i = 0, j = 0; i < G.iStart; i++) {
        if (G.S[i] > sEndShaft) break;
        if (G.S[i] - G.sBase < 18 || Math.floor((G.S[i] - G.sBase) / 9) === j) continue;
        j = Math.floor((G.S[i] - G.sBase) / 9);
        const l = G.left[i], r = G.right[i];
        rings.moveTo(l[0] + jit(i, 20 + k, bi, 0.25), l[1]);
        rings.lineTo(r[0], r[1] + jit(i, 22 + k, bi, 0.25));
      }
      strokeP(ctx, rings, LAV, 0.5, 1);

      // spindle club
      if (u > 0.4) {
        const cu = clamp((u - 0.4) / 0.6);
        const clubKo = new Path2D();
        L.tracePath(clubKo, G.clubPoly, true);
        fillP(ctx, clubKo, NAVY, 0.85 * cu);
        halo(ctx, G.clubOuter, false, 0.05 * cu, 10);
        // scale stipple in the monarch tint, shading the spindle as a body of revolution lit from the upper left:
        // the dots gather on the side and the end facing away from the light, none under the clock
        ctx.save();
        ctx.globalAlpha *= cu;
        L.stipple(ctx, G.clubPoly, {
          spacing: 3.4,
          r: [0.5, 1.05],
          color: ORANGE,
          alpha: 0.72,
          seed: SEED + 215 + k,
          density: (x, y) => {
            const rx = x - A.cx, ry = y - A.cy;
            if (Math.hypot(rx, ry) < 28) return 0;
            const s = rx * G.ux + ry * G.uy;
            const o = rx * G.px + ry * G.py;
            const w = Math.max(3, clubHW(s, G.sBase));
            const f = clamp(o / w, -0.99, 0.99);
            const slope = (clubHW(s + 2, G.sBase) - clubHW(s - 2, G.sBase)) / 4;
            const nz = Math.sqrt(1 - f * f);
            const nx2 = G.px * f - G.ux * slope, ny2 = G.py * f - G.uy * slope;
            const nl = Math.hypot(nx2, ny2, nz) || 1;
            const lit = (nx2 * -0.5 + ny2 * -0.62 + nz * 0.6) / nl;
            return 0.05 + 0.8 * sstep(0.62, 0.05, lit) + 0.25 * sstep(0.8, 1, Math.abs(f));
          },
        });
        ctx.restore();
        // cross segment lines between the club subsegments, curved toward the tip
        const seg = new Path2D();
        for (let s = CLUB_START + 2; s <= CLUB_TIP - 4; s += 12) {
          const i = G.S.findIndex((v) => v >= s);
          if (i < 0) continue;
          const w = G.hw[i] - 1.2;
          if (w < 4) continue;
          const [cxp, cyp] = G.pts[i];
          const [nx, ny] = G.nrm[i];
          seg.moveTo(cxp - nx * w + jit(i, 24 + k, bi, 0.3), cyp - ny * w);
          seg.quadraticCurveTo(cxp + G.tx * 5, cyp + G.ty * 5, cxp + nx * w, cyp + ny * w + jit(i, 25 + k, bi, 0.3));
        }
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, 1080, 1920);
        ctx.moveTo(A.cx + 30, A.cy);
        ctx.arc(A.cx, A.cy, 30, 0, TAU, true);
        ctx.clip('evenodd');
        strokeP(ctx, seg, LAV, 0.4 * cu, 1);
        ctx.restore();
        // double outline: outer schemOrange 85 percent, inner lavender 50 percent
        sl(ctx, cut(G.clubOuter, cu), { width: 2.5, alpha: 0.85, color: ORANGE, seed: SEED + 210 + k * 3, taper: [10, 10] });
        sl(ctx, cut(G.clubInner, cu), { width: 1.5, alpha: 0.5, seed: SEED + 211 + k * 3, taper: [6, 6] });
      }

      // the clock: a dial engraved on the club, no face fill, hour ticks outside the ring, one hand
      if (uClock > 0) {
        const ring = new Path2D();
        ring.arc(A.cx, A.cy, CLOCK_R, -Math.PI / 2, -Math.PI / 2 + TAU * uClock);
        strokeP(ctx, ring, WHITE, 0.7, 1.5);
        const inRing = new Path2D();
        inRing.arc(A.cx, A.cy, 5.5, 0, TAU);
        strokeP(ctx, inRing, LAV, 0.35 * uClock, 1);
        tickArc(ctx, A.cx, A.cy, CLOCK_R + 2, { n: 12, a0: -Math.PI / 2, len: 5, major: 3, majorLen: 8, dir: 1, color: WHITE, alpha: 0.6, majorColor: WHITE, majorAlpha: 0.6, width: 1.4, majorWidth: 1.8, bi, p: uClock });
        const hl = 19 * uClock;
        const hand = new Path2D();
        hand.moveTo(A.cx - Math.cos(handA) * 5, A.cy - Math.sin(handA) * 5);
        hand.lineTo(A.cx + Math.cos(handA) * hl, A.cy + Math.sin(handA) * hl);
        strokeP(ctx, hand, NAVY, 1, 4.5);
        strokeP(ctx, hand, WHITE, 1, 2.5);
        const hub = new Path2D();
        hub.arc(A.cx, A.cy, 2.6, 0, TAU);
        fillP(ctx, hub, WHITE, 1);
        if (pulse > 0) {
          const pr = new Path2D();
          pr.arc(A.cx, A.cy, lerp(58, CLOCK_R + 10, pulse), 0, TAU);
          strokeP(ctx, pr, LAV, 0.5 * pulse, 1.4);
        }
        // corner brackets around the left club, where the network line to the enlarged clock leaves it
        if (k === 0) {
          const hs = 48, bl = 10;
          const bx = A.cx, by = A.cy;
          const brk = new Path2D();
          for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            brk.moveTo(bx + sx * (hs - bl), by + sy * hs);
            brk.lineTo(bx + sx * hs, by + sy * hs);
            brk.lineTo(bx + sx * hs, by + sy * (hs - bl));
          }
          strokeP(ctx, brk, LAV, 0.75 * uClock, 1.3);
        }
      }
      // nerve path as a hidden line inside the head
      if (u > 0.5) {
        const nv = new Path2D();
        L.tracePath(nv, G.inner, false);
        strokeP(ctx, nv, PALE, 0.35, 1, [3, 4]);
      }
    }
  }

  // time signal pulses from each clock to the lens after every step, on twos
  function drawPulses(ctx, t) {
    const tt = L.onTwos(t);
    for (const tb of [0.5, 1.0]) {
      const q = (tt - tb) / (10 * FR);
      if (q < 0 || q > 1.2) continue;
      for (let k = 0; k < 2; k++) {
        const G = ANT_GEOM[k];
        for (let j = 0; j < 3; j++) {
          const qq = E.inQuad(clamp(q - j * 0.07));
          if (q - j * 0.07 < 0 || qq >= 1) continue;
          const [x, y] = pointAt(G.nerve, qq);
          if (Math.hypot(x - HEAD.x, y - HEAD.y) < HEAD.r + 6) {
            // under the capsule the signal is a small hidden-line dot, so it never reads as a face feature
            if (j > 0) continue;
            const d = new Path2D();
            d.arc(x, y, 2, 0, TAU);
            strokeP(ctx, d, PALE, 0.8, 1.1);
          } else if (j === 0) L.glowDot(ctx, x, y, 5, { rays: 6, rayLen: 3.2, glow: 5.5, intensity: 1.15, seed: SEED + 230 + k, rot: Math.PI / 4 });
          else {
            const d = new Path2D();
            d.arc(x, y, 2.4 - j * 0.5, 0, TAU);
            fillP(ctx, d, P.hemolymph, 0.8 - j * 0.25);
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 6 Node glyphs and network lines
  // ---------------------------------------------------------------------------

  function nodeFrame(ctx, N, u, seed, bi, noInner) {
    const outer = L.ellipsePts(N.x, N.y, N.r, N.r, 72);
    const inner = L.ellipsePts(N.x, N.y, N.r - 7, N.r - 7, 64);
    outline(ctx, outer, u, { width: 2, alpha: 0.8, seed });
    if (!noInner) outline(ctx, inner, u, { width: 1.2, alpha: 0.45, seed: seed + 1 });
    tickArc(ctx, N.x, N.y, N.r + 4, { n: 36, len: 4, major: 9, majorLen: 9, dir: 1, color: LAV, alpha: 0.4, majorColor: WHITE, majorAlpha: 0.5, width: 1, majorWidth: 1.3, bi, p: u });
  }

  function drawNodes(ctx, u, bi, handA, az, pulse) {
    if (u <= 0) return;
    // network lines: from the zoom ring on the left club to the enlarged clock, and from the sun-compass region
    // to the compass cells (dashed where it runs under the head)
    const la = Math.atan2(NODE_L.y - ANT[0].cy, NODE_L.x - ANT[0].cx);
    const lc = Math.cos(la), ls = Math.sin(la);
    const tBox = 48 / Math.max(Math.abs(lc), Math.abs(ls));
    const s1x = ANT[0].cx + lc * tBox, s1y = ANT[0].cy + ls * tBox;
    const l1 = quadPts(s1x, s1y, 190, 800, NODE_L.x, NODE_L.y - NODE_L.r - 6, 40);
    sl(ctx, cut(l1, u), { width: 1.2, alpha: 0.5, seed: SEED + 300 });
    const l2 = quadPts(LENS.x + 22, LENS.y + 8, 730, 1004, NODE_R.x - 20, NODE_R.y - NODE_R.r - 2, 40);
    underHead(
      ctx,
      (c) => sl(c, cut(l2, u), { width: 1.2, alpha: 0.45, seed: SEED + 301 }),
      (c) => {
        const p = new Path2D();
        L.tracePath(p, cut(l2, u), false);
        strokeP(c, p, LAV, 0.3, 1.1, HIDDEN);
      }
    );
    const ends = new Path2D();
    ends.moveTo(s1x + 3, s1y);
    ends.arc(s1x, s1y, 3, 0, TAU);
    strokeP(ctx, ends, LAV, 0.8 * u, 1.2);

    // left: an enlarged copy of the left club clock
    const { x: nx, y: ny } = NODE_L;
    const FACE = 44;
    nodeFrame(ctx, NODE_L, u, SEED + 310, bi, true);
    const face = new Path2D();
    face.arc(nx, ny, FACE, 0, TAU);
    fillP(ctx, face, P.navyLight, u);
    ctx.save();
    ctx.beginPath();
    ctx.arc(nx, ny, FACE - 1, 0, TAU);
    ctx.clip();
    // the oscillation the clock keeps, as a faint underlay
    const wave = [];
    for (let i = 0; i <= 44; i++) {
      const x = -44 + 2 * i;
      wave.push([nx + x, ny - 18 * Math.sin(((x + 40) / 80) * TAU)]);
    }
    sl(ctx, wave, { width: 1.4, alpha: 0.2 * u, seed: SEED + 320, color: LAV });
    const axis = new Path2D();
    axis.moveTo(nx - 44, ny);
    axis.lineTo(nx + 44, ny);
    strokeP(ctx, axis, LAV, 0.1 * u, 1);
    ctx.restore();
    const ring = new Path2D();
    ring.arc(nx, ny, FACE, -Math.PI / 2, -Math.PI / 2 + TAU * u);
    strokeP(ctx, ring, WHITE, 0.9, 2);
    // 12 hour ticks inward: quarters 16 px, others 9 px
    tickArc(ctx, nx, ny, FACE - 3, { n: 12, a0: -Math.PI / 2, len: 9, major: 3, majorLen: 16, dir: -1, color: WHITE, alpha: 0.6, majorColor: WHITE, majorAlpha: 0.6, width: 1.5, majorWidth: 2, bi, p: u });
    // minute dots between the hours
    const md = new Path2D();
    for (let i = 0; i < 48; i++) {
      if (i % 4 === 0) continue;
      const a = -Math.PI / 2 + (i / 48) * TAU;
      const x = nx + Math.cos(a) * (FACE - 6), y = ny + Math.sin(a) * (FACE - 6);
      md.moveTo(x + 0.9, y);
      md.arc(x, y, 0.9, 0, TAU);
    }
    fillP(ctx, md, LAV, 0.45 * u);
    const hl = 31 * u;
    const hand = new Path2D();
    hand.moveTo(nx - Math.cos(handA) * 8, ny - Math.sin(handA) * 8);
    hand.lineTo(nx + Math.cos(handA) * hl, ny + Math.sin(handA) * hl);
    strokeP(ctx, hand, NAVY, 1, 6);
    strokeP(ctx, hand, WHITE, 1, 3);
    const hub = new Path2D();
    hub.arc(nx, ny, 3.6, 0, TAU);
    fillP(ctx, hub, WHITE, u);
    if (pulse > 0) {
      const pr = new Path2D();
      pr.arc(nx, ny, lerp(66, 48, pulse), 0, TAU);
      strokeP(ctx, pr, LAV, 0.5 * pulse, 1.4);
    }

    // right: the compass cells in the brain, a ring with one bump of activity at the sun's azimuth
    nodeFrame(ctx, NODE_R, u, SEED + 330, bi);
    const nCells = 16;
    const bump = ((((az % TAU) + TAU) % TAU) / TAU) * nCells;
    const cells = [];
    for (let i = 0; i < nCells; i++) {
      const a = (i / nCells) * TAU;
      let d = Math.abs(i - bump);
      d = Math.min(d, nCells - d);
      cells.push([NODE_R.x + Math.cos(a) * 30, NODE_R.y + Math.sin(a) * 30, Math.exp(-(d * d) / 1.4)]);
    }
    const dim = new Path2D();
    for (const [x, y] of cells) {
      dim.moveTo(x + 4, y);
      dim.arc(x, y, 4, 0, TAU);
    }
    strokeP(ctx, dim, LAV, 0.55 * u, 1.1);
    for (const [x, y, b] of cells) {
      if (b < 0.05) continue;
      const d = new Path2D();
      d.arc(x, y, 3.2, 0, TAU);
      fillP(ctx, d, WHITE, b * u);
    }
    const ba = (bump / nCells) * TAU;
    L.glowDot(ctx, NODE_R.x + Math.cos(ba) * 30, NODE_R.y + Math.sin(ba) * 30, 5, { rays: 8, rayLen: 2.8, glow: 5, intensity: (0.9 + 0.7 * pulse) * u, seed: SEED + 331 });
    const inner = new Path2D();
    inner.arc(NODE_R.x, NODE_R.y, 16, 0, TAU);
    inner.moveTo(NODE_R.x + Math.cos(HEADING) * 16, NODE_R.y + Math.sin(HEADING) * 16);
    inner.lineTo(NODE_R.x + Math.cos(HEADING) * 44, NODE_R.y + Math.sin(HEADING) * 44);
    strokeP(ctx, inner, LAV, 0.5 * u, 1.2);
    const spoke = new Path2D();
    spoke.moveTo(NODE_R.x, NODE_R.y);
    spoke.lineTo(NODE_R.x + Math.cos(ba) * 22, NODE_R.y + Math.sin(ba) * 22);
    strokeP(ctx, spoke, WHITE, 0.7 * u, 1.4);
  }

  // ---------------------------------------------------------------------------
  // 7a Daylight bar, top left: twelve hour cells light as the sun climbs
  // ---------------------------------------------------------------------------

  function drawDayBar(ctx, u, t, bi) {
    if (u <= 0) return;
    const x0 = 96, yb = 286, cw = 10, gap = 5, hMax = 28;
    ctx.save();
    ctx.globalAlpha *= u;
    const base = new Path2D();
    base.moveTo(x0 - 8, yb + 6);
    base.lineTo(x0 + 12 * (cw + gap) + 2, yb + 6);
    strokeP(ctx, base, LAV, 0.55, 1.5);
    const lit = [[0, 1], [0.5, 3], [1.0, 5]];
    for (let i = 0; i < 12; i++) {
      // cell heights follow the sun's altitude over the day
      const h = 8 + (hMax - 8) * Math.sin(((i + 0.5) / 12) * Math.PI);
      const x = x0 + i * (cw + gap);
      const box = new Path2D();
      box.rect(x + jit(i, 30, bi, 0.3), yb - h, cw, h);
      strokeP(ctx, box, LAV, 0.35, 1);
      let k = 0;
      for (const [tb, n] of lit) if (i < n) k = Math.max(k, E.outBack(stepK(t, tb, 3)));
      if (i === 0) k = Math.max(k, E.outBack(stepK(t, 0, 3)));
      if (k > 0) {
        const sz = Math.min(1.12, k);
        const f = new Path2D();
        f.rect(x + cw / 2 - (cw * sz) / 2, yb - h * sz, cw * sz, h * sz);
        fillP(ctx, f, WHITE, 0.85);
      }
    }
    // tick scale under the bar
    const tk = new Path2D();
    for (let i = 0; i <= 12; i++) {
      const x = x0 - 3 + i * (cw + gap);
      tk.moveTo(x, yb + 6);
      tk.lineTo(x, yb + (i % 3 === 0 ? 18 : 12));
    }
    strokeP(ctx, tk, LAV, 0.45, 1);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // 7 Cycle glyph, adult arc lit
  // ---------------------------------------------------------------------------

  function drawCycle(ctx, u, bi) {
    if (u <= 0) return;
    const cx = 900, cy = 300, r = 44, gap = 0.16;
    ctx.save();
    ctx.globalAlpha *= u;
    for (let s = 0; s < 4; s++) {
      const a0 = -Math.PI / 2 + (s * Math.PI) / 2 + gap / 2;
      const p = new Path2D();
      p.arc(cx, cy, r, a0, a0 + Math.PI / 2 - gap);
      if (s === 3) strokeP(ctx, p, WHITE, 1, 3);
      else strokeP(ctx, p, LAV, 0.25, 2);
    }
    tickArc(ctx, cx, cy, 52, { n: 48, len: 4, major: 12, majorLen: 9, color: LAV, alpha: 0.3, majorColor: LAV, majorAlpha: 0.45, width: 1, majorWidth: 1.2, bi });
    const a = Math.PI + Math.PI / 4;
    L.glowDot(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 3.5, { rays: 4, glow: 5, seed: SEED + 400 });
    const hub = new Path2D();
    hub.arc(cx, cy, 3, 0, TAU);
    fillP(ctx, hub, LAV, 0.5);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Scene
  // ---------------------------------------------------------------------------

  FILM.scene({
    id: ID,
    draw(ctx, tRaw, info) {
      const t = clamp(tRaw, 0, info.dur);
      const bi = L.boil(info.T);

      // draw-on (outExpo over 6 frames, first frame already moving)
      const uBase = E.outExpo(stepK(t, 0, 6));
      const uLate = E.outExpo(stepK(t, FR, 6));
      const uClock = E.outExpo(stepK(t, 2 * FR, 6));

      // sun steps on the beats, 4 frames outBack each
      const s1 = E.outBack(stepK(t, 0.5, 4));
      const s2 = E.outBack(stepK(t, 1.0, 4));
      const along = 40 * s1 + 40 * s2;
      const stepsDone = (t >= 0.5 - 1e-6 ? 1 : 0) + (t >= 1.0 - 1e-6 ? 1 : 0);
      const pop = E.outBack(stepK(t, 0, 4));
      const pulse = Math.max(decay(t, 0, 8), decay(t, 0.5, 8), decay(t, 1.0, 8));
      // clock hands tick an eighth of a turn on each beat: a 3-frame outBack pop, 24 h dial with noon at the top
      const handA = -Math.PI + (Math.PI / 4) * (E.outBack(stepK(t, 0.5, 3)) + E.outBack(stepK(t, 1.0, 3)));
      const sun = sunXY(along);
      const az = Math.atan2(sun[1] - COMP.y, sun[0] - COMP.x);
      const prevAz = [];
      for (let k = 0; k < stepsDone; k++) {
        const g = sunXY(k * 40);
        prevAz.push(Math.atan2(g[1] - COMP.y, g[0] - COMP.x));
      }
      // the angle arc holds until the beat frame, then redraws from the heading (outExpo, 6 frames)
      const arcU = t < 0.5 - FR / 2 ? E.outExpo(stepK(t, 2 * FR, 6)) : t < 1.0 - FR / 2 ? E.outExpo(stepK(t, 0.5, 6)) : E.outExpo(stepK(t, 1.0, 6));

      drawPlate(ctx, uBase, bi, t);
      drawDome(ctx, uBase, bi, along, stepsDone, t);
      drawAzimuthToSun(ctx, az, sun, uLate, t);
      drawSightLines(ctx, along, uClock);
      drawCompassUnder(ctx, uBase, uLate, bi, az, prevAz, uLate);
      drawHead(ctx, uBase, uLate, bi, pulse, along);
      drawCompassRing(ctx, uBase, uLate, bi, az);
      drawCoil(ctx, uBase);
      drawAntennae(ctx, uLate, uClock, bi, handA, pulse);
      drawNodes(ctx, uClock, bi, handA, az, pulse);
      drawPulses(ctx, t);
      drawHeading(ctx, t, uLate, bi);
      drawAngleArc(ctx, az, arcU);
      drawSun(ctx, along, pop, pulse, bi);
      drawDayBar(ctx, uBase, t, bi);
      drawCycle(ctx, uBase, bi);
    },
  });
})();
