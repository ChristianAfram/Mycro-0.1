import { globalShortcut, app } from 'electron';
import logger from '../logger';
import { getSettings, setSettings } from '../settings';
import { stateMachine } from '../state/stateMachine';
import { getMainWindow, showMainWindow } from '../windows/windowManager';
import { audioRecorder } from '../audio/audioRecorder';

let currentHotkey: string | null = null;
let hotkeyCallback: (() => void) | null = null;

export function setRecordingToggleCallback(callback: () => void): void {
  hotkeyCallback = callback;
}

export function registerHotkey(hotkey: string): boolean {
  if (currentHotkey) {
    unregisterHotkey();
  }

  try {
    const success = globalShortcut.register(hotkey, () => {
      logger.debug(`Hotkey pressed: ${hotkey}`);
      
      const window = getMainWindow();
      if (window && !window.isVisible()) {
        showMainWindow();
      }
      
      if (hotkeyCallback) {
        hotkeyCallback();
      }
    });

    if (success) {
      currentHotkey = hotkey;
      setSettings({ hotkey });
      logger.info(`Hotkey registered: ${hotkey}`);
      return true;
    } else {
      logger.warn(`Failed to register hotkey: ${hotkey}`);
      return false;
    }
  } catch (error) {
    logger.error(`Error registering hotkey: ${hotkey}`, error);
    return false;
  }
}

export function unregisterHotkey(): void {
  if (currentHotkey) {
    try {
      globalShortcut.unregister(currentHotkey);
      logger.info(`Hotkey unregistered: ${currentHotkey}`);
      currentHotkey = null;
    } catch (error) {
      logger.error('Error unregistering hotkey', error);
    }
  }
}

export function registerDefaultHotkey(): boolean {
  const settings = getSettings();
  return registerHotkey(settings.hotkey);
}

export function getCurrentHotkey(): string | null {
  return currentHotkey;
}

export function isHotkeyRegistered(): boolean {
  return currentHotkey !== null;
}

export function unregisterAllHotkeys(): void {
  globalShortcut.unregisterAll();
  currentHotkey = null;
  logger.info('All hotkeys unregistered');
}

export default {
  registerHotkey,
  unregisterHotkey,
  registerDefaultHotkey,
  getCurrentHotkey,
  isHotkeyRegistered,
  unregisterAllHotkeys,
  setRecordingToggleCallback,
};