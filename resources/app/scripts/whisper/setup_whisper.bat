@echo off
REM Mycro Whisper Setup Script
REM This script sets up Whisper for local transcription

echo ========================================
echo Mycro Whisper Setup
echo ========================================

echo.
echo Checking for Python...

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python not found. Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)

echo Python found!

echo.
echo Installing Whisper dependencies...

python -m pip install --quiet faster-whisper numpy

if %errorlevel% neq 0 (
    echo Failed to install faster-whisper
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup complete!
echo ========================================
echo.
echo Whisper is now ready for use with Mycro.
echo The app will automatically download the 
echo base model on first use.
echo.
pause