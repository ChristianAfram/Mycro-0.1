import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import logger from '../../main/logger';
import { TranscriptionResult, DEFAULT_WHISPER_MODEL, WHISPER_MODELS } from '../types';

export class WhisperService {
  private pythonPath: string | null = null;
  private whisperPath: string | null = null;
  private initialized: boolean = false;
  private modelPath: string;

  constructor() {
    this.modelPath = path.join(process.cwd(), 'models', 'whisper');
  }

  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    logger.info('Initializing Whisper service...');

    try {
      this.pythonPath = await this.findPython();
      if (!this.pythonPath) {
        logger.error('Python not found');
        return false;
      }
      logger.info(`Found Python at: ${this.pythonPath}`);

      const whisperInstalled = await this.ensureWhisperInstalled();
      if (!whisperInstalled) {
        logger.error('Failed to install Whisper');
        return false;
      }

      this.initialized = true;
      logger.info('Whisper service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Whisper initialization failed', error);
      return false;
    }
  }

  private async findPython(): Promise<string | null> {
    const possiblePaths = [
      'python',
      'python3',
      'py',
      'C:\\Python312\\python.exe',
      'C:\\Python311\\python.exe',
      'C:\\Python310\\python.exe',
      'C:\\Program Files\\Python312\\python.exe',
      'C:\\Program Files\\Python311\\python.exe',
    ];

    for (const p of possiblePaths) {
      try {
        execSync(`${p} --version`, { stdio: 'pipe' });
        logger.info(`Found Python: ${p}`);
        return p;
      } catch {
        continue;
      }
    }
    return null;
  }

  private async ensureWhisperInstalled(): Promise<boolean> {
    const whisperDir = path.join(process.cwd(), 'scripts', 'whisper');
    const installScript = path.join(whisperDir, 'install_whisper.py');
    const requirementsFile = path.join(whisperDir, 'requirements.txt');

    if (!fs.existsSync(whisperDir)) {
      fs.mkdirSync(whisperDir, { recursive: true });
    }

    const requirementsContent = `faster-whisper
numpy
`;

    if (!fs.existsSync(requirementsFile)) {
      fs.writeFileSync(requirementsFile, requirementsContent);
      logger.info('Created requirements.txt for Whisper');
    }

    try {
      logger.info('Installing faster-whisper...');
      execSync(`${this.pythonPath} -m pip install -r "${requirementsFile}" --quiet`, {
        stdio: 'pipe',
        timeout: 300000,
      });
      logger.info('faster-whisper installed successfully');
      return true;
    } catch (error) {
      logger.error('Failed to install faster-whisper', error);
      return false;
    }
  }

  async transcribe(audioPath: string, model: string = DEFAULT_WHISPER_MODEL): Promise<TranscriptionResult> {
    const startTime = Date.now();

    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.pythonPath || !this.initialized) {
      return {
        text: '',
        success: false,
        error: 'Whisper not initialized',
        timing: { startTime, endTime: Date.now(), duration: Date.now() - startTime },
      };
    }

    if (!fs.existsSync(audioPath)) {
      return {
        text: '',
        success: false,
        error: `Audio file not found: ${audioPath}`,
        timing: { startTime, endTime: Date.now(), duration: Date.now() - startTime },
      };
    }

    const stats = fs.statSync(audioPath);
    if (stats.size < 100) {
      return {
        text: '',
        success: false,
        error: 'Audio file too small or empty',
        timing: { startTime, endTime: Date.now(), duration: Date.now() - startTime },
      };
    }

    try {
      const scriptPath = path.join(process.cwd(), 'scripts', 'whisper', 'transcribe.py');
      const scriptContent = `
import sys
import json
from faster_whisper import WhisperModel

model_size = "${model}"
model = WhisperModel(model_size, device="cpu", compute_type="int8")

segments, info = model.transcribe("${audioPath.replace(/\\/g, '\\\\')}", beam_size=5)

text_parts = []
for segment in segments:
    text_parts.append(segment.text.strip())

result = " ".join(text_parts)
print(json.dumps({"text": result, "language": info.language}))
`;
      fs.writeFileSync(scriptPath, scriptContent);

      const result = await this.runPythonScript(scriptPath);
      const endTime = Date.now();

      if (result.success && result.output) {
        try {
          const parsed = JSON.parse(result.output);
          const text = this.cleanTranscript(parsed.text || '');
          return {
            text,
            success: true,
            timing: { startTime, endTime, duration: endTime - startTime },
          };
        } catch {
          return {
            text: result.output.trim(),
            success: true,
            timing: { startTime, endTime, duration: endTime - startTime },
          };
        }
      }

      return {
        text: '',
        success: false,
        error: result.error || 'Transcription failed',
        timing: { startTime, endTime: Date.now(), duration: Date.now() - startTime },
      };
    } catch (error) {
      const endTime = Date.now();
      logger.error('Transcription error', error);
      return {
        text: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown transcription error',
        timing: { startTime, endTime, duration: endTime - startTime },
      };
    }
  }

  private async runPythonScript(scriptPath: string): Promise<{ success: boolean; output: string; error?: string }> {
    return new Promise((resolve) => {
      const proc = spawn(this.pythonPath!, [scriptPath], {
        timeout: 120000,
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output: stdout });
        } else {
          resolve({ success: false, output: stdout, error: stderr || `Process exited with code ${code}` });
        }
      });

      proc.on('error', (error) => {
        resolve({ success: false, output: '', error: error.message });
      });
    });
  }

  private cleanTranscript(text: string): string {
    let cleaned = text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ')
      .trim();

    cleaned = cleaned.replace(/\b(um|uh|ah|er|eh)\b/gi, '');
    cleaned = cleaned.replace(/\b(\w+)\s+\1\b/gi, '$1');

    cleaned = cleaned.replace(/\.\s*\./g, '.');
    cleaned = cleaned.replace(/\s+\./g, '.');
    cleaned = cleaned.replace(/\s+,/g, ',');

    return cleaned.trim();
  }

  isAvailable(): boolean {
    return this.initialized;
  }

  getAvailableModels(): string[] {
    return WHISPER_MODELS;
  }
}

export const whisperService = new WhisperService();
export default whisperService;