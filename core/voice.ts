import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger.js';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

export interface VoiceConfig {
  enabled: boolean;
  engine: 'whisper' | 'browser' | 'openai';
  language: string;
}

export class VoiceInterface {
  private config: VoiceConfig = { enabled: false, engine: 'browser', language: 'auto' };
  private isRecording = false;

  async init(): Promise<void> {
    // Check if whisper CLI is available
    try {
      await execAsync('which whisper 2>/dev/null || which whisper.cpp 2>/dev/null');
      this.config.engine = 'whisper';
      this.config.enabled = true;
      logger.info('Voice', 'Whisper engine detected');
    } catch {
      logger.info('Voice', 'No local speech engine — using browser/recording mode');
    }
  }

  async transcribeAudio(audioPath: string): Promise<string> {
    if (this.config.engine === 'whisper') {
      return this.transcribeWithWhisper(audioPath);
    }
    return '[Voice transcription requires Whisper or browser recording]';
  }

  private async transcribeWithWhisper(audioPath: string): Promise<string> {
    try {
      const { stdout } = await execAsync(
        'whisper ' + audioPath + ' --language ' + this.config.language + ' --output_format txt --output_dir /tmp/whisper_out',
        { timeout: 60000 }
      );
      const txtFile = audioPath.replace(/\.[^.]+$/, '.txt');
      const txtPath = '/tmp/whisper_out/' + path.basename(txtFile);
      const text = await fs.readFile(txtPath, 'utf-8').catch(() => stdout);
      return text.trim();
    } catch (err) {
      logger.error('Voice', 'Transcription failed: ' + (err as Error).message);
      return '';
    }
  }

  async textToSpeech(text: string): Promise<Buffer | null> {
    // Basic TTS using system espeak/festival if available
    try {
      const outFile = '/tmp/tts_' + Date.now() + '.wav';
      await execAsync('espeak "' + text.replace(/"/g, '\\"') + '" -w ' + outFile, { timeout: 10000 });
      return await fs.readFile(outFile);
    } catch {
      return null;
    }
  }

  isAvailable(): boolean {
    return this.config.enabled;
  }

  getConfig(): VoiceConfig {
    return { ...this.config };
  }

  setLanguage(lang: string): void {
    this.config.language = lang;
  }
}
