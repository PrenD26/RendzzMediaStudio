// Membuat web/dist: salinan ui/ + engine web + cropperjs + file PWA (manifest, ikon, service worker).
// Pakai: cd web && npm install && npm run build
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ui = path.join(here, '..', 'ui'), dist = path.join(here, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(here, 'package.json'), 'utf8'));
const copy = (from, to) => { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); };
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const rel = f => path.relative(dist, f).split(path.sep).join('/');

const cr = path.join(here, 'node_modules', 'cropperjs', 'dist');
if (!fs.existsSync(path.join(cr, 'cropper.min.js'))) { console.error('cropperjs belum terpasang. Jalankan "npm install" di folder web/ dulu.'); process.exit(1); }

fs.rmSync(dist, { recursive: true, force: true });
for (const f of walk(ui)) { const r = path.relative(ui, f); if (r !== 'engine.js') copy(f, path.join(dist, r)); }
copy(path.join(here, 'engine-web.js'), path.join(dist, 'engine.js'));
copy(path.join(cr, 'cropper.min.js'), path.join(dist, 'lib', 'cropper.js'));
copy(path.join(cr, 'cropper.min.css'), path.join(dist, 'lib', 'cropper.css'));
for (const f of fs.readdirSync(path.join(here, 'pwa'))) copy(path.join(here, 'pwa', f), path.join(dist, f));
fs.writeFileSync(path.join(dist, '.nojekyll'), '');

// Sisipkan manifest + pendaftaran service worker ke index.html
let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const head = '<head>\n<link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#0f1115"><link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="icon-192.png">';
const reg = '<script>if("serviceWorker" in navigator)addEventListener("load",function(){navigator.serviceWorker.register("sw.js").catch(function(){})})</script>\n</body>';
if (!html.includes('<head>') || !html.includes('</body>')) throw new Error('index.html tidak punya <head> / </body>');
fs.writeFileSync(path.join(dist, 'index.html'), html.replace('<head>', head).replace('</body>', reg));

// Service worker: simpan semua file saat pertama dibuka agar bisa offline. Nama cache berubah tiap isi berubah.
const files = walk(dist).map(rel).filter(f => f !== 'sw.js' && f !== '.nojekyll').sort();
const h = crypto.createHash('sha1');
for (const f of files) { h.update(f); h.update(fs.readFileSync(path.join(dist, f))); }
const ver = pkg.version + '-' + h.digest('hex').slice(0, 8);
fs.writeFileSync(path.join(dist, 'sw.js'), `const CACHE='rendzz-${ver}';
const FILES=${JSON.stringify(['./', ...files])};
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n.startsWith('rendzz-')&&n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(r=>r||fetch(e.request)))});
`);
console.log(`web/dist siap: ${files.length + 1} file, cache rendzz-${ver}`);
