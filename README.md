# Rendzz Media Studio

Kompres dan edit **foto, video, dan musik** langsung di komputermu. Tidak ada file yang diunggah ke internet.

**Versi saat ini: 3.5**

## Fitur

| Tab | Isi |
| --- | --- |
| Foto | Kompres (JPG/WebP/AVIF/PNG), ubah ukuran, crop, hapus background (AI, pipet warna, kuas manual) |
| Video | Potong dengan garis waktu bergambar (thumbnail), kompres H.264/H.265, ukuran target (MB), resolusi, suara |
| Musik | Potong, volume, fade in/out, mono, MP3/M4A/OGG dengan perkiraan ukuran |
| Batch | Satu pengaturan untuk banyak foto, unduh sebagai ZIP |

## Menjalankan

- **Windows:** klik dua kali `start.bat`
- **Linux / Mac:** jalankan `./start.sh`

Node.js, library, dan model AI dipasang otomatis pada run pertama (butuh internet). Setelah itu aplikasi berjalan offline.
Detail dan pemecahan masalah ada di [PANDUAN.txt](PANDUAN.txt).

## Struktur

```
server.js        server lokal (sharp untuk foto, ffmpeg untuk video & musik)
start.js         peluncur: cek Node, pasang library, uji, buka browser
public/          tampilan (index.html, editor.js, editor.css)
scripts/         pembantu untuk start.bat / start.sh
docs/            catatan proyek
```

## Roadmap

1. Naik ke GitHub (dokumen ini)
2. Versi web/PWA yang jalan di browser, termasuk Android (hosting: GitHub Pages)
3. Putuskan distribusi PC: `Rendzz.bat` satu file atau `.exe`
4. Fitur lanjutan: batch video, ekstrak audio, GIF

## Lisensi

Belum ditentukan. Tambahkan file `LICENSE` sebelum repositori dibuat publik.
Perlu dicek juga lisensi dependensi (mis. `ffmpeg-static`, `@imgly/background-removal-node`).
