/**
 * Simple in-memory sliding window rate limiter.
 * Tracks request timestamps and enforces a maximum request count per time window.
 */

import { RateLimitError } from "./errors.js";

const DEFAULT_REQUESTS_PER_MINUTE = 60;
const MS_PER_MINUTE = 60 * 1000;

export class RateLimiter {
  private readonly requests = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(requestsPerMinute: number = DEFAULT_REQUESTS_PER_MINUTE) {
    this.maxRequests = requestsPerMinute;
    this.windowMs = MS_PER_MINUTE;
  }

  check(key: string): void {
    const now = Date.now();
    const timestamps = this.requests.get(key) ?? [];

    const validTimestamps = timestamps.filter(
      (time) => now - time < this.windowMs
    );

    if (validTimestamps.length >= this.maxRequests) {
      const oldestRequest = validTimestamps[0];
      const retryAfterMs = this.windowMs - (now - oldestRequest);
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${retryAfterSec}s`,
        retryAfterSec
      );
    }

    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);
  }

  reset(key: string): void {
    this.requests.delete(key);
  }

  resetAll(): void {
    this.requests.clear();
  }

  getStats(): { keys: number; totalRequests: number } {
    let totalRequests = 0;
    for (const timestamps of this.requests.values()) {
      totalRequests += timestamps.length;
    }
    return { keys: this.requests.size, totalRequests };
  }
}

function parseRequestsPerMinute(envValue: string | undefined): number {
  if (!envValue) {
    return DEFAULT_REQUESTS_PER_MINUTE;
  }
  const parsed = parseInt(envValue, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return DEFAULT_REQUESTS_PER_MINUTE;
  }
  return parsed;
}

// Global rate limiter instance - Braze API has a 250k requests/hour limit
// Default to 60 requests/minute for safety
export const rateLimiter = new RateLimiter(
  parseRequestsPerMinute(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE)
);
