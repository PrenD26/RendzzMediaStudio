# Langkah naik ke GitHub

## A. Lewat browser (paling mudah, tanpa install apa pun)
1. Buat akun di https://github.com lalu klik **New repository**.
2. Nama: `rendzz-media-studio`. Pilih **Public** (atau Private). Jangan centang "Add a README" karena sudah ada.
3. Klik **Create repository**.
4. Di halaman repo klik **uploading an existing file**.
5. Ekstrak zip di komputer, lalu **seret semua isi folder** (bukan folder induknya) ke kotak unggah.
   - Folder tersembunyi/berawalan titik (`.gitignore`, `.gitattributes`) kadang tidak ikut terseret. Kalau tidak muncul, tambahkan manual lewat **Add file > Create new file**, atau pakai cara B.
6. Tulis pesan: `Rendzz Media Studio v3.6`, lalu **Commit changes**.

## B. Lewat Git (disarankan, semua file ikut dengan benar)
1. Pasang Git: https://git-scm.com/downloads
2. Buat repo kosong di GitHub (langkah A1-A3).
3. Di folder hasil ekstrak, buka terminal / Git Bash, lalu:

```
git init
git add .
git commit -m "Rendzz Media Studio v3.6"
git branch -M main
git remote add origin https://github.com/NAMAKAMU/rendzz-media-studio.git
git push -u origin main
```

Ganti `NAMAKAMU` dengan username GitHub-mu. Saat diminta login, pakai akun GitHub (atau Personal Access Token).

## C. Menandai rilis
```
git tag v3.6
git push origin v3.6
```
Lalu di GitHub: **Releases > Draft a new release**, pilih tag `v3.6`.

## D. Update berikutnya
Timpa file di folder dengan versi baru, lalu:
```
git add .
git commit -m "v3.6: <ringkasan>"
git push
```

## Cek sebelum Public
- Pastikan tidak ada `node_modules/` atau `runtime/` ikut terunggah (sudah di `.gitignore`).
- Tentukan lisensi (tambahkan file `LICENSE`).
