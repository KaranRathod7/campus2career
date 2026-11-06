@echo off
title Campus2Career Engineering Competence Platform
echo ===============================================================
echo Starting Campus2Career Platform (Local Server Mode)...
echo ===============================================================
echo.

where node >nul 2>&1
if not errorlevel 1 (
    echo Starting Campus2Career Enterprise Unified Node.js Server...
    node server.js
    if not errorlevel 1 (
        pause
        exit /b
    )
)

echo Checking Python environment...
python --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Node.js and Python are not in PATH.
    echo Opening index.html directly in browser...
    start index.html
    pause
    exit /b
)

echo Starting local web server to ensure 100%% playable video streams...
python server.py
if errorlevel 1 (
    echo [NOTICE] Opening index.html directly...
    start index.html
)
pause
