import Store from 'electron-store';
import { HistoryItem, PersonaMode, AppSettings } from '../../shared/types';
import { getSettings } from '../settings';
import logger from '../logger';

interface HistoryStore {
  entries: HistoryItem[];
}

const store = new Store<HistoryStore>({
  name: 'mycro-history',
  defaults: {
    entries: [],
  },
});

export class HistoryService {
  private static instance: HistoryService;

  private constructor() {}

  static getInstance(): HistoryService {
    if (!HistoryService.instance) {
      HistoryService.instance = new HistoryService();
    }
    return HistoryService.instance;
  }

  /**
   * Get all history entries (sorted by newest first)
   */
  getHistory(): HistoryItem[] {
    const settings = getSettings();
    if (!settings.historyEnabled) {
      return [];
    }

    const entries = store.get('entries');
    // Sort by newest first and limit to maxItems
    const maxItems = settings.historyMaxItems || 100;
    return entries
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, maxItems);
  }

  /**
   * Add a new history entry
   */
  async addEntry(
    rawText: string,
    refinedText: string,
    persona: PersonaMode,
    skillId?: string,
    skillName?: string
  ): Promise<HistoryItem> {
    const settings = getSettings();

    if (!settings.historyEnabled) {
      logger.debug('History disabled, skipping entry');
      // Return a dummy entry
      return {
        id: 'disabled',
        rawText,
        refinedText,
        timestamp: Date.now(),
        persona,
        skillId,
        skillName,
      };
    }

    const entries = store.get('entries');

    const newEntry: HistoryItem = {
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      rawText,
      refinedText,
      timestamp: Date.now(),
      persona,
      skillId,
      skillName,
    };

    entries.push(newEntry);

    // Enforce max items limit
    const maxItems = settings.historyMaxItems || 100;
    if (entries.length > maxItems) {
      entries.splice(0, entries.length - maxItems);
    }

    store.set('entries', entries);
    logger.debug(`History entry added: ${newEntry.id}`);

    return newEntry;
  }

  /**
   * Delete a specific history entry
   */
  deleteEntry(id: string): void {
    const entries = store.get('entries');
    const entryIndex = entries.findIndex(e => e.id === id);

    if (entryIndex === -1) {
      throw new Error(`History entry "${id}" not found`);
    }

    entries.splice(entryIndex, 1);
    store.set('entries', entries);
    logger.debug(`History entry deleted: ${id}`);
  }

  /**
   * Clear all history entries
   */
  clearHistory(): void {
    store.set('entries', []);
    logger.info('History cleared');
  }

  /**
   * Get a specific history entry by ID
   */
  getEntryById(id: string): HistoryItem | undefined {
    const entries = store.get('entries');
    return entries.find(e => e.id === id);
  }

  /**
   * Search history by text content
   */
  searchHistory(query: string): HistoryItem[] {
    const entries = store.get('entries');
    const lowerQuery = query.toLowerCase();

    return entries.filter(
      e =>
        e.rawText.toLowerCase().includes(lowerQuery) ||
        e.refinedText.toLowerCase().includes(lowerQuery)
    );
  }
}

export const historyService = HistoryService.getInstance();
export default historyService;
