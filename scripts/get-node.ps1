# Mengunduh Node.js portable (tanpa admin, tanpa instalasi) ke folder runtime\node
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}
$root = Split-Path -Parent $PSScriptRoot
$dest = Join-Path $root 'runtime\node'
$major = '22'
$a = $env:PROCESSOR_ARCHITEW6432; if (-not $a) { $a = $env:PROCESSOR_ARCHITECTURE }
switch ($a) { 'AMD64' { $arch = 'x64' } 'ARM64' { $arch = 'arm64' } default { $arch = 'x86' } }
try {
  $sums = (Invoke-WebRequest -UseBasicParsing "https://nodejs.org/dist/latest-v$major.x/SHASUMS256.txt").Content
  $m = [regex]::Match($sums, "node-v(\d+\.\d+\.\d+)-win-$arch\.zip")
  if (-not $m.Success) { throw 'versi tidak ditemukan' }
  $ver = $m.Groups[1].Value
} catch { $ver = '22.12.0' }
$name = "node-v$ver-win-$arch"
$zip = Join-Path $env:TEMP "$name.zip"
$tmp = Join-Path $env:TEMP "rendzz-node-$([guid]::NewGuid().ToString('N'))"
try {
  Write-Host "[Rendzz] Mengunduh Node.js v$ver ($arch), +/- 30 MB ..."
  Invoke-WebRequest -UseBasicParsing "https://nodejs.org/dist/v$ver/$name.zip" -OutFile $zip
  Write-Host '[Rendzz] Mengekstrak ...'
  Expand-Archive -LiteralPath $zip -DestinationPath $tmp -Force
  if (Test-Path $dest) { Remove-Item $dest -Recurse -Force }
  New-Item -ItemType Directory -Force -Path (Split-Path $dest) | Out-Null
  Move-Item -LiteralPath (Join-Path $tmp $name) -Destination $dest
  if (-not (Test-Path (Join-Path $dest 'node.exe'))) { throw 'node.exe tidak ditemukan setelah ekstrak' }
  Write-Host '[Rendzz] Node.js portable siap.'
  exit 0
} catch {
  Write-Host "[Rendzz] Gagal menyiapkan Node.js: $($_.Exception.Message)"
  exit 1
} finally {
  Remove-Item $zip -Force -ErrorAction SilentlyContinue
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
