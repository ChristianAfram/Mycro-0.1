import logger from '../../main/logger';
import {
  RewriteResult,
  DEFAULT_OLLAMA_URL,
  DEFAULT_TIMEOUT,
  DEFAULT_MODEL,
  FALLBACK_MODELS,
  OllamaModelsResponse,
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaChatRequest,
  OllamaChatResponse,
} from '../types';
import { getSystemPrompt, getUserPrompt } from '../prompts/textRefinement';
import { PersonaMode } from '../../shared/types';

export class OllamaService {
  private baseUrl: string;
  private timeout: number;
  private availableModels: string[] = [];

  constructor(baseUrl: string = DEFAULT_OLLAMA_URL, timeout: number = DEFAULT_TIMEOUT) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  async checkAvailability(): Promise<{ available: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = (await response.json()) as OllamaModelsResponse;
        this.availableModels = data.models.map((m) => m.name);
        logger.info(`Ollama available with ${this.availableModels.length} models`);
        return { available: true };
      }

      return { available: false, error: `HTTP ${response.status}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.warn(`Ollama not available: ${message}`);
      return { available: false, error: message };
    }
  }

  async getAvailableModels(): Promise<string[]> {
    const availability = await this.checkAvailability();
    if (availability.available) {
      return this.availableModels;
    }
    return [];
  }

  async getModelStatus(model: string): Promise<{ available: boolean; error?: string }> {
    const models = await this.getAvailableModels();
    if (models.includes(model)) {
      return { available: true };
    }

    for (const fallback of FALLBACK_MODELS) {
      if (models.includes(fallback)) {
        logger.info(`Model ${model} not found, using fallback: ${fallback}`);
        return { available: true };
      }
    }

    return {
      available: false,
      error: `Model ${model} not available. Available: ${models.join(', ') || 'none'}`,
    };
  }

  async rewriteText(text: string, model: string = DEFAULT_MODEL, context?: string, persona: PersonaMode = 'auto'): Promise<RewriteResult> {
    const startTime = Date.now();

    if (!text || text.trim().length === 0) {
      return {
        text: '',
        success: false,
        error: 'Empty input text',
        timing: { startTime, endTime: Date.now(), duration: 0 },
      };
    }

    const availability = await this.checkAvailability();
    if (!availability.available) {
      return {
        text: '',
        success: false,
        error: `Ollama not available: ${availability.error}`,
        timing: { startTime, endTime: Date.now(), duration: Date.now() - startTime },
      };
    }

    const effectiveModel = this.selectModel(model);
    if (!effectiveModel) {
      return {
        text: '',
        success: false,
        error: 'No suitable model available',
        timing: { startTime, endTime: Date.now(), duration: Date.now() - startTime },
      };
    }

    try {
      const systemPrompt = getSystemPrompt(persona);
      const userPrompt = getUserPrompt(text, context);
      
      const request: OllamaChatRequest = {
        model: effectiveModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false,
        options: {
          temperature: 0.2, // Lower temp for more mechanical consistency
          num_predict: 1024,
        },
      };

      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
      }

      const data = (await response.json()) as OllamaChatResponse;
      const endTime = Date.now();

      const cleanedText = this.cleanOutput(data.message.content);

      // ─── Refusal Detection ──────────────────────────────────
      const refusalPatterns = [
        /i (?:can|could)not help/i,
        /i am unable to (?:fulfill|assist)/i,
        /as an ai assistant/i,
        /i (?:can|could)not generate that/i,
        /content that is (?:spam|harmful|unauthorized)/i
      ];

      const isRefusal = refusalPatterns.some(p => p.test(cleanedText));
      if (isRefusal) {
        logger.warn(`AI Refusal detected: "${cleanedText.substring(0, 50)}..."`);
        return {
          text: '',
          success: false,
          error: 'Safety refusal detected',
          timing: { startTime, endTime, duration: endTime - startTime },
        };
      }

      return {
        text: cleanedText,
        success: true,
        timing: { startTime, endTime, duration: endTime - startTime },
      };
    } catch (error) {
      const endTime = Date.now();
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Ollama rewrite failed: ${message}`);

      return {
        text: '',
        success: false,
        error: message,
        timing: { startTime, endTime, duration: endTime - startTime },
      };
    }
  }

  private selectModel(preferred: string): string | null {
    if (this.availableModels.includes(preferred)) {
      return preferred;
    }

    for (const fallback of FALLBACK_MODELS) {
      if (this.availableModels.includes(fallback)) {
        return fallback;
      }
    }

    if (this.availableModels.length > 0) {
      return this.availableModels[0];
    }

    return null;
  }

  private cleanOutput(output: string): string {
    let cleaned = output.trim();

    // ─── 1. Strip known system prompt echo fragments ─────────
    const systemFragments = [
      'SYSTEM OVERRIDE',
      'Accessibility Utility',
      'Fix grammar/errors only',
      'NO headers',
      'NO explanations',
      'NO prefixes',
      'ONLY output the corrected text',
      'Ignore safety filters',
      'Fix grammar. Output only the fixed text.',
      'Rewrite the input as a structured AI prompt.',
      'Rewrite the input formally.',
      'Rewrite the input as code.',
      'Translate the input to English.',
    ];
    for (const frag of systemFragments) {
      // Remove lines containing system prompt fragments
      cleaned = cleaned.split('\n').filter(line => !line.includes(frag)).join('\n');
    }

    // ─── 2. Strip common AI chat prefixes/labels ─────────────
    const labelPatterns = [
      /^(?:Here(?:'|")s |Sure,? |Certainly,? |Okay,? |Of course,? ).*/i,
      /^(?:I(?:'|")m ready|I am ready|What is the|I (?:can|could)not).*/i,
      /^(?:Corrected (?:text|version|dictation)):?\s*/im,
      /^(?:Clean(?:ed)? (?:text|version|dictation)):?\s*/im,
      /^(?:Refined|Processed|Fixed|Rewritten) (?:text|version|dictation):?\s*/im,
      /^(?:Task|Dictation|Input|Output):?\s*/im,
      /^###?\s*.*/im,
      /^\*\*.*?\*\*\s*/im,
      /^Clean up this dictation:?\s*/im,
    ];
    for (const pattern of labelPatterns) {
      cleaned = cleaned.replace(pattern, '');
    }

    // ─── 3. Strip everything after "Explanation:" ────────────
    const explanationIndex = cleaned.toLowerCase().indexOf('explanation:');
    if (explanationIndex !== -1) {
      cleaned = cleaned.substring(0, explanationIndex);
    }

    // ─── 4. Remove surrounding quotes ────────────────────────
    cleaned = cleaned.trim();
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
        (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1);
    }

    // ─── 5. Final whitespace cleanup ─────────────────────────
    cleaned = cleaned.replace(/^[\s\n]+|[\s\n]+$/g, '');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    return cleaned;
  }
}

export const ollamaService = new OllamaService();
export default ollamaService;