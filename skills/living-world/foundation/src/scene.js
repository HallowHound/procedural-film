/* A fully procedural, reusable two-vista demonstration. All animation is sampled, not simulated. */
(function (root) {
  'use strict';
  const W = root.LivingWorld, { lerp, smooth, mod, random: rnd } = W;
  const TAU = Math.PI * 2, VW = 1600, VH = 900;
  function colour(a, b, t) {
    const channels = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
    return '#' + channels(a).map((v, i) => Math.round(lerp(v, channels(b)[i], t)).toString(16).padStart(2, '0')).join('');
  }
  function poly(g, points, fill) {
    g.beginPath(); points.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p));
    g.closePath(); g.fillStyle = fill; g.fill();
  }
  function line(g, points, stroke, width = 1) {
    g.beginPath(); points.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p));
    g.strokeStyle = stroke; g.lineWidth = width; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
  }
  function oval(g, x, y, rx, ry, fill) {
    g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), 0, 0, TAU); g.fillStyle = fill; g.fill();
  }
  function pine(g, x, y, h, fill, seed) {
    line(g, [[x, y], [x, y - h]], fill, Math.max(1, h * 0.025));
    for (let i = 0; i < 12; i++) {
      const u = (i + 1) / 13, yy = y - h + h * u, half = h * (0.03 + u * 0.2);
      const jitter = (rnd(seed, i) - 0.5) * half * 0.3;
      poly(g, [[x + jitter, yy - h * 0.17], [x - half, yy + h * 0.065], [x - half * 0.3, yy + h * 0.03],
        [x, yy + h * 0.09], [x + half * 0.8, yy + h * 0.055], [x + half * 0.35, yy]], fill);
    }
  }
  function create(canvas, input) {
    const world = W.create(input), C = world.config, P = C.palette;
    const scale = Math.min(C.width / VW, C.height / VH);
    canvas.width = C.width; canvas.height = C.height;
    const out = canvas.getContext('2d', { alpha: false });
    function surface() {
      const c = document.createElement('canvas');
      c.width = Math.round(VW * scale); c.height = Math.round(VH * scale);
      const g = c.getContext('2d'); g.setTransform(c.width / VW, 0, 0, c.height / VH, 0, 0);
      return { canvas: c, g };
    }
    const cache = new Map(), scratch = surface(), frame = surface();
    const R = (...keys) => rnd(C.seed, ...keys);
    function ridge(x, layer, view) {
      const shift = (view === 'camp' ? 180 : 0) + layer * 93;
      const noise = (z, salt) => {
        const i = Math.floor(z), u = smooth(0, 1, z - i);
        return lerp(R('ridge', salt, i), R('ridge', salt, i + 1), u) * 2 - 1;
      };
      const peaks = [[170, 210, 270], [710, 258, 250], [1290, 225, 310]];
      const mountain = peaks.reduce((height, [px, h, width]) => height + h * Math.exp(-Math.pow((x + shift - px) / width, 2)), 0);
      return 481 + layer * 30 - mountain * Math.pow(0.78, layer)
        + noise((x + shift) / 76, layer) * 21 + noise((x + shift) / 19, layer + 7) * 4;
    }
    function background(view, night) {
      const key = `${view}:${night}`;
      if (cache.has(key)) return cache.get(key);
      const s = surface(), g = s.g, tint = c => colour(c, '#152831', night * 0.79);
      for (let layer = 0; layer < 4; layer++) {
        const points = [[0, VH]];
        for (let x = -10; x <= VW + 10; x += 7) points.push([x, ridge(x, layer, view)]);
        points.push([VW, VH]);
        poly(g, points, tint([P.far, '#708981', P.mid, P.near][layer]));
        g.globalAlpha = 0.11;
        for (let i = 0; i < 180; i++) {
          const x = R('crag', layer, i) * VW, y = ridge(x, layer, view);
          line(g, [[x, y + 5], [x + 15 + R('crag-l', i) * 35, y + 42], [x + 4, y + 91]], tint(P.horizon), 0.8);
        }
        g.globalAlpha = 1;
      }
      // Forest has fixed geometry; daylight and night plates use the same seeds.
      for (let i = 0; i < 300; i++) {
        const x = R('forest-x', view, i) * 1700 - 50;
        const y = 524 + R('forest-y', i) * 54;
        pine(g, x, y, 12 + R('forest-h', i) * 54, tint(i % 2 ? P.near : P.mid), i);
      }
      const water = g.createLinearGradient(0, 551, 0, 705);
      water.addColorStop(0, tint(P.water)); water.addColorStop(1, tint('#405e59'));
      poly(g, [[-20, 565], [490, 550], [1040, 596], [1460, 660], [1600, 713], [0, 741]], water);
      g.globalAlpha = 0.15;
      for (let i = 0; i < 90; i++) {
        const x = R('reflection', i) * 1400, y = 567 + R('reflection-y', i) * 112;
        line(g, [[x, y], [x + 10 + R('reflection-w', i) * 65, y]], tint(P.horizon), 1);
      }
      g.globalAlpha = 1;
      poly(g, [[0, 660], [190, 648], [370, 658], [570, 659], [760, 654], [1070, 640], [1370, 658], [1600, 664], [1600, 900], [0, 900]], tint(P.ground));
      const route = view === 'valley' ? [[-50, 682], [480, 682], [1080, 663], [1660, 683]] : [[-50, 683], [500, 699], [970, 695], [1280, 707]];
      line(g, route, tint('#6f7154'), 23); line(g, route, tint(P.path), 14);
      g.globalAlpha = 0.22;
      line(g, route.map(([x, y]) => [x, y + 5]), tint('#ead9b1'), 1.2);
      g.globalAlpha = 1;
      for (let i = 0; i < 1900; i++) {
        const x = R('ground-x', i) * VW, y = 723 + R('ground-y', i) * 177;
        const light = i % 4 === 0;
        g.globalAlpha = light ? 0.12 : 0.2;
        oval(g, x, y, 0.5 + R('grain', i) * 2.6, 0.55, tint(light ? P.horizon : '#112d29'));
      }
      g.globalAlpha = 1;
      for (let i = 0; i < 48; i++) {
        const x = R('stone-x', i) * VW, y = 719 + R('stone-y', i) * 149, r = 2 + R('stone-r', i) * 11;
        poly(g, [[x - r, y], [x - r * 0.7, y - r * 0.5], [x + r * 0.3, y - r * 0.8], [x + r, y - r * 0.2], [x + r * 0.8, y + r * 0.2]], tint('#708077'));
        line(g, [[x - r * 0.7, y - r * 0.5], [x + r * 0.3, y - r * 0.8]], tint('#a0a48b'), 0.9);
      }
      if (view === 'valley') {
        pine(g, 465, 694, 208, tint('#274a40'), 91);
        pine(g, 408, 699, 158, tint('#315246'), 92);
        pine(g, 1480, 695, 198, tint('#294b41'), 93);
      } else {
        // A tiny spring beside camp gives the water-fetching trip a destination.
        oval(g, 849, 683, 34, 8, tint(P.water));
        line(g, [[821, 683], [842, 676], [868, 679]], tint('#87988e'), 3);
        pine(g, 1375, 708, 314, tint('#234238'), 94);
        pine(g, 1450, 717, 254, tint('#2a4b3d'), 95);
        for (let i = 0; i < 4; i++) line(g, [[1339, 694 - i * 3], [1373, 688 - i * 3]], tint('#695540'), 4);
        for (const [x, y] of [[998, 696], [1150, 692], [1230, 702]]) oval(g, x, y + 1, 13, 4, tint('#656956'));
      }
      cache.set(key, s.canvas); return s.canvas;
    }
    function sky(g, s) {
      const top = colour(P.sky, P.nightSky, s.night), bottom = colour(P.horizon, P.nightHorizon, s.night);
      const grad = g.createLinearGradient(0, 0, 0, 700);
      grad.addColorStop(0, top); grad.addColorStop(0.72, bottom); grad.addColorStop(1, colour(bottom, P.water, 0.3));
      g.fillStyle = grad; g.fillRect(0, 0, VW, VH);
      for (let i = 0; i < 150; i++) {
        g.globalAlpha = s.night * s.night * (0.25 + 0.6 * (0.5 + 0.5 * Math.sin(s.t * 0.23 + i * 9)));
        oval(g, R('star-x', i) * VW, R('star-y', i) * 410, i % 13 ? 0.7 : 1.2, i % 13 ? 0.7 : 1.2, P.moon);
      }
      g.globalAlpha = (1 - s.night) * (1 - s.rain * 0.6);
      const sunY = 228 + s.night * 260;
      const glow = g.createRadialGradient(1120, sunY, 4, 1120, sunY, 170);
      glow.addColorStop(0, '#f4dba877'); glow.addColorStop(1, '#efd0a000');
      g.fillStyle = glow; g.fillRect(930, sunY - 180, 380, 360);
      oval(g, 1120, sunY, 27, 27, '#f0d8a9');
      g.globalAlpha = smooth(0.5, 0.92, s.night);
      oval(g, 1240, 141, 19, 19, P.moon);
      oval(g, 1248, 136, 17, 17, colour(top, bottom, 0.18));
      g.globalAlpha = 1;
      for (let i = 0; i < 9; i++) {
        const x = mod(R('cloud-x', i) * 2050 + s.t * (0.65 + i * 0.06), 2050) - 220;
        const y = 87 + R('cloud-y', i) * 244;
        g.globalAlpha = (0.045 + R('cloud-a', i) * 0.065) * (1 - s.night * 0.45);
        for (let k = 0; k < 5; k++) oval(g, x + k * 45, y + Math.sin(k * 2 + i) * 9, 70 + k * 8, 9 + k * 2, P.moon);
      }
      g.globalAlpha = 1;
    }
    function feet(g, distance, moving, tint, isDog = false) {
      const stride = isDog ? 18 : 24;
      for (let i = 0; i < (isDog ? 4 : 2); i++) {
        const phase = mod(distance / stride + (i % 2) * 0.5, 1);
        const x = moving ? (phase < 0.5 ? 6 - 24 * phase : -6 + 12 * smooth(0.5, 1, phase)) : (i % 2 ? 3 : -3);
        const lift = moving && phase > 0.5 ? Math.sin((phase - 0.5) * TAU) * 4 : 0;
        const rootX = isDog ? (i < 2 ? -8 : 8) : 0;
        line(g, [[rootX, isDog ? -7 : -12], [rootX + x * 0.55, -6 - lift], [rootX + x, -lift]], tint, isDog ? 1.5 : 2.5);
        if (!isDog) line(g, [[rootX + x - 1, -lift], [rootX + x + 2.8, -lift]], tint, 2);
      }
    }
    function actor(g, a, s) {
      const dark = colour('#27342f', '#101923', s.night * 0.65);
      const skin = colour('#dbbb91', '#8a8279', s.night * 0.75);
      g.save(); g.translate(a.x, a.y); g.scale(a.scale, a.scale);
      oval(g, 0, 1, a.kind === 'dog' ? 13 : 10, 2.3, '#10282044');
      g.scale(a.direction, 1);
      if (a.kind === 'dog') {
        const fur = colour('#bbab87', '#565e5c', s.night * 0.7);
        g.globalAlpha = 1 - a.sleep;
        feet(g, a.distance / a.scale, a.moving, dark, true);
        g.globalAlpha = 1;
        oval(g, 0, -10 + a.sleep * 6, 12, 5, fur);
        const sniff = a.action === 'sniffing' ? smooth(0, 1.5, a.edge) * 5 : 0;
        const hx = 11 - a.sleep * 3, hy = -14 + sniff + a.sleep * 10;
        oval(g, hx, hy, 5, 4, fur); oval(g, hx + 4, hy + 1, 3, 2, dark);
        poly(g, [[hx - 3, hy - 3], [hx - 1, hy - 9 + a.sleep * 5], [hx + 2, hy - 2]], dark);
        line(g, [[-10, -10 + a.sleep * 6], [-16, -14 + a.sleep * 10 - Math.sin(s.t * 2) * 3 * (1 - a.sleep)], [-17, -18 + a.sleep * 14]], fur, 3);
        g.restore(); return;
      }
      const coat = colour(a.colour, '#34444a', s.night * 0.67);
      const sit = a.sit * (1 - a.sleep * 0.25), bob = a.moving ? Math.sin(a.distance / a.scale / 24 * TAU * 2) * 0.55 : Math.sin(s.t * 1.5 + a.index) * 0.2;
      if (sit < 0.01) feet(g, a.distance / a.scale, a.moving, dark);
      else {
        line(g, [[0, -12 + sit * 8], [8, -7], [10, 0]], dark, 2.7);
        line(g, [[-3, -12 + sit * 8], [-7, -5], [-4, 0]], dark, 2.3);
      }
      g.translate(0, bob + sit * 9 + a.sleep * 5);
      g.rotate(a.bend * 0.3 + a.sleep * 0.24);
      poly(g, [[-4, -27], [3, -27], [6, -10], [-8 - Math.sin(s.t * 1.2 + a.index) * s.wind, -9], [-5, -20]], coat);
      line(g, [[-3, -26], [-5, -12]], colour(coat, P.moon, 0.2), 0.8);
      g.globalAlpha = 1 - sit;
      oval(g, -7, -22, 4.5, 6.5, colour('#887858', '#364344', s.night * 0.65));
      line(g, [[-5, -26], [-2, -15]], dark, 0.9);
      g.globalAlpha = 1;
      const swing = a.moving ? Math.sin(a.distance / a.scale / 24 * TAU) * 4 : Math.sin(s.t * 0.7 + a.index) * 0.35;
      line(g, [[1, -24], [4 + swing, -17], [6 + a.bend * 6, -15]], coat, 3);
      oval(g, 6 + a.bend * 6, -15, 1.5, 1.5, skin);
      if (a.index === 0 && sit < 0.5) line(g, [[9, -23], [8 + swing * 0.2, -bob - sit * 9]], '#9e8969', 1.3);
      oval(g, 0.7, -31, 4, 5, skin);
      poly(g, [[-4, -31], [-4, -35], [1, -37], [5, -33], [1, -34], [-1, -30]], dark);
      if (a.index === 1) { oval(g, 0, -35, 7, 1.5, coat); poly(g, [[-4, -35], [-2, -41], [2, -41], [4, -35]], coat); }
      if (a.index === 2) line(g, [[-3, -32], [-6, -26]], dark, 3);
      g.restore();
      if (a.sit > 0.05) {
        g.save(); g.globalAlpha = a.sit; oval(g, a.x - 14, a.y - 5, 5, 7, colour('#887858', '#364344', s.night * 0.65)); g.restore();
      }
    }
    function fire(g, s) {
      const x = 1080, y = 709;
      for (let i = 0; i < 9; i++) oval(g, x + Math.cos(i / 9 * TAU) * 16, y + Math.sin(i / 9 * TAU) * 5, 4, 2.5, '#646b60');
      line(g, [[x - 12, y - 2], [x + 12, y + 1]], '#574537', 4);
      line(g, [[x - 10, y + 2], [x + 9, y - 4]], '#6b4c32', 4);
      if (s.fire <= 0) return;
      const strength = s.fire * (0.88 + 0.12 * Math.sin(s.t * 4.9));
      const glow = g.createRadialGradient(x, y - 9, 2, x, y - 9, 108);
      glow.addColorStop(0, '#efac5366'); glow.addColorStop(0.45, '#ee9a3320'); glow.addColorStop(1, '#ed952000');
      g.globalAlpha = strength * (0.45 + s.night * 0.55);
      g.fillStyle = glow; g.fillRect(x - 110, y - 120, 220, 230);
      g.globalAlpha = s.fire;
      for (let i = 0; i < 6; i++) {
        const xx = x - 8 + i * 3, h = 11 + (0.5 + 0.5 * Math.sin(s.t * 6.3 + i * 3)) * 18;
        poly(g, [[xx - 4, y - 3], [xx - 3 + s.wind * 5, y - h * 0.55], [xx + Math.sin(s.t * 5 + i) * 3 + s.wind * 7, y - h], [xx + 5, y - 5]], i % 2 ? '#ef9c43' : '#e9c773');
      }
      for (let i = 0; i < 22; i++) {
        const u = mod(s.t * (0.09 + R('smoke-v', i) * 0.025) + i / 22, 1);
        const drift = s.wind * u * 65 + Math.sin(s.t * 0.35 + i) * u * 8;
        g.globalAlpha = s.fire * Math.sin(u * Math.PI) * 0.032;
        oval(g, x + drift, y - 20 - u * 160, 5 + u * 18, 5 + u * 12, '#c3c2b3');
      }
      for (let i = 0; i < 7; i++) {
        const u = mod(s.t * 0.34 + i * 0.17, 1);
        g.globalAlpha = s.fire * (1 - u) * 0.6;
        oval(g, x + u * s.wind * 30 + Math.sin(i * 8 + s.t) * 3, y - 10 - u * 55, 0.7, 0.7, '#f2cd83');
      }
      g.globalAlpha = 1;
    }
    function paintView(s, view) {
      const g = scratch.g;
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      sky(g, s);
      g.drawImage(background(view.id, 0), 0, 0, VW, VH);
      g.globalAlpha = s.night; g.drawImage(background(view.id, 1), 0, 0, VW, VH); g.globalAlpha = 1;
      // Surface ripples are small, asynchronous and confined to visible open water.
      for (let i = 0; i < 70; i++) {
        const x = R('ripple-x', i) * 820, y = 574 + R('ripple-y', i) * 64;
        g.globalAlpha = (0.025 + 0.055 * (0.5 + 0.5 * Math.sin(s.t * 0.9 + i * 4))) * (1 - s.night * 0.6);
        line(g, [[x + Math.sin(s.t * 0.24 + i) * 4, y], [x + 9 + R('ripple-w', i) * 38, y]], P.moon, 0.8);
      }
      g.globalAlpha = 1;
      if (view.id === 'camp') fire(g, s);
      [...view.actors].sort((a, b) => a.y - b.y).forEach(a => actor(g, a, s));
      // Unrelated bird flight cycles; entry/wrap takes place outside the view.
      if (s.night < 0.85) {
        for (let i = 0; i < 6; i++) {
          const x = mod(s.t * 11 + i * 25 + 170, 2050) - 180;
          const y = 294 + i * 5 + Math.sin(s.t * 0.2 + i) * 6;
          const wing = Math.sin(s.t * 6 + i) * 3;
          g.globalAlpha = 0.4 * (1 - s.night);
          line(g, [[x - 4, y - wing], [x, y], [x + 4, y - wing]], '#203c3d', 1);
        }
      }
      // Foreground vegetation is animated from a shared wind field.
      g.globalAlpha = 1;
      for (let i = 0; i < 140; i++) {
        const x = R('grass-x', i) * VW, y = 758 + R('grass-y', i) * 145, h = 7 + R('grass-h', i) * 27;
        const sway = Math.sin(s.t * 1.1 + x * 0.02) * s.wind * h * 0.12;
        line(g, [[x, y], [x + sway * 0.3, y - h * 0.6], [x + sway, y - h]], colour('#567157', '#1a302f', s.night), 1.1);
        if (i % 11 === 0) oval(g, x + sway, y - h, 1.3, 1.5, colour('#d9b984', '#65756e', s.night));
      }
      const foreground = colour('#203e34', '#10232b', s.night);
      pine(g, -35, 970, 482, foreground, 411);
      pine(g, 1635, 968, view.id === 'camp' ? 427 : 372, foreground, 412);
      if (s.night > 0.3) for (let i = 0; i < 24; i++) {
        g.globalAlpha = s.night * Math.pow(0.5 + 0.5 * Math.sin(s.t * 1.3 + i * 5), 5) * 0.55;
        oval(g, 170 + R('fly-x', i) * 1280 + Math.sin(s.t * 0.4 + i) * 7, 665 + R('fly-y', i) * 120 + Math.sin(s.t * 0.55 + i) * 4, 1.2, 1.2, '#d5d799');
      }
      g.globalAlpha = 1;
      if (s.rain > 0) {
        g.fillStyle = `rgba(37,55,67,${s.rain * 0.13})`; g.fillRect(0, 0, VW, VH);
        g.globalAlpha = s.rain * 0.16;
        for (let i = 0; i < 160; i++) {
          const x = mod(R('rain-x', i) * 1900 - s.t * 95, 1900) - 150;
          const y = mod(R('rain-y', i) * 1000 + s.t * 580, 1000) - 60;
          line(g, [[x, y], [x - 3, y + 17]], '#c0ccd0', 0.85);
        }
      }
      g.globalAlpha = 1;
      const vignette = g.createRadialGradient(800, 425, 270, 800, 460, 1020);
      vignette.addColorStop(0, '#07151c00'); vignette.addColorStop(1, '#07151c66');
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
      for (const c of cache.values()) { c.width = 0; c.height = 0; }
      cache.clear(); scratch.canvas.width = 0; frame.canvas.width = 0;
    }
    return Object.freeze({ config: C, world, renderFrame, destroy });
  }
  root.LivingScene = Object.freeze({ create });
})(globalThis);
