import { BrowserWindow, screen } from 'electron';
import path from 'path';
import logger from '../logger';

let mainWindow: BrowserWindow | null = null;

const WINDOW_WIDTH = 420;
const WINDOW_HEIGHT = 220;
const SETTINGS_WIDTH = 800;
const SETTINGS_HEIGHT = 600;

let isSettingsOpen = false;

export function createMainWindow(): BrowserWindow {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 200,
    height: 72,
    x: screenWidth - 220,
    y: screenHeight - 120,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '..', '..', 'renderer', 'index.html'));

  mainWindow.on('close', (event) => {
    event.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  logger.info('Main window created');
  return mainWindow;
}

export function expandToSettings(): void {
  if (!mainWindow) return;

  isSettingsOpen = true;

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow.setSize(SETTINGS_WIDTH, SETTINGS_HEIGHT);
  mainWindow.setPosition(
    Math.round((screenWidth - SETTINGS_WIDTH) / 2),
    Math.round((screenHeight - SETTINGS_HEIGHT) / 2)
  );
  mainWindow.setResizable(true);
  mainWindow.setMaximizable(false);
  mainWindow.setAlwaysOnTop(true);
  mainWindow.setIgnoreMouseEvents(false);

  // Notify renderer to switch view
  mainWindow.webContents.send('show-settings-view');
}

export function shrinkToPill(): void {
  if (!mainWindow) return;

  isSettingsOpen = false;

  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow.setSize(200, 72);
  mainWindow.setPosition(screenWidth - 220, screenHeight - 120);
  mainWindow.setResizable(false);
  mainWindow.setMaximizable(false);
  mainWindow.setAlwaysOnTop(true);

  // Notify renderer to switch view
  mainWindow.webContents.send('show-pill-view');
}

export function isSettingsWindow(): boolean {
  return isSettingsOpen;
}

export function showMainWindow(): void {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.setIgnoreMouseEvents(false);
  }
}

export function hideMainWindow(): void {
  mainWindow?.hide();
}

export function toggleMainWindow(): void {
  if (mainWindow?.isVisible()) {
    hideMainWindow();
  } else {
    showMainWindow();
  }
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export default {
  createMainWindow,
  showMainWindow,
  hideMainWindow,
  toggleMainWindow,
  getMainWindow,
  expandToSettings,
  shrinkToPill,
  isSettingsWindow,
};