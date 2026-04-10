import logger from '../logger';
import { pipelineService } from '../../ai/pipeline/pipelineService';
import { HealthStatus } from '../../ai/types';
import { getSettings, getModel } from '../settings';

export interface TranscriptionResult {
  text: string;
  success: boolean;
  error?: string;
}

export interface ProcessAudioResult {
  text: string;
  success: boolean;
  error?: string;
}

class AiPipelineService {
  private isAvailable: boolean = false;

  async initialize(): Promise<void> {
    try {
      const model = getModel();
      pipelineService.setModel(model);
      await pipelineService.initialize();
      this.isAvailable = true;
      logger.info('AI Pipeline service initialized');
    } catch (error) {
      logger.error('Failed to initialize AI Pipeline', error);
      this.isAvailable = false;
    }
  }

  async processAudio(audioPath: string): Promise<ProcessAudioResult> {
    try {
      logger.info(`Processing audio: ${audioPath}`);

      const model = getModel();
      const result = await pipelineService.processAudio(audioPath, model);

      if (result.success) {
        logger.info('Audio processed successfully');
        return {
          text: result.rewrittenText,
          success: true,
        };
      }

      logger.error('Audio processing failed', result.error);
      return {
        text: '',
        success: false,
        error: result.error,
      };
    } catch (error) {
      logger.error('Audio processing failed', error);
      return {
        text: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async transcribeAudio(audioPath: string): Promise<TranscriptionResult> {
    const result = await pipelineService.transcribeAudio(audioPath);
    return {
      text: result.text,
      success: result.success,
      error: result.error,
    };
  }

  async rewriteText(text: string, context?: string): Promise<{text: string, success: boolean, error?: string}> {
    const settings = getSettings();
    const model = settings.model || 'llama3.2';
    const persona = settings.activePersona || 'auto';
    const result = await pipelineService.rewriteText(text, model, context, persona);
    return {
      text: result.text,
      success: result.success,
      error: result.error,
    };
  }

  async checkHealth(): Promise<HealthStatus> {
    return pipelineService.checkHealth();
  }

  async getAvailableModels(): Promise<string[]> {
    return pipelineService.getAvailableModels();
  }

  setAvailable(available: boolean): void {
    this.isAvailable = available;
    logger.info(`AI Pipeline availability: ${available}`);
  }

  getAvailable(): boolean {
    return this.isAvailable;
  }
}

export const aiPipelineService = new AiPipelineService();
export default aiPipelineService;