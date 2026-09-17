// Shot 11 scale-mosaic: "Push-in: the wing is a mosaic". Illustrated, global T 19.5 to 22.0 (2.5 s).
// Opens on the inked hanging adult (G4) at zoom 1.08 with (735, 1400) fixed on screen, then pushes
// exponentially into that point: zoom 4 on 20.0, 12 on 20.5 (flat colour breaks into tiles),
// 32 on 21.0 (tiles resolve into shingled scales, magenta ring), a slow drift to 40, and on 21.5
// one orange scale tilts up on its stalk while a glint runs along its ridges.
//
// One colour field in world coordinates (forewing polygons, black bands, vein ribbons, white spots)
// is drawn flat at low zoom and sampled per tile and per scale at high zoom, so every level agrees.
//
// Layers, back to front:
//   1. stripes (stripeCream / stripeApricot), screen space with a slow parallax zoom
//   2. world illustration under the camera: twig, pad, cremaster, split G3 shell, G4 body,
//      hindwing, forewing (fill, hatching, nap, bands, veins, spots, ink outline)
//   3. tiles (T 20.5 to 21.0) then shingled scales (T 21.0 on), screen space from one lattice
//   4. construction circles around the target (world radii, inkFaint)
//   5. screen-fixed overlays: annYellow target ring and zoom dial, annBlue row guides and scale bar,
//      annMagenta ring pop on 21.0
(function () {
  'use strict';
  const FILM = window.FILM;
  const L = FILM.lib;
  const TAU = Math.PI * 2;
  const ID = 'scale-mosaic';

  const P = {};
  for (const k of Object.keys(L.pal)) P[k] = L.pal[k];

  const sd = (...k) => L.hash(ID, ...k) & 0x7fffffff;
  const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, u) => a + (b - a) * u;
  const sstep = (a, b, x) => L.smoothstep(a, b, x);
  const h3 = L.h3;
  const E = L.ease;

  // ---------------------------------------------------------------------------
  // Camera: exponential push on the beats, target (735, 1400)
  // ---------------------------------------------------------------------------
  const TX = 735, TY = 1400;
  const ZS = [1.08, 4, 12, 32, 40];
  const LZ = ZS.map(Math.log);
  const RISE = 20; // screen px the camera rises during the last second

  function camAt(t) {
    t = clamp(t, 0, 2.5);
    let lz, k = 0, rise = 0;
    if (t < 0.25) {
      // hold the 10>11 match cut for 6 frames, creeping 1.08 → 1.13
      lz = lerp(Math.log(1.08), Math.log(1.13), t / 0.25);
      k = 1;
    } else if (t < 0.5) {
      const u = E.inOutExpo((t - 0.25) / 0.25);
      lz = lerp(Math.log(1.13), Math.log(4), u);
      k = 1 - u;
    } else if (t < 0.75) {
      lz = lerp(Math.log(4), Math.log(4.3), (t - 0.5) / 0.25);
    } else if (t < 1.0) {
      lz = lerp(Math.log(4.3), Math.log(12), E.inOutExpo((t - 0.75) / 0.25));
    } else if (t < 1.25) {
      // creep 12 → 13 while the tiles break, so the grid is seen at zoom 12
      lz = lerp(Math.log(12), Math.log(13), (t - 1.0) / 0.25);
    } else if (t < 1.5) {
      lz = lerp(Math.log(13), Math.log(32), E.inOutExpo((t - 1.25) / 0.25));
    } else {
      const u = E.inOutSine((t - 1.5) / 1.0);
      lz = lerp(LZ[3], LZ[4], u);
      rise = RISE * u;
    }
    const z = Math.exp(lz);
    return { z, k, x: TX - (195 * k) / z, y: TY - (440 * k) / z - rise / z, rise };
  }

  // ---------------------------------------------------------------------------
  // Geometry helpers
  // ---------------------------------------------------------------------------
  function cumLen(pts) {
    const c = [0];
    for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return c;
  }
  function tangentAt(pts, i) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b[0] - a[0], ty = b[1] - a[1];
    const l = Math.hypot(tx, ty) || 1;
    return [tx / l, ty / l];
  }
  // a filled band along an open centreline: full width w(u), rounded ends
  function ribbonPoly(center, wFn) {
    const cum = cumLen(center);
    const T = cum[cum.length - 1] || 1;
    const left = [], right = [];
    for (let i = 0; i < center.length; i++) {
      const [tx, ty] = tangentAt(center, i);
      const w = wFn(cum[i] / T) / 2;
      left.push([center[i][0] - ty * w, center[i][1] + tx * w]);
      right.push([center[i][0] + ty * w, center[i][1] - tx * w]);
    }
    const n = center.length - 1;
    const [ex, ey] = tangentAt(center, n), [bx, by] = tangentAt(center, 0);
    const we = wFn(1) / 2, wb = wFn(0) / 2;
    const capE = [center[n][0] + ex * we * 0.8, center[n][1] + ey * we * 0.8];
    const capB = [center[0][0] - bx * wb * 0.8, center[0][1] - by * wb * 0.8];
    return left.concat([capE], right.reverse(), [capB]);
  }
  // a band between a polyline pushed outward by ext and inward by w(u) (inward = normal toward cx, cy)
  function edgeBand(pts, cx, cy, wFn, ext) {
    const cum = cumLen(pts);
    const T = cum[cum.length - 1] || 1;
    const outer = [], inner = [];
    for (let i = 0; i < pts.length; i++) {
      let [tx, ty] = tangentAt(pts, i);
      let nx = -ty, ny = tx;
      if ((cx - pts[i][0]) * nx + (cy - pts[i][1]) * ny < 0) {
        nx = -nx;
        ny = -ny;
      }
      const w = wFn(cum[i] / T);
      outer.push([pts[i][0] - nx * ext, pts[i][1] - ny * ext]);
      inner.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
    }
    return outer.concat(inner.reverse());
  }

  // polygons with a y-bucketed edge index, so point tests stay cheap for thousands of tiles
  const BH = 3;
  function makePoly(pts) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of pts) {
      if (p[0] < x0) x0 = p[0];
      if (p[1] < y0) y0 = p[1];
      if (p[0] > x1) x1 = p[0];
      if (p[1] > y1) y1 = p[1];
    }
    const n = pts.length;
    const Ed = new Float64Array(n * 4);
    const nb = Math.max(1, Math.ceil((y1 - y0) / BH) + 1);
    const buckets = [];
    for (let k = 0; k < nb; k++) buckets.push([]);
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      Ed[i * 4] = a[0];
      Ed[i * 4 + 1] = a[1];
      Ed[i * 4 + 2] = b[0];
      Ed[i * 4 + 3] = b[1];
      const k0 = Math.floor((Math.min(a[1], b[1]) - y0) / BH);
      const k1 = Math.min(nb - 1, Math.floor((Math.max(a[1], b[1]) - y0) / BH));
      for (let k = k0; k <= k1; k++) buckets[k].push(i);
    }
    return { pts, x0, y0, x1, y1, Ed, buckets: buckets.map((b) => Int32Array.from(b)) };
  }
  function inPoly(g, x, y) {
    if (x < g.x0 || x > g.x1 || y < g.y0 || y > g.y1) return false;
    const list = g.buckets[Math.floor((y - g.y0) / BH)];
    if (!list) return false;
    const Ed = g.Ed;
    let inside = false;
    for (let q = 0; q < list.length; q++) {
      const i = list[q] * 4;
      const ay = Ed[i + 1], by = Ed[i + 3];
      if (ay > y !== by > y) {
        const ax = Ed[i], bx = Ed[i + 2];
        if (x < ax + ((y - ay) * (bx - ax)) / (by - ay)) inside = !inside;
      }
    }
    return inside;
  }
  function tracePts(ctx, pts, closed = true) {
    for (let i = 0; i < pts.length; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, pts[i][0], pts[i][1]);
    if (closed) ctx.closePath();
  }
  function fillPts(ctx, pts, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    tracePts(ctx, pts);
    ctx.fill();
    ctx.restore();
  }
  function bbOf(pts, pad = 0) {
    const b = L.bounds(pts);
    return { x0: b.x - pad, y0: b.y - pad, x1: b.x + b.w + pad, y1: b.y + b.h + pad };
  }
  const hits = (b, w) => !(b.x1 < w.x0 || b.x0 > w.x1 || b.y1 < w.y0 || b.y0 > w.y1);

  // inkPath under the camera with every pen size kept in screen pixels
  function ink(ctx, pts, z, o) {
    const w = o.width != null ? o.width : 3;
    const q = Object.assign({}, o);
    q.width = w / z;
    q.wobble = (o.wobble != null ? o.wobble : 2) / z;
    q.tremble = (o.tremble != null ? o.tremble : 0.4) / z;
    q.rough = (o.rough != null ? o.rough : 0.22 + w * 0.07) / z;
    q.boilAmp = (o.boilAmp != null ? o.boilAmp : 0.7) / z;
    q.step = Math.max(0.55, (o.step || 2.5) / Math.max(1, z));
    const tp = o.taper != null ? o.taper : o.closed ? [10, 22] : [18, 34];
    q.taper = Array.isArray(tp) ? [tp[0] / z, tp[1] / z] : tp / z;
    q.overlap = (o.overlap != null ? o.overlap : 14) / z;
    if (o.double) {
      const d = o.double === true ? {} : o.double;
      q.double = Object.assign({}, d, { offset: ((w / 2 + 3) / z) * (d.side || 1) });
    }
    L.inkPath(ctx, pts, q);
  }

  // ---------------------------------------------------------------------------
  // Forewing: outline, colour field, veins, spots (world coordinates, G4)
  // ---------------------------------------------------------------------------
  const FW_COSTA = [[565, 985], [588, 1000], [610, 1045], [655, 1110], [697, 1185], [730, 1260], [770, 1335], [784, 1400], [790, 1450]];
  // outer margin apex -> tornus, a rounded apex so the scales fill the frame at zoom 40
  const FW_MARGIN_RAW = [[790, 1450], [777, 1453], [760, 1451], [740, 1445], [718, 1434], [696, 1415], [672, 1392], [646, 1368], [620, 1345], [596, 1323], [576, 1305], [560, 1290]];
  const FW_INNER = [[560, 1290], [558, 1200], [560, 1100], [562, 1030]];
  const FW_OUT = L.smoothPts(FW_COSTA.concat(FW_MARGIN_RAW.slice(1, -1), FW_INNER), true, 3);
  const FW = makePoly(FW_OUT);
  const FW_BB = { x0: FW.x0, y0: FW.y0, x1: FW.x1, y1: FW.y1 };
  const FW_MARGIN = L.smoothPts(FW_MARGIN_RAW, false, 3);

  // inner edge of the black margin, apex -> tornus, scalloped between vein ends
  const MARGIN_INNER = L.smoothPts(
    [[800, 1410], [786, 1418], [776, 1421], [767, 1417], [752, 1405], [735, 1400], [718, 1390], [703, 1381], [688, 1377], [671, 1360], [655, 1351], [638, 1332], [620, 1320], [602, 1300], [585, 1291], [568, 1274], [552, 1262]],
    false,
    3
  );
  const MARGIN_OUTER = FW_MARGIN.map((p, i) => {
    const [tx, ty] = tangentAt(FW_MARGIN, i);
    return [p[0] + ty * 14, p[1] - tx * 14]; // pushed outward (left of apex->tornus travel)
  });
  const BAND_MARGIN = makePoly([[806, 1470]].concat(MARGIN_OUTER, [[540, 1300], [540, 1262]], MARGIN_INNER.slice().reverse()));
  const BAND_COSTA = makePoly(edgeBand(L.smoothPts(FW_COSTA, false, 6), 650, 1220, (u) => 6 + 13 * u * u, 12));
  const BAND_INNER = makePoly(edgeBand(L.smoothPts(FW_INNER.concat([[565, 985]]), false, 6), 660, 1150, () => 9, 12));
  const APEX_TIP = makePoly(L.smoothPts([[752, 1300], [766, 1372], [778, 1432], [792, 1456], [804, 1430], [796, 1370], [780, 1300], [760, 1262]], true, 4));

  const veinW = (base, flare) => (u) => base * 13 * lerp(1, 0.58, u) + (flare ? 9 * Math.pow(sstep(0.78, 1, u), 2) : 0);
  const FW_VEIN_DEFS = [
    { p: [[567, 990], [620, 1050], [675, 1125], [722, 1205], [752, 1272]], w: veinW(0.62, false) }, // Sc
    { p: [[570, 995], [630, 1080], [685, 1170], [712, 1199]], w: veinW(0.95, false) }, // R stem
    { p: [[568, 1005], [585, 1100], [612, 1190], [645, 1225]], w: veinW(0.95, false) }, // Cu stem
    { p: [[712, 1199], [688, 1213], [662, 1221], [645, 1225]], w: veinW(0.5, false) }, // discocellular
    { p: [[690, 1182], [730, 1250], [766, 1318]], w: veinW(0.6, false) }, // R1
    { p: [[704, 1218], [742, 1296], [778, 1370]], w: veinW(0.6, false) }, // R2
    { p: [[712, 1199], [736, 1288], [750, 1318]], w: veinW(0.75, false) }, // R3-5 stalk
    { p: [[750, 1318], [772, 1370], [787, 1424]], w: veinW(0.55, false) }, // R3
    { p: [[750, 1318], [764, 1372], [777, 1432]], w: veinW(0.55, true) }, // R4+5
    // M1, the target vein: even turn from the cell through (729,1379) and (742,1394)
    {
      p: [[697, 1208], [697, 1245], [697, 1270], [699, 1295], [704, 1319], [711, 1343], [720, 1366], [732, 1388], [747, 1409], [764, 1427]],
      w: (u) => lerp(9.5, 6.5, sstep(0, 0.6, u)) + 0.7 * sstep(0.55, 0.72, u) * (1 - sstep(0.9, 0.98, u)) + 10 * Math.pow(sstep(0.86, 1, u), 2),
    },
    { p: [[676, 1213], [688, 1320], [692, 1360], [691, 1386]], w: veinW(0.7, true) }, // M2
    { p: [[662, 1221], [670, 1312], [672, 1364]], w: veinW(0.7, true) }, // M3
    { p: [[628, 1228], [636, 1290], [639, 1338]], w: veinW(0.75, true) }, // Cu1
    { p: [[600, 1160], [600, 1250], [603, 1306]], w: veinW(0.75, true) }, // Cu2
    { p: [[566, 1000], [563, 1150], [563, 1282]], w: veinW(0.75, false) }, // 2A
  ];
  const FW_VEINS = FW_VEIN_DEFS.map((v) => {
    const c = L.smoothPts(v.p, false, 3);
    const poly = ribbonPoly(c, v.w);
    return { c, poly, g: makePoly(poly) };
  });

  // white spots [x, y, r]
  const FW_SPOTS = (() => {
    const s = [
      [735, 1411, 8], // the push-in spot
      [686, 1392, 5.5], [651, 1360, 5], [618, 1333, 4.5], [584, 1302, 4], [779, 1437, 4.5],
      [740, 1345, 4.5], [744, 1364, 3.8], // subapical pair in the cell above the target vein
    ];
    // outer row: small spots 8.5 px inside the margin
    const cum = cumLen(FW_MARGIN);
    const T = cum[cum.length - 1];
    let i = 0;
    for (let d = 14; d < T - 10; d += 19.5) {
      while (i < cum.length - 1 && cum[i] < d) i++;
      const [tx, ty] = tangentAt(FW_MARGIN, i);
      s.push([FW_MARGIN[i][0] - ty * 8.5, FW_MARGIN[i][1] + tx * 8.5, 2.9 + 0.5 * h3(i, 5, 77)]);
    }
    return s;
  })();

  const FW_BLACK = [BAND_MARGIN, BAND_COSTA, BAND_INNER].concat(FW_VEINS.map((v) => v.g));
  const C_OUT = -1, C_OR = 0, C_BK = 1, C_WH = 2, C_UN = 3;
  function field(x, y) {
    if (!inPoly(FW, x, y)) return C_OUT;
    for (let i = 0; i < FW_SPOTS.length; i++) {
      const s = FW_SPOTS[i];
      const dx = x - s[0];
      if (dx > s[2] || dx < -s[2]) continue;
      const dy = y - s[1];
      if (dx * dx + dy * dy < s[2] * s[2]) return C_WH;
    }
    for (let i = 0; i < FW_BLACK.length; i++) if (inPoly(FW_BLACK[i], x, y)) return C_BK;
    if (inPoly(APEX_TIP, x, y)) return C_UN;
    return C_OR;
  }

  // ---------------------------------------------------------------------------
  // Hindwing (underside, mostly behind the forewing)
  // ---------------------------------------------------------------------------
  const HW_OUT = L.smoothPts([[570, 1005], [600, 1015], [650, 1060], [710, 1140], [750, 1230], [768, 1300], [765, 1345], [745, 1375], [710, 1400], [670, 1414], [620, 1420], [592, 1410], [576, 1385], [570, 1340], [570, 1200], [570, 1080]], true, 4);
  const HW_MARGIN = L.smoothPts([[768, 1300], [765, 1345], [745, 1375], [710, 1400], [670, 1414], [620, 1420], [592, 1410], [576, 1385], [570, 1340], [570, 1290]], false, 5);
  const HW_BAND = edgeBand(HW_MARGIN, 660, 1250, () => 30, 12);
  const HW_VEINS = [
    [[575, 1012], [630, 1120], [660, 1215]],
    [[660, 1215], [650, 1230], [640, 1240]],
    [[640, 1240], [605, 1200], [580, 1100], [572, 1010]],
    [[640, 1080], [700, 1150], [745, 1250], [762, 1330]],
    [[660, 1215], [712, 1300], [746, 1374]],
    [[652, 1225], [690, 1320], [708, 1401]],
    [[640, 1240], [656, 1330], [668, 1414]],
    [[622, 1224], [622, 1330], [621, 1420]],
    [[605, 1200], [592, 1300], [585, 1403]],
    [[580, 1110], [572, 1250], [571, 1352]],
  ].map((p) => {
    const c = L.smoothPts(p, false, 5);
    return { c, poly: ribbonPoly(c, (u) => 10 * lerp(1, 0.6, u)), edge: ribbonPoly(c, (u) => 10 * lerp(1, 0.6, u) + 7) };
  });
  const HW_SPOTS = (() => {
    const s = [];
    const cum = cumLen(HW_MARGIN);
    const T = cum[cum.length - 1];
    let i = 0;
    for (let k = 0; k < 11; k++) {
      const d = T * (0.05 + (0.9 * k) / 10);
      while (i < cum.length - 1 && cum[i] < d) i++;
      let [tx, ty] = tangentAt(HW_MARGIN, i);
      let nx = -ty, ny = tx;
      if ((660 - HW_MARGIN[i][0]) * nx + (1250 - HW_MARGIN[i][1]) * ny < 0) {
        nx = -nx;
        ny = -ny;
      }
      s.push([HW_MARGIN[i][0] + nx * 8, HW_MARGIN[i][1] + ny * 8, 3.2]);
      if (k % 2 === 1) s.push([HW_MARGIN[i][0] + nx * 20, HW_MARGIN[i][1] + ny * 20, 4.8]);
    }
    return s;
  })();

  // ---------------------------------------------------------------------------
  // Twig, pad, cremaster, split G3 shell
  // ---------------------------------------------------------------------------
  const TWIG = (() => {
    const top = [], bot = [];
    for (let x = -60; x <= 1140; x += 30) {
      const far = Math.min(1, Math.abs(x - 540) / 220);
      top.push([x, 236 + 7 * L.noise1(x / 260, sd('twT')) + 3 * L.noise1(x / 60, sd('twT2')) - (x - 540) * 0.012]);
      bot.push([x, 300 + far * (6 * L.noise1(x / 240, sd('twB')) + (x - 540) * 0.01)]);
    }
    return { top, bot, poly: top.concat(bot.slice().reverse()) };
  })();
  const G3 = [[332, 35], [380, 72], [440, 106], [500, 124], [600, 130], [700, 127], [800, 108], [860, 78], [895, 36], [905, 0]];
  function g3hw(y) {
    if (y <= G3[0][0]) return G3[0][1];
    for (let i = 0; i < G3.length - 1; i++) {
      const [y0, h0] = G3[i], [y1, h1] = G3[i + 1];
      if (y <= y1) {
        const u = (y - y0) / (y1 - y0);
        return lerp(h0, h1, u * u * (3 - 2 * u) * 0.35 + u * 0.65);
      }
    }
    return 0;
  }
  const SHELL = (() => {
    // 09's torn rim at y 872 (no V flap), so the 09>11 hang matches
    const SPLIT_Y = 872;
    const XL = 540 - g3hw(SPLIT_Y), XR = 540 + g3hw(SPLIT_Y);
    const JAG_L = [[3, 9], [10, 7], [15, 15], [22, 13], [28, 21], [35, 20]];
    const JAG_R = [[3, 9], [10, 7], [16, 16], [23, 14], [29, 22], [36, 21]];
    const right = [], left = [];
    for (let y = 332; y <= SPLIT_Y; y += 12) right.push([540 + g3hw(y), y]);
    for (let y = SPLIT_Y; y >= 332; y -= 12) left.push([540 - g3hw(y), y]);
    const rTorn = JAG_R.map(([dx, dy]) => [XR - dx, SPLIT_Y + dy]);
    const lTorn = JAG_L.map(([dx, dy]) => [XL + dx, SPLIT_Y + dy]);
    const lt = lTorn[lTorn.length - 1], rt = rTorn[rTorn.length - 1];
    const bot = Math.max(lt[1], rt[1]) + 4;
    const outline = [[540, 331]].concat(right, rTorn, [[lerp(rt[0], lt[0], 0.3), bot], [lerp(rt[0], lt[0], 0.7), bot]], lTorn.slice().reverse(), left);
    const hole = [[XL, SPLIT_Y]].concat(lTorn, [[lerp(lt[0], rt[0], 0.3), bot], [lerp(lt[0], rt[0], 0.7), bot]], rTorn.slice().reverse());
    return { outline, hole, rTorn: [[XR, SPLIT_Y - 1]].concat(rTorn), lTorn: [[XL, SPLIT_Y - 1]].concat(lTorn), backRim: [[XR - 10, SPLIT_Y + 6], [540, SPLIT_Y + 12], [XL + 10, SPLIT_Y + 6]] };
  })();
  const PAD = (() => {
    const r = L.rng(sd('pad'));
    const s = [];
    for (let i = 0; i < 120; i++) {
      const a = r() * TAU, rad = Math.sqrt(r());
      s.push([540 + Math.cos(a) * 44 * rad, 310 + Math.sin(a) * 11 * rad, r.range(8, 22), r.range(-0.5, 0.5) + (r() < 0.25 ? Math.PI / 2 : 0), r.range(-5, 5), r() < 0.72]);
    }
    return s;
  })();

  function drawSet(ctx, z, win) {
    // twig
    if (win.y0 < 330) {
      fillPts(ctx, TWIG.poly, P.bark);
      L.hatch(ctx, TWIG.poly, { angle: -0.012, spacing: 5, width: 1.3 / z, color: P.ink, alpha: 0.75, length: [30, 110], gap: [3, 12], boilAmp: 0.45 / z, density: (x, y) => sstep(248, 296, y) * 0.95 + 0.1, seed: sd('twH') });
      L.hatch(ctx, TWIG.poly, { angle: -0.012, spacing: 7, width: 1.2 / z, color: P.tan, alpha: 0.55, length: [20, 80], gap: [6, 20], boilAmp: 0.45 / z, density: (x, y) => 1 - sstep(240, 262, y), seed: sd('twL') });
      for (let k = 0; k < 4; k++) {
        const pts = [];
        for (let x = -30; x <= 1110; x += 45) pts.push([x, 250 + k * 12 + 4 * L.noise1(x / 90 + k * 3.1, sd('rdg')) - (x - 540) * 0.006 * (1 - k / 4)]);
        ink(ctx, pts, z, { width: 1.5, color: k < 2 ? P.tan : P.ink, alpha: k < 2 ? 0.45 : 0.6, seed: sd('rdg', k), taper: [40, 60] });
      }
      for (const [kx, ky, rx, ry] of [[210, 266, 22, 13], [872, 262, 17, 11]]) {
        ink(ctx, L.ellipsePts(kx, ky, rx, ry, 24, -0.08), z, { closed: true, width: 2.4, color: P.ink, fill: P.inkSoft, seed: sd('knot', kx) });
        ink(ctx, L.ellipsePts(kx + 2, ky + 1, rx * 0.5, ry * 0.45, 16, -0.08), z, { closed: true, width: 1.6, color: P.ink, alpha: 0.8, seed: sd('knot2', kx) });
      }
      ink(ctx, TWIG.top, z, { width: 3, color: P.ink, seed: sd('twTop'), taper: 0 });
      ink(ctx, TWIG.bot, z, { width: 3.4, color: P.ink, seed: sd('twBot'), taper: 0 });
      // diagonal side shoot as in 09, up-left off the top edge
      const shL = [[262, 250], [228, 180], [176, 90], [120, -10], [96, -60]];
      const shR = [[196, 246], [170, 176], [124, 92], [74, -2], [52, -60]];
      const shPts = L.smoothPts(shL.concat(shR.slice().reverse()), true, 6);
      fillPts(ctx, shPts, P.bark);
      L.hatch(ctx, shPts, { angle: -2.05, spacing: 7, width: 1.6 / z, color: P.tan, alpha: 0.45, length: [14, 44], boilAmp: 0.45 / z, seed: sd('shHatchL'), density: (x, y) => 1 - clamp((x - 80 - (250 - y) * 0.55) / 40) });
      L.hatch(ctx, shPts, { angle: -2.05, spacing: 4.5, width: 1.3 / z, color: P.ink, alpha: 0.8, length: [20, 70], boilAmp: 0.45 / z, seed: sd('shHatchD'), density: (x, y) => clamp((x - 95 - (250 - y) * 0.55) / 40) });
      ink(ctx, L.smoothPts(shL, false, 6), z, { width: 3, seed: sd('shL'), taper: [4, 20] });
      ink(ctx, L.smoothPts(shR, false, 6), z, { width: 3, seed: sd('shR'), taper: [4, 20] });
      ink(ctx, L.ellipsePts(150, 70, 7, 5, 12, -1.1), z, { closed: true, width: 1.6, fill: L.mix(P.bark, P.tan, 0.3), seed: sd('shKnot') });
      // silk pad
      fillPts(ctx, L.ellipsePts(540, 308, 50, 15, 28), P.inkSoft, 0.35);
      const b = L.boil(L.T);
      ctx.save();
      ctx.lineCap = 'round';
      for (const pass of [0, 1]) {
        ctx.beginPath();
        for (let i = 0; i < PAD.length; i++) {
          const [x, y, len, ang, bend, white] = PAD[i];
          if ((pass === 1) !== white) continue;
          const jx = (h3(i, b, 31) - 0.5) * 1.2, jy = (h3(b, i, 37) - 0.5) * 1.2;
          const dx = Math.cos(ang) * len * 0.5, dy = Math.sin(ang) * len * 0.5;
          ctx.moveTo(x - dx + jx, y - dy + jy);
          ctx.quadraticCurveTo(x - Math.sin(ang) * bend, y + Math.cos(ang) * bend, x + dx - jy, y + dy + jx);
        }
        ctx.strokeStyle = pass ? P.white : P.inkSoft;
        ctx.globalAlpha = pass ? 1 : 0.7;
        ctx.lineWidth = (pass ? 1.7 : 1.1) / z;
        ctx.stroke();
      }
      ctx.restore();
      ink(ctx, [[540, 302], [539, 318], [540, 334]], z, { width: 10, color: P.veinBlack, taper: [3, 2], minWidth: 0.6, seed: sd('crem') });
    }
    // empty shell
    if (win.y0 < 940) {
      const g = SHELL;
      fillPts(ctx, g.outline, P.mist, 0.3);
      fillPts(ctx, g.hole, L.mix(P.mist, P.inkSoft, 0.4), 0.6);
      L.hatch(ctx, g.hole, { angle: -Math.PI / 4, spacing: 5, width: 1.1 / z, color: P.inkSoft, alpha: 0.5, length: [8, 20], boilAmp: 0.45 / z, seed: sd('holeH') });
      L.hatch(ctx, g.outline, { angle: 0.08, spacing: 7, width: 1.2 / z, color: P.inkSoft, alpha: 0.55, bend: 1.2, length: [18, 52], gap: [2, 5], boilAmp: 0.45 / z, density: (x, y) => sstep(560, 655, x + (y > 780 ? 30 : 0)) * 0.9, seed: sd('shH') });
      L.stipple(ctx, g.outline, { spacing: 9, r: [0.7 / z, 1.4 / z], color: P.inkFaint, alpha: 0.45, boilAmp: 0.35 / z, density: (x) => 0.15 + 0.45 * sstep(480, 660, x), seed: sd('shSt') });
      ctx.save();
      ctx.beginPath();
      tracePts(ctx, g.outline);
      ctx.clip();
      const band = [];
      for (let k = 0; k <= 20; k++) band.push([400 + 14 * k, 504 + 11 * Math.sin((Math.PI * k) / 20)]);
      for (let k = 20; k >= 0; k--) band.push([400 + 14 * k, 515 + 11 * Math.sin((Math.PI * k) / 20)]);
      fillPts(ctx, band, L.mix(P.veinBlack, P.mist, 0.18), 0.85);
      L.hatch(ctx, [[452, 360], [500, 345], [500, 470], [440, 480]], { angle: -1.25, spacing: 9, width: 1.6 / z, color: P.white, alpha: 0.8, length: [30, 60], boilAmp: 0.45 / z, seed: sd('glz') });
      ctx.restore();
      const dull = L.mix(P.gold, P.mist, 0.45);
      ctx.save();
      ctx.fillStyle = dull;
      ctx.strokeStyle = P.inkSoft;
      ctx.lineWidth = 1 / z;
      for (let i = 0; i < 12; i++) {
        const a = -1.35 + (2.7 * i) / 11;
        ctx.beginPath();
        ctx.arc(540 + 116 * Math.sin(a), 520 + 11 * Math.cos(a * 0.93), 6, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      for (const [x, y, r] of [[428, 560, 5.5], [448, 560, 5.5], [632, 560, 5.5], [652, 560, 5.5], [488, 828, 5], [592, 828, 5]]) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      ink(ctx, [[430, 560], [446, 660], [470, 760], [500, 815]], z, { width: 1.8, color: P.inkSoft, alpha: 0.6, seed: sd('wcl'), taper: [20, 30] });
      for (const [y, w] of [[372, 62], [404, 88], [440, 104]]) ink(ctx, [[540 - w, y], [540, y + 7], [540 + w, y]], z, { width: 1.4, color: P.inkSoft, alpha: 0.45, seed: sd('seg', y), taper: [16, 16] });
      ink(ctx, g.outline, z, { closed: true, width: 3, color: P.ink, alpha: 0.62, seed: sd('shLine'), double: { alpha: 0.3 } });
      ink(ctx, g.rTorn, z, { width: 2.2, color: P.ink, alpha: 0.8, seed: sd('tornR'), smooth: false, taper: [4, 10] });
      ink(ctx, g.lTorn, z, { width: 2.2, color: P.ink, alpha: 0.8, seed: sd('tornL'), smooth: false, taper: [10, 4] });
      ink(ctx, g.backRim, z, { width: 1.6, color: P.ink, alpha: 0.55, seed: sd('backRim'), taper: [6, 6] });
    }
  }

  // ---------------------------------------------------------------------------
  // Body (G4, slim abdomen)
  // ---------------------------------------------------------------------------
  const ABD = (() => {
    const prof = [[0, 0.6], [0.08, 0.86], [0.22, 1], [0.42, 0.97], [0.62, 0.84], [0.78, 0.64], [0.9, 0.4], [0.97, 0.18], [1, 0]];
    const pf = (u) => {
      for (let i = 1; i < prof.length; i++) if (u <= prof[i][0]) return lerp(prof[i - 1][1], prof[i][1], (u - prof[i - 1][0]) / (prof[i][0] - prof[i - 1][0]));
      return 0;
    };
    const hw = 25, top = 1027, bot = 1175;
    const R = [], Lf = [];
    for (let k = 0; k <= 16; k++) {
      const u = k / 16, y = lerp(top, bot, u);
      R.push([540 + hw * pf(u), y]);
      Lf.push([540 - hw * pf(u), y]);
    }
    return { poly: L.smoothPts(R.concat(Lf.reverse()), true, 4), pf, hw, top, bot };
  })();
  const FEET = [[500, 897], [582, 893], [480, 907], [604, 903]];
  const HIPS = [[528, 1000], [552, 1000], [531, 1017], [549, 1017]];

  function dots(ctx, list, color, alpha = 1) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha *= alpha;
    ctx.beginPath();
    for (const [x, y, r] of list) {
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, TAU);
    }
    ctx.fill();
    ctx.restore();
  }

  function drawBodyBack(ctx, z) {
    // antennae to the G4 clubs
    for (const [bx, cx, k] of [[531, 495, 0], [549, 590, 1]]) {
      const a = [bx, 910], b = [cx, 760];
      ink(ctx, [a, b], z, { width: 3, color: P.veinBlack, smooth: false, taper: [2, 1], minWidth: 0.6, swell: 0, wobble: 0.6, seed: sd('ant', k) });
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      ink(ctx, L.ellipsePts(b[0], b[1], 13, 5.5, 18, ang), z, { closed: true, width: 1.6, color: P.ink, fill: P.veinBlack, seed: sd('club', k) });
      dots(ctx, [[b[0] + Math.cos(ang) * 10, b[1] + Math.sin(ang) * 10, 2.6]], P.tan);
      const sp = [];
      for (let u = 0.12; u < 0.86; u += 0.09) sp.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u), 0.9]);
      dots(ctx, sp, P.spotWhite, 0.6);
    }
    // abdomen
    fillPts(ctx, ABD.poly, P.veinBlack);
    L.hatch(ctx, ABD.poly, { angle: 0.12, spacing: 5, width: 1.2 / z, color: P.spotWhite, alpha: 0.34, bend: 2.5, length: [7, 18], gap: [2, 5], boilAmp: 0.45 / z, density: (x) => sstep(-0.05, -0.8, (x - 540) / ABD.hw), seed: sd('abHi') });
    const ad = [];
    for (let i = 0; i < 8; i++) {
      const u = 0.12 + i * 0.105;
      const y = lerp(ABD.top, ABD.bot, u);
      const h = ABD.hw * ABD.pf(u) * 0.96;
      ink(ctx, [[540 - h, y], [540 - h * 0.5, y + 4], [540, y + 5.5], [540 + h * 0.5, y + 4], [540 + h, y]], z, { width: 1.7, color: P.inkSoft, alpha: 0.95, taper: [5, 5], seed: sd('ring', i) });
      ad.push([540 - h * 0.58, y + 9, 2.4]);
    }
    dots(ctx, ad, P.spotWhite, 0.9);
    ink(ctx, ABD.poly, z, { closed: true, width: 4, color: P.ink, seed: sd('abLine') });
    // thorax with a hairy fringe and white spots
    const th = L.ellipsePts(540, 995, 28, 36, 40);
    const bi = L.boil(L.T);
    ctx.save();
    ctx.strokeStyle = P.veinBlack;
    ctx.lineWidth = 1.3 / z;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let k = 0; k < 52; k++) {
      const a = (k / 52) * TAU + h3(k, 3, 7) * 0.1;
      const l = 4 + 6 * h3(k, bi, 11);
      ctx.moveTo(540 + Math.cos(a) * 26, 995 + Math.sin(a) * 34);
      ctx.lineTo(540 + Math.cos(a + 0.08) * (28 + l), 995 + Math.sin(a + 0.08) * (36 + l));
    }
    ctx.stroke();
    ctx.restore();
    ink(ctx, th, z, { closed: true, width: 4.5, color: P.ink, fill: P.veinBlack, seed: sd('thLine') });
    dots(ctx, [[526, 972, 3.4], [554, 972, 3.4], [519, 993, 2.8], [561, 993, 2.8], [540, 1012, 2.3], [530, 1022, 2], [550, 1022, 2], [540, 962, 2.4]], P.spotWhite);
    // head, eyes
    ink(ctx, L.ellipsePts(540, 935, 28, 28, 36), z, { closed: true, width: 4.5, color: P.ink, fill: P.veinBlack, seed: sd('head') });
    for (const [ex, k] of [[521, 0], [559, 1]]) {
      const ep = L.ellipsePts(ex, 936, 11.5, 15, 24);
      ink(ctx, ep, z, { closed: true, width: 1.6, color: P.ink, fill: L.mix(P.inkSoft, P.veinBlack, 0.3), seed: sd('eye', k), wobble: 0.4 });
      L.stipple(ctx, ep, { spacing: 3.6, r: [0.45, 0.8], color: P.inkFaint, alpha: 0.8, boilAmp: 0.35 / z, seed: sd('fac', k) });
      dots(ctx, [[ex - 4, 929, 2.7]], P.white);
    }
    dots(ctx, [[540, 913, 3.2], [532, 956, 2.2], [548, 956, 2.2]], P.spotWhite);
    // proboscis coiled flat under the head
    for (const [cx, dir, k] of [[532, -1, 0], [548, 1, 1]]) {
      const pts = [];
      for (let i = 0; i <= 26; i++) {
        const u = i / 26;
        const a = dir * (u * 2.2 * TAU) + Math.PI * 1.5;
        const r = 7.5 * (1 - u * 0.78);
        pts.push([cx + Math.cos(a) * r * -dir, 968 + Math.sin(a) * r]);
      }
      ink(ctx, pts, z, { width: 3.6, color: P.ink, taper: [1, 3], wobble: 0.3, tremble: 0.1, seed: sd('prI', k) });
      ink(ctx, pts, z, { width: 1.8, color: P.tan, taper: [1, 3], wobble: 0.3, tremble: 0.1, seed: sd('prT', k) });
    }
  }

  function drawLegs(ctx, z) {
    for (const [pts, k] of [[[[527, 972], [510, 986], [516, 1006]], 0], [[[553, 972], [569, 984], [565, 1003]], 1]]) {
      ink(ctx, pts, z, { width: 2.4, color: P.veinBlack, smooth: false, taper: [2, 3], seed: sd('fore', k) });
    }
    for (let i = 0; i < 4; i++) {
      const hip = HIPS[i], foot = FEET[i], side = i % 2 ? 1 : -1;
      const vx = foot[0] - hip[0], vy = foot[1] - hip[1];
      const len = Math.hypot(vx, vy) || 1;
      let nx = -vy / len, ny = vx / len;
      if (nx * side < 0) {
        nx = -nx;
        ny = -ny;
      }
      const bend = Math.max(6, 60 - len * 0.35);
      const knee = [hip[0] + vx * 0.48 + nx * bend, hip[1] + vy * 0.48 + ny * bend];
      ink(ctx, [hip, knee], z, { width: 3.6, color: P.veinBlack, smooth: false, taper: [2, 3], minWidth: 0.7, seed: sd('fem', i) });
      const ux = foot[0] - knee[0], uy = foot[1] - knee[1], ul = Math.hypot(ux, uy) || 1;
      const tars = [foot[0] + (ux / ul) * 9, foot[1] + (uy / ul) * 9];
      ink(ctx, [knee, foot, tars], z, { width: 2.5, color: P.veinBlack, smooth: false, taper: [2, 5], minWidth: 0.5, seed: sd('tib', i) });
    }
  }

  // ---------------------------------------------------------------------------
  // Wings, flat illustration (z up to about 32)
  // ---------------------------------------------------------------------------
  const HW_BB = bbOf(HW_OUT, 20);
  function drawHindwing(ctx, z, win) {
    if (!hits(HW_BB, win) || z > 10) return;
    fillPts(ctx, HW_OUT, P.monarchUnder);
    ctx.save();
    ctx.beginPath();
    tracePts(ctx, HW_OUT);
    ctx.clip();
    L.crossHatch(ctx, HW_OUT, { spacing: 6, crossSpacing: 7, width: 1.2 / z, color: P.monarchDeep, alpha: 0.7, tone: 0.5, length: [10, 34], boilAmp: 0.45 / z, seed: sd('hwH') });
    for (let i = 0; i < HW_VEINS.length; i++) fillPts(ctx, HW_VEINS[i].edge, P.spotWhite, 0.45);
    fillPts(ctx, HW_BAND, P.veinBlack);
    for (let i = 0; i < HW_VEINS.length; i++) fillPts(ctx, HW_VEINS[i].poly, P.veinBlack);
    dots(ctx, HW_SPOTS, P.spotWhite);
    ctx.restore();
    ink(ctx, HW_OUT, z, { closed: true, width: 3.4, color: P.ink, seed: sd('hwLine') });
  }

  const FW_FINE_BOX = [[660, 1290], [800, 1290], [800, 1470], [660, 1470]];
  function drawForewingFlat(ctx, z, win) {
    if (!hits(FW_BB, win)) return;
    fillPts(ctx, FW_OUT, P.monarch);
    ctx.save();
    ctx.beginPath();
    tracePts(ctx, FW_OUT);
    ctx.clip();
    fillPts(ctx, APEX_TIP.pts, P.monarchUnder);
    // engraved tone at constant screen size for z 1.5-10, handing over to the scallop nap
    const keep = 1 - sstep(7, 11, z);
    const tone = clamp((z - 1.5) / 0.4) * keep;
    if (tone > 0.01) {
      L.hatch(ctx, FW_OUT, {
        angle: -Math.PI / 4, spacing: 7 / z, width: 1.3 / z, color: P.monarchDeep, alpha: 0.88 * tone,
        length: [18 / z, 36 / z], gap: [2 / z, 6 / z], boilAmp: 0.45 / z, bow: 0.25,
        density: (x, y) => {
          const col = field(x, y);
          if (col !== C_OR && col !== C_UN) return 0;
          let dLit = 12;
          for (let s = 1; s <= 10; s += 1) {
            const c2 = field(x - s * 0.8, y - s * 0.8);
            if (c2 === C_BK || c2 === C_OUT) { dLit = s; break; }
          }
          // shadow half of the cell (away from the upper-left vein edge)
          return sstep(2.5, 7, dLit);
        },
        seed: sd('fwH'),
      });
      L.hatch(ctx, FW_OUT, {
        angle: (105 * Math.PI) / 180, spacing: 6 / z, width: 1.2 / z, color: L.mix(P.monarchDeep, P.ink, 0.2),
        alpha: 0.7 * tone, length: [10 / z, 22 / z], gap: [2 / z, 5 / z], boilAmp: 0.35 / z, bow: 0.2,
        density: (x, y) => {
          if (field(x, y) !== C_OR && field(x, y) !== C_UN) return 0;
          const reach = 30 / z;
          for (let s = 1; s <= reach; s += 1.5) {
            if (field(x + s * 0.6, y + s * 0.6) === C_BK) return 1;
            if (field(x - s * 0.6, y - s * 0.6) === C_BK) return 1;
          }
          return 0;
        },
        seed: sd('fwCross'),
      });
    }
    L.stipple(ctx, FW_OUT, { spacing: 8, r: [0.7 / z, 1.3 / z], color: P.monarchDeep, alpha: 0.4, density: 0.5, boilAmp: 0.35 / z, seed: sd('fwSt') });
    const fine = clamp((z - 1.6) / 1.5) * keep;
    if (fine > 0.01) {
      L.hatch(ctx, FW_FINE_BOX, { angle: -Math.PI / 4 + 0.08, spacing: 2.2, width: 1.4 / z, color: P.monarchDeep, alpha: 0.8 * fine, length: [3, 11], gap: [1, 3], bow: 0.25, boilAmp: 0.3 / z, clip: true, density: (x, y) => 0.45 + 0.5 * sstep(1330, 1440, y + (x - 700) * 0.4), seed: sd('fwFine') });
      L.hatch(ctx, FW_FINE_BOX, { angle: -Math.PI / 4 - 1.05, spacing: 2.6, width: 1.2 / z, color: P.monarchDeep, alpha: 0.6 * fine, length: [2, 7], gap: [1, 4], bow: 0.2, boilAmp: 0.3 / z, clip: true, density: (x, y) => sstep(0.55, 1, (x - 690) / 70 * 0.5 + (y - 1330) / 110 * 0.5), seed: sd('fwFine2') });
    }
    for (const b of [BAND_MARGIN, BAND_COSTA, BAND_INNER]) fillPts(ctx, b.pts, P.veinBlack);
    if (z < 2) {
      // thinner veins at the match-cut zoom so 11 matches 09's hanging adult
      for (const v of FW_VEINS) {
        ink(ctx, v.c, z, { width: 7, color: P.veinBlack, alpha: 1, taper: [4, 8], wobble: 0.25, seed: sd('vThin') });
      }
    } else {
      for (const v of FW_VEINS) fillPts(ctx, v.poly, P.veinBlack);
    }
    L.stipple(ctx, BAND_MARGIN.pts, { spacing: 16, r: [1.0 / z, 1.6 / z], color: P.paperShade, alpha: 0.7, density: 0.004 * 16 * 16, boilAmp: 0.3 / z, seed: sd('bkDotM') });
    L.stipple(ctx, BAND_COSTA.pts, { spacing: 16, r: [1.0 / z, 1.6 / z], color: P.paperShade, alpha: 0.7, density: 0.004 * 16 * 16, boilAmp: 0.3 / z, seed: sd('bkDotC') });
    // vein edges: a thin brown drawn edge that grows legible with the zoom
    if (z > 1.8) {
      for (let i = 0; i < FW_VEINS.length; i++) {
        const v = FW_VEINS[i];
        const bb = v.bb || (v.bb = bbOf(v.poly, 4));
        if (!hits(bb, win)) continue;
        ink(ctx, v.poly, z, { closed: true, width: 1.5, color: P.ink, alpha: 0.55 * clamp((z - 1.8) / 2), wobble: 0.3, tremble: 0.25, seed: sd('vEdge', i) });
      }
      ink(ctx, MARGIN_INNER, z, { width: 1.5, color: P.ink, alpha: 0.55 * clamp((z - 1.8) / 2), wobble: 0.3, tremble: 0.25, taper: [6, 6], seed: sd('mEdge') });
    }
    // sheen on the black: fine stipple once the push is under way
    const sheen = clamp((z - 2.5) / 3);
    if (sheen > 0) {
      ctx.save();
      ctx.beginPath();
      tracePts(ctx, BAND_MARGIN.pts);
      for (const v of FW_VEINS) tracePts(ctx, v.poly);
      ctx.clip('nonzero');
      L.stipple(ctx, null, { bounds: { x: win.x0, y: win.y0, w: win.x1 - win.x0, h: win.y1 - win.y0 }, spacing: 1.6, r: [0.9 / z, 1.8 / z], color: P.inkSoft, alpha: 0.9 * sheen, density: 0.6, boilAmp: 0.3 / z, seed: sd('sheen') });
      ctx.restore();
    }
    // white spots, engraved: flat white, a fine ring, hatching on the lower right
    dots(ctx, FW_SPOTS, P.spotWhite);
    for (let i = 0; i < FW_SPOTS.length; i++) {
      const [x, y, r] = FW_SPOTS[i];
      if (x + r < win.x0 || x - r > win.x1 || y + r < win.y0 || y - r > win.y1) continue;
      if (r * z < 7) continue;
      const circ = L.ellipsePts(x, y, r, r, Math.max(16, Math.min(90, Math.round(r * z * 0.35))));
      L.hatch(ctx, circ, { angle: -Math.PI / 4, spacing: Math.max(0.35, 5 / z), width: 1.2 / z, color: P.inkFaint, alpha: 0.6, bow: 0, length: [r * 0.2, r * 0.7], gap: [r * 0.05, r * 0.15], inset: 0, overshoot: 0, boilAmp: 0.4 / z, density: (px, py) => sstep(-0.1, 0.75, ((px - x) + (py - y)) / (r * 1.3)), seed: sd("spotH", i) });
      if (r * z > 14) ink(ctx, circ, z, { closed: true, width: 1.4, color: P.inkSoft, alpha: 0.55, wobble: 0.4, tremble: 0.2, seed: sd("spotL", i) });
    }
    const nap = clamp((z - 4.5) / 4);
    if (nap > 0) drawNap(ctx, z, win, nap);
    ctx.restore();
  }

  // the adult's cast shadow on the backdrop, hatched, offset away from the light
  const SHADOW_POLYS = [FW_OUT, HW_OUT, ABD.poly, L.ellipsePts(540, 995, 28, 36, 20), L.ellipsePts(540, 935, 28, 28, 20)].map((p) => p.map(([x, y]) => [x + 30, y + 24]));
  function drawCastShadow(ctx, z, win) {
    if (z > 14) return;
    const extra = z <= 6;
    for (let i = 0; i < SHADOW_POLYS.length; i++) {
      const poly = extra ? SHADOW_POLYS[i].map(([x, y]) => [x + 10, y + 36]) : SHADOW_POLYS[i];
      const b = extra ? bbOf(poly, 4) : (SHADOW_POLYS[i].bb || (SHADOW_POLYS[i].bb = bbOf(SHADOW_POLYS[i], 4)));
      if (!hits(b, win)) continue;
      L.hatch(ctx, poly, { angle: -Math.PI / 4, spacing: 6, width: 1.3 / z, color: P.inkSoft, alpha: 0.42, length: [14, 44], spacingJitter: 0.1, inset: 2, overshoot: 0, boilAmp: 0.45 / z, seed: sd('shadow', i) });
      if (extra) L.hatch(ctx, poly, { angle: (105 * Math.PI) / 180, spacing: 7, width: 1.2 / z, color: P.inkSoft, alpha: 0.32, length: [10, 28], spacingJitter: 0.1, inset: 2, overshoot: 0, boilAmp: 0.45 / z, seed: sd('shadowX', i) });
    }
  }

  function drawForewingLine(ctx, z, win) {
    if (!hits(FW_BB, win)) return;
    ink(ctx, FW_OUT, z, { closed: true, width: 5, color: P.ink, seed: sd('fwLine'), double: { alpha: 0.35 } });
    if (z < 1.5) ink(ctx, FW_MARGIN, z, { width: 2, color: P.inkSoft, alpha: 0.95, seed: sd('fwSep'), taper: [8, 8] });
    if (z <= 6) {
      const c0 = FW_COSTA[FW_COSTA.length - 2], c1 = FW_COSTA[FW_COSTA.length - 1];
      const cl = Math.hypot(c1[0] - c0[0], c1[1] - c0[1]) || 1;
      ink(ctx, [c1, [c1[0] + ((c1[0] - c0[0]) / cl) * 300, c1[1] + ((c1[1] - c0[1]) / cl) * 300]], z, { width: 1.5, color: P.inkFaint, alpha: 0.3, seed: sd('costaExt'), taper: [20, 40] });
      const m0 = FW_MARGIN_RAW[0], m1 = FW_MARGIN_RAW[1];
      const ml = Math.hypot(m0[0] - m1[0], m0[1] - m1[1]) || 1;
      ink(ctx, [m0, [m0[0] + ((m0[0] - m1[0]) / ml) * 300, m0[1] + ((m0[1] - m1[1]) / ml) * 300]], z, { width: 1.5, color: P.inkFaint, alpha: 0.3, seed: sd('margExt'), taper: [20, 40] });
    }
  }

  // ---------------------------------------------------------------------------
  // Scale lattice: rows parallel to the target vein (44 degrees), free ends toward the margin
  // ---------------------------------------------------------------------------
  const TH = (44 * Math.PI) / 180;
  const RX = Math.cos(TH), RY = Math.sin(TH); // along a row
  const SX = -Math.sin(TH), SY = Math.cos(TH); // scale axis, socket -> free end
  const LAT_A = 1.0; // lateral pitch
  const LAT_P = 0.58; // row pitch (cover and ground rows alternate); cover-to-cover 1.16
  const SEAM_G = 0.46; // extra gap where a short run of cover scales lifts
  const LO = [TX + 0.2, TY - 0.1];
  const JM = 900;
  const SOFF = new Float64Array(2 * JM + 1);
  (() => {
    SOFF[JM] = 0;
    for (let j = 1; j <= JM; j++) SOFF[JM + j] = j * LAT_P;
    for (let j = -1; j >= -JM; j--) SOFF[JM + j] = j * LAT_P;
  })();
  // lifted cover runs of 6 scales (inside 4-7), ~30% of groups
  const liftedRun = (i, j) => !(j & 1) && h3(j, (i / 6) | 0, 919) < 0.3;
  function rowAt(s) {
    let lo = -JM, hi = JM;
    if (s <= SOFF[0]) return -JM;
    if (s >= SOFF[2 * JM]) return JM;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (SOFF[JM + m] <= s) lo = m;
      else hi = m;
    }
    return lo;
  }
  const COVER = { L: 1.6, W: 0.86 };
  const GROUND = { L: 1.25, W: 0.84 };
  const SAMPLE_C = 1.18;

  // enumerate lattice scales whose area can touch the window; calls fn(i, j, sx, sy) in draw order
  // (rows far along the scale axis first, so each nearer row shingles over the next)
  function forScales(win, fn, stride = 1) {
    const cs = [[win.x0, win.y0], [win.x1, win.y0], [win.x1, win.y1], [win.x0, win.y1]].map((p) => {
      const dx = p[0] - LO[0], dy = p[1] - LO[1];
      return [dx * RX + dy * RY, dx * SX + dy * SY];
    });
    let smin = Infinity, smax = -Infinity;
    for (const c of cs) {
      if (c[1] < smin) smin = c[1];
      if (c[1] > smax) smax = c[1];
    }
    const j0 = rowAt(smin - 1.8) - 1, j1 = rowAt(smax) + 1;
    for (let j = j1; j >= j0; j--) {
      if (stride > 1 && (j % stride)) continue;
      const s0 = SOFF[JM + j];
      // r-range of the window inside the band s0-0.2 .. s0+1.8
      const r = clipR(cs, s0 - 0.25, s0 + 1.85);
      if (!r) continue;
      const off = j & 1 ? 0.5 : 0;
      const i0 = Math.floor((r[0] - 0.6) / LAT_A - off), i1 = Math.ceil((r[1] + 0.6) / LAT_A - off);
      for (let i = i0; i <= i1; i++) {
        if (stride > 1 && (i % stride)) continue;
        const rr = (i + off) * LAT_A + (h3(i, j, 5) - 0.5) * 0.08;
        fn(i, j, LO[0] + rr * RX + s0 * SX, LO[1] + rr * RY + s0 * SY);
      }
    }
  }
  // min/max r of a convex quad (in r,s coords) clipped to s in [a, b]
  function clipR(cs, a, b) {
    let rmin = Infinity, rmax = -Infinity;
    const n = cs.length;
    for (let k = 0; k < n; k++) {
      const p = cs[k], q = cs[(k + 1) % n];
      if (p[1] >= a && p[1] <= b) {
        if (p[0] < rmin) rmin = p[0];
        if (p[0] > rmax) rmax = p[0];
      }
      for (const lim of [a, b]) {
        if ((p[1] - lim) * (q[1] - lim) < 0) {
          const u = (lim - p[1]) / (q[1] - p[1]);
          const r = lerp(p[0], q[0], u);
          if (r < rmin) rmin = r;
          if (r > rmax) rmax = r;
        }
      }
    }
    return rmin <= rmax ? [rmin, rmax] : null;
  }

  // nap: short strokes on the lattice that foreshadow the scale rows (z 5 to 12)
  // nap: engraved scallops at the scale tips that foreshadow the rows (z 5 to 12), coloured by the field
  function drawNap(ctx, z, win, amt) {
    const paths = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    const bi = L.boil(L.T);
    const stride = z < 8 ? 2 : 1;
    const hw = 0.5;
    forScales(win, (i, j, x, y) => {
      if (j & 1 || (stride > 1 && ((j >> 1) % stride || i % stride))) return;
      const tx = x + SX * COVER.L, ty = y + SY * COVER.L;
      if (tx < win.x0 - 1 || tx > win.x1 + 1 || ty < win.y0 - 1 || ty > win.y1 + 1) return;
      const col = field(x + SX * SAMPLE_C, y + SY * SAMPLE_C);
      if (col === C_OUT) return;
      const jb = (h3(i, j, bi + 3) - 0.5) * 0.06;
      const p = paths[col];
      const ax = tx - RX * hw + jb, ay = ty - RY * hw, bx = tx + RX * hw, by = ty + RY * hw + jb;
      p.moveTo(ax - SX * 0.28, ay - SY * 0.28);
      p.quadraticCurveTo(tx + SX * 0.22, ty + SY * 0.22, bx - SX * 0.28, by - SY * 0.28);
    }, 1);
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineWidth = 1.3 / z;
    const cols = [P.monarchDeep, "#6B5645", P.inkFaint, P.monarchDeep];
    const al = [0.78, 0.7, 0.6, 0.7];
    for (let c = 0; c < 4; c++) {
      ctx.globalAlpha = al[c] * amt;
      ctx.strokeStyle = cols[c];
      ctx.stroke(paths[c]);
    }
    ctx.restore();
  }

  const FILL = { [C_OR]: P.monarch, [C_BK]: P.veinBlack, [C_WH]: P.spotWhite, [C_UN]: P.monarchUnder };
  const DEEP = { [C_OR]: P.monarchDeep, [C_BK]: P.ink, [C_WH]: P.paperShade, [C_UN]: P.monarchDeep };
  const RIDGE = { [C_OR]: P.monarchDeep, [C_BK]: '#5E4a3a', [C_WH]: '#C9B48E', [C_UN]: P.monarchDeep };
  const EDGE = { [C_OR]: P.ink, [C_BK]: '#6B5645', [C_WH]: P.inkFaint, [C_UN]: P.ink };
  const COLS = [C_OR, C_BK, C_WH, C_UN];

  // tiles: T 20.5 to 21.0, one flat tile per lattice cell, cracking out from the target on twos
  function drawTiles(ctx, cam, win, frame) {
    const z = cam.z;
    const bi = L.boil(L.T);
    const paths = {}, grout = {}, hatchP = {};
    for (const c of COLS) {
      paths[c] = new Path2D();
      grout[c] = new Path2D();
      hatchP[c] = new Path2D();
    }
    const outlines = new Path2D();
    const ha = LAT_A * 0.5 * z;
    const gap = clamp(z * 0.035, 0.45, 1.4);
    forScales(win, (i, j, x, y) => {
      if (j & 1) return;
      const cx = x + SX * SAMPLE_C, cy = y + SY * SAMPLE_C;
      const sx = 540 + (cx - cam.x) * z, sy = 960 + (cy - cam.y) * z;
      if (sx < -ha * 3 || sx > 1080 + ha * 3 || sy < -ha * 3 || sy > 1920 + ha * 3) return;
      const at = Math.floor((4 * Math.hypot(sx - 540, sy - 960)) / 1100);
      const appear = at <= 1 ? 0 : 2;
      if (appear > frame) return;
      const col = field(cx, cy);
      if (col === C_OUT) return;
      const s0 = -LAT_P, s1 = LAT_P;
      const a1 = ha;
      const P0 = s0 * z, P1 = s1 * z;
      const jit = (px, py, k) => [px + (h3(i, j, bi + k) - 0.5) * 3, py + (h3(j, i, bi + k + 7) - 0.5) * 3];
      const g0 = jit(sx - RX * a1 + SX * P0, sy - RY * a1 + SY * P0, 1);
      const g1 = jit(sx + RX * a1 + SX * P0, sy + RY * a1 + SY * P0, 2);
      const g2 = jit(sx + RX * a1 + SX * P1, sy + RY * a1 + SY * P1, 3);
      const g3 = jit(sx - RX * a1 + SX * P1, sy - RY * a1 + SY * P1, 4);
      grout[col].moveTo(g0[0], g0[1]);
      grout[col].lineTo(g1[0], g1[1]);
      grout[col].lineTo(g2[0], g2[1]);
      grout[col].lineTo(g3[0], g3[1]);
      grout[col].closePath();
      outlines.moveTo(g0[0], g0[1]);
      outlines.lineTo(g1[0], g1[1]);
      outlines.lineTo(g2[0], g2[1]);
      outlines.lineTo(g3[0], g3[1]);
      outlines.closePath();
      const a2 = Math.max(0.5, a1 - gap), Q0 = P0 + gap, Q1 = P1 - gap;
      const bx = RX * a2, by = RY * a2;
      const tgt = paths[col];
      tgt.moveTo(sx - bx + SX * Q0, sy - by + SY * Q0);
      tgt.lineTo(sx + bx + SX * Q0, sy + by + SY * Q0);
      tgt.lineTo(sx + bx + SX * Q1, sy + by + SY * Q1);
      tgt.lineTo(sx - bx + SX * Q1, sy - by + SY * Q1);
      tgt.closePath();
      if (z >= 18) {
        const nH = 4;
        for (let k = 0; k < nH; k++) {
          const u = lerp(Q0, Q1, (k + 0.6) / (nH + 0.2));
          const px = sx + SX * u + RX * a2 * 0.55;
          const py = sy + SY * u + RY * a2 * 0.55;
          const hlen = Math.min(10, a2 * 0.7);
          hatchP[col].moveTo(px - hlen * 0.707, py + hlen * 0.707);
          hatchP[col].lineTo(px + hlen * 0.707, py - hlen * 0.707);
        }
      }
    });
    ctx.save();
    for (const c of COLS) {
      ctx.fillStyle = L.mix(FILL[c], P.ink, 0.5);
      ctx.fill(grout[c]);
      ctx.fillStyle = FILL[c];
      ctx.fill(paths[c]);
    }
    ctx.strokeStyle = P.inkSoft;
    ctx.lineWidth = 1.3;
    ctx.lineJoin = 'round';
    ctx.stroke(outlines);
    const hCol = { [C_OR]: P.monarchDeep, [C_BK]: P.paperShade, [C_WH]: P.paperShade, [C_UN]: P.monarchDeep };
    const hA = { [C_OR]: 0.85, [C_BK]: 0.3, [C_WH]: 0.6, [C_UN]: 0.7 };
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    for (const c of COLS) {
      ctx.strokeStyle = hCol[c];
      ctx.globalAlpha = hA[c];
      ctx.stroke(hatchP[c]);
    }
    ctx.restore();
  }

  // unit scale outline: u along the axis (0 socket .. 1 free end), v across (-0.5 .. 0.5)
  function scaleTemplate(teeth) {
    const side = [[0.0, 0.04], [0.1, 0.045], [0.17, 0.09], [0.26, 0.24], [0.38, 0.4], [0.52, 0.47], [0.68, 0.5], [0.8, 0.5], [0.87, 0.47]];
    const end = [];
    const v0 = -0.44, v1 = 0.44;
    for (let k = 0; k < teeth; k++) {
      const va = lerp(v0, v1, k / teeth);
      const vm = lerp(v0, v1, (k + 0.5) / teeth);
      const vb = lerp(v0, v1, (k + 1) / teeth);
      const round = (v) => 0.87 + 0.13 * Math.sqrt(Math.max(0, 1 - (v / 0.5) * (v / 0.5)));
      end.push([round(va), va]);
      end.push([round(vm) - 0.09, vm]);
      if (k === teeth - 1) end.push([round(vb), vb]);
    }
    const left = side.map(([u, v]) => [u, -v]);
    const right = side.slice().reverse().map(([u, v]) => [u, v]);
    return left.concat(end, right);
  }
  const TEMPL = [scaleTemplate(3), scaleTemplate(4), scaleTemplate(5)];

  // the one scale that lifts on 21.5: a cover scale in the orange cell just below the frame centre
  let LIFT = null;
  function liftScale() {
    if (LIFT) return LIFT;
    const cam = camAt(2.5);
    const z = cam.z;
    const win = { x0: cam.x - 540 / z, x1: cam.x + 540 / z, y0: cam.y - 960 / z, y1: cam.y + 960 / z };
    let best = null;
    forScales(win, (i, j, x, y) => {
      if (j & 1) return;
      const cx = x + SX * SAMPLE_C, cy = y + SY * SAMPLE_C;
      if (field(cx, cy) !== C_OR) return;
      // all four neighbours orange too, so the lifted scale sits inside the cell
      if (field(cx + RX, cy + RY) !== C_OR || field(cx - RX, cy - RY) !== C_OR || field(cx + SX, cy + SY) !== C_OR || field(cx - SX, cy - SY) !== C_OR) return;
      const tx = x + SX * 1.2, ty = y + SY * 1.2;
      const sx = 540 + (tx - cam.x) * z, sy = 960 + (ty - cam.y) * z;
      const d = Math.hypot(sx - 540, sy - 900);
      if (!best || d < best.d) best = { i, j, x, y, d };
    });
    LIFT = best || { i: 1e9, j: 1e9, x: TX, y: TY };
    return LIFT;
  }

  // scale sprites: one small canvas per kind, outline, colour and boil drawing, rendered at the
  // zoom-40 size (40 px per world unit) and placed with a transform. A pure cache of its inputs.
  const SPRITES = new Map();
  const SPR_Q = 40;
  function scaleSprite(kindIdx, tplIdx, col, variant) {
    const S = FILM.S || 1;
    const key = kindIdx + '|' + tplIdx + '|' + col + '|' + variant + '|' + S;
    let sp = SPRITES.get(key);
    if (sp) return sp;
    const kind = kindIdx ? GROUND : COVER;
    const q = SPR_Q;
    const pad = 6;
    const wPx = kind.W * q, lPx = kind.L * q;
    const cw = Math.ceil((wPx + pad * 2) * S), ch = Math.ceil((lPx + pad * 2) * S);
    const cv = FILM.makeCanvas(cw, ch);
    const g = cv.getContext('2d');
    g.scale(S, S);
    const ox = pad + wPx / 2, oy = pad;
    const pt = (u, v) => [ox + v * wPx, oy + u * lPx];
    const tpl = TEMPL[tplIdx];
    const outline = new Path2D();
    tpl.forEach(([u, v], k) => {
      const p = pt(u, v);
      if (k === 0) outline.moveTo(p[0], p[1]);
      else outline.lineTo(p[0], p[1]);
    });
    outline.closePath();
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.fillStyle = kindIdx
      ? (col === C_OR ? L.mix(P.monarch, P.monarchDeep, 0.3)
        : col === C_WH ? L.mix(P.spotWhite, P.paperShade, 0.5)
        : col === C_BK ? L.mix(P.veinBlack, P.inkSoft, 0.15)
        : FILL[col])
      : FILL[col];
    g.fill(outline);
    g.save();
    g.clip(outline);
    // tuck: the darker socket half, mostly hidden under the next row, leaves a thin edge below it
    const tuck = new Path2D();
    [[0.0, -0.3], [0.44, -0.5], [0.52, 0], [0.44, 0.5], [0.0, 0.3]].forEach(([u, v], k) => {
      const p = pt(u, v);
      if (k === 0) tuck.moveTo(p[0], p[1]);
      else tuck.lineTo(p[0], p[1]);
    });
    g.globalAlpha = 0.85;
    g.fillStyle = DEEP[col];
    g.fill(tuck);
    // shadow side (+v faces the lower right): a deep strip and short cross strokes
    const sh = new Path2D();
    [[0.46, 0.36], [0.9, 0.38], [0.95, 0.52], [0.46, 0.52]].forEach(([u, v], k) => {
      const p = pt(u, v);
      if (k === 0) sh.moveTo(p[0], p[1]);
      else sh.lineTo(p[0], p[1]);
    });
    g.globalAlpha = 0.45;
    g.fill(sh);
    const cross = new Path2D();
    for (let k = 0; k < 4; k++) {
      const u = 0.52 + k * 0.1;
      const a = pt(u, 0.2), b = pt(u + 0.07, 0.5);
      cross.moveTo(a[0], a[1]);
      cross.lineTo(b[0], b[1]);
    }
    if (kindIdx) {
      for (let k = 0; k < 5; k++) {
        const u = 0.62 + k * 0.075;
        const a = pt(u, -0.42), b = pt(u + 0.12, 0.1);
        cross.moveTo(a[0], a[1]);
        cross.lineTo(b[0], b[1]);
      }
    }
    g.globalAlpha = 0.7;
    g.strokeStyle = DEEP[col];
    g.lineWidth = 1.2;
    g.stroke(cross);
    if (variant < 3) {
      // ridges, re-jittered for each boil drawing
      const nR = 5 + tplIdx;
      const r = new Path2D();
      for (let k = 0; k < nR; k++) {
        const v = lerp(-0.32, 0.32, k / (nR - 1)) + (h3(k, variant, tplIdx * 7 + col) - 0.5) * 0.03;
        const a = pt(0.3 + (h3(k, variant, 3) - 0.5) * 0.04, v * 0.6), b = pt(0.93 - 0.1 * Math.abs(v), v);
        r.moveTo(a[0], a[1]);
        r.lineTo(b[0], b[1]);
      }
      g.globalAlpha = col === C_OR ? 0.8 : 0.62;
      g.strokeStyle = col === C_OR ? P.monarchDeep : RIDGE[col];
      g.lineWidth = col === C_OR ? 1.2 : 1.15;
      g.stroke(r);
      // cross ribs between the ridges near the tip, very fine
      const rib = new Path2D();
      for (let k = 0; k < 5; k++) {
        const u = 0.58 + k * 0.075;
        const a = pt(u, -0.3), b = pt(u + 0.01, 0.3);
        rib.moveTo(a[0], a[1]);
        rib.lineTo(b[0], b[1]);
      }
      g.globalAlpha = 0.18;
      g.lineWidth = 0.8;
      g.stroke(rib);
    }
    // 45-degree hatch on the lower-right 35% of the sprite
    const hh = new Path2D();
    const xR = ox + 0.15 * wPx;
    for (let s = -lPx; s < wPx + lPx; s += 5) {
      hh.moveTo(xR + s, oy + lPx);
      hh.lineTo(xR + s + lPx, oy);
    }
    g.save();
    const shClip = new Path2D();
    [[0.22, 0.15], [1.02, 0.15], [1.02, 0.52], [0.22, 0.52]].forEach(([u, v], k) => {
      const p = pt(u, v);
      if (k === 0) shClip.moveTo(p[0], p[1]);
      else shClip.lineTo(p[0], p[1]);
    });
    shClip.closePath();
    g.clip(shClip);
    g.globalAlpha = 0.75;
    g.strokeStyle = DEEP[col];
    g.lineWidth = 1.2;
    g.stroke(hh);
    g.restore();
    g.restore();
    g.globalAlpha = col === C_BK ? 0.9 : 0.75;
    g.strokeStyle = EDGE[col];
    g.lineWidth = 1.4;
    g.stroke(outline);
    sp = { cv, cw, ch, ox, oy, S };
    SPRITES.set(key, sp);
    return sp;
  }

  // scales: T 21.0 on; m = resolve amount (0.45 short, 1.06 overshoot, 1 settled); lift = { a, glint } or null
  function drawScales(ctx, cam, win, m, bi, lift) {
    const z = cam.z;
    const LS = liftScale();
    // membrane under everything: paper, fibre stipple, rows of sockets (seen where rows lift)
    ctx.save();
    ctx.fillStyle = L.mix(P.paperShade, P.inkSoft, 0.35);
    ctx.fillRect(0, 0, 1080, 1920);
    L.stipple(ctx, null, { spacing: 13, r: [0.8, 1.5], color: P.inkFaint, alpha: 0.4, density: 0.55, seed: sd('memb') });
    const sockets = new Path2D();
    const seamSt = new Path2D();
    forScales(win, (i, j, x, y) => {
      if (!liftedRun(i, j)) return;
      const sx = 540 + (x - cam.x) * z, sy = 960 + (y - cam.y) * z;
      if (sx < -10 || sx > 1090 || sy < -10 || sy > 1930) return;
      sockets.moveTo(sx + 3.2, sy);
      sockets.ellipse(sx, sy, 3.2, 2.1, TH, 0, TAU);
      const hx = sx + SX * COVER.L * z, hy = sy + SY * COVER.L * z;
      for (let k = -1; k <= 1; k++) {
        const px = hx + RX * k * 5, py = hy + RY * k * 5;
        seamSt.moveTo(px - 4 * 0.707, py + 4 * 0.707);
        seamSt.lineTo(px + 4 * 0.707, py - 4 * 0.707);
      }
    });
    ctx.fillStyle = P.inkSoft;
    ctx.globalAlpha = 0.6;
    ctx.fill(sockets);
    ctx.strokeStyle = P.inkSoft;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.1;
    ctx.lineCap = 'round';
    ctx.stroke(seamSt);
    ctx.restore();

    const base = ctx.getTransform();
    const ba = base.a, bb = base.b, bc = base.c, bd = base.d, be = base.e, bf = base.f;
    const variant = m >= 0.99 && m <= 1.01 ? ((bi % 3) + 3) % 3 : 3;
    ctx.save();
    ctx.imageSmoothingQuality = 'medium';
    forScales(win, (i, j, x, y) => {
      if (lift && i === LS.i && j === LS.j) return;
      const kindIdx = j & 1;
      const kind = kindIdx ? GROUND : COVER;
      const hL = 1 + (h3(i, j, 11) - 0.5) * 0.1, hW = 1 + (h3(i, j, 12) - 0.5) * 0.08;
      const Lw = kind.L * hL;
      const Lm = m >= 1 ? Lw * m : lerp(kindIdx ? 0.25 : LAT_P * 2, Lw, m);
      const Wm = m >= 1 ? kind.W * hW : lerp(LAT_A * 0.94, kind.W * hW, m);
      const endS = m >= 1 ? Lw * m : lerp(SAMPLE_C + (kindIdx ? -0.2 : LAT_P), Lw, m);
      const liftGap = liftedRun(i, j) ? 0.12 : 0;
      const bx = x + SX * (endS - Lm - liftGap), by = y + SY * (endS - Lm - liftGap);
      const sx = 540 + (bx - cam.x) * z, sy = 960 + (by - cam.y) * z;
      const reach = Lm * z + 40;
      if (sx < -reach || sx > 1080 + reach || sy < -reach || sy > 1920 + reach) return;
      const col = field(x + SX * SAMPLE_C, y + SY * SAMPLE_C);
      if (col === C_OUT) return;
      const tplIdx = (h3(i, j, 14) * 3) | 0;
      const vv = variant === 3 ? 3 : (variant + ((h3(i, j, 16) * 3) | 0)) % 3;
      const sp = scaleSprite(kindIdx, tplIdx, col, vv);
      const ang = (h3(i, j, 13) - 0.5) * 0.08;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const axX = SX * ca - SY * sa, axY = SX * sa + SY * ca;
      const crX = RX * ca - RY * sa, crY = RX * sa + RY * ca;
      const kw = (z * (Wm / kind.W)) / SPR_Q, kl = (z * (Lm / kind.L)) / SPR_Q;
      // sprite px (logical) -> screen: x along the width axis, y along the scale axis
      const a = crX * kw, b = crY * kw, c = axX * kl, d = axY * kl;
      const e = sx - a * sp.ox - c * sp.oy, f = sy - b * sp.ox - d * sp.oy;
      ctx.setTransform(ba * a + bc * b, bb * a + bd * b, ba * c + bc * d, bb * c + bd * d, ba * e + bc * f + be, bb * e + bd * f + bf);
      ctx.drawImage(sp.cv, 0, 0, sp.cw / sp.S, sp.ch / sp.S);
    });
    ctx.restore();
    if (lift) drawLifted(ctx, cam, LS, bi, lift);
  }


  function drawLifted(ctx, cam, LS, bi, lift) {
    const z = cam.z;
    const grow = Math.min(1.15, lift.grow);
    const Lw = COVER.L * (1 + (h3(LS.i, LS.j, 11) - 0.5) * 0.1) * grow;
    const Ww = COVER.W * (1 + (h3(LS.i, LS.j, 12) - 0.5) * 0.08) * grow;
    const ang = (h3(LS.i, LS.j, 13) - 0.5) * 0.08 + lift.a;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const axX = SX * ca - SY * sa, axY = SX * sa + SY * ca;
    const crX = RX * ca - RY * sa, crY = RX * sa + RY * ca;
    const sx = 540 + (LS.x - cam.x) * z, sy = 960 + (LS.y - cam.y) * z;
    const Ls = Lw * z, Ws = Ww * z;
    // free end shifts 8 px toward the upper left so it overhangs its neighbours
    const shx = -5.7, shy = -5.7;
    const pt = (u, v) => [sx + axX * u * Ls + crX * v * Ws + shx * u, sy + axY * u * Ls + crY * v * Ws + shy * u];
    const S0 = [sx, sy];
    ctx.save();
    const hole = TEMPL[2].map(([u, v]) => {
      const q = [LS.x + SX * u * COVER.L + RX * v * COVER.W * 0.96, LS.y + SY * u * COVER.L + RY * v * COVER.W * 0.96];
      return [540 + (q[0] - cam.x) * z, 960 + (q[1] - cam.y) * z];
    });
    fillPts(ctx, hole, P.paperShade);
    L.stipple(ctx, hole, { spacing: 5, r: [0.8, 1.4], color: P.inkFaint, alpha: 0.55, seed: sd('holeSt') });
    const outline = TEMPL[2].map(([u, v]) => pt(u, v));
    const shadow = outline.map((p) => [p[0] + 12, p[1] + 14]);
    L.hatch(ctx, shadow, { angle: -Math.PI / 4, spacing: 4, width: 1.2, color: P.inkSoft, alpha: 0.55, length: [8, 20], gap: [2, 4], inset: 1, overshoot: 0, seed: sd('liftSh') });
    ctx.fillStyle = P.ink;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.ellipse(S0[0], S0[1], 6, 4, TH, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = P.monarchDeep;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(S0[0], S0[1]);
    const stalk = pt(0.25, 0);
    ctx.lineTo(stalk[0], stalk[1]);
    ctx.stroke();
    fillPts(ctx, outline, P.monarch);
    ctx.save();
    ctx.beginPath();
    tracePts(ctx, outline);
    ctx.clip();
    L.hatch(ctx, outline, { angle: -Math.PI / 4, spacing: 5, width: 1.2, color: P.monarchDeep, alpha: 0.75, length: [6, 16], gap: [2, 4], density: (x, y) => {
      const dx = x - sx, dy = y - sy;
      const v = (dx * crX + dy * crY) / (Ws || 1);
      return sstep(0.15, 0.5, v);
    }, seed: sd('liftH') });
    const nR = 7;
    const ridges = new Path2D();
    for (let k = 0; k < nR; k++) {
      const vv = lerp(-0.32, 0.32, k / (nR - 1)) + (h3(k, bi, 71) - 0.5) * 0.02;
      const ra = pt(0.3, vv * 0.6), rb = pt(0.93 - 0.1 * Math.abs(vv), vv);
      ridges.moveTo(ra[0], ra[1]);
      ridges.lineTo(rb[0], rb[1]);
    }
    ctx.strokeStyle = P.monarchDeep;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.8;
    ctx.stroke(ridges);
    const ridge = lift.ridge != null ? lift.ridge : 2;
    const vv = lerp(-0.32, 0.32, ridge / (nR - 1));
    const ga = pt(0.3, vv * 0.6), gb = pt(0.93 - 0.1 * Math.abs(vv), vv);
    ctx.strokeStyle = P.spotWhite;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.moveTo(ga[0], ga[1]);
    ctx.lineTo(gb[0], gb[1]);
    ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = EDGE[C_OR];
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.75;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    tracePts(ctx, outline);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();
    const a0 = Math.atan2(SY, SX), a1 = Math.atan2(axY, axX);
    L.arcAnnotation(ctx, S0[0], S0[1], 70, a0, a1, { color: P.annYellow, width: 2, endTicks: 8, alpha: 1 });
    return { pt };
  }
  // ---------------------------------------------------------------------------
  // Overlays
  // ---------------------------------------------------------------------------
  function ringStroke(ctx, x, y, r, color, width, alpha) {
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

  function drawConstruction(ctx, cam) {
    const z = cam.z;
    const ax = 540 + (TX - cam.x) * z, ay = 960 + (TY - cam.y) * z;
    ctx.save();
    ctx.strokeStyle = P.inkFaint;
    ctx.lineWidth = 1.5;
    for (const R of [260, 65, 16.25, 4.06, 1.02]) {
      const rs = R * z;
      if (rs < 70 || rs > 1500) continue;
      const a = 0.3 * sstep(70, 160, rs) * (1 - sstep(900, 1500, rs));
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(ax, ay, rs, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const an = (k * Math.PI) / 2 + TH;
        ctx.moveTo(ax + Math.cos(an) * (rs - 14), ay + Math.sin(an) * (rs - 14));
        ctx.lineTo(ax + Math.cos(an) * (rs + 14), ay + Math.sin(an) * (rs + 14));
      }
      ctx.stroke();
    }
    // body axis construction line while the adult is on screen
    if (z < 3) {
      const x = 540 + (540 - cam.x) * z;
      ctx.globalAlpha = 0.3 * (1 - sstep(2, 3, z));
      ctx.beginPath();
      ctx.moveTo(x, 960 + (1180 - cam.y) * z);
      ctx.lineTo(x, 1920);
      ctx.stroke();
    }
    ctx.restore();
  }

  const BAR = [[0, 500], [0.5, 440], [1.0, 300], [1.5, 90], [2.0, 90]];
  function barLen(t) {
    let len = BAR[0][1];
    for (let i = 1; i < BAR.length; i++) {
      const u = clamp((t - BAR[i][0]) * 24 / 4);
      len = lerp(len, BAR[i][1], E.outExpo(u));
    }
    return len;
  }

  function drawOverlays(ctx, cam, t) {
    const k = cam.k;
    const cx = 540 + 195 * k, cy = 960 + 440 * k;
    const frame = Math.floor(t * 24 + 1e-6);
    // yellow target ring with cross ticks, popped in on the cut
    const pop = frame >= 3 ? 1 : E.outBack(clamp((t * 24 + 1) / 3)) * 0.4 + 0.6;
    const R = 120 * pop;
    ctx.save();
    ctx.lineCap = 'round';
    ringStroke(ctx, cx, cy, R, P.annYellow, 3, 1);
    ctx.strokeStyle = P.annYellow;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let q = 0; q < 4; q++) {
      const an = (q * Math.PI) / 2;
      ctx.moveTo(cx + Math.cos(an) * (R - 18), cy + Math.sin(an) * (R - 18));
      ctx.lineTo(cx + Math.cos(an) * (R + 18), cy + Math.sin(an) * (R + 18));
    }
    ctx.stroke();
    ctx.restore();
    // zoom dial: hidden from the lift (f516) so the ring frames only the scale
    const zu = (Math.log(cam.z) - LZ[0]) / (LZ[4] - LZ[0]);
    if (t < 2.0 - 1e-6 && zu > 0.004) L.arcAnnotation(ctx, cx, cy, 150, -Math.PI / 2, -Math.PI / 2 + zu * Math.PI * 1.6, { color: P.annYellow, width: 2, endTicks: 10 });
    // blue guides along the scale rows, sliding; paper understroke so they read on black
    const gOn = E.outExpo(clamp((t - 0.5) * 4));
    if (gOn > 0) {
      const half = 1300 * gOn;
      const drawGuides = (width, color, alpha) => {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = width;
        ctx.setLineDash([14, 10]);
        ctx.lineDashOffset = -t * 72;
        ctx.beginPath();
        for (const d of [-330, 300]) {
          const px = 540 + SX * d, py = 960 + SY * d;
          ctx.moveTo(px - RX * half, py - RY * half);
          ctx.lineTo(px + RX * half, py + RY * half);
        }
        ctx.stroke();
        ctx.restore();
      };
      drawGuides(4.5, P.paper, 0.45);
      drawGuides(2.5, P.annBlue, 1);
    }
    // scale bar, lower left, stepping shorter on each beat
    const len = barLen(t);
    ctx.save();
    ctx.strokeStyle = P.annBlue;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(100, 1500);
    ctx.lineTo(100 + len, 1500);
    for (const x of [100, 100 + len]) {
      ctx.moveTo(x, 1486);
      ctx.lineTo(x, 1514);
    }
    ctx.moveTo(100 + len / 2, 1486);
    ctx.lineTo(100 + len / 2, 1514);
    for (let q = 1; q < 10; q++) {
      if (q === 5) continue;
      ctx.moveTo(100 + (len * q) / 10, 1488);
      ctx.lineTo(100 + (len * q) / 10, 1500);
    }
    ctx.stroke();
    ctx.restore();
    // magenta ring pops at the target on 21.0
    const tm = t - 1.5;
    if (tm >= -1e-6 && tm < 12 / 24) {
      const u = tm * 24 / 10;
      ringStroke(ctx, cx, cy, lerp(40, 250, E.outExpo(u)), P.annMagenta, 3, 1 - u * u);
      ringStroke(ctx, cx, cy, lerp(20, 170, E.outExpo(u)), P.annMagenta, 2, (1 - u) * 0.7);
    }
  }

  // ---------------------------------------------------------------------------
  // Scene
  // ---------------------------------------------------------------------------
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const t = clamp(tIn, 0, info.dur);
      const Tg = info.shot.start + t;
      const cam = camAt(t);
      const z = cam.z;
      const win = { x0: cam.x - 540 / z, x1: cam.x + 540 / z, y0: cam.y - 960 / z, y1: cam.y + 960 / z };
      const bi = L.boil(info.T);
      const tileFrame = t >= 1.0 - 1e-6 ? Math.floor((t - 1.0) * 24 + 1e-6) : -1;
      const ts = t - 1.5;

      if (ts < -1e-6) {
        // stripes with a slow parallax zoom about the target
        const zb = Math.pow(z, 0.3);
        const ax = 540 + (TX - cam.x) * z, ay = 960 + (TY - cam.y) * z;
        ctx.save();
        ctx.translate(ax, ay);
        ctx.scale(zb, zb);
        ctx.translate(-ax, -ay);
        L.stripes(ctx, {
          colors: [P.stripeCream, P.stripeApricot], width: 140, angle: -0.52, offset: (Tg / 0.5) * 6, seed: sd('stripes'),
          bounds: { x: ax - ax / zb - 2, y: ay - ay / zb - 2, w: 1080 / zb + 4, h: 1920 / zb + 4 },
        });
        ctx.restore();

        const allTiles = tileFrame >= 3;
        L.camera(ctx, { x: cam.x, y: cam.y, zoom: z }, (c) => {
          drawCastShadow(c, z, win);
          if (win.y0 < 1180) drawSet(c, z, win);
          if (win.y0 < 1200 && win.x0 < 620) drawBodyBack(c, z);
          drawHindwing(c, z, win);
          if (!allTiles) drawForewingFlat(c, z, win);
          else {
            fillPts(c, FW_OUT, P.paper);
          }
          if (win.y0 < 1030 && win.x0 < 620) drawLegs(c, z);
        });
        if (tileFrame >= 0) drawTiles(ctx, cam, win, tileFrame);
        L.camera(ctx, { x: cam.x, y: cam.y, zoom: z }, (c) => drawForewingLine(c, z, win));
      } else {
        // tiles resolve into scales over three drawings on twos
        const d = Math.floor(L.onTwos(ts) * 12 + 1e-6);
        const m = d === 0 ? 0.45 : d === 1 ? 1.06 : 1;
        // on 21.5 one scale tilts up on its stalk (three drawings on twos), then a glint runs its ridges
        const tl = t - 2.0;
        let lift = null;
        if (tl >= -1e-6) {
          const dl = Math.floor(L.onTwos(tl) * 12 + 1e-6);
          const deg = dl === 0 ? 0 : dl === 1 ? 4 : 10;
          lift = { a: (-deg * Math.PI) / 180, grow: dl === 0 ? 1.0 : 1.15, ridge: Math.min(6, dl), glint: dl >= 1 ? (dl - 1) / 5 : -1 };
        }
        drawScales(ctx, cam, win, m, bi, lift);
      }
      drawConstruction(ctx, cam);
      drawOverlays(ctx, cam, t);
    },
  });
})();
