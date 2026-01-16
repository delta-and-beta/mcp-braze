/**
 * Request deduplication
 * Shares in-flight requests to prevent duplicate API calls
 * Adapted from mcp-airtable gold standard
 */

import { logger } from "./logger.js";

export interface DeduplicationOptions {
  /** Name for logging (default: "default") */
  name?: string;
  /** Cleanup interval in ms (default: 60000) */
  cleanupIntervalMs?: number;
}

export interface DeduplicationStats {
  activeRequests: number;
  deduplicated: number;
  completed: number;
  failed: number;
}

interface InFlightRequest<T> {
  promise: Promise<T>;
  subscriberCount: number;
  startedAt: number;
}

const DEFAULT_OPTIONS: Required<DeduplicationOptions> = {
  name: "default",
  cleanupIntervalMs: 60000,
};

export class RequestDeduplicator {
  private inFlight = new Map<string, InFlightRequest<unknown>>();
  private readonly options: Required<DeduplicationOptions>;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  // Stats
  private deduplicated = 0;
  private completed = 0;
  private failed = 0;

  constructor(options: DeduplicationOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.startCleanup();
  }

  /**
   * Execute a request, or return existing in-flight promise if one exists
   */
  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // Check for existing in-flight request
    const existing = this.inFlight.get(key);
    if (existing) {
      existing.subscriberCount++;
      this.deduplicated++;
      logger.debug("Request deduplicated", {
        deduplicator: this.options.name,
        key,
        subscribers: existing.subscriberCount,
        inFlightMs: Date.now() - existing.startedAt,
      });
      return existing.promise as Promise<T>;
    }

    // Create new request
    const request: InFlightRequest<T> = {
      promise: this.executeWithCleanup(key, fn),
      subscriberCount: 1,
      startedAt: Date.now(),
    };

    this.inFlight.set(key, request as InFlightRequest<unknown>);
    return request.promise;
  }

  /**
   * Execute the function and clean up when done
   */
  private async executeWithCleanup<T>(key: string, fn: () => Promise<T>): Promise<T> {
    try {
      const result = await fn();
      this.completed++;
      return result;
    } catch (error) {
      this.failed++;
      throw error;
    } finally {
      this.inFlight.delete(key);
    }
  }

  /**
   * Check if a request is currently in flight
   */
  isInFlight(key: string): boolean {
    return this.inFlight.has(key);
  }

  /**
   * Get the number of active in-flight requests
   */
  get activeCount(): number {
    return this.inFlight.size;
  }

  /**
   * Get statistics
   */
  getStats(): DeduplicationStats {
    return {
      activeRequests: this.inFlight.size,
      deduplicated: this.deduplicated,
      completed: this.completed,
      failed: this.failed,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.deduplicated = 0;
    this.completed = 0;
    this.failed = 0;
  }

  /**
   * Start periodic cleanup of stale entries (shouldn't happen, but safety net)
   */
  private startCleanup(): void {
    if (this.cleanupTimer) return;

    const STALE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      const staleThreshold = now - STALE_THRESHOLD_MS;
      const staleKeys: string[] = [];

      for (const [key, request] of this.inFlight) {
        if (request.startedAt < staleThreshold) {
          staleKeys.push(key);
          logger.warn("Cleaned stale in-flight request", {
            deduplicator: this.options.name,
            key,
            ageMs: now - request.startedAt,
          });
        }
      }

      for (const key of staleKeys) {
        this.inFlight.delete(key);
      }

      if (staleKeys.length > 0) {
        logger.info("Deduplicator cleanup completed", {
          deduplicator: this.options.name,
          cleaned: staleKeys.length,
        });
      }
    }, this.options.cleanupIntervalMs);

    // Don't prevent process exit
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop the cleanup timer
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Clear all in-flight requests (for testing)
   */
  clear(): void {
    this.inFlight.clear();
  }
}

// Global deduplicator for Braze API calls
export const brazeDeduplicator = new RequestDeduplicator({
  name: "braze-api",
});

/**
 * Create a deduplication key from request parameters
 */
export function createDeduplicationKey(
  method: string,
  endpoint: string,
  params?: Record<string, unknown>
): string {
  const parts = [method.toUpperCase(), endpoint];

  if (params && Object.keys(params).length > 0) {
    // Sort keys for consistent ordering
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${JSON.stringify(params[key])}`)
      .join("&");
    parts.push(sortedParams);
  }

  return parts.join(":");
}

/**
 * Deduplicate a request using the global deduplicator
 */
export async function deduplicate<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  return brazeDeduplicator.execute(key, fn);
}
