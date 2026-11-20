# Versi web (PWA)

Versi web memakai tampilan yang sama dengan desktop (`ui/`), tetapi semua proses berjalan di browser lewat `web/engine-web.js`.
File tidak diunggah ke mana pun. Setelah dibuka sekali, aplikasi bisa dipakai tanpa internet (service worker).

## Status fitur (v3.7)

| Fitur | Web | Desktop |
| --- | --- | --- |
| Foto: kompres JPG / WebP / PNG, ubah ukuran, crop, latar | ada | ada |
| Foto: AVIF | belum | ada |
| Foto: hapus background (AI) | belum | ada |
| Batch foto | ada | ada |
| Video (trim, kompres) | belum | ada |
| Musik (trim, konversi) | belum | ada |

Fitur yang belum ada otomatis disembunyikan di versi web (lewat `Engine.caps()`).
Perbedaan kecil: PNG di web tidak dikuantisasi seperti di desktop, jadi ukurannya bisa lebih besar; pengaturan Kualitas tidak berpengaruh untuk PNG.

## Mencoba di komputer sendiri

```
cd web
npm install
npm run build
npm run serve      # buka http://localhost:8080
```

## Deploy ke GitHub Pages (sekali setup)

1. Di GitHub buka repo, **Settings > Pages**.
2. Pada **Build and deployment > Source**, pilih **GitHub Actions**.
3. Push ke branch `main`. Workflow `.github/workflows/pages.yml` membangun `web/dist` dan menerbitkannya otomatis.
4. Alamatnya: `https://NAMAKAMU.github.io/NAMAREPO/` (tampil juga di tab **Actions** pada langkah deploy).

Setelah itu setiap perubahan pada `ui/` atau `web/` yang dipush ke `main` ikut terbit otomatis.

## Memasang di HP / PC

- **Android (Chrome):** buka alamatnya, menu titik tiga, **Pasang aplikasi** / **Tambahkan ke layar utama**.
- **PC (Chrome/Edge):** ikon pasang di kanan bilah alamat.
- **iPhone (Safari):** tombol Bagikan, **Tambah ke Layar Utama**.

## Catatan teknis

- Semua alamat file relatif, jadi aman di sub-folder GitHub Pages.
- Nama cache service worker berubah tiap isi berubah; pembaruan terpasang pada pembukaan berikutnya setelah halaman dimuat ulang.
- `ui/vendor/tailwind.js` masih dipakai hanya untuk reset gaya dasar; rencananya diganti CSS hasil build.
