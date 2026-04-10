import Store from 'electron-store';
import { AppSettings, DEFAULT_SETTINGS } from '../shared/types';
import logger from './logger';

const store = new Store<{ settings: AppSettings }>({
  name: 'mycro-settings',
  defaults: {
    settings: DEFAULT_SETTINGS,
  },
});

export function getSettings(): AppSettings {
  return store.get('settings');
}

import { BrowserWindow } from 'electron';

export function setSettings(settings: Partial<AppSettings>): void {
  const current = getSettings();
  const updated = { ...current, ...settings };
  store.set('settings', updated);
  logger.info('Settings updated', updated);

  // Notify all open windows
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send('settings-changed', updated);
    }
  });
}

export function getModel(): string {
  const settings = getSettings();
  return settings.model || 'mistral';
}

export function setModel(model: string): void {
  setSettings({ model });
}

export function resetSettings(): void {
  store.set('settings', DEFAULT_SETTINGS);
  logger.info('Settings reset to defaults');
}

export default store;