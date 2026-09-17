// 15 oyamel-winter: "Winter on the firs". T 28.0 to 29.5 (36 frames), illustrated, hard cut in and out.
// Night in an oyamel fir forest in the mountains of central Mexico. Three trunks at x 170, 560 and 910.
// The middle trunk is shingled with resting monarchs from y 700 to 1500, and dead-leaf clusters sag from
// branch ends at (330, 900), (760, 640) and (700, 1250). Five moons count the winter months on the 8ths.
// T 29.25: the sky flashes to dawn, the magenta heading arrow flips from south-west to north-east and
// 80 butterflies peel off in three waves and fly up and to the right, on twos. Each departure takes the
// wings it was lying on with it, so the column and the bunches open up onto bark and sky.
(function () {
  'use strict';

  const ID = 'oyamel-winter';
  const TAU = Math.PI * 2;
  const LAST = 35; // last frame index (36 frames)
  const BURST_F = 30; // T 29.25
  const BURST_D = BURST_F >> 1; // drawing index of the burst on twos

  const MOON_X = [220, 380, 540, 700, 860];
  const MOON_Y = 300;
  const MOON_R = 34;
  const MOON_F = [0, 6, 12, 18, 24]; // T 28.0, 28.25, 28.5, 28.75, 29.0
  const MOON_K = [0.22, 0.5, 1, 0.5, 0.22]; // lit fraction: crescent, half, full, half, crescent
  const MOON_SIDE = [1, 1, 1, -1, -1]; // lit limb: right while waxing, left while waning

  const TRUNKS = [
    { x: 170, w: 100 },
    { x: 560, w: 130 },
    { x: 910, w: 110 },
  ];
  const CLUSTERS = [
    { x: 330, y: 900, k: 1.0 },
    { x: 760, y: 640, k: 0.9 },
    { x: 700, y: 1250, k: 1.05, dx: 22 },
  ];
  const MIST_Y = [1050, 1480];
  const ARROW = { x: 820, y: 420, r: 66 };
  const RING = { x: 700, y: 1360, r: 168 }; // bottom at y 1528, inside the Shorts safe area
  const A105 = (-7 * Math.PI) / 12; // the art bible's 105 degree cross-hatch layer

  // drooping branches: control points from the trunk out to the tip. back = behind the trunks.
  const BRANCHES = [
    { pts: [[196, 470], [330, 468], [480, 492], [620, 548], [718, 604], [760, 640]], w0: 26, w1: 7, back: true, len: 92, needle: 17 },
    { pts: [[884, 698], [760, 708], [604, 740], [470, 792], [380, 846], [330, 900]], w0: 28, w1: 7, back: true, len: 96, needle: 17 },
    { pts: [[150, 640], [84, 668], [20, 712], [-60, 772]], w0: 24, w1: 12, back: true, len: 84, needle: 16 },
    { pts: [[930, 930], [1000, 952], [1062, 992], [1140, 1052]], w0: 24, w1: 12, back: true, len: 84, needle: 16 },
    { pts: [[190, 162], [290, 150], [400, 164], [470, 186]], w0: 18, w1: 6, back: true, len: 52, needle: 13, up: true },
    { pts: [[900, 150], [800, 140], [700, 152], [630, 176]], w0: 18, w1: 6, back: true, len: 52, needle: 13, up: true },
    { pts: [[880, 1086], [818, 1112], [752, 1168], [714, 1214], [700, 1250]], w0: 24, w1: 7, back: false, len: 84, needle: 16 },
    { pts: [[196, 1232], [284, 1262], [382, 1322], [468, 1398]], w0: 22, w1: 6, back: false, len: 84, needle: 16 },
    { pts: [[600, 1592], [706, 1622], [820, 1680], [902, 1742]], w0: 22, w1: 8, back: false, len: 92, needle: 17 },
    { pts: [[150, 1520], [64, 1560], [-50, 1626]], w0: 22, w1: 10, back: false, len: 90, needle: 17 },
    // near foreground boughs, dark against the sky, framing the bottom corners
    { pts: [[-60, 1700], [120, 1745], [300, 1820], [440, 1930]], w0: 30, w1: 12, fg: true, len: 150, needle: 30 },
    { pts: [[1140, 1600], [1000, 1660], [880, 1760], [800, 1900]], w0: 30, w1: 12, fg: true, len: 140, needle: 28 },
  ];

  // far fir silhouettes: x, top y, base y, base half-width
  // bases run below the next nearer layer so no silhouette ends in mid-air
  const FAR_A = [[40, 600, 1300, 130], [262, 560, 1300, 116], [405, 650, 1300, 104], [668, 540, 1300, 120], [790, 690, 1300, 100], [1040, 580, 1300, 130]];
  const FAR_B = [[70, 900, 1980, 196], [300, 960, 1980, 172], [438, 1010, 1980, 146], [672, 930, 1980, 184], [818, 1000, 1980, 160], [1020, 880, 1980, 196]];

  // ---------------------------------------------------------------------------
  // small helpers
  // ---------------------------------------------------------------------------
  function pathOf(pts, closed, p) {
    p = p || new Path2D();
    for (let i = 0; i < pts.length; i++) {
      if (i === 0) p.moveTo(pts[i][0], pts[i][1]);
      else p.lineTo(pts[i][0], pts[i][1]);
    }
    if (closed) p.closePath();
    return p;
  }
  function towardDown(a, k) {
    let d = Math.PI / 2 - a;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    return a + d * k;
  }
  function shuffle(r, arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function timing(t) {
    const f = Math.max(0, Math.min(LAST, Math.floor(Math.max(0, t) * 24 + 1e-6)));
    const d = f >> 1; // on twos
    return {
      f,
      tc: f / 24,
      d,
      tw: d / 12,
      bd: f >= BURST_F ? d - BURST_D : -1, // drawings since the burst
      dawn: f < BURST_F ? 0 : 1,
      flash: f === BURST_F ? 0.42 : f === BURST_F + 1 ? 0.14 : 0,
    };
  }

  // ---------------------------------------------------------------------------
  // colours (resolved once from the palette)
  // ---------------------------------------------------------------------------
  let C = null;
  function colours(L) {
    if (C) return C;
    const P = L.pal;
    C = {
      paper: P.paper,
      ink: P.ink,
      inkSoft: P.inkSoft,
      inkFaint: P.inkFaint,
      white: P.white,
      night: P.night,
      nightSky: P.nightSky,
      // multiplied over paper these land on nightSky; stripes() lays band B over band A, so B is stored as B/A
      nightA: '#53478B',
      nightB: '#D6D2DE',
      dawnA: '#FFFFFF',
      dawnB: '#FFF1E2',
      apricot: P.stripeApricot,
      bark: P.bark,
      barkLight: L.mix(P.bark, P.tan, 0.55),
      barkDeep: L.mix(P.bark, P.ink, 0.45),
      lichen: L.mix(P.sage, P.mist, 0.35),
      fir: P.fir,
      firLight: L.mix(P.fir, P.mist, 0.55),
      firShadow: L.mix(P.fir, P.night, 0.6),
      firDeep: L.mix(P.fir, P.ink, 0.5),
      mist: P.mist,
      mistLight: P.white,
      farA: L.mix(P.nightSky, P.mist, 0.17),
      farADawn: L.mix(P.duskRose, P.mist, 0.45),
      farB: L.mix(P.fir, P.nightSky, 0.45),
      farBDawn: L.mix(P.fir, P.duskRose, 0.35),
      // the forest floor behind the near firs, so no sky or far-A pixel shows below the upper mist
      haze: L.mix(L.mix(P.fir, P.nightSky, 0.45), P.mist, 0.4),
      hazeDawn: L.mix(L.mix(P.fir, P.duskRose, 0.35), P.mist, 0.4),
      monarch: P.monarch,
      monarchDeep: P.monarchDeep,
      under: P.monarchUnder,
      underTan: L.mix(P.monarchUnder, P.tan, 0.4),
      underDeep: L.mix(P.monarchUnder, P.monarchDeep, 0.3),
      massShade: L.mix(P.monarchDeep, P.ink, 0.45),
      fwOrange: L.mix(P.monarch, P.monarchUnder, 0.4),
      fwOrange2: L.mix(P.monarch, P.monarchUnder, 0.65),
      barkLit: L.mix(P.bark, P.tan, 0.3),
      barkGlint: L.mix(P.bark, P.mist, 0.5),
      vein: P.veinBlack,
      spot: P.spotWhite,
      annBlue: P.annBlue,
      annMagenta: P.annMagenta,
      annYellow: P.annYellow,
      moonDark: L.mix(P.night, P.nightSky, 0.35),
      moonDawn: L.mix(L.mix(P.night, P.nightSky, 0.35), P.stripeApricot, 0.7),
      moonHatch: P.paperDeep,
      slot: P.night,
      goldLight: P.goldLight,
    };
    return C;
  }

  // ---------------------------------------------------------------------------
  // butterfly templates (unit = wing length, head at the origin, wings hanging down and right)
  // resting shape follows G4 scaled down: forewing apex (0.485, 1.0), tornus (0.04, 0.69),
  // hindwing lowest point (0.155, 0.942), inner margin along x 0.058
  // ---------------------------------------------------------------------------
  const FW = [[0.05, 0.1], [0.2, 0.3], [0.4, 0.58], [0.56, 0.84], [0.63, 0.965], [0.52, 0.975], [0.34, 0.9], [0.17, 0.8], [0.06, 0.72], [0.04, 0.42]];
  const HW = [[0.06, 0.15], [0.28, 0.3], [0.5, 0.55], [0.58, 0.74], [0.52, 0.89], [0.37, 0.975], [0.2, 1.0], [0.1, 0.95], [0.06, 0.8], [0.05, 0.45]];
  const APEX = [[0.38, 0.6], [0.56, 0.84], [0.63, 0.965], [0.52, 0.975], [0.4, 0.93], [0.34, 0.8], [0.35, 0.68]];

  function buildRestTemplate(L, v) {
    const seed = L.hash(ID, 'rest', v);
    const wob = (pts, amp, s) => pts.map((p, i) => [p[0] + amp * L.noise1(i * 1.7 + 0.3, s), p[1] + amp * L.noise1(i * 1.3 + 5.1, s + 1)]);
    const fw = L.smoothPts(wob(FW, 0.012, seed + 1), true, 0.025);
    const hw = L.smoothPts(wob(HW, 0.012, seed + 3), true, 0.025);
    const apex = L.smoothPts(wob(APEX, 0.01, seed + 5), true, 0.03);
    const tp = {};
    tp.fw = pathOf(fw, true);
    tp.hw = pathOf(hw, true);
    tp.apex = pathOf(apex, true);
    tp.sil = new Path2D();
    tp.sil.addPath(tp.hw);
    tp.sil.addPath(tp.fw);
    tp.outline = new Path2D();
    tp.outline.addPath(tp.hw);
    tp.outline.addPath(tp.fw);
    // black borders: closed bands 0.07 unit deep along the outer margins, plus the costa
    const j = (x, y, k) => [x + 0.008 * L.noise1(k * 2.1, seed + 9), y + 0.008 * L.noise1(k * 1.9, seed + 10)];
    const inset = (pts, d, cx, cy) =>
      pts.map((p) => {
        const dx = cx - p[0], dy = cy - p[1];
        const len = Math.hypot(dx, dy) || 1;
        return [p[0] + (dx / len) * d, p[1] + (dy / len) * d];
      });
    const fwOuter = [j(0.63, 0.965, 1), j(0.52, 0.975, 2), j(0.34, 0.9, 3), j(0.17, 0.8, 4), j(0.07, 0.725, 5)];
    const hwOuter = [j(0.5, 0.89, 11), j(0.37, 0.97, 12), j(0.2, 0.995, 13), j(0.1, 0.945, 14)];
    tp.fwBand = pathOf(fwOuter.concat(inset(fwOuter, 0.07, 0.18, 0.52).reverse()), true);
    tp.hwBand = pathOf(hwOuter.concat(inset(hwOuter, 0.07, 0.16, 0.55).reverse()), true);
    tp.border = pathOf(fwOuter, false);
    pathOf(hwOuter, false, tp.border);
    tp.costa = pathOf([j(0.06, 0.12, 6), j(0.2, 0.31, 7), j(0.4, 0.59, 8), j(0.56, 0.845, 9), j(0.625, 0.96, 10)], false);
    tp.spine = pathOf([j(0.05, 0.1, 37), j(0.048, 0.32, 38), j(0.052, 0.55, 39), j(0.058, 0.82, 40)], false);
    tp.veins = new Path2D();
    tp.vein1 = pathOf([j(0.07, 0.15, 15), j(0.27, 0.42, 16), j(0.45, 0.72, 17), j(0.56, 0.92, 18)], false);
    pathOf([j(0.07, 0.15, 15), j(0.27, 0.42, 16), j(0.45, 0.72, 17), j(0.56, 0.92, 18)], false, tp.veins);
    pathOf([j(0.06, 0.22, 19), j(0.19, 0.46, 20), j(0.31, 0.7, 21), j(0.39, 0.9, 22)], false, tp.veins);
    pathOf([j(0.05, 0.32, 23), j(0.12, 0.55, 24), j(0.2, 0.79, 25)], false, tp.veins);
    pathOf([j(0.27, 0.42, 26), j(0.19, 0.46, 27)], false, tp.veins);
    pathOf([j(0.08, 0.24, 28), j(0.3, 0.52, 29), j(0.45, 0.86, 30)], false, tp.veins);
    pathOf([j(0.07, 0.4, 31), j(0.18, 0.68, 32), j(0.28, 0.96, 33)], false, tp.veins);
    pathOf([j(0.062, 0.55, 34), j(0.11, 0.77, 35), j(0.14, 0.96, 36)], false, tp.veins);
    // shadow hatching on the lower right of each wing (light from the upper left)
    tp.hatch = new Path2D();
    const hs = [[0.5, 0.84], [0.45, 0.78], [0.54, 0.91], [0.4, 0.7], [0.35, 0.64], [0.4, 0.92], [0.32, 0.86], [0.44, 0.83], [0.48, 0.96]];
    for (let k = 0; k < hs.length; k++) {
      const [x, y] = j(hs[k][0], hs[k][1], 40 + k);
      const l = 0.045 + 0.02 * ((k * 7) % 3);
      tp.hatch.moveTo(x - l * 0.7, y + l * 0.7);
      tp.hatch.lineTo(x + l * 0.7, y - l * 0.7);
    }
    tp.dots = new Path2D();
    // one row of spots sitting inside the 0.07 black band
    const ds = [[0.54, 0.94, 0.036], [0.42, 0.905, 0.035], [0.29, 0.845, 0.034], [0.16, 0.775, 0.032], [0.4, 0.945, 0.034], [0.26, 0.96, 0.033], [0.13, 0.925, 0.032]];
    for (let k = 0; k < ds.length; k++) {
      const [x, y] = j(ds[k][0], ds[k][1], 60 + k);
      tp.dots.moveTo(x + ds[k][2], y);
      tp.dots.arc(x, y, ds[k][2], 0, TAU);
    }
    tp.body = new Path2D();
    tp.body.ellipse(0.012, 0.33, 0.028, 0.14, 0.05, 0, TAU);
    tp.body.moveTo(0.05, 0.117);
    tp.body.ellipse(0, 0.117, 0.05, 0.072, 0, 0, TAU);
    tp.body.moveTo(0.055, 0);
    tp.body.arc(0, 0, 0.055, 0, TAU);
    tp.bodyDots = new Path2D();
    for (const [x, y, rr] of [[-0.022, 0.09, 0.012], [-0.018, 0.135, 0.011], [-0.03, -0.01, 0.01]]) {
      tp.bodyDots.moveTo(x + rr, y);
      tp.bodyDots.arc(x, y, rr, 0, TAU);
    }
    tp.ant = new Path2D();
    const a1 = j(-0.1, -0.34, 70), a2 = j(0.08, -0.33, 71);
    tp.ant.moveTo(-0.02, -0.045);
    tp.ant.quadraticCurveTo(-0.05, -0.2, a1[0], a1[1]);
    tp.ant.moveTo(0.018, -0.048);
    tp.ant.quadraticCurveTo(0.05, -0.2, a2[0], a2[1]);
    // legs gripping upward
    tp.ant.moveTo(-0.03, 0.1);
    tp.ant.lineTo(-0.085, 0.03);
    tp.ant.lineTo(-0.09, -0.05);
    tp.ant.moveTo(-0.025, 0.14);
    tp.ant.lineTo(-0.1, 0.1);
    tp.ant.lineTo(-0.13, 0.02);
    tp.clubs = new Path2D();
    tp.clubs.moveTo(a1[0] + 0.018, a1[1]);
    tp.clubs.arc(a1[0], a1[1], 0.018, 0, TAU);
    tp.clubs.moveTo(a2[0] + 0.018, a2[1]);
    tp.clubs.arc(a2[0], a2[1], 0.018, 0, TAU);
    return tp;
  }

  // open wings seen from above, right half (mirrored for the left), unit = half span
  const FWO = [[0.06, -0.22], [0.35, -0.44], [0.72, -0.58], [1.0, -0.62], [0.96, -0.38], [0.82, -0.12], [0.68, 0.0], [0.6, 0.06], [0.08, -0.02]];
  const HWO = [[0.06, -0.04], [0.32, 0.04], [0.52, 0.16], [0.55, 0.34], [0.44, 0.48], [0.28, 0.54], [0.12, 0.48], [0.05, 0.22]];
  const TIPO = [[0.62, -0.54], [1.0, -0.62], [0.96, -0.38], [0.88, -0.28], [0.74, -0.38]];

  function buildOpenTemplate(L, v) {
    const seed = L.hash(ID, 'open', v);
    const wob = (pts, amp, s) => pts.map((p, i) => [p[0] + amp * L.noise1(i * 1.7 + 0.3, s), p[1] + amp * L.noise1(i * 1.3 + 5.1, s + 1)]);
    const tp = {};
    tp.fw = pathOf(L.smoothPts(wob(FWO, 0.02, seed + 1), true, 0.05), true);
    tp.hw = pathOf(L.smoothPts(wob(HWO, 0.02, seed + 3), true, 0.05), true);
    tp.tip = pathOf(L.smoothPts(wob(TIPO, 0.015, seed + 5), true, 0.05), true);
    tp.outline = new Path2D();
    tp.outline.addPath(tp.hw);
    tp.outline.addPath(tp.fw);
    const inw = (pts, d, cx, cy) =>
      pts.map((p) => {
        const dx = cx - p[0], dy = cy - p[1];
        const len = Math.hypot(dx, dy) || 1;
        return [p[0] + (dx / len) * d, p[1] + (dy / len) * d];
      });
    const costaO = [[0.06, -0.22], [0.35, -0.44], [0.72, -0.58], [1.0, -0.62]];
    tp.costa = pathOf(costaO.concat(inw(costaO, 0.04, 0.2, 0.0).reverse()), true);
    const fwO = [[1.0, -0.62], [0.96, -0.38], [0.82, -0.12], [0.68, 0.0], [0.6, 0.06]];
    tp.fwBand = pathOf(fwO.concat(inw(fwO, 0.1, 0.2, -0.1).reverse()), true);
    const hwO = [[0.55, 0.34], [0.44, 0.48], [0.28, 0.54], [0.12, 0.48]];
    tp.hwBand = pathOf(hwO.concat(inw(hwO, 0.1, 0.12, 0.12).reverse()), true);
    tp.border = new Path2D();
    pathOf([[0.96, -0.38], [0.82, -0.12], [0.68, 0.0], [0.6, 0.06]], false, tp.border);
    pathOf([[0.55, 0.34], [0.44, 0.48], [0.28, 0.54], [0.12, 0.48]], false, tp.border);
    tp.veins = new Path2D();
    const vs = [
      [[0.06, -0.2], [0.5, -0.45], [0.93, -0.56]],
      [[0.07, -0.15], [0.45, -0.25], [0.9, -0.32]],
      [[0.07, -0.1], [0.4, -0.1], [0.8, -0.1]],
      [[0.07, -0.05], [0.35, 0.0], [0.58, 0.04]],
      [[0.45, -0.25], [0.4, -0.1]],
      [[0.07, -0.02], [0.36, 0.1], [0.52, 0.2]],
      [[0.07, 0.02], [0.3, 0.2], [0.48, 0.36]],
      [[0.06, 0.06], [0.22, 0.28], [0.34, 0.48]],
      [[0.05, 0.1], [0.14, 0.3], [0.18, 0.46]],
    ];
    for (const s of vs) pathOf(s, false, tp.veins);
    tp.dots = new Path2D();
    const row1 = [[0.9, -0.34], [0.8, -0.14], [0.7, 0.0], [0.62, 0.04], [0.48, 0.4], [0.34, 0.48], [0.2, 0.5]];
    const row2 = [[0.84, -0.3], [0.74, -0.1], [0.64, 0.0], [0.42, 0.36], [0.28, 0.44], [0.16, 0.46]];
    for (const [x, y] of row1.concat(row2)) {
      tp.dots.moveTo(x + 0.018, y);
      tp.dots.arc(x, y, 0.018, 0, TAU);
    }
    tp.apexWhite = new Path2D();
    for (const [x, y] of [[0.88, -0.52], [0.8, -0.48], [0.72, -0.44], [0.92, -0.46]]) {
      tp.apexWhite.moveTo(x + 0.022, y);
      tp.apexWhite.arc(x, y, 0.022, 0, TAU);
    }
    tp.apexOrange = new Path2D();
    for (const [x, y] of [[0.82, -0.4], [0.9, -0.36]]) {
      tp.apexOrange.moveTo(x + 0.02, y);
      tp.apexOrange.arc(x, y, 0.02, 0, TAU);
    }
    tp.hatch = new Path2D();
    for (let i = -6; i < 16; i++) {
      const o = i * 0.11;
      tp.hatch.moveTo(0.06, -0.3 + o);
      tp.hatch.lineTo(0.42, 0.06 + o);
    }
    tp.body = new Path2D();
    tp.body.ellipse(0, 0.2, 0.05, 0.26, 0, 0, TAU);
    tp.body.moveTo(0.075, -0.17);
    tp.body.ellipse(0, -0.17, 0.075, 0.14, 0, 0, TAU);
    tp.body.moveTo(0.065, -0.34);
    tp.body.arc(0, -0.34, 0.065, 0, TAU);
    tp.ant = new Path2D();
    tp.ant.moveTo(-0.02, -0.38);
    tp.ant.quadraticCurveTo(-0.08, -0.55, -0.16, -0.66);
    tp.ant.moveTo(0.02, -0.38);
    tp.ant.quadraticCurveTo(0.08, -0.55, 0.16, -0.66);
    return tp;
  }

  // ---------------------------------------------------------------------------
  // geometry (pure constants, built once)
  // ---------------------------------------------------------------------------
  let G = null;

  function buildTrunk(L, i) {
    const T = TRUNKS[i];
    const seed = L.hash(ID, 'trunk', i);
    const cx = (y) => T.x + 7 * Math.sin((y / 1920) * Math.PI * 1.3 + i * 1.7) + 3 * L.noise1(y * 0.004, seed + 9);
    const hw = (y) => (T.w / 2) * (0.86 + 0.2 * (y / 1920));
    const left = [], right = [];
    for (let y = -30; y <= 1950; y += 20) {
      left.push([cx(y) - hw(y) + 2.2 * L.noise1(y * 0.02, seed + 1), y]);
      right.push([cx(y) + hw(y) + 2.2 * L.noise1(y * 0.02, seed + 2), y]);
    }
    const poly = left.concat(right.slice().reverse());
    // the moonlit third of the cylinder, a flat lighter tone with a ragged inner edge
    const litIn = [];
    for (let y = -30; y <= 1950; y += 20) litIn.push([cx(y) - hw(y) * (0.3 + 0.12 * L.noise1(y * 0.012, seed + 4)), y]);
    const lit = left.concat(litIn.reverse());
    const r = L.rng(seed + 3);
    const fissures = [];
    const nF = Math.round(T.w / 5.5);
    for (let k = 0; k < nF; k++) {
      const f = r.range(-0.8, 0.85);
      const y0 = r.range(-120, 1880);
      const len = r.range(120, 420);
      const pts = [];
      for (let y = y0; y <= y0 + len; y += 18) pts.push([cx(y) + f * hw(y) + 3.6 * L.noise1(y * 0.035, seed + 20 + k), y]);
      fissures.push({ pts, w: r.range(1.6, 3.0), soft: f < -0.3 && r.chance(0.6), seed: seed + 100 + k });
    }
    // moonlight catching the plate edges on the lit side
    const glints = new Path2D();
    for (let k = 0; k < 90; k++) {
      const y = r.range(-20, 1940);
      const x = cx(y) + r.range(-0.9, -0.2) * hw(y);
      const l = r.range(10, 40);
      glints.moveTo(x, y);
      glints.lineTo(x + r.range(-1.5, 1.5), y + l);
    }
    const cracks = new Path2D();
    for (let k = 0; k < 70; k++) {
      const y = r.range(-20, 1940);
      const f0 = r.range(-0.85, 0.6);
      const f1 = f0 + r.range(0.12, 0.34);
      const x0 = cx(y) + f0 * hw(y), x1 = cx(y) + Math.min(0.9, f1) * hw(y);
      cracks.moveTo(x0, y);
      cracks.quadraticCurveTo((x0 + x1) / 2, y + r.range(-6, 8), x1, y + r.range(-10, 10));
    }
    const knots = [];
    for (let k = 0; k < 3; k++) {
      const y = r.range(260, 1700);
      knots.push({ x: cx(y) + r.range(-0.45, 0.35) * hw(y), y, rx: r.range(6, 11), ry: r.range(12, 22) });
    }
    // short plate outlines on the side trunks, middle third, lit left third stays flat
    const plates = [];
    if (i !== 1) {
      for (let y0 = 40; y0 < 1900; y0 += 300) {
        const nP = 5 + r.int(0, 2);
        for (let k = 0; k < nP; k++) {
          const y = y0 + r.range(8, 270);
          const f = r.range(-0.12, 0.42);
          const len = r.range(40, 90);
          const pts = [];
          for (let yy = y; yy <= y + len; yy += 12) pts.push([cx(yy) + f * hw(yy) + 1.4 * L.noise1(yy * 0.04, seed + 200 + k), yy]);
          plates.push({ pts, seed: seed + 400 + y0 + k });
        }
      }
    }
    const lichen = [];
    for (let k = 0; k < 7; k++) {
      const y = r.range(100, 1850);
      lichen.push(L.ellipsePts(cx(y) + r.range(-0.7, 0.2) * hw(y), y, r.range(9, 20), r.range(16, 44), 18, r.range(-0.2, 0.2)));
    }
    return { poly, lit, left, right, cx, hw, fissures, cracks, glints, knots, lichen, plates, seed };
  }

  function buildBranch(L, B, i) {
    const seed = L.hash(ID, 'branch', i);
    const Cp = L.smoothPts(B.pts, false, 6);
    const n = Cp.length;
    const S = [0];
    for (let k = 1; k < n; k++) S.push(S[k - 1] + Math.hypot(Cp[k][0] - Cp[k - 1][0], Cp[k][1] - Cp[k - 1][1]));
    const total = S[n - 1];
    const T = [];
    const A = [], Bs = [];
    for (let k = 0; k < n; k++) {
      const a = Cp[Math.max(0, k - 1)], b = Cp[Math.min(n - 1, k + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl;
      ty /= tl;
      T.push([tx, ty]);
      const w = (L.lerp(B.w0, B.w1, S[k] / total) / 2) * (1 + 0.1 * L.noise1(S[k] * 0.03, seed));
      A.push([Cp[k][0] - ty * w, Cp[k][1] + tx * w]);
      Bs.push([Cp[k][0] + ty * w, Cp[k][1] - tx * w]);
    }
    // the lower edge carries the heavier line
    const aLower = A[Math.floor(n / 2)][1] > Bs[Math.floor(n / 2)][1];
    const poly = A.concat(Bs.slice().reverse());
    const at = (s) => {
      let k = 0;
      while (k < n - 2 && S[k + 1] < s) k++;
      const u = (s - S[k]) / (S[k + 1] - S[k] || 1);
      return [L.lerp(Cp[k][0], Cp[k + 1][0], u), L.lerp(Cp[k][1], Cp[k + 1][1], u), T[k][0], T[k][1]];
    };
    // needle sprays: branchlets alternate sides and droop, needles point forward along each branchlet
    const r = L.rng(seed + 1);
    const N = [];
    const twigs = new Path2D();
    let side = r.chance(0.5) ? 1 : -1;
    for (let s = r.range(10, 22); s < total - 8; s += r.range(15, 23)) {
      const u = s / total;
      const [px, py, tx, ty] = at(s);
      let a = Math.atan2(ty, tx) + side * r.range(0.6, 1.0);
      a = towardDown(a, B.up ? -0.1 : 0.2);
      const len = B.len * r.range(0.72, 1.12) * (0.5 + 0.5 * Math.sin(Math.PI * Math.min(1, 0.22 + u * 0.95)));
      const steps = Math.max(3, Math.round(len / 4.2));
      let x = px, y = py;
      twigs.moveTo(x, y);
      for (let k = 1; k <= steps; k++) {
        const v = k / steps;
        const aa = towardDown(a, (B.up ? 0.05 : 0.32) * v);
        x += (Math.cos(aa) * len) / steps;
        y += (Math.sin(aa) * len) / steps;
        twigs.lineTo(x, y);
        const nl = B.needle * r.range(0.78, 1.15) * (1 - 0.45 * v);
        for (let sd = -1; sd <= 1; sd += 2) {
          const na = aa + sd * r.range(0.8, 1.2);
          const x1 = x + Math.cos(na) * nl, y1 = y + Math.sin(na) * nl;
          N.push(x - Math.cos(aa) * 1.5, y - Math.sin(aa) * 1.5, x1, y1, Math.sin(na) < -0.15 ? 1 : 0);
        }
      }
      // a short terminal tuft
      for (let k = 0; k < 3; k++) {
        const na = a + (k - 1) * 0.35;
        const nl = B.needle * 0.7;
        N.push(x, y, x + Math.cos(na) * nl, y + Math.sin(na) * nl, 0);
      }
      side = -side;
    }
    for (let s = total * 0.3; s < total; s += 4.4) {
      const [px, py, tx, ty] = at(s);
      const a = Math.atan2(ty, tx);
      for (let sd = -1; sd <= 1; sd += 2) {
        const na = a + sd * r.range(0.75, 1.15);
        const nl = B.needle * r.range(0.8, 1.1);
        N.push(px, py, px + Math.cos(na) * nl, py + Math.sin(na) * nl, Math.sin(na) < -0.15 ? 1 : 0);
      }
    }
    return { poly, A, B: Bs, aLower, angle: Math.atan2(Cp[n - 1][1] - Cp[0][1], Cp[n - 1][0] - Cp[0][0]), N: Float32Array.from(N), twigs, seed, back: !!B.back, fg: !!B.fg, tip: Cp[n - 1] };
  }

  function firPoly(L, x, yTop, yBase, hwBase, seed) {
    const H = yBase - yTop;
    const tiers = Math.max(7, Math.round(H / 44));
    const side = (sg, s) => {
      const out = [];
      for (let y = yTop + 6; y <= yBase + 40; y += 6) {
        const u = L.clamp((y - yTop) / H);
        const ph = (u * tiers + 0.37 * (1 + L.noise1(y * 0.01, s))) % 1;
        // each tier droops out to a tip, then tucks back in under the next tier
        const tier = 0.72 + 0.28 * Math.pow(ph, 1.6);
        const w = hwBase * Math.pow(u, 0.85) * tier * (1 + 0.1 * L.noise1(y * 0.05, s + 1));
        out.push([x + sg * w, y + 4 * Math.pow(ph, 3)]);
      }
      return out;
    };
    const R = side(1, seed), Lf = side(-1, seed + 7);
    return [[x, yTop - 10]].concat(R, Lf.reverse());
  }

  function buildButterflies(L) {
    // shingles on the middle trunk, bottom row first so upper rows overlap them like roof tiles
    const tr = G.trunks[1];
    const r = L.rng(L.hash(ID, 'shingles'));
    const shingles = [];
    let row = 0;
    const edgeL = [], edgeR = [], shadeIn = [];
    for (let y = 1452; y >= 684; y -= 24, row++) {
      const u = (y - 684) / 768;
      let hwS = 54 + 30 * Math.sin(Math.PI * L.clamp(u * 1.1)) + 9 * L.noise1(y * 0.02, 5) + r.range(-7, 7);
      if (y > 1170) hwS -= (y - 1170) * 0.07;
      const cx = tr.cx(y);
      edgeL.push([cx - hwS - 12, y]);
      edgeR.push([cx + hwS + 16, y + 40]);
      shadeIn.push([cx + hwS * (0.18 + 0.14 * L.noise1(y * 0.013, 41)), y + 20]);
      // rows alternate their lean like roof tiles, rhyming with the scale mosaic
      const rowMir = row & 1 ? 1 : -1;
      const off = row & 1 ? 14 : 0;
      const rowAt = [];
      for (let x = cx - hwS + off; x <= cx + hwS + 4; x += 28) {
        if (y < 780 && r() < (780 - y) / 110) continue; // ragged top edge
        const edgeX = x <= cx - hwS + off + 6 || x >= cx + hwS - 28;
        const s = edgeX ? r.range(46, 50) : r.range(38, 50);
        const mir = r.chance(0.86) ? rowMir : -rowMir;
        shingles.push({
          x: x - mir * 0.28 * s + r.range(-3, 3),
          y: y + r.range(-3, 3),
          s,
          rot: rowMir * 0.1 + r.range(-0.09, 0.09),
          mir,
          v: r.int(0, 2),
          c: r.int(0, 3),
          edge: edgeX,
        });
        rowAt.push(shingles.length - 1);
      }
      if (rowAt.length) {
        shingles[rowAt[0]].edge = true;
        shingles[rowAt[0]].s = Math.max(shingles[rowAt[0]].s, 46);
        shingles[rowAt[rowAt.length - 1]].edge = true;
        shingles[rowAt[rowAt.length - 1]].s = Math.max(shingles[rowAt[rowAt.length - 1]].s, 46);
      }
    }
    const shinglePoly = edgeL.concat(edgeR.slice().reverse());
    const shingleShade = shadeIn.concat(edgeR.slice().reverse());
    const glints = [];
    for (let k = 0; k < 16; k++) {
      const b = shingles[Math.floor(r() * shingles.length)];
      glints.push([b.x + b.mir * b.s * 0.3, b.y + b.s * r.range(0.3, 0.8), r.range(4, 8)]);
    }
    // clusters, in local coordinates about each anchor
    const clusters = CLUSTERS.map((c, ci) => {
      const rc = L.rng(L.hash(ID, 'cluster', ci));
      const list = [];
      const k = c.k;
      let rw = 0;
      const outline = [];
      // a teardrop bunch: wide where it wraps the branch end, sagging to a rounded point
      const hwAt = (u) => (u < 0.28 ? 34 + 58 * Math.pow(L.clamp(u / 0.28), 0.7) : 10 + 82 * Math.pow(L.clamp(1 - (u - 0.28) / 0.72), 0.8));
      const dx = c.dx || 0;
      for (let ly = 240 * k; ly >= 0; ly -= 20 * k, rw++) {
        const u = ly / (250 * k);
        const hw = k * hwAt(u);
        const off = rw & 1 ? 13 * k : 0;
        const rowAt = [];
        for (let lx = -hw + off; lx <= hw; lx += 26 * k) {
          const side = lx > 0 ? 1 : -1;
          const edgeX = Math.abs(lx) >= hw - 26 * k;
          const s = k * (edgeX ? rc.range(46, 50) : rc.range(34, 48));
          const mir = rc.chance(0.7) ? side : -side;
          list.push({
            x: dx + lx - mir * 0.28 * s + rc.range(-4, 4),
            y: ly - 16 * k + rc.range(-4, 4),
            s,
            rot: (-lx / (hw + 1)) * 0.3 + rc.range(-0.16, 0.16),
            mir,
            v: rc.int(0, 2),
            c: rc.int(0, 3),
            edge: edgeX,
          });
          rowAt.push(list.length - 1);
        }
        if (rowAt.length) {
          list[rowAt[0]].edge = true;
          list[rowAt[0]].s = Math.max(list[rowAt[0]].s, 46 * k * 0.92);
          list[rowAt[rowAt.length - 1]].edge = true;
          list[rowAt[rowAt.length - 1]].s = Math.max(list[rowAt[rowAt.length - 1]].s, 46 * k * 0.92);
        }
      }
      for (let a = 0; a <= 24; a++) {
        const u = a / 24;
        const ly = u * 290 * k - 16;
        outline.push([dx + k * hwAt(L.clamp(ly / (250 * k))) + 8, ly]);
      }
      const poly = outline.concat(outline.slice().reverse().map((p) => [2 * dx - p[0], p[1]]));
      // the shadow side of the bunch: right of a ragged line that leans with the light
      const shade = [];
      for (let a = 2; a <= 24; a++) {
        const ly = (a / 24) * 290 * k - 16;
        shade.push([dx + k * (6 + 14 * L.noise1(a * 0.7, ci + 3)) - 0.25 * (ly - 120 * k), ly]);
      }
      const shadePoly = shade.concat(outline.slice(2).reverse());
      const glints = [];
      for (let g = 0; g < 6; g++) {
        const b = list[Math.floor(rc() * list.length)];
        glints.push([b.x + b.mir * b.s * 0.3, b.y + b.s * rc.range(0.3, 0.8), rc.range(4, 8)]);
      }
      // a tuft of needles at the branch end, in front of the bunch it holds
      const tuft = [];
      for (let g = 0; g < 16; g++) {
        const a = Math.PI / 2 + rc.range(-1.35, 1.35);
        const l = rc.range(12, 26);
        const ox = rc.range(-10, 10), oy = rc.range(-8, 4);
        tuft.push(c.x + ox, c.y + oy, c.x + ox + Math.cos(a) * l, c.y + oy + Math.sin(a) * l, Math.sin(a) < 0.35 ? 1 : 0);
      }
      return { list, poly, shadePoly, glints, tuft: Float32Array.from(tuft), anchor: c, phase: rc.range(0, TAU) };
    });
    // the burst: 25 from the column (y 700-1100), 15 / 20 / 20 from the three clusters
    const rb = L.rng(L.hash(ID, 'burst'));
    const flyers = [];
    const takeOuter = (list, n, ok) => {
      const outer = [];
      const rest = [];
      const cut = Math.floor(list.length * 0.5);
      for (let i = 0; i < list.length; i++) {
        if (ok && !ok(list[i], i)) continue;
        if (list[i].edge || i >= cut) outer.push(i);
        else rest.push(i);
      }
      const pool = outer.concat(rest);
      return shuffle(rb, pool).slice(0, n);
    };
    for (const i of takeOuter(shingles, 25, (b) => b.y >= 700 && b.y <= 1100)) flyers.push({ src: 's', i });
    const clusterN = [15, 20, 20];
    for (let ci = 0; ci < clusters.length; ci++) {
      for (const i of takeOuter(clusters[ci].list, clusterN[ci], null)) flyers.push({ src: 'c', ci, i });
    }
    shuffle(rb, flyers);
    for (let fi = 0; fi < flyers.length; fi++) {
      const fl = flyers[fi];
      fl.head = -Math.PI / 2 + rb.range(0.2, 1.4);
      fl.speed = rb.range(700, 1250);
      fl.delay = fi < 30 ? 0 : fi < 60 ? 1 : 2;
      fl.wob = rb.range(-1, 1);
      fl.flap = rb.int(0, 2);
      fl.tilt = rb.range(-0.44, 0.44);
      fl.v = rb.int(0, 2);
      fl.sc = rb.range(0.85, 1.15);
      const list = fl.src === 's' ? shingles : clusters[fl.ci].list;
      const b = list[fl.i];
      fl.holes = [];
      for (let j = 0; j < fl.i; j++) {
        const o = list[j];
        const dx = o.x - b.x, dy = o.y - b.y;
        if (dx * dx + dy * dy <= 32 * 32) {
          fl.holes.push(j);
          (o.hide = o.hide || []).push(fl);
        }
      }
      b.fly = fl;
    }
    const nCr = 3 + rb.int(0, 2);
    const crumbs = [];
    for (let k = 0; k < nCr; k++) {
      const fl = flyers[(k * 19) % flyers.length];
      const list = fl.src === 's' ? shingles : clusters[fl.ci].list;
      const b = list[fl.i];
      let x = b.x, y = b.y;
      if (fl.src === 'c') {
        x += clusters[fl.ci].anchor.x;
        y += clusters[fl.ci].anchor.y;
      }
      crumbs.push({
        x: x + rb.range(-6, 6),
        y: y + rb.range(-4, 8),
        delay: fl.delay,
        kind: k & 1,
        a: rb.range(0.5, 1.3),
        len: rb.range(12, 22),
        rot: rb.range(-0.4, 0.4),
      });
    }
    return { shingles, shinglePoly, shingleShade, shingleGlints: glints, clusters, flyers, crumbs };
  }

  function build(L) {
    if (G) return G;
    G = {};
    G.rest = [0, 1, 2].map((v) => buildRestTemplate(L, v));
    G.open = [0, 1, 2].map((v) => buildOpenTemplate(L, v));
    G.trunks = TRUNKS.map((_, i) => buildTrunk(L, i));
    G.branches = BRANCHES.map((B, i) => buildBranch(L, B, i));
    G.farA = FAR_A.map((f, i) => ({ poly: firPoly(L, f[0], f[1], f[2], f[3], L.hash(ID, 'farA', i)), x: f[0], hw: f[3], top: f[1], base: f[2] }));
    G.farB = FAR_B.map((f, i) => ({ poly: firPoly(L, f[0], f[1], f[2], f[3], L.hash(ID, 'farB', i)), x: f[0], hw: f[3], top: f[1], base: f[2] }));
    Object.assign(G, buildButterflies(L));
    const r = L.rng(L.hash(ID, 'sparkles'));
    G.sparkles = [];
    for (let k = 0; k < 18; k++) G.sparkles.push({ x: r.range(20, 1060), y: r.range(40, 1000), s: r.range(4, 9) });
    return G;
  }

  // ---------------------------------------------------------------------------
  // drawing: sky, far forest, mist
  // ---------------------------------------------------------------------------
  function drawSky(ctx, L, st, bi) {
    const off = (st.tc / 0.5) * 6;
    L.paper(ctx);
    if (st.dawn < 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      L.stripes(ctx, { colors: [C.nightA, C.nightB], width: 140, angle: -0.52, offset: off, seed: 1501 });
      ctx.restore();
    }
    if (st.dawn > 0) {
      ctx.save();
      ctx.globalAlpha = st.dawn;
      L.paper(ctx);
      ctx.globalCompositeOperation = 'multiply';
      L.stripes(ctx, { colors: [C.dawnA, C.dawnB], width: 140, angle: -0.52, offset: off, seed: 1502 });
      ctx.restore();
    }
    if (st.dawn < 1) {
      const a = 1 - st.dawn;
      const sd = L.hash(ID, 'stars');
      L.stipple(ctx, null, {
        bounds: { x: 0, y: 0, w: 1080, h: 1300 },
        spacing: 8,
        r: [0.7, 1.9],
        color: C.white,
        alpha: 0.85 * a,
        density: (x, y) => 0.04 + 0.05 * Math.max(0, L.noise2(x * 0.004, y * 0.004, sd)) - 0.02 * L.smoothstep(700, 1300, y),
        seed: sd,
      });
      ctx.save();
      ctx.fillStyle = C.white;
      for (let k = 0; k < G.sparkles.length; k++) {
        const sp = G.sparkles[k];
        const tw = L.h3(k, bi, 911);
        const s = sp.s * (0.55 + 0.7 * tw);
        ctx.globalAlpha = a * (0.6 + 0.4 * tw);
        star4(ctx, sp.x, sp.y, s, 0.16);
      }
      ctx.restore();
    }
    if (st.flash > 0) {
      ctx.save();
      ctx.globalAlpha = st.flash;
      ctx.fillStyle = C.goldLight;
      ctx.fillRect(0, 0, 1080, 1920);
      ctx.restore();
    }
  }

  function star4(ctx, x, y, s, w) {
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.quadraticCurveTo(x + s * w, y - s * w, x + s, y);
    ctx.quadraticCurveTo(x + s * w, y + s * w, x, y + s);
    ctx.quadraticCurveTo(x - s * w, y + s * w, x - s, y);
    ctx.quadraticCurveTo(x - s * w, y - s * w, x, y - s);
    ctx.fill();
  }

  function drawFar(ctx, L, list, col, hatchCol, st, seedTag, outlineA, hatchA, extraInk) {
    const ha = hatchA != null ? hatchA : 0.75;
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      const seed = L.hash(ID, seedTag, i);
      ctx.save();
      ctx.fillStyle = col;
      ctx.beginPath();
      L.tracePath(ctx, f.poly, true);
      ctx.fill();
      ctx.restore();
      // tier hatching on the shadow side: short strokes that droop outward like the branch tiers
      L.hatch(ctx, f.poly, {
        angle: 0.42,
        spacing: extraInk ? 8 : 7,
        width: 1.4,
        color: extraInk ? C.ink : hatchCol,
        alpha: extraInk ? 0.4 : ha,
        length: [8, 26],
        gap: [4, 12],
        density: (x) => L.smoothstep(f.x - f.hw * 0.05, f.x + f.hw * 0.6, x),
        seed: seed + 1,
      });
      L.hatch(ctx, f.poly, {
        angle: -0.42,
        spacing: 10,
        width: 1.1,
        color: hatchCol,
        alpha: extraInk ? ha : ha * 0.6,
        length: [6, 18],
        gap: [8, 20],
        density: (x) => 0.55 * (1 - L.smoothstep(f.x - f.hw * 0.6, f.x, x)),
        seed: seed + 3,
      });
      if (extraInk) {
        L.hatch(ctx, f.poly, {
          angle: A105,
          spacing: 11,
          width: 1.2,
          color: C.ink,
          alpha: 0.25,
          length: [6, 20],
          gap: [8, 18],
          density: (x) => L.smoothstep(f.x + f.hw * 0.25, f.x + f.hw * 0.9, x),
          seed: seed + 8,
        });
      }
      L.inkPath(ctx, f.poly, { closed: true, width: 1.6, color: hatchCol, alpha: outlineA, seed: seed + 2, smooth: false, step: 7, wobble: 0.8, taper: [4, 8] });
    }
  }

  function drawMist(ctx, L, idx, st, dawn, front) {
    const y0 = MIST_Y[idx];
    const slide = (idx === 0 ? 1 : -1) * 40 * st.tc * (front ? -1 : 1); // 10 px per 8th, front slides the other way
    const seed = L.hash(ID, 'mist', idx);
    const top = (x) => y0 - 46 + 16 * L.noise1(x * 0.0065, seed) + 7 * L.noise1(x * 0.021, seed + 1);
    const bot = (x) => y0 + 42 + 14 * L.noise1(x * 0.0072, seed + 2) + 6 * L.noise1(x * 0.026, seed + 3);
    const col = dawn > 0 ? L.mix(C.mist, C.apricot, 0.5 * dawn) : C.mist;
    ctx.save();
    ctx.translate(slide, 0);
    ctx.fillStyle = col;
    if (front) {
      const grow = 26;
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      for (let x = -120; x <= 1200; x += 16) {
        const yy = top(x) - grow + grow * 0.5 * L.noise1(x * 0.03, seed + grow);
        if (x === -120) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      for (let x = 1200; x >= -120; x -= 16) ctx.lineTo(x, bot(x) + grow + grow * 0.5 * L.noise1(x * 0.03, seed + grow + 1));
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      L.stipple(ctx, null, {
        bounds: { x: -120, y: y0 - 110, w: 1320, h: 220 },
        spacing: 5,
        r: [0.6, 1.3],
        color: col,
        alpha: 0.5,
        seed: seed + 17,
        density: (x, y) => {
          const a = top(x) - 20, b = bot(x) + 20;
          if (y < a) return 0.45 * (1 - (a - y) / 40);
          if (y > b) return 0.45 * (1 - (y - b) / 40);
          return 0.18;
        },
      });
      ctx.restore();
      return;
    }
    const poly = [];
    for (let x = -120; x <= 1200; x += 16) poly.push([x, top(x)]);
    for (let x = 1200; x >= -120; x -= 16) poly.push([x, bot(x)]);
    // three nested flat layers so the band thins out at its edges
    const layers = [[26, 0.16], [12, 0.2], [0, 0.26]];
    for (const [grow, a] of layers) {
      ctx.globalAlpha = a;
      ctx.beginPath();
      for (let x = -120; x <= 1200; x += 16) {
        const yy = top(x) - grow + grow * 0.5 * L.noise1(x * 0.03, seed + grow);
        if (x === -120) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      for (let x = 1200; x >= -120; x -= 16) ctx.lineTo(x, bot(x) + grow + grow * 0.5 * L.noise1(x * 0.03, seed + grow + 1));
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    L.hatch(ctx, poly, { angle: 0, spacing: 7, width: 1.3, color: C.mistLight, alpha: 0.3, length: [30, 110], gap: [10, 40], density: 0.6, seed: seed + 5, flow: 0.02, angleJitter: 0.02 });
    L.stipple(ctx, null, {
      bounds: { x: -120, y: y0 - 110, w: 1320, h: 220 },
      spacing: 5,
      r: [0.6, 1.3],
      color: col,
      alpha: 0.7,
      seed: seed + 7,
      density: (x, y) => {
        const a = top(x) - 20, b = bot(x) + 20;
        if (y < a) return 0.45 * (1 - (a - y) / 40);
        if (y > b) return 0.45 * (1 - (y - b) / 40);
        return 0.22;
      },
    });
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // trunks and branches
  // ---------------------------------------------------------------------------
  function drawTrunk(ctx, L, tr, i) {
    ctx.save();
    ctx.fillStyle = C.bark;
    ctx.beginPath();
    L.tracePath(ctx, tr.poly, true);
    ctx.fill();
    ctx.fillStyle = C.barkLit;
    ctx.beginPath();
    L.tracePath(ctx, tr.lit, true);
    ctx.fill();
    ctx.restore();
    // lichen patches on the lit side
    for (let k = 0; k < tr.lichen.length; k++) {
      L.stipple(ctx, tr.lichen[k], { spacing: 4.5, r: [0.8, 1.6], color: C.lichen, alpha: 0.75, density: 0.55, seed: tr.seed + 50 + k });
    }
    ctx.save();
    ctx.strokeStyle = C.barkGlint;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.stroke(tr.glints);
    ctx.restore();
    // lengthwise hatching: mid tone across the middle, dark and crossed on the shadow side
    L.hatch(ctx, tr.poly, {
      angle: -Math.PI / 2,
      spacing: 5,
      width: 1.7,
      color: C.ink,
      alpha: 0.85,
      length: [30, 130],
      gap: [3, 14],
      density: (x, y) => L.smoothstep(tr.cx(y) - tr.hw(y) * 0.45, tr.cx(y) + tr.hw(y) * 0.45, x),
      seed: tr.seed + 32,
    });
    L.hatch(ctx, tr.poly, {
      angle: -Math.PI / 2 + 0.33,
      spacing: 5,
      width: 1.4,
      color: C.ink,
      alpha: 0.8,
      length: [14, 44],
      density: (x, y) => L.smoothstep(tr.cx(y) + tr.hw(y) * 0.2, tr.cx(y) + tr.hw(y) * 0.85, x),
      seed: tr.seed + 33,
    });
    for (const fs of tr.fissures) {
      L.inkPath(ctx, fs.pts, { width: fs.w, color: fs.soft ? C.inkSoft : C.ink, alpha: 0.95, seed: fs.seed, wobble: 1.4, taper: [24, 36] });
    }
    ctx.save();
    ctx.strokeStyle = C.ink;
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.stroke(tr.cracks);
    ctx.restore();
    for (let k = 0; k < tr.knots.length; k++) {
      const kn = tr.knots[k];
      L.inkPath(ctx, L.ellipsePts(kn.x, kn.y, kn.rx, kn.ry, 20), { closed: true, width: 2.2, fill: C.barkDeep, seed: tr.seed + 70 + k, taper: [4, 8] });
      L.inkPath(ctx, L.ellipsePts(kn.x + 1, kn.y + 2, kn.rx * 0.45, kn.ry * 0.5, 14), { closed: true, width: 1.4, color: C.inkSoft, seed: tr.seed + 80 + k, taper: [3, 6] });
    }
    if (tr.plates) {
      for (const p of tr.plates) {
        L.inkPath(ctx, p.pts, { width: 1.8, color: C.inkSoft, alpha: 0.9, seed: p.seed, wobble: 1.1, taper: [10, 14] });
      }
    }
    const hero = i === 1;
    L.inkPath(ctx, tr.left, { width: hero ? 4 : 3.2, seed: tr.seed + 91, taper: 0, double: hero ? { alpha: 0.35 } : false });
    L.inkPath(ctx, tr.right, { width: hero ? 5.5 : 4.2, seed: tr.seed + 92, taper: 0 });
  }

  function drawBranchLimb(ctx, L, br) {
    ctx.save();
    ctx.fillStyle = br.fg ? C.barkDeep : C.bark;
    ctx.beginPath();
    L.tracePath(ctx, br.poly, true);
    ctx.fill();
    ctx.restore();
    L.hatch(ctx, br.poly, { angle: br.angle, spacing: 4.5, width: 1.2, color: C.ink, alpha: 0.6, length: [14, 50], density: 0.6, seed: br.seed + 3 });
    L.inkPath(ctx, br.aLower ? br.A : br.B, { width: 3.2, seed: br.seed + 4, taper: [2, 20] });
    L.inkPath(ctx, br.aLower ? br.B : br.A, { width: 2.0, seed: br.seed + 5, taper: [2, 20] });
  }

  function drawSpray(ctx, L, br, bi, frostPath) {
    const N = br.N;
    const pS = new Path2D(), pB = new Path2D(), pH = new Path2D();
    for (let i = 0, j = 0; i < N.length; i += 5, j++) {
      const jb = (L.h3(j, bi, br.seed & 1023) - 0.5) * 1.4;
      const x0 = N[i], y0 = N[i + 1], x1 = N[i + 2] + jb, y1 = N[i + 3] - jb * 0.6;
      pS.moveTo(x0 + 1.4, y0 + 2.4);
      pS.lineTo(x1 + 1.4, y1 + 2.4);
      pB.moveTo(x0, y0);
      pB.lineTo(x1, y1);
      if (N[i + 4]) {
        pH.moveTo(x0 + (x1 - x0) * 0.3, y0 + (y1 - y0) * 0.3);
        pH.lineTo(x0 + (x1 - x0) * 0.95, y0 + (y1 - y0) * 0.95);
      }
      if (frostPath && j % 11 === 0) {
        frostPath.moveTo(x1 + 1.3, y1);
        frostPath.arc(x1, y1, 1.3, 0, TAU);
      }
    }
    const fg = br.fg;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = fg ? C.ink : C.firShadow;
    ctx.globalAlpha = fg ? 0.6 : 0.75;
    ctx.lineWidth = fg ? 3.4 : 2.6;
    ctx.stroke(pS);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = fg ? 2.4 : 1.7;
    ctx.stroke(br.twigs);
    ctx.strokeStyle = fg ? C.firDeep : C.fir;
    ctx.lineWidth = fg ? 2.9 : 2.1;
    ctx.stroke(pB);
    ctx.strokeStyle = fg ? C.fir : C.firLight;
    ctx.lineWidth = fg ? 1.6 : 1.2;
    ctx.stroke(pH);
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // butterflies
  // ---------------------------------------------------------------------------
  const HW_COL = ['under', 'underTan', 'underDeep', 'under'];
  const FW_COL = ['fwOrange', 'fwOrange2', 'fwOrange', 'underTan'];

  // Sprite cache: each resting or flying pose is inked once per render scale into a small canvas,
  // then stamped hundreds of times. A pure function of (template, colour set, mirror or flap, scale).
  const SPRITES = {};
  const REST_U = 54; // sprite px per unit wing length (the largest resting butterfly is 50 px)
  const OPEN_U = 70; // sprite px per unit half span (the largest flyer is about 66 px)
  const OPEN_F = [0.45, 1, 0.55, 0.28, 0.9];

  function restSprite(v, c, mir, edge) {
    const S = FILM.S || 1;
    const key = 'r' + v + '|' + c + '|' + mir + '|' + (edge ? 'e' : '') + '|' + S;
    let sp = SPRITES[key];
    if (sp) return sp;
    const x0 = -0.2, x1 = 0.76, y0 = -0.42, y1 = 1.12;
    const pad = 3;
    const w = Math.ceil((x1 - x0) * REST_U * S) + 2 * pad, h = Math.ceil((y1 - y0) * REST_U * S) + 2 * pad;
    const cv = FILM.makeCanvas(w, h);
    const g = cv.getContext('2d');
    const tx = mir > 0 ? -x0 * REST_U * S + pad : x1 * REST_U * S + pad;
    const ty = -y0 * REST_U * S + pad;
    g.setTransform(REST_U * S * mir, 0, 0, REST_U * S, tx, ty);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    paintRest(g, G.rest[v], 1 / REST_U, c, edge);
    sp = SPRITES[key] = { cv, ox: tx / S, oy: ty / S, w: w / S, h: h / S };
    return sp;
  }

  function drawRest(ctx, v, x, y, s, rot, mir, c, edge) {
    const sp = restSprite(v, c, mir, edge);
    const k = s / REST_U;
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.drawImage(sp.cv, -sp.ox * k, -sp.oy * k, sp.w * k, sp.h * k);
    ctx.rotate(-rot);
    ctx.translate(-x, -y);
  }

  function openSprite(v, fi) {
    const S = FILM.S || 1;
    const key = 'o' + v + '|' + fi + '|' + S;
    let sp = SPRITES[key];
    if (sp) return sp;
    const f = OPEN_F[fi];
    const hx = 1.05 * f + 0.1, y0 = -0.74, y1 = 0.7;
    const pad = 2;
    const w = Math.ceil(2 * hx * OPEN_U * S) + 2 * pad, h = Math.ceil((y1 - y0) * OPEN_U * S) + 2 * pad;
    const cv = FILM.makeCanvas(w, h);
    const g = cv.getContext('2d');
    const tx = hx * OPEN_U * S + pad, ty = -y0 * OPEN_U * S + pad;
    g.setTransform(OPEN_U * S, 0, 0, OPEN_U * S, tx, ty);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    paintOpen(g, G.open[v], 1 / OPEN_U, f);
    sp = SPRITES[key] = { cv, ox: tx / S, oy: ty / S, w: w / S, h: h / S };
    return sp;
  }

  function drawOpen(ctx, v, x, y, s, rot, fi) {
    const sp = openSprite(v, fi);
    const k = s / OPEN_U;
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.drawImage(sp.cv, -sp.ox * k, -sp.oy * k, sp.w * k, sp.h * k);
    ctx.rotate(-rot);
    ctx.translate(-x, -y);
  }

  function paintRest(ctx, tp, k, c, edge) {
    // cast shadow onto whatever lies below
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = C.ink;
    ctx.translate(0.05, 0.04);
    ctx.fill(tp.sil);
    ctx.translate(-0.05, -0.04);
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.vein;
    ctx.fill(tp.body);
    ctx.fillStyle = C[HW_COL[c]];
    ctx.fill(tp.hw);
    ctx.fillStyle = C[FW_COL[c]];
    ctx.fill(tp.fw);
    ctx.fillStyle = C.under;
    ctx.fill(tp.apex);
    ctx.fillStyle = C.vein;
    ctx.fill(tp.fwBand);
    ctx.fill(tp.hwBand);
    ctx.strokeStyle = C.vein;
    ctx.lineWidth = 0.05;
    ctx.lineCap = 'round';
    ctx.stroke(tp.spine);
    ctx.lineWidth = 0.85 * k;
    ctx.stroke(tp.veins);
    ctx.lineWidth = 1.6 * k;
    ctx.stroke(tp.costa);
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = C.monarchDeep;
    ctx.lineWidth = 0.9 * k;
    ctx.stroke(tp.hatch);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = edge ? 2 * k : 1.2 * k;
    ctx.stroke(tp.outline);
    ctx.fillStyle = C.spot;
    ctx.fill(tp.dots);
    ctx.fill(tp.bodyDots);
    ctx.strokeStyle = C.vein;
    ctx.lineWidth = 0.9 * k;
    ctx.stroke(tp.ant);
    ctx.fillStyle = C.vein;
    ctx.fill(tp.clubs);
    if (edge) {
      ctx.strokeStyle = C.vein;
      ctx.lineWidth = 1.6 * k;
      ctx.stroke(tp.vein1);
    }
  }

  function paintOpen(ctx, tp, k, f) {
    for (let side = -1; side <= 1; side += 2) {
      ctx.save();
      ctx.scale(side * f, 1);
      ctx.fillStyle = C.monarch;
      ctx.fill(tp.hw);
      ctx.fill(tp.fw);
      ctx.fillStyle = C.vein;
      ctx.fill(tp.tip);
      ctx.fill(tp.costa);
      ctx.fill(tp.fwBand);
      ctx.fill(tp.hwBand);
      ctx.strokeStyle = C.vein;
      ctx.lineWidth = 1.1 * k;
      ctx.stroke(tp.veins);
      ctx.save();
      ctx.beginPath();
      ctx.rect(-0.02, -0.7, 0.42, 1.4);
      ctx.clip();
      ctx.strokeStyle = C.monarchDeep;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 1.4 * k;
      ctx.stroke(tp.hatch);
      ctx.restore();
      ctx.fillStyle = C.spot;
      ctx.fill(tp.dots);
      ctx.fill(tp.apexWhite);
      ctx.fillStyle = C.monarch;
      ctx.fill(tp.apexOrange);
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 1.4 * k;
      ctx.stroke(tp.outline);
      ctx.restore();
    }
    ctx.fillStyle = C.vein;
    ctx.fill(tp.body);
    ctx.strokeStyle = C.vein;
    ctx.lineWidth = 1.1 * k;
    ctx.stroke(tp.ant);
  }

  // Offscreen layers for the butterfly masses. The bitmaps are reused but cleared before every use,
  // so nothing carries from one frame to the next.
  const SHINGLE_BOX = { x: 396, y: 628, w: 350, h: 940 };
  const CLUSTER_BOX = { x: -176, y: -64, w: 360, h: 392 };
  const LAYERS = {};
  function massLayer(name, B) {
    const S = FILM.S || 1;
    const key = name + '|' + S;
    let ly = LAYERS[key];
    if (!ly) {
      const cv = FILM.makeCanvas(Math.ceil(B.w * S), Math.ceil(B.h * S));
      ly = LAYERS[key] = cv.getContext('2d');
    }
    ly.setTransform(1, 0, 0, 1, 0, 0);
    ly.globalCompositeOperation = 'source-over';
    ly.globalAlpha = 1;
    ly.clearRect(0, 0, ly.canvas.width, ly.canvas.height);
    ly.setTransform(S, 0, 0, S, -B.x * S, -B.y * S);
    return ly;
  }
  function blitLayer(ctx, g, B) {
    ctx.drawImage(g.canvas, B.x, B.y, B.w, B.h);
  }

  // Tone on a mass of resting butterflies, painted only onto the wings already in the layer:
  // one flat shadow shape, then 45 degree hatching that thickens toward the shadow side.
  function shadeMass(g, L, poly, shadePoly, dens, seed) {
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      if (p[0] < minX) minX = p[0];
      if (p[0] > maxX) maxX = p[0];
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    }
    const w = maxX - minX || 1, h = maxY - minY || 1;
    g.save();
    g.globalCompositeOperation = 'source-atop';
    g.globalAlpha = 0.5;
    g.fillStyle = C.massShade;
    g.beginPath();
    L.tracePath(g, shadePoly, true);
    g.fill();
    g.globalAlpha = 1;
    L.hatch(g, poly, {
      angle: -Math.PI / 4,
      spacing: 8,
      width: 1.5,
      color: C.monarchDeep,
      alpha: 0.8,
      length: [8, 26],
      gap: [3, 8],
      density: (x, y) => {
        const u = (x - minX) / w;
        if (u < 0.6) return 0;
        return 0.3 + 0.7 * dens(x, y);
      },
      seed,
    });
    L.hatch(g, poly, {
      angle: A105,
      spacing: 7,
      width: 1.3,
      color: C.monarchDeep,
      alpha: 0.8,
      length: [6, 20],
      gap: [4, 10],
      density: (x, y) => {
        const u = (x - minX) / w, v = (y - minY) / h;
        if (u < 0.5 || v < 0.5) return 0;
        return 0.7;
      },
      seed: seed + 11,
    });
    g.restore();
  }

  // frost glints: small four-point stars that twinkle on the boil clock
  function drawGlints(ctx, L, list, bi, tag) {
    ctx.save();
    ctx.fillStyle = C.white;
    for (let k = 0; k < list.length; k++) {
      const h = L.h3(k, bi, 300 + tag);
      if (h < 0.35) continue;
      const g = list[k];
      ctx.globalAlpha = 0.6 + 0.4 * h;
      star4(ctx, g[0], g[1], g[2] * (0.5 + 0.7 * h), 0.15);
    }
    ctx.restore();
  }

  function drawTuft(ctx, L, N, bi, ci) {
    const pB = new Path2D(), pH = new Path2D(), pS = new Path2D();
    for (let i = 0, j = 0; i < N.length; i += 5, j++) {
      const jb = (L.h3(j, bi, 520 + ci) - 0.5) * 1.4;
      pS.moveTo(N[i] + 1.4, N[i + 1] + 2.2);
      pS.lineTo(N[i + 2] + 1.4 + jb, N[i + 3] + 2.2);
      pB.moveTo(N[i], N[i + 1]);
      pB.lineTo(N[i + 2] + jb, N[i + 3]);
      if (N[i + 4]) {
        pH.moveTo(N[i] + (N[i + 2] - N[i]) * 0.35, N[i + 1] + (N[i + 3] - N[i + 1]) * 0.35);
        pH.lineTo(N[i + 2] + jb, N[i + 3]);
      }
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.ink;
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 2.6;
    ctx.stroke(pS);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = C.fir;
    ctx.lineWidth = 2.2;
    ctx.stroke(pB);
    ctx.strokeStyle = C.firLight;
    ctx.lineWidth = 1.2;
    ctx.stroke(pH);
    ctx.restore();
  }

  function airborne(fl, st) {
    return st.bd >= 0 && st.bd - fl.delay >= 0;
  }
  function stampGone(b, st) {
    if (b.fly && airborne(b.fly, st)) return true;
    if (b.hide) {
      for (let i = 0; i < b.hide.length; i++) if (airborne(b.hide[i], st)) return true;
    }
    return false;
  }
  // pose of a burst butterfly at this drawing, or null while it still rests
  function flight(fl, st, x0, y0, s) {
    if (!airborne(fl, st)) return null;
    const dd = st.bd - fl.delay;
    const dist = [30, fl.speed * 0.25, fl.speed * 0.6][Math.min(2, dd)];
    const hx = Math.cos(fl.head), hy = Math.sin(fl.head);
    const lat = fl.wob * [2, 12, 24][Math.min(2, dd)];
    const x = x0 + hx * dist - hy * lat;
    const y = y0 + hy * dist + hx * lat;
    const fi = dd === 0 ? 0 : dd === 1 ? 1 : 2 + fl.flap; // OPEN_F: 0.45, 1, then 0.55, 0.28 or 0.9
    return { x, y, s: s * (fl.sc || 1) * 0.95 * (1 + 0.16 * dd), rot: fl.head + Math.PI / 2 + fl.tilt, fi, delay: fl.delay, v: fl.v };
  }

  // ---------------------------------------------------------------------------
  // moons and overlays
  // ---------------------------------------------------------------------------
  function drawMoon(ctx, L, i, st, bi) {
    const x = MOON_X[i], y = MOON_Y;
    const slotA = st.dawn > 0 ? 0.3 : 0.6;
    ctx.save();
    ctx.globalAlpha = slotA;
    ctx.fillStyle = st.dawn > 0 ? L.mix(C.slot, C.apricot, 0.8 * st.dawn) : C.slot;
    ctx.beginPath();
    ctx.arc(x, y, MOON_R + 11, 0, TAU);
    ctx.fill();
    ctx.restore();
    L.guideCircle(ctx, x, y, MOON_R + 11, { color: C.mist, alpha: 0.65, width: 1.5, dash: [4, 6] });
    const age = st.f - MOON_F[i];
    if (age < 0) return;
    const pop = L.ease.outBack(L.clamp((age + 1) / 3));
    const r = MOON_R * pop;
    const kLit = MOON_K[i];
    const seed = L.hash(ID, 'moon', i);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(MOON_SIDE[i], 1);
    const disc = L.ellipsePts(0, 0, r, r, 48);
    ctx.fillStyle = st.dawn > 0 ? C.moonDawn : C.moonDark;
    ctx.beginPath();
    L.tracePath(ctx, disc, true);
    ctx.fill();
    L.hatch(ctx, disc, { angle: -Math.PI / 4, spacing: 4, width: 1, color: st.dawn > 0 ? C.moonHatch : C.night, alpha: st.dawn > 0 ? 0.5 : 0.8, length: [6, 20], seed: seed + 1 });
    const e = 1 - 2 * kLit;
    const lit = [];
    for (let k = 0; k <= 24; k++) {
      const a = -Math.PI / 2 + (k / 24) * Math.PI;
      lit.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    for (let k = 1; k < 24; k++) {
      const a = Math.PI / 2 - (k / 24) * Math.PI;
      lit.push([e * Math.cos(a) * r, Math.sin(a) * r]);
    }
    ctx.globalAlpha = st.dawn > 0 ? 0.8 : 1;
    ctx.fillStyle = C.white;
    ctx.beginPath();
    L.tracePath(ctx, lit, true);
    ctx.fill();
    ctx.globalAlpha = 1;
    // shade toward the terminator and a few craters
    L.hatch(ctx, lit, {
      angle: -Math.PI / 4,
      spacing: 3.6,
      width: 1,
      color: C.moonHatch,
      alpha: 0.85,
      length: [5, 14],
      density: (px) => 1 - L.smoothstep(e * r * 0.2 - 2, e * r * 0.2 + r * 0.7, px),
      seed: seed + 2,
    });
    ctx.fillStyle = C.moonHatch;
    const rc = L.rng(seed + 3);
    for (let k = 0; k < 5; k++) {
      const cx = rc.range(0.1, 0.75) * r, cy = rc.range(-0.6, 0.6) * r, cr = rc.range(2, 5) * pop;
      if (!L.polyContains(lit, cx, cy)) continue;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    L.inkPath(ctx, lit.slice(24).concat([lit[0]]), { width: 1.4, color: C.inkSoft, seed: seed + 4, taper: [4, 4], wobble: 0.5 });
    L.inkPath(ctx, disc, { closed: true, width: 2.8, seed: seed + 5, taper: [4, 8], wobble: 0.8 });
    ctx.restore();
    // rays on the lit limb
    ctx.save();
    ctx.strokeStyle = C.white;
    ctx.lineCap = 'round';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.7 * L.clamp(age / 2);
    ctx.beginPath();
    const nr = 12;
    for (let k = 0; k < nr; k++) {
      const a = (k / nr) * TAU + 0.13;
      const c = Math.cos(a) * MOON_SIDE[i];
      if (kLit < 0.9 && c < -0.2) continue;
      const l = k % 2 ? 7 : 12;
      const r0 = MOON_R + 16;
      ctx.moveTo(x + Math.cos(a) * r0 * MOON_SIDE[i], y + Math.sin(a) * r0);
      ctx.lineTo(x + Math.cos(a) * (r0 + l) * MOON_SIDE[i], y + Math.sin(a) * (r0 + l));
    }
    ctx.stroke();
    ctx.restore();
    // star twinkle as the moon arrives, then a small steady glint
    const tsz = [7, 14, 18, 13, 9, 6];
    const sz = age < tsz.length ? tsz[age] : 3.5 + 2 * L.h3(i, bi, 77);
    ctx.save();
    ctx.fillStyle = age < 4 ? C.goldLight : C.white;
    star4(ctx, x + 42, y - 40, sz, 0.14);
    ctx.restore();
    // tally ring pops out on arrival
    if (age < 8) {
      const u = L.ease.outExpo(age / 7);
      ctx.save();
      ctx.strokeStyle = C.annYellow;
      ctx.lineWidth = 3 * (1 - age / 9);
      ctx.globalAlpha = Math.min(1, 1.6 * (1 - age / 8));
      ctx.beginPath();
      ctx.arc(x, y, MOON_R + 14 + 34 * u, 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawTally(ctx, L, st) {
    // yellow ruler under the moon row, drawn on to the latest moon
    let last = -1;
    for (let i = 0; i < 5; i++) if (st.f >= MOON_F[i]) last = i;
    if (last < 0) return;
    const age = st.f - MOON_F[last];
    const x0 = MOON_X[0] - 40;
    const prevX = last > 0 ? MOON_X[last - 1] : x0;
    const xEnd = L.lerp(prevX, MOON_X[last], L.ease.outExpo(L.clamp((age + 1) / 6)));
    const y = MOON_Y + 64;
    ctx.save();
    ctx.strokeStyle = C.annYellow;
    ctx.lineCap = 'round';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(xEnd, y);
    for (let i = 0; i <= last; i++) {
      if (MOON_X[i] > xEnd + 0.5) break;
      const l = i === last ? 28 : 12;
      ctx.moveTo(MOON_X[i], y);
      ctx.lineTo(MOON_X[i], y - l);
    }
    for (let x = x0 + 40; x < xEnd - 10; x += 40) {
      if (MOON_X.indexOf(Math.round(x)) >= 0) continue;
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - 6);
    }
    ctx.moveTo(x0, y - 12);
    ctx.lineTo(x0, y + 12);
    ctx.stroke();
    ctx.restore();
  }

  function drawOverlays(ctx, L, st) {
    // blue attention ring around the lower cluster; it lets go when the cluster bursts
    const ringIn = L.ease.outExpo(L.clamp((st.f + 1) / 6));
    const ringOut = st.f >= BURST_F ? L.ease.outExpo(L.clamp((st.f - BURST_F + 1) / 6)) : 0;
    ctx.save();
    ctx.strokeStyle = C.annBlue;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 1 - ringOut;
    ctx.lineWidth = 3;
    ctx.beginPath();
    const rr = RING.r * (1 + 0.3 * ringOut);
    ctx.arc(RING.x, RING.y, rr, -Math.PI / 2, -Math.PI / 2 + TAU * ringIn);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + Math.PI / 4;
      ctx.moveTo(RING.x + Math.cos(a) * (rr - 10), RING.y + Math.sin(a) * (rr - 10));
      ctx.lineTo(RING.x + Math.cos(a) * (rr + 10), RING.y + Math.sin(a) * (rr + 10));
    }
    if (ringIn >= 0.99) ctx.stroke();
    ctx.restore();

    // magenta heading arrow: south-west all winter, flips north-east on T 29.25
    const drawOn = L.ease.outExpo(L.clamp((st.f + 1) / 6));
    const flip = st.f >= BURST_F ? L.ease.outBack(L.clamp((st.f - BURST_F + 1) / 3)) : 0;
    ctx.save();
    ctx.translate(ARROW.x, ARROW.y);
    ctx.rotate(Math.PI * flip);
    const aw = st.f === BURST_F || st.f === BURST_F + 1 ? 4.5 : 3;
    L.arcAnnotation(ctx, 0, 0, ARROW.r, Math.PI, Math.PI * 2.25, { color: C.annMagenta, width: aw, p: drawOn, arrow: 18, dot: 4.5, endTicks: 0 });
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = C.mist;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ARROW.x - 10, ARROW.y);
    ctx.lineTo(ARROW.x + 10, ARROW.y);
    ctx.moveTo(ARROW.x, ARROW.y - 10);
    ctx.lineTo(ARROW.x, ARROW.y + 10);
    ctx.stroke();
    ctx.restore();
    if (st.f >= BURST_F) {
      const age = st.f - BURST_F;
      // the heading of the spring flight: a dashed magenta trajectory drawn on up and to the right
      const pr = L.ease.outExpo((age + 1) / 6);
      const pts = [];
      const n = 40;
      for (let k = 0; k <= Math.round(n * pr); k++) {
        const u = k / n;
        const a = 1 - u;
        pts.push([a * a * 560 + 2 * a * u * 700 + u * u * 1010, a * a * 1180 + 2 * a * u * 760 + u * u * 520]);
      }
      if (pts.length > 1) {
        ctx.save();
        ctx.strokeStyle = C.annMagenta;
        ctx.fillStyle = C.annMagenta;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.setLineDash([14, 10]);
        ctx.beginPath();
        L.tracePath(ctx, pts, false);
        ctx.stroke();
        ctx.setLineDash([]);
        const e = pts[pts.length - 1], q = pts[pts.length - 2];
        const ang = Math.atan2(e[1] - q[1], e[0] - q[0]);
        ctx.beginPath();
        ctx.moveTo(e[0] + Math.cos(ang) * 10, e[1] + Math.sin(ang) * 10);
        ctx.lineTo(e[0] + Math.cos(ang + 2.5) * 14, e[1] + Math.sin(ang + 2.5) * 14);
        ctx.lineTo(e[0] + Math.cos(ang - 2.5) * 14, e[1] + Math.sin(ang - 2.5) * 14);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(560, 1180, 5, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      const u = L.ease.outExpo((age + 1) / 7);
      ctx.save();
      ctx.strokeStyle = C.annMagenta;
      ctx.lineWidth = 3;
      ctx.globalAlpha = Math.max(0, 1 - age / 5);
      ctx.beginPath();
      ctx.arc(ARROW.x, ARROW.y, ARROW.r + 8 + 30 * Math.min(1, u), 0, TAU);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawConstruction(ctx, L) {
    const seed = L.hash(ID, 'construct');
    L.inkLine(ctx, 560, -20, 560, 1940, { width: 1.5, color: C.inkFaint, alpha: 0.6, seed, wobble: 0.6, taper: 0 });
    L.inkLine(ctx, 520, 690, 600, 690, { width: 1.5, color: C.inkFaint, alpha: 0.6, seed: seed + 1, wobble: 0.3, taper: 0 });
    L.inkLine(ctx, 520, 1500, 600, 1500, { width: 1.5, color: C.inkFaint, alpha: 0.6, seed: seed + 2, wobble: 0.3, taper: 0 });
    L.inkLine(ctx, -20, MOON_Y, 1100, MOON_Y, { width: 1.2, color: C.mist, alpha: 0.18, seed: seed + 3, wobble: 0.5, taper: 0 });
    // the circle through the three cluster anchors
    L.guideCircle(ctx, 646, 937, 318, { color: C.mist, alpha: 0.42, width: 1.5, dash: [10, 8], cross: 12 });
    ctx.save();
    ctx.strokeStyle = C.inkFaint;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (const c of CLUSTERS) {
      ctx.moveTo(c.x - 9, c.y);
      ctx.lineTo(c.x + 9, c.y);
      ctx.moveTo(c.x, c.y - 9);
      ctx.lineTo(c.x, c.y + 9);
    }
    ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // the shot
  // ---------------------------------------------------------------------------
  FILM.scene({
    id: ID,
    draw(ctx, t, info) {
      const L = info.lib;
      colours(L);
      build(L);
      const st = timing(t);
      const bi = L.boil(L.T);

      drawSky(ctx, L, st, bi);
      const dawn = st.dawn;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, 1080, 1090);
      ctx.clip();
      drawFar(ctx, L, G.farA, dawn > 0 ? L.mix(C.farA, C.farADawn, dawn) : C.farA, C.mist, st, 'farA', 0.4, 0.4, false);
      ctx.restore();
      ctx.fillStyle = dawn > 0 ? C.hazeDawn : C.haze;
      ctx.fillRect(0, 1080, 1080, 840);
      drawMist(ctx, L, 0, st, dawn);
      // the near silhouettes overlap down to the frame bottom; ink hatch on the shadow side
      drawFar(ctx, L, G.farB, dawn > 0 ? L.mix(C.farB, C.farBDawn, dawn) : C.farB, C.mist, st, 'farB', 0.7, 0.28, true);
      drawMist(ctx, L, 1, st, dawn);
      L.hatch(ctx, null, {
        bounds: { x: 0, y: 1540, w: 1080, h: 380 },
        angle: 0,
        spacing: 10,
        width: 1.3,
        color: C.ink,
        alpha: 0.3,
        length: [20, 70],
        gap: [10, 30],
        seed: L.hash(ID, 'ground'),
      });
      L.stipple(ctx, null, {
        bounds: { x: 0, y: 1540, w: 1080, h: 380 },
        spacing: 8,
        r: [0.7, 1.5],
        color: C.white,
        alpha: 0.75,
        density: 0.2,
        seed: L.hash(ID, 'frostG'),
      });

      const frostBack = new Path2D();
      for (const br of G.branches) {
        if (!br.back) continue;
        drawBranchLimb(ctx, L, br);
        drawSpray(ctx, L, br, bi, frostBack);
      }
      ctx.save();
      ctx.fillStyle = C.white;
      ctx.globalAlpha = 0.85;
      ctx.fill(frostBack);
      ctx.restore();
      const frost = new Path2D();
      for (let i = 0; i < 3; i++) drawTrunk(ctx, L, G.trunks[i], i);
      for (const br of G.branches) {
        if (br.back || br.fg) continue;
        drawBranchLimb(ctx, L, br);
        drawSpray(ctx, L, br, bi, frost);
      }

      // resting monarchs shingled on the middle trunk, inked into their own layer so tone lands only on wings
      const fly = [];
      const jit = (i, k) => (L.h3(i, bi, k) - 0.5) * 0.8;
      {
        const B = SHINGLE_BOX;
        const g = massLayer('shingles', B);
        for (let i = 0; i < G.shingles.length; i++) {
          const b = G.shingles[i];
          if (b.fly) {
            const pose = flight(b.fly, st, b.x, b.y, b.s);
            if (pose) {
              fly.push(pose);
              continue;
            }
          }
          if (stampGone(b, st)) continue;
          drawRest(g, (b.v + bi) % 3, b.x + jit(i, 3), b.y + jit(i, 4), b.s, b.rot, b.mir, b.c, b.edge);
        }
        // the shadow side of the trunk carries round the column
        const tr1 = G.trunks[1];
        shadeMass(g, L, G.shinglePoly, G.shingleShade, (x, y) => L.smoothstep(tr1.cx(y) - 5, tr1.cx(y) + 80, x), L.hash(ID, 'shhatch'));
        blitLayer(ctx, g, B);
      }
      L.stipple(ctx, G.shinglePoly, { spacing: 9, r: [0.8, 1.6], color: C.white, alpha: 0.9, density: 0.12, seed: L.hash(ID, 'frostS') });
      drawGlints(ctx, L, G.shingleGlints, bi, 1);

      // clusters sway 2 degrees on twos
      for (let ci = 0; ci < G.clusters.length; ci++) {
        const cl = G.clusters[ci];
        const sway = ((2 * Math.PI) / 180) * Math.sin(cl.phase + TAU * 0.9 * st.tw);
        const cs = Math.cos(sway), sn = Math.sin(sway);
        const B = CLUSTER_BOX;
        const g = massLayer('cluster' + ci, B);
        for (let i = 0; i < cl.list.length; i++) {
          const b = cl.list[i];
          if (b.fly) {
            const pose = flight(b.fly, st, cl.anchor.x + b.x * cs - b.y * sn, cl.anchor.y + b.x * sn + b.y * cs, b.s);
            if (pose) {
              fly.push(pose);
              continue;
            }
          }
          if (stampGone(b, st)) continue;
          drawRest(g, (b.v + bi) % 3, b.x + jit(i, 5 + ci), b.y + jit(i, 9 + ci), b.s, b.rot, b.mir, b.c, b.edge);
        }
        const dx = cl.anchor.dx || 0, kk = cl.anchor.k;
        shadeMass(g, L, cl.poly, cl.shadePoly, (x, y) => L.smoothstep(dx - 30 * kk, dx + 70 * kk, x - 0.25 * (y - 120 * kk)), L.hash(ID, 'clhatch', ci));
        ctx.save();
        ctx.translate(cl.anchor.x, cl.anchor.y);
        ctx.rotate(sway);
        blitLayer(ctx, g, B);
        L.stipple(ctx, cl.poly, { spacing: 9, r: [0.8, 1.6], color: C.white, alpha: 0.9, density: 0.14, seed: L.hash(ID, 'frostC', ci) });
        drawGlints(ctx, L, cl.glints, bi, 2 + ci);
        ctx.restore();
        drawTuft(ctx, L, cl.tuft, bi, ci);
      }
      ctx.save();
      ctx.fillStyle = C.white;
      ctx.globalAlpha = 0.85;
      ctx.fill(frost);
      ctx.restore();

      // a thin front mist pass so the trunks sit in haze, holes cut for the masses
      ctx.save();
      ctx.beginPath();
      ctx.rect(-4, -4, 1088, 1928);
      L.tracePath(ctx, G.shinglePoly, true);
      for (let ci = 0; ci < G.clusters.length; ci++) {
        const cl = G.clusters[ci];
        const sway = ((2 * Math.PI) / 180) * Math.sin(cl.phase + TAU * 0.9 * st.tw);
        const cs = Math.cos(sway), sn = Math.sin(sway);
        const world = [];
        for (let k = 0; k < cl.poly.length; k++) {
          const p = cl.poly[k];
          world.push([cl.anchor.x + p[0] * cs - p[1] * sn, cl.anchor.y + p[0] * sn + p[1] * cs]);
        }
        L.tracePath(ctx, world, true);
      }
      ctx.clip('evenodd');
      drawMist(ctx, L, 0, st, dawn, true);
      drawMist(ctx, L, 1, st, dawn, true);
      ctx.restore();

      if (st.bd >= 0 && G.crumbs) {
        ctx.save();
        ctx.lineCap = 'round';
        for (let k = 0; k < G.crumbs.length; k++) {
          const c = G.crumbs[k];
          const dd = st.bd - c.delay;
          if (dd < 0) continue;
          const y = c.y + 12 * dd;
          ctx.save();
          ctx.translate(c.x, y);
          ctx.rotate(c.rot);
          if (c.kind === 0) {
            ctx.strokeStyle = C.fir;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(c.a) * c.len, Math.sin(c.a) * c.len);
            ctx.stroke();
          } else {
            ctx.strokeStyle = C.barkDeep;
            ctx.lineWidth = 2.8;
            ctx.beginPath();
            ctx.moveTo(-c.len * 0.35, 0);
            ctx.lineTo(c.len * 0.35, 3);
            ctx.stroke();
          }
          ctx.restore();
        }
        ctx.restore();
      }

      // the burst, on twos; delayed flyers first so the leaders sit on top
      fly.sort((a, b) => b.delay - a.delay);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let k = 0; k < fly.length; k++) {
        const p = fly[k];
        drawOpen(ctx, p.v, p.x, p.y, p.s, p.rot, p.fi);
      }
      ctx.restore();

      for (const br of G.branches) {
        if (!br.fg) continue;
        drawBranchLimb(ctx, L, br);
        drawSpray(ctx, L, br, bi, null);
      }

      drawConstruction(ctx, L);
      for (let i = 0; i < 5; i++) drawMoon(ctx, L, i, st, bi);
      drawTally(ctx, L, st);
      drawOverlays(ctx, L, st);
    },
  });
})();
