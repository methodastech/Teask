@echo off
title Teask Website - Dev Server
cd /d "%~dp0"

echo ============================================
echo   Starting the Teask website...
echo   Your browser will open automatically.
echo   Keep THIS window open while you work.
echo   Close it (or press Ctrl+C) to stop.
echo ============================================
echo.

REM Install packages the first time if they are missing
if not exist "node_modules" (
  echo First run - installing packages, please wait...
  call npm install
)

REM Start Vite and open the browser at the right URL once it is ready
call npm run dev -- --open

echo.
echo Server stopped. You can close this window.
pause
