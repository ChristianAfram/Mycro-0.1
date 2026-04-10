import { app, BrowserWindow } from 'electron';
import logger from './logger';
import { createMainWindow, showMainWindow, getMainWindow } from './windows/windowManager';
import { createTray, destroyTray } from './tray/trayManager';
import { registerDefaultHotkey, unregisterAllHotkeys } from './hotkeys/hotkeyManager';
import { setupIpcHandlers, initializeRecordingCallback, setupStateSubscription } from './ipc/ipcHandlers';
import { audioRecorder } from './audio/audioRecorder';
import { stateMachine } from './state/stateMachine';
import { aiPipelineService } from './services/aiPipeline';

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  logger.info('Another instance is running, quitting');
  app.quit();
}

app.on('second-instance', () => {
  const window = getMainWindow();
  if (window) {
    showMainWindow();
  }
});

app.on('ready', async () => {
  logger.info('Mycro starting up');

  try {
    await aiPipelineService.initialize();
    logger.info('AI Pipeline initialized');

    createMainWindow();
    logger.info('Main window created');

    createTray();
    logger.info('Tray created');

    setupIpcHandlers();
    logger.info('IPC handlers setup');

    initializeRecordingCallback();
    logger.info('Recording callback initialized');

    const mainWindow = getMainWindow();
    if (mainWindow) {
      setupStateSubscription(mainWindow);
    }

    registerDefaultHotkey();

    setTimeout(() => {
      showMainWindow();
    }, 500);

    logger.info('Mycro started successfully');
  } catch (error) {
    logger.error('Failed to start Mycro', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  logger.info('All windows closed');
});

app.on('before-quit', () => {
  logger.info('Mycro shutting down');

  unregisterAllHotkeys();

  stateMachine.setState('idle');

  destroyTray();

  logger.info('Cleanup complete');
});

app.on('will-quit', () => {
  unregisterAllHotkeys();
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  app.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', reason);
});