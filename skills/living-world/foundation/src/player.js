/* Clock/host integration is deliberately outside the deterministic world and renderer. */
(function () {
  'use strict';
  let app;
  const host = { paused: false, fps: 60 };
  // Register immediately: Wallpaper Engine may deliver properties before initialization.
  window.wallpaperPropertyListener = {
    applyGeneralProperties(properties) {
      if (Object.hasOwn(properties, 'fps') && Number.isFinite(properties.fps) && properties.fps >= 0) {
        host.fps = properties.fps === 0 ? 60 : Math.max(1, properties.fps);
        if (app) app.refreshHost();
      }
    },
    setPaused(value) { host.paused = !!value; if (app) app.refreshHost(); }
  };
  function boot() {
    const q = new URLSearchParams(location.search), renderMode = q.get('render') === '1' || window.LIVING_RENDER === true;
    const wallpaper = q.get('wallpaper') === '1';
    const input = { ...window.LIVING_CONFIG, ...(window.LIVING_OVERRIDE || {}) };
    for (const key of ['duration', 'seed', 'fps', 'width', 'height']) if (q.has(key)) input[key] = Number(q.get(key));
    const renderer = LivingScene.create(document.getElementById('world'), input), C = renderer.config;
    document.title = `${C.title} · Living World`;
    document.body.classList.toggle('wallpaper', wallpaper);
    document.body.classList.toggle('render', renderMode);
    const seekBar = document.getElementById('seek'), playButton = document.getElementById('play');
    const label = document.getElementById('label'), speedSelect = document.getElementById('speed'), loopBox = document.getElementById('loop');
    const storageKey = `living-world:${C.title}:${C.seed}:${C.duration}`;
    let t = q.has('t') ? Number(q.get('t')) : 0, rate = q.has('speed') ? Number(q.get('speed')) : 1;
    if (!Number.isFinite(t) || !Number.isFinite(rate) || rate < 0.1 || rate > 60) throw new Error('Invalid t or speed URL parameter');
    if (wallpaper && !renderMode && !q.has('t')) {
      try { const value = localStorage.getItem(storageKey); if (value !== null && Number.isFinite(Number(value))) t = Number(value); } catch (_) { /* Storage may be unavailable in a wallpaper host. */ }
    }
    t = LivingWorld.clamp(t, 0, C.duration);
    let looping = wallpaper || q.get('loop') === '1', userPaused = false, raf = null;
    let lastStamp = null, lastDraw = -Infinity, lastSave = 0, destroyed = false;
    const paused = () => userPaused || host.paused || document.hidden;
    const fps = () => Math.min(C.fps, host.fps);
    function save() {
      if (wallpaper && !renderMode) try { localStorage.setItem(storageKey, String(t)); } catch (_) { /* Optional persistence. */ }
    }
    function draw() {
      const state = renderer.renderFrame(t, { loop: looping });
      seekBar.value = String(t); loopBox.checked = looping;
      playButton.textContent = userPaused ? 'Play' : 'Pause';
      label.textContent = `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')} · ${state.chapter}`;
    }
    function schedule() { if (!destroyed && !renderMode && !paused() && raf === null) raf = requestAnimationFrame(tick); }
    function refreshHost() {
      lastStamp = null;
      if (paused() && raf !== null) { cancelAnimationFrame(raf); raf = null; save(); }
      schedule();
    }
    function tick(stamp) {
      raf = null;
      if (paused() || destroyed) { lastStamp = null; return; }
      if (lastStamp !== null) t += Math.min((stamp - lastStamp) / 1000, 0.25) * rate;
      lastStamp = stamp;
      const end = looping ? C.duration - C.transition : C.duration;
      if (t >= end) {
        if (looping) t = LivingWorld.mod(t, end);
        else { t = end; userPaused = true; }
      }
      if (stamp - lastDraw >= 1000 / fps() - 0.5 || userPaused) { draw(); lastDraw = stamp; }
      if (stamp - lastSave > 30000) { save(); lastSave = stamp; }
      schedule();
    }
    function seek(value) {
      if (!Number.isFinite(value)) throw new Error('Seek time must be finite');
      t = LivingWorld.clamp(value, 0, looping ? C.duration - C.transition : C.duration);
      lastStamp = null; draw(); return t;
    }
    function setPaused(value) { userPaused = !!value; refreshHost(); draw(); }
    function setSpeed(value) {
      if (!Number.isFinite(value) || value < 0.1 || value > 60) throw new Error('Speed must be in [0.1, 60]');
      rate = value; lastStamp = null;
    }
    function keyboard(event) {
      if (['INPUT', 'SELECT', 'BUTTON'].includes(event.target.tagName)) return;
      if (event.code === 'Space') { event.preventDefault(); setPaused(!userPaused); }
      else if (event.code === 'ArrowRight') seek(t + 10);
      else if (event.code === 'ArrowLeft') seek(t - 10);
    }
    function visibility() { save(); refreshHost(); }
    seekBar.max = String(C.duration); speedSelect.value = String(rate);
    playButton.onclick = () => setPaused(!userPaused);
    seekBar.oninput = () => seek(Number(seekBar.value));
    speedSelect.onchange = () => setSpeed(Number(speedSelect.value));
    loopBox.onchange = () => { looping = loopBox.checked; seek(t); };
    window.addEventListener('keydown', keyboard);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', save);
    app = window.LIVING = {
      config: C, world: renderer.world, renderFrame: renderer.renderFrame, stateAt: renderer.world.sample,
      get time() { return t; }, get paused() { return paused(); }, get fps() { return fps(); },
      seek, setPaused, setSpeed, refreshHost,
      destroy() {
        save(); destroyed = true;
        if (raf !== null) cancelAnimationFrame(raf);
        window.removeEventListener('keydown', keyboard);
        document.removeEventListener('visibilitychange', visibility);
        window.removeEventListener('pagehide', save);
        renderer.destroy();
      }
    };
    if (!renderMode) { draw(); schedule(); }
  }
  try { boot(); } catch (error) {
    const box = document.getElementById('error'); box.hidden = false; box.textContent = `Living World could not start.\n${error.message}`;
    throw error;
  }
})();
