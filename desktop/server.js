const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const crypto = require('crypto');
// sharp & ffmpeg dimuat 'longgar': bila salah satu bermasalah di PC ini, aplikasi tetap terbuka dan memberi pesan jelas.
let sharp = null, sharpErr = '';
try { sharp = require('sharp'); } catch (e) { sharpErr = String(e.message).split('\n')[0]; }
const ffmpeg = require('./ffmpeg-path')();
process.chdir(__dirname);
const PORT = +process.env.PORT || 3737, PUB = path.join(__dirname, '..', 'ui');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.wasm': 'application/wasm' };
const LIBS = { '/lib/cropper.js': 'cropperjs/dist/cropper.min.js', '/lib/cropper.css': 'cropperjs/dist/cropper.min.css' };

const body = (req, max = 600e6) => new Promise((res, rej) => {
  const c = []; let n = 0;
  req.on('data', d => { n += d.length; if (n > max) { rej(new Error('File terlalu besar')); req.destroy(); } else c.push(d); });
  req.on('end', () => res(Buffer.concat(c))); req.on('error', rej);
});

const cache = new Map(); // cache hasil hapus-background agar geser slider kualitas tidak mengulang proses AI
async function cutout(p, buf, q) {
  const model = q.get('model') === 'small' ? 'small' : 'medium';
  const key = crypto.createHash('md5').update(buf).update(['cx', 'cy', 'cw', 'ch'].map(k => q.get(k)).join() + model).digest('hex');
  if (cache.has(key)) return cache.get(key);
  let removeBackground;
  try { ({ removeBackground } = await import('@imgly/background-removal-node')); }
  catch (e) { throw new Error('Model AI tidak tersedia di PC ini (' + String(e.message).split('\n')[0] + '). Pipet warna & kuas manual tetap bisa dipakai.'); }
  const png = await p.clone().png().toBuffer();
  const blob = await removeBackground(new Blob([png], { type: 'image/png' }), { model, output: { format: 'image/png' } });
  const out = Buffer.from(await blob.arrayBuffer());
  cache.set(key, out); if (cache.size > 4) cache.delete(cache.keys().next().value);
  return out;
}

