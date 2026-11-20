# Versi web / PWA

Berisi mesin pemrosesan browser dan skrip build. Tampilannya diambil dari `../ui`.

- `engine-web.js`: Engine web (foto: canvas). Saat build disalin sebagai `engine.js` menggantikan versi desktop.
- `build.mjs`: membuat `dist/` (ui + engine web + cropperjs + manifest, ikon, service worker)
- `serve.mjs`: server statis kecil untuk mencoba `dist/` di `http://localhost:8080`
- `pwa/`: manifest dan ikon

Panduan lengkap (build, deploy GitHub Pages, memasang di HP): [../docs/WEB.md](../docs/WEB.md)
