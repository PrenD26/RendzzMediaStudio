# Antarmuka Engine

`ui/index.html` dan `ui/editor.js` tidak memanggil server secara langsung. Semua pemrosesan lewat objek global `Engine`.
Desktop memakai `ui/engine.js` (bicara dengan server lokal). Versi web nanti memakai `web/engine-web.js` dengan antarmuka yang sama.

`q` selalu berupa `URLSearchParams` (sama dengan query yang dipakai server).

| Method | Masukan | Hasil |
| --- | --- | --- |
| `Engine.name` | | `'server'` atau `'web'` |
| `Engine.caps()` | | `Promise<{ video?: boolean, h265?: boolean }>` |
| `Engine.image(file, q)` | foto, parameter kompres/ukuran/format | `Promise<Blob>` |
| `Engine.cutout(file, q)` | foto, parameter hapus background | `Promise<Blob>` (PNG) |
| `Engine.audio(file, q)` | audio, `start`, `dur`, `fmt`, `br`, `vol`, `fi`, `fo`, `mono` | `Promise<Blob>` |
| `Engine.video(file, q, { signal, onProgress })` | video; `start`, `dur`, `cmp`, `prec`, `crf`, `res`, `aud`, `codec`, `spd`, `mode`, `mb` | `Promise<{ blob: Blob, note?: string }>`; `onProgress(persen, catatan)` |
| `Engine.cancelVideo()` | | membatalkan proses video yang berjalan |

Kesalahan dilempar sebagai `Error` dengan pesan yang siap ditampilkan ke pengguna. Pembatalan melempar `AbortError`.