async function image(req, res, q) {
  if (!sharp) throw new Error('Pengolah foto (sharp) belum berfungsi di PC ini: ' + sharpErr + ' - jalankan ulang start.bat / start.sh');
  const buf = await body(req), fmt = q.get('fmt') || 'jpeg', quality = Math.min(100, Math.max(1, +q.get('q') || 80));
  let p = sharp(buf, { failOn: 'none' }).rotate();
  if (q.get('cw')) p = p.extract({ left: +q.get('cx'), top: +q.get('cy'), width: +q.get('cw'), height: +q.get('ch') });
  if (q.get('rmbg') === '1') {
    p = sharp(await cutout(p, buf, q));
  }
  if (/^#[0-9a-f]{6}$/i.test(q.get('bg') || '')) p = p.flatten({ background: q.get('bg') });
  if (+q.get('w') > 0) p = p.resize({ width: +q.get('w'), withoutEnlargement: true });
  const cmp = q.get('cmp') !== '0'; // cmp=0 -> tanpa kompresi (kualitas penuh / lossless)
  if (fmt === 'jpeg') p = p.flatten({ background: '#ffffff' }).jpeg(cmp ? { quality, mozjpeg: true } : { quality: 100, chromaSubsampling: '4:4:4' });
  else if (fmt === 'webp') p = p.webp(cmp ? { quality } : { lossless: true });
  else if (fmt === 'avif') p = p.avif(cmp ? { quality, effort: 3 } : { lossless: true, effort: 3 });
  else p = p.png(cmp ? { quality, palette: quality < 100, compressionLevel: 9, effort: 7 } : { compressionLevel: 9 });
  const out = await p.toBuffer();
  res.writeHead(200, { 'Content-Type': 'image/' + fmt, 'Content-Length': out.length }); res.end(out);
}

// Hasil AI saja (PNG transparan, resolusi penuh) untuk editor manual di browser.
async function cutoutApi(req, res, q) {
  if (!sharp) throw new Error('Pengolah foto (sharp) belum berfungsi di PC ini: ' + sharpErr);
  const buf = await body(req);
  let p = sharp(buf, { failOn: 'none' }).rotate();
  if (q.get('cw')) p = p.extract({ left: +q.get('cx'), top: +q.get('cy'), width: +q.get('cw'), height: +q.get('ch') });
  const out = await cutout(p, buf, q);
  res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': out.length }); res.end(out);
}

async function audio(req, res, q) {
  if (!ffmpeg) throw new Error('ffmpeg belum tersedia di PC ini - jalankan ulang start.bat / start.sh');
  const buf = await body(req), fmt = ['mp3', 'm4a', 'ogg'].includes(q.get('fmt')) ? q.get('fmt') : 'mp3';
  const id = Date.now() + '_' + Math.random().toString(36).slice(2);
  const inp = path.join(os.tmpdir(), `rms_${id}.in`), out = path.join(os.tmpdir(), `rms_${id}.${fmt}`);
  fs.writeFileSync(inp, buf);
  const s = +q.get('start') || 0, d = +q.get('dur') || 0, br = Math.round(+q.get('br') || 128), fi = +q.get('fi') || 0, fo = +q.get('fo') || 0;
  const af = [], vol = +q.get('vol');
  if (vol >= 0 && vol !== 1) { af.push(`volume=${vol}`); if (vol > 1) af.push('alimiter=limit=0.95'); }
  if (fi > 0) af.push(`afade=t=in:d=${fi}`);
  if (fo > 0 && d > 0) af.push(`afade=t=out:st=${Math.max(0, d - fo)}:d=${fo}`);
  const a = ['-y', '-ss', String(s)]; if (d > 0) a.push('-t', String(d));
  a.push('-i', inp, '-vn'); if (af.length) a.push('-af', af.join(','));
  if (q.get('mono') === '1') a.push('-ac', '1');
  a.push('-c:a', { mp3: 'libmp3lame', m4a: 'aac', ogg: 'libopus' }[fmt], '-b:a', br + 'k');
  if (fmt === 'm4a') a.push('-movflags', '+faststart');
  a.push(out);
  try {
    const err = await new Promise(r => { const p = spawn(ffmpeg, a); let e = ''; p.stderr.on('data', x => e += x); p.on('error', x => r(String(x))); p.on('close', c => r(c === 0 ? null : e.slice(-300))); });
    if (err) throw new Error('ffmpeg: ' + err);
    const o = fs.readFileSync(out);
    res.writeHead(200, { 'Content-Type': { mp3: 'audio/mpeg', m4a: 'audio/mp4', ogg: 'audio/ogg' }[fmt], 'Content-Length': o.length }); res.end(o);
  } finally { for (const f of [inp, out]) fs.rm(f, () => {}); }
}

/* ===== VIDEO (v3.4): trim + kompres =====
 * Alur: POST /api/video (unggah ke file sementara, ffmpeg jalan di latar) -> GET /api/video/status (progres)
 *       -> GET /api/video/file (ambil hasil, file sementara dihapus) | POST /api/video/cancel.
 * File video dialirkan ke disk (tidak ditampung di RAM) sehingga video besar tetap aman. */
const MAX_VIDEO = 8 * 1024 ** 3, jobs = new Map(), TMP = os.tmpdir();
const rmq = f => fs.rm(f, { force: true }, () => {});
let encoders = null;
const hasEnc = n => {
  if (!ffmpeg) return false;
  if (encoders === null) { try { encoders = require('child_process').spawnSync(ffmpeg, ['-hide_banner', '-encoders'], { encoding: 'utf8', timeout: 20000, windowsHide: true }).stdout || ''; } catch { encoders = ''; } }
  return new RegExp('\\b' + n + '\\b').test(encoders);
};
const probeDur = file => new Promise(r => {
  const p = spawn(ffmpeg, ['-hide_banner', '-i', file], { windowsHide: true }); let e = '';
  p.stderr.on('data', x => e = (e + x).slice(-20000)); p.on('error', () => r(0));
  p.on('close', () => { const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(e); r(m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0); });
});
const runFF = (job, args, w0, w1) => new Promise((ok, bad) => {
  const p = spawn(ffmpeg, args, { windowsHide: true }); job.proc = p; let err = '', buf = '';
  p.stdout.on('data', x => {
    buf += x; let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const l = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      const m = /^out_time_(?:us|ms)=(\d+)/.exec(l);
      if (m && job.total > 0) job.pct = Math.max(job.pct, Math.min(99, w0 + (w1 - w0) * Math.min(1, +m[1] / 1e6 / job.total)));
    }
  });
  p.stderr.on('data', x => err = (err + x).slice(-1500));
  p.on('error', x => bad(new Error(String(x))));
  p.on('close', c => job.cancel ? bad(new Error('Dibatalkan')) : c === 0 ? ok() : bad(new Error('ffmpeg: ' + err.split('\n').filter(Boolean).slice(-3).join(' | '))));
});

