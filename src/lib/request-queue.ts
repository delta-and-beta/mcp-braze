/**
 * Request queue with concurrency control
 * Prevents overwhelming APIs with too many concurrent requests
 */

import { logger } from "./logger.js";

export interface QueueOptions {
  /** Maximum concurrent requests (default: 10) */
  maxConcurrency?: number;
  /** Queue name for logging (default: "default") */
  name?: string;
  /** Maximum queue size before rejecting (default: 1000) */
  maxQueueSize?: number;
}

export interface QueueStats {
  pending: number;
  active: number;
  completed: number;
  failed: number;
  rejected: number;
  maxConcurrencyReached: number;
}

interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  enqueuedAt: number;
}

const DEFAULT_OPTIONS: Required<QueueOptions> = {
  maxConcurrency: 10,
  name: "default",
  maxQueueSize: 1000,
};

export class RequestQueue {
  private queue: QueuedRequest<unknown>[] = [];
  private activeCount = 0;
  private readonly options: Required<QueueOptions>;

  // Stats
  private completed = 0;
  private failed = 0;
  private rejected = 0;
  private maxConcurrencyReached = 0;

  constructor(options: QueueOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Add a request to the queue
   * Returns a promise that resolves when the request completes
   */
  async enqueue<T>(execute: () => Promise<T>): Promise<T> {
    // Check queue size limit
    if (this.queue.length >= this.options.maxQueueSize) {
      this.rejected++;
      throw new Error(
        `Request queue '${this.options.name}' is full (${this.options.maxQueueSize} pending requests)`
      );
    }

    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        execute: execute as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
        enqueuedAt: Date.now(),
      });

      this.processQueue();
    });
  }

  /**
   * Process the queue, executing requests up to maxConcurrency
   */
  private processQueue(): void {
    while (this.activeCount < this.options.maxConcurrency && this.queue.length > 0) {
      const request = this.queue.shift();
      if (!request) break;

      this.activeCount++;
      if (this.activeCount === this.options.maxConcurrency) {
        this.maxConcurrencyReached++;
      }

      const waitTime = Date.now() - request.enqueuedAt;
      if (waitTime > 100) {
        logger.debug("Request dequeued after wait", {
          queue: this.options.name,
          waitMs: waitTime,
          pending: this.queue.length,
          active: this.activeCount,
        });
      }

      this.executeRequest(request);
    }
  }

  /**
   * Execute a single request and handle completion
   */
  private async executeRequest(request: QueuedRequest<unknown>): Promise<void> {
    try {
      const result = await request.execute();
      this.completed++;
      request.resolve(result);
    } catch (error) {
      this.failed++;
      request.reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      this.activeCount--;
      this.processQueue();
    }
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    return {
      pending: this.queue.length,
      active: this.activeCount,
      completed: this.completed,
      failed: this.failed,
      rejected: this.rejected,
      maxConcurrencyReached: this.maxConcurrencyReached,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.completed = 0;
    this.failed = 0;
    this.rejected = 0;
    this.maxConcurrencyReached = 0;
  }

  /**
   * Clear all pending requests (rejects them with an error)
   */
  clear(): number {
    const count = this.queue.length;
    const error = new Error(`Queue '${this.options.name}' cleared`);

    for (const request of this.queue) {
      this.rejected++;
      request.reject(error);
    }
    this.queue = [];

    logger.info("Request queue cleared", {
      queue: this.options.name,
      requestsCleared: count,
    });

    return count;
  }

  /**
   * Get the number of pending requests
   */
  get pending(): number {
    return this.queue.length;
  }

  /**
   * Get the number of active requests
   */
  get active(): number {
    return this.activeCount;
  }

  /**
   * Check if the queue is idle (no pending or active requests)
   */
  get isIdle(): boolean {
    return this.queue.length === 0 && this.activeCount === 0;
  }

  /**
   * Wait for the queue to become idle
   * @param timeoutMs Maximum time to wait in milliseconds (default: 30000)
   */
  waitUntilIdle(timeoutMs = 30000): Promise<void> {
    const startTime = Date.now();
    const POLL_INTERVAL_MS = 50;

    return new Promise((resolve, reject) => {
      const check = (): void => {
        if (this.isIdle) {
          resolve();
          return;
        }

        if (Date.now() - startTime > timeoutMs) {
          reject(
            new Error(
              `Queue '${this.options.name}' did not become idle within ${timeoutMs}ms`
            )
          );
          return;
        }

        setTimeout(check, POLL_INTERVAL_MS);
      };

      check();
    });
  }
}

// Global request queue for Braze API calls
// Braze allows high throughput, but we limit to prevent overwhelming
export const brazeRequestQueue = new RequestQueue({
  name: "braze-api",
  maxConcurrency: 20, // Braze can handle high concurrency
  maxQueueSize: 500,
});

/**
 * Execute a function through the default queue
 */
export async function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  return brazeRequestQueue.enqueue(fn);
}
