// Dijalankan sebagai proses terpisah: menguji modul native benar-benar bisa dipakai. Hasil = 1 baris JSON.
(async () => {
  const fs = require('fs'), path = require('path'), nm = path.join(__dirname, '..', 'node_modules');
  const local = m => fs.existsSync(path.join(nm, m, 'package.json'));
  const r = { sharp: null, cropper: null, ffmpeg: null, bg: null }, first = e => String((e && e.message) || e).split('\n')[0].slice(0, 300);
  if (!local('cropperjs')) r.cropper = 'cropperjs belum terpasang di folder aplikasi';
  try {
    if (!local('sharp')) throw new Error('sharp belum terpasang di folder aplikasi');
    const sharp = require('sharp');
    const b = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#fff' } }).jpeg().toBuffer();
    await sharp(b).webp().toBuffer();
  } catch (e) { r.sharp = first(e); }
  try { if (!require('../ffmpeg-path')()) r.ffmpeg = 'ffmpeg tidak ditemukan / tidak bisa dijalankan'; } catch (e) { r.ffmpeg = first(e); }
  try { if (!local('@imgly/background-removal-node')) throw new Error('belum terpasang');
    if (fs.existsSync(path.join(nm, '@imgly', 'background-removal-node', 'node_modules', 'sharp'))) throw new Error('memakai sharp versi lama yang bersarang (perlu diperbaiki)'); await import('@imgly/background-removal-node'); } catch (e) { r.bg = first(e); }
  console.log('@@' + JSON.stringify(r));
})();
