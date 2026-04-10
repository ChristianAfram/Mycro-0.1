import * as fs from 'fs';
import { PersonaMode } from '../../shared/types';
import logger from '../../main/logger';
import {
  ProcessAudioOptions,
  ProcessAudioResult,
  HealthStatus,
  DEFAULT_MODEL,
} from '../types';
import whisperService from '../whisper/whisperService';
import ollamaService from '../ollama/ollamaService';

export class PipelineService {
  private selectedModel: string = DEFAULT_MODEL;
  private initialized: boolean = false;

  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    logger.info('Initializing AI pipeline...');

    try {
      const whisperOk = await whisperService.initialize();
      if (!whisperOk) {
        logger.warn('Whisper initialization failed, continuing anyway');
      }

      const ollamaOk = await ollamaService.checkAvailability();
      if (!ollamaOk.available) {
        logger.warn('Ollama not available on startup');
      }

      this.initialized = true;
      logger.info('AI pipeline initialized');
      return true;
    } catch (error) {
      logger.error('Pipeline initialization failed', error);
      return false;
    }
  }

  async checkHealth(): Promise<HealthStatus> {
    const health: HealthStatus = {
      whisper: { available: false },
      ollama: { available: false, models: [] },
      overall: false,
      message: '',
    };

    try {
      const whisperAvailable = whisperService.isAvailable();
      if (!whisperAvailable) {
        try {
          await whisperService.initialize();
          health.whisper.available = whisperService.isAvailable();
        } catch {
          health.whisper.available = false;
        }
      } else {
        health.whisper.available = true;
      }
    } catch (error) {
      health.whisper.error = error instanceof Error ? error.message : 'Unknown error';
    }

    try {
      const ollamaCheck = await ollamaService.checkAvailability();
      health.ollama.available = ollamaCheck.available;
      health.ollama.error = ollamaCheck.error;

      if (ollamaCheck.available) {
        health.ollama.models = await ollamaService.getAvailableModels();
        health.ollama.selectedModel = this.selectModel();
      }
    } catch (error) {
      health.ollama.error = error instanceof Error ? error.message : 'Unknown error';
    }

    health.overall = health.whisper.available && health.ollama.available;

    if (health.overall) {
      health.message = 'All systems operational';
    } else if (health.whisper.available && !health.ollama.available) {
      health.message = 'Whisper ready, Ollama not available';
    } else if (!health.whisper.available && health.ollama.available) {
      health.message = 'Ollama ready, Whisper not available';
    } else {
      health.message = 'AI services not fully available';
    }

    return health;
  }

  async getAvailableModels(): Promise<string[]> {
    return ollamaService.getAvailableModels();
  }

  async transcribeAudio(audioPath: string, language?: string): Promise<{ text: string; success: boolean; error?: string; timing?: { transcription: number } }> {
    const startTime = Date.now();

    if (!fs.existsSync(audioPath)) {
      return {
        text: '',
        success: false,
        error: `Audio file not found: ${audioPath}`,
      };
    }

    try {
      const result = await whisperService.transcribe(audioPath);

      return {
        text: result.text,
        success: result.success,
        error: result.error,
        timing: { transcription: result.timing?.duration || 0 },
      };
    } catch (error) {
      logger.error('Transcription failed', error);
      return {
        text: '',
        success: false,
        error: error instanceof Error ? error.message : 'Transcription failed',
      };
    }
  }

  async rewriteText(text: string, model?: string, context?: string, persona: PersonaMode = 'auto'): Promise<{ text: string; success: boolean; error?: string; timing?: { rewrite: number } }> {
    if (!text || text.trim().length === 0) {
      return {
        text: '',
        success: false,
        error: 'Empty text',
      };
    }

    const effectiveModel = model || this.selectModel();

    try {
      const result = await ollamaService.rewriteText(text, effectiveModel, context, persona);

      return {
        text: result.text,
        success: result.success,
        error: result.error,
        timing: { rewrite: result.timing?.duration || 0 },
      };
    } catch (error) {
      logger.error('Rewrite failed', error);
      return {
        text: '',
        success: false,
        error: error instanceof Error ? error.message : 'Rewrite failed',
      };
    }
  }

  async processAudio(audioPath: string, model?: string, options?: ProcessAudioOptions): Promise<ProcessAudioResult> {
    const totalStart = Date.now();
    logger.info(`Starting pipeline processing for: ${audioPath}`);

    if (!fs.existsSync(audioPath)) {
      return {
        transcript: '',
        rewrittenText: '',
        success: false,
        error: `Audio file not found: ${audioPath}`,
        timings: { transcription: 0, rewrite: 0, total: 0 },
      };
    }

    const effectiveModel = model || options?.model || this.selectModel();
    const language = options?.language;

    const transcriptionStart = Date.now();
    const transcriptResult = await whisperService.transcribe(audioPath, DEFAULT_MODEL);
    const transcriptionDuration = Date.now() - transcriptionStart;

    logger.info(`Transcription completed in ${transcriptionDuration}ms`);

    if (!transcriptResult.success || !transcriptResult.text || transcriptResult.text.trim().length === 0) {
      return {
        transcript: '',
        rewrittenText: '',
        success: false,
        error: transcriptResult.error || 'Empty transcript',
        timings: { transcription: transcriptionDuration, rewrite: 0, total: Date.now() - totalStart },
      };
    }

    logger.info(`Transcript length: ${transcriptResult.text.length} chars`);

    const rewriteStart = Date.now();
    const rewriteResult = await ollamaService.rewriteText(transcriptResult.text, effectiveModel);
    const rewriteDuration = Date.now() - rewriteStart;

    logger.info(`Rewrite completed in ${rewriteDuration}ms`);

    const totalDuration = Date.now() - totalStart;
    logger.info(`Total pipeline time: ${totalDuration}ms`);

    return {
      transcript: transcriptResult.text,
      rewrittenText: rewriteResult.success ? rewriteResult.text : transcriptResult.text,
      success: rewriteResult.success,
      error: rewriteResult.error,
      timings: {
        transcription: transcriptionDuration,
        rewrite: rewriteDuration,
        total: totalDuration,
      },
    };
  }

  setModel(model: string): void {
    this.selectedModel = model;
    logger.info(`Pipeline model set to: ${model}`);
  }

  getModel(): string {
    return this.selectedModel;
  }

  private selectModel(): string {
    return this.selectedModel || DEFAULT_MODEL;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export const pipelineService = new PipelineService();
export default pipelineService;