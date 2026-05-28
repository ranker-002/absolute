import { LLMEngine } from './llm_engine.js';
import { logger } from './logger.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const llm = new LLMEngine();

// ============ Image Analysis ============
export class ImageAnalyzer {
  async describeImage(imagePath: string): Promise<string> {
    // Use LLM to analyze if it's a text description request
    return 'Image analysis requires a vision-capable model. Current model: ' + llm.getModel();
  }

  async analyzeScreenshot(screenshotPath: string): Promise<string> {
    return 'Screenshot analysis: ' + screenshotPath;
  }

  async generateAltText(imagePath: string): Promise<string> {
    return 'Descriptive alt text for: ' + imagePath;
  }
}

// ============ Document Generation ============
export class DocumentGenerator {
  async generateMarkdown(title: string, sections: Array<{ heading: string; content: string }>): Promise<string> {
    let md = '# ' + title + '\n\n';
    for (const s of sections) {
      md += '## ' + s.heading + '\n\n' + s.content + '\n\n';
    }
    return md;
  }

  async generateReport(title: string, data: Record<string, unknown>): Promise<string> {
    let md = '# ' + title + '\n\n';
    md += '*Generated: ' + new Date().toISOString() + '*\n\n';
    for (const [key, value] of Object.entries(data)) {
      md += '## ' + key + '\n\n';
      if (typeof value === 'object') {
        md += '```json\n' + JSON.stringify(value, null, 2) + '\n```\n\n';
      } else {
        md += String(value) + '\n\n';
      }
    }
    return md;
  }

  async generateHTML(title: string, body: string): Promise<string> {
    return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + title + '</title>' +
      '<style>body{font-family:sans-serif;max-width:800px;margin:0 auto;padding:20px}</style></head>' +
      '<body><h1>' + title + '</h1>' + body + '</body></html>';
  }

  async generateJSONSchema(tableName: string, fields: Array<{ name: string; type: string }>): Promise<string> {
    const schema: Record<string, unknown> = {
      name: tableName,
      fields: fields.map(f => ({ name: f.name, type: f.type })),
      createdAt: new Date().toISOString()
    };
    return JSON.stringify(schema, null, 2);
  }

  async saveDocument(content: string, filename: string, format: 'md' | 'html' | 'json' = 'md'): Promise<string> {
    const dir = path.join(ROOT, 'output');
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, filename + '.' + format);
    await fs.writeFile(filePath, content, 'utf-8');
    logger.info('DocGen', 'Saved: ' + filePath);
    return filePath;
  }
}

// ============ Data Visualization ============
export class DataViz {
  async generateBarChart(title: string, data: Record<string, number>): Promise<string> {
    const max = Math.max(...Object.values(data));
    let chart = '# ' + title + '\n\n';
    for (const [label, value] of Object.entries(data)) {
      const bar = '█'.repeat(Math.round((value / max) * 30));
      chart += label.padEnd(20) + ' ' + bar + ' ' + value + '\n';
    }
    return chart;
  }

  async generateTable(headers: string[], rows: string[][]): Promise<string> {
    const widths = headers.map((h, i) => Math.max(h.length, ...rows.map(r => (r[i] || '').length)));
    let table = '| ' + headers.map((h, i) => h.padEnd(widths[i])).join(' | ') + ' |\n';
    table += '| ' + widths.map(w => '-'.repeat(w)).join(' | ') + ' |\n';
    for (const row of rows) {
      table += '| ' + row.map((c, i) => (c || '').padEnd(widths[i])).join(' | ') + ' |\n';
    }
    return table;
  }

  async generateMermaidDiagram(type: 'flowchart' | 'sequence' | 'pie', data: string): Promise<string> {
    const diagrams: Record<string, string> = {
      flowchart: '```mermaid\nflowchart TD\n  ' + data + '\n```',
      sequence: '```mermaid\nsequenceDiagram\n  ' + data + '\n```',
      pie: '```mermaid\npie\n  ' + data + '\n```'
    };
    return diagrams[type] || diagrams.flowchart;
  }
}

// ============ Voice Conversation ============
export class VoiceConversation {
  private isActive = false;
  private transcript: Array<{ speaker: string; text: string; timestamp: number }> = [];

  start(): void { this.isActive = true; this.transcript = []; }
  stop(): void { this.isActive = false; }

  addTurn(speaker: string, text: string): void {
    if (!this.isActive) return;
    this.transcript.push({ speaker, text, timestamp: Date.now() });
  }

  getTranscript(): Array<{ speaker: string; text: string; timestamp: number }> {
    return [...this.transcript];
  }

  async summarize(): Promise<string> {
    if (this.transcript.length === 0) return '';
    const text = this.transcript.map(t => t.speaker + ': ' + t.text).join('\n');
    try {
      return await llm.generate({
        systemPrompt: 'Summarize this voice conversation.',
        userPrompt: text.substring(0, 3000),
        maxTokens: 300
      });
    } catch { return text.substring(0, 300); }
  }
}
