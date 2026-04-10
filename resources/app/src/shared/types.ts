export type AppState = 
  | 'idle' 
  | 'recording' 
  | 'transcribing' 
  | 'rewriting' 
  | 'injecting' 
  | 'success' 
  | 'error';

export type PersonaMode = 'auto' | 'formal' | 'code' | 'translation' | 'raw' | 'prompt-engineer';

export type ThemeMode = 'light' | 'dark';
export type AccentColor = 'purple' | 'blue' | 'green' | 'orange' | 'red';

// Skill types
export interface Skill {
  id: string;
  name: string;
  description: string;
  promptTemplate: string;
  icon?: string;
  isUser?: boolean;
  createdAt?: number;
}

// History types
export interface HistoryItem {
  id: string;
  rawText: string;
  refinedText: string;
  timestamp: number;
  persona: PersonaMode;
  skillId?: string;
  skillName?: string;
}

// MCP/Integration types
export interface McpConfig {
  id: string;
  name: string;
  platform: 'obsidian' | 'notion' | 'logseq' | 'custom';
  enabled: boolean;
  config: Record<string, any>;
}

export interface ObsidianConfig {
  vaultPath: string;
  defaultFolder: string;
  dateFormat: string;
}

// Command types
export interface CommandDefinition {
  id: string;
  trigger: string;
  description: string;
  action: 'paste' | 'open_url' | 'run_macro' | 'custom';
  payload: string;
  enabled: boolean;
}

// Model customization types
export interface ModelCustomization {
  modelId: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  stopSequences: string[];
}

export interface AppSettings {
  hotkey: string;
  model: string;
  autoPaste: boolean;
  minimizeToTray: boolean;
  launchOnStartup: boolean;
  activePersona: PersonaMode;
  theme: ThemeMode;
  accent: AccentColor;
  // Model customization
  modelCustomizations: Record<string, ModelCustomization>;
  systemPrompt: string;
  // Skills
  enabledSkills: string[];
  // MCP/Integrations
  mcpConfigs: McpConfig[];
  // Commands
  customCommands: CommandDefinition[];
  // History
  historyEnabled: boolean;
  historyMaxItems: number;
}

export interface AudioMetadata {
  path: string;
  duration: number;
  sampleRate: number;
  format: string;
}

export interface TranscriptionResult {
  text: string;
  confidence?: number;
}

export interface ProcessAudioResult {
  text: string;
  success: boolean;
  error?: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  hotkey: 'Alt+Space',
  model: 'mistral',
  autoPaste: true,
  minimizeToTray: true,
  launchOnStartup: false,
  activePersona: 'auto',
  theme: 'dark',
  accent: 'purple',
  modelCustomizations: {},
  systemPrompt: 'You are a helpful writing assistant. Refine the following transcribed text for clarity, grammar, and flow while preserving the original intent and voice.',
  enabledSkills: [],
  mcpConfigs: [],
  customCommands: [],
  historyEnabled: true,
  historyMaxItems: 100,
};

export interface IpcApi {
  getSettings: () => Promise<AppSettings>;
  setSettings: (settings: Partial<AppSettings>) => Promise<void>;
  getState: () => Promise<AppState>;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  toggleRecording: () => Promise<void>;
  openSettings: () => Promise<void>;
  hideWindow: () => Promise<void>;
  showWindow: () => Promise<void>;
  getHealth: () => Promise<{ healthy: boolean; message: string; details?: unknown }>;
  getOllamaModels: () => Promise<string[]>;
  onStateChange: (callback: (state: AppState) => void) => void;
  onHotkeyPressed: (callback: () => void) => void;
  processAudio: (audioPath: string) => Promise<ProcessAudioResult>;
  setHotkey: (hotkey: string) => Promise<boolean>;
  onSettingsChange: (callback: (settings: AppSettings) => void) => void;
  // Skills
  getSkills: () => Promise<Skill[]>;
  uploadSkill: (skill: Omit<Skill, 'id' | 'isUser'>) => Promise<Skill>;
  deleteSkill: (id: string) => Promise<void>;
  // History
  getHistory: () => Promise<HistoryItem[]>;
  deleteHistoryItem: (id: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  // MCP
  getMcpConfigs: () => Promise<McpConfig[]>;
  addMcpConfig: (config: McpConfig) => Promise<void>;
  updateMcpConfig: (id: string, config: Partial<McpConfig>) => Promise<void>;
  deleteMcpConfig: (id: string) => Promise<void>;
  testMcpConnection: (id: string) => Promise<{ success: boolean; message: string }>;
  // Commands
  getCommands: () => Promise<CommandDefinition[]>;
  addCommand: (command: CommandDefinition) => Promise<void>;
  updateCommand: (id: string, command: Partial<CommandDefinition>) => Promise<void>;
  deleteCommand: (id: string) => Promise<void>;
  // Model customization
  getModelCustomization: (modelId: string) => Promise<ModelCustomization | null>;
  setModelCustomization: (customization: ModelCustomization) => Promise<void>;
}

declare global {
  interface Window {
    api: IpcApi;
  }
}