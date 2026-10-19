@echo off
title Campus2Career Engineering Competence Platform
echo ===============================================================
echo Starting Campus2Career Platform (Local Server Mode)...
echo ===============================================================
echo.
echo Checking Python environment...
python --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Python is not installed or not in PATH.
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
