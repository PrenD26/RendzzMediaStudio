// Rendzz Media Studio v3.1 - launcher universal.
// Memastikan library terpasang & BENAR-BENAR bisa jalan (sharp, ffmpeg, AI), memperbaiki otomatis bila gagal, lalu membuka aplikasi.
const { spawn, exec } = require('child_process');
const fs = require('fs'), path = require('path'), https = require('https'), os = require('os');
const dir = __dirname; process.chdir(dir);
const log = m => console.log('[Rendzz] ' + m), warn = m => console.log('[Rendzz] ! ' + m);
const pkg = require('./package.json');

console.log('\n  Rendzz Media Studio\n  -------------------');

// 1. Versi Node
const [maj, min] = process.versions.node.split('.').map(Number);
if (maj < 18 || (maj === 18 && min < 17)) {
  warn('Node.js ' + process.version + ' terlalu lama (butuh >= 18.17). Jalankan lewat start.bat / start.sh agar Node portable disiapkan otomatis,');
  warn('atau pasang Node.js LTS dari https://nodejs.org'); process.exit(1);
}

// 2. Pastikan node & npm yang sedang dipakai ada paling depan di PATH untuk semua proses anak
const PK = Object.keys(process.env).find(k => k.toLowerCase() === 'path') || 'PATH';
const env = { ...process.env, [PK]: path.dirname(process.execPath) + path.delimiter + (process.env[PK] || ''),
  npm_config_fund: 'false', npm_config_audit: 'false', npm_config_update_notifier: 'false', npm_config_progress: 'false' };

const sh = cmd => new Promise(res => {
  let out = '';
  const p = spawn(cmd, { cwd: dir, env, shell: true, windowsHide: true });
  const f = d => { out += d; lastOut.v = (lastOut.v + d).slice(-20000); process.stdout.write(d); };
  p.stdout.on('data', f); p.stderr.on('data', f);
  p.on('error', e => res({ code: -1, out: String(e) })); p.on('close', code => res({ code, out }));
});
const rmrf = p => { try { fs.rmSync(p, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch (e) { warn('Tidak bisa menghapus ' + path.basename(p) + ': ' + e.message); } };
const lastOut = { v: '' };

async function check() {
  const r = await sh('node scripts/check.js');
  const m = /@@(\{.*\})/.exec(r.out);
  const res = m ? JSON.parse(m[1]) : { sharp: 'pengecekan gagal dijalankan', ffmpeg: 'pengecekan gagal dijalankan', bg: 'pengecekan gagal dijalankan' };
  res.ok = !res.sharp && !res.ffmpeg && !res.cropper; return res;
}
const quiet = async () => { const o = process.stdout.write; process.stdout.write = () => true; try { return await check(); } finally { process.stdout.write = o; } };

// Tangga instalasi: dari yang paling ringan ke paling agresif. Berhenti begitu semuanya berfungsi.
const I = '--no-fund --no-audit --include=optional';
const ladder = [
  ['instalasi standar', async () => sh(`npm install ${I}`)],
  ['bersihkan & instal ulang', async () => { rmrf(path.join(dir, 'node_modules')); rmrf(path.join(dir, 'package-lock.json')); await sh('npm cache verify'); return sh(`npm install ${I}`); }],
  ['paksa platform ' + process.platform + '-' + process.arch, async () => { rmrf(path.join(dir, 'node_modules')); return sh(`npm install ${I} --os=${process.platform} --cpu=${process.arch}`); }],
  ['server npm cadangan', async () => { rmrf(path.join(dir, 'node_modules')); return sh(`npm install ${I} --registry=https://registry.npmmirror.com`); }],
];
async function repair(from = 0) {
  let st;
  for (let i = from; i < ladder.length; i++) {
    log(`Memasang library (${i + 1}/${ladder.length}: ${ladder[i][0]})...`);
    await ladder[i][1]();
    st = await quiet();
    if (st.ok) { log('Library siap dan terverifikasi.'); return st; }
    warn('Belum berfungsi' + (st.sharp ? ' [sharp: ' + st.sharp + ']' : '') + (st.ffmpeg ? ' [ffmpeg: ' + st.ffmpeg + ']' : '') + (st.cropper ? ' [' + st.cropper + ']' : '') + (i + 1 < ladder.length ? ' - mencoba cara lain...' : ''));
  }
  if (st && !st.sharp && !st.cropper && st.ffmpeg) { // hanya ffmpeg yang kurang: coba paket ffmpeg yang diunduh lewat npm (tanpa GitHub)
    log('Mencoba paket ffmpeg alternatif...'); await sh(`npm install --no-save --no-fund --no-audit @ffmpeg-installer/ffmpeg`); st = await quiet();
  }
  return st;
}

function download(url, dest, hops = 5) {
  return new Promise((ok, fail) => {
    const req = https.get(url, { timeout: 15000 }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && hops > 0) return ok(download(new URL(res.headers.location, url).href, dest, hops - 1));
      if (res.statusCode !== 200) return fail(new Error('HTTP ' + res.statusCode));
      const chunks = []; res.on('data', d => chunks.push(d));
      res.on('end', () => { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, Buffer.concat(chunks)); ok(); });
    });
    req.on('error', fail); req.on('timeout', () => req.destroy(new Error('timeout')));
  });
}

function diagnose(st, npmv) {
  const t = [`Rendzz Media Studio ${pkg.version}`, `waktu     : ${new Date().toISOString()}`, `OS        : ${os.type()} ${os.release()} (${process.platform}/${process.arch})`,
    `node      : ${process.version} (${process.execPath})`, `npm       : ${npmv}`, `folder    : ${dir}`, `hasil cek : ${JSON.stringify(st)}`, '', '--- keluaran terakhir ---', lastOut.v.slice(-6000)].join('\n');
  try { fs.writeFileSync(path.join(dir, 'diagnostik.txt'), t); } catch {}
}

