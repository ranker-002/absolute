import http from 'node:http';
import { logger } from '../core/logger.js';

type ApiHandler = (req: http.IncomingMessage, res: http.ServerResponse, body: Record<string, unknown>) => Promise<void>;

export class ApiServer {
  private server: http.Server | null = null;
  private routes: Map<string, ApiHandler> = new Map();
  private port: number;
  private authSecret: string;

  constructor(port = 3000) {
    this.port = port;
    this.authSecret = process.env.ULTIMATE_API_SECRET || '';
  }

  init(handlers: {
    health: () => Record<string, unknown>;
    chat: (message: string, userId?: string) => Promise<string>;
    status: () => Record<string, unknown>;
    snapshots: () => Promise<unknown[]>;
    skills: () => Promise<unknown[]>;
    memory: (query?: string) => Promise<unknown>;
    evolution: () => Record<string, unknown>;
    config: () => Record<string, unknown>;
  }): void {
    this.routes.set('GET /health', async (_req, res) => {
      this.json(res, 200, { status: 'ok', ...handlers.health() });
    });

    this.routes.set('POST /api/chat', async (_req, res, body) => {
      const message = body.message as string;
      const userId = body.user_id as string || 'api-user';
      if (!message) { this.json(res, 400, { error: 'message required' }); return; }
      try {
        const response = await handlers.chat(message, userId);
        this.json(res, 200, { response, user_id: userId });
      } catch (err) {
        this.json(res, 500, { error: (err as Error).message });
      }
    });

    this.routes.set('GET /api/status', async (_req, res) => {
      this.json(res, 200, handlers.status());
    });

    this.routes.set('GET /api/snapshots', async (_req, res) => {
      const snapshots = await handlers.snapshots();
      this.json(res, 200, { snapshots });
    });

    this.routes.set('GET /api/skills', async (_req, res) => {
      const skills = await handlers.skills();
      this.json(res, 200, { skills });
    });

    this.routes.set('GET /api/memory', async (req, res) => {
      const url = new URL(req.url || '/', 'http://localhost');
      const query = url.searchParams.get('q') || undefined;
      const memory = await handlers.memory(query);
      this.json(res, 200, memory);
    });

    this.routes.set('GET /api/evolution', async (_req, res) => {
      this.json(res, 200, handlers.evolution());
    });

    this.routes.set('GET /api/config', async (_req, res) => {
      this.json(res, 200, handlers.config());
    });
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer(async (req, res) => {
        // CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

        // Auth check
        if (this.authSecret) {
          const auth = req.headers.authorization;
          if (auth !== 'Bearer ' + this.authSecret) {
            this.json(res, 401, { error: 'Unauthorized' });
            return;
          }
        }

        // Parse body
        let body: Record<string, unknown> = {};
        if (req.method === 'POST') {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk);
          try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { /* */ }
        }

        // Route matching
        const key = (req.method || 'GET') + ' ' + (req.url?.split('?')[0] || '/');
        const handler = this.routes.get(key);

        if (handler) {
          try { await handler(req, res, body); }
          catch (err) { this.json(res, 500, { error: (err as Error).message }); }
        } else {
          this.json(res, 404, { error: 'Not found', available: Array.from(this.routes.keys()) });
        }
      });

      this.server.listen(this.port, () => {
        logger.info('ApiServer', 'Listening on http://localhost:' + this.port);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) this.server.close(() => resolve());
      else resolve();
    });
  }

  private json(res: http.ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  }
}
