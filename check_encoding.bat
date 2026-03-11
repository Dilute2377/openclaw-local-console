@echo off
setlocal
chcp 65001 >nul

cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Python was not found in PATH.
  pause
  exit /b 1
)

python scripts\encoding_guard.py
set "EXITCODE=%ERRORLEVEL%"
if not "%EXITCODE%"=="0" (
  echo.
  echo [ERROR] Encoding guard failed.
  pause
)
exit /b %EXITCODE%
