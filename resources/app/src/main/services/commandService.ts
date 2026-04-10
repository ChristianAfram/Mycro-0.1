import { shell } from 'electron';
import Store from 'electron-store';
import logger from '../logger';
import { textInjector } from '../injection/textInjector';
import { getSettings } from '../settings';
import { CommandDefinition } from '../../shared/types';

interface CommandStore {
  commands: CommandDefinition[];
}

const commandStore = new Store<CommandStore>({
  name: 'mycro-commands',
  defaults: {
    commands: [],
  },
});

export class CommandService {
  /**
   * Get all custom commands
   */
  getCommands(): CommandDefinition[] {
    return commandStore.get('commands');
  }

  /**
   * Add a new custom command
   */
  addCommand(command: CommandDefinition): void {
    const commands = commandStore.get('commands');

    // Check for duplicate trigger
    const duplicate = commands.find(c => c.trigger.toLowerCase() === command.trigger.toLowerCase());
    if (duplicate) {
      throw new Error(`A command with trigger "${command.trigger}" already exists`);
    }

    commands.push(command);
    commandStore.set('commands', commands);
    logger.info(`Custom command added: ${command.trigger}`);
  }

  /**
   * Update an existing command
   */
  updateCommand(id: string, updates: Partial<CommandDefinition>): void {
    const commands = commandStore.get('commands');
    const cmdIndex = commands.findIndex(c => c.id === id);

    if (cmdIndex === -1) {
      throw new Error(`Command with ID "${id}" not found`);
    }

    commands[cmdIndex] = { ...commands[cmdIndex], ...updates };
    commandStore.set('commands', commands);
    logger.info(`Custom command updated: ${commands[cmdIndex].trigger}`);
  }

  /**
   * Delete a custom command
   */
  deleteCommand(id: string): void {
    const commands = commandStore.get('commands');
    const cmdIndex = commands.findIndex(c => c.id === id);

    if (cmdIndex === -1) {
      throw new Error(`Command with ID "${id}" not found`);
    }

    commands.splice(cmdIndex, 1);
    commandStore.set('commands', commands);
    logger.info(`Custom command deleted: ${commands[cmdIndex].trigger}`);
  }

  /**
   * Evaluates a transcript to see if it's a command.
   * Returns true if it was a command and handled, false otherwise.
   */
  async handleCommand(transcript: string): Promise<boolean> {
    const cleaned = transcript.replace(/[.,!?]/g, '').trim().toLowerCase();

    // First check custom commands (without requiring wake word)
    const customCommands = this.getCommands();
    for (const cmd of customCommands) {
      if (!cmd.enabled) continue;

      const triggerMatch = cleaned.includes(cmd.trigger.toLowerCase());
      if (triggerMatch) {
        return await this.executeCommand(cmd);
      }
    }

    // Wake word check for built-in commands
    if (!cleaned.startsWith('micro') && !cleaned.startsWith('mycro')) {
      return false;
    }

    logger.info(`Command intent detected: ${cleaned}`);

    // Simple regex routers for basic OS intents
    if (cleaned.includes('search google for') || cleaned.includes('search for')) {
      const match = cleaned.match(/search (?:google )?for (.+)/);
      if (match && match[1]) {
        const query = encodeURIComponent(match[1].trim());
        shell.openExternal(`https://www.google.com/search?q=${query}`);
        return true;
      }
    }

    if (cleaned.includes('open youtube')) {
      shell.openExternal('https://www.youtube.com');
      return true;
    }

    if (cleaned.includes('open github')) {
      shell.openExternal('https://github.com');
      return true;
    }

    return false;
  }

  /**
   * Execute a custom command
   */
  private async executeCommand(command: CommandDefinition): Promise<boolean> {
    logger.info(`Executing custom command: ${command.trigger}`);

    try {
      switch (command.action) {
        case 'paste':
          await textInjector.pasteText(command.payload);
          return true;

        case 'open_url':
          if (command.payload.startsWith('http')) {
            shell.openExternal(command.payload);
            return true;
          }
          return false;

        case 'run_macro':
          // For now, just paste the payload - could be extended for complex macros
          await textInjector.pasteText(command.payload);
          return true;

        case 'custom':
          // Custom actions can be extended via skills
          await textInjector.pasteText(command.payload);
          return true;

        default:
          return false;
      }
    } catch (error) {
      logger.error(`Failed to execute command: ${command.trigger}`, error);
      return false;
    }
  }
}

export const commandService = new CommandService();
export default commandService;
