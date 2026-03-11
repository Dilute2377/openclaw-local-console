@echo off
setlocal
chcp 65001 >nul

cd /d "%~dp0"

echo OpenClaw Local Console Setup
echo.

where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Python was not found in PATH.
  echo Please install Python first, then run this script again.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [WARN] Node.js was not found in PATH.
  echo The console can still open, but OpenClaw-related features may not work until Node.js is installed.
  echo.
)

python scripts\encoding_guard.py
if errorlevel 1 (
  echo.
  echo [ERROR] Encoding guard failed. Fix text or line-ending issues before starting the console.
  pause
  exit /b 1
)

echo [INFO] If your network needs a proxy for GitHub or model APIs, configure your own local proxy first.
echo [INFO] This repository does not include any personal proxy values.
echo.
echo [INFO] Starting the local console...
echo.

call run_console.bat
exit /b %ERRORLEVEL%

