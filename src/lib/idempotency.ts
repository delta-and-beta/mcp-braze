/**
 * Idempotency key tracking for safe retries
 * Prevents duplicate operations during retries
 * Adapted from mcp-airtable gold standard
 */

import { randomUUID } from "crypto";
import { logger } from "./logger.js";

export interface IdempotencyEntry {
  key: string;
  status: "pending" | "completed" | "failed";
  createdAt: number;
  completedAt?: number;
  result?: unknown;
  error?: string;
  attempts: number;
}

export interface IdempotencyOptions {
  /** TTL for entries in milliseconds (default: 24 hours) */
  ttlMs?: number;
  /** Maximum entries to store (default: 10000) */
  maxEntries?: number;
  /** Name for logging (default: "default") */
  name?: string;
}

export interface IdempotencyStats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  duplicatesBlocked: number;
}

const DEFAULT_OPTIONS: Required<IdempotencyOptions> = {
  ttlMs: 24 * 60 * 60 * 1000, // 24 hours
  maxEntries: 10000,
  name: "default",
};

export class IdempotencyStore {
  private entries = new Map<string, IdempotencyEntry>();
  private readonly options: Required<IdempotencyOptions>;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  // Stats
  private duplicatesBlocked = 0;

  constructor(options: IdempotencyOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.startCleanup();
  }

  /**
   * Check if an operation with this key has already been processed
   * Returns the existing entry if found, null otherwise
   */
  check(key: string): IdempotencyEntry | null {
    const entry = this.entries.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.createdAt > this.options.ttlMs) {
      this.entries.delete(key);
      return null;
    }

    return entry;
  }

  /**
   * Start tracking a new operation
   * Returns false if the key already exists (duplicate)
   */
  start(key: string): boolean {
    const existing = this.check(key);

    if (existing) {
      this.duplicatesBlocked++;
      logger.warn("Duplicate idempotency key blocked", {
        store: this.options.name,
        key,
        existingStatus: existing.status,
        existingAttempts: existing.attempts,
      });
      return false;
    }

    // Evict oldest if at capacity
    if (this.entries.size >= this.options.maxEntries) {
      this.evictOldest();
    }

    this.entries.set(key, {
      key,
      status: "pending",
      createdAt: Date.now(),
      attempts: 1,
    });

    return true;
  }

  /**
   * Record a retry attempt for an existing key
   */
  recordRetry(key: string): void {
    const entry = this.entries.get(key);
    if (!entry) return;

    entry.attempts++;
    logger.debug("Idempotency retry recorded", {
      store: this.options.name,
      key,
      attempts: entry.attempts,
    });
  }

  /**
   * Mark an operation as completed
   */
  complete(key: string, result?: unknown): void {
    const entry = this.entries.get(key);
    if (!entry) return;

    entry.status = "completed";
    entry.completedAt = Date.now();
    entry.result = result;

    logger.debug("Idempotency key completed", {
      store: this.options.name,
      key,
      attempts: entry.attempts,
      durationMs: entry.completedAt - entry.createdAt,
    });
  }

  /**
   * Mark an operation as failed
   */
  fail(key: string, error?: Error | string): void {
    const entry = this.entries.get(key);
    if (!entry) return;

    entry.status = "failed";
    entry.completedAt = Date.now();
    if (error !== undefined) {
      entry.error = error instanceof Error ? error.message : error;
    }

    logger.debug("Idempotency key failed", {
      store: this.options.name,
      key,
      attempts: entry.attempts,
      error: entry.error,
    });
  }

  /**
   * Remove an entry (e.g., to allow retry after failure)
   */
  remove(key: string): boolean {
    return this.entries.delete(key);
  }

  /**
   * Get statistics
   */
  getStats(): IdempotencyStats {
    let pending = 0;
    let completed = 0;
    let failed = 0;

    for (const entry of this.entries.values()) {
      switch (entry.status) {
        case "pending":
          pending++;
          break;
        case "completed":
          completed++;
          break;
        case "failed":
          failed++;
          break;
      }
    }

    return {
      total: this.entries.size,
      pending,
      completed,
      failed,
      duplicatesBlocked: this.duplicatesBlocked,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.duplicatesBlocked = 0;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries.clear();
  }

  /**
   * Start periodic cleanup of expired entries
   */
  private startCleanup(): void {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      this.pruneExpired();
    }, Math.min(this.options.ttlMs / 4, 60 * 60 * 1000)); // At most hourly

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
   * Remove expired entries
   */
  private pruneExpired(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.entries) {
      if (now - entry.createdAt > this.options.ttlMs) {
        this.entries.delete(key);
        pruned++;
      }
    }

    if (pruned > 0) {
      logger.debug("Idempotency entries pruned", {
        store: this.options.name,
        pruned,
        remaining: this.entries.size,
      });
    }

    return pruned;
  }

  /**
   * Evict the oldest entry
   */
  private evictOldest(): void {
    if (this.entries.size === 0) return;

    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.entries) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.entries.delete(oldestKey);
    }
  }
}

// Global idempotency store
export const idempotencyStore = new IdempotencyStore({
  name: "braze-api",
});

/**
 * Generate a new idempotency key
 */
export function generateIdempotencyKey(): string {
  return randomUUID();
}

/**
 * Create an idempotency key from request parameters
 * Useful for deterministic keys based on request content
 */
export function createIdempotencyKey(
  operation: string,
  params: Record<string, unknown>
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${JSON.stringify(params[key])}`)
    .join("&");

  // Create a simple hash
  const str = `${operation}:${sortedParams}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return `${operation}-${Math.abs(hash).toString(16)}`;
}
