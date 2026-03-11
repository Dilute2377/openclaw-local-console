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

:menu
cls
echo Notion MCP Check
echo.
echo [1] Run check
echo [2] Login Notion MCP
echo [0] Exit
echo.
set /p CHOICE=Choose action: 

if "%CHOICE%"=="1" goto check
if "%CHOICE%"=="2" goto login
if "%CHOICE%"=="0" goto end

echo.
echo [ERROR] Invalid option.
pause
goto menu

:check
python notion_mcp_check.py
pause
goto menu

:login
codex mcp login notion
pause
goto menu

:end
exit /b 0
