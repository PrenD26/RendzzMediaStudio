@echo off
setlocal EnableExtensions
title Rendzz Media Studio
cd /d "%~dp0"
if not exist "package.json" goto :notextracted
call :checknode
if "%NODE_OK%"=="1" goto :run
if exist "%~dp0runtime\node\node.exe" set "PATH=%~dp0runtime\node;%PATH%"
call :checknode
if "%NODE_OK%"=="1" goto :run
echo [Rendzz] Node.js belum ada / versi terlalu lama (butuh 18.17 atau lebih baru).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\get-node.ps1"
if errorlevel 1 goto :nodefail
set "PATH=%~dp0runtime\node;%PATH%"
call :checknode
if not "%NODE_OK%"=="1" goto :nodefail
:run
node start.js
if errorlevel 1 goto :fail
goto :end

:checknode
set "NODE_OK=0"
where node >nul 2>nul
if errorlevel 1 exit /b 0
node scripts\checknode.js >nul 2>nul
if not errorlevel 1 set "NODE_OK=1"
exit /b 0

:notextracted
echo [Rendzz] File aplikasi tidak lengkap. Ekstrak SELURUH isi ZIP ke folder biasa
echo          (bukan langsung dari dalam ZIP), lalu jalankan start.bat dari folder itu.
goto :fail

:nodefail
echo.
echo [Rendzz] Gagal menyiapkan Node.js otomatis (cek koneksi internet / antivirus).
echo          Pasang manual Node.js LTS dari https://nodejs.org lalu jalankan start.bat lagi.

:fail
echo.
echo [Rendzz] Aplikasi berhenti dengan error. Detail ada di diagnostik.txt (jika ada).
pause
exit /b 1

:end
pause
