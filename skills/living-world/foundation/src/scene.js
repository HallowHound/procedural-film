/* Living World · engraved landscape study.
 * Static material detail is baked into bounded, deterministic day/night plates.
 * Only water, weather, cast, fire and a few foreground plants animate each frame.
 * All geometry is generated from the episode seed, never frame history.
 */
(function (root) {
  'use strict';
  const W = root.LivingWorld, { lerp, smooth, mod, clamp } = W;
  const TAU = Math.PI * 2, VW = 1600, VH = 900;
  function colour(a, b, t) {
    t = clamp(t);
    return '#' + [1, 3, 5].map(i => Math.round(lerp(parseInt(a.slice(i, i + 2), 16),
      parseInt(b.slice(i, i + 2), 16), t)).toString(16).padStart(2, '0')).join('');
  }
  function random(seed) {
    let v = seed >>> 0;
    return () => { v = (Math.imul(v, 1664525) + 1013904223) >>> 0; return v / 4294967296; };
  }
  function trace(g, points, closed = true) {
    g.beginPath(); points.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
    if (closed) g.closePath();
  }
  function poly(g, points, fill, stroke, width = 1) {
    trace(g, points); g.fillStyle = fill; g.fill();
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = width; g.stroke(); }
  }
  function line(g, points, stroke, width = 1) {
    trace(g, points, false); g.strokeStyle = stroke; g.lineWidth = width;
    g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
  }
  function oval(g, x, y, rx, ry, fill, angle = 0) {
    g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), angle, 0, TAU);
    g.fillStyle = fill; g.fill();
  }
  function curve(g, pts, colour, width = 1) {
    g.beginPath(); g.moveTo(...pts[0]);
    for (let i = 1; i < pts.length - 1; i++) {
      g.quadraticCurveTo(...pts[i], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2);
    }
    g.lineTo(...pts[pts.length - 1]); g.strokeStyle = colour; g.lineWidth = width; g.stroke();
  }
  // Hatching follows a material's surface; it is not a full-screen noise substitute.
  function hatch(g, shape, bounds, ink, spacing, slope, seed, opacity = 0.2) {
    const r = random(seed), [x, y, w, h] = bounds;
    g.save(); trace(g, shape); g.clip(); g.globalAlpha *= opacity;
    for (let xx = x - Math.abs(h * slope) - 20; xx < x + w + Math.abs(h * slope) + 20; xx += spacing) {
      const yy = y - 5 + r() * 7, dx = (r() - 0.5) * 2;
      line(g, [[xx, yy], [xx + h * slope * 0.46 + dx, yy + h * 0.46], [xx + h * slope, yy + h + 10]], ink, 0.55 + r() * 0.45);
    }
    g.restore();
  }
  function create(canvas, input) {
    const world = W.create(input), C = world.config, P = C.palette;
    const scale = Math.min(C.width / VW, C.height / VH);
    canvas.width = C.width; canvas.height = C.height;
    const out = canvas.getContext('2d', { alpha: false });
    const seed = (...keys) => W.hash(C.seed, ...keys);
    const R = (...keys) => W.random(C.seed, ...keys);
    const cache = new Map();
    function surface() {
      const c = document.createElement('canvas'); c.width = Math.round(VW * scale); c.height = Math.round(VH * scale);
      const g = c.getContext('2d'); g.setTransform(c.width / VW, 0, 0, c.height / VH, 0, 0);
      return { canvas: c, g };
    }
    // Resolve a static canvas once. Otherwise some browsers replay its large
    // retained vector display list every time drawImage uses the cached plate.
    function flatten(s) {
      const c = s.canvas, pixels = s.g.getImageData(0, 0, c.width, c.height);
      c.width = c.width; // Reset the retained drawing commands, not the bitmap dimensions.
      s.g.putImageData(pixels, 0, 0);
      return c;
    }
    const scratch = surface(), frame = surface();
    const M = { ink: '#233a36', paper: '#efe3c9', light: '#e0cb96', rock: '#7b8570', moss: '#758253',
      grass: '#75835d', earth: '#536349', bark: '#786750', water: '#91aaa0', gold: '#b69a58' };
    const tint = (c, n, keep = 0) => colour(c, colour('#162d3d', '#75929d', keep), n * (0.82 - keep * 0.18));
    const mixPalette = (n) => Object.fromEntries(Object.entries(M).map(([k, v]) => [k, tint(v, n)]));
    function noise(x, key) {
      const k = Math.floor(x), u = smooth(0, 1, x - k);
      return lerp(R(key, k), R(key, k + 1), u) * 2 - 1;
    }
    function profile(x, nodes) {
      let i = 1; while (i < nodes.length - 1 && nodes[i][0] < x) i++;
      const a = nodes[i - 1], b = nodes[i]; return lerp(a[1], b[1], clamp((x - a[0]) / (b[0] - a[0])));
    }
    const peaks = [
      [[-250, 420], [-30, 331], [130, 351], [261, 205], [290, 233], [401, 104], [445, 149], [489, 140], [603, 329], [715, 301], [831, 160], [870, 207], [981, 92], [1050, 171], [1104, 158], [1240, 339], [1390, 389], [1650, 229], [1880, 430]],
      [[-250, 495], [0, 387], [200, 431], [342, 324], [401, 354], [564, 464], [745, 400], [836, 318], [1011, 419], [1190, 362], [1360, 489], [1570, 414], [1850, 508]],
      [[-250, 560], [0, 509], [120, 484], [274, 517], [394, 478], [520, 532], [714, 515], [970, 475], [1120, 508], [1370, 478], [1600, 532], [1850, 558]]
    ];
    function ridge(x, layer, view) {
      const dx = view === 'camp' ? 175 : 0;
      return profile(x + dx, peaks[layer]) + noise((x + dx) / 23, 'ridge' + layer) * (layer === 0 ? 7 : 4)
        + noise((x + dx) / 5.5, 'ridge-micro' + layer) * (layer === 0 ? 2.5 : 1.3);
    }
    function mountain(g, layer, view, n) {
      const points = [[-20, VH]];
      for (let x = -20; x <= 1620; x += 4) points.push([x, ridge(x, layer, view)]);
      points.push([1620, VH]);
      const base = [colour(P.far, '#b9c5b7', 0.43), '#91a99a', '#667f67'][layer];
      poly(g, points, tint(base, n, layer === 0 ? 0.32 : 0.12), tint('#637f78', n), 0.7);
      const r = random(seed('mountain', layer, view));
      g.save(); trace(g, points); g.clip();
      // Crest-anchored gullies run to the foot of the mountain. Never stop
      // a shadow midway down a face with a straight rectangular edge.
      for (let i = 0; i < 76; i++) {
        const x = -25 + i * 22 + r() * 16, y = ridge(x, layer, view);
        const dx = (r() - 0.26) * 158, end = 641, drop = end - y;
        const centre = [], faceA = [], faceB = [];
        const width = 3 + r() * 21;
        for (let k = 0; k <= 12; k++) {
          const u = k / 12, xx = x + dx * u + Math.sin(u * 8 + i * 2) * u * 8;
          const yy = y + drop * u, spread = width * Math.sin(Math.PI * Math.min(0.85, u));
          centre.push([xx, yy]); faceA.push([xx - spread * 0.15, yy]);
          faceB.push([xx + spread * (0.65 + r() * 0.5), yy + r() * 3]);
        }
        const face = [...faceA, ...faceB.reverse()];
        g.globalAlpha = 0.16 + r() * 0.15;
        poly(g, face, tint(i % 5 ? '#3f6b68' : '#e6d7aa', n, i % 5 ? 0 : 0.3));
        g.globalAlpha = 0.27;
        line(g, centre, tint('#537971', n), 0.65);
        // Closely spaced incision strokes follow the gully, with broken ends.
        for (let k = 0; k < 9; k++) {
          const start = r() * 0.5, stop = 0.65 + r() * 0.35, offset = k * 1.55;
          const pts = [];
          for (let j = 0; j <= 9; j++) {
            const u = lerp(start, stop, j / 9);
            pts.push([x + dx * u + Math.sin(u * 8 + i * 2) * u * 8 + offset * Math.sin(u * 2), y + drop * u]);
          }
          line(g, pts, tint(k % 3 ? '#537b72' : '#cbd3af', n), 0.48);
        }
      }
      if (layer === 0) {
        // Snow runs off selected high peaks as irregular narrow gullies, not white triangles.
        for (let i = 0; i < 190; i++) {
          const x = r() * VW, y = ridge(x, layer, view);
          if (y > 282) continue;
          const l = 18 + r() * 85;
          const shape = [[x, y], [x + 3 + r() * 9, y + 11], [x + 8, y + l * 0.36],
            [x + 29, y + l], [x + 13, y + l * 0.7], [x - 6, y + l * 0.39], [x - 7, y + 12]];
          g.globalAlpha = 0.3 + r() * 0.4; poly(g, shape, tint('#ecedcf', n, 0.55));
        }
      }
      g.globalAlpha = 0.2;
      for (let i = 0; i < 1400; i++) {
        const x = r() * VW, y = ridge(x, layer, view) + r() * 330;
        const l = 3 + r() * (layer === 0 ? 23 : 12);
        line(g, [[x, y], [x + l * 0.44, y + l * 0.5], [x + l * 0.49, y + l]],
          tint(i % 3 ? '#365d56' : '#f3e7bf', n), 0.55);
      }
      g.restore();
      // Atmospheric veil is strongest at the foot, leaving the crest legible.
      g.save(); trace(g, points); g.clip();
      const mist = g.createLinearGradient(0, 380 + layer * 35, 0, 570 + layer * 13);
      const haze = tint('#cccfb0', n, 0.28);
      mist.addColorStop(0, haze + '00'); mist.addColorStop(1, haze + (layer === 0 ? 'a8' : '62'));
      g.fillStyle = mist; g.fillRect(0, 350, VW, 300); g.restore();
    }
    function pine(g, x, y, h, n, key, depth = 1) {
      const r = random(seed('pine', key)), trunk = tint('#655c42', n);
      const lean = (r() - 0.5) * h * 0.12;
      const dark = tint(colour('#1e453e', '#6e8974', 1 - depth), n);
      const light = tint(colour('#65836a', '#b3bb90', 1 - depth), n);
      const topX = x + lean;
      poly(g, [[x - h * 0.019, y], [topX - h * 0.002, y - h], [topX + h * 0.005, y - h], [x + h * 0.02, y]], trunk);
      line(g, [[x - h * 0.01, y], [topX, y - h]], light, Math.max(0.4, h * 0.006));
      for (let j = 0; j < 21; j++) {
        const u = 0.075 + j * 0.042, yy = y - h + h * u;
        const xx = lerp(topX, x, u), span = h * (0.018 + u * 0.235) * (0.68 + r() * 0.45);
        for (const side of [-1, 1]) {
          const reach = span * (0.68 + r() * 0.48), tip = xx + side * reach;
          const droop = h * (0.014 + r() * 0.04);
          line(g, [[xx, yy], [lerp(xx, tip, 0.6), yy + droop], [tip, yy + droop * 0.5]], trunk, Math.max(0.5, h * 0.006));
          // Serrated foliage clusters break the silhouette at twig scale.
          const upper = [], lower = [], divisions = h > 100 ? 16 : 8;
          for (let k = 0; k <= divisions; k++) {
            const f = k / divisions, bx = lerp(xx, tip, f), by = yy + droop * Math.sin(f * 2);
            const tuft = h * (0.007 + r() * 0.025) * (1 - f * 0.65);
            upper.push([bx, by - tuft * (0.6 + r())]);
            lower.push([bx + side * h * 0.005, by + tuft * (0.35 + r() * 0.6)]);
          }
          poly(g, [...upper, ...lower.reverse()], j % 3 ? dark : colour(dark, light, 0.18));
          if (h > 62) {
            for (let k = 0; k < 18; k++) {
              const f = (k + r()) / 18, bx = lerp(xx, tip, f), by = yy + droop * Math.sin(f * 2);
              const nl = h * (0.008 + r() * 0.018) * (1 - f * 0.45);
              const shade = k % 4 ? colour(dark, light, 0.58) : light;
              line(g, [[bx - side * nl * 0.3, by - nl], [bx, by], [bx - side * nl * 0.4, by + nl * 0.8]], shade, Math.max(0.4, h * 0.0011));
              if (h > 140) line(g, [[bx - side * nl * 0.7, by - nl * 0.5], [bx, by]], shade, 0.45);
            }
          }
        }
      }
      if (h > 180) {
        for (let j = 0; j < 30; j++) {
          const u = r(), yy = y - h * u, xx = lerp(x, topX, u);
          line(g, [[xx - 1, yy], [xx + 2, yy - h * 0.023]], tint('#ae9570', n), 0.6);
        }
      }
    }
    function boulder(g, x, y, w, h, n, key) {
      const r = random(seed('stone', key)), p = mixPalette(n);
      const body = [[x - w * 0.5, y], [x - w * 0.58, y - h * 0.42], [x - w * 0.3, y - h * 0.88],
        [x + w * 0.13, y - h], [x + w * 0.49, y - h * 0.6], [x + w * 0.56, y - h * 0.12], [x + w * 0.2, y + h * 0.05]];
      oval(g, x, y + 1, w * 0.68, h * 0.15, tint('#263d32', n));
      poly(g, body, p.rock, p.ink, 0.6);
      poly(g, [body[1], body[2], body[3], [x + w * 0.09, y - h * 0.57], [x - w * 0.31, y - h * 0.3]], tint('#bfc09e', n));
      poly(g, [body[3], body[4], body[5], [x + w * 0.04, y - h * 0.35]], tint('#556653', n));
      hatch(g, body, [x - w * 0.6, y - h, w * 1.2, h], p.ink, 3, -0.27, seed('stone-hatch', key), 0.28);
      for (let i = 0; i < Math.min(100, w * 0.8); i++) {
        const xx = x + (r() - 0.5) * w * 0.75, yy = y - h * (0.1 + r() * 0.45);
        oval(g, xx, yy, 0.6 + r() * 1.6, 0.45 + r(), i % 4 ? p.moss : p.light);
      }
      line(g, [[x - w * 0.18, y - h * 0.82], [x - w * 0.08, y - h * 0.46], [x - w * 0.24, y - h * 0.1]], p.ink, 0.7);
    }
    function ruin(g, x, y, n) {
      const p = mixPalette(n);
      boulder(g, x, y + 3, 132, 42, n, 'ruin-foundation');
      const shape = [[x - 24, y], [x - 24, y - 91], [x - 19, y - 91], [x - 19, y - 102],
        [x - 11, y - 102], [x - 11, y - 91], [x + 1, y - 96], [x + 1, y - 111],
        [x + 9, y - 107], [x + 9, y - 88], [x + 28, y - 81], [x + 27, y]];
      poly(g, shape, tint('#b6b394', n), p.ink, 0.65);
      poly(g, [[x + 8, y], [x + 9, y - 99], [x + 28, y - 81], [x + 27, y]], tint('#788a70', n));
      g.save(); trace(g, shape); g.clip();
      for (let row = 0; row < 15; row++) {
        const yy = y - row * 7;
        line(g, [[x - 25, yy], [x + 28, yy + 1]], tint('#727e65', n), 0.7);
        for (let col = 0; col < 4; col++) {
          const xx = x - 26 + col * 16 + (row % 2) * 8;
          line(g, [[xx, yy], [xx + 0.5, yy - 6]], tint('#7f8970', n), 0.6);
        }
      }
      g.restore();
      for (const [xx, yy, h] of [[x - 8, y - 58, 19], [x + 18, y - 58, 12], [x - 3, y - 19, 20]]) {
        g.beginPath(); g.moveTo(xx - 3, yy); g.lineTo(xx - 3, yy - h);
        g.quadraticCurveTo(xx, yy - h - 7, xx + 3, yy - h); g.lineTo(xx + 3, yy); g.closePath();
        g.fillStyle = tint('#344d46', n); g.fill();
        line(g, [[xx - 4, yy], [xx - 4, yy - h], [xx, yy - h - 6]], p.light, 0.8);
      }
      const r = random(seed('ivy'));
      for (let i = 0; i < 70; i++) {
        const yy = y - r() * 82, xx = x - 18 + Math.sin(yy * 0.07) * 5 + r() * 12;
        oval(g, xx, yy, 1 + r() * 2.5, 1 + r(), tint(i % 2 ? '#77865c' : '#526d53', n), r());
      }
    }
    function pathY(x, view) {
      return profile(x, view === 'valley' ? [[-100, 682], [480, 682], [1080, 663], [1740, 686]]
        : [[-150, 683], [500, 699], [980, 695], [1280, 708], [1750, 694]]);
    }
    function waterShape(view) {
      return view === 'valley' ? [[-20, 566], [365, 545], [802, 559], [1270, 562], [1610, 604], [1610, 649], [1170, 630], [620, 603], [246, 636], [-20, 633]]
        : [[-20, 558], [538, 546], [1083, 559], [1620, 591], [1620, 652], [1190, 640], [560, 652], [-20, 626]];
    }
    function water(g, view, n) {
      const body = waterShape(view), r = random(seed('water', view));
      const grad = g.createLinearGradient(0, 548, 0, 663);
      grad.addColorStop(0, tint('#a6bbb1', n, 0.15)); grad.addColorStop(0.45, tint(M.water, n)); grad.addColorStop(1, tint('#527969', n));
      poly(g, body, grad);
      g.save(); trace(g, body); g.clip();
      const reflect = [[0, 551]];
      for (let x = 0; x <= VW; x += 6) reflect.push([x, 553 + (553 - ridge(x, 1, view)) * 0.29 + Math.sin(x * 0.2) * 2]);
      reflect.push([VW, 550]); g.globalAlpha = 0.2; poly(g, reflect, tint('#56786f', n)); g.globalAlpha = 1;
      for (let i = 0; i < 760; i++) {
        const x = r() * VW, y = 550 + r() * 110, w = 2 + r() * (y - 538) * 0.46;
        g.globalAlpha = 0.1 + r() * 0.26;
        line(g, [[x, y], [x + w, y - r() * 0.6]], tint(i % 3 ? '#dece9f' : '#355c56', n, i % 3 ? 0.25 : 0), 0.6);
      }
      g.restore();
      line(g, body.slice(0, 5), tint('#afba9b', n), 0.6);
    }
    function fern(g, x, y, size, n, key) {
      const r = random(seed('fern', key)), p = mixPalette(n);
      for (let f = 0; f < 5; f++) {
        const dx = (f - 2) * size * 0.25, h = size * (0.55 + r() * 0.5);
        const stalk = [[x, y], [x + dx * 0.25, y - h * 0.6], [x + dx, y - h]];
        curve(g, stalk, p.grass, 0.85);
        for (let j = 1; j < 12; j++) {
          const u = j / 12, xx = x + dx * u * u, yy = y - h * u, l = Math.sin(u * Math.PI) * size * 0.16;
          for (const side of [-1, 1]) {
            poly(g, [[xx, yy], [xx + side * l * 0.62, yy - l * 0.1], [xx + side * l, yy - l * 0.45], [xx + side * l * 0.44, yy + l * 0.18]],
              j % 3 ? p.grass : tint('#9aa36d', n));
            line(g, [[xx, yy], [xx + side * l, yy - l * 0.45]], p.light, 0.28);
          }
        }
      }
    }
    function ground(g, view, n) {
      const p = mixPalette(n), r = random(seed('ground', view));
      const edge = [[-20, 650], [90, 646], [204, 655], [354, 640], [520, 653], [736, 641], [919, 648], [1083, 637], [1271, 656], [1488, 642], [1620, 658]];
      const shape = [...edge, [1620, 920], [-20, 920]];
      poly(g, shape, tint('#697f57', n));
      for (let j = 0; j < 10; j++) {
        const pts = [[-20, 920]];
        for (let x = -20; x <= 1620; x += 30) pts.push([x, 686 + j * 22 + Math.sin(x * 0.004 + j) * (12 + j * 3) + noise(x / 48, 'soil' + j) * 4]);
        pts.push([1620, 920]);
        poly(g, pts, tint(colour('#879362', '#2c493c', j / 13), n));
      }
      // Grasses are drawn as small directional clumps, scaled by depth.
      for (let i = 0; i < 13000; i++) {
        const x = r() * VW, y = 653 + r() * 252, z = (y - 625) / 250;
        if (Math.abs(y - pathY(x, view)) < 13) continue;
        const h = (1 + r() * 5.5) * z, dx = (r() - 0.5) * 4 * z;
        g.globalAlpha = 0.24 + r() * 0.45;
        line(g, [[x, y], [x + dx, y - h]], tint(i % 4 ? '#b1b27b' : '#294b3a', n), 0.5 + z * 0.35);
      }
      g.globalAlpha = 1;
      const route = [], top = [], bottom = [];
      for (let x = -20; x <= 1620; x += 6) {
        route.push([x, pathY(x, view)]);
        top.push([x, pathY(x, view) - 7 + noise(x / 10, 'road-edge') * 2]);
        bottom.push([x, pathY(x, view) + 10 + noise(x / 14, 'road-edge2') * 2]);
      }
      poly(g, [...top, ...bottom.reverse()], tint('#b7aa80', n));
      line(g, route.map(([x, y]) => [x, y + 6]), tint('#d6c598', n), 1);
      line(g, route.map(([x, y]) => [x, y - 4]), tint('#7f815d', n), 0.8);
      for (let i = 0; i < 1100; i++) {
        const x = r() * VW, y = pathY(x, view) - 5 + r() * 12;
        oval(g, x, y, 0.3 + r() * 2.2, 0.25 + r() * 0.7, tint(i % 4 ? '#8b8c6c' : '#e5d1a1', n));
      }
      for (let i = 0; i < 80; i++) {
        const x = r() * VW, y = 715 + r() * 178;
        boulder(g, x, y, 3 + (y - 700) * 0.14 * r(), 2 + (y - 700) * 0.09 * r(), n, i);
      }
      for (let i = 0; i < 160; i++) {
        const x = r() * VW, y = 715 + r() * 190, h = (y - 650) * (0.04 + r() * 0.1);
        const bend = (r() - 0.5) * 8;
        curve(g, [[x, y], [x + bend, y - h * 0.5], [x + bend, y - h]], p.moss, 0.7);
        if (i % 3) {
          for (let k = 0; k < 5; k++) oval(g, x + bend + Math.cos(k * TAU / 5) * 1.7,
            y - h + Math.sin(k * TAU / 5) * 1.2, 1.2, 0.8, tint(i % 7 ? '#dfd3a5' : '#c39a81', n));
          oval(g, x + bend, y - h, 0.8, 0.65, p.gold);
        } else {
          for (let k = 0; k < 5; k++) {
            line(g, [[x + bend, y - h + k * 1.7], [x + bend + 2.5, y - h + k * 1.7 - 3]], p.gold, 0.75);
            line(g, [[x + bend, y - h + k * 1.7], [x + bend - 2.5, y - h + k * 1.7 - 3]], p.light, 0.65);
          }
        }
      }
      // The near bank has actual material forms, not just particles on a flat fill.
      boulder(g, 278, 838, 153, 68, n, 'front-left');
      boulder(g, 351, 856, 67, 31, n, 'front-left2');
      boulder(g, 1404, 849, 116, 53, n, 'front-right');
      for (let i = 0; i < 28; i++) fern(g, 50 + r() * 1510, 836 + r() * 95, 26 + r() * 48, n, i);
      if (view === 'valley') {
        pine(g, 461, 682, 227, n, 'shelter', 0.88);
        pine(g, 392, 693, 156, n, 'shelter2', 0.91);
        boulder(g, 488, 686, 24, 10, n, 'shelter-stone');
      } else {
        // Leave the entry and each job route unobstructed. Props sit beside them.
        boulder(g, 842, 683, 54, 20, n, 'spring');
        oval(g, 852, 681, 27, 5, tint('#8daaa1', n));
        line(g, [[832, 681], [844, 678], [866, 680]], tint('#d0d6b6', n), 0.85);
        pine(g, 1396, 704, 312, n, 'camp-pine', 0.95);
        pine(g, 1490, 723, 242, n, 'camp-pine2', 1);
        for (let i = 0; i < 5; i++) {
          line(g, [[1338, 696 - i * 3], [1375, 690 - i * 3]], tint('#554936', n), 4);
          line(g, [[1338, 695 - i * 3], [1372, 689 - i * 3]], tint('#a08a60', n), 1);
          oval(g, 1338, 696 - i * 3, 2, 2, tint('#b7a173', n));
        }
        for (const [x, y] of [[998, 696], [1150, 692], [1230, 702]]) boulder(g, x, y + 2, 23, 10, n, 'seat' + x);
        // A small lean-to beyond the camp, not a tent appearing mid-action.
        const tent = [[1462, 680], [1501, 630], [1543, 681]];
        poly(g, tent, tint('#ab9c6f', n), p.ink, 1);
        poly(g, [[1501, 630], [1543, 681], [1562, 670], [1521, 626]], tint('#78805b', n), p.ink, 0.6);
        hatch(g, tent, [1462, 628, 85, 55], p.ink, 4, 0.18, seed('canvas-cloth'), 0.25);
        poly(g, [[1490, 680], [1501, 646], [1514, 680]], tint('#3e5241', n));
      }
    }
    function plate(view, n) {
      const key = `plate:${view}:${n}`;
      if (cache.has(key)) return cache.get(key);
      const s = surface(), g = s.g;
      for (let layer = 0; layer < 3; layer++) mountain(g, layer, view, n);
      const r = random(seed('forest', view));
      for (let layer = 0; layer < 3; layer++) {
        const count = 175 - layer * 32;
        for (let i = 0; i < count; i++) {
          const x = i / count * 1700 - 50 + r() * 8;
          const y = 515 + layer * 21 + Math.sin(x * 0.007 + layer) * 9;
          pine(g, x, y, 12 + r() * (24 + layer * 10), n, 'forest' + view + layer + ':' + i, 0.28 + layer * 0.17);
        }
      }
      // One authored landmark provides a focal point and a destination in the distance.
      ruin(g, view === 'valley' ? 1197 : 1022, 526, n);
      water(g, view, n);
      // Far shore stones and reeds follow the waterline rather than a uniform row.
      for (let i = 0; i < 22; i++) {
        const x = r() * VW, y = 646 + Math.sin(x * 0.008) * 6;
        boulder(g, x, y, 2 + r() * 6, 1 + r() * 3, n, 'shore' + i);
      }
      ground(g, view, n);
      // Paper belongs to the static illustrated plate. Baking it avoids a
      // full-screen texture fill on every animation frame.
      g.save(); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.48;
      g.fillStyle = g.createPattern(grain, 'repeat'); g.fillRect(0, 0, VW, VH); g.restore();
      flatten(s); cache.set(key, s.canvas); return s.canvas;
    }
    function shrub(g, x, y, size, n, key) {
      const r = random(seed('shrub', key)), p = mixPalette(n);
      for (let branch = 0; branch < 7; branch++) {
        const angle = -1.1 + branch * 0.35, reach = size * (0.5 + r() * 0.55);
        const tx = x + Math.sin(angle) * reach, ty = y - Math.cos(angle) * reach;
        curve(g, [[x, y], [x + (tx - x) * 0.2, y - reach * 0.4], [tx, ty]], p.bark, 1.5);
        for (let j = 1; j <= 6; j++) {
          const u = j / 6, bx = lerp(x, tx, u), by = lerp(y, ty, u);
          const side = j % 2 ? 1 : -1;
          g.save(); g.translate(bx, by); g.rotate(angle + side * (0.8 + r() * 0.35));
          const h = size * (0.14 + r() * 0.13), w = h * (0.27 + r() * 0.16);
          g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-w, -h * 0.18, -w * 0.9, -h * 0.73, 0, -h);
          g.bezierCurveTo(w * 0.78, -h * 0.78, w, -h * 0.18, 0, 0); g.closePath();
          g.fillStyle = tint(j % 3 ? '#526f48' : '#829660', n); g.fill();
          g.strokeStyle = p.ink; g.lineWidth = 0.55; g.stroke();
          line(g, [[0, 0], [0, -h * 0.92]], p.light, 0.6);
          for (let k = 1; k < 6; k++) {
            const f = k / 6, lw = Math.sin(f * Math.PI) * w * 0.69;
            line(g, [[0, -h * f], [-lw, -h * f - h * 0.09]], p.light, 0.35);
            line(g, [[0, -h * f], [lw, -h * f - h * 0.09]], p.light, 0.35);
          }
          g.restore();
        }
      }
    }
    function foreground(n) {
      const key = `foreground:${n}`;
      if (cache.has(key)) return cache.get(key);
      const s = surface(), g = s.g;
      pine(g, 8, 951, 670, n, 'edge-left', 1);
      pine(g, 1650, 941, 504, n, 'edge-right', 1);
      // Gnarled roots and fallen wood carry visible bark and growth rings.
      const trunk = [[-30, 886], [48, 861], [94, 875], [169, 844], [206, 851], [123, 891], [40, 912]];
      poly(g, trunk, tint('#504e38', n), tint('#243d32', n), 1.5);
      hatch(g, trunk, [-30, 840, 240, 80], tint('#c3a675', n), 3.8, -3, seed('root'), 0.38);
      curve(g, [[-10, 874], [53, 863], [105, 882], [197, 848]], tint('#b39c6d', n), 1.3);
      for (let i = 0; i < 9; i++) fern(g, 20 + i * 21, 912 - i % 3 * 14, 49 + i % 4 * 9, n, 'edge' + i);
      shrub(g, 116, 933, 145, n, 'left');
      shrub(g, 1549, 937, 170, n, 'right');
      shrub(g, 1448, 941, 115, n, 'right2');
      flatten(s); cache.set(key, s.canvas); return s.canvas;
    }
    // Immutable generated paper and cloud sprites. No per-time sprite cache.
    const grain = document.createElement('canvas'); grain.width = 512; grain.height = 512;
    {
      const g = grain.getContext('2d'), img = g.createImageData(512, 512), r = random(seed('paper'));
      for (let i = 0; i < img.data.length; i += 4) {
        const a = r(); img.data[i] = 48; img.data[i + 1] = 40; img.data[i + 2] = 23; img.data[i + 3] = Math.floor(a * a * 22);
      }
      g.putImageData(img, 0, 0);
    }
    const clouds = Array.from({ length: 5 }, (_, i) => {
      const c = document.createElement('canvas'); c.width = 620; c.height = 180;
      const g = c.getContext('2d'), r = random(seed('cloud', i));
      for (let k = 0; k < 72; k++) {
        const x = 78 + r() * 450, y = 65 + Math.sin(x * 0.01 + i) * 12 + r() * 24;
        const rx = 20 + r() * 60, ry = 4 + r() * 17;
        g.globalAlpha = 0.025 + r() * 0.025;
        oval(g, x, y, rx, ry, k % 5 ? '#f3e5c7' : '#64817e');
      }
      for (let k = 0; k < 130; k++) {
        const x = 50 + r() * 480, y = 76 + Math.sin(x * 0.01 + i) * 13 + r() * 25;
        g.globalAlpha = 0.1 + r() * 0.13;
        line(g, [[x, y], [x + 8 + r() * 43, y - 0.2]], k % 4 ? '#e6d3ae' : '#839991', 0.6);
      }
      return c;
    });
    const stars = Array.from({ length: 225 }, (_, i) => ({ x: R('star-x', i) * VW, y: R('star-y', i) * 417, r: i % 17 ? 0.65 : 1.25, phase: R('star-p', i) * TAU }));
    const ripples = Array.from({ length: 130 }, (_, i) => ({ x: R('ripple-x', i) * VW, y: 554 + R('ripple-y', i) * 104, w: 7 + R('ripple-w', i) * 43, phase: R('ripple-p', i) * TAU }));
    const grasses = Array.from({ length: 85 }, (_, i) => ({ x: R('grass-x', i) * VW, y: 805 + R('grass-y', i) * 101, h: 13 + R('grass-h', i) * 31, phase: R('grass-p', i) * TAU, flower: i % 5 === 0 }));
    const rainDrops = Array.from({ length: 180 }, (_, i) => ({ x: R('rain-x', i) * 1900, y: R('rain-y', i) * 1050, speed: 380 + R('rain-v', i) * 210 }));
    function sky(g, s) {
      const top = colour(colour(P.sky, '#a5b9b0', 0.28), P.nightSky, s.night);
      const bottom = colour('#eedab0', P.nightHorizon, s.night);
      const grad = g.createLinearGradient(0, 0, 0, 610);
      grad.addColorStop(0, top); grad.addColorStop(0.65, bottom); grad.addColorStop(1, colour(bottom, '#afbc9d', 0.35));
      g.fillStyle = grad; g.fillRect(0, 0, VW, VH);
      if (s.night > 0) for (const star of stars) {
        g.globalAlpha = s.night * s.night * (0.37 + 0.2 * Math.sin(s.t * 0.17 + star.phase));
        oval(g, star.x, star.y, star.r, star.r, P.moon);
      }
      const sunY = 212 + s.night * 256;
      g.globalAlpha = (1 - s.night) * (1 - s.rain * 0.65);
      const glow = g.createRadialGradient(1192, sunY, 10, 1192, sunY, 193);
      glow.addColorStop(0, '#f3d89b59'); glow.addColorStop(1, '#f3d89b00');
      g.fillStyle = glow; g.fillRect(990, sunY - 205, 410, 410);
      oval(g, 1192, sunY, 24, 24, '#f1d59a');
      g.globalAlpha = smooth(0.45, 0.92, s.night);
      oval(g, 1235, 125, 17, 17, P.moon); oval(g, 1242, 119, 15.5, 15.5, colour(top, bottom, 0.2));
      for (let i = 0; i < 8; i++) {
        const x = mod(i * 291 + s.t * (0.9 + i * 0.07), 2220) - 610;
        const y = 21 + (i % 4) * 67;
        g.globalAlpha = 0.63 - s.night * 0.33 + s.rain * 0.1;
        g.drawImage(clouds[i % clouds.length], x, y, 620, 180);
      }
      g.globalAlpha = 1;
    }
    function feet(g, distance, moving, ink, dog = false) {
      const stride = dog ? 18 : 24;
      for (let i = 0; i < (dog ? 4 : 2); i++) {
        const phase = mod(distance / stride + (i % 2) * 0.5, 1);
        const x = moving ? (phase < 0.5 ? 6 - 24 * phase : -6 + 12 * smooth(0.5, 1, phase)) : (i % 2 ? 3 : -3);
        const lift = moving && phase > 0.5 ? Math.sin((phase - 0.5) * TAU) * 4 : 0;
        const rx = dog ? (i < 2 ? -8 : 8) : 0;
        line(g, [[rx, dog ? -7 : -12], [rx + x * 0.55, -6 - lift], [rx + x, -lift]], ink, dog ? 1.7 : 2.9);
        if (!dog) {
          line(g, [[rx + x - 1.2, -lift], [rx + x + 3.2, -lift]], ink, 2.1);
          line(g, [[rx + x - 1.1, -lift - 0.8], [rx + x + 1, -lift - 0.8]], '#958567', 0.6);
        }
      }
    }
    function actor(g, a, s) {
      const fireLight = s.fire * s.night * clamp(1 - Math.hypot(a.x - 1080, a.y - 709) / 210);
      const shade = c => colour(tint(c, s.night, 0.12), '#e8bc78', fireLight * 0.48);
      const ink = shade('#28382f'), skin = shade('#ddbf8e');
      g.save(); g.translate(a.x, a.y); g.scale(a.scale, a.scale);
      oval(g, 0, 1, a.kind === 'dog' ? 14 : 10, 2.1, '#182f2866');
      if (fireLight > 0.05) {
        g.globalAlpha = fireLight * 0.28;
        poly(g, [[-4, 0], [4, 0], [(a.x - 1080) * 0.18 + 4, 12], [(a.x - 1080) * 0.18 - 4, 12]], '#101c28'); g.globalAlpha = 1;
      }
      g.scale(a.direction, 1);
      if (a.kind === 'dog') {
        const fur = shade('#c0ae87');
        g.globalAlpha = 1 - a.sleep; feet(g, a.distance / a.scale, a.moving, ink, true); g.globalAlpha = 1;
        oval(g, 0, -10 + a.sleep * 6, 12, 5.3, fur);
        oval(g, -1, -12 + a.sleep * 6, 7.7, 3.3, shade('#645e48'));
        const sniff = a.action === 'sniffing' ? smooth(0, 1.5, a.edge) * 5 : 0;
        const hx = 11 - a.sleep * 3, hy = -14 + sniff + a.sleep * 10;
        oval(g, hx, hy, 4.8, 4, fur); oval(g, hx + 4, hy + 1, 3, 2, ink);
        poly(g, [[hx - 3, hy - 3], [hx - 1, hy - 9 + a.sleep * 5], [hx + 2, hy - 2]], ink);
        oval(g, hx + 2, hy - 1, 0.65, 0.65, '#172620');
        line(g, [[hx - 4, hy + 1], [hx - 1, hy + 4]], shade('#ac6a49'), 1.2);
        curve(g, [[-10, -10 + a.sleep * 6], [-16, -14 + a.sleep * 10 - Math.sin(s.t * 2) * 3 * (1 - a.sleep)], [-19, -15 + a.sleep * 12]], fur, 3);
        for (let i = 0; i < 7; i++) line(g, [[-8 + i * 2, -9 + a.sleep * 6], [-9 + i * 2, -6 + a.sleep * 6]], shade('#e0cf9b'), 0.55);
        g.restore(); return;
      }
      const coat = shade(a.colour), light = colour(coat, '#e8d3a4', 0.32);
      const sit = a.sit * (1 - a.sleep * 0.25), bob = a.moving ? Math.sin(a.distance / a.scale / 24 * TAU * 2) * 0.55 : Math.sin(s.t * 1.5 + a.index) * 0.2;
      if (sit < 0.01) feet(g, a.distance / a.scale, a.moving, ink);
      else {
        line(g, [[0, -12 + sit * 8], [8, -7], [10, 0]], ink, 2.9);
        line(g, [[-3, -12 + sit * 8], [-7, -5], [-4, 0]], ink, 2.5);
      }
      g.translate(0, bob + sit * 9 + a.sleep * 5); g.rotate(a.bend * 0.3 + a.sleep * 0.24);
      const hem = Math.sin(s.t * 1.2 + a.index) * s.wind;
      const body = [[-4, -27], [3, -27], [6, -10], [-8 - hem, -9], [-5, -20]];
      poly(g, body, coat, ink, 0.6);
      poly(g, [[-4, -27], [0, -24], [-1, -12], [-6 - hem, -10]], colour(coat, ink, 0.28));
      for (let i = 0; i < 4; i++) line(g, [[-3 + i * 1.6, -23], [-4 + i * 2.2, -12]], i % 2 ? light : colour(coat, ink, 0.35), 0.45);
      line(g, [[-6, -11], [4, -12]], light, 0.7);
      line(g, [[-4, -18], [4, -19]], shade('#645640'), 1.3);
      oval(g, 2.5, -18.8, 1.1, 0.8, shade('#d1b773'));
      g.globalAlpha = 1 - sit;
      const pack = shade('#8a7954');
      poly(g, [[-10, -27], [-5, -28], [-4, -17], [-11, -16]], pack, ink, 0.65);
      oval(g, -8, -29, 4.4, 2.4, shade('#969774'));
      line(g, [[-10, -28], [-6, -28]], light, 0.5);
      line(g, [[-8, -27], [-8, -17]], shade('#544b36'), 0.8);
      line(g, [[-5, -26], [-2, -15]], ink, 0.8);
      g.globalAlpha = 1;
      const swing = a.moving ? Math.sin(a.distance / a.scale / 24 * TAU) * 4 : Math.sin(s.t * 0.7 + a.index) * 0.35;
      line(g, [[1, -24], [4 + swing, -17], [6 + a.bend * 6, -15]], coat, 3.2);
      line(g, [[2, -23], [5 + swing, -18]], light, 0.7);
      oval(g, 6 + a.bend * 6, -15, 1.5, 1.5, skin);
      if (a.index === 0 && sit < 0.5) {
        line(g, [[9, -25], [8 + swing * 0.2, -bob - sit * 9]], shade('#806b48'), 1.4);
        line(g, [[9, -25], [10, -28]], shade('#bca177'), 1.1);
      }
      oval(g, 0.7, -31, 4, 5, skin);
      poly(g, [[-4, -31], [-4, -35], [1, -37], [5, -33], [1, -34], [-1, -30]], ink);
      oval(g, 3.5, -31.6, 0.55, 0.45, ink);
      line(g, [[3.8, -30], [5.1, -29.3], [3.7, -28.7]], skin, 0.9);
      const scarf = shade(a.index === 2 ? '#b58958' : '#715d44');
      line(g, [[-3, -27], [3, -27]], scarf, 1.7);
      curve(g, [[-3, -27], [-8, -24 - s.wind * 1.5], [-12, -25 - s.wind * 2.5]], scarf, 1.3);
      if (a.index === 1) {
        oval(g, 0, -35, 7, 1.5, coat); poly(g, [[-4, -35], [-2, -41], [2, -41], [4, -35]], coat, ink, 0.55);
        line(g, [[-3, -36], [3, -36]], light, 0.75);
      }
      if (a.index === 2) { line(g, [[-3, -32], [-6, -26]], ink, 2.8); line(g, [[-4, -30], [-6, -25]], light, 0.45); }
      g.restore();
      if (a.sit > 0.05) {
        g.save(); g.globalAlpha = a.sit;
        oval(g, a.x - 14, a.y - 5, 5, 7, shade('#8a7954'));
        line(g, [[a.x - 17, a.y - 9], [a.x - 11, a.y - 9]], shade('#d0b57f'), 1); g.restore();
      }
    }
    function fire(g, s) {
      const x = 1080, y = 709;
      for (let i = 0; i < 11; i++) {
        const xx = x + Math.cos(i / 11 * TAU) * 16, yy = y + Math.sin(i / 11 * TAU) * 5;
        oval(g, xx, yy, 3.8, 2.8, tint('#78816b', s.night));
        line(g, [[xx - 2, yy - 1], [xx, yy - 2]], tint('#a9ae88', s.night), 0.7);
      }
      line(g, [[x - 12, y - 2], [x + 12, y + 1]], '#574537', 4);
      line(g, [[x - 10, y + 2], [x + 9, y - 4]], '#6b4c32', 4);
      if (s.fire <= 0) return;
      const strength = s.fire * (0.9 + 0.06 * Math.sin(s.t * 4.9) + 0.04 * Math.sin(s.t * 7.7));
      g.save(); g.globalCompositeOperation = 'screen';
      const glow = g.createRadialGradient(x, y - 5, 2, x, y - 5, 190);
      glow.addColorStop(0, '#edb3678c'); glow.addColorStop(0.24, '#c4823438'); glow.addColorStop(1, '#a9601800');
      g.globalAlpha = strength * (0.25 + s.night * 0.75); g.fillStyle = glow; g.fillRect(x - 195, y - 200, 390, 395); g.restore();
      g.globalAlpha = s.fire;
      for (let i = 0; i < 8; i++) {
        const xx = x - 9 + i * 2.5, h = 10 + (0.5 + 0.5 * Math.sin(s.t * 6.3 + i * 3)) * 19;
        g.beginPath(); g.moveTo(xx - 4, y - 3);
        g.bezierCurveTo(xx - 8, y - h * 0.45, xx + 7, y - h * 0.65, xx + s.wind * 6 + Math.sin(s.t * 5 + i) * 3, y - h);
        g.bezierCurveTo(xx + 9, y - h * 0.45, xx + 7, y - 5, xx - 4, y - 3);
        g.fillStyle = ['#d07e36', '#eda54c', '#f3cd7f', '#f4e0a1'][i % 4]; g.fill();
      }
      for (let i = 0; i < 24; i++) {
        const u = mod(s.t * (0.072 + i * 0.0017) + i / 24, 1);
        const drift = s.wind * u * 68 + Math.sin(s.t * 0.35 + i) * u * 8;
        g.globalAlpha = s.fire * Math.sin(u * Math.PI) * 0.038;
        oval(g, x + drift, y - 19 - u * 170, 4 + u * 21, 4 + u * 14, '#c3c7b6');
      }
      for (let i = 0; i < 9; i++) {
        const u = mod(s.t * 0.29 + i * 0.173, 1);
        g.globalAlpha = s.fire * (1 - u) * 0.75;
        oval(g, x + u * s.wind * 30 + Math.sin(i * 8 + s.t) * 3, y - 10 - u * 65, 0.7, 0.7, '#f2cd83');
      }
      g.globalAlpha = 1;
      // A hanging kettle and a forked support make this a campsite, not a particle emitter.
      line(g, [[x + 24, y], [x + 23, y - 35], [x + 20, y - 39]], tint('#918268', s.night), 1.8);
      line(g, [[x + 23, y - 34], [x + 7, y - 32], [x + 7, y - 21]], tint('#b09d74', s.night), 1.1);
      oval(g, x + 7, y - 18, 5, 4, '#465452'); line(g, [[x + 3, y - 19], [x + 6, y - 21]], '#b8af84', 0.7);
    }
    function paintView(s, view) {
      const g = scratch.g;
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      sky(g, s);
      g.drawImage(plate(view.id, s.night === 1 ? 1 : 0), 0, 0, VW, VH);
      if (s.night > 0 && s.night < 1) { g.globalAlpha = s.night; g.drawImage(plate(view.id, 1), 0, 0, VW, VH); g.globalAlpha = 1; }
      g.save(); trace(g, waterShape(view.id)); g.clip();
      for (const r of ripples) {
        const dx = Math.sin(s.t * 0.18 + r.phase) * 3;
        g.globalAlpha = (0.07 + 0.08 * Math.sin(s.t * 0.7 + r.phase) ** 2) * (1 - s.night * 0.5);
        line(g, [[r.x + dx, r.y], [r.x + r.w + dx, r.y]], tint('#e8d5a2', s.night, 0.4), 0.7);
      }
      g.restore();
      if (view.id === 'camp') fire(g, s);
      [...view.actors].sort((a, b) => a.y - b.y).forEach(a => actor(g, a, s));
      g.globalAlpha = 1; g.drawImage(foreground(s.night === 1 ? 1 : 0), 0, 0, VW, VH);
      if (s.night > 0 && s.night < 1) { g.globalAlpha = s.night; g.drawImage(foreground(1), 0, 0, VW, VH); g.globalAlpha = 1; }
      if (s.night < 0.85) for (let i = 0; i < 6; i++) {
        const x = mod(s.t * 11 + i * 25 + 170, 2050) - 180, y = 297 + i * 5 + Math.sin(s.t * 0.2 + i) * 6;
        const wing = Math.sin(s.t * 6 + i) * 3;
        g.globalAlpha = 0.45 * (1 - s.night); line(g, [[x - 4, y - wing], [x, y], [x + 4, y - wing]], '#29473f', 0.85);
      }
      g.globalAlpha = 1;
      const grassDark = tint('#4e674b', s.night), grassLight = tint('#c5b37a', s.night);
      for (const a of grasses) {
        const sway = Math.sin(s.t * 0.9 + a.phase + a.x * 0.007) * s.wind * a.h * 0.12;
        curve(g, [[a.x, a.y], [a.x + sway * 0.2, a.y - a.h * 0.6], [a.x + sway, a.y - a.h]], grassDark, 0.9);
        for (let k = 0; k < 3; k++) {
          const yy = a.y - a.h * (0.23 + k * 0.16), side = k % 2 ? 1 : -1;
          line(g, [[a.x + sway * 0.2, yy], [a.x + sway * 0.4 + side * 5, yy - 4]], grassDark, 1);
        }
        if (a.flower) {
          for (let k = 0; k < 5; k++) oval(g, a.x + sway + Math.cos(k * TAU / 5) * 1.8, a.y - a.h + Math.sin(k * TAU / 5) * 1.2, 1.3, 0.9, grassLight);
        }
      }
      if (s.night > 0.3) for (let i = 0; i < 18; i++) {
        g.globalAlpha = s.night * Math.pow(0.5 + 0.5 * Math.sin(s.t * 1.1 + i * 5), 5) * 0.55;
        oval(g, 170 + mod(i * 173.17, 1280) + Math.sin(s.t * 0.4 + i) * 7, 691 + mod(i * 37.77, 130) + Math.sin(s.t * 0.55 + i) * 4, 1.1, 1.1, '#d5d799');
      }
      g.globalAlpha = 1;
      if (s.rain > 0) {
        g.fillStyle = `rgba(37,55,67,${s.rain * 0.16})`; g.fillRect(0, 0, VW, VH); g.globalAlpha = s.rain * 0.21;
        for (const a of rainDrops) {
          const x = mod(a.x - s.t * 95, 1900) - 150, y = mod(a.y + s.t * a.speed, 1050) - 70;
          line(g, [[x, y], [x - 3, y + 17]], '#cad4cc', 0.7);
        }
      }
      g.globalAlpha = 1;
      const vignette = g.createRadialGradient(815, 415, 355, 815, 440, 1050);
      vignette.addColorStop(0, '#182c2600'); vignette.addColorStop(1, '#14291f39');
      g.fillStyle = vignette; g.fillRect(0, 0, VW, VH);
      return scratch.canvas;
    }
    function paintState(t) {
      const s = world.sample(t), g = frame.g;
      for (let i = 0; i < s.views.length; i++) {
        g.globalAlpha = i === 0 ? 1 : s.views[i].weight;
        g.drawImage(paintView(s, s.views[i]), 0, 0, VW, VH);
      }
      g.globalAlpha = 1; return s;
    }
    function renderFrame(t, options = {}) {
      const times = options.loop ? W.loopTimes(t, C.duration, C.transition) : [{ t, weight: 1 }];
      out.setTransform(1, 0, 0, 1, 0, 0); out.globalAlpha = 1; out.fillStyle = '#10191e'; out.fillRect(0, 0, C.width, C.height);
      out.setTransform(scale, 0, 0, scale, (C.width - VW * scale) / 2, (C.height - VH * scale) / 2);
      let state;
      for (let i = 0; i < times.length; i++) {
        state = paintState(times[i].t); out.globalAlpha = i === 0 ? 1 : times[i].weight;
        out.drawImage(frame.canvas, 0, 0, VW, VH);
      }
      out.globalAlpha = 1; return state;
    }
    function destroy() {
      for (const c of [...cache.values(), ...clouds, grain, scratch.canvas, frame.canvas]) { c.width = 0; c.height = 0; }
      cache.clear();
    }
    return Object.freeze({ config: C, world, renderFrame, destroy });
  }
  root.LivingScene = Object.freeze({ create });
})(globalThis);
