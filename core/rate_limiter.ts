import { logger } from './logger.js';

export interface RateLimitState {
  isLimited: boolean;
  retryAfter: number;
  cooldownEnd: number;
  requestCount: number;
  lastRequestTime: number;
}

export class RateLimiter {
  private state: RateLimitState = {
    isLimited: false,
    retryAfter: 0,
    cooldownEnd: 0,
    requestCount: 0,
    lastRequestTime: 0
  };
  private cooldownTimer: ReturnType<typeof setTimeout> | null = null;

  getState(): RateLimitState {
    if (this.state.isLimited && Date.now() >= this.state.cooldownEnd) {
      this.state.isLimited = false;
      this.state.retryAfter = 0;
      this.state.cooldownEnd = 0;
    }
    return { ...this.state };
  }

  getRemainingMs(): number {
    if (!this.state.isLimited) return 0;
    return Math.max(0, this.state.cooldownEnd - Date.now());
  }

  recordRequest(): void {
    this.state.requestCount++;
    this.state.lastRequestTime = Date.now();
  }

  onRateLimited(retryAfterSeconds: number): void {
    const retryMs = retryAfterSeconds * 1000;
    this.state.isLimited = true;
    this.state.retryAfter = retryAfterSeconds;
    this.state.cooldownEnd = Date.now() + retryMs;

    logger.warn('RateLimiter', `Rate limited for ${retryAfterSeconds}s`);

    if (this.cooldownTimer) clearTimeout(this.cooldownTimer);
    this.cooldownTimer = setTimeout(() => {
      this.state.isLimited = false;
      this.state.retryAfter = 0;
      this.state.cooldownEnd = 0;
      logger.info('RateLimiter', 'Rate limit cooldown ended');
    }, retryMs);
  }

  onOverloaded(attempt: number): void {
    const delay = Math.pow(2, attempt);
    this.onRateLimited(delay);
  }

  reset(): void {
    if (this.cooldownTimer) clearTimeout(this.cooldownTimer);
    this.state = {
      isLimited: false,
      retryAfter: 0,
      cooldownEnd: 0,
      requestCount: 0,
      lastRequestTime: 0
    };
  }
}

export const rateLimiter = new RateLimiter();
