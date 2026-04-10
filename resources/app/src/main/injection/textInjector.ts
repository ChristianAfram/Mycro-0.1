import { clipboard, app } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import logger from '../logger';

class TextInjector {
  private previousClipboard: string = '';
  private pasteProcess: ChildProcess | null = null;

  async pasteText(text: string): Promise<boolean> {
    try {
      this.previousClipboard = clipboard.readText();

      clipboard.writeText(text);
      logger.debug('Text copied to clipboard');

      await this.simulatePaste();

      const success = true;
      logger.info(`Text pasted: "${text.substring(0, 50)}..."`);

      setTimeout(() => {
        try {
          clipboard.writeText(this.previousClipboard);
        } catch {
          logger.debug('Could not restore previous clipboard');
        }
      }, 1000);

      return success;
    } catch (error) {
      logger.error('Failed to paste text', error);
      return false;
    }
  }

  private async simulatePaste(): Promise<void> {
    return new Promise((resolve) => {
      this.pasteProcess = spawn('powershell', [
        '-Command',
        '$Wshell = New-Object -ComObject WScript.Shell; ' +
        '$Wshell.SendKeys("^v")',
      ], {
        stdio: ['ignore', 'ignore', 'ignore'],
        windowsHide: true,
        detached: false,
      });

      this.pasteProcess.on('error', (error) => {
        logger.error('Paste process error', error);
        resolve();
      });

      this.pasteProcess.on('exit', () => {
        setTimeout(() => resolve(), 100);
      });

      setTimeout(() => resolve(), 300);
    });
  }

  async typeText(text: string): Promise<boolean> {
    try {
      const sanitized = text
        .replace(/[{}^%~()]/g, (match) => `{${match}}`)
        .replace(/\n/g, '{ENTER}');

      const typeProcess = spawn('powershell', [
        '-Command',
        `$Wshell = New-Object -ComObject WScript.Shell; ` +
        `$Wshell.SendKeys("${sanitized.replace(/"/g, '`"')}")`,
      ], {
        stdio: ['ignore', 'ignore', 'ignore'],
        windowsHide: true,
        detached: false,
      });

      return new Promise((resolve) => {
        typeProcess.on('error', () => resolve(false));
        typeProcess.on('exit', () => {
          logger.info('Text typed successfully');
          resolve(true);
        });
        setTimeout(() => resolve(true), 500);
      });
    } catch (error) {
      logger.error('Failed to type text', error);
      return false;
    }
  }

  getPreviousClipboard(): string {
    return this.previousClipboard;
  }

  restorePreviousClipboard(): void {
    if (this.previousClipboard) {
      try {
        clipboard.writeText(this.previousClipboard);
        logger.debug('Previous clipboard restored');
      } catch (error) {
        logger.error('Failed to restore clipboard', error);
      }
    }
  }
}

export const textInjector = new TextInjector();
export default textInjector;