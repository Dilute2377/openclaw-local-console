@echo off
setlocal
chcp 65001 >nul

cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Python was not found in PATH.
  echo Please install Python and make sure "python" works in this terminal.
  pause
  exit /b 1
)

python scripts\encoding_guard.py
if errorlevel 1 (
  echo.
  echo [ERROR] Encoding guard failed. Fix text or line-ending issues before starting the console.
  pause
  exit /b 1
)

python app.py
set "EXITCODE=%ERRORLEVEL%"
if not "%EXITCODE%"=="0" (
  echo.
  echo [ERROR] The local console exited with code %EXITCODE%.
  pause
)
exit /b %EXITCODE%
