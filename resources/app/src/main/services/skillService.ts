import Store from 'electron-store';
import { Skill } from '../../shared/types';
import logger from '../logger';

interface SkillStore {
  skills: Skill[];
}

const store = new Store<SkillStore>({
  name: 'mycro-skills',
  defaults: {
    skills: [],
  },
});

/**
 * Default skills that provide useful transformations out of the box
 */
const DEFAULT_SKILLS: Skill[] = [
  {
    id: 'skill_summarize',
    name: 'Summarize',
    description: 'Condense text to key points while preserving essential information',
    promptTemplate: 'Summarize the following text concisely, keeping only the essential information and key points. Maintain clarity and coherence:\n\n{{text}}',
    icon: 'file-text',
    isUser: false,
    createdAt: Date.now(),
  },
  {
    id: 'skill_expand_acronym',
    name: 'Expand Acronyms',
    description: 'Identify and expand acronyms and abbreviations for clarity',
    promptTemplate: 'Review the following text and expand all acronyms and abbreviations to their full forms. If an acronym could have multiple meanings, use context to determine the most likely expansion:\n\n{{text}}',
    icon: 'arrow-right-left',
    isUser: false,
    createdAt: Date.now(),
  },
  {
    id: 'skill_fix_grammar',
    name: 'Fix Grammar',
    description: 'Correct grammar, spelling, and punctuation errors',
    promptTemplate: 'Correct all grammar, spelling, and punctuation errors in the following text. Preserve the original tone and style while ensuring proper English usage:\n\n{{text}}',
    icon: 'spell-check-2',
    isUser: false,
    createdAt: Date.now(),
  },
];

export class SkillService {
  private static instance: SkillService;

  private constructor() {
    // Initialize with default skills if store is empty
    const currentSkills = store.get('skills');
    if (!currentSkills || currentSkills.length === 0) {
      store.set('skills', DEFAULT_SKILLS);
      logger.info('Default skills initialized');
    }
  }

  static getInstance(): SkillService {
    if (!SkillService.instance) {
      SkillService.instance = new SkillService();
    }
    return SkillService.instance;
  }

  /**
   * Get all skills (both default and user-created)
   */
  getSkills(): Skill[] {
    return store.get('skills');
  }

  /**
   * Get a specific skill by ID
   */
  getSkillById(id: string): Skill | undefined {
    const skills = store.get('skills');
    return skills.find(s => s.id === id);
  }

  /**
   * Upload/create a new user skill
   */
  async uploadSkill(skill: Omit<Skill, 'id' | 'isUser'>): Promise<Skill> {
    const skills = store.get('skills');

    // Generate unique ID
    const newSkill: Skill = {
      ...skill,
      id: `user_skill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isUser: true,
      createdAt: Date.now(),
    };

    // Check for duplicate name
    const duplicate = skills.find(s => s.name.toLowerCase() === skill.name.toLowerCase());
    if (duplicate) {
      throw new Error(`A skill named "${skill.name}" already exists`);
    }

    skills.push(newSkill);
    store.set('skills', skills);
    logger.info(`User skill uploaded: ${newSkill.name}`);

    return newSkill;
  }

  /**
   * Delete a user skill (cannot delete default skills)
   */
  deleteSkill(id: string): void {
    const skills = store.get('skills');
    const skillIndex = skills.findIndex(s => s.id === id);

    if (skillIndex === -1) {
      throw new Error(`Skill with ID "${id}" not found`);
    }

    const skill = skills[skillIndex];
    if (!skill.isUser) {
      throw new Error('Cannot delete default skills');
    }

    skills.splice(skillIndex, 1);
    store.set('skills', skills);
    logger.info(`User skill deleted: ${skill.name}`);
  }

  /**
   * Update an existing user skill
   */
  updateSkill(id: string, updates: Partial<Omit<Skill, 'id' | 'isUser'>>): Skill {
    const skills = store.get('skills');
    const skillIndex = skills.findIndex(s => s.id === id);

    if (skillIndex === -1) {
      throw new Error(`Skill with ID "${id}" not found`);
    }

    const skill = skills[skillIndex];
    if (!skill.isUser) {
      throw new Error('Cannot update default skills');
    }

    const updatedSkill = { ...skill, ...updates };
    skills[skillIndex] = updatedSkill;
    store.set('skills', skills);
    logger.info(`User skill updated: ${updatedSkill.name}`);

    return updatedSkill;
  }
}

export const skillService = SkillService.getInstance();
export default skillService;
