@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
where bun >nul 2>nul
if errorlevel 1 (
  echo Install Bun first, then open a new terminal.
  pause
  exit /b 1
)
call bun install --frozen-lockfile
if errorlevel 1 (
  pause
  exit /b 1
)
set /p "WA_CODEX_PHONE=WhatsApp number with country code, digits only: "
node scripts\codex-whatsapp.mjs --setup
pause
