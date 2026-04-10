import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';
import logger from '../logger';

export interface Macro {
  trigger: string;
  template: string;
}

class MacroService {
  private macrosFile: string;
  private macros: Macro[] = [];

  constructor() {
    // Store in appData/Electron/macros.json for persistence
    this.macrosFile = path.join(app.getPath('userData'), 'macros.json');
    this.loadMacros();
  }

  private loadMacros(): void {
    if (fs.existsSync(this.macrosFile)) {
      try {
        const data = fs.readFileSync(this.macrosFile, 'utf8');
        this.macros = JSON.parse(data);
        logger.info(`Loaded ${this.macros.length} macros`);
      } catch (err) {
        logger.error('Failed to load macros', err);
        this.macros = [];
      }
    } else {
      // Default examples
      this.macros = [
        { trigger: 'insert onboarding template', template: 'Hi there, welcome to the team!\nHere is your onboarding link: https://company.internal/onboarding' },
        { trigger: 'insert meeting block', template: 'I am not available then, how about we speak tomorrow after 3 PM?' }
      ];
      this.saveMacros();
    }
  }

  private saveMacros(): void {
    try {
      fs.writeFileSync(this.macrosFile, JSON.stringify(this.macros, null, 2), 'utf8');
    } catch (err) {
      logger.error('Failed to save macros', err);
    }
  }

  /**
   * Checks if the transcript precisely matches any trigger (case-insensitive, ignoring surrounding punctuation).
   * @param text The transcribed text
   * @returns the template snippet if found, otherwise null
   */
  matchMacro(text: string): string | null {
    const cleanedText = text.replace(/[.,!?]/g, '').trim().toLowerCase();
    const match = this.macros.find(m => cleanedText === m.trigger.toLowerCase());
    return match ? match.template : null;
  }
}

export const macroService = new MacroService();
export default macroService;
