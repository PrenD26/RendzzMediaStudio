# Rendzz Media Studio

Kompres dan edit **foto, video, dan musik** langsung di perangkatmu. Tidak ada file yang diunggah ke internet.

**Versi saat ini: 3.6**

## Fitur

| Tab | Isi |
| --- | --- |
| Foto | Kompres (JPG/WebP/AVIF/PNG), ubah ukuran, crop, hapus background (AI, pipet warna, kuas manual) |
| Video | Potong dengan garis waktu bergambar (thumbnail), kompres H.264/H.265, ukuran target (MB), resolusi, suara |
| Musik | Potong, volume, fade in/out, mono, MP3/M4A/OGG dengan perkiraan ukuran |
| Batch | Satu pengaturan untuk banyak foto, unduh sebagai ZIP |

Tampilan sudah responsif: di HP menu pindah ke bawah dan tombol aksi menempel di bawah layar.

## Menjalankan versi desktop

- **Windows:** klik dua kali `start.bat`
- **Linux / Mac:** jalankan `./start.sh`

Node.js, library, dan model AI dipasang otomatis pada run pertama (butuh internet). Setelah itu aplikasi berjalan offline.
Detail dan pemecahan masalah: [desktop/PANDUAN.txt](desktop/PANDUAN.txt).

## Struktur

```
ui/        tampilan bersama (index.html, editor.js, editor.css, engine.js)
desktop/   server lokal + peluncur (sharp & ffmpeg untuk foto/video/musik)
web/       versi browser/PWA untuk Android, iPhone, PC (dalam rencana)
docs/      catatan proyek (antarmuka Engine, langkah GitHub)
```

`ui/` tidak memanggil server secara langsung, hanya lewat objek `Engine` ([docs/ENGINE.md](docs/ENGINE.md)).
Desktop memakai `ui/engine.js`; versi web nanti menyediakan `Engine` sendiri dengan antarmuka yang sama.

## Roadmap

1. ~~Naik ke GitHub~~
2. ~~Pisah `ui/` `desktop/` `web/`, lapisan Engine, tampilan HP~~ (v3.6)
3. Versi web/PWA (Foto, lalu Musik, Video, hapus background), hosting GitHub Pages
4. Putuskan distribusi PC: `Rendzz.bat` satu file atau `.exe`
5. Fitur lanjutan: batch video, ekstrak audio, GIF

Catatan teknis: `ui/vendor/tailwind.js` saat ini hanya dipakai untuk reset gaya dasar (tidak ada class utilitas Tailwind yang dipakai di tampilan).
Di Tahap 3 sebaiknya diganti CSS hasil build agar versi web ringan dan bisa offline.

## Lisensi

[MIT](LICENSE). Dependensi memiliki lisensinya masing-masing (mis. `ffmpeg-static`, `sharp`, `@imgly/background-removal-node`);
semuanya dipasang lewat npm saat run pertama dan tidak disalin ke repositori ini.
