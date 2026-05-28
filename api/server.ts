import http from 'node:http';
import { logger } from '../core/logger.js';

type ApiHandler = (req: http.IncomingMessage, res: http.ServerResponse, body: Record<string, unknown>) => Promise<void>;

const MAX_MESSAGE_LENGTH = 10000;
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 30; // max requests per window per IP

const requestCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

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
    users?: () => unknown[];
    patterns?: () => unknown[];
  }): void {
    this.routes.set('GET /health', async (_req, res) => {
      this.json(res, 200, { status: 'ok', ...handlers.health() });
    });

    this.routes.set('POST /api/chat', async (req, res, body) => {
      const message = body.message;
      const userId = body.user_id as string || 'api-user';

      // Input validation
      if (!message || typeof message !== 'string') {
        this.json(res, 400, { error: 'message (string) required' });
        return;
      }
      if (message.length > MAX_MESSAGE_LENGTH) {
        this.json(res, 400, { error: 'Message too long (max ' + MAX_MESSAGE_LENGTH + ' chars)' });
        return;
      }

      try {
        const response = await handlers.chat(message.trim(), userId);
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

    if (handlers.users) {
      this.routes.set('GET /api/users', async (_req, res) => {
        this.json(res, 200, { users: handlers.users!() });
      });
    }

    if (handlers.patterns) {
      this.routes.set('GET /api/patterns', async (_req, res) => {
        this.json(res, 200, { patterns: handlers.patterns!() });
      });
    }
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer(async (req, res) => {
        // CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

        // Rate limiting
        const ip = req.socket.remoteAddress || 'unknown';
        if (!checkRateLimit(ip)) {
          this.json(res, 429, { error: 'Rate limit exceeded. Try again in 1 minute.' });
          return;
        }

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
          try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch (_e) { /* */ }
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
