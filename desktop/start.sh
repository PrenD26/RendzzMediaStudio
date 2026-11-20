#!/usr/bin/env bash
# Rendzz Media Studio - launcher universal (Linux / macOS)
cd "$(dirname "$0")" || exit 1
ok() { command -v node >/dev/null 2>&1 && node scripts/checknode.js >/dev/null 2>&1; }
fail() { echo; echo "[Rendzz] $1"; echo "[Rendzz] Alternatif: pasang Node.js LTS dari https://nodejs.org lalu jalankan ulang."; exit 1; }
if ! ok; then
  [ -x runtime/node/bin/node ] && export PATH="$PWD/runtime/node/bin:$PATH"
fi
if ! ok; then
  echo "[Rendzz] Node.js belum ada / versi terlalu lama (butuh >= 18.17)."
  bash scripts/get-node.sh || fail "Gagal menyiapkan Node.js (cek koneksi internet)."
  export PATH="$PWD/runtime/node/bin:$PATH"
  ok || fail "Node.js portable tidak bisa dijalankan di sistem ini."
fi
node start.js || { echo; echo "[Rendzz] Aplikasi berhenti dengan error. Lihat diagnostik.txt"; exit 1; }
