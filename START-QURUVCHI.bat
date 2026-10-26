@echo off
title Quruvchi AI Builder
cd /d "%~dp0"
echo ========================================
echo          QURUVCHI AI BUILDER
echo ========================================
echo.
where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js topilmadi. Node.js 22.13 yoki yangirog'ini o'rnating: https://nodejs.org/
  pause
  exit /b 1
)
node -e "const v=process.versions.node.split('.').map(Number); if(v[0]<22 || (v[0]===22 && v[1]<13)){console.error('ERROR: Node.js 22.13+ kerak. Hozirgi versiya: '+process.versions.node);process.exit(1)}"
if errorlevel 1 (
  pause
  exit /b 1
)
echo Server ishga tushirilmoqda...
start "Quruvchi server" /D "%~dp0" cmd /k "npm start"
timeout /t 3 /nobreak >nul
start "" "http://localhost:3000"
echo.
echo Sayt: http://localhost:3000
echo Server ishlashi uchun ochilgan qora oynani yopmang.
echo AI funksiyasi uchun .env ichiga ANTHROPIC_API_KEY kiritish kerak.
pause
