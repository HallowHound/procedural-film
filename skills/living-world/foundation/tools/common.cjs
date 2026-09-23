'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const World = require('../src/world.js');
const ROOT = path.resolve(__dirname, '..');
const SOURCE = ['LICENSE', 'index.html', 'src/config.js', 'src/world.js', 'src/scene.js', 'src/player.js'];
const resolve = p => path.resolve(ROOT, p);
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
function parse(argv) {
  const command = argv[0] || 'help', args = {};
  const booleans = new Set(['resume', 'loop-audio', 'help']);
  const allowed = new Set(['width', 'height', 'fps', 'duration', 'seed', 'out', 'from', 'to', 'chunk', 'crf', 'preset', 'audio', 'resume', 'loop-audio', 'times', 'samples', 'budget', 'port', 'help']);
  for (let i = 1; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '');
    if (!argv[i].startsWith('--') || !allowed.has(key) || Object.hasOwn(args, key)) throw new Error(`Unknown or repeated argument: ${argv[i]}`);
    if (booleans.has(key)) args[key] = true;
    else {
      const value = argv[++i];
      if (!value || value.startsWith('--')) throw new Error(`--${key} requires a value`);
      args[key] = value;
    }
  }
  return { command, args };
}
function number(args, key, fallback, lo, hi, integer = false) {
  const value = args[key] === undefined ? fallback : Number(args[key]);
  if (!Number.isFinite(value) || value < lo || value > hi || (integer && !Number.isInteger(value))) throw new Error(`--${key} must be ${integer ? 'an integer' : 'a number'} in [${lo}, ${hi}]`);
  return value;
}
function config(args = {}) {
  const c = { ...require('../src/config.js') };
  for (const k of ['width', 'height', 'fps', 'duration', 'seed']) if (args[k] !== undefined) c[k] = Number(args[k]);
  return World.validate(c);
}
function html(c, renderMode = false) {
  let text = fs.readFileSync(resolve('index.html'), 'utf8');
  text = text.replace('<!doctype html>', '<!doctype html>\n<!--\n' + fs.readFileSync(resolve('LICENSE'), 'utf8').replace(/--/g, '- -') + '\n-->');
  text = text.replace(/<script src="([^"]+)"><\/script>/g, (_, p) => {
    if (!SOURCE.includes(p)) throw new Error(`Unknown source script: ${p}`);
    return '<script>\n' + fs.readFileSync(resolve(p), 'utf8').replace(/<\/script/gi, '<\\/script') + '\n</script>';
  });
  const init = JSON.stringify(c).replace(/</g, '\\u003c');
  return text.replace('<head>', `<head><script>window.LIVING_OVERRIDE=${init};window.LIVING_RENDER=${renderMode};</script>`);
}
function sourceHash(c) {
  return digest(JSON.stringify(c) + SOURCE.map(p => `${p}\n${fs.readFileSync(resolve(p), 'utf8')}`).join('\n'));
}
function atomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, data); fs.renameSync(tmp, file);
}
async function hashFile(file) {
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
function child(exe, args, piped = false) {
  const proc = spawn(exe, args, { stdio: [piped ? 'pipe' : 'ignore', 'pipe', 'pipe'] });
  let stderr = '', stdout = '';
  proc.stdout.on('data', b => { stdout = (stdout + b).slice(-65536); });
  proc.stderr.on('data', b => { stderr = (stderr + b).slice(-65536); });
  if (piped) proc.stdin.on('error', () => {});
  const done = new Promise((accept, reject) => {
    proc.on('error', e => reject(new Error(`Cannot run ${exe}: ${e.message}`)));
    proc.on('close', code => code === 0 ? accept(stdout) : reject(new Error(`${exe} exited ${code}: ${stderr}`)));
  });
  done.catch(() => {});
  return { proc, done };
}
function ranges(from, to, size) {
  if (![from, to, size].every(Number.isInteger) || from < 0 || to <= from || size < 1) throw new Error('Invalid frame range');
  const result = [];
  for (let f = from; f < to; f += size) result.push({ from: f, to: Math.min(to, f + size) });
  return result;
}
async function openBrowser(c, renderMode = true) {
  let chromium;
  try { ({ chromium } = require(process.env.LIVING_PLAYWRIGHT_MODULE || 'playwright')); }
  catch (_) { throw new Error('Playwright is missing. Run npm install, then npx playwright install chromium in this project.'); }
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}) });
  const errors = [];
  async function newPage() {
    const page = await browser.newPage({ viewport: { width: c.width, height: c.height }, deviceScaleFactor: 1 });
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.abort()); // Offline: no accidental external asset requests.
    await page.setContent(html(c, renderMode));
    await page.waitForFunction(() => !!window.LIVING, null, { timeout: 15000 });
    if (errors.length) throw new Error(errors.join('\n'));
    return page;
  }
  try { return { browser, page: await newPage(), newPage, errors }; }
  catch (e) { await browser.close(); throw e; }
}
async function png(page, t, loop = false) {
  const text = await page.evaluate(({ t, loop }) => {
    window.LIVING.renderFrame(t, { loop });
    return document.getElementById('world').toDataURL('image/png').split(',')[1];
  }, { t, loop });
  return Buffer.from(text, 'base64');
}
module.exports = { ROOT, SOURCE, resolve, digest, parse, number, config, html, sourceHash, atomic, hashFile, child, ranges, openBrowser, png };
