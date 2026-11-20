/* Rendzz Media Studio - Engine "web": semua proses berjalan di browser, tanpa server.
 * Pada build web file ini disalin sebagai engine.js menggantikan versi desktop. Antarmuka: docs/ENGINE.md
 * Tahap ini: foto (JPG/WebP/PNG, ubah ukuran, crop, latar). Video, musik, hapus background, dan AVIF menyusul. */
(() => {
  const MIME = { jpeg: 'image/jpeg', webp: 'image/webp', png: 'image/png' };
  const soon = n => new Error(n + ' belum tersedia di versi web. Pakai versi desktop untuk fitur ini.');
  const toBlob = (cv, type, q) => new Promise((ok, bad) => cv.toBlob(b => b ? ok(b) : bad(new Error('Browser gagal membuat gambar ' + type + '. Coba format lain.')), type, q));
  const canEncode = async type => { const c = document.createElement('canvas'); c.width = c.height = 1; const b = await new Promise(r => c.toBlob(r, type, .8)); return !!b && b.type === type; };

  // Decode dengan orientasi EXIF yang benar (foto HP tidak miring)
  async function decode(file) {
    try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch {
      const im = new Image(), u = URL.createObjectURL(file);
      try { im.src = u; await im.decode(); return im; } catch { throw new Error('Format gambar ini tidak bisa dibaca browser.'); }
      finally { setTimeout(() => URL.revokeObjectURL(u), 10000); }
    }
  }
  // Pengecilan bertahap (per setengah) agar hasil tetap tajam, bukan sekali lompat
  function drawScaled(ctx, src, sx, sy, sw, sh, dw, dh) {
    let cur = src, x = sx, y = sy, w = sw, h = sh;
    while (w / 2 > dw && h / 2 > dh) {
      const nw = Math.max(dw, Math.round(w / 2)), nh = Math.max(dh, Math.round(h / 2));
      const t = document.createElement('canvas'); t.width = nw; t.height = nh;
      const tc = t.getContext('2d'); tc.imageSmoothingQuality = 'high'; tc.drawImage(cur, x, y, w, h, 0, 0, nw, nh);
      cur = t; x = y = 0; w = nw; h = nh;
    }
    ctx.imageSmoothingQuality = 'high'; ctx.drawImage(cur, x, y, w, h, 0, 0, dw, dh);
  }

  let capsP = null;
  window.Engine = {
    name: 'web',
    caps() {
      return capsP || (capsP = canEncode('image/webp').then(webp => ({ video: false, audio: false, cutout: false, avif: false, h265: false, webp })));
    },
    async image(file, q) {
      const fmt = q.get('fmt') || 'jpeg';
      if (q.get('rmbg') === '1') throw soon('Hapus background');
      if (!MIME[fmt]) throw new Error('Format ' + fmt.toUpperCase() + ' belum tersedia di versi web. Pilih JPG, WebP, atau PNG.');
      const quality = Math.min(100, Math.max(1, +q.get('q') || 80)), cmp = q.get('cmp') !== '0';
      const src = await decode(file), W = src.width || src.naturalWidth, H = src.height || src.naturalHeight;
      let sx = 0, sy = 0, sw = W, sh = H;
      if (q.get('cw')) {
        sx = Math.min(W - 1, Math.max(0, Math.round(+q.get('cx') || 0))); sy = Math.min(H - 1, Math.max(0, Math.round(+q.get('cy') || 0)));
        sw = Math.max(1, Math.min(W - sx, Math.round(+q.get('cw')))); sh = Math.max(1, Math.min(H - sy, Math.round(+q.get('ch'))));
      }
      let w = sw, h = sh; const mw = +q.get('w');
      if (mw > 0 && sw > mw) { w = Math.round(mw); h = Math.max(1, Math.round(sh * w / sw)); }
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const c = cv.getContext('2d'), bg = q.get('bg') || '', fill = /^#[0-9a-f]{6}$/i.test(bg) ? bg : (fmt === 'jpeg' ? '#ffffff' : '');
      if (fill) { c.fillStyle = fill; c.fillRect(0, 0, w, h); }
      drawScaled(c, src, sx, sy, sw, sh, w, h);
      if (src.close) src.close();
      return toBlob(cv, MIME[fmt], fmt === 'png' ? undefined : (cmp ? quality / 100 : 1));
    },
    async cutout() { throw soon('Hapus background'); },
    async audio() { throw soon('Pengolah musik'); },
    async video() { throw soon('Pengolah video'); },
    cancelVideo() {}
  };
})();
