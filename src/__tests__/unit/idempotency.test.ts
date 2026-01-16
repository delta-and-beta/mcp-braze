/**
 * Unit tests for idempotency.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  IdempotencyStore,
  generateIdempotencyKey,
  createIdempotencyKey,
} from "../../lib/idempotency.js";

describe("idempotency", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("IdempotencyStore", () => {
    describe("start", () => {
      it("should start tracking a new key", () => {
        const store = new IdempotencyStore();

        expect(store.start("key1")).toBe(true);
        expect(store.check("key1")).not.toBeNull();
        expect(store.check("key1")?.status).toBe("pending");
      });

      it("should reject duplicate keys", () => {
        const store = new IdempotencyStore();

        expect(store.start("key1")).toBe(true);
        expect(store.start("key1")).toBe(false);

        const stats = store.getStats();
        expect(stats.duplicatesBlocked).toBe(1);
      });

      it("should allow reusing key after TTL expires", () => {
        const store = new IdempotencyStore({ ttlMs: 1000 });

        expect(store.start("key1")).toBe(true);

        vi.advanceTimersByTime(1001);

        expect(store.start("key1")).toBe(true);
      });
    });

    describe("check", () => {
      it("should return null for missing key", () => {
        const store = new IdempotencyStore();
        expect(store.check("nonexistent")).toBeNull();
      });

      it("should return entry for existing key", () => {
        const store = new IdempotencyStore();

        store.start("key1");
        const entry = store.check("key1");

        expect(entry).not.toBeNull();
        expect(entry?.key).toBe("key1");
        expect(entry?.status).toBe("pending");
        expect(entry?.attempts).toBe(1);
      });

      it("should return null for expired key", () => {
        const store = new IdempotencyStore({ ttlMs: 1000 });

        store.start("key1");

        vi.advanceTimersByTime(1001);

        expect(store.check("key1")).toBeNull();
      });
    });

    describe("recordRetry", () => {
      it("should increment attempt count", () => {
        const store = new IdempotencyStore();

        store.start("key1");
        store.recordRetry("key1");
        store.recordRetry("key1");

        const entry = store.check("key1");
        expect(entry?.attempts).toBe(3);
      });

      it("should not throw for non-existent key", () => {
        const store = new IdempotencyStore();
        expect(() => store.recordRetry("nonexistent")).not.toThrow();
      });
    });

    describe("complete", () => {
      it("should mark entry as completed", () => {
        const store = new IdempotencyStore();

        store.start("key1");
        store.complete("key1", { result: "success" });

        const entry = store.check("key1");
        expect(entry?.status).toBe("completed");
        expect(entry?.result).toEqual({ result: "success" });
        expect(entry?.completedAt).toBeDefined();
      });

      it("should not throw for non-existent key", () => {
        const store = new IdempotencyStore();
        expect(() => store.complete("nonexistent")).not.toThrow();
      });
    });

    describe("fail", () => {
      it("should mark entry as failed with error message", () => {
        const store = new IdempotencyStore();

        store.start("key1");
        store.fail("key1", new Error("test error"));

        const entry = store.check("key1");
        expect(entry?.status).toBe("failed");
        expect(entry?.error).toBe("test error");
        expect(entry?.completedAt).toBeDefined();
      });

      it("should accept string error", () => {
        const store = new IdempotencyStore();

        store.start("key1");
        store.fail("key1", "string error");

        expect(store.check("key1")?.error).toBe("string error");
      });
    });

    describe("remove", () => {
      it("should remove entry", () => {
        const store = new IdempotencyStore();

        store.start("key1");
        expect(store.remove("key1")).toBe(true);
        expect(store.check("key1")).toBeNull();
      });

      it("should return false for missing key", () => {
        const store = new IdempotencyStore();
        expect(store.remove("nonexistent")).toBe(false);
      });
    });

    describe("getStats", () => {
      it("should return comprehensive stats", () => {
        const store = new IdempotencyStore();

        store.start("key1");
        store.complete("key1");

        store.start("key2");
        store.fail("key2", "test failure");

        store.start("key3");

        const stats = store.getStats();

        expect(stats.total).toBe(3);
        expect(stats.completed).toBe(1);
        expect(stats.failed).toBe(1);
        expect(stats.pending).toBe(1);
      });
    });

    describe("resetStats", () => {
      it("should reset duplicatesBlocked counter", () => {
        const store = new IdempotencyStore();

        store.start("key1");
        store.start("key1"); // Blocked

        expect(store.getStats().duplicatesBlocked).toBe(1);

        store.resetStats();

        expect(store.getStats().duplicatesBlocked).toBe(0);
      });
    });

    describe("clear", () => {
      it("should remove all entries", () => {
        const store = new IdempotencyStore();

        store.start("key1");
        store.start("key2");
        store.start("key3");

        store.clear();

        expect(store.getStats().total).toBe(0);
      });
    });

    describe("maxEntries eviction", () => {
      it("should evict oldest entry when at capacity", () => {
        const store = new IdempotencyStore({ maxEntries: 3 });

        store.start("key1");
        vi.advanceTimersByTime(10);
        store.start("key2");
        vi.advanceTimersByTime(10);
        store.start("key3");
        vi.advanceTimersByTime(10);
        store.start("key4"); // Should evict key1

        expect(store.check("key1")).toBeNull();
        expect(store.check("key2")).not.toBeNull();
        expect(store.check("key4")).not.toBeNull();
        expect(store.getStats().total).toBe(3);
      });
    });
  });

  describe("generateIdempotencyKey", () => {
    it("should generate unique keys", () => {
      const key1 = generateIdempotencyKey();
      const key2 = generateIdempotencyKey();

      expect(key1).not.toBe(key2);
    });

    it("should generate valid UUID format", () => {
      const key = generateIdempotencyKey();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      expect(key).toMatch(uuidRegex);
    });
  });

  describe("createIdempotencyKey", () => {
    it("should create deterministic key from operation and params", () => {
      const key1 = createIdempotencyKey("createUser", { name: "test", id: 1 });
      const key2 = createIdempotencyKey("createUser", { name: "test", id: 1 });

      expect(key1).toBe(key2);
    });

    it("should create different keys for different params", () => {
      const key1 = createIdempotencyKey("createUser", { name: "test1" });
      const key2 = createIdempotencyKey("createUser", { name: "test2" });

      expect(key1).not.toBe(key2);
    });

    it("should create different keys for different operations", () => {
      const key1 = createIdempotencyKey("createUser", { name: "test" });
      const key2 = createIdempotencyKey("updateUser", { name: "test" });

      expect(key1).not.toBe(key2);
    });

    it("should be consistent regardless of param order", () => {
      const key1 = createIdempotencyKey("op", { a: 1, b: 2, c: 3 });
      const key2 = createIdempotencyKey("op", { c: 3, a: 1, b: 2 });

      expect(key1).toBe(key2);
    });

    it("should include operation name in key", () => {
      const key = createIdempotencyKey("myOperation", { id: 1 });
      expect(key).toContain("myOperation");
    });
  });
});