async function runVideo(job, q) {
  const num = (k, d = 0) => { const v = +q.get(k); return Number.isFinite(v) ? v : d; };
  try {
    const s = Math.max(0, num('start')); let d = Math.max(0, num('dur'));
    if (!d) { const t = await probeDur(job.inp); d = t > s ? t - s : 0; }
    job.total = d;
    const head = ['-y', '-hide_banner', '-nostats', '-progress', 'pipe:1', '-ss', String(s), '-i', job.inp];
    const tail = d > 0 ? ['-t', String(d)] : [];
    const maps = ['-map', '0:v:0', '-map', '0:a:0?', '-sn', '-dn'];
    const fast = ['-movflags', '+faststart'];
    const encode = async o => {
      const h265 = o.codec === 'h265' && hasEnc('libx265');
      const preset = { fast: 'veryfast', normal: 'medium', max: 'slow' }[o.spd] || 'medium';
      const vf = o.res ? ["scale='if(gt(iw,ih),-2,min(" + o.res + ",iw))':'if(gt(iw,ih),min(" + o.res + ",ih),-2)'"] : [];
      const vArgs = h265 ? ['-c:v', 'libx265', '-preset', preset, '-pix_fmt', 'yuv420p', '-tag:v', 'hvc1', '-x265-params', 'log-level=error']
        : ['-c:v', 'libx264', '-preset', preset, '-profile:v', 'high', '-pix_fmt', 'yuv420p'];
      const vfA = vf.length ? ['-vf', vf.join(',')] : [];
      const abr = o.aud === 'off' ? 0 : o.aud === 'low' ? 64 : 128;
      const aArgs = abr ? ['-c:a', 'aac', '-b:a', abr + 'k'] : ['-an'];
      if (o.mode === 'size') {
        if (!(d > 0)) throw new Error('Durasi video tidak terbaca, ukuran target tidak bisa dihitung. Pakai mode Kualitas.');
        const vk = Math.floor(o.mb * 8388.608 * 0.95 / d - abr);
        if (vk < 30) throw new Error('Ukuran target terlalu kecil untuk durasi ini. Naikkan ukuran target atau pendekkan potongan.');
        const rate = ['-b:v', vk + 'k', '-maxrate', Math.round(vk * 1.6) + 'k', '-bufsize', vk * 2 + 'k'];
        if (h265) return runFF(job, [...head, ...tail, ...maps, ...vfA, ...vArgs, ...rate, ...aArgs, ...fast, job.out], 0, 99);
        const log = path.join(TMP, `rms_v_${job.id}_pass`), nul = process.platform === 'win32' ? 'NUL' : '/dev/null';
        try {
          await runFF(job, [...head, ...tail, '-map', '0:v:0', '-sn', '-dn', ...vfA, ...vArgs, ...rate, '-pass', '1', '-passlogfile', log, '-an', '-f', 'null', nul], 0, 50);
          await runFF(job, [...head, ...tail, ...maps, ...vfA, ...vArgs, ...rate, '-pass', '2', '-passlogfile', log, ...aArgs, ...fast, job.out], 50, 99);
        } finally { fs.readdir(TMP, (e, l) => (l || []).filter(n => n.startsWith(`rms_v_${job.id}_pass`)).forEach(n => rmq(path.join(TMP, n)))); }
        return;
      }
      const crf = Math.min(51, Math.max(16, Math.round(o.crf || 26))) + (h265 ? 4 : 0);
      return runFF(job, [...head, ...tail, ...maps, ...vfA, ...vArgs, '-crf', String(crf), ...aArgs, ...fast, job.out], 0, 99);
    };
    const copy = q.get('cmp') === '0' && q.get('prec') !== '1';
    const opts = { res: [0, 1080, 720, 480, 360].includes(num('res')) ? num('res') : 0, crf: num('crf', 26), mode: q.get('mode') === 'size' ? 'size' : 'crf', mb: Math.max(0.5, num('mb', 25)),
      aud: ['normal', 'low', 'off'].includes(q.get('aud')) ? q.get('aud') : 'normal', codec: q.get('codec') === 'h265' ? 'h265' : 'h264', spd: ['fast', 'normal', 'max'].includes(q.get('spd')) ? q.get('spd') : 'normal' };
    if (copy) {
      try { await runFF(job, [...head, ...tail, ...maps, '-c', 'copy', '-avoid_negative_ts', 'make_zero', ...fast, job.out], 0, 99); }
      catch (e) {
        if (job.cancel) throw e;
        job.note = 'Format video ini tidak bisa dipotong tanpa kompres ulang, jadi otomatis dikompres ulang dengan kualitas tinggi.'; job.pct = 0;
        await encode({ ...opts, res: 0, mode: 'crf', crf: 20, aud: 'normal', codec: 'h264' });
      }
    } else await encode(opts);
    job.size = fs.statSync(job.out).size; job.pct = 100; job.state = 'done';
  } catch (e) { job.state = 'err'; job.err = e.message; rmq(job.out); }
  finally { rmq(job.inp); job.proc = null; job.ended = Date.now(); }
}

