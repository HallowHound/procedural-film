'use strict';
const fs = require('node:fs');
const path = require('node:path');
const C = require('./common.cjs');
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FFPROBE = process.env.FFPROBE || 'ffprobe';
async function probe(file) {
  const text = await C.child(FFPROBE, ['-v', 'error', '-show_entries', 'stream=codec_type,width,height,nb_frames,avg_frame_rate:format=duration', '-of', 'json', file]).done;
  return JSON.parse(text);
}
async function render(args) {
  const config = C.config(args), fps = config.fps;
  const f0 = Math.round(C.number(args, 'from', 0, 0, config.duration) * fps);
  const f1 = Math.round(C.number(args, 'to', config.duration, 0, config.duration) * fps);
  const chunk = Math.max(1, Math.round(C.number(args, 'chunk', 120, 1 / fps, 3600) * fps));
  const crf = C.number(args, 'crf', 18, 0, 51, true), preset = args.preset || 'medium';
  if (!['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow'].includes(preset)) throw new Error('Invalid x264 preset');
  const segments = C.ranges(f0, f1, chunk), duration = (f1 - f0) / fps;
  const audio = args.audio ? C.resolve(args.audio) : null;
  if (args['loop-audio'] && !audio) throw new Error('--loop-audio requires --audio');
  if (audio && !fs.statSync(audio).isFile()) throw new Error('Audio input is not a file');
  const out = C.resolve(args.out || 'exports/living-world.mp4');
  if (path.extname(out).toLowerCase() !== '.mp4') throw new Error('--out must end in .mp4');
  const ffmpegVersion = (await C.child(FFMPEG, ['-version']).done).split('\n')[0];
  await C.child(FFPROBE, ['-version']).done;
  const session = await C.openBrowser(config);
  const signature = C.digest(JSON.stringify({ source: C.sourceHash(config), renderer: fs.readFileSync(__filename, 'utf8'),
    common: fs.readFileSync(require.resolve('./common.cjs'), 'utf8'), fps, f0, f1, chunk, crf, preset, ffmpegVersion, browser: session.browser.version() }));
  const work = C.resolve(`.cache/render-${signature.slice(0, 20)}`), manifestFile = path.join(work, 'manifest.json');
  let locked = false, encoder = null, interrupted = false;
  const interrupt = () => {
    interrupted = true;
    if (encoder) encoder.proc.kill('SIGTERM');
    session.browser.close().catch(() => {});
  };
  process.once('SIGINT', interrupt); process.once('SIGTERM', interrupt);
  const lock = path.join(work, '.lock'), partial = out.replace(/\.mp4$/i, `.${process.pid}.partial.mp4`);
  try {
    fs.mkdirSync(work, { recursive: true }); fs.mkdirSync(path.dirname(out), { recursive: true });
    try { const fd = fs.openSync(lock, 'wx'); fs.writeSync(fd, String(process.pid)); fs.closeSync(fd); locked = true; }
    catch (e) { throw new Error(`Render work folder is locked: ${lock}. Remove the lock only after confirming no renderer is running. ${e.message}`); }
    let manifest = { version: 1, signature, config, from: f0, to: f1, fps, completed: {} };
    if (args.resume && fs.existsSync(manifestFile)) {
      manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
      if (manifest.signature !== signature || manifest.version !== 1) throw new Error('Incompatible resume manifest');
    }
    C.atomic(manifestFile, JSON.stringify(manifest, null, 2));
    for (const range of segments) {
      if (interrupted) throw new Error('Render interrupted; rerun with --resume');
      const key = `${range.from}-${range.to}`, name = `part-${String(range.from).padStart(8, '0')}-${String(range.to).padStart(8, '0')}.mp4`;
      const file = path.join(work, name), record = manifest.completed[key];
      if (args.resume && record && fs.existsSync(file) && await C.hashFile(file) === record.sha256) {
        console.log(`resume ${name}`); continue;
      }
      const temp = file.replace('.mp4', '.partial.mp4'), count = range.to - range.from;
      console.log(`render ${range.from}..${range.to - 1} (${count} frames, global time ${range.from / fps}s)`);
      encoder = C.child(FFMPEG, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', 'pipe:0',
        '-an', '-frames:v', String(count), '-vf', 'scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p',
        '-c:v', 'libx264', '-crf', String(crf), '-preset', preset, '-threads', '2', '-r', String(fps),
        '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-movflags', '+faststart', temp], true);
      for (let f = range.from; f < range.to; f++) {
        const data = await C.png(session.page, f / fps);
        await new Promise((accept, reject) => encoder.proc.stdin.write(data, e => e ? reject(e) : accept()));
        if ((f - range.from + 1) % (fps * 10) === 0) console.log(`  ${f - range.from + 1}/${count}`);
      }
      encoder.proc.stdin.end(); await encoder.done; encoder = null;
      const metadata = await probe(temp), video = metadata.streams.find(s => s.codec_type === 'video');
      if (!video || Number(video.nb_frames) !== count || video.width !== config.width || video.height !== config.height) throw new Error(`Encoded segment validation failed: ${temp}`);
      fs.renameSync(temp, file);
      manifest.completed[key] = { file: name, sha256: await C.hashFile(file), frames: count };
      C.atomic(manifestFile, JSON.stringify(manifest, null, 2));
    }
    if (session.errors.length) throw new Error(session.errors.join('\n'));
    const list = path.join(work, 'concat.txt');
    C.atomic(list, segments.map(r => `file '${manifest.completed[`${r.from}-${r.to}`].file}'`).join('\n') + '\n');
    const muxArgs = ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list];
    if (audio) muxArgs.push(...(args['loop-audio'] ? ['-stream_loop', '-1'] : []), '-i', audio);
    muxArgs.push('-map', '0:v:0', '-c:v', 'copy');
    if (audio) muxArgs.push('-map', '1:a:0', '-af', `apad,atrim=duration=${duration}`, '-c:a', 'aac', '-b:a', '192k');
    else muxArgs.push('-an');
    muxArgs.push('-t', String(duration), '-movflags', '+faststart', partial);
    encoder = C.child(FFMPEG, muxArgs); await encoder.done; encoder = null;
    const metadata = await probe(partial), video = metadata.streams.find(s => s.codec_type === 'video');
    if (!video || Number(video.nb_frames) !== f1 - f0 || Math.abs(Number(metadata.format.duration) - duration) > 0.15) throw new Error('Final video validation failed');
    fs.renameSync(partial, out);
    console.log(`wrote ${out}\n${f1 - f0} frames; ${duration}s; ${config.width}x${config.height} @ ${fps}fps\nresume cache: ${work}`);
    return { out, work, signature, frames: f1 - f0 };
  } finally {
    if (encoder) { encoder.proc.kill('SIGKILL'); await encoder.done.catch(() => {}); }
    process.removeListener('SIGINT', interrupt); process.removeListener('SIGTERM', interrupt);
    fs.rmSync(partial, { force: true });
    if (locked) fs.rmSync(lock, { force: true });
    await session.browser.close();
  }
}
module.exports = { render, probe };
