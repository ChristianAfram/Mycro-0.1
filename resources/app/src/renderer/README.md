# Mycro Frontend

This is the frontend renderer for Mycro, a lightweight floating dictation assistant for Windows with a deep purple aesthetic.

## Architecture

The frontend is built with:

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling with custom purple theme
- **React Context** for state management
- **Electron IPC** for communication with the backend

### File Structure

```
src/
├── components/         # Reusable UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── ToggleSwitch.tsx
│   ├── SettingsSection.tsx
│   ├── FloatingWindow.tsx
│   ├── StatusIndicator.tsx
│   ├── MicVisualizer.tsx
│   └── TranscriptPreview.tsx
├── features/           # Feature-specific modules
│   ├── floating/       # Floating window logic
│   └── settings/       # Settings page and logic
├── hooks/              # Custom React hooks
│   ├── useAppState.ts
│   └── useSettings.ts
├── context/            # React Context providers
│   ├── AppStateContext.tsx
│   └── SettingsContext.tsx
├── store/              # State management (if needed beyond context)
├── types/              # TypeScript type definitions
│   └── index.ts
├── styles/             # CSS and styling files
│   └── index.css
├── App.tsx             # Main application component
├── main.tsx            # Entry point
├── index.html          # HTML template
├── tailwind.config.ts  # Tailwind configuration
└── postcss.config.js   # PostCSS configuration
```

## State Management

The application uses React Context for state management:

1. **AppStateContext** - Manages the current state of the application (idle, listening, transcribing, etc.)
2. **SettingsContext** - Manages user settings and Ollama model selection

## IPC Communication

The frontend communicates with the Electron backend through IPC (Inter-Process Communication). The expected IPC interface is defined in `types/index.ts`:

### Methods
- `getSettings()` - Retrieve user settings
- `saveSettings(settings)` - Save user settings
- `getOllamaModels()` - Get available Ollama models
- `startRecording()` - Start audio recording
- `stopRecording()` - Stop audio recording
- `setHotkey(hotkey)` - Set global recording hotkey
- `openSettings()` - Open settings window
- `hideWindow()` - Hide the main window
- `getState()` - Get current application state

### Events
- `onAppStateChanged(callback)` - Listen for state changes
- `onHealthChanged(callback)` - Listen for health status changes

## Theme

Mycro features a deep purple theme with the following colors:

- Background: `#0F0B14` (dark charcoal with purple tint)
- Panel: `#171122` (slightly lighter background)
- Primary: `#6D28D9` (rich purple)
- Primary Active: `#8B5CF6` (bright purple for active states)
- Highlight: `#A78BFA` (soft purple highlight)
- Light Text: `#E9D5FF` (subtle text accents)

The theme uses glassmorphism effects, subtle shadows, and smooth animations.

## Development

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. For production build:
   ```bash
   npm run build
   ```

## Production

When built for production, the frontend will be packaged with Electron using the configuration in the root directory.

## Features Implemented

1. **Floating Window UI** - Compact, draggable window with purple theme
2. **State Indicators** - Visual feedback for idle, listening, transcribing, rewriting, injecting, success, and error states
3. **Mic Visualizer** - Animated waveform during recording
4. **Transcript Preview** - Shows last transcription when available
5. **Settings Page** - Full settings interface with:
   - Global hotkey configuration
   - Ollama model selection with refresh capability
   - Auto-launch and start minimized toggles
   - Transcription language selection
   - Automatic paste toggle
6. **Responsive Design** - Optimized for small floating window sizes
7. **Accessibility** - Keyboard navigable, good contrast, screen reader friendly
8. **Windows-native Feel** - Proper titlebar handling, tray-friendly behavior

## Next Steps

To complete the application, the backend needs to implement the IPC interface defined in `types/index.ts` and connect it to the actual audio processing, Whisper transcription, and Ollama rewriting logic.