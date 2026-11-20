# Versi web / PWA (Tahap 2)

Folder ini disiapkan untuk versi yang berjalan sepenuhnya di browser (Android, iPhone, PC) dan di-hosting di GitHub Pages.

Tampilannya memakai folder `../ui` yang sama dengan versi desktop. Yang dibuat di sini hanya mesin pemrosesnya
(`engine-web.js`), dengan antarmuka yang sama seperti `ui/engine.js`. Lihat `../docs/ENGINE.md`.

Rencana isi:
- `engine-web.js`: foto (canvas + codec WebAssembly), musik dan video (ffmpeg.wasm / WebCodecs), hapus background (model di browser)
- `manifest.webmanifest` dan `sw.js`: agar bisa dipasang dan jalan offline
- skrip build yang menyalin `../ui` ke folder `dist/` bersama library (cropperjs) lalu dideploy lewat GitHub Actions
