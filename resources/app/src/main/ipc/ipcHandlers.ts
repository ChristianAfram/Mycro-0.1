import { ipcMain } from 'electron';
import logger from '../logger';
import { getSettings, setSettings } from '../settings';
import { stateMachine } from '../state/stateMachine';
import { showMainWindow, hideMainWindow, expandToSettings, shrinkToPill, isSettingsWindow } from '../windows/windowManager';
import { registerHotkey, setRecordingToggleCallback } from '../hotkeys/hotkeyManager';
import { audioRecorder } from '../audio/audioRecorder';
import { textInjector } from '../injection/textInjector';
import { aiPipelineService } from '../services/aiPipeline';
import { contextCaptureService } from '../services/contextService';
import { macroService } from '../services/macroService';
import { commandService } from '../services/commandService';
import { skillService } from '../services/skillService';
import { historyService } from '../services/historyService';
import { mcpService } from '../services/mcpService';
import { Skill, HistoryItem, McpConfig, CommandDefinition, ModelCustomization } from '../../shared/types';

// ─── Recording Toggle Callback ──────────────────────────────
// Declared at module scope so IPC handlers can reference it via closure.
let recordingToggleCallback: (() => void) | null = null;

    // Debounce guard — prevents rapid double-taps
    let toggleLock = false;
    
    // Store context globally during the recording session
    let currentContext = '';
    let recordingStartTime = 0;
    
    async function handleRecordingToggle(): Promise<void> {
      if (toggleLock) {
        logger.debug('Toggle debounced');
        return;
      }
      toggleLock = true;
      setTimeout(() => { toggleLock = false; }, 500);
    
      const currentState = stateMachine.getState();
    
      if (currentState === 'idle') {
        // ─── Start Recording ──────────────────────────────────
        try {
          stateMachine.setState('recording');
          recordingStartTime = Date.now();
          
          // Attempt to capture highlighted text from active window
          const ctxResult = await contextCaptureService.captureSelectedText();
          currentContext = ctxResult.success ? ctxResult.text : '';
          
          const path = await audioRecorder.startRecording();
          if (!path) {
            throw new Error('Failed to start audio capture');
          }
          logger.info('Recording started');
        } catch (err) {
          logger.error('Failed to start recording', err);
          stateMachine.setState('error');
          setTimeout(() => stateMachine.setState('idle'), 3000);
        }
      } else if (currentState === 'recording') {
        // ─── Stop & Process Pipeline ──────────────────────────
        try {
          const duration = Date.now() - recordingStartTime;
          const session = await audioRecorder.stopRecording();
    
          if (duration < 800) {
            logger.warn(`Recording too short (${duration}ms), discarding.`);
            stateMachine.setState('idle');
            currentContext = '';
            return;
          }
    
          if (!session) {
            throw new Error('No recording session returned');
          }

      stateMachine.setState('transcribing');
      logger.info(`Processing audio: ${session.path}`);

      const transcriptResult = await aiPipelineService.transcribeAudio(session.path);

      if (!transcriptResult.success || !transcriptResult.text) {
        throw new Error(transcriptResult.error || 'Empty transcript');
      }

      logger.info(`Transcript (${transcriptResult.text.length} chars): "${transcriptResult.text.substring(0, 80)}..."`);

      // ─── Intent & Command Routing ─────────────────────────────
      const isCommand = await commandService.handleCommand(transcriptResult.text);
      if (isCommand) {
         logger.info(`Command executed! Bypassing rewrite.`);
         stateMachine.setState('idle');
         return;
      }

      // ─── Smart Macro Bypass ──────────────────────────────────
      const macroMatch = macroService.matchMacro(transcriptResult.text);
      if (macroMatch) {
         logger.info(`Macro triggered! Bypassing LLM rewrite.`);
         stateMachine.setState('injecting');
         const settings = getSettings();
         if (settings.autoPaste) {
           await textInjector.pasteText(macroMatch);
         }
         stateMachine.setState('success');
         setTimeout(() => stateMachine.setState('idle'), 2000);
         return;
      }

      stateMachine.setState('rewriting');
      const rewriteResult = await aiPipelineService.rewriteText(transcriptResult.text, currentContext);
      currentContext = ''; // clear it after use

      if (!rewriteResult.success || !rewriteResult.text) {
        throw new Error(rewriteResult.error || 'Rewrite returned empty');
      }

      logger.info(`Rewrite (${rewriteResult.text.length} chars): "${rewriteResult.text.substring(0, 80)}..."`);

      stateMachine.setState('injecting');
      const settings = getSettings();
      if (settings.autoPaste) {
        await textInjector.pasteText(rewriteResult.text);
      }

      stateMachine.setState('success');
      setTimeout(() => stateMachine.setState('idle'), 2000);

    } catch (err) {
      logger.error('Pipeline failed', err);
      stateMachine.setState('error');
      setTimeout(() => stateMachine.setState('idle'), 3000);
    }
  } else {
    logger.debug(`Toggle ignored in state: ${currentState}`);
  }
}

