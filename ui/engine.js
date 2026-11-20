/* Rendzz Media Studio - Engine "server" (versi desktop).
 * Tampilan (index.html, editor.js) TIDAK memanggil server langsung, hanya lewat objek `Engine` ini.
 * Versi web menyediakan `Engine` lain dengan antarmuka yang sama (lihat docs/ENGINE.md). */
(() => {
  const post = async (url, body, opt = {}) => {
    const r = await fetch(url, { method: 'POST', body, ...opt });
    if (!r.ok) { let m = 'Gagal memproses'; try { m = (await r.json()).error || m; } catch {} throw new Error(m); }
    return r;
  };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let job = null;
  window.Engine = {
    name: 'server',
    async caps() { try { return await (await fetch('api/caps')).json(); } catch { return {}; } },
    async image(file, q) { return (await post('api/image?' + q, file)).blob(); },
    async cutout(file, q) { return (await post('api/cutout?' + q, file)).blob(); },
    async audio(file, q) { return (await post('api/audio?' + q, file)).blob(); },
    async video(file, q, { signal, onProgress } = {}) {
      const id = (await (await post('api/video?' + q, file, { signal })).json()).id; job = id;
      for (;;) {
        await sleep(600);
        if (job !== id) throw new DOMException('Dibatalkan', 'AbortError');
        const st = await (await fetch('api/video/status?id=' + id, { signal })).json();
        if (st.error) throw new Error(st.error);
        if (st.state === 'err') throw new Error(st.err || 'Gagal memproses video');
        if (onProgress) onProgress(st.pct, st.note);
        if (st.state === 'done') { const blob = await (await fetch('api/video/file?id=' + id, { signal })).blob(); job = null; return { blob, note: st.note }; }
      }
    },
    cancelVideo() { const id = job; job = null; if (id) fetch('api/video/cancel?id=' + id, { method: 'POST' }).catch(() => {}); }
  };
})();
