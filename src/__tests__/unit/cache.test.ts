/**
 * Unit tests for cache.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Cache, createCacheKey } from "../../lib/cache.js";

describe("cache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Cache", () => {
    describe("get/set", () => {
      it("should store and retrieve values", () => {
        const cache = new Cache<string>();

        cache.set("key", "value");
        expect(cache.get("key")).toBe("value");
      });

      it("should return undefined for missing keys", () => {
        const cache = new Cache<string>();
        expect(cache.get("nonexistent")).toBeUndefined();
      });

      it("should overwrite existing values", () => {
        const cache = new Cache<string>();

        cache.set("key", "value1");
        cache.set("key", "value2");

        expect(cache.get("key")).toBe("value2");
      });

      it("should track hit/miss stats", () => {
        const cache = new Cache<string>();

        cache.set("key", "value");
        cache.get("key"); // hit
        cache.get("missing"); // miss

        const stats = cache.getStats();
        expect(stats.hits).toBe(1);
        expect(stats.misses).toBe(1);
        expect(stats.sets).toBe(1);
      });
    });

    describe("TTL expiration", () => {
      it("should return undefined for expired entries", () => {
        const cache = new Cache<string>({ defaultTtlMs: 1000 });

        cache.set("key", "value");
        expect(cache.get("key")).toBe("value");

        vi.advanceTimersByTime(1001);
        expect(cache.get("key")).toBeUndefined();
      });

      it("should use custom TTL when provided", () => {
        const cache = new Cache<string>({ defaultTtlMs: 10000 });

        cache.set("key", "value", 500);

        vi.advanceTimersByTime(501);
        expect(cache.get("key")).toBeUndefined();
      });

      it("should track expiration stats", () => {
        const cache = new Cache<string>({ defaultTtlMs: 1000 });

        cache.set("key", "value");
        vi.advanceTimersByTime(1001);
        cache.get("key"); // triggers expiration

        const stats = cache.getStats();
        expect(stats.expirations).toBe(1);
      });
    });

    describe("has", () => {
      it("should return true for existing keys", () => {
        const cache = new Cache<string>();

        cache.set("key", "value");
        expect(cache.has("key")).toBe(true);
      });

      it("should return false for missing keys", () => {
        const cache = new Cache<string>();
        expect(cache.has("missing")).toBe(false);
      });

      it("should return false for expired keys", () => {
        const cache = new Cache<string>({ defaultTtlMs: 1000 });

        cache.set("key", "value");
        vi.advanceTimersByTime(1001);

        expect(cache.has("key")).toBe(false);
      });
    });

    describe("delete", () => {
      it("should remove entry and return true", () => {
        const cache = new Cache<string>();

        cache.set("key", "value");
        expect(cache.delete("key")).toBe(true);
        expect(cache.get("key")).toBeUndefined();
      });

      it("should return false for missing key", () => {
        const cache = new Cache<string>();
        expect(cache.delete("missing")).toBe(false);
      });

      it("should track delete stats", () => {
        const cache = new Cache<string>();

        cache.set("key", "value");
        cache.delete("key");

        expect(cache.getStats().deletes).toBe(1);
      });
    });

    describe("clear", () => {
      it("should remove all entries", () => {
        const cache = new Cache<string>();

        cache.set("key1", "value1");
        cache.set("key2", "value2");
        cache.clear();

        expect(cache.size).toBe(0);
        expect(cache.get("key1")).toBeUndefined();
        expect(cache.get("key2")).toBeUndefined();
      });
    });

    describe("getOrSet", () => {
      it("should return cached value if exists", async () => {
        const cache = new Cache<string>();
        const factory = vi.fn<[], Promise<string>>().mockResolvedValue("new-value");

        cache.set("key", "cached-value");
        const result = await cache.getOrSet("key", factory);

        expect(result).toBe("cached-value");
        expect(factory).not.toHaveBeenCalled();
      });

      it("should call factory and cache result if missing", async () => {
        const cache = new Cache<string>();
        const factory = vi.fn<[], Promise<string>>().mockResolvedValue("new-value");

        const result = await cache.getOrSet("key", factory);

        expect(result).toBe("new-value");
        expect(factory).toHaveBeenCalledTimes(1);
        expect(cache.get("key")).toBe("new-value");
      });

      it("should use custom TTL", async () => {
        const cache = new Cache<string>({ defaultTtlMs: 10000 });
        const factory = vi.fn<[], Promise<string>>().mockResolvedValue("value");

        await cache.getOrSet("key", factory, 500);

        vi.advanceTimersByTime(501);
        expect(cache.get("key")).toBeUndefined();
      });
    });

    describe("maxEntries eviction", () => {
      it("should evict oldest entry when at capacity", () => {
        const cache = new Cache<string>({ maxEntries: 3 });

        cache.set("key1", "value1");
        vi.advanceTimersByTime(10);
        cache.set("key2", "value2");
        vi.advanceTimersByTime(10);
        cache.set("key3", "value3");
        vi.advanceTimersByTime(10);
        cache.set("key4", "value4"); // Should evict key1

        expect(cache.size).toBe(3);
        expect(cache.get("key1")).toBeUndefined();
        expect(cache.get("key2")).toBe("value2");
        expect(cache.get("key4")).toBe("value4");
      });

      it("should track eviction stats", () => {
        const cache = new Cache<string>({ maxEntries: 2 });

        cache.set("key1", "value1");
        vi.advanceTimersByTime(10);
        cache.set("key2", "value2");
        vi.advanceTimersByTime(10);
        cache.set("key3", "value3");

        expect(cache.getStats().evictions).toBe(1);
      });
    });

    describe("pruneExpired", () => {
      it("should remove all expired entries", () => {
        const cache = new Cache<string>({ defaultTtlMs: 1000 });

        cache.set("key1", "value1");
        cache.set("key2", "value2");

        vi.advanceTimersByTime(1001);

        const pruned = cache.pruneExpired();

        expect(pruned).toBe(2);
        expect(cache.size).toBe(0);
      });
    });

    describe("keys", () => {
      it("should return all keys", () => {
        const cache = new Cache<string>();

        cache.set("key1", "value1");
        cache.set("key2", "value2");

        const keys = cache.keys();
        expect(keys).toContain("key1");
        expect(keys).toContain("key2");
        expect(keys.length).toBe(2);
      });
    });

    describe("getStats", () => {
      it("should return comprehensive stats", () => {
        const cache = new Cache<string>({ name: "test" });

        cache.set("key", "value");
        cache.get("key");
        cache.get("missing");

        const stats = cache.getStats();

        expect(stats.hits).toBe(1);
        expect(stats.misses).toBe(1);
        expect(stats.sets).toBe(1);
        expect(stats.size).toBe(1);
        expect(stats.hitRate).toBe(0.5);
      });

      it("should calculate hitRate correctly", () => {
        const cache = new Cache<string>();

        expect(cache.getStats().hitRate).toBe(0); // No requests

        cache.set("key", "value");
        cache.get("key");
        cache.get("key");
        cache.get("key");
        cache.get("missing");

        expect(cache.getStats().hitRate).toBe(0.75); // 3 hits, 1 miss
      });
    });

    describe("resetStats", () => {
      it("should reset all statistics", () => {
        const cache = new Cache<string>();

        cache.set("key", "value");
        cache.get("key");
        cache.delete("key");

        cache.resetStats();

        const stats = cache.getStats();
        expect(stats.hits).toBe(0);
        expect(stats.misses).toBe(0);
        expect(stats.sets).toBe(0);
        expect(stats.deletes).toBe(0);
      });
    });
  });

  describe("createCacheKey", () => {
    it("should join parts with colons", () => {
      expect(createCacheKey("a", "b", "c")).toBe("a:b:c");
    });

    it("should convert numbers and booleans to strings", () => {
      expect(createCacheKey("key", 123, true)).toBe("key:123:true");
    });

    it("should filter out null and undefined", () => {
      expect(createCacheKey("a", null, "b", undefined, "c")).toBe("a:b:c");
    });

    it("should handle empty parts", () => {
      expect(createCacheKey()).toBe("");
    });
  });
});