// ─── IPC Handler Registration ───────────────────────────────
export function setupIpcHandlers(): void {
  ipcMain.handle('get-settings', () => {
    return getSettings();
  });

  ipcMain.handle('set-settings', async (_, settings) => {
    setSettings(settings);
    if (settings.hotkey) {
      registerHotkey(settings.hotkey);
    }
  });

  ipcMain.handle('get-state', () => {
    return stateMachine.getState();
  });

  ipcMain.handle('set-hotkey', async (_, hotkey: string) => {
    return registerHotkey(hotkey);
  });

  ipcMain.handle('hide-window', async () => {
    // If closing from settings view, shrink back to pill
    if (isSettingsWindow()) {
      shrinkToPill();
    }
    hideMainWindow();
  });

  ipcMain.handle('show-window', async () => {
    showMainWindow();
  });

  ipcMain.handle('open-settings', async () => {
    expandToSettings();
    showMainWindow();
  });

  ipcMain.handle('get-health', async () => {
    try {
      const health = await aiPipelineService.checkHealth();
      return {
        healthy: health.overall,
        message: health.message,
        details: health,
      };
    } catch (err) {
      return {
        healthy: false,
        message: 'Health check failed',
        details: null,
      };
    }
  });

  ipcMain.handle('get-ollama-models', async () => {
    try {
      return await aiPipelineService.getAvailableModels();
    } catch {
      return [];
    }
  });

  ipcMain.handle('start-recording', async () => {
    if (stateMachine.getState() === 'idle') {
      handleRecordingToggle();
    }
  });

  ipcMain.handle('stop-recording', async () => {
    if (stateMachine.getState() === 'recording') {
      handleRecordingToggle();
    }
  });

  ipcMain.handle('toggle-recording', async () => {
    handleRecordingToggle();
  });

  // ─── Skills IPC Handlers ──────────────────────────────────
  ipcMain.handle('get-skills', async (): Promise<Skill[]> => {
    return skillService.getSkills();
  });

  ipcMain.handle('upload-skill', async (_, skill: Omit<Skill, 'id' | 'isUser'>): Promise<Skill> => {
    return skillService.uploadSkill(skill);
  });

  ipcMain.handle('delete-skill', async (_, id: string): Promise<void> => {
    skillService.deleteSkill(id);
  });

  // ─── History IPC Handlers ──────────────────────────────────
  ipcMain.handle('get-history', async (): Promise<HistoryItem[]> => {
    return historyService.getHistory();
  });

  ipcMain.handle('delete-history-item', async (_, id: string): Promise<void> => {
    historyService.deleteEntry(id);
  });

  ipcMain.handle('clear-history', async (): Promise<void> => {
    historyService.clearHistory();
  });

  // ─── MCP Config IPC Handlers ──────────────────────────────────
  ipcMain.handle('get-mcp-configs', async (): Promise<McpConfig[]> => {
    return mcpService.getConfigs();
  });

  ipcMain.handle('add-mcp-config', async (_, config: McpConfig): Promise<void> => {
    mcpService.addConfig(config);
  });

  ipcMain.handle('update-mcp-config', async (_, id: string, config: Partial<McpConfig>): Promise<void> => {
    mcpService.updateConfig(id, config);
  });

  ipcMain.handle('delete-mcp-config', async (_, id: string): Promise<void> => {
    mcpService.deleteConfig(id);
  });

  ipcMain.handle('test-mcp-connection', async (_, id: string): Promise<{ success: boolean; message: string }> => {
    return mcpService.testConnection(id);
  });

  // ─── Commands IPC Handlers ──────────────────────────────────
  ipcMain.handle('get-commands', async (): Promise<CommandDefinition[]> => {
    return commandService.getCommands();
  });

  ipcMain.handle('add-command', async (_, command: CommandDefinition): Promise<void> => {
    commandService.addCommand(command);
  });

  ipcMain.handle('update-command', async (_, id: string, command: Partial<CommandDefinition>): Promise<void> => {
    commandService.updateCommand(id, command);
  });

  ipcMain.handle('delete-command', async (_, id: string): Promise<void> => {
    commandService.deleteCommand(id);
  });

  // ─── Model Customization IPC Handlers ──────────────────────────────────
  ipcMain.handle('get-model-customization', async (_, modelId: string): Promise<ModelCustomization | null> => {
    const settings = getSettings();
    return settings.modelCustomizations?.[modelId] || null;
  });

  ipcMain.handle('set-model-customization', async (_, customization: ModelCustomization): Promise<void> => {
    const settings = getSettings();
    const updatedCustomizations = {
      ...settings.modelCustomizations,
      [customization.modelId]: customization,
    };
    setSettings({ modelCustomizations: updatedCustomizations });
  });

  logger.info('IPC handlers registered');
}

// ─── Initialize Recording Callback for Hotkey ───────────────
export function initializeRecordingCallback(): void {
  recordingToggleCallback = () => {
    handleRecordingToggle();
  };
  setRecordingToggleCallback(recordingToggleCallback);
  logger.info('Recording toggle callback wired to hotkey');
}

// ─── State Subscription → Renderer ─────────────────────────
export function setupStateSubscription(mainWindow: Electron.BrowserWindow): void {
  stateMachine.on('stateChanged', (newState: string) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('state-changed', newState);
    }
  });
}

export default {
  setupIpcHandlers,
  initializeRecordingCallback,
  setupStateSubscription,
};