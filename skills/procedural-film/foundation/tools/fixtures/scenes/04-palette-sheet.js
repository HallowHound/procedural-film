// Fixture scene: the film's own palette. Every name in lib.pal as a labelled swatch,
// so the palette written in step 3 is looked at before scene agents copy it into 17 files.
// The names are paged over the shot: snap with --samples N to see every page.
FILM.scene({
  id: 'palette',
  draw(ctx, t, info) {
    const L = info.lib, P = L.pal;
    const names = Object.keys(P).filter((k) => typeof P[k] === 'string' && /^#/.test(P[k]));

    const COLS = 4, ROWS = 4, PER = COLS * ROWS;
    const CHIP = 186, GAPX = 38, GAPY = 78, X0 = 76;
    const pages = Math.max(1, Math.ceil(names.length / PER));
    const page = Math.min(pages - 1, Math.floor(L.clamp(t / info.dur, 0, 0.999) * pages));
    const shown = names.slice(page * PER, page * PER + PER);

    // 1. plate: paper above the fold, blueprint below, so every colour is judged on both
    L.paper(ctx, { seed: 4 });
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 1020, 1080, 900);
    ctx.clip();
    L.blueprint(ctx, { seed: 6, center: [540, 1460] });
    ctx.restore();

    // 2. swatches, half on each plate: chip, name, hex
    shown.forEach((name, i) => {
      const c = i % COLS, r = Math.floor(i / COLS);
      const onPaper = r < ROWS / 2;
      const x = X0 + c * (CHIP + GAPX);
      const y = onPaper ? 250 + r * (CHIP + GAPY) : 1090 + (r - ROWS / 2) * (CHIP + GAPY);
      const label = onPaper ? P.ink : P.lineWhite;
      ctx.save();
      ctx.fillStyle = P[name];
      ctx.fillRect(x, y, CHIP, CHIP);
      ctx.restore();
      L.inkPath(ctx, [[x, y], [x + CHIP, y], [x + CHIP, y + CHIP], [x, y + CHIP]], {
        closed: true, color: label, width: 1.6, alpha: 0.75, seed: 100 + i,
      });
      L.text(ctx, name, x, y + CHIP + 30, { size: 22, color: label, alpha: 0.95 });
      L.text(ctx, P[name].toLowerCase(), x, y + CHIP + 54, { size: 19, color: label, alpha: 0.6 });
    });

    // 3. headings
    L.text(ctx, `palette · ${names.length} names`, 76, 150, { size: 38, color: P.ink, tracking: 1 });
    L.text(ctx, `page ${page + 1}/${pages}`, 1004, 150, { size: 26, color: P.inkFaint, align: 'right', italic: true });
    L.text(ctx, 'on paper', 1004, 196, { size: 24, color: P.inkFaint, align: 'right', italic: true });
    L.text(ctx, 'on blueprint', 1004, 1090, { size: 24, color: P.lavender, align: 'right', italic: true });
  },
});
