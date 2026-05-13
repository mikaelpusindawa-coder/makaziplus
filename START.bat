@echo off
title MakaziPlus Dev Launcher
color 0A
echo.
echo  ========================================
echo    MakaziPlus - Starting Dev Servers
echo  ========================================
echo.
echo  Cleaning up any old processes...

:: Kill any leftover node processes that might block ports
taskkill /F /IM node.exe >nul 2>&1

echo  Starting Backend  ... http://localhost:5000
echo  Starting Frontend ... http://localhost:3000
echo.

:: Start backend in its own window
start "MakaziPlus - Backend (port 5000)" cmd /k "cd /d "%~dp0server" && npm run dev"

:: Give backend 5 seconds to init before React starts
timeout /t 5 /nobreak >nul

:: Start React frontend in its own window
start "MakaziPlus - Frontend (port 3000)" cmd /k "cd /d "%~dp0client" && npm start"

echo.
echo  Two windows are opening - keep both open while developing.
echo.
echo  Backend:  http://localhost:5000/health
echo  Frontend: http://localhost:3000
echo.
pause
