export interface TranscriptionResult {
  text: string;
  success: boolean;
  error?: string;
  timing?: {
    startTime: number;
    endTime: number;
    duration: number;
  };
}

export interface OllamaModelsResponse {
  models: Array<{
    name: string;
    modified_at: string;
    size: number;
  }>;
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
}

export interface OllamaGenerateResponse {
  response: string;
  done: boolean;
}

export interface OllamaChatRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  stream: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
}

export interface OllamaChatResponse {
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

export interface RewriteResult {
  text: string;
  success: boolean;
  error?: string;
  timing?: {
    startTime: number;
    endTime: number;
    duration: number;
  };
}

export interface ProcessAudioOptions {
  model?: string;
  language?: string;
}

export interface ProcessAudioResult {
  transcript: string;
  rewrittenText: string;
  success: boolean;
  error?: string;
  timings: {
    transcription: number;
    rewrite: number;
    total: number;
  };
}

export interface HealthStatus {
  whisper: {
    available: boolean;
    error?: string;
  };
  ollama: {
    available: boolean;
    error?: string;
    models: string[];
    selectedModel?: string;
  };
  overall: boolean;
  message: string;
}

export interface PipelineService {
  checkHealth(): Promise<HealthStatus>;
  getAvailableModels(): Promise<string[]>;
  transcribeAudio(audioPath: string, language?: string): Promise<TranscriptionResult>;
  rewriteText(text: string, model: string): Promise<RewriteResult>;
  processAudio(audioPath: string, model: string, options?: ProcessAudioOptions): Promise<ProcessAudioResult>;
}

export const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
export const DEFAULT_TIMEOUT = 60000;
export const TRANSCRIPTION_TIMEOUT = 120000;
export const REWRITE_TIMEOUT = 60000;

export const DEFAULT_MODEL = 'mistral';
export const FALLBACK_MODELS = ['mistral', 'dolphin-phi', 'llama3.2', 'llama3.1'];

export const WHISPER_MODELS = ['tiny', 'base', 'small', 'medium', 'large'];
export const DEFAULT_WHISPER_MODEL = 'base';