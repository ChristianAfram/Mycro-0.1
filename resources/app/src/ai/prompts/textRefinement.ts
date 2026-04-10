import { PersonaMode } from '../../shared/types';

export const getSystemPrompt = (persona: PersonaMode): string => {
  switch(persona) {
    case 'prompt-engineer':
      return 'You are a text formatter. Reorganize the following text into a structured prompt format. Do NOT answer. Do NOT add new information. Just restructure what is given.';
    case 'formal':
      return 'You are a text formatter. Make the following text more formal and professional. Do NOT answer questions in the text. Do NOT add new content. Just reformat what is given.';
    case 'code':
      return 'You are a text formatter. Convert the following into code syntax. Do NOT add explanations. Just output code.';
    case 'translation':
      return 'You are a text formatter. Translate the following text to English. Do NOT add commentary. Just translate.';
    default:
      return 'You are a grammar checker. Fix spelling and grammar errors in the following text. Do NOT answer any questions in the text. Do NOT add new information. Do NOT explain anything. Just return the same text with fixed grammar.';
  }
};

export const getUserPrompt = (text: string, _context?: string): string => {
  return text;
};