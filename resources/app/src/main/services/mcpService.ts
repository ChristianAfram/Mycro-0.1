import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import Store from 'electron-store';
import { McpConfig, ObsidianConfig } from '../../shared/types';
import logger from '../logger';

interface McpStore {
  configs: McpConfig[];
}

const store = new Store<McpStore>({
  name: 'mycro-mcp-configs',
  defaults: {
    configs: [],
  },
});

/**
 * MCP Service - Manages connections to external platforms
 * Currently supports Obsidian, with framework for Notion, Logseq, and custom integrations
 */
export class McpService {
  private static instance: McpService;

  private constructor() {}

  static getInstance(): McpService {
    if (!McpService.instance) {
      McpService.instance = new McpService();
    }
    return McpService.instance;
  }

  /**
   * Get all MCP configurations
   */
  getConfigs(): McpConfig[] {
    return store.get('configs');
  }

  /**
   * Get a specific config by ID
   */
  getConfigById(id: string): McpConfig | undefined {
    const configs = store.get('configs');
    return configs.find(c => c.id === id);
  }

  /**
   * Add a new MCP configuration
   */
  addConfig(config: McpConfig): void {
    const configs = store.get('configs');

    // Check for duplicate name
    const duplicate = configs.find(c => c.name.toLowerCase() === config.name.toLowerCase());
    if (duplicate) {
      throw new Error(`A configuration named "${config.name}" already exists`);
    }

    configs.push(config);
    store.set('configs', configs);
    logger.info(`MCP config added: ${config.name} (${config.platform})`);
  }

  /**
   * Update an existing MCP configuration
   */
  updateConfig(id: string, updates: Partial<McpConfig>): void {
    const configs = store.get('configs');
    const configIndex = configs.findIndex(c => c.id === id);

    if (configIndex === -1) {
      throw new Error(`Config with ID "${id}" not found`);
    }

    configs[configIndex] = { ...configs[configIndex], ...updates };
    store.set('configs', configs);
    logger.info(`MCP config updated: ${configs[configIndex].name}`);
  }

  /**
   * Delete an MCP configuration
   */
  deleteConfig(id: string): void {
    const configs = store.get('configs');
    const configIndex = configs.findIndex(c => c.id === id);

    if (configIndex === -1) {
      throw new Error(`Config with ID "${id}" not found`);
    }

    const deleted = configs[configIndex];
    configs.splice(configIndex, 1);
    store.set('configs', configs);
    logger.info(`MCP config deleted: ${deleted.name}`);
  }

  /**
   * Test connection to a platform
   */
  async testConnection(configId: string): Promise<{ success: boolean; message: string }> {
    const config = this.getConfigById(configId);

    if (!config) {
      return { success: false, message: 'Configuration not found' };
    }

    if (!config.enabled) {
      return { success: false, message: 'Configuration is disabled' };
    }

    try {
      switch (config.platform) {
        case 'obsidian':
          return await this.testObsidianConnection(config.config as ObsidianConfig);
        case 'notion':
          return { success: false, message: 'Notion integration coming soon' };
        case 'logseq':
          return { success: false, message: 'Logseq integration coming soon' };
        case 'custom':
          return { success: false, message: 'Custom integration - manual verification required' };
        default:
          return { success: false, message: 'Unknown platform type' };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message: errorMessage };
    }
  }

  /**
   * Test Obsidian vault connection
   */
  private async testObsidianConnection(config: ObsidianConfig): Promise<{ success: boolean; message: string }> {
    const { vaultPath } = config;

    if (!vaultPath) {
      return { success: false, message: 'Vault path not specified' };
    }

    try {
      // Check if path exists
      await fs.access(vaultPath);

      // Check if it's a directory
      const stats = await fs.stat(vaultPath);
      if (!stats.isDirectory()) {
        return { success: false, message: 'Path is not a directory' };
      }

      // Check for .obsidian folder (indicates valid Obsidian vault)
      const obsidianFolder = path.join(vaultPath, '.obsidian');
      try {
        await fs.access(obsidianFolder);
      } catch {
        return {
          success: false,
          message: 'Not a valid Obsidian vault (missing .obsidian folder)'
        };
      }

      return {
        success: true,
        message: `Connected to vault: ${path.basename(vaultPath)}`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Cannot access vault';
      return { success: false, message: errorMessage };
    }
  }

  /**
   * Send text to Obsidian
   */
  async sendToObsidian(text: string, configId: string, filename?: string): Promise<boolean> {
    const config = this.getConfigById(configId);

    if (!config || config.platform !== 'obsidian') {
      logger.error('Invalid Obsidian config');
      return false;
    }

    const obsidianConfig = config.config as ObsidianConfig;
    const { vaultPath, defaultFolder, dateFormat } = obsidianConfig;

    if (!vaultPath) {
      logger.error('No vault path configured');
      return false;
    }

    try {
      // Generate filename if not provided
      const noteName = filename || this.generateNoteName(dateFormat);
      const targetFolder = defaultFolder ? path.join(vaultPath, defaultFolder) : vaultPath;
      const notePath = path.join(targetFolder, `${noteName}.md`);

      // Ensure target folder exists
      await fs.mkdir(targetFolder, { recursive: true });

      // Append to existing file or create new
      let content = text;
      try {
        const existing = await fs.readFile(notePath, 'utf-8');
        content = `${existing}\n\n---\n\n${text}`;
      } catch {
        // File doesn't exist, create with frontmatter
        const date = this.formatDate(new Date(), dateFormat);
        content = `---
created: ${date}
tags: [mycro]
---

${text}`;
      }

      await fs.writeFile(notePath, content, 'utf-8');
      logger.info(`Text sent to Obsidian: ${notePath}`);
      return true;
    } catch (error) {
      logger.error('Failed to send text to Obsidian', error);
      return false;
    }
  }

  /**
   * Validate Obsidian vault path
   */
  async validateVault(vaultPath: string): Promise<boolean> {
    try {
      await fs.access(vaultPath);
      const stats = await fs.stat(vaultPath);
      if (!stats.isDirectory()) return false;

      const obsidianFolder = path.join(vaultPath, '.obsidian');
      await fs.access(obsidianFolder);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a note filename based on date format
   */
  private generateNoteName(dateFormat: string = 'YYYY-MM-DD'): string {
    return this.formatDate(new Date(), dateFormat);
  }

  /**
   * Format date according to config
   */
  private formatDate(date: Date, format: string = 'YYYY-MM-DD'): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes);
  }
}

export const mcpService = McpService.getInstance();
export default mcpService;
