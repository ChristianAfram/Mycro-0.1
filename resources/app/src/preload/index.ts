import { contextBridge, ipcRenderer } from 'electron';
import { AppSettings, AppState, ProcessAudioResult, Skill, HistoryItem, McpConfig, CommandDefinition, ModelCustomization } from '../shared/types';

const api = {
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('get-settings'),
  setSettings: (settings: Partial<AppSettings>): Promise<void> =>
    ipcRenderer.invoke('set-settings', settings),
  getState: (): Promise<AppState> => ipcRenderer.invoke('get-state'),
  startRecording: (): Promise<void> => ipcRenderer.invoke('start-recording'),
  stopRecording: (): Promise<void> => ipcRenderer.invoke('stop-recording'),
  toggleRecording: (): Promise<void> => ipcRenderer.invoke('toggle-recording'),
  openSettings: (): Promise<void> => ipcRenderer.invoke('open-settings'),
  hideWindow: (): Promise<void> => ipcRenderer.invoke('hide-window'),
  showWindow: (): Promise<void> => ipcRenderer.invoke('show-window'),
  getHealth: (): Promise<{ healthy: boolean; message: string; details?: unknown }> =>
    ipcRenderer.invoke('get-health'),
  getOllamaModels: (): Promise<string[]> =>
    ipcRenderer.invoke('get-ollama-models'),
  onStateChange: (callback: (state: AppState) => void): void => {
    ipcRenderer.on('state-changed', (_, state: AppState) => callback(state));
  },
  onHotkeyPressed: (callback: () => void): void => {
    ipcRenderer.on('hotkey-pressed', () => callback());
  },
  processAudio: (audioPath: string): Promise<ProcessAudioResult> =>
    ipcRenderer.invoke('process-audio', audioPath),
  setHotkey: (hotkey: string): Promise<boolean> =>
    ipcRenderer.invoke('set-hotkey', hotkey),
  onSettingsChange: (callback: (settings: AppSettings) => void): void => {
    ipcRenderer.on('settings-changed', (_, settings: AppSettings) => callback(settings));
  },
  onOpenSettings: (callback: () => void): void => {
    ipcRenderer.on('show-settings-view', () => callback());
  },
  onShowPill: (callback: () => void): void => {
    ipcRenderer.on('show-pill-view', () => callback());
  },
  onWindowFocus: (callback: () => void): void => {
    ipcRenderer.on('window-focused', () => callback());
  },
  onWindowBlur: (callback: () => void): void => {
    ipcRenderer.on('window-blurred', () => callback());
  },
  // Skills
  getSkills: (): Promise<Skill[]> => ipcRenderer.invoke('get-skills'),
  uploadSkill: (skill: Omit<Skill, 'id' | 'isUser'>): Promise<Skill> =>
    ipcRenderer.invoke('upload-skill', skill),
  deleteSkill: (id: string): Promise<void> => ipcRenderer.invoke('delete-skill', id),
  // History
  getHistory: (): Promise<HistoryItem[]> => ipcRenderer.invoke('get-history'),
  deleteHistoryItem: (id: string): Promise<void> => ipcRenderer.invoke('delete-history-item', id),
  clearHistory: (): Promise<void> => ipcRenderer.invoke('clear-history'),
  // MCP
  getMcpConfigs: (): Promise<McpConfig[]> => ipcRenderer.invoke('get-mcp-configs'),
  addMcpConfig: (config: McpConfig): Promise<void> => ipcRenderer.invoke('add-mcp-config', config),
  updateMcpConfig: (id: string, config: Partial<McpConfig>): Promise<void> =>
    ipcRenderer.invoke('update-mcp-config', id, config),
  deleteMcpConfig: (id: string): Promise<void> => ipcRenderer.invoke('delete-mcp-config', id),
  testMcpConnection: (id: string): Promise<{ success: boolean; message: string }> =>
    ipcRenderer.invoke('test-mcp-connection', id),
  // Commands
  getCommands: (): Promise<CommandDefinition[]> => ipcRenderer.invoke('get-commands'),
  addCommand: (command: CommandDefinition): Promise<void> => ipcRenderer.invoke('add-command', command),
  updateCommand: (id: string, command: Partial<CommandDefinition>): Promise<void> =>
    ipcRenderer.invoke('update-command', id, command),
  deleteCommand: (id: string): Promise<void> => ipcRenderer.invoke('delete-command', id),
  // Model customization
  getModelCustomization: (modelId: string): Promise<ModelCustomization | null> =>
    ipcRenderer.invoke('get-model-customization', modelId),
  setModelCustomization: (customization: ModelCustomization): Promise<void> =>
    ipcRenderer.invoke('set-model-customization', customization),
};

contextBridge.exposeInMainWorld('api', api);