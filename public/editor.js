/* Rendzz Media Studio - Editor Hapus Background
 * Model kerja: foto asli tidak pernah diubah. Yang diedit hanyalah MASK (0-255) per piksel pada resolusi kerja (maks 2400 px).
 * Hasil akhir = foto asli resolusi penuh x mask (di-upscale halus). Alat: AI, pipet warna, kuas hapus/pulihkan, perapihan tepi, bersihkan bintik.
 * Bergantung pada global dari index.html: $, $$, P, post, toast, setSeg, setMode, queue.
 */
(() => {
const WORK_MAX = 2400, UNDO_MAX = 25;
const ED = { W: 0, H: 0, sw: 0, sh: 0, full: null, orig: null, hasAlpha: false, mask: null, pv: null, cache: null, undo: [], redo: [],
  tool: 'ai', viewMode: 'result', view: { s: 1, x: 0, y: 0 }, userZoom: false, key: '', stroking: false, pick: null, brush: { size: 40, hard: 70, str: 100 },
  ctx: null, img: null, space: false, busy: false };

/* ---------- Markup ---------- */
const ico = d => `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
$('#edBox').innerHTML = `
 <div class="ed-bar">
  <div class="ed-grp" id="edTools">
   <button class="btn sm" data-tool="ai" title="Hapus otomatis AI (A)">${ico('<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>')}AI</button>
   <button class="btn sm" data-tool="pick" title="Pipet warna (I)">${ico('<path d="M2 22l1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="M14.5 5.5l4 4"/><path d="M15 4l1-1a2.1 2.1 0 013 3l-1 1z"/>')}Pipet warna</button>
   <button class="btn sm" data-tool="erase" title="Kuas hapus (E)">${ico('<path d="M20 20H9l-5-5a2 2 0 010-3L13 3a2 2 0 013 0l5 5a2 2 0 010 3l-8 8"/>')}Hapus</button>
   <button class="btn sm" data-tool="restore" title="Kuas pulihkan (R)">${ico('<path d="M3 12a9 9 0 109-9 9.7 9.7 0 00-6.7 2.8L3 8"/><path d="M3 3v5h5"/>')}Pulihkan</button>
   <button class="btn sm" data-tool="pan" title="Geser (H / tahan Spasi)">${ico('<path d="M18 11V6a2 2 0 00-4 0v5M14 10V4a2 2 0 00-4 0v6M10 10.5V6a2 2 0 00-4 0v8"/><path d="M18 8a2 2 0 014 0v6a8 8 0 01-8 8h-2c-2.5 0-4-1-5.7-2.7L3 15a2 2 0 013-2.7L8 14"/>')}Geser</button>
  </div>
  <div class="ed-grp"><button class="btn sm" id="edUndo" title="Urungkan (Ctrl+Z)" disabled>↶</button><button class="btn sm" id="edRedo" title="Ulangi (Ctrl+Y)" disabled>↷</button></div>
  <div class="seg" id="edViewMode" data-val="result" style="width:260px"><button data-v="result" class="on">Hasil</button><button data-v="overlay" title="Area terhapus diberi warna merah (O)">Overlay</button><button data-v="orig">Asli</button></div>
  <div class="ed-grp" id="edBgs" title="Latar pratinjau">
   <button class="sw sw-chk on" data-bg="chk"></button><button class="sw" data-bg="#ffffff" style="background:#fff"></button><button class="sw" data-bg="#000000" style="background:#000"></button><button class="sw" data-bg="#00b140" style="background:#00b140"></button><button class="sw" data-bg="#ff3b6b" style="background:#ff3b6b"></button>
  </div>
  <div class="sp"></div>
  <div class="ed-grp"><button class="btn sm" id="edFit">Pas</button><button class="btn sm" id="edOne">100%</button></div>
 </div>
 <div class="ed-view bg-chk" id="edViewPort"><div id="edWrap"><canvas id="edCv"></canvas></div><div id="edCur" hidden></div><div id="edBusy" hidden></div><div id="edHud" class="ed-hud"></div></div>`;

$('#edInsp').innerHTML = `
 <div id="edHint" class="ed-hint"></div>

 <div class="ed-panel" data-for="ai">
  <div class="lbl">Model AI</div>
  <div class="seg" id="edModel" data-val="medium"><button data-v="small">Cepat</button><button data-v="medium" class="on">Akurat</button></div>
  <button class="btn pri" id="edRunAI" style="width:100%;margin-top:10px">Hapus otomatis (AI)</button>
  <span class="sub" style="font-size:12px">Hasil AI bisa dirapikan dengan pipet warna dan kuas. Proses pertama lebih lama karena model dimuat.</span>
 </div>

 <div class="ed-panel" data-for="pick">
  <div class="row" style="gap:10px;justify-content:flex-start">
   <input id="edCol" type="color" value="#00b140" style="width:48px;height:40px;border:0;background:none;padding:0" aria-label="Warna">
   <div><b id="edColHex">Belum ada warna</b><div class="sub" style="font-size:12px">Klik pada gambar untuk mengambil warna</div></div>
  </div>
  <div><div class="lbl">Toleransi <b id="edTolV">25</b></div><input id="edTol" type="range" min="1" max="100" value="25"></div>
  <div><div class="lbl">Kelembutan tepi <b id="edSoftV">8</b></div><input id="edSoft" type="range" min="0" max="40" value="8"></div>
  <div><div class="lbl">Area</div><div class="seg" id="edScope" data-val="contig"><button data-v="contig" class="on">Terhubung</button><button data-v="all">Seluruh foto</button></div></div>
  <div class="row" style="gap:8px"><button class="btn pri sm" id="edPickApply" disabled style="flex:1">Terapkan (Enter)</button><button class="btn sm" id="edPickCancel" disabled>Batal</button></div>
  <span class="sub" style="font-size:12px"><b>Terhubung</b> = seperti tongkat ajaib: hanya warna serupa yang menyambung dari titik klik. <b>Seluruh foto</b> = semua piksel berwarna serupa (mis. sela-sela rambut).</span>
 </div>

 <div class="ed-panel" data-for="erase restore">
  <div><div class="lbl">Ukuran <b id="edSizeV">40</b> px</div><input id="edSize" type="range" min="2" max="400" value="40"></div>
  <div><div class="lbl">Kekerasan tepi <b id="edHardV">70</b>%</div><input id="edHard" type="range" min="0" max="100" value="70"></div>
  <div><div class="lbl">Kekuatan <b id="edStrV">100</b>%</div><input id="edStr" type="range" min="5" max="100" value="100"></div>
  <span class="sub" style="font-size:12px">Tips: perbesar foto dengan scroll mouse, geser dengan Spasi + seret. Tombol [ dan ] mengubah ukuran kuas.</span>
 </div>

 <div class="ed-panel" data-for="pan"><span class="sub">Seret untuk menggeser, scroll mouse untuk zoom. Tahan Spasi kapan pun untuk menggeser sementara.</span></div>

 <div class="ed-sep"></div>
 <div class="lbl" style="margin:0">Perapihan tepi</div>
 <div><div class="lbl">Perkecil / perbesar tepi <b id="edGrowV">0</b> px</div><input id="edGrow" type="range" min="-8" max="8" value="0"></div>
 <div><div class="lbl">Haluskan tepi <b id="edBlurV">0</b> px</div><input id="edBlur" type="range" min="0" max="10" value="0"></div>
 <div class="ed-sep"></div>
 <div class="lbl" style="margin:0">Bersihkan bintik</div>
 <div><div class="lbl">Ukuran maks <b id="edSpkV">200</b> px</div><input id="edSpk" type="range" min="5" max="3000" value="200"></div>
 <label class="row" style="justify-content:flex-start;gap:10px;cursor:pointer"><input id="edHoles" type="checkbox" checked> Isi lubang kecil</label>
 <button class="btn sm" id="edClean">Bersihkan bintik</button>
 <div class="ed-actions">
  <button class="btn pri" id="edApply">Terapkan ke hasil</button>
  <div class="grid2"><button class="btn sm" id="edBack" title="Kembali tanpa menerapkan">Kembali</button><button class="btn sm" id="edReset" title="Reset semua hapusan">Reset hapusan</button></div>
 </div>`;

const $e = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const HINT = {
  ai: 'Mulai di sini: AI menghapus background otomatis. Setelah itu rapikan bagian yang kurang bersih.',
  pick: 'Klik warna latar yang ingin dihapus. Atur toleransi sambil melihat pratinjau, lalu Terapkan.',
  erase: 'Gosok area yang masih tersisa (latar yang kurang bersih).',
  restore: 'Gosok bagian objek yang ikut terhapus untuk mengembalikannya dari foto asli.',
  pan: 'Geser tampilan foto.' };

/* ---------- Sumber & kanvas ---------- */
function cropKey() { const k = P.crop; return (P.file ? P.file.name + P.file.size + P.file.lastModified : '') + (k ? [k.x, k.y, k.width, k.height].join() : ''); }

function build() {
  const k = P.crop, sw = k ? k.width : P.img.naturalWidth, sh = k ? k.height : P.img.naturalHeight;
  const full = document.createElement('canvas'); full.width = sw; full.height = sh;
  const fctx = full.getContext('2d'); k ? fctx.drawImage(P.img, k.x, k.y, k.width, k.height, 0, 0, sw, sh) : fctx.drawImage(P.img, 0, 0);
  const sc = Math.min(1, WORK_MAX / Math.max(sw, sh)), W = Math.max(1, Math.round(sw * sc)), H = Math.max(1, Math.round(sh * sc));
  const wc = document.createElement('canvas'); wc.width = W; wc.height = H;
  const wctx = wc.getContext('2d', { willReadFrequently: true }); wctx.imageSmoothingQuality = 'high'; wctx.drawImage(full, 0, 0, W, H);
  const id = wctx.getImageData(0, 0, W, H);
  Object.assign(ED, { sw, sh, W, H, full, orig: id.data, key: cropKey(), undo: [], redo: [], pv: null, cache: null, pick: null, userZoom: false });
  ED.hasAlpha = false; for (let j = 3; j < ED.orig.length; j += 4) if (ED.orig[j] < 255) { ED.hasAlpha = true; break; }
  ED.mask = new Uint8Array(W * H).fill(255);
  const cv = $e('edCv'); cv.width = W; cv.height = H; cv.style.width = W + 'px'; cv.style.height = H + 'px';
  ED.ctx = cv.getContext('2d'); ED.img = ED.ctx.createImageData(W, H);
  paint(0, 0, W, H); syncHistory(); setPickUI();
}

const refineOn = () => +$e('edGrow').value !== 0 || +$e('edBlur').value !== 0;
const curMask = () => ED.pv ? ED.pv : ED.stroking ? ED.mask : refineOn() ? (ED.cache || (ED.cache = refine(ED.mask))) : ED.mask;

function paint(x0, y0, x1, y1) {
  x0 = clamp(x0 | 0, 0, ED.W); y0 = clamp(y0 | 0, 0, ED.H); x1 = clamp(Math.ceil(x1), 0, ED.W); y1 = clamp(Math.ceil(y1), 0, ED.H);
  if (x1 <= x0 || y1 <= y0) return;
  const { W, orig, img } = ED, d = img.data, m = curMask(), mode = ED.viewMode, ha = ED.hasAlpha;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const i = y * W + x, j = i * 4; let a = m[i]; if (ha) a = a * orig[j + 3] / 255;
    if (mode === 'result') { d[j] = orig[j]; d[j + 1] = orig[j + 1]; d[j + 2] = orig[j + 2]; d[j + 3] = a; }
    else if (mode === 'overlay') { const k = a / 255, r = .4 + .6 * k, t = .6 * (1 - k); d[j] = orig[j] * r + 255 * t; d[j + 1] = orig[j + 1] * r + 30 * t; d[j + 2] = orig[j + 2] * r + 70 * t; d[j + 3] = 255; }
    else { d[j] = orig[j]; d[j + 1] = orig[j + 1]; d[j + 2] = orig[j + 2]; d[j + 3] = 255; }
  }
  ED.ctx.putImageData(img, 0, 0, x0, y0, x1 - x0, y1 - y0);
}
const paintAll = () => paint(0, 0, ED.W, ED.H);
function invalidate() { ED.cache = null; paintAll(); }

/* ---------- Riwayat ---------- */
function pushUndo() { ED.undo.push(ED.mask.slice()); if (ED.undo.length > UNDO_MAX) ED.undo.shift(); ED.redo = []; syncHistory(); }
function syncHistory() { $e('edUndo').disabled = !ED.undo.length; $e('edRedo').disabled = !ED.redo.length; }
function undo() { if (!ED.undo.length) return; cancelPick(); ED.redo.push(ED.mask); ED.mask = ED.undo.pop(); syncHistory(); invalidate(); }
function redo() { if (!ED.redo.length) return; cancelPick(); ED.undo.push(ED.mask); ED.mask = ED.redo.pop(); syncHistory(); invalidate(); }

/* ---------- Tampilan: zoom & geser ---------- */
const vp = () => $e('edViewPort');
function applyView() {
  const v = ED.view; $e('edWrap').style.transform = `translate(${v.x}px,${v.y}px) scale(${v.s})`;
  $e('edCv').style.imageRendering = v.s >= 3 ? 'pixelated' : 'auto'; hud();
}
function fit() {
  const r = vp().getBoundingClientRect(); if (!ED.W || !r.width) return;
  const s = Math.min(r.width / ED.W, r.height / ED.H) * .97;
  ED.view = { s, x: (r.width - ED.W * s) / 2, y: (r.height - ED.H * s) / 2 }; ED.userZoom = false; applyView();
}
function zoomAt(cx, cy, ns) {
  const v = ED.view; ns = clamp(ns, .05, 40); const k = ns / v.s;
  ED.view = { s: ns, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k }; ED.userZoom = true; applyView(); updateCursor();
}
function toImg(ev) { const r = vp().getBoundingClientRect(), v = ED.view; return { x: (ev.clientX - r.left - v.x) / v.s, y: (ev.clientY - r.top - v.y) / v.s, cx: ev.clientX - r.left, cy: ev.clientY - r.top }; }
function hud(p) {
  let t = Math.round(ED.view.s * ED.sw / ED.W * 100) + '%';
  if (p && p.x >= 0 && p.y >= 0 && p.x < ED.W && p.y < ED.H) { const i = (p.y | 0) * ED.W + (p.x | 0), j = i * 4, o = ED.orig; t += `  ·  ${Math.round(p.x * ED.sw / ED.W)}, ${Math.round(p.y * ED.sh / ED.H)}  ·  ${hex(o[j], o[j + 1], o[j + 2])}  ·  α ${Math.round(ED.mask[i] / 255 * 100)}%`; }
  $e('edHud').textContent = t;
}
const hex = (r, g, b) => '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');

/* ---------- Pipet warna ---------- */
const dist = (r1, g1, b1, r2, g2, b2) => { const rm = (r1 + r2) / 2, dr = r1 - r2, dg = g1 - g2, db = b1 - b2; return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db); };
function setPickUI() {
  const p = ED.pick; $e('edColHex').textContent = p ? hex(p.r, p.g, p.b).toUpperCase() : 'Belum ada warna';
  if (p) $e('edCol').value = hex(p.r, p.g, p.b); $e('edPickApply').disabled = $e('edPickCancel').disabled = !ED.pv;
}
function sample(x, y) {
  let r = 0, g = 0, b = 0, n = 0; x |= 0; y |= 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= ED.W || yy >= ED.H) continue; const j = (yy * ED.W + xx) * 4; r += ED.orig[j]; g += ED.orig[j + 1]; b += ED.orig[j + 2]; n++; }
  return { r: r / n, g: g / n, b: b / n };
}
let pvRaf = 0;
function previewPick() { if (!pvRaf) pvRaf = requestAnimationFrame(() => { pvRaf = 0; computePick(); }); }
function computePick() {
  const p = ED.pick; if (!p) return;
  const { W, H, orig, mask } = ED, tolD = +$e('edTol').value * 3, softD = +$e('edSoft').value * 2 + 2, lim = tolD + softD, contig = $e('edScope').dataset.val === 'contig' && p.sx != null;
  const pv = new Uint8Array(mask);
  const apply = i => { const j = i * 4, d = dist(orig[j], orig[j + 1], orig[j + 2], p.r, p.g, p.b); if (d > lim) return false; const f = d <= tolD ? 0 : (d - tolD) / softD * 255; if (f < pv[i]) pv[i] = f; return true; };
  if (!contig) { for (let i = 0; i < W * H; i++) apply(i); }
  else {
    const seen = new Uint8Array(W * H), q = new Int32Array(W * H); let qs = 0, qe = 0;
    const s = (p.sy | 0) * W + (p.sx | 0); seen[s] = 1; q[qe++] = s;
    while (qs < qe) {
      const i = q[qs++]; if (!apply(i)) continue; const x = i % W, y = (i / W) | 0;
      if (x > 0 && !seen[i - 1]) { seen[i - 1] = 1; q[qe++] = i - 1; } if (x < W - 1 && !seen[i + 1]) { seen[i + 1] = 1; q[qe++] = i + 1; }
      if (y > 0 && !seen[i - W]) { seen[i - W] = 1; q[qe++] = i - W; } if (y < H - 1 && !seen[i + W]) { seen[i + W] = 1; q[qe++] = i + W; }
    }
  }
  ED.pv = pv; setPickUI(); paintAll();
}
function applyPick() { if (!ED.pv) return; pushUndo(); ED.mask = ED.pv; ED.pv = null; ED.cache = null; setPickUI(); paintAll(); }
function cancelPick() { if (!ED.pv && !ED.pick) return; ED.pv = null; setPickUI(); if (ED.mask) paintAll(); }

/* ---------- Kuas ---------- */
let last = null, dirty = null;
function stamp(x, y, erase) {
  const { W, H, mask } = ED, r = ED.brush.size / 2, h = ED.brush.hard / 100, st = ED.brush.str / 100, x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(W, Math.ceil(x + r) + 1), y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(H, Math.ceil(y + r) + 1), inner = h * r, span = Math.max(1e-6, r - inner);
  for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
    const dx = xx - x, dy = yy - y, d = Math.sqrt(dx * dx + dy * dy); if (d > r) continue;
    const a = (d <= inner ? 1 : 1 - (d - inner) / span) * st, i = yy * W + xx, m = mask[i];
    mask[i] = erase ? m * (1 - a) + .5 : m + (255 - m) * a + .5;
  }
  dirty = dirty ? [Math.min(dirty[0], x0), Math.min(dirty[1], y0), Math.max(dirty[2], x1), Math.max(dirty[3], y1)] : [x0, y0, x1, y1];
}
function strokeTo(p, erase) {
  const sp = Math.max(1, ED.brush.size * .18);
  if (!last) stamp(p.x, p.y, erase);
  else { const dx = p.x - last.x, dy = p.y - last.y, n = Math.max(1, Math.floor(Math.hypot(dx, dy) / sp)); for (let k = 1; k <= n; k++) stamp(last.x + dx * k / n, last.y + dy * k / n, erase); }
  last = { x: p.x, y: p.y }; if (dirty) { paint(...dirty); dirty = null; }
}

/* ---------- Penyempurnaan tepi ---------- */
function rank(src, W, H, r, isMax) {
  const tmp = new Uint8Array(W * H), out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = isMax ? 0 : 255; const a = Math.max(0, x - r), b = Math.min(W - 1, x + r); for (let k = a; k <= b; k++) { const s = src[y * W + k]; if (isMax ? s > v : s < v) v = s; } tmp[y * W + x] = v; }
  for (let y = 0; y < H; y++) { const a = Math.max(0, y - r), b = Math.min(H - 1, y + r); for (let x = 0; x < W; x++) { let v = isMax ? 0 : 255; for (let k = a; k <= b; k++) { const s = tmp[k * W + x]; if (isMax ? s > v : s < v) v = s; } out[y * W + x] = v; } }
  return out;
}
function boxBlur(src, W, H, r) {
  const t = new Float32Array(W * H), o = new Uint8Array(W * H), n = 2 * r + 1;
  for (let y = 0; y < H; y++) { let s = 0; for (let k = -r; k <= r; k++) s += src[y * W + clamp(k, 0, W - 1)]; for (let x = 0; x < W; x++) { t[y * W + x] = s / n; s += src[y * W + clamp(x + r + 1, 0, W - 1)] - src[y * W + clamp(x - r, 0, W - 1)]; } }
  for (let x = 0; x < W; x++) { let s = 0; for (let k = -r; k <= r; k++) s += t[clamp(k, 0, H - 1) * W + x]; for (let y = 0; y < H; y++) { o[y * W + x] = s / n + .5; s += t[clamp(y + r + 1, 0, H - 1) * W + x] - t[clamp(y - r, 0, H - 1) * W + x]; } }
  return o;
}
function refine(m) {
  const { W, H } = ED, g = +$e('edGrow').value, b = +$e('edBlur').value; let o = m;
  if (g) o = rank(o, W, H, Math.abs(g), g > 0);
  if (b) { o = boxBlur(o, W, H, b); o = boxBlur(o, W, H, Math.max(1, Math.round(b * .6))); }
  return o;
}

/* ---------- Bersihkan bintik ---------- */
function cleanSpecks(maxA, holes) {
  const { W, H } = ED, m = ED.mask, seen = new Uint8Array(W * H), q = new Int32Array(W * H); let fixed = 0;
  for (let s = 0; s < W * H; s++) {
    if (seen[s]) continue; const fg = m[s] >= 128; let qs = 0, qe = 0, border = false; seen[s] = 1; q[qe++] = s;
    while (qs < qe) {
      const i = q[qs++], x = i % W, y = (i / W) | 0; if (x === 0 || y === 0 || x === W - 1 || y === H - 1) border = true;
      if (x > 0 && !seen[i - 1] && (m[i - 1] >= 128) === fg) { seen[i - 1] = 1; q[qe++] = i - 1; } if (x < W - 1 && !seen[i + 1] && (m[i + 1] >= 128) === fg) { seen[i + 1] = 1; q[qe++] = i + 1; }
      if (y > 0 && !seen[i - W] && (m[i - W] >= 128) === fg) { seen[i - W] = 1; q[qe++] = i - W; } if (y < H - 1 && !seen[i + W] && (m[i + W] >= 128) === fg) { seen[i + W] = 1; q[qe++] = i + W; }
    }
    if (qe <= maxA && (fg || (holes && !border))) { const v = fg ? 0 : 255; for (let k = 0; k < qe; k++) m[q[k]] = v; fixed++; }
  }
  return fixed;
}

/* ---------- AI ---------- */
function busy(t) { const b = $e('edBusy'); b.hidden = !t; b.textContent = t || ''; ED.busy = !!t; }
async function runAI() {
  if (ED.busy) return; busy('AI sedang menghapus background… (pertama kali bisa 1-2 menit)');
  try {
    const q = new URLSearchParams({ model: $e('edModel').dataset.val }), k = P.crop;
    if (k) Object.entries({ cx: k.x, cy: k.y, cw: k.width, ch: k.height }).forEach(([a, v]) => q.set(a, v));
    const blob = await post('/api/cutout?' + q, P.file), bmp = await createImageBitmap(blob);
    const c = document.createElement('canvas'); c.width = ED.W; c.height = ED.H; const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingQuality = 'high'; x.drawImage(bmp, 0, 0, ED.W, ED.H);
    const d = x.getImageData(0, 0, ED.W, ED.H).data, m = new Uint8Array(ED.W * ED.H); for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3];
    cancelPick(); pushUndo(); ED.mask = m; invalidate(); toast2('Selesai. Rapikan sisa latar dengan Pipet warna atau kuas.');
  } catch (e) { toast(e.message); } finally { busy(''); }
}
function toast2(m) { const t = $('#toast'); t.style.background = '#2f7d4f'; toast(m); setTimeout(() => t.style.background = '', 4600); }

/* ---------- Terapkan ke hasil ---------- */
async function commit() {
  if (ED.busy) return; applyPick(); busy('Menyusun hasil resolusi penuh…');
  try {
    await new Promise(r => setTimeout(r, 30));
    const m = refineOn() ? refine(ED.mask) : ED.mask, mc = document.createElement('canvas'); mc.width = ED.W; mc.height = ED.H;
    const mx = mc.getContext('2d'), id = mx.createImageData(ED.W, ED.H); for (let i = 0; i < m.length; i++) id.data[i * 4 + 3] = m[i]; mx.putImageData(id, 0, 0);
    const out = document.createElement('canvas'); out.width = ED.sw; out.height = ED.sh; const ox = out.getContext('2d');
    ox.drawImage(ED.full, 0, 0); ox.globalCompositeOperation = 'destination-in'; ox.imageSmoothingEnabled = true; ox.imageSmoothingQuality = 'high'; ox.drawImage(mc, 0, 0, ED.sw, ED.sh);
    P.cut = await new Promise(r => out.toBlob(r, 'image/png'));
    $('#pRm').checked = true; $('#pRmO').hidden = false; setMode('cmp'); queue(0);
  } catch (e) { toast('Gagal menyusun hasil: ' + e.message); } finally { busy(''); }
}

/* ---------- Alat & UI ---------- */
function setTool(t) {
  if (t !== 'pick') cancelPick(); ED.tool = t;
  $$('#edTools [data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  $$('#edInsp .ed-panel').forEach(p => p.hidden = !p.dataset.for.split(' ').includes(t));
  $e('edHint').textContent = HINT[t]; vp().style.cursor = t === 'pan' ? 'grab' : t === 'pick' ? 'crosshair' : 'none'; $e('edCur').hidden = true;
}
function updateCursor(p) {
  const c = $e('edCur'), brush = ED.tool === 'erase' || ED.tool === 'restore';
  if (!p || !brush || ED.space) { c.hidden = true; if (brush && ED.space) vp().style.cursor = 'grab'; else if (brush) vp().style.cursor = 'none'; return; }
  const d = ED.brush.size * ED.view.s; c.hidden = false; c.style.width = c.style.height = d + 'px'; c.style.left = p.cx + 'px'; c.style.top = p.cy + 'px'; c.className = ED.tool === 'erase' ? 'er' : 'rs';
}
let drag = null;
function bindView() {
  const v = vp();
  v.addEventListener('pointerdown', e => {
    if (ED.busy || !ED.W) return; const p = toImg(e);
    if (e.button === 1 || ED.space || ED.tool === 'pan') { drag = { pan: true, x: e.clientX, y: e.clientY, vx: ED.view.x, vy: ED.view.y }; v.setPointerCapture(e.pointerId); v.style.cursor = 'grabbing'; e.preventDefault(); return; }
    if (e.button !== 0) return;
    if (ED.tool === 'pick') {
      if (p.x < 0 || p.y < 0 || p.x >= ED.W || p.y >= ED.H) return;
      const c = sample(p.x, p.y); ED.pick = { ...c, sx: p.x, sy: p.y }; computePick(); return;
    }
    if (ED.tool === 'erase' || ED.tool === 'restore') { cancelPick(); pushUndo(); ED.stroking = true; last = null; drag = { brush: true }; v.setPointerCapture(e.pointerId); strokeTo(p, ED.tool === 'erase'); }
  });
  v.addEventListener('pointermove', e => {
    const p = toImg(e); hud(p); updateCursor(p);
    if (!drag) return;
    if (drag.pan) { ED.view.x = drag.vx + e.clientX - drag.x; ED.view.y = drag.vy + e.clientY - drag.y; ED.userZoom = true; applyView(); }
    else if (drag.brush) strokeTo(p, ED.tool === 'erase');
  });
  const end = () => { if (!drag) return; if (drag.brush) { ED.stroking = false; last = null; ED.cache = null; if (refineOn()) paintAll(); } drag = null; v.style.cursor = ED.tool === 'pan' || ED.space ? 'grab' : ED.tool === 'pick' ? 'crosshair' : 'none'; };
  v.addEventListener('pointerup', end); v.addEventListener('pointercancel', end);
  v.addEventListener('pointerleave', () => { $e('edCur').hidden = true; });
  v.addEventListener('wheel', e => { e.preventDefault(); const p = toImg(e); zoomAt(p.cx, p.cy, ED.view.s * Math.exp(-e.deltaY * .0016)); }, { passive: false });
  v.addEventListener('contextmenu', e => e.preventDefault());
}

const bindRange = (id, fn) => { const el = $e(id), lab = $e(id + 'V'); el.addEventListener('input', () => { lab.textContent = el.value; fn && fn(+el.value); }); };

function init() {
  bindView();
  $e('edTools').addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (b) setTool(b.dataset.tool); });
  $e('edUndo').onclick = undo; $e('edRedo').onclick = redo; $e('edFit').onclick = fit; $e('edOne').onclick = () => { const r = vp().getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, ED.W / ED.sw); };
  $e('edViewMode').addEventListener('segchange', () => { ED.viewMode = $e('edViewMode').dataset.val; paintAll(); });
  $e('edBgs').addEventListener('click', e => { const b = e.target.closest('.sw'); if (!b) return; $$('#edBgs .sw').forEach(x => x.classList.toggle('on', x === b)); const v = vp(); v.classList.toggle('bg-chk', b.dataset.bg === 'chk'); v.style.backgroundColor = b.dataset.bg === 'chk' ? '' : b.dataset.bg; });
  $e('edRunAI').onclick = runAI;
  bindRange('edTol', previewPick); bindRange('edSoft', previewPick);
  $e('edScope').addEventListener('segchange', previewPick);
  $e('edCol').addEventListener('input', () => { const h = $e('edCol').value, r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16); ED.pick = { r, g, b, sx: ED.pick ? ED.pick.sx : null, sy: ED.pick ? ED.pick.sy : null }; computePick(); });
  $e('edPickApply').onclick = applyPick; $e('edPickCancel').onclick = cancelPick;
  bindRange('edSize', v => { ED.brush.size = v; }); bindRange('edHard', v => { ED.brush.hard = v; }); bindRange('edStr', v => { ED.brush.str = v; });
  let rf = 0; const rfn = () => { if (!rf) rf = requestAnimationFrame(() => { rf = 0; invalidate(); }); };
  bindRange('edGrow', () => { ED.cache = null; rfn(); }); bindRange('edBlur', () => { ED.cache = null; rfn(); });
  bindRange('edSpk');
  $e('edClean').onclick = () => { cancelPick(); pushUndo(); const n = cleanSpecks(+$e('edSpk').value, $e('edHoles').checked); invalidate(); toast2(n ? n + ' bintik dibersihkan.' : 'Tidak ada bintik yang ditemukan pada ukuran itu.'); };
  $e('edReset').onclick = () => { cancelPick(); pushUndo(); ED.mask = new Uint8Array(ED.W * ED.H).fill(255); invalidate(); };
  $e('edApply').onclick = commit; $e('edBack').onclick = () => setMode('cmp');
  window.addEventListener('resize', () => { if (!$e('edBox').hidden && !ED.userZoom) fit(); });
  document.addEventListener('keydown', e => {
    if ($e('edBox').hidden || $('#tab-foto').hidden) return;
    const tag = (e.target.tagName || '').toLowerCase(); if ((tag === 'input' && e.target.type !== 'range' && e.target.type !== 'checkbox') || tag === 'textarea') return;
    const k = e.key.toLowerCase(), ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && k === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
    if (ctrl && k === 'y') { e.preventDefault(); redo(); return; }
    if (ctrl) return;
    if (e.code === 'Space') { e.preventDefault(); if (!ED.space) { ED.space = true; vp().style.cursor = 'grab'; $e('edCur').hidden = true; } return; }
    const map = { a: 'ai', i: 'pick', e: 'erase', r: 'restore', h: 'pan' };
    if (map[k]) setTool(map[k]);
    else if (k === '[' || k === ']') { const s = clamp(Math.round(ED.brush.size * (k === ']' ? 1.15 : .87) + (k === ']' ? 1 : -1)), 2, 400); ED.brush.size = s; $e('edSize').value = s; $e('edSizeV').textContent = s; }
    else if (k === '0') fit();
    else if (k === 'o') { const n = ED.viewMode === 'overlay' ? 'result' : 'overlay'; setSeg('edViewMode', n); ED.viewMode = n; paintAll(); }
    else if (k === 'enter' && ED.pv) applyPick();
    else if (k === 'escape') cancelPick();
  });
  document.addEventListener('keyup', e => { if (e.code === 'Space') { ED.space = false; setTool(ED.tool); } });
}

/* ---------- API untuk index.html ---------- */
window.edEnter = () => {
  if (!P.img) return;
  if (!ED.mask || ED.key !== cropKey()) build();
  setTool(ED.tool); requestAnimationFrame(() => { fit(); });
};
window.edLeave = () => { cancelPick(); };
window.edReset = () => { ED.mask = null; ED.key = ''; P.cut = null; };
init(); setTool('ai');
})();
