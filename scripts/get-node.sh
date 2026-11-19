#!/usr/bin/env bash
# Mengunduh Node.js portable (tanpa root) ke runtime/node
set -e
cd "$(dirname "$0")/.."
case "$(uname -s)" in Linux) os=linux;; Darwin) os=darwin;; *) echo "[Rendzz] OS tidak didukung: $(uname -s)"; exit 1;; esac
case "$(uname -m)" in x86_64|amd64) arch=x64;; aarch64|arm64) arch=arm64;; armv7l) arch=armv7l;; *) echo "[Rendzz] CPU tidak didukung: $(uname -m)"; exit 1;; esac
get() { if command -v curl >/dev/null 2>&1; then curl -fsSL "$1" ${2:+-o "$2"}; else wget -q -O "${2:--}" "$1"; fi; }
ver=$(get "https://nodejs.org/dist/latest-v22.x/SHASUMS256.txt" 2>/dev/null | grep -o "node-v[0-9.]*-$os-$arch.tar.gz" | head -1 | sed -E 's/node-v([0-9.]+)-.*/\1/') || true
ver=${ver:-22.12.0}; name="node-v$ver-$os-$arch"
echo "[Rendzz] Mengunduh Node.js v$ver ($os-$arch) ..."
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
get "https://nodejs.org/dist/v$ver/$name.tar.gz" "$tmp/n.tgz"
tar -xzf "$tmp/n.tgz" -C "$tmp"
rm -rf runtime/node; mkdir -p runtime; mv "$tmp/$name" runtime/node
echo "[Rendzz] Node.js portable siap."