async function videoStart(req, res, q) {
  if (!ffmpeg) throw new Error('ffmpeg belum tersedia di PC ini - jalankan ulang start.bat / start.sh');
  const id = crypto.randomBytes(6).toString('hex'), inp = path.join(TMP, `rms_v_${id}.in`), out = path.join(TMP, `rms_v_${id}.mp4`);
  try {
    await new Promise((ok, bad) => {
      const ws = fs.createWriteStream(inp); let n = 0;
      req.on('data', c => { n += c.length; if (n > MAX_VIDEO) { bad(new Error('Video terlalu besar (maks 8 GB)')); req.unpipe(ws); ws.destroy(); req.resume(); } });
      req.on('error', bad); ws.on('error', bad); ws.on('finish', ok); req.pipe(ws);
    });
  } catch (e) { rmq(inp); throw e; }
  const job = { id, inp, out, state: 'run', pct: 0, total: 0, proc: null, cancel: false, created: Date.now() };
  jobs.set(id, job); runVideo(job, q);
  res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ id }));
}
const jobOf = q => { const j = jobs.get(q.get('id') || ''); if (!j) throw new Error('Proses video tidak ditemukan (mungkin sudah dibatalkan atau kedaluwarsa).'); return j; };
function videoStatus(res, q) {
  const j = jobOf(q); res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ state: j.state, pct: Math.round(j.pct), size: j.size, err: j.err, note: j.note }));
}
function videoFile(res, q) {
  const j = jobOf(q); if (j.state !== 'done') throw new Error('Hasil video belum siap');
  res.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': j.size });
  const rs = fs.createReadStream(j.out); rs.pipe(res);
  res.on('close', () => { rmq(j.out); jobs.delete(j.id); });
}
function videoCancel(res, q) {
  const j = jobs.get(q.get('id') || '');
  if (j) { j.cancel = true; if (j.proc) try { j.proc.kill(); } catch {} if (j.state !== 'run') { rmq(j.out); jobs.delete(j.id); } }
  res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{}');
}
setInterval(() => { for (const [id, j] of jobs) if (j.ended && Date.now() - j.ended > 30 * 60e3) { rmq(j.out); jobs.delete(id); } }, 5 * 60e3).unref();

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && u.pathname === '/api/caps') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ video: !!ffmpeg, h265: hasEnc('libx265') })); }
    if (req.method === 'POST' && u.pathname === '/api/video') return await videoStart(req, res, u.searchParams);
    if (req.method === 'GET' && u.pathname === '/api/video/status') return videoStatus(res, u.searchParams);
    if (req.method === 'GET' && u.pathname === '/api/video/file') return videoFile(res, u.searchParams);
    if (req.method === 'POST' && u.pathname === '/api/video/cancel') return videoCancel(res, u.searchParams);
    if (req.method === 'POST' && u.pathname === '/api/image') return await image(req, res, u.searchParams);
    if (req.method === 'POST' && u.pathname === '/api/cutout') return await cutoutApi(req, res, u.searchParams);
    if (req.method === 'POST' && u.pathname === '/api/audio') return await audio(req, res, u.searchParams);
    const f = LIBS[u.pathname] ? path.join(__dirname, 'node_modules', LIBS[u.pathname])
      : path.join(PUB, u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname));
    if (!LIBS[u.pathname] && !f.startsWith(PUB)) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, data) => {
      if (e) { res.writeHead(404); return res.end('Not found'); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(data);
    });
  } catch (e) {
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
  }
});
server.on('error', e => { if (e.code !== 'EADDRINUSE') throw e; console.log('[Rendzz] Port ' + PORT + ' sudah dipakai - kemungkinan aplikasi sudah berjalan.'); });
server.listen(PORT, '127.0.0.1');
module.exports = PORT;
