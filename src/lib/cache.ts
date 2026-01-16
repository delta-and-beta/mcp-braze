/**
 * TTL-based in-memory cache with size limits and statistics tracking.
 * Uses LRU-style eviction based on creation time when capacity is reached.
 */

import { logger } from "./logger.js";

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

export interface CacheOptions {
  /** Default TTL in milliseconds (default: 5 minutes) */
  defaultTtlMs?: number;
  /** Maximum number of entries (default: 1000) */
  maxEntries?: number;
  /** Name for logging (default: "default") */
  name?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  expirations: number;
  evictions: number;
  size: number;
  hitRate: number;
}

const DEFAULT_OPTIONS: Required<CacheOptions> = {
  defaultTtlMs: 5 * 60 * 1000, // 5 minutes
  maxEntries: 1000,
  name: "default",
};

export class Cache<T = unknown> {
  private entries = new Map<string, CacheEntry<T>>();
  private readonly options: Required<CacheOptions>;

  // Stats tracking
  private hits = 0;
  private misses = 0;
  private sets = 0;
  private deletes = 0;
  private expirations = 0;
  private evictions = 0;

  constructor(options: CacheOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Get a value from the cache
   * Returns undefined if not found or expired
   */
  get(key: string): T | undefined {
    const entry = this.entries.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      this.expirations++;
      this.misses++;
      logger.debug("Cache entry expired", {
        cache: this.options.name,
        key,
        age: Date.now() - entry.createdAt,
      });
      return undefined;
    }

    this.hits++;
    return entry.value;
  }

  /**
   * Set a value in the cache
   */
  set(key: string, value: T, ttlMs?: number): void {
    // Evict oldest entries if at capacity
    if (this.entries.size >= this.options.maxEntries && !this.entries.has(key)) {
      this.evictOldest();
    }

    const now = Date.now();
    const effectiveTtl = ttlMs ?? this.options.defaultTtlMs;

    this.entries.set(key, {
      value,
      expiresAt: now + effectiveTtl,
      createdAt: now,
    });

    this.sets++;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.entries.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.entries.delete(key);
      this.expirations++;
      return false;
    }

    return true;
  }

  /**
   * Delete a key from the cache
   */
  delete(key: string): boolean {
    const existed = this.entries.delete(key);
    if (existed) {
      this.deletes++;
    }
    return existed;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    const size = this.entries.size;
    this.entries.clear();
    logger.info("Cache cleared", {
      cache: this.options.name,
      entriesCleared: size,
    });
  }

  /**
   * Get or set with a factory function.
   * Note: If the factory returns undefined, it will be cached but treated as
   * a cache miss on subsequent get() calls. Use explicit null for intentional
   * empty values when caching nullable data.
   */
  async getOrSet(
    key: string,
    factory: () => Promise<T>,
    ttlMs?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttlMs);
    return value;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    // Clean up expired entries first
    this.pruneExpired();

    const totalRequests = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      deletes: this.deletes,
      expirations: this.expirations,
      evictions: this.evictions,
      size: this.entries.size,
      hitRate: totalRequests > 0 ? this.hits / totalRequests : 0,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.sets = 0;
    this.deletes = 0;
    this.expirations = 0;
    this.evictions = 0;
  }

  /**
   * Get all keys (including potentially expired ones)
   */
  keys(): string[] {
    return Array.from(this.entries.keys());
  }

  /**
   * Get the number of entries (including potentially expired ones)
   */
  get size(): number {
    return this.entries.size;
  }

  /**
   * Remove expired entries
   */
  pruneExpired(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.entries) {
      if (now > entry.expiresAt) {
        this.entries.delete(key);
        this.expirations++;
        pruned++;
      }
    }

    if (pruned > 0) {
      logger.debug("Cache pruned expired entries", {
        cache: this.options.name,
        pruned,
        remaining: this.entries.size,
      });
    }

    return pruned;
  }

  /**
   * Evict the oldest entry to make room.
   * Note: O(n) iteration - acceptable for configured maxEntries limits.
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.entries) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      this.entries.delete(oldestKey);
      this.evictions++;
      logger.debug("Cache evicted oldest entry", {
        cache: this.options.name,
        key: oldestKey,
        age: Date.now() - oldestTime,
      });
    }
  }
}

// Pre-configured cache instances
export const schemaCache = new Cache<unknown>({
  name: "schema",
  defaultTtlMs: 10 * 60 * 1000, // 10 minutes for schema data
  maxEntries: 100,
});

export const responseCache = new Cache<unknown>({
  name: "response",
  defaultTtlMs: 60 * 1000, // 1 minute for API responses
  maxEntries: 500,
});

/**
 * Create a cache key from multiple parts, filtering out null/undefined values.
 * Example: createCacheKey("user", 123, "profile") => "user:123:profile"
 */
export function createCacheKey(
  ...parts: (string | number | boolean | undefined | null)[]
): string {
  const validParts: string[] = [];

  for (const part of parts) {
    if (part !== undefined && part !== null) {
      validParts.push(String(part));
    }
  }

  return validParts.join(":");
}
