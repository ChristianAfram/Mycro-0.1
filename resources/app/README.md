# Mycro

A lightweight, local-only dictation assistant for Windows. Mycro uses local AI (Whisper for transcription and Ollama for rewriting) to cleanly dictated text and inject it into the active window.

## Stack
- **Electron**: Desktop window management, hotkeys, and system tray
- **React + Vite**: Sleek overlay UI with TailwindCSS
- **TypeScript**: Typed, robust IPC boundary
- **Whisper (via faster-whisper)**: Local speech-to-text
- **Ollama**: Local rewriting and text formatting

## Project Structure
- `src/main/`: Electron main process logic (tray, windows, recording, IPC, injection)
- `src/renderer/`: React frontend UI, bundled via Vite
- `src/preload/`: Secure, typed ContextBridge exposure
- `src/shared/`: Shared TypeScript data contracts
- `src/ai/`: Whisper and Ollama TS integration pipeline
- `scripts/`: Bootstrapping for Python Whisper dependencies

## Prerequisites
1. **Ollama**: Install from ollama.ai, start the local server, and pull models (e.g. `ollama run llama3.2`).
2. **Python 3.8+**: Essential for running local faster-whisper.

## Setup Instructions

```bash
# 1. Install Node dependencies
npm install
│   ├── state/     # State machine
│   ├── tray/      # System tray
│   └── windows/   # Window management
├── ai/               # Local AI pipeline
│   ├── types.ts    # Type definitions
│   ├── whisper/   # Whisper transcription
│   ├── ollama/    # Ollama text refinement
│   ├── pipeline/  # Pipeline orchestration
│   └── prompts/   # System prompts
├── preload/         # Context bridge
├── renderer/        # UI HTML
└── shared/         # Shared types
```

## Features

- **System Tray**: Runs in background, accessible from tray icon
- **Global Hotkey**: Toggle recording from anywhere (default: Alt+Space)
- **Microphone Recording**: Captures audio for local AI processing
- **Auto-Paste**: Inserts transcribed text into focused app
- **Settings**: Configurable hotkey, auto-paste, model selection

## AI Pipeline

Mycro uses a local AI pipeline that processes audio in two stages:

1. **Transcription** (Whisper): Converts audio to text using faster-whisper
2. **Refinement** (Ollama): Polishes the transcript with grammar correction and professional formatting

### Configuration

The default model is `llama3.2`. You can change it in settings. Available models are detected from your local Ollama installation.

### Health Checks

The app checks AI availability on startup:
- Whisper: Requires Python + faster-whisper
- Ollama: Requires Ollama service running on localhost:11434

### Fallback Behavior

If Ollama is unavailable, the app will return the raw transcript (without refinement). If Whisper fails, an error is shown.

## Windows Notes

- Requires FFmpeg for audio capture (install via `winget install FFmpeg` or download from ffmpeg.org)
- Uses Windows Audio API (DS) for microphone capture
- Global hotkey may conflict with other apps - change in settings