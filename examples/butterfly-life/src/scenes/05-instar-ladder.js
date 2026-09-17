// Shot 05 instar-ladder: growth, stored poison, hidden wings. Schematic, global T 8.0 to 9.5.
// Five blueprint caterpillars stack up the frame, milkweed feeds a cardenolide glyph inside the 5th,
// wing discs ignite behind its head, and on the 9.0 beat the 5th instar swings into the G2 J-hang.
(function () {
  'use strict';

  const ID = 'instar-ladder';
  const L = FILM.lib;
  const P = L.pal;
  const TAU = Math.PI * 2;
  const N = 64; // centreline segments per body

  // hoisted colours (pal is a read-only proxy)
  const LAV = P.lavender, WHITE = P.lineWhite, MAG = P.magenta, GREEN = P.schemGreen, NAVYL = P.navyLight;
  const MAG_FADE = L.mix(P.magenta, P.lavender, 0.55);

  const lerp = L.lerp, clamp = L.clamp;
  const qb = (A, B, C, u) => [(1 - u) * (1 - u) * A[0] + 2 * (1 - u) * u * B[0] + u * u * C[0], (1 - u) * (1 - u) * A[1] + 2 * (1 - u) * u * B[1] + u * u * C[1]];

  // ---------------------------------------------------------------------------
  // Instar specs (storyboard: Composition). len and h in px, heads to the right, centred x 540.
  // fil: [front T2, rear A8] filament length in px. bands: band strength, thorax: thorax band factor.
  // sp: stipple pitch in px, rr: dot radius range in the dense black band.
  // ---------------------------------------------------------------------------
  const SPECS = [
    { y: 1500, len: 60, h: 14, bands: 0, thorax: 0, dens: 0.55, fil: [0, 0], sp: 2.3, rr: [0.6, 1.0] },
    { y: 1380, len: 118, h: 22, bands: 0.75, thorax: 0.5, dens: 0.9, fil: [5, 2.5], sp: 2.3, rr: [0.75, 1.2] },
    { y: 1220, len: 177, h: 32, bands: 1, thorax: 0.22, dens: 1, fil: [24, 13], sp: 2.6, rr: [0.9, 1.5] },
    { y: 990, len: 295, h: 50, bands: 1, thorax: 1, dens: 1, fil: [70, 28], sp: 3.0, rr: [1.1, 1.8] },
    { y: 640, len: 620, h: 120, bands: 1, thorax: 1, dens: 1, fil: [150, 56], sp: 3.4, rr: [1.4, 2.2] },
  ];

  // Segment boundaries in body u (0 tail .. 1 head end). Index 0 = A10, 1..9 = A9..A1, 10 = T3, 11 = T2, 12 = T1.
  // The ladder spacing gives the 5th instar a 43 px abdominal pitch; the J uses shot 06's segment table
  // so rings, bands, prolegs and filaments land on the same pixels across the match cut.
  const SEGB_L = (() => {
    const b = [0, 0.1];
    const a = (0.84 - 0.1) / 9;
    for (let i = 1; i <= 9; i++) b.push(0.1 + a * i);
    b.push(0.9, 0.96, 1);
    return b;
  })();
  const SEGB_J = (() => {
    const w = [0.055, 0.06, 0.075, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.08, 0.065, 0.06, 0.055];
    const tot = w.reduce((a, b) => a + b, 0);
    const out = [0];
    let acc = 0;
    for (const x of w) out.push((acc += x / tot));
    out[out.length - 1] = 1;
    return out;
  })();
  const segbAt = (e) => (e <= 0 ? SEGB_L : e >= 1 ? SEGB_J : SEGB_L.map((v, k) => lerp(v, SEGB_J[k], e)));
  const segMid = (B, k) => (B[k] + B[k + 1]) / 2;
  const SEG = { T1: 12, T2: 11, T3: 10, A1: 9, A3: 7, A4: 6, A5: 5, A6: 4, A8: 2, A10: 0 };

  function segIndex(B, u) {
    let k = 0;
    while (k < 12 && u > B[k + 1]) k++;
    return k;
  }
  // a ladder body u carried to the same place inside its segment at the current morph
  function remapU(q, u) {
    const k = segIndex(SEGB_L, u);
    const f = (u - SEGB_L[k]) / (SEGB_L[k + 1] - SEGB_L[k]);
    return lerp(q.segb[k], q.segb[k + 1], f);
  }

  function prof(keys, u) {
    if (u <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (u <= keys[i][0]) {
        const a = keys[i - 1], b = keys[i];
        const f = (u - a[0]) / (b[0] - a[0]);
        return a[1] + (b[1] - a[1]) * f * f * (3 - 2 * f);
      }
    }
    return keys[keys.length - 1][1];
  }
  // monotone cubic through a table, exact at the table points (the same curve shot 06 uses for its larva)
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
  // half-widths: horizontal as a fraction of h/2; G2 in px (70 at the pad, 120 at y 760, 100 behind the head)
  const WH = [[0, 0.56], [0.1, 0.8], [0.3, 1], [0.72, 1], [0.9, 0.92], [1, 0.84]];
  const WJ = monotone([0, 0.05, 0.14, 0.3, 0.637, 0.84, 0.95, 1], [35, 42, 51, 57, 60, 57, 52, 50]);

  // ---------------------------------------------------------------------------
  // Horizontal ladder pose for instar i
  // ---------------------------------------------------------------------------
  const horizCache = [];
  function horiz(i) {
    if (horizCache[i]) return horizCache[i];
    const s = SPECS[i];
    const h = s.h;
    const x0 = 540 - s.len / 2, x1 = 540 + s.len / 2;
    const first = i === 0;
    const hrx = first ? h * 0.5 : h * 0.26;
    const hry = first ? h * 0.62 : h * 0.36;
    const hx = x1 - hrx;
    const bulge = h * 0.15;
    const tailX = x0 + bulge;
    const endX = hx - hrx * (first ? 1 : 0.55);
    return (horizCache[i] = {
      tail: [tailX, s.y],
      segLen: (endX - tailX) / N,
      head: { along: hx - endX, lat: 0, rx: hrx, ry: hry },
      bulge,
      dome: first ? h * 0.1 : h * 0.12,
      x0,
      x1,
    });
  }

  // ---------------------------------------------------------------------------
  // G2 J-hang. The centreline is the spline through G2 and the head centre (as shot 06 builds it),
  // cut at the point nearest (705, 830) and resampled to N equal steps.
  // ---------------------------------------------------------------------------
  const G2 = [[540, 300], [540, 760], [556, 840], [600, 880], [660, 870], [705, 830]];
  const G2_HEAD = [720, 790];
  const HEAD_ROT_J = -1.2149; // spline tangent at the head centre (shot 06 rotates its capsule the same)
  const J = (() => {
    const dense = L.smoothPts(G2.concat([G2_HEAD]), false, 0.5);
    const cum = [0];
    for (let k = 1; k < dense.length; k++) cum.push(cum[k - 1] + Math.hypot(dense[k][0] - dense[k - 1][0], dense[k][1] - dense[k - 1][1]));
    let best = 1e9, sNeck = 0;
    for (let k = 0; k < dense.length; k++) {
      const dd = Math.hypot(dense[k][0] - G2[5][0], dense[k][1] - G2[5][1]);
      if (dd < best) {
        best = dd;
        sNeck = cum[k];
      }
    }
    const pts = [];
    let j = 0;
    for (let k = 0; k <= N; k++) {
      const target = (sNeck * k) / N;
      while (j < dense.length - 2 && cum[j + 1] < target) j++;
      const f = clamp((target - cum[j]) / (cum[j + 1] - cum[j] || 1));
      pts.push([lerp(dense[j][0], dense[j + 1][0], f), lerp(dense[j][1], dense[j + 1][1], f)]);
    }
    pts[0] = G2[0].slice();
    pts[N] = G2[5].slice();
    const ang = [], seg = [];
    let prev = null;
    for (let k = 0; k < N; k++) {
      const dx = pts[k + 1][0] - pts[k][0], dy = pts[k + 1][1] - pts[k][1];
      let a = Math.atan2(dy, dx);
      if (prev !== null) {
        while (a - prev > Math.PI) a -= TAU;
        while (a - prev < -Math.PI) a += TAU;
      }
      ang.push(a);
      seg.push(Math.hypot(dx, dy));
      prev = a;
    }
    const aE = ang[N - 1];
    const tx = Math.cos(aE), ty = Math.sin(aE), nx = -ty, ny = tx;
    const hx = G2_HEAD[0] - pts[N][0], hy = G2_HEAD[1] - pts[N][1];
    return { ang, seg, head: { along: hx * tx + hy * ty, lat: hx * nx + hy * ny, rx: 27, ry: 29 }, bulge: 3, dome: 24 };
  })();

  // ---------------------------------------------------------------------------
  // Pose: centreline, frames and widths for instar i at morph amount e (0 ladder, 1 exactly G2).
  // The morph interpolates the turning angle along the body, so the body swings and curls.
  // Side +1 is +n, which is down on the ladder. Ventral is down on the ladder and inside the curl on the J.
  // vsc slides the ventral features around the body as it rolls: +1 on the ladder, -1 on the J.
  // ---------------------------------------------------------------------------
  const ladderPoses = [];
  function pose(i, e) {
    if (e <= 0 && ladderPoses[i]) return ladderPoses[i];
    const H = horiz(i);
    const X = new Float64Array(N + 1), Y = new Float64Array(N + 1);
    const TX = new Float64Array(N + 1), TY = new Float64Array(N + 1);
    const NX = new Float64Array(N + 1), NY = new Float64Array(N + 1);
    const Wd = new Float64Array(N + 1);
    const A = new Float64Array(N);
    let x = lerp(H.tail[0], G2[0][0], e), y = lerp(H.tail[1], G2[0][1], e);
    X[0] = x;
    Y[0] = y;
    let len = 0;
    for (let k = 0; k < N; k++) {
      const a = J.ang[k] * e;
      const sl = lerp(H.segLen, J.seg[k], e);
      len += sl;
      x += Math.cos(a) * sl;
      y += Math.sin(a) * sl;
      X[k + 1] = x;
      Y[k + 1] = y;
      A[k] = a;
    }
    if (e >= 1) {
      X[N] = G2[5][0];
      Y[N] = G2[5][1];
    }
    // the in-between drawings swing a little left, so the head stays inside the Shorts safe line (x 940)
    if (e > 0 && e < 1) {
      const sx = 24 * Math.sin(Math.PI * e);
      for (let k = 0; k <= N; k++) X[k] -= sx;
    }
    const h = SPECS[i].h;
    for (let k = 0; k <= N; k++) {
      const a = k === 0 ? A[0] : k === N ? A[N - 1] : (A[k - 1] + A[k]) / 2;
      TX[k] = Math.cos(a);
      TY[k] = Math.sin(a);
      NX[k] = -TY[k];
      NY[k] = TX[k];
      const u = k / N;
      Wd[k] = lerp(prof(WH, u) * h * 0.5, WJ(u), e);
    }
    const hd = {
      along: lerp(H.head.along, J.head.along, e),
      lat: lerp(H.head.lat, J.head.lat, e),
      rx: lerp(H.head.rx, J.head.rx, e),
      ry: lerp(H.head.ry, J.head.ry, e),
    };
    const hx = X[N] + TX[N] * hd.along + NX[N] * hd.lat;
    const hy = Y[N] + TY[N] * hd.along + NY[N] * hd.lat;
    const wJ = L.smoothstep(0.5, 0.91, e);
    const q = {
      i,
      h,
      X, Y, TX, TY, NX, NY, W: Wd,
      head: { x: e >= 1 ? G2_HEAD[0] : hx, y: e >= 1 ? G2_HEAD[1] : hy, rx: hd.rx, ry: hd.ry, rot: HEAD_ROT_J * e },
      bulge: lerp(H.bulge, J.bulge, e),
      dome: lerp(H.dome, J.dome, e),
      neck: hd.lat * 0.75 * (1 - wJ),
      vs: e < 0.5 ? 1 : -1,
      vsc: Math.cos(Math.PI * e),
      app: e <= 0 ? 1 : e >= 1 ? 1 : Math.abs(1 - 2 * e),
      bowK: Math.cos(TAU * e),
      segb: segbAt(e),
      len,
      wJ,
      e,
    };
    if (e <= 0) ladderPoses[i] = q;
    return q;
  }

  // position, tangent, normal and half-width at body u
  function frameAt(q, u) {
    const f = clamp(u) * N;
    const k = Math.min(N - 1, Math.floor(f));
    const r = f - k;
    let tx = lerp(q.TX[k], q.TX[k + 1], r), ty = lerp(q.TY[k], q.TY[k + 1], r);
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl;
    ty /= tl;
    return { x: lerp(q.X[k], q.X[k + 1], r), y: lerp(q.Y[k], q.Y[k + 1], r), tx, ty, nx: -ty, ny: tx, w: lerp(q.W[k], q.W[k + 1], r) };
  }

  // J head end: both body edges converge onto the rear of the head capsule, meeting it +-24 px either side
  // of the head axis, then the path closes through the capsule (hidden under its opaque fill). 23 points.
  function capJ(q, inset, wN) {
    const hd = q.head;
    const ex = q.X[N], ey = q.Y[N], tx = q.TX[N], ty = q.TY[N], nx = q.NX[N], ny = q.NY[N];
    let ax = hd.x - ex, ay = hd.y - ey;
    const D = Math.hypot(ax, ay) || 1;
    ax /= D;
    ay /= D;
    let bx = -ay, by = ax;
    if (bx * nx + by * ny < 0) {
      bx = -bx;
      by = -by;
    }
    // the inner (inset) line runs on under the capsule, so only the outer line meets the head outline
    const R = hd.ry - inset;
    const m = Math.min(R - 2, Math.max(5, 24 - inset * 0.4));
    const back = Math.sqrt(Math.max(0, R * R - m * m));
    const Mp = [hd.x - ax * back + bx * m, hd.y - ay * back + by * m];
    const Mm = [hd.x - ax * back - bx * m, hd.y - ay * back - by * m];
    const Pp = [ex + nx * wN, ey + ny * wN], Pm = [ex - nx * wN, ey - ny * wN];
    const dp = Math.hypot(Mp[0] - Pp[0], Mp[1] - Pp[1]) * 0.32;
    const dm = Math.hypot(Mm[0] - Pm[0], Mm[1] - Pm[1]) * 0.4;
    const Cp = [Pp[0] + tx * dp, Pp[1] + ty * dp], Cm = [Pm[0] + tx * dm, Pm[1] + ty * dm];
    const Hc = [hd.x - ax * back * 0.3, hd.y - ay * back * 0.3];
    const out = [];
    for (let s = 1; s <= 8; s++) out.push(qb(Pp, Cp, Mp, s / 8));
    for (let s = 1; s <= 7; s++) out.push(qb(Mp, Hc, Mm, s / 8));
    for (let s = 0; s < 8; s++) out.push(qb(Mm, Cm, Pm, s / 8));
    return out;
  }

  // closed body outline (tail cap, +n side, head end, -n side), shrunk by inset
  function outline(q, inset) {
    const pts = [];
    const c = 12;
    const w0 = Math.max(0.5, q.W[0] - inset), b = Math.max(0.3, q.bulge - inset);
    for (let s = 0; s <= c; s++) {
      const a = (s / c) * Math.PI;
      const cs = -Math.cos(a), sn = Math.sin(a);
      pts.push([q.X[0] + q.NX[0] * w0 * cs - q.TX[0] * b * sn, q.Y[0] + q.NY[0] * w0 * cs - q.TY[0] * b * sn]);
    }
    for (let k = 1; k <= N; k++) {
      const w = Math.max(0.5, q.W[k] - inset);
      pts.push([q.X[k] + q.NX[k] * w, q.Y[k] + q.NY[k] * w]);
    }
    const wN = Math.max(0.5, q.W[N] - inset), d = Math.max(0.3, q.dome - inset);
    // ladder cap from the +n edge through an apex shifted toward the head, to the -n edge (local along, lat)
    const nk = q.neck * (1 - inset / Math.max(1, wN + inset));
    const cap = (al, la) => [q.X[N] + q.TX[N] * al + q.NX[N] * la, q.Y[N] + q.TY[N] * al + q.NY[N] * la];
    const jc = q.wJ > 0 ? capJ(q, inset, wN) : null;
    const hc = 2 * c;
    for (let s = 1; s < hc; s++) {
      const u = s / hc;
      let al, la;
      if (u < 0.5) {
        const v = u * 2;
        al = 2 * (1 - v) * v * d * 1.05 + v * v * d;
        la = (1 - v) * (1 - v) * wN + 2 * (1 - v) * v * wN * 0.9 + v * v * nk;
      } else {
        const v = (u - 0.5) * 2;
        al = (1 - v) * (1 - v) * d + 2 * (1 - v) * v * d * 1.05;
        la = (1 - v) * (1 - v) * nk + 2 * (1 - v) * v * -wN * 0.9 + v * v * -wN;
      }
      const lp = cap(al, la);
      if (jc) {
        const jp = jc[s - 1];
        pts.push([lerp(lp[0], jp[0], q.wJ), lerp(lp[1], jp[1], q.wJ)]);
      } else pts.push(lp);
    }
    for (let k = N; k >= 1; k--) {
      const w = Math.max(0.5, q.W[k] - inset);
      pts.push([q.X[k] - q.NX[k] * w, q.Y[k] - q.NY[k] * w]);
    }
    return pts;
  }

  // a u-range strip of the body (for band clips), inset from the outline
  function strip(q, ua, ub, inset) {
    const out = [];
    const n = Math.max(2, Math.ceil((ub - ua) * N * 2));
    // the strip ends bow like the segment rings (ringArc), so band clips follow the round body
    const cross = (u, from) => {
      if (u <= 0 || u >= 1) return;
      const F = frameAt(q, u);
      const w = Math.max(0.5, F.w - inset);
      for (let c = 1; c < 8; c++) {
        const v = from * (1 - (2 * c) / 8);
        const d = ringBow(q, F.w, v);
        out.push([F.x + F.nx * v * w + F.tx * d, F.y + F.ny * v * w + F.ty * d]);
      }
    };
    for (let s = 0; s <= n; s++) {
      const F = frameAt(q, lerp(ua, ub, s / n));
      const w = Math.max(0.5, F.w - inset);
      out.push([F.x + F.nx * w, F.y + F.ny * w]);
    }
    cross(ub, 1);
    for (let s = n; s >= 0; s--) {
      const F = frameAt(q, lerp(ua, ub, s / n));
      const w = Math.max(0.5, F.w - inset);
      out.push([F.x - F.nx * w, F.y - F.ny * w]);
    }
    cross(ua, -1);
    return out;
  }
  // along-body offset (px) of a segment ring at lateral v: ringArc's quadratic, control 0.14 w * bowK
  const ringBow = (q, w, v) => 0.07 * w * q.bowK * (1 - v * v);

  // ---------------------------------------------------------------------------
  // Bands. f runs from a segment's front ring (0) to its rear ring (1):
  // white 0-0.12, black 0.12-0.52, white 0.52-0.62, yellow 0.62-0.84, white 0.84-1.
  // In the blueprint the black band is dense stipple, the yellow band mid stipple, the white gaps empty.
  // ---------------------------------------------------------------------------
  const BAND = { blackA: 0.12, blackB: 0.52, yelA: 0.62, yelB: 0.84 };
  function bandLevel(f) {
    if (f < BAND.blackA || f >= BAND.yelB) return 0.03;
    if (f < BAND.blackB) return 1;
    if (f < BAND.yelA) return 0.03;
    return 0.45;
  }

  // ---------------------------------------------------------------------------
  // Body stipple, generated once per instar in body space (u along, v across) so it rides the morph
  // ---------------------------------------------------------------------------
  const dotCache = [];
  function bodyDots(i) {
    if (dotCache[i]) return dotCache[i];
    const h = SPECS[i].h;
    const Lb = horiz(i).segLen * N;
    const sp = SPECS[i].sp;
    const r = L.rng(L.hash(ID, 'dots', i));
    const out = [];
    const rowH = sp * 0.866;
    let row = 0;
    for (let l = -h / 2; l <= h / 2; l += rowH, row++) {
      for (let sx = (row & 1 ? sp / 2 : 0) - sp; sx <= Lb + sp; sx += sp) {
        const ss = sx + (r() - 0.5) * sp * 0.7;
        const ll = l + (r() - 0.5) * sp * 0.7;
        const c = r(), rad = r(), bx = (r() * 100000) | 0;
        const u = ss / Lb;
        if (u < 0 || u > 1) continue;
        const v = ll / (prof(WH, u) * h * 0.5);
        if (Math.abs(v) > 0.97) continue;
        out.push({ u, v, c, rad, bx });
      }
    }
    return (dotCache[i] = out);
  }

  function densAt(q, u, v) {
    const s = SPECS[q.i];
    const B = q.segb;
    const k = segIndex(B, u);
    const f = clamp((B[k + 1] - u) / (B[k + 1] - B[k]));
    let strength = k >= 10 ? s.bands * s.thorax : s.bands;
    if (k === 0) strength *= 0.7;
    if (q.i === 0 && u > 0.86) return s.dens * 0.95;
    let d = s.dens * lerp(0.4, bandLevel(f), strength);
    if (Math.abs(v) > 0.78) d *= 1.1;
    return d;
  }

  // light from the upper left: the side of the body facing lower right is the shadow side (+1)
  const SHADE_X = Math.SQRT1_2, SHADE_Y = Math.SQRT1_2;
  function drawDots(ctx, q, fill, alpha, upTo, vMax) {
    const i = q.i;
    const dots = bodyDots(i);
    const bi = L.boil(L.T);
    const p = new Path2D();
    const [ra, rb] = SPECS[i].rr;
    const vm = vMax == null ? 1 : vMax;
    const inv = 1 / q.len;
    for (let n = 0; n < dots.length; n++) {
      const d = dots[n];
      if (d.u > upTo) continue;
      const av = Math.abs(d.v);
      if (av > vm) continue;
      const F = frameAt(q, d.u);
      // band edges bow with their ring: u-shift uses ringArc's 0.14 control, dots sit on the quadratic
      const bow = 0.14 * F.w * q.bowK * (1 - d.v * d.v);
      const ub = d.u - bow * inv;
      const sh = clamp(d.v * (F.nx * SHADE_X + F.ny * SHADE_Y) / SHADE_X, -1, 1);
      const tone = lerp(0.72, 1.18, (sh + 1) / 2);
      const dens = densAt(q, ub, d.v) * fill * tone;
      if (d.c >= dens) continue;
      const along = ringBow(q, F.w, d.v);
      const x = F.x + F.nx * d.v * F.w + F.tx * along + (L.h3(d.bx, bi, 3) - 0.5) * 0.7;
      const y = F.y + F.ny * d.v * F.w + F.ty * along + (L.h3(bi, d.bx, 4) - 0.5) * 0.7;
      let rad = (ra + d.rad * (rb - ra)) * (0.62 + 0.38 * Math.min(1, dens / tone)) * tone;
      if (av > 0.85) rad = lerp(rad, 0.6, L.smoothstep(0.85, 0.97, av));
      p.moveTo(x + rad, y);
      p.arc(x, y, rad, 0, TAU);
    }
    ctx.save();
    ctx.globalAlpha *= alpha * 0.84;
    ctx.fillStyle = LAV;
    ctx.fill(p);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Segment rings (and the white band edges on instars 4 and 5), limbs, spiracles, filaments
  // ---------------------------------------------------------------------------
  function ringArc(p, F, w, bow) {
    p.moveTo(F.x - F.nx * w, F.y - F.ny * w);
    p.quadraticCurveTo(F.x + F.tx * bow, F.y + F.ty * bow, F.x + F.nx * w, F.y + F.ny * w);
  }

  // a filled polyline tapering from half-width w0 to w1 (a pen stroke that thins toward its tip)
  function taperPoly(p, pts, w0, w1) {
    const n = pts.length;
    const left = [], right = [];
    for (let k = 0; k < n; k++) {
      const a = pts[Math.max(0, k - 1)], b = pts[Math.min(n - 1, k + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      const w = lerp(w0, w1, k / (n - 1));
      left.push([pts[k][0] - ty * w, pts[k][1] + tx * w]);
      right.push([pts[k][0] + ty * w, pts[k][1] - tx * w]);
    }
    p.moveTo(left[0][0], left[0][1]);
    for (let k = 1; k < n; k++) p.lineTo(left[k][0], left[k][1]);
    for (let k = n - 1; k >= 0; k--) p.lineTo(right[k][0], right[k][1]);
    p.closePath();
  }

  function drawRings(ctx, q, prog, alpha) {
    const p = new Path2D();
    const B = q.segb;
    for (let k = 1; k < 13; k++) {
      const u = B[k];
      if (u > prog) continue;
      const F = frameAt(q, u);
      ringArc(p, F, F.w * 0.97, F.w * 0.14 * q.bowK);
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = LAV;
    ctx.globalAlpha *= alpha * (q.i >= 3 ? 0.5 : q.i === 0 ? 0.24 : q.i === 1 ? 0.34 : 0.42);
    ctx.lineWidth = q.i >= 3 ? 1.3 : 1;
    ctx.stroke(p);
    ctx.restore();
    if (q.i < 3) return;
    // thin white arcs at the white-gap centres, so each band edge reads
    const wp = new Path2D();
    for (let k = 0; k < 13; k++) {
      if (k >= 10 && SPECS[q.i].thorax < 0.5) continue;
      for (const f of [0.57, 0.92]) {
        const u = B[k + 1] - f * (B[k + 1] - B[k]);
        if (u > prog) continue;
        const F = frameAt(q, u);
        ringArc(wp, F, F.w * 0.9, F.w * 0.14 * q.bowK);
      }
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = WHITE;
    ctx.globalAlpha *= alpha * 0.35;
    ctx.lineWidth = 1;
    ctx.stroke(wp);
    ctx.restore();
  }

  // shot 06's limp filament: droops toward gravity with a seeded crinkle
  const S06 = (L.hash('j-hang') % 100000) + 2000;
  function droopPts(x, y, dx, dy, len, seed, crinkle, droop, b) {
    let ang = Math.atan2(dy, dx);
    const n = Math.max(5, Math.round(len / 7));
    const st = len / n;
    const pts = [[x, y]];
    let px = x, py = y;
    for (let i = 0; i < n; i++) {
      let da = Math.PI / 2 - ang;
      while (da > Math.PI) da -= TAU;
      while (da < -Math.PI) da += TAU;
      ang += da * droop * (0.4 + i / n) + crinkle * L.noise1(i * 0.85 + 0.3, seed) + (L.h3(i, b, seed) - 0.5) * 0.06;
      px += Math.cos(ang) * st;
      py += Math.sin(ang) * st;
      pts.push([px, py]);
    }
    return pts;
  }

  const PROLEG_J_NUDGE = { [SEG.A6]: 1, [SEG.A5]: 4, [SEG.A4]: 5, [SEG.A3]: 6 };
  function drawLimbs(ctx, q, alpha) {
    const a = q.app;
    const i = q.i, s = SPECS[i], h = s.h, vs = q.vs, vsc = q.vsc, e = q.e;
    const B = q.segb;
    const lines = new Path2D();
    const thin = new Path2D();
    const spots = new Path2D();
    const legs = new Path2D();
    const lobes = new Path2D();
    const crochets = new Path2D();
    const pt = (F, lat, along) => [F.x + F.nx * lat + F.tx * along, F.y + F.ny * lat + F.ty * along];
    const lw = i >= 3 ? 1.8 : i === 2 ? 1.4 : 1.1;
    if (a > 0.02) {
      // true legs on T1 to T3: short two-segment claws, tapered, the claw hooking toward the head
      const legLen = Math.min(14, h * 0.1) * a;
      for (const k of [SEG.T1, SEG.T2, SEG.T3]) {
        const F = frameAt(q, segMid(B, k));
        const lat0 = vsc * F.w * 0.97;
        const b = pt(F, lat0, -legLen * 0.05);
        const j = pt(F, lat0 + vs * legLen * 0.56, -legLen * 0.1);
        const t = pt(F, lat0 + vs * legLen * 0.8, legLen * 0.32);
        const c = pt(F, lat0 + vs * legLen * 0.7, legLen * 0.48);
        taperPoly(legs, [b, j, t, c], lw * 0.5, 0.25);
      }
      // prolegs on A3 to A6 and A10: fleshy rounded lobes growing out of the body edge, crochets on the sole
      const wid = lerp((16 * h) / 120, 12, e), dep = lerp((14 * h) / 120, 13, e) * a;
      for (const k of [SEG.A3, SEG.A4, SEG.A5, SEG.A6, SEG.A10]) {
        const u = k === SEG.A10 ? 0.045 : segMid(B, k);
        const F = frameAt(q, u);
        const grip = k === SEG.A10 ? e : 0;
        // lobe axis: out from the ventral edge; on the J the last pair (A10) turns back up to grip the silk pad
        let dl = vs * (1 - grip), da = -grip;
        const dn = Math.hypot(dl, da) || 1;
        dl /= dn;
        da /= dn;
        const lat0 = lerp(vsc * F.w * 0.96, vs * F.w * 0.55, grip);
        // on the J each lobe settles onto the pixel row of shot 06's proleg (measured across the match cut)
        const al0 = -grip * u * q.len * 0.5 + e * (PROLEG_J_NUDGE[k] || 0);
        const depth = lerp(dep, u * q.len * 0.5 + q.bulge + 2, grip);
        // local frame: A along the lobe axis, P across it
        const P = (s, r) => pt(F, lat0 + dl * s - da * r, al0 + da * s + dl * r);
        const hw = wid / 2;
        for (let s = 0; s <= 12; s++) {
          const th = (s / 12) * Math.PI;
          const m = P(Math.sin(th) * depth, -Math.cos(th) * hw);
          if (s === 0) lobes.moveTo(m[0], m[1]);
          else lobes.lineTo(m[0], m[1]);
        }
        lobes.closePath();
        if (i >= 2 && grip < 0.5) {
          for (let c = 0; c < 5; c++) {
            const th = lerp(0.28, 0.72, c / 4) * Math.PI;
            const m = P(Math.sin(th) * depth * 0.8, -Math.cos(th) * hw * 0.8);
            crochets.moveTo(m[0] + 1, m[1]);
            crochets.arc(m[0], m[1], 1, 0, TAU);
          }
        }
        if (i >= 3) {
          const sp = P(depth * 0.42, -hw * 0.2);
          const rr = h * 0.02 * a;
          spots.moveTo(sp[0] + rr, sp[1]);
          spots.arc(sp[0], sp[1], rr, 0, TAU);
        }
      }
    }
    // spiracles on T1 and A1 to A8, sliding around the body as it rolls
    const sa = Math.max(0.35, a);
    if (i >= 2) {
      for (const k of [SEG.T1, 9, 8, 7, 6, 5, 4, 3, 2]) {
        const F = frameAt(q, segMid(B, k));
        const c = pt(F, vsc * F.w * 0.42, 0);
        const rx = h * 0.032 * sa, ry = h * 0.017 * sa;
        thin.moveTo(c[0] + F.tx * rx, c[1] + F.ty * rx);
        thin.ellipse(c[0], c[1], rx, ry, Math.atan2(F.ty, F.tx), 0, TAU);
      }
    }
    // filaments on the dorsal side: T2 (front, longer) and A8 (rear)
    const dor = -vs;
    const limp = e;
    const fa = Math.max(0.4, a);
    const bi = L.boil(L.T);
    const fil = (k, lens, front) => {
      for (const d of [-1, 1]) {
        const near = d < 0;
        const u = segMid(B, k) + (near ? -0.004 : 0.006) * e;
        const F = frameAt(q, u);
        const L0 = lerp(lens[0], lens[near ? 1 : 2], e) * fa;
        const off = d * h * 0.035 * (1 - e);
        const baseLat = -vsc * F.w * lerp(0.94, near ? 0.92 : 0.6, e);
        const b = pt(F, baseLat, off);
        if (a < 0.5) {
          // edge-on while the body rolls: a short straight tick
          const tip = pt(F, baseLat + dor * L0, off + (front ? 1 : -1) * L0 * 0.12);
          lines.moveTo(b[0], b[1]);
          lines.lineTo(tip[0], tip[1]);
          const rr = Math.max(1, h * 0.012);
          spots.moveTo(tip[0] + rr, tip[1]);
          spots.arc(tip[0], tip[1], rr, 0, TAU);
          continue;
        }
        const lat1 = baseLat + dor * L0 * 0.55;
        const lat2 = baseLat + dor * L0 * 0.8;
        const al1 = off + (front ? L0 * 0.1 : -L0 * 0.12);
        const al2 = off * 3 + (front ? L0 * 0.5 : -L0 * 0.6);
        const c1 = pt(F, lat1, al1), t2 = pt(F, lat2, al2);
        let pts;
        if (limp > 0) {
          const tilt = front ? 0.3 : -0.35;
          const tw = front ? 1 : -1;
          const dx = F.nx * dor * Math.cos(tilt) + F.tx * tw * Math.sin(tilt);
          const dy = F.ny * dor * Math.cos(tilt) + F.ty * tw * Math.sin(tilt);
          const seed = S06 + (near ? -4 : 6) + Math.round(L0);
          const dp = droopPts(b[0], b[1], dx, dy, L0, seed, 0.24, front ? 0.16 : 0.34, bi);
          const n = dp.length - 1;
          pts = dp.map((m, j) => {
            const c = qb(b, c1, t2, j / n);
            return [lerp(c[0], m[0], limp), lerp(c[1], m[1], limp)];
          });
        } else {
          pts = [];
          for (let j = 0; j <= 12; j++) pts.push(qb(b, c1, t2, j / 12));
        }
        lines.moveTo(pts[0][0], pts[0][1]);
        for (let j = 1; j < pts.length; j++) lines.lineTo(pts[j][0], pts[j][1]);
        const tip = pts[pts.length - 1];
        const rr = Math.max(1, h * 0.012);
        spots.moveTo(tip[0] + rr, tip[1]);
        spots.arc(tip[0], tip[1], rr, 0, TAU);
      }
    };
    if (i === 0) {
      for (const k of [SEG.T2, SEG.A8]) {
        const F = frameAt(q, segMid(B, k));
        const c = pt(F, dor * F.w, 0);
        lines.moveTo(c[0] + F.tx * 1.8, c[1] + F.ty * 1.8);
        lines.arc(c[0], c[1], 1.8, Math.atan2(F.ty, F.tx), Math.atan2(F.ty, F.tx) + (dor > 0 ? Math.PI : -Math.PI), dor < 0);
      }
    } else {
      fil(SEG.T2, [s.fil[0], 184, 168], true);
      fil(SEG.A8, [s.fil[1], 68, 60], false);
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const ga = ctx.globalAlpha * alpha;
    ctx.globalAlpha = ga * 0.9;
    ctx.fillStyle = NAVYL;
    ctx.fill(lobes);
    ctx.globalAlpha = ga * 0.85;
    ctx.fillStyle = LAV;
    ctx.fill(legs);
    ctx.strokeStyle = LAV;
    ctx.lineWidth = lw;
    ctx.stroke(lobes);
    ctx.globalAlpha = ga * 0.95;
    ctx.fillStyle = WHITE;
    ctx.fill(crochets);
    ctx.globalAlpha = ga * 0.8;
    ctx.strokeStyle = LAV;
    ctx.stroke(lines);
    ctx.globalAlpha = ga * 0.64;
    ctx.lineWidth = 1;
    ctx.strokeStyle = WHITE;
    ctx.stroke(thin);
    ctx.fillStyle = WHITE;
    ctx.fill(spots);
    ctx.restore();
    // the roll cue: a dotted spiracle line sliding from +n across the centreline to -n
    if (i === 4 && e > 0 && e < 1) {
      const sl = new Path2D();
      for (let k = 0; k <= 40; k++) {
        const u = lerp(segMid(B, SEG.A8), segMid(B, SEG.T1), k / 40);
        const F = frameAt(q, u);
        const m = pt(F, vsc * F.w * 0.42, 0);
        if (k === 0) sl.moveTo(m[0], m[1]);
        else sl.lineTo(m[0], m[1]);
      }
      strokePath(ctx, sl, P.navy, 0.75 * alpha, 5.5);
      strokePath(ctx, sl, WHITE, 0.85 * alpha, 2.4, [0.5, 7]);
    }
  }

  // ---------------------------------------------------------------------------
  // Head capsule: dense stipple (black head), frons triangle and face bands, stemmata, mandibles
  // ---------------------------------------------------------------------------
  const headDotCache = [];
  function headDots(i) {
    if (headDotCache[i]) return headDotCache[i];
    const H = horiz(i);
    const sp = (i === 4 ? 4.4 : 3.2) / H.head.ry;
    const r = L.rng(L.hash(ID, 'head', i));
    const out = [];
    let row = 0;
    for (let b = -1; b <= 1; b += sp * 0.866, row++) {
      for (let a = -1 + (row & 1 ? sp / 2 : 0); a <= 1; a += sp) {
        const x = a + (r() - 0.5) * sp * 0.7, y = b + (r() - 0.5) * sp * 0.7;
        const c = r(), bx = (r() * 100000) | 0;
        if (x * x + y * y > 0.8) continue;
        out.push({ a: x, b: y, c, bx });
      }
    }
    return (headDotCache[i] = out);
  }

  function inTri(px, py, A, B, C) {
    const s1 = (B[0] - A[0]) * (py - A[1]) - (B[1] - A[1]) * (px - A[0]);
    const s2 = (C[0] - B[0]) * (py - B[1]) - (C[1] - B[1]) * (px - B[0]);
    const s3 = (A[0] - C[0]) * (py - C[1]) - (A[1] - C[1]) * (px - C[0]);
    return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
  }

  // local head coordinates: a forward along the head axis, b toward the dorsal side, both in radii
  const TRI = [[0.3, 0.62], [0.55, 0.02], [0.05, 0.02]];

  function drawHead(ctx, q, prog, alpha) {
    if (prog <= 0) return;
    const i = q.i, hd = q.head;
    const ca = Math.cos(hd.rot), sa = Math.sin(hd.rot);
    const dor = -q.vs;
    const map = (a, b) => [hd.x + ca * a * hd.rx - sa * dor * b * hd.ry, hd.y + sa * a * hd.rx + ca * dor * b * hd.ry];
    const bi = L.boil(L.T);
    // T1 collar on the J: a white arc 9 px behind the capsule, wrapping the head base, clipped to the body
    if (i === 4 && q.wJ > 0) {
      const ba = Math.atan2(q.Y[N] - hd.y, q.X[N] - hd.x);
      const col = new Path2D();
      col.arc(hd.x, hd.y, hd.ry + 9, ba - 1.22, ba + 1.22);
      const clip = new Path2D();
      L.tracePath(clip, outline(q, 1.5), true);
      ctx.save();
      ctx.clip(clip);
      strokePath(ctx, col, WHITE, 0.6 * alpha * q.wJ * prog, 1.5);
      ctx.restore();
    }
    // opaque cap so body lines behind the head are hidden; on the J only in front of the chord where the
    // body edges meet the capsule, so the collar stipple runs on into the back of the head
    ctx.save();
    ctx.globalAlpha *= alpha * 0.97;
    ctx.fillStyle = NAVYL;
    ctx.beginPath();
    if (q.wJ > 0.5) {
      const ba = Math.atan2(q.Y[N] - hd.y, q.X[N] - hd.x) - hd.rot;
      const gap = Math.acos(Math.sqrt(Math.max(0, hd.ry * hd.ry - 24 * 24)) / hd.ry) * 1.04;
      ctx.ellipse(hd.x, hd.y, hd.rx + 1, hd.ry + 1, hd.rot, ba + gap, ba + TAU - gap);
      ctx.closePath();
    } else ctx.ellipse(hd.x, hd.y, hd.rx + 1, hd.ry + 1, hd.rot, 0, TAU);
    ctx.fill();
    ctx.restore();
    // stipple
    const dp = new Path2D();
    const full = i >= 1;
    for (const d of headDots(i)) {
      if (d.c > 0.8 * prog) continue;
      if (full && inTri(d.a, d.b, TRI[0], TRI[1], TRI[2])) continue;
      if (full && Math.abs(d.a - 0.78 + 0.25 * d.b * d.b) < 0.07) continue;
      const m = map(d.a, d.b);
      const x = m[0] + (L.h3(d.bx, bi, 5) - 0.5) * 0.6, y = m[1] + (L.h3(bi, d.bx, 6) - 0.5) * 0.6;
      const rad = i >= 3 ? 1.3 : 0.85;
      dp.moveTo(x + rad, y);
      dp.arc(x, y, rad, 0, TAU);
    }
    ctx.save();
    ctx.globalAlpha *= alpha * 0.85;
    ctx.fillStyle = LAV;
    ctx.fill(dp);
    ctx.restore();
    // outline: closed on the ladder; on the J the rear arc inside the body end is left out, so the
    // capsule sits in the collar instead of on top of it (a faint suture marks where it joins)
    const seed = L.hash(ID, 'head-line', i);
    const lineO = { width: i >= 3 ? 2.5 : 1.6, color: LAV, alpha: 0.85 * alpha, seed, wobble: 0.5, tremble: 0.1, boilAmp: 0.45, widthJitter: 0.1, rough: 0.1 };
    const lineI = { width: 1.2, color: LAV, alpha: 0.4 * alpha, seed: seed + 3, wobble: 0.4, tremble: 0.1, boilAmp: 0.4, widthJitter: 0.1, rough: 0.08 };
    if (q.wJ > 0.5) {
      const ba = Math.atan2(q.Y[N] - hd.y, q.X[N] - hd.x) - hd.rot;
      const gap = Math.acos(clamp(Math.sqrt(Math.max(0, hd.ry * hd.ry - 24 * 24)) / hd.ry, -1, 1));
      const arcPts = (rx, ry, a0, a1, n) => {
        const out = [];
        const c = Math.cos(hd.rot), sn = Math.sin(hd.rot);
        for (let k = 0; k <= n; k++) {
          const a = lerp(a0, a1, k / n);
          const lx = Math.cos(a) * rx, ly = Math.sin(a) * ry;
          out.push([hd.x + lx * c - ly * sn, hd.y + lx * sn + ly * c]);
        }
        return out;
      };
      L.inkPath(ctx, arcPts(hd.rx, hd.ry, ba + gap, ba + TAU - gap, 36), Object.assign({ taper: [5, 5] }, lineO));
      L.inkPath(ctx, arcPts(hd.rx, hd.ry, ba - gap * 0.8, ba + gap * 0.8, 10), Object.assign({ taper: [4, 4] }, lineO, { width: 1, alpha: 0.3 * alpha }));
      L.inkPath(ctx, arcPts(Math.max(2, hd.rx - 6), Math.max(2, hd.ry - 6), ba + gap * 1.2, ba + TAU - gap * 1.2, 32), Object.assign({ taper: [5, 5] }, lineI));
    } else {
      L.inkPath(ctx, L.ellipsePts(hd.x, hd.y, hd.rx, hd.ry, 40, hd.rot), Object.assign({ closed: true, taper: [4, 8] }, lineO));
      if (i >= 3) {
        const inner = L.ellipsePts(hd.x, hd.y, Math.max(2, hd.rx - 6), Math.max(2, hd.ry - 6), 36, hd.rot);
        L.inkPath(ctx, inner, Object.assign({ closed: true, taper: [4, 8] }, lineI));
      }
    }
    if (!full) return;
    // frons triangle, face band arcs, stemmata, mandible, antenna
    const face = new Path2D();
    const t0 = map(TRI[0][0], TRI[0][1]), t1 = map(TRI[1][0], TRI[1][1]), t2 = map(TRI[2][0], TRI[2][1]);
    face.moveTo(t0[0], t0[1]);
    face.lineTo(t1[0], t1[1]);
    face.lineTo(t2[0], t2[1]);
    face.closePath();
    for (let s = 0; s <= 10; s++) {
      const b = -0.85 + (s / 10) * 1.7;
      const m = map(0.78 - 0.25 * b * b, b);
      if (s === 0) face.moveTo(m[0], m[1]);
      else face.lineTo(m[0], m[1]);
    }
    for (let s = 0; s <= 8; s++) {
      const b = -0.7 + (s / 8) * 1.4;
      const m = map(-0.2 - 0.2 * b * b, b);
      if (s === 0) face.moveTo(m[0], m[1]);
      else face.lineTo(m[0], m[1]);
    }
    const md0 = map(0.86, -0.42), md1 = map(1.12, -0.58), md2 = map(0.98, -0.72);
    face.moveTo(md0[0], md0[1]);
    face.lineTo(md1[0], md1[1]);
    face.lineTo(md2[0], md2[1]);
    const an0 = map(0.9, -0.1), an1 = map(1.16, -0.2);
    face.moveTo(an0[0], an0[1]);
    face.lineTo(an1[0], an1[1]);
    const oc = new Path2D();
    for (let s = 0; s < 5; s++) {
      const m = map(0.5 + 0.09 * Math.cos(s * 1.2), -0.42 - 0.1 * Math.sin(s * 1.2) - s * 0.03);
      const rr = i >= 3 ? 1.6 : 0.9;
      oc.moveTo(m[0] + rr, m[1]);
      oc.arc(m[0], m[1], rr, 0, TAU);
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha *= alpha * 0.8 * prog;
    ctx.strokeStyle = WHITE;
    ctx.lineWidth = i >= 3 ? 1.4 : 1;
    ctx.stroke(face);
    ctx.fillStyle = WHITE;
    ctx.fill(oc);
    ctx.restore();
  }

  // double lavender outline, drawn on from the tail when prog < 1
  function drawOutline(ctx, q, prog, alpha) {
    if (prog <= 0) return;
    const i = q.i;
    const seed = L.hash(ID, 'body', i);
    const outer = outline(q, 0);
    const common = { color: LAV, wobble: 0.7, tremble: 0.15, boilAmp: 0.55, widthJitter: 0.12, rough: 0.12 };
    const wOuter = i >= 3 ? 2.5 : i === 2 ? 2 : 1.6;
    if (prog < 1) {
      const n = Math.max(2, Math.floor(outer.length * prog));
      L.inkPath(ctx, outer.slice(0, n), Object.assign({}, common, { width: wOuter, alpha: 0.9 * alpha, seed, taper: [3, 10] }));
    } else {
      L.inkPath(ctx, outer, Object.assign({}, common, { closed: true, width: wOuter, alpha: 0.85 * alpha, seed, taper: [6, 12] }));
    }
    if (i >= 2) {
      const inset = Math.min(9, q.h * 0.075);
      const inner = outline(q, inset);
      const n = prog < 1 ? Math.max(2, Math.floor(inner.length * prog)) : inner.length;
      L.inkPath(ctx, prog < 1 ? inner.slice(0, n) : inner, Object.assign({}, common, { closed: prog >= 1, width: 1.5, alpha: 0.5 * alpha, seed: seed + 17, taper: [6, 12] }));
    }
  }

  // ---------------------------------------------------------------------------
  // Guide geometry: complete by frame 2 so the cut-in frame is already a full plate
  // ---------------------------------------------------------------------------
  function strokePath(ctx, p, color, alpha, width, dash) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.globalAlpha *= alpha;
    ctx.lineWidth = width;
    if (dash) ctx.setLineDash(dash);
    ctx.stroke(p);
    ctx.restore();
  }

  const guideProg = (t) => L.ease.outCubic(clamp((t * 24 + 1) / 3));

  function drawGuides(ctx, t, low) {
    const cp = guideProg(t);
    // two long diagonals through the guide centre
    const d = new Path2D();
    for (const a of [1.02, Math.PI - 1.02]) {
      const c = Math.cos(a), s = Math.sin(a);
      d.moveTo(540 - c * 1400, 640 - s * 1400);
      d.lineTo(540 + c * 1400, 640 + s * 1400);
    }
    strokePath(ctx, d, LAV, 0.12, 1);
    // faint stipple haze inside the big guide circle
    L.stipple(ctx, null, {
      bounds: [180, 280, 720, 720],
      spacing: 7.5,
      density: (x, y) => ((x - 540) * (x - 540) + (y - 640) * (y - 640) < 355 * 355 ? 0.22 : 0),
      r: [0.8, 1.5],
      color: LAV,
      alpha: 0.32,
      seed: L.hash(ID, 'haze'),
    });
    // from the 8.5 beat a second haze patch fills the empty lower right, behind the flow lines,
    // thinning out toward x 900
    const hz = clamp(((t - 0.5) * 24 + 1) / 3);
    if (hz > 0) {
      L.stipple(ctx, null, {
        bounds: [540, 1000, 360, 440],
        spacing: 7.5,
        density: (x, y) => ((x - 760) * (x - 760) + (y - 1220) * (y - 1220) < 220 * 220 ? 0.22 * clamp((900 - x) / 70) : 0),
        r: [0.8, 1.5],
        color: LAV,
        alpha: 0.25 * hz,
        seed: L.hash(ID, 'haze2'),
      });
    }
    L.guideCircle(ctx, 540, 640, 360, { p: cp, alpha: 0.17, width: 1.5, cross: 22 });
    L.guideCircle(ctx, 540, 640, 300, { p: cp, alpha: 0.08, width: 1, dash: [2, 8] });
    L.ticks(ctx, 540, 640, { r: 360, n: 120, len: 7, major: 10, majorLen: 16, inward: true, alpha: 0.24, width: 1, color: LAV, p: cp });
    // growth envelope through the tails and heads, extended past the ladder
    const env = new Path2D();
    for (const side of [0, 1]) {
      const pts = [];
      pts.push([side ? 548 : 532, 1640]);
      for (let i = 0; i < 5; i++) {
        const H = horiz(i);
        pts.push([side ? H.x1 : H.x0, SPECS[i].y]);
      }
      pts.push([side ? 1010 : 70, 300]);
      pts.push([side ? 1120 : -40, 90]);
      const sm = L.smoothPts(pts, false, 8);
      const n = Math.floor(sm.length * cp);
      for (let k = 0; k < n; k++) {
        if (k === 0) env.moveTo(sm[k][0], sm[k][1]);
        else env.lineTo(sm[k][0], sm[k][1]);
      }
    }
    strokePath(ctx, env, LAV, 0.32 * low, 1.2, [6, 8]);
  }

  // ghosts of all five instars from frame 0: dashed outlines, dash-dot centrelines, dimension brackets,
  // and a faint lattice inside instar 5, so the pen traces over a drawing already laid in
  function drawGhosts(ctx, low, top, ghostFill) {
    for (let i = 0; i < 5; i++) {
      const a = i < 4 ? low : top;
      if (a <= 0.01) continue;
      const q = pose(i, 0);
      const out = outline(q, 0);
      // the laid-in drawing: a 25% secondary-weight outline the pen later traces into the full double line
      L.inkPath(ctx, out, { closed: true, width: 1.5, color: LAV, alpha: 0.25 * a, seed: L.hash(ID, 'ghost-line', i), wobble: 0.5, tremble: 0.1, boilAmp: 0.4, widthJitter: 0.08, rough: 0.08, taper: [6, 12] });
      const pth = new Path2D();
      L.tracePath(pth, out, true);
      strokePath(ctx, pth, LAV, 0.32 * a, 1, [6, 6]);
      if (i >= 2) {
        const inner = new Path2D();
        L.tracePath(inner, outline(q, Math.min(9, q.h * 0.075)), true);
        strokePath(ctx, inner, LAV, 0.16 * a, 1, [3, 7]);
      }
      // ghost head capsule and frons
      const hd = q.head;
      const hp = new Path2D();
      hp.ellipse(hd.x, hd.y, hd.rx, hd.ry, 0, 0, TAU);
      strokePath(ctx, hp, LAV, 0.32 * a, i >= 3 ? 1.5 : 1, [6, 6]);
      if (i >= 1) {
        const tp = new Path2D();
        for (let k = 0; k < 3; k++) {
          const m = [hd.x + TRI[k][0] * hd.rx, hd.y - TRI[k][1] * hd.ry];
          if (k === 0) tp.moveTo(m[0], m[1]);
          else tp.lineTo(m[0], m[1]);
        }
        tp.closePath();
        strokePath(ctx, tp, LAV, 0.2 * a, 1);
      }
      const H = horiz(i), y = SPECS[i].y;
      const ext = 16 + q.h * 0.25;
      const c = new Path2D();
      c.moveTo(H.x0 - ext, y);
      c.lineTo(H.x1 + ext, y);
      strokePath(ctx, c, LAV, 0.2 * a, 1, [14, 4, 2, 4]);
      const yb = y + SPECS[i].h / 2 + SPECS[i].h * 0.2 + 16;
      L.bracket(ctx, H.x0, yb, H.x1, yb, { style: 'dim', cap: 10, alpha: 0.2 * a, width: 1 });
      if (i === 4) L.hexLattice(ctx, outline(q, 2), { r: 8, alpha: 0.08 * a, width: 1, seed: L.hash(ID, 'ghost-lat'), jitter: 1 });
      if (i >= 2 && ghostFill > 0) drawDots(ctx, q, 1, a * ghostFill * (i >= 3 ? 0.3 : 0.22), 2, 0.8);
    }
  }

  // ---------------------------------------------------------------------------
  // Vertical log axis at x 110 with tick clusters, a bracket, and leaders to each instar
  // ---------------------------------------------------------------------------
  function drawAxis(ctx, t, progs, low, top) {
    const x = 110, y0 = 1540, y1 = 300;
    const prog = guideProg(t);
    const yTop = lerp(y0, y1, prog);
    const line = new Path2D();
    line.moveTo(x, y0);
    line.lineTo(x, yTop);
    strokePath(ctx, line, LAV, 0.6, 1.5);
    const minor = new Path2D(), major = new Path2D();
    const dec = (y0 - y1) / 3;
    for (let dcd = 0; dcd < 3; dcd++) {
      for (let k = 1; k <= 10; k++) {
        if (k === 10 && dcd < 2) continue;
        const y = y0 - (dcd + Math.log10(k)) * dec;
        if (y < yTop) continue;
        const isMaj = k === 1 || k === 10;
        const len = isMaj ? 28 : k === 5 ? 17 : 10;
        const p = isMaj ? major : minor;
        p.moveTo(x, y);
        p.lineTo(x + len, y);
        if (!isMaj) {
          p.moveTo(x - 3, y);
          p.lineTo(x - 7, y);
        }
      }
    }
    strokePath(ctx, minor, WHITE, 0.45, 1);
    strokePath(ctx, major, WHITE, 0.7, 1.5);
    L.bracket(ctx, x, y0, x, y1, { style: 'square', offset: -34, cap: 14, alpha: 0.45, p: prog });
    // leaders and nodes
    for (let i = 0; i < 5; i++) {
      const pr = progs[i];
      const a = i < 4 ? low : top;
      if (a <= 0.01) continue;
      const H = horiz(i), y = SPECS[i].y;
      // ghost node ring from frame 0
      const gn = new Path2D();
      gn.arc(x, y, 7, 0, TAU);
      strokePath(ctx, gn, LAV, 0.3 * a, 1);
      if (pr <= 0) continue;
      const xe = lerp(x + 20, H.x0 - 18, pr);
      const ld = new Path2D();
      ld.moveTo(x + 20, y);
      ld.lineTo(xe, y);
      strokePath(ctx, ld, LAV, 0.3 * a, 1, [3, 6]);
      const nd = new Path2D();
      nd.arc(x, y, 7, 0, TAU);
      strokePath(ctx, nd, WHITE, 0.75 * a, 1.5);
      ctx.save();
      ctx.globalAlpha *= a;
      ctx.fillStyle = WHITE;
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, TAU);
      ctx.fill();
      ctx.restore();
      // dimension bracket under the body
      const yb = y + SPECS[i].h / 2 + SPECS[i].h * 0.2 + 16;
      L.bracket(ctx, H.x0, yb, H.x1, yb, { style: 'dim', cap: 10, alpha: 0.45 * a, p: pr, width: 1.2 });
    }
  }

  function drawRuler(ctx, t, progs, low) {
    const y = 1610, xa = 230, xb = 850;
    const prog = guideProg(t);
    const xe = lerp(540, xb, prog), xs = lerp(540, xa, prog);
    const base = new Path2D();
    base.moveTo(xs, y);
    base.lineTo(xe, y);
    const mn = new Path2D(), mj = new Path2D();
    for (let x = 240; x <= 840; x += 10) {
      if (x < xs || x > xe) continue;
      const major = (x - 240) % 100 === 0;
      const mid = (x - 240) % 50 === 0;
      const p = major ? mj : mn;
      p.moveTo(x, y);
      p.lineTo(x, y + (major ? 22 : mid ? 14 : 7));
    }
    strokePath(ctx, base, LAV, 0.5, 1.2);
    strokePath(ctx, mn, LAV, 0.35, 1);
    strokePath(ctx, mj, WHITE, 0.55, 1.4);
    // projections of each instar's tail and head onto the ruler
    const pr = new Path2D(), mk = new Path2D();
    for (let i = 0; i < 5; i++) {
      if (progs[i] <= 0) continue;
      const H = horiz(i);
      for (const x of [H.x0, H.x1]) {
        pr.moveTo(x, y - 8);
        pr.lineTo(x, lerp(y - 8, SPECS[i].y + SPECS[i].h, progs[i]));
        mk.moveTo(x, y - 3);
        mk.lineTo(x - 5, y - 12);
        mk.lineTo(x + 5, y - 12);
        mk.closePath();
      }
    }
    strokePath(ctx, pr, LAV, 0.07 * low, 1, [2, 6]);
    ctx.save();
    ctx.globalAlpha *= 0.6 * low;
    ctx.fillStyle = LAV;
    ctx.fill(mk);
    ctx.restore();
  }

  // segmented bar glyph: body mass per instar on a log scale, one bar per instar as it draws on
  const BAR_H = [18, 60, 98, 136, 176];
  function drawBars(ctx, progs, low) {
    const x0 = 176, yb = 1168, bw = 16, gap = 10, cell = 8, cg = 3;
    const cells = new Path2D(), lit = new Path2D(), base = new Path2D(), ghost = new Path2D();
    base.moveTo(x0 - 12, yb + 6);
    base.lineTo(x0 + 5 * (bw + gap) + 2, yb + 6);
    for (let i = 0; i < 5; i++) {
      const x = x0 + i * (bw + gap);
      ghost.rect(x, yb - BAR_H[i], bw, BAR_H[i]);
      const pr = progs[i];
      if (pr <= 0) continue;
      const hgt = BAR_H[i] * L.ease.outBack(pr);
      const target = i === 4 ? lit : cells;
      for (let y = 0; y + cell <= hgt + 0.5; y += cell + cg) target.rect(x, yb - y - cell, bw, cell);
      base.moveTo(x + bw / 2, yb + 6);
      base.lineTo(x + bw / 2, yb + 13);
    }
    strokePath(ctx, ghost, LAV, 0.14 * low, 1, [2, 4]);
    strokePath(ctx, base, LAV, 0.55 * low, 1.2);
    strokePath(ctx, cells, LAV, 0.6 * low, 1);
    ctx.save();
    ctx.globalAlpha *= 0.14 * low;
    ctx.fillStyle = LAV;
    ctx.fill(cells);
    ctx.globalAlpha = 0.3 * low;
    ctx.fillStyle = WHITE;
    ctx.fill(lit);
    ctx.restore();
    strokePath(ctx, lit, WHITE, 0.85 * low, 1.2);
    // growth curve through the bar tops, drawing on with the ladder, arrowhead at the last bar
    const tops = [];
    for (let i = 0; i < 5; i++) if (progs[i] > 0) tops.push([x0 + i * (bw + gap) + bw / 2, yb - BAR_H[i] * L.ease.outBack(progs[i]) - 16]);
    if (tops.length >= 2) {
      const sm = L.smoothPts(tops, false, 4);
      const c = new Path2D();
      sm.forEach((m, k) => (k ? c.lineTo(m[0], m[1]) : c.moveTo(m[0], m[1])));
      strokePath(ctx, c, LAV, 0.5 * low, 1.3, [4, 5]);
      const a = sm[sm.length - 1], b = sm[Math.max(0, sm.length - 4)];
      const ang = Math.atan2(a[1] - b[1], a[0] - b[0]);
      const ah = new Path2D();
      ah.moveTo(a[0] - Math.cos(ang - 0.45) * 10, a[1] - Math.sin(ang - 0.45) * 10);
      ah.lineTo(a[0], a[1]);
      ah.lineTo(a[0] - Math.cos(ang + 0.45) * 10, a[1] - Math.sin(ang + 0.45) * 10);
      strokePath(ctx, ah, WHITE, 0.7 * low, 1.5);
    }
  }

  // ---------------------------------------------------------------------------
  // Milkweed leaf outline (schemGreen) at (840, 1460), 120 px: a broad oval, widest just below the middle,
  // a blunt tip with a small point, a rounded base on a short petiole. Flow lines leave its margin.
  // ---------------------------------------------------------------------------
  const LEAF = { x: 840, y: 1460, len: 120, rot: -0.62, shift: 6 };
  function leafHalf(s) {
    if (s <= -0.1) {
      const d = (s + 0.1) / 0.9;
      return 34 * Math.pow(Math.max(0, 1 - d * d), 0.55);
    }
    const d = (s + 0.1) / 1.1;
    return 34 * Math.pow(Math.max(0, 1 - Math.pow(d, 2.4)), 0.5);
  }
  // local (along, across) to frame
  function leafXY(al, ac) {
    const c = Math.cos(LEAF.rot), sn = Math.sin(LEAF.rot);
    const lx = al + LEAF.shift;
    return [LEAF.x + lx * c - ac * sn, LEAF.y + lx * sn + ac * c];
  }
  function leafPt(s, side) {
    return leafXY(s * LEAF.len * 0.5, side * leafHalf(s));
  }
  function leafOutline() {
    const pts = [];
    for (let k = 0; k <= 30; k++) pts.push(leafPt(-1 + (k / 30) * 2, 1));
    pts.push(leafXY(LEAF.len * 0.5 + 4, 0));
    for (let k = 30; k >= 1; k--) pts.push(leafPt(-1 + (k / 30) * 2, -1));
    return pts;
  }
  const LEAF_VEINS = [-0.66, -0.4, -0.14, 0.12, 0.38];

  function drawLeaf(ctx, prog, flashes) {
    if (prog <= 0) return;
    const pts = leafOutline();
    const seed = L.hash(ID, 'leaf');
    const style = { width: 2, color: GREEN, alpha: 0.9, seed, wobble: 0.5, tremble: 0.1, widthJitter: 0.1, rough: 0.1 };
    if (prog < 1) L.inkPath(ctx, pts.slice(0, Math.max(2, Math.floor(pts.length * prog))), Object.assign({ taper: [3, 8] }, style));
    else L.inkPath(ctx, pts, Object.assign({ closed: true, taper: [6, 10] }, style));
    const half = LEAF.len * 0.5;
    // petiole stub and midrib
    const mid = new Path2D();
    const p0 = leafXY(-half - 16, 0), p1 = leafXY(half + 1, 0);
    mid.moveTo(p0[0], p0[1]);
    mid.lineTo(p1[0], p1[1]);
    const pet = new Path2D();
    for (const sd of [-1.6, 1.6]) {
      const a = leafXY(-half - 16, sd * 0.8), b = leafXY(-half + 2, sd);
      pet.moveTo(a[0], a[1]);
      pet.lineTo(b[0], b[1]);
    }
    strokePath(ctx, mid, GREEN, 0.85 * prog, 1.5);
    strokePath(ctx, pet, GREEN, 0.6 * prog, 1);
    // five pairs of side veins curving toward the tip, looping 5 px inside the margin
    const v = new Path2D();
    for (const s0 of LEAF_VEINS) {
      for (const side of [-1, 1]) {
        const al0 = s0 * half;
        const s1 = s0 + 0.34, s2 = s0 + 0.56;
        const e1 = [s1 * half, side * Math.max(2, leafHalf(s1) - 5)];
        const c1 = [al0 + 8, side * leafHalf(s0 + 0.12) * 0.55];
        const e2 = [Math.min(half - 4, s2 * half), side * Math.max(1, leafHalf(Math.min(0.93, s2)) - 5)];
        const c2 = [(e1[0] + e2[0]) / 2 + 2, side * (Math.max(e1[1] * side, e2[1] * side) + 1.5)];
        const A = leafXY(al0, 0), C1 = leafXY(c1[0], c1[1]), E1 = leafXY(e1[0], e1[1]), C2 = leafXY(c2[0], c2[1]), E2 = leafXY(e2[0], e2[1]);
        v.moveTo(A[0], A[1]);
        v.quadraticCurveTo(C1[0], C1[1], E1[0], E1[1]);
        v.quadraticCurveTo(C2[0], C2[1], E2[0], E2[1]);
      }
    }
    strokePath(ctx, v, GREEN, 0.55 * prog, 1.1);
    L.guideCircle(ctx, LEAF.x, LEAF.y, 76, { p: prog, alpha: 0.4, width: 1.5 });
    L.ticks(ctx, LEAF.x, LEAF.y, { r: 76, n: 36, len: 6, major: 9, majorLen: 12, color: LAV, alpha: 0.35 * prog, width: 1 });
    L.stipple(ctx, pts, { spacing: 6, density: 0.3 * prog, color: GREEN, alpha: 0.4, r: [0.8, 1.3], seed: L.hash(ID, 'leaf-dots') });
    // departure glows on the margin
    if (flashes) {
      for (let k = 0; k < 4; k++) {
        const m = flowStart(k);
        L.glowDot(ctx, m[0], m[1], 3, { rays: 0, glow: 4, color: GREEN, intensity: (0.45 + 0.9 * flashes[k]) * prog, seed: 60 + k });
      }
    }
  }

  // flow line k: from a point on the leaf margin (the side facing the ladder) to the 5th instar's belly
  const FLOW_U = [0.27, 0.42, 0.56, 0.71];
  const FLOW_S = [-0.58, -0.3, -0.02, 0.26];
  const flowStart = (k) => leafPt(FLOW_S[k], -1);
  function flowCurve(q, k) {
    const s = flowStart(k);
    const F = frameAt(q, remapU(q, FLOW_U[k]));
    const w = F.w + 6;
    const e = [F.x + F.nx * w * q.vsc, F.y + F.ny * w * q.vsc];
    const c = [lerp(s[0], e[0], 0.35) + 150 - k * 20, lerp(s[1], e[1], 0.55) + 40];
    return [s, c, e];
  }
  const flowU = (tw, d, k) => (tw * 1.25 + d / 3 + k * 0.17) % 1;

  function flowFlashes(t) {
    if (t < 0.5) return null;
    const tw = L.onTwos(t - 0.5);
    const out = [];
    for (let k = 0; k < 4; k++) {
      let f = 0;
      for (let d = 0; d < 3; d++) f = Math.max(f, clamp(1 - flowU(tw, d, k) / 0.12));
      out.push(f);
    }
    return out;
  }

  function drawFlows(ctx, q, t, alpha) {
    const prog = L.seg(t, 0.375, 0.5, 'outQuad');
    if (prog <= 0 || alpha <= 0.01) return;
    const p = new Path2D();
    const curves = [];
    for (let k = 0; k < 4; k++) {
      const [A, B, C] = flowCurve(q, k);
      curves.push([A, B, C]);
      for (let s = 0; s <= 40; s++) {
        const m = qb(A, B, C, (s / 40) * prog);
        if (s === 0) p.moveTo(m[0], m[1]);
        else p.lineTo(m[0], m[1]);
      }
    }
    strokePath(ctx, p, LAV, 0.5 * alpha, 1.5, [2, 7]);
    if (t < 0.5) return;
    const tw = L.onTwos(t - 0.5);
    for (let k = 0; k < 4; k++) {
      const [A, B, C] = curves[k];
      for (let d = 0; d < 3; d++) {
        const u = flowU(tw, d, k);
        let m, a = alpha;
        if (u < 0.8) m = qb(A, B, C, u / 0.8);
        else {
          // inside the body: run to an atom of the glyph and fade
          const v = (u - 0.8) / 0.2;
          const g = glyphPoint(q, GLYPH.verts[[2, 8, 14, 20][k]]);
          m = [lerp(C[0], g[0], v), lerp(C[1], g[1], v)];
          a *= 1 - v * v;
        }
        L.glowDot(ctx, m[0], m[1], 3, { rays: 0, glow: 4, color: GREEN, intensity: a * 0.9, seed: k * 7 + d });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Cardenolide glyph: steroid rings A-B-C angular like phenanthrene, the D pentagon fused on C,
  // the butenolide (lactone) ring on C17 with its carbonyl, methyls on C10 and C13, a sugar oxygen on C3.
  // Built once in local units centred on (0, 0), fitted inside 170 x 90 px.
  // ---------------------------------------------------------------------------
  const GLYPH = (() => {
    const s = 20;
    const hw = (Math.sqrt(3) * s) / 2;
    const hex = (cx, cy) => {
      const r = [];
      for (let k = 0; k < 6; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 3;
        r.push([cx + Math.cos(a) * s, cy + Math.sin(a) * s]);
      }
      return r;
    };
    const A = hex(0, 0), B = hex(2 * hw, 0), C = hex(3 * hw, -1.5 * s);
    const xe = 4 * hw, yc = -1.5 * s;
    const pr = s / (2 * Math.sin(Math.PI / 5));
    const apo = s / (2 * Math.tan(Math.PI / 5));
    const pcx = xe + apo;
    const D = [];
    for (let k = 0; k < 5; k++) {
      const a = Math.PI - Math.PI / 5 + (k * TAU) / 5;
      D.push([pcx + Math.cos(a) * pr, yc + Math.sin(a) * pr]);
    }
    // butenolide on C17 (D[2]), bond up and to the right
    const c17 = D[2];
    const da = -0.42;
    const dx = Math.cos(da), dy = Math.sin(da);
    const bondEnd = [c17[0] + dx * s * 0.5, c17[1] + dy * s * 0.5];
    const ls = s * 0.74;
    const lr = ls / (2 * Math.sin(Math.PI / 5));
    const lcx = bondEnd[0] + dx * lr, lcy = bondEnd[1] + dy * lr;
    const lac = [];
    for (let k = 0; k < 5; k++) {
      const a = da + Math.PI + (k * TAU) / 5;
      lac.push([lcx + Math.cos(a) * lr, lcy + Math.sin(a) * lr]);
    }
    // carbonyl on lac[2], ring oxygen lac[3]... double bond lac[4]-lac[0]
    const odir = [(lac[2][0] - lcx) / lr, (lac[2][1] - lcy) / lr];
    const oEnd = [lac[2][0] + odir[0] * 13, lac[2][1] + odir[1] * 13];
    const oCentre = [oEnd[0] + odir[0] * 5, oEnd[1] + odir[1] * 5];
    const dbl = [lerp(lac[4][0], lcx, 0.3), lerp(lac[4][1], lcy, 0.3), lerp(lac[0][0], lcx, 0.3), lerp(lac[0][1], lcy, 0.3)];
    const methyl = [[A[1], [A[1][0], A[1][1] - 13]], [D[1], [D[1][0], D[1][1] - 13]]];
    const sugar = [A[4], [A[4][0] - 11, A[4][1] + 6.5]];
    const sugarO = [A[4][0] - 15.5, A[4][1] + 9];
    const rings = [A, B, C, D, lac];
    // centre on the bounding box and fit
    const all = [];
    for (const r of rings) for (const v of r) all.push(v);
    all.push(methyl[0][1], methyl[1][1], [oCentre[0] + 5, oCentre[1]], [oCentre[0], oCentre[1] - 5], [sugarO[0] - 4, sugarO[1] + 4]);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of all) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
    const k = Math.min(1, 170 / (x1 - x0), 90 / (y1 - y0));
    const ox = (x0 + x1) / 2, oy = (y0 + y1) / 2;
    const T = (v) => [(v[0] - ox) * k, (v[1] - oy) * k];
    const R = rings.map((r) => r.map(T));
    const verts = [];
    for (const r of R) for (const v of r) verts.push(v);
    const d0 = T([dbl[0], dbl[1]]), d1 = T([dbl[2], dbl[3]]);
    return {
      rings: R,
      lactone: R[4],
      verts,
      bond: [T(c17), T(bondEnd)],
      dbl: [d0, d1],
      carbonyl: [T(lac[2]), T(oEnd), odir],
      oCentre: T(oCentre),
      methyl: methyl.map(([a, b]) => [T(a), T(b)]),
      sugar: [T(sugar[0]), T(sugar[1])],
      sugarO: T(sugarO),
      scale: k,
      w: (x1 - x0) * k,
      h: (y1 - y0) * k,
    };
  })();

  const GLYPH_U = (470 - horiz(4).tail[0]) / (horiz(4).segLen * N);
  // lactone ring centroid, and the centre of the ring plus its carbonyl oxygen (for the 2x toxin node)
  const LAC_C = [GLYPH.lactone.reduce((s, v) => s + v[0], 0) / 5, GLYPH.lactone.reduce((s, v) => s + v[1], 0) / 5];
  const LAC_BOX = (() => {
    const pts = GLYPH.lactone.concat([[GLYPH.oCentre[0] + 5, GLYPH.oCentre[1] + 5], [GLYPH.oCentre[0] - 5, GLYPH.oCentre[1] - 5]]);
    const xs = pts.map((v) => v[0]), ys = pts.map((v) => v[1]);
    return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  })();
  function glyphFrame(q) {
    return frameAt(q, remapU(q, GLYPH_U));
  }
  function glyphPoint(q, v) {
    const F = glyphFrame(q);
    return [F.x + v[0] * F.tx - v[1] * F.ty, F.y + v[0] * F.ty + v[1] * F.tx];
  }

  function drawGlyph(ctx, q, t, alpha) {
    if (t < 0.5) return;
    const F = glyphFrame(q);
    const gx = F.x, gy = F.y;
    const rot = Math.atan2(F.ty, F.tx);
    const fl = (t - 0.5) * 24; // frames since the flash
    const flash = clamp(1 - fl / 12);
    const hot = fl < 12;
    const c = Math.cos(rot), s = Math.sin(rot);
    const bi = L.boil(L.T);
    const tr = (v) => {
      const jx = (L.h3(Math.round(v[0] * 4), Math.round(v[1] * 4), bi) - 0.5) * 0.8;
      const jy = (L.h3(Math.round(v[1] * 4), Math.round(v[0] * 4), bi + 1) - 0.5) * 0.8;
      return [gx + v[0] * c - v[1] * s + jx, gy + v[0] * s + v[1] * c + jy];
    };
    const seg = (p, a, b) => {
      const A = tr(a), B = tr(b);
      p.moveTo(A[0], A[1]);
      p.lineTo(B[0], B[1]);
    };
    const p = new Path2D();
    const lacP = new Path2D();
    GLYPH.rings.forEach((ring, ri) => {
      for (let k = 0; k < ring.length; k++) seg(ri === 4 ? lacP : p, ring[k], ring[(k + 1) % ring.length]);
    });
    seg(p, GLYPH.bond[0], GLYPH.bond[1]);
    seg(lacP, GLYPH.dbl[0], GLYPH.dbl[1]);
    const [ob, oe, od] = GLYPH.carbonyl;
    for (const off of [-2.3, 2.3]) seg(lacP, [ob[0] - od[1] * off, ob[1] + od[0] * off], [oe[0] - od[1] * off, oe[1] + od[0] * off]);
    for (const [m0, m1] of GLYPH.methyl) seg(p, m0, m1);
    seg(p, GLYPH.sugar[0], GLYPH.sugar[1]);
    const ring = new Path2D();
    const oc = tr(GLYPH.oCentre);
    ring.moveTo(oc[0] + 5, oc[1]);
    ring.arc(oc[0], oc[1], 5, 0, TAU);
    const so = tr(GLYPH.sugarO);
    ring.moveTo(so[0] + 4, so[1]);
    ring.arc(so[0], so[1], 4, 0, TAU);
    const col = hot ? MAG : MAG_FADE;
    const a = hot ? alpha : alpha * 0.75;
    const lw = hot ? (fl < 2 ? 3.5 : 2.6) : 2;
    // knock the stipple back under the bonds so the glyph reads over the bands
    strokePath(ctx, p, P.navy, 0.78 * alpha, lw + 5);
    strokePath(ctx, lacP, P.navy, 0.78 * alpha, lw + 5);
    strokePath(ctx, ring, P.navy, 0.78 * alpha, 6);
    // glow: the whole glyph during the flash, then only a faint hum on the lactone ring (the stored toxin)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (flash > 0) {
      strokePath(ctx, p, MAG, 0.35 * flash * alpha, 9);
      strokePath(ctx, lacP, MAG, 0.35 * flash * alpha, 9);
    } else strokePath(ctx, lacP, MAG, 0.12 * alpha, 9);
    ctx.restore();
    strokePath(ctx, p, col, a, lw);
    strokePath(ctx, lacP, col, a, lw);
    strokePath(ctx, ring, col, a, hot ? 2 : 1.6);
    if (fl < 2) {
      strokePath(ctx, p, WHITE, alpha * 0.9, 1.2);
      strokePath(ctx, lacP, WHITE, alpha * 0.9, 1.2);
    }
    // atom dots
    const dots = new Path2D();
    const dr = hot ? 2.4 : 1.6;
    for (const v of GLYPH.verts) {
      const m = tr(v);
      dots.moveTo(m[0] + dr, m[1]);
      dots.arc(m[0], m[1], dr, 0, TAU);
    }
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = col;
    ctx.fill(dots);
    ctx.restore();
    // radial tick burst and a change ring, within 12 frames
    if (hot) {
      const ee = L.ease.outExpo(fl / 8);
      L.ticks(ctx, gx, gy, { r: lerp(70, 130, ee), n: 16, len: lerp(22, 12, ee), color: MAG, alpha: 0.9 * (1 - fl / 12) * alpha, width: 2.5, rot: 0.1 });
      const rr = new Path2D();
      rr.arc(gx, gy, lerp(40, 170, L.ease.outExpo(fl / 6)), 0, TAU);
      strokePath(ctx, rr, MAG, clamp(1 - fl / 10) * alpha, 3);
    }
  }

  // ---------------------------------------------------------------------------
  // Wing imaginal discs in T2 and T3, just behind the head: (775, 640) and (745, 650) on the ladder.
  // Each is a folded wing bud tilted back toward the tail, with nested pleats and a tracheal stalk
  // to the nearest spiracle.
  // ---------------------------------------------------------------------------
  const DISCS = [
    { x: 775, dy: 0, spir: SEG.T1, n: 0 },
    { x: 745, dy: 10, spir: SEG.A1, n: 1 },
  ];
  const DISC_TILT = 0.66; // 38 degrees off the body normal
  function drawDiscs(ctx, q, t, alpha) {
    if (t < 0.75) return;
    const H = horiz(4);
    const Lb = H.segLen * N;
    const fr = (t - 0.75) * 24;
    const grow = L.ease.outBack(clamp((fr + 1) / 3));
    const pleats = 3 + Math.min(3, Math.floor(fr / 2));
    const bi = L.boil(L.T);
    const vs = q.vs;
    const ignite = fr < 4;
    for (const D of DISCS) {
      // the hindwing disc (T3) is the smaller bud
      const size = lerp(30, D.n ? 56 : 70, grow);
      const F = frameAt(q, remapU(q, (D.x - H.tail[0]) / Lb));
      const lat = D.dy * vs;
      const cx = F.x + F.nx * lat, cy = F.y + F.ny * lat;
      // long axis: from the dorsal end forward to the ventral end back toward the tail
      const ct = Math.cos(DISC_TILT), st = Math.sin(DISC_TILT);
      const ax = F.nx * vs * ct - F.tx * st, ay = F.ny * vs * ct - F.ty * st;
      const px = -ay, py = ax;
      const La = size / 2, Wb = size * 0.15;
      const at = (a, b) => [cx + ax * a + px * b, cy + ay * a + py * b];
      const s0 = at(-La, 0), s1 = at(La, 0);
      const lens = new Path2D();
      const cA = at(0, Wb * 2), cB = at(0, -Wb * 2);
      lens.moveTo(s0[0], s0[1]);
      lens.quadraticCurveTo(cA[0], cA[1], s1[0], s1[1]);
      lens.quadraticCurveTo(cB[0], cB[1], s0[0], s0[1]);
      // nested pleats parallel to the +p edge, like a folded bud
      const pl = new Path2D();
      const arcs = [];
      for (let j = 1; j <= pleats; j++) {
        const k = j / (pleats + 1);
        const shrink = 0.94 - 0.05 * j;
        const wob = (L.h3(j, bi, D.n) - 0.5) * 1.1;
        const e0 = at(-La * shrink, -Wb * 0.25 * k), e1 = at(La * shrink, -Wb * 0.25 * k + wob * 0.3);
        const cc = at(wob, Wb * 2 * (1 - 1.45 * k));
        arcs.push([e0, cc, e1]);
        pl.moveTo(e0[0], e0[1]);
        pl.quadraticCurveTo(cc[0], cc[1], e1[0], e1[1]);
      }
      // tracheal stalk from the ventral end to the nearest spiracle
      const Fs = frameAt(q, segMid(q.segb, D.spir));
      const sp = [Fs.x + Fs.nx * q.vsc * Fs.w * 0.42, Fs.y + Fs.ny * q.vsc * Fs.w * 0.42];
      const mid = [(s1[0] + sp[0]) / 2 + px * 6, (s1[1] + sp[1]) / 2 + py * 6];
      const stalk = new Path2D();
      stalk.moveTo(s1[0], s1[1]);
      stalk.quadraticCurveTo(mid[0], mid[1], sp[0], sp[1]);
      const sa = alpha * clamp((fr + 1) / 2);
      strokePath(ctx, stalk, P.navy, 0.6 * sa, 3.5);
      strokePath(ctx, stalk, WHITE, 0.45 * sa, 1);
      // a dark panel inside the bud so its pleats read over the band stipple
      ctx.save();
      ctx.globalAlpha *= 0.82 * alpha;
      ctx.fillStyle = P.navy;
      ctx.fill(lens);
      ctx.restore();
      if (ignite) {
        // the ignite sits on the bud, not on two centred points: the glow core at the ventral tip where the
        // tracheal stalk leaves, a half-fan of 8 ticks pointing back toward the tail, and the lens edge glowing
        L.glowDot(ctx, s1[0], s1[1], 5, { rays: 0, glow: 5, intensity: alpha * 0.85, seed: 40 + D.n });
        const back = Math.atan2(-F.ty, -F.tx);
        const fan = Math.PI * 0.8;
        L.ticks(ctx, s1[0], s1[1], { r: 8, n: 8, len: 14, major: 2, majorLen: 22, color: WHITE, alpha: 0.7 * alpha, width: 1.5, start: back - fan / 2, span: fan });
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        strokePath(ctx, lens, WHITE, 0.35 * alpha, 4);
        ctx.restore();
      }
      strokePath(ctx, lens, WHITE, 0.9 * alpha, 1.5);
      strokePath(ctx, pl, WHITE, 0.62 * alpha, 1.1);
      if (!ignite) {
        const r = L.rng(L.hash(ID, 'disc-glow', D.n));
        const cnt = 6 + D.n;
        for (let g = 0; g < cnt; g++) {
          const arc = arcs[Math.floor(r() * arcs.length)];
          const m = qb(arc[0], arc[1], arc[2], 0.18 + r() * 0.64);
          L.glowDot(ctx, m[0], m[1], 1.5 + r(), { rays: 0, glow: 4, intensity: alpha * 0.85, seed: 90 + g * 3 + D.n });
        }
      }
      if (fr < 6) {
        // the change pulse is a lens-shaped echo of the bud, swelling off it, never a circle round a point
        const k = lerp(1.15, 1.9, L.ease.outExpo(fr / 5));
        const ek = (a, b) => at(a * k, b * (0.6 + 0.4 * k));
        const e0 = ek(-La, 0), e1 = ek(La, 0), eA = ek(0, Wb * 2), eB = ek(0, -Wb * 2);
        const echo = new Path2D();
        echo.moveTo(e0[0], e0[1]);
        echo.quadraticCurveTo(eA[0], eA[1], e1[0], e1[1]);
        echo.quadraticCurveTo(eB[0], eB[1], e0[0], e0[1]);
        strokePath(ctx, echo, WHITE, clamp(1 - fr / 6) * alpha * 0.55, 1.5);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Network node for the wing discs: a thin curved lavender line from the T2 disc to a small circular
  // node glyph holding the adult wing the disc will become (art bible 5: relationships as a network)
  // ---------------------------------------------------------------------------
  const NODE = { x: 668, y: 410, r: 50 };
  const FW = [[-30, 8], [-12, -10], [10, -22], [34, -27], [31, -14], [24, -2], [18, 6], [-6, 8]];
  const HW = [[-26, 12], [-2, 9], [18, 13], [22, 22], [10, 34], [-8, 36], [-22, 26]];
  const VEINS = [[[-30, 8], [22, -22]], [[-30, 8], [30, -12]], [[-30, 8], [22, 2]], [[-26, 12], [18, 20]], [[-26, 12], [6, 32]], [[-26, 12], [-10, 34]]];
  // node shell: a dashed curved link from a0 to the rim, the ring drawing on from where the link lands,
  // an inner dashed ring and a tick crown. bend offsets the curve's control point from the chord middle;
  // aim re-aims the landing point at the control point so the link meets the ring square.
  function linkNode(ctx, a0, node, bend, aim, pc, alpha, seed, tickOut) {
    let ang = Math.atan2(a0[1] - node.y, a0[0] - node.x);
    let a1 = [node.x + Math.cos(ang) * (node.r + 4), node.y + Math.sin(ang) * (node.r + 4)];
    const cc = [lerp(a0[0], a1[0], 0.5) + bend[0], lerp(a0[1], a1[1], 0.5) + bend[1]];
    if (aim) {
      ang = Math.atan2(cc[1] - node.y, cc[0] - node.x);
      a1 = [node.x + Math.cos(ang) * (node.r + 4), node.y + Math.sin(ang) * (node.r + 4)];
    }
    const link = new Path2D();
    for (let k = 0; k <= 30; k++) {
      const m = qb(a0, cc, a1, (k / 30) * pc);
      if (k === 0) link.moveTo(m[0], m[1]);
      else link.lineTo(m[0], m[1]);
    }
    strokePath(ctx, link, LAV, 0.65 * alpha, 1.3, [5, 4]);
    L.glowDot(ctx, a0[0], a0[1], 2.2, { rays: 0, glow: 4, intensity: 0.8 * alpha, seed });
    L.guideCircle(ctx, node.x, node.y, node.r, { p: pc, alpha: 0.6 * alpha, width: 1.5, start: ang });
    L.guideCircle(ctx, node.x, node.y, node.r - 7, { p: pc, alpha: 0.22 * alpha, width: 1, dash: [2, 4] });
    if (tickOut === false) L.ticks(ctx, node.x, node.y, { r: node.r - 1, n: 24, len: 5, major: 6, majorLen: 9, inward: true, color: LAV, alpha: 0.4 * alpha, width: 1, p: pc });
    else L.ticks(ctx, node.x, node.y, { r: node.r + 3, n: 24, len: 5, major: 6, majorLen: 9, color: LAV, alpha: 0.4 * alpha, width: 1, p: pc });
  }

  // T2 wing-disc centre (DISCS[0]) at the current pose
  function discCentre(q) {
    const H = horiz(4);
    return frameAt(q, remapU(q, (DISCS[0].x - H.tail[0]) / (H.segLen * N)));
  }

  function drawWingNode(ctx, q, t, alpha) {
    if (t < 0.75 || alpha <= 0.01) return;
    const fr = (t - 0.75) * 24;
    const pc = L.ease.outExpo(clamp(fr / 6));
    const pw = L.ease.outExpo(clamp((fr - 2) / 6));
    const F = discCentre(q);
    const a0 = [F.x - F.nx * q.vs * 20, F.y - F.ny * q.vs * 20];
    linkNode(ctx, a0, NODE, [-58, 10], false, pc, alpha, 71);
    if (pw <= 0) return;
    wingIcon(ctx, NODE, pw, lerp(0.8, 1.1, L.ease.outBack(clamp((fr - 2) / 3))), alpha);
  }

  // once the J locks (9.333) the network returns around it: the wing node right of the J, fed from the T2 disc,
  // and a toxin node left of it, fed from the lactone ring, both clear of the silhouette and inside x 900
  const NODE_J = { x: 850, y: 620, r: 50 };
  const TOX_J = { x: 250, y: 620, r: 50 };
  function drawJNodes(ctx, q, t) {
    const fr = (t - (MORPH_T0 + MORPH_FR / 24)) * 24;
    if (fr < -1e-6) return;
    const k = clamp((fr + 1) / 3);
    const pc = L.ease.outExpo(k);
    // wing node: the link leaves the T2 disc and swings out below the head before rising to the node
    const F = discCentre(q);
    linkNode(ctx, [F.x, F.y], NODE_J, [95, 60], true, pc, 1, 72, false);
    wingIcon(ctx, NODE_J, pc, lerp(0.8, 1.1, L.ease.outBack(k)), 1);
    // toxin node: the lactone ring again at 2x, in the faded magenta, no flash
    const lc = glyphPoint(q, LAC_C);
    linkNode(ctx, lc, TOX_J, [0, -70], true, pc, 1, 73);
    const s = 2 * lerp(0.8, 1, L.ease.outBack(k));
    const tr = (v) => [TOX_J.x + (v[0] - LAC_BOX[0]) * s, TOX_J.y + (v[1] - LAC_BOX[1]) * s];
    const seg = (p, a, b) => {
      const A = tr(a), B = tr(b);
      p.moveTo(A[0], A[1]);
      p.lineTo(B[0], B[1]);
    };
    const lp = new Path2D();
    const lac = GLYPH.lactone;
    for (let j = 0; j < 5; j++) seg(lp, lac[j], lac[(j + 1) % 5]);
    seg(lp, GLYPH.dbl[0], GLYPH.dbl[1]);
    const [ob, oe, od] = GLYPH.carbonyl;
    for (const off of [-2.3, 2.3]) seg(lp, [ob[0] - (od[1] * off) / 2, ob[1] + (od[0] * off) / 2], [oe[0] - (od[1] * off) / 2, oe[1] + (od[0] * off) / 2]);
    const oc = tr(GLYPH.oCentre);
    lp.moveTo(oc[0] + 5 * s, oc[1]);
    lp.arc(oc[0], oc[1], 5 * s, 0, TAU);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    strokePath(ctx, lp, MAG, 0.1 * pc, 8);
    ctx.restore();
    strokePath(ctx, lp, MAG_FADE, 0.6 * pc, 2);
    const dots = new Path2D();
    for (const v of lac) {
      const m = tr(v);
      dots.moveTo(m[0] + 2.6, m[1]);
      dots.arc(m[0], m[1], 2.6, 0, TAU);
    }
    ctx.save();
    ctx.globalAlpha *= 0.6 * pc;
    ctx.fillStyle = MAG_FADE;
    ctx.fill(dots);
    ctx.restore();
  }

  function wingIcon(ctx, node, pw, sc, alpha) {
    const tr = (v) => [node.x - 2 + v[0] * sc, node.y + 1 + v[1] * sc];
    const bi = L.boil(L.T);
    const shape = (pts) => pts.map(tr);
    L.inkPath(ctx, shape(FW), { closed: true, width: 1.4, color: WHITE, alpha: 0.85 * alpha * pw, seed: L.hash(ID, 'fw'), wobble: 0.4, tremble: 0.1, rough: 0.08, widthJitter: 0.1, taper: [3, 6] });
    L.inkPath(ctx, shape(HW), { closed: true, width: 1.4, color: WHITE, alpha: 0.85 * alpha * pw, seed: L.hash(ID, 'hw'), wobble: 0.4, tremble: 0.1, rough: 0.08, widthJitter: 0.1, taper: [3, 6] });
    const vp = new Path2D();
    for (const [u, v] of VEINS) {
      const A = tr(u), B = tr(lerp2(u, v, pw));
      vp.moveTo(A[0], A[1]);
      vp.lineTo(B[0], B[1]);
    }
    strokePath(ctx, vp, LAV, 0.6 * alpha, 1);
    // a row of white margin spots on the forewing and a few glowing cells
    for (let k = 0; k < 4; k++) {
      const m = tr([lerp(31, 19, k / 3) - 3, lerp(-15, 4, k / 3)]);
      L.glowDot(ctx, m[0], m[1], 1.3, { rays: 0, glow: 3, intensity: 0.7 * alpha * pw, seed: 80 + k + bi % 2 });
    }
  }
  const lerp2 = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];

  // ---------------------------------------------------------------------------
  // Cycle glyph at (900, 300), larva arc lit
  // ---------------------------------------------------------------------------
  function drawCycle(ctx) {
    const cx = 900, cy = 300, r = 44, gap = 0.16;
    for (let s = 0; s < 4; s++) {
      const a0 = -Math.PI / 2 + (s * Math.PI) / 2 + gap / 2;
      const p = new Path2D();
      p.arc(cx, cy, r, a0, a0 + Math.PI / 2 - gap);
      if (s === 1) strokePath(ctx, p, WHITE, 1, 3);
      else strokePath(ctx, p, LAV, 0.25, 2);
    }
    const tk = new Path2D();
    for (let s = 0; s < 4; s++) {
      const a = -Math.PI / 2 + (s * Math.PI) / 2;
      tk.moveTo(cx + Math.cos(a) * (r + 5), cy + Math.sin(a) * (r + 5));
      tk.lineTo(cx + Math.cos(a) * (r + 13), cy + Math.sin(a) * (r + 13));
    }
    strokePath(ctx, tk, LAV, 0.45, 1.5);
    L.guideCircle(ctx, cx, cy, 30, { alpha: 0.14, width: 1, dash: [2, 5] });
    L.glowDot(ctx, cx + Math.cos(Math.PI / 4) * r, cy + Math.sin(Math.PI / 4) * r, 3.2, { rays: 4, rayLen: 2.4, glow: 5, seed: 77 });
  }

  // ---------------------------------------------------------------------------
  // Silk pad at (540, 300) and the pre-echo of 06's plumb line and pendulum arc
  // ---------------------------------------------------------------------------
  function drawPad(ctx, t) {
    if (t < 1.0) return;
    const fr = (t - 1.0) * 24;
    const k = L.ease.outBack(clamp((fr + 1) / 3));
    const under = new Path2D();
    under.moveTo(540 - 240 * k, 300);
    under.lineTo(540 + 240 * k, 300);
    strokePath(ctx, under, LAV, 0.35, 1.5, [10, 7]);
    const r = L.rng(L.hash(ID, 'pad', L.boil(L.T)));
    const silk = new Path2D();
    for (let s = 0; s < 14; s++) {
      const x0 = 540 + r.range(-35, 35) * k, y0 = 300 + r.range(-2, 9) * k;
      const x1 = x0 + r.range(-18, 18) * k, y1 = 300 + r.range(0, 12) * k;
      silk.moveTo(x0, y0);
      silk.quadraticCurveTo((x0 + x1) / 2 + r.range(-6, 6), Math.max(y0, y1) + r.range(2, 8) * k, x1, y1);
    }
    strokePath(ctx, silk, WHITE, 0.6, 1);
    L.glowDot(ctx, 540, 300, 4 * k, { rays: 8, rayLen: 3, glow: 5, seed: 91 });
    // plumb line and pendulum arc draw on while the body swings; the target circle belongs to shot 06
    const pp = L.seg(t, 1.1, 1.4, 'outCubic');
    if (pp > 0) {
      const pl = new Path2D();
      pl.moveTo(540, 960);
      pl.lineTo(540, lerp(960, 1440, pp));
      strokePath(ctx, pl, LAV, 0.32, 1.2, [3, 7]);
      if (pp > 0.95) {
        const c = new Path2D();
        c.moveTo(532, 1440);
        c.lineTo(548, 1440);
        c.moveTo(540, 1432);
        c.lineTo(540, 1448);
        strokePath(ctx, c, LAV, 0.5, 1.2);
      }
      const arc = new Path2D();
      const a0 = Math.PI / 2 - 0.3, a1 = Math.PI / 2 + 0.3;
      arc.arc(540, 300, 1200, lerp(Math.PI / 2, a0, pp), lerp(Math.PI / 2, a1, pp));
      strokePath(ctx, arc, LAV, 0.16, 1.2, [2, 6]);
    }
  }

  // ---------------------------------------------------------------------------
  // Timing (local seconds): outlines draw on one per 16th from 0, fills and glyph on 0.5,
  // discs on 0.75, the J swing on 1.0 over 8 frames on twos, hold from 1.333.
  // ---------------------------------------------------------------------------
  const MORPH_T0 = 1.0, MORPH_FR = 8;
  // four in-between drawings on twos from the 9.0 beat (lift, swing, curl, snap), the J locks at 9.333
  const MORPH_E = [0.14, 0.44, 0.74, 0.95];

  function drawOnProg(t, i) {
    const t0 = i * 0.125;
    return L.ease.outQuad(clamp(((t - t0) * 24 + 1) / 3));
  }

  function drawCentreline(ctx, q, prog, alpha) {
    if (prog <= 0 || alpha <= 0.01) return;
    const p = new Path2D();
    const ext = 16 + q.h * 0.25;
    p.moveTo(q.X[0] - q.TX[0] * (q.bulge + ext), q.Y[0] - q.TY[0] * (q.bulge + ext));
    const kEnd = Math.round(N * prog);
    for (let k = 0; k <= kEnd; k++) p.lineTo(q.X[k], q.Y[k]);
    if (prog >= 1) {
      const hd = q.head;
      const dx = hd.x - q.X[N], dy = hd.y - q.Y[N];
      const dl = Math.hypot(dx, dy) || 1;
      p.lineTo(hd.x + (dx / dl) * (hd.rx + ext), hd.y + (dy / dl) * (hd.rx + ext));
    }
    strokePath(ctx, p, LAV, 0.3 * alpha, 1, [14, 4, 2, 4]);
  }

  // lattice clipped to the white and yellow bands, so the black bands stay pure stipple
  function bandClip(q) {
    const B = q.segb;
    const polys = [];
    let start = 0;
    for (let k = 0; k < 13; k++) {
      const du = B[k + 1] - B[k];
      const bs = B[k + 1] - BAND.blackB * du, be = B[k + 1] - BAND.blackA * du;
      if (bs > start) polys.push(strip(q, start, bs, 2));
      start = be;
    }
    if (start < 1) polys.push(strip(q, start, 1, 2));
    return polys;
  }

  function drawBody(ctx, q, prog, fill, alpha, lattice, clAlpha, inner) {
    if (prog <= 0 || alpha <= 0.01) return;
    drawCentreline(ctx, q, prog, clAlpha == null ? alpha : clAlpha);
    if (prog >= 1) {
      // panel tint inside the body and a faint luminous halo on the outline
      const out = outline(q, 0);
      const path = new Path2D();
      L.tracePath(path, out, true);
      ctx.save();
      ctx.globalAlpha *= alpha * 0.72;
      ctx.fillStyle = NAVYL;
      ctx.fill(path);
      if (q.i >= 3) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = alpha * 0.07;
        ctx.strokeStyle = LAV;
        ctx.lineWidth = q.i === 4 ? 12 : 8;
        ctx.lineJoin = 'round';
        ctx.stroke(path);
      }
      ctx.restore();
    }
    if (lattice && fill > 0) {
      L.hexLattice(ctx, bandClip(q), { r: q.i === 4 ? 8 : 6, alpha: (q.i === 4 ? 0.26 : 0.14) * alpha * fill, width: 1, seed: L.hash(ID, 'lat', q.i), jitter: 0.8 });
    }
    if (fill > 0) drawDots(ctx, q, fill, alpha, prog >= 1 ? 2 : prog * 1.15);
    if (fill > 0 && q.i === 4 && q.wJ > 0) {
      // the prothoracic collar between the last ring and the head capsule is dense (black) too
      const cap = capJ(q, 0, q.W[N]);
      const poly = [[q.X[N] + q.NX[N] * q.W[N], q.Y[N] + q.NY[N] * q.W[N]]].concat(cap);
      L.stipple(ctx, poly, { spacing: 3.4, density: 0.95 * fill * q.wJ, r: [1.3, 2.1], color: LAV, alpha: 0.84 * alpha, jitter: 0.35, seed: L.hash(ID, 'collar') });
    }
    drawRings(ctx, q, prog, alpha);
    if (prog >= 1) drawLimbs(ctx, q, alpha);
    drawOutline(ctx, q, prog, alpha);
    if (inner) inner();
    drawHead(ctx, q, clamp((prog - 0.5) * 2), alpha);
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = Math.min(Math.max(0, tIn), info.dur);
      L.blueprint(ctx, { center: [540, 1060], circles: 3, diagonals: 3, seed: 505 });

      const low = 1 - 0.8 * L.seg(t, MORPH_T0, MORPH_T0 + 6 / 24, 'outCubic');
      const di = Math.floor((L.onTwos(t) - MORPH_T0) * 12 + 1e-6);
      const e = t < MORPH_T0 ? 0 : di >= MORPH_E.length ? 1 : MORPH_E[di];
      const top = 1 - L.seg(t, MORPH_T0, MORPH_T0 + 4 / 24);
      const fill = clamp(((t - 0.5) * 24 + 1) / 3);
      const progs = [0, 1, 2, 3, 4].map((i) => drawOnProg(t, i));

      drawGuides(ctx, t, low);
      drawAxis(ctx, t, progs, low, top);
      drawRuler(ctx, t, progs, low);
      drawBars(ctx, progs, low);
      drawGhosts(ctx, low, top, 1 - fill);

      const q5 = pose(4, e);
      drawLeaf(ctx, L.ease.outQuad(clamp((t * 24 + 1) / 3)), top > 0.01 ? flowFlashes(t) : null);
      drawFlows(ctx, q5, t, top);

      for (let i = 0; i < 4; i++) {
        drawBody(ctx, pose(i, 0), progs[i], fill, low, i === 3);
      }
      drawBody(ctx, q5, progs[4], fill, 1, true, top, () => {
        drawGlyph(ctx, q5, t, 1);
        drawDiscs(ctx, q5, t, 1);
      });

      drawWingNode(ctx, q5, t, top);
      if (e >= 1) drawJNodes(ctx, q5, t);
      drawPad(ctx, t);
      const jb = L.seg(t, MORPH_T0 + MORPH_FR / 24, MORPH_T0 + MORPH_FR / 24 + 3 / 24, 'outQuad');
      if (jb > 0) L.bracket(ctx, 420, 300, 420, 940, { style: 'dim', cap: 14, alpha: 0.55, p: jb, width: 1.5 });
      drawCycle(ctx);
    },
  });
})();