(async () => {
  let st = await quiet();
  if (!st.ok) {
    if (!fs.existsSync(path.join(dir, 'node_modules'))) log('Pertama kali dijalankan: mengunduh library (butuh internet, bisa beberapa menit)...');
    else warn('Library yang ada tidak berfungsi, memperbaiki...');
    st = await repair();
  } else {
    // Cek pembaruan paling sering seminggu sekali, dan tidak pernah boleh merusak instalasi yang sudah jalan.
    const mark = path.join(dir, '.update-check');
    if (!fs.existsSync(mark) || Date.now() - fs.statSync(mark).mtimeMs > 7 * 864e5) {
      try {
        const o = await sh('npm outdated --json'); fs.writeFileSync(mark, String(Date.now()));
        const j = JSON.parse((o.out.match(/\{[\s\S]*\}/) || ['{}'])[0]);
        if (Object.values(j).some(v => v.current !== v.wanted)) {
          log('Ada pembaruan library, memperbarui...'); await sh('npm update --no-fund --no-audit --include=optional');
          st = await quiet(); if (!st.ok) { warn('Hasil pembaruan bermasalah, memulihkan...'); st = await repair(); }
        } else log('Library sudah terbaru.');
      } catch { log('Pengecekan update dilewati (offline?).'); }
    } else log('Library siap.');
  }

  // Perbaikan khusus: paket AI membawa sharp lama bersarang yang binernya diunduh dari GitHub (sering gagal). overrides di package.json memaksa sharp 0.33.
  if (st.ok && st.bg && /bersarang|sharp/i.test(st.bg) && !fs.existsSync(path.join(dir, '.bgfix-tried'))) {
    fs.writeFileSync(path.join(dir, '.bgfix-tried'), '1');
    log('Memperbaiki komponen AI (sharp bersarang)...');
    rmrf(path.join(dir, 'package-lock.json')); rmrf(path.join(dir, 'node_modules', '@imgly'));
    await sh(`npm install ${I}`); st = await quiet();
    if (!st.ok) st = await repair(1);
  }

  if (!st.ok) {
    const npmv = (await sh('npm -v')).out.trim();
    diagnose(st, npmv);
    console.log('\n  ============ GAGAL MEMASANG ============');
    if (st.sharp) warn('Pengolah foto (sharp) bermasalah: ' + st.sharp);
    if (st.ffmpeg) warn('Pengolah musik (ffmpeg) bermasalah: ' + st.ffmpeg);
    warn('Kemungkinan penyebab & solusi:');
    warn(' - Tidak ada internet / diblokir proxy, firewall, atau antivirus -> coba jaringan lain atau matikan sementara lalu jalankan ulang.');
    if (process.platform === 'win32') warn(' - Pasang "Microsoft Visual C++ Redistributable" (https://aka.ms/vs/17/release/vc_redist.x64.exe) lalu jalankan ulang.');
    warn(' - Pastikan folder aplikasi bukan di dalam ZIP dan tidak di folder yang dikunci (mis. Program Files).');
    warn('Kirim file diagnostik.txt di folder ini jika masih gagal.');
    if (st.cropper) warn('Komponen antarmuka (cropperjs) tidak terpasang: ' + st.cropper);
    if ((st.sharp && st.ffmpeg) || st.cropper) process.exit(1);
    warn('Aplikasi tetap dibuka dengan fitur yang tersedia.');
  }
  if (st.ok && st.bg) warn('Fitur hapus background AI tidak aktif di PC ini (' + st.bg + ')' + (process.platform === 'win32' ? ' - biasanya teratasi dengan memasang Visual C++ Redistributable.' : '.'));

  // Tailwind lokal agar tetap jalan offline; diperbarui tiap 7 hari.
  const tw = path.join(dir, 'public', 'vendor', 'tailwind.js');
  const stale = !fs.existsSync(tw) || Date.now() - fs.statSync(tw).mtimeMs > 7 * 864e5;
  if (stale) try { log('Mengunduh Tailwind CSS...'); await download('https://cdn.tailwindcss.com/3.4.17', tw); } catch { log('Tailwind belum bisa diunduh' + (fs.existsSync(tw) ? ', memakai salinan lama.' : ' (akan dimuat dari CDN).')); }

  // Model AI penghapus background: diunduh sekali, lalu offline.
  const mk = path.join(dir, '.bgmodel-ready');
  if (!fs.existsSync(mk) && !st.sharp && !st.bg) try {
    log('Mengunduh model AI penghapus background (sekali saja, +/- 80 MB)...');
    const sharp = require('sharp'), { removeBackground } = await import('@imgly/background-removal-node');
    const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#888888' } }).png().toBuffer();
    await removeBackground(new Blob([png], { type: 'image/png' }), { model: 'medium' });
    fs.writeFileSync(mk, 'ok'); log('Model AI siap.');
  } catch (e) { log('Model AI belum bisa diunduh (' + e.message + '). Akan dicoba lagi saat fitur dipakai.'); }

  const port = require('./server.js'), url = 'http://localhost:' + port;
  log('Aplikasi berjalan di ' + url + '  (tutup jendela ini untuk berhenti)');
  if (!process.env.RENDZZ_NO_OPEN) exec(`${process.platform === 'win32' ? 'start ""' : process.platform === 'darwin' ? 'open' : 'xdg-open'} ${url}`, () => {});
})().catch(e => { console.error('[Rendzz] Error tak terduga:', e); process.exit(1); });
