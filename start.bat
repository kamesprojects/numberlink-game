@echo off
title NumberLink Game
cd /d "%~dp0"

echo ========================================================
echo   NumberLink - Spustanie hry
echo ========================================================

:: Skusime spustit cez Python ak existuje
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Spustam lokalny server cez Python...
    python server.py
    goto end
)

:: Skusime cez Node.js ak existuje
node -v >nul 2>&1
if %errorlevel% equ 0 (
    echo Spustam priamo cez predvoleny prehliadac...
    start index.html
    goto end
)

:: Fallback: priame otvorenie index.html v prehliadaci
echo Otvaram hru v predvolenom prehliadaci...
start index.html

:end
