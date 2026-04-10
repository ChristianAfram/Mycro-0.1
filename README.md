# Mycro

<p align="center">
  <img src="resources/app/src/renderer/src/assets/logo.png" alt="Mycro Logo" width="200"/>
</p>

<p align="center">
  <strong>AI Assistant Desktop Application</strong>
</p>

<p align="center">
  Version 0.2
</p>

---

## Overview
BETA VERSION - STILL UNDER DEVELOPMENT !!
Mycro is a desktop AI assistant application that provides intelligent conversation, context management, and various AI-powered features.

## Features

- AI-powered conversations using Ollama
- Voice input support with Whisper
- System tray integration
- Hotkey support
- Context-aware responses
- MCP (Model Context Protocol) support

## Theme System

Mycro features a customizable theme system with base themes and accent colors:

### Base Themes

| Theme | Description |
|-------|-------------|
| **Dark Mode** | Deep dark background with purple accents (default) |
| **Light Mode** | Clean white/gray interface with vibrant accents |

### Accent Colors

| Color | Hex Code |
|-------|----------|
| **Purple** | `#6D28D9` (default) |
| **Blue** | `#2563EB` |
| **Green** | `#059669` |
| **Orange** | `#D97706` |
| **Red** | `#DC2626` |

### Theme Preview

```
┌─────────────────────────────────────────────────┐
│  ┌─────────┐  ┌─────────────────────────────┐  │
│  │ Profile │  │  Theme Selection             │  │
│  │─────────│  │                             │  │
│  │Preferences│  │  ┌─────────┐ ┌─────────┐  │  │
│  │─────────│  │  │  Dark   │ │  Light  │  │  │
│  │  Apps   │  │  │ (active)│ │         │  │  │
│  │─────────│  │  └─────────┘ └─────────┘  │  │
│  │Notific..│  │                             │  │
│  │         │  │  Accent: ○ Purple ○ Blue   │  │
│  └─────────┘  │          ○ Green ○ Orange  │  │
│               │          ○ Red             │  │
│               └─────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Electron + Node.js
- **AI**: Ollama + Whisper

## Getting Started

```bash
# Install dependencies
cd resources/app
npm install

# Run development mode
npm run dev

# Build
npm run build
```

## License

See LICENSE file for details.
