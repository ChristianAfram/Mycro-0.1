import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import logoImage from './assets/logo.png';
import SettingsWindow from './pages/Settings/SettingsWindow';
import { Settings } from 'lucide-react';

type AppState = 'idle' | 'recording' | 'transcribing' | 'rewriting' | 'injecting' | 'success' | 'error';

function App() {
  const [state, setState] = useState<AppState>('idle');
  const [settings, setSettings] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  useEffect(() => {
    if (!window.api) return;

    // Listen for state changes (recording, transcribing, etc.)
    window.api.onStateChange((newState: AppState) => setState(newState));
    window.api.getState().then((s: AppState) => setState(s)).catch(() => {});

    // Listen for theme/accent settings changes
    window.api.onSettingsChange((newSettings: any) => {
      setSettings(newSettings);
      applyThemes(newSettings);
    });

    // Listen for window state notifications from main process
    if (window.api.onOpenSettings) {
      window.api.onOpenSettings(() => {
        setShowSettings(true);
      });
    }

    if (window.api.onShowPill) {
      window.api.onShowPill(() => {
        setShowSettings(false);
      });
    }

    // Initial load
    window.api.getSettings().then((s: any) => {
      setSettings(s);
      applyThemes(s);
    }).catch(() => {});
  }, []);

  // Audio analysis setup
  useEffect(() => {
    let audioContext: AudioContext | null = null;
    let stream: MediaStream | null = null;

    if (state === 'recording') {
      const initAudio = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const source = audioContext.createMediaStreamSource(stream);
          const analyserNode = audioContext.createAnalyser();
          analyserNode.fftSize = 64; 
          analyserNode.smoothingTimeConstant = 0.8;
          source.connect(analyserNode);
          setAnalyser(analyserNode);
        } catch (err) {
          console.error('Failed to initialize audio analysis:', err);
        }
      };
      initAudio();
    } else {
      setAnalyser(null);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (audioContext) {
        audioContext.close();
      }
    };
  }, [state]);

  const applyThemes = (s: any) => {
    if (!s) return;
    document.body.dataset.theme = s.theme || 'dark';
    document.body.dataset.accent = s.accent || 'purple';
  };

  const handleOpenSettings = async () => {
    if (window.api) {
      await window.api.openSettings();
    }
    setShowSettings(true);
  };

  const isRecording = state === 'recording';
  const isBusy = ['transcribing', 'rewriting', 'injecting'].includes(state);

  if (showSettings) {
    return <SettingsWindow />;
  }

  return (
    <div className="pill-root">
      <div className={`pill-container ${state === 'success' ? 'success' : state === 'error' ? 'error' : ''}`}>
        {/* Left Circle Icon */}
        <div className={`pill-icon ${isRecording || isBusy ? 'active' : ''}`}>
          <img src={logoImage} alt="Mycro" className="logo-img" />
        </div>

        {/* Right Waveform */}
        <div className="pill-waveform">
          <Waveform active={isRecording} isBusy={isBusy} analyser={analyser} />
        </div>
      </div>

      {/* Settings Button */}
      <button className="settings-trigger" onClick={handleOpenSettings} title="Settings">
        <Settings size={18} />
      </button>
    </div>
  );
}

function Waveform({ active, isBusy, analyser }: { active: boolean, isBusy: boolean, analyser: AnalyserNode | null }) {
  const barsRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const NUM_BARS = 10;

  useEffect(() => {
    const el = barsRef.current;
    if (!el) return;

    if (active && analyser) {
      // --- Real-Time Audio Reaction ---
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      dataArrayRef.current = dataArray;

      const animate = () => {
        if (!active || !analyser) return;
        
        analyser.getByteFrequencyData(dataArray);
        const children = el.children as HTMLCollectionOf<HTMLElement>;
        
        // Map FFT bins to 18 bars (using lower frequencies for voice)
        for (let i = 0; i < NUM_BARS; i++) {
          const binIndex = Math.floor(i * (dataArray.length / NUM_BARS) * 0.5);
          const value = dataArray[binIndex];
          const percent = (value / 255) * 100;
          
          // Apply a minimum height for baseline jitter and a center weighting
          const center = (NUM_BARS - 1) / 2;
          const distFactor = 1 - Math.abs(i - center) / center;
          const h = Math.max(15, percent * (0.6 + distFactor * 0.4));
          
          children[i].style.height = `${Math.min(100, h)}%`;
        }
        
        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);
    } else if (isBusy) {
      // --- Simulated Processing Animation ---
      let phase = 0;
      const animateBusy = () => {
        phase += 0.2;
        const children = el.children as HTMLCollectionOf<HTMLElement>;
        for (let i = 0; i < children.length; i++) {
          const h = 40 + Math.sin(phase + i * 0.5) * 30;
          children[i].style.height = `${Math.min(100, Math.max(10, h))}%`;
        }
        animationRef.current = requestAnimationFrame(animateBusy);
      };
      animationRef.current = requestAnimationFrame(animateBusy);
    } else {
      // --- Idle State ---
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      const children = el.children as HTMLCollectionOf<HTMLElement>;
      for (let i = 0; i < children.length; i++) {
        children[i].style.height = '15%';
      }
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [active, isBusy, analyser]);

  return (
    <div className={`waveform-container ${active || isBusy ? 'active' : ''}`} ref={barsRef}>
      {Array.from({ length: NUM_BARS }).map((_, i) => (
        <div key={i} className="wave-bar" />
      ))}
    </div>
  );
}

export default App;