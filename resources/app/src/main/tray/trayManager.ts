import { Tray, Menu, nativeImage, app, NativeImage } from 'electron';
import path from 'path';
import logger from '../logger';
import { showMainWindow, hideMainWindow, expandToSettings } from '../windows/windowManager';
import { getSettings } from '../settings';

let tray: Tray | null = null;

/**
 * Creates a simple 16x16 purple circle icon as a NativeImage.
 * This avoids needing an external asset file during development.
 */
function createPurpleIcon(): NativeImage {
  // Create a 16x16 RGBA buffer with a purple circle
  const size = 16;
  const buf = Buffer.alloc(size * size * 4, 0);

  const cx = 7.5, cy = 7.5, r = 6;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const idx = (y * size + x) * 4;
      if (dist <= r) {
        // Purple color: #8B5CF6
        buf[idx + 0] = 0x8B; // R
        buf[idx + 1] = 0x5C; // G
        buf[idx + 2] = 0xF6; // B
        buf[idx + 3] = 0xFF; // A – fully opaque
      }
    }
  }

  return nativeImage.createFromBuffer(buf, { width: size, height: size });
}

export function createTray(): Tray {
  const trayIcon = createPurpleIcon();

  tray = new Tray(trayIcon);
  tray.setToolTip('Mycro - Dictation Assistant');

  updateTrayMenu();

  tray.on('click', () => {
    showMainWindow();
  });

  tray.on('double-click', () => {
    showMainWindow();
  });

  logger.info('Tray created');
  return tray;
}

export function updateTrayMenu(): void {
  if (!tray) return;

  const currentSettings = getSettings();
  const currentPersona = currentSettings.activePersona || 'auto';
  const currentTheme = currentSettings.theme || 'dark';
  const currentAccent = currentSettings.accent || 'purple';

  const setSettingValue = (key: string, value: string) => {
    const { setSettings } = require('../settings');
    setSettings({ [key]: value as any });
    updateTrayMenu();
  };

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Mycro',
      click: () => showMainWindow(),
    },
    { type: 'separator' },
    {
      label: 'Personas (Agent Mode)',
      submenu: [
        { label: 'Auto (Intent Detection)', type: 'radio', checked: currentPersona === 'auto', click: () => setSettingValue('activePersona', 'auto') },
        { label: 'Prompt Engineer', type: 'radio', checked: currentPersona === 'prompt-engineer', click: () => setSettingValue('activePersona', 'prompt-engineer') },
        { label: 'Formal Executive', type: 'radio', checked: currentPersona === 'formal', click: () => setSettingValue('activePersona', 'formal') },
        { label: 'Code Architect', type: 'radio', checked: currentPersona === 'code', click: () => setSettingValue('activePersona', 'code') },
        { label: 'English Translator', type: 'radio', checked: currentPersona === 'translation', click: () => setSettingValue('activePersona', 'translation') },
        { label: 'Raw Dictation', type: 'radio', checked: currentPersona === 'raw', click: () => setSettingValue('activePersona', 'raw') },
      ]
    },
    {
      label: 'Base Theme',
      submenu: [
        { label: 'Dark Mode', type: 'radio', checked: currentTheme === 'dark', click: () => setSettingValue('theme', 'dark') },
        { label: 'Light Mode', type: 'radio', checked: currentTheme === 'light', click: () => setSettingValue('theme', 'light') },
      ]
    },
    {
      label: 'Accent Color',
      submenu: [
        { label: 'Purple', type: 'radio', checked: currentAccent === 'purple', click: () => setSettingValue('accent', 'purple') },
        { label: 'Blue', type: 'radio', checked: currentAccent === 'blue', click: () => setSettingValue('accent', 'blue') },
        { label: 'Green', type: 'radio', checked: currentAccent === 'green', click: () => setSettingValue('accent', 'green') },
        { label: 'Red', type: 'radio', checked: currentAccent === 'red', click: () => setSettingValue('accent', 'red') },
        { label: 'Orange', type: 'radio', checked: currentAccent === 'orange', click: () => setSettingValue('accent', 'orange') },
      ]
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        expandToSettings();
        showMainWindow();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        logger.info('Quit requested from tray');
        app.exit(0);
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
    logger.info('Tray destroyed');
  }
}

export function getTray(): Tray | null {
  return tray;
}

export default {
  createTray,
  updateTrayMenu,
  destroyTray,
  getTray,
};