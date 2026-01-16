/**
 * Unit tests for deduplication.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";
import {
  RequestDeduplicator,
  createDeduplicationKey,
} from "../../lib/deduplication.js";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("deduplication", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("RequestDeduplicator", () => {
    describe("execute", () => {
      it("should execute function and return result", async () => {
        const dedup = new RequestDeduplicator();
        const fn: Mock<() => Promise<string>> = vi
          .fn()
          .mockResolvedValue("result");

        const result = await dedup.execute("key", fn);

        expect(result).toBe("result");
        expect(fn).toHaveBeenCalledTimes(1);
      });

      it("should share in-flight requests for same key", async () => {
        const dedup = new RequestDeduplicator();
        const deferred = createDeferred<string>();
        const fn = vi.fn(() => deferred.promise);

        const promise1 = dedup.execute("key", fn);
        const promise2 = dedup.execute("key", fn);

        expect(fn).toHaveBeenCalledTimes(1);

        deferred.resolve("shared-result");

        const [result1, result2] = await Promise.all([promise1, promise2]);

        expect(result1).toBe("shared-result");
        expect(result2).toBe("shared-result");
      });

      it("should track deduplicated count", async () => {
        const dedup = new RequestDeduplicator();
        const deferred = createDeferred<string>();
        const fn = vi.fn(() => deferred.promise);

        const promise1 = dedup.execute("key", fn);
        const promise2 = dedup.execute("key", fn);
        const promise3 = dedup.execute("key", fn);

        deferred.resolve("result");
        await Promise.all([promise1, promise2, promise3]);

        const stats = dedup.getStats();
        expect(stats.deduplicated).toBe(2);
        expect(stats.completed).toBe(1);
      });

      it("should handle different keys independently", async () => {
        const dedup = new RequestDeduplicator();
        const fn1: Mock<() => Promise<string>> = vi
          .fn()
          .mockResolvedValue("result1");
        const fn2: Mock<() => Promise<string>> = vi
          .fn()
          .mockResolvedValue("result2");

        const [result1, result2] = await Promise.all([
          dedup.execute("key1", fn1),
          dedup.execute("key2", fn2),
        ]);

        expect(result1).toBe("result1");
        expect(result2).toBe("result2");
        expect(fn1).toHaveBeenCalledTimes(1);
        expect(fn2).toHaveBeenCalledTimes(1);
      });

      it("should allow new request after previous completes", async () => {
        const dedup = new RequestDeduplicator();
        const fn: Mock<() => Promise<string>> = vi
          .fn()
          .mockResolvedValue("result");

        await dedup.execute("key", fn);
        await dedup.execute("key", fn);

        expect(fn).toHaveBeenCalledTimes(2);
      });

      it("should propagate errors to all subscribers", async () => {
        const dedup = new RequestDeduplicator();
        const deferred = createDeferred<string>();
        const fn = vi.fn(() => deferred.promise);

        const promise1 = dedup.execute("key", fn);
        const promise2 = dedup.execute("key", fn);

        deferred.reject(new Error("test error"));

        await expect(promise1).rejects.toThrow("test error");
        await expect(promise2).rejects.toThrow("test error");

        const stats = dedup.getStats();
        expect(stats.failed).toBe(1);
      });
    });

    describe("isInFlight", () => {
      it("should return true for in-flight requests", async () => {
        const dedup = new RequestDeduplicator();
        const deferred = createDeferred<void>();
        const fn = vi.fn(() => deferred.promise);

        const promise = dedup.execute("key", fn);

        expect(dedup.isInFlight("key")).toBe(true);

        deferred.resolve(undefined);
        await promise;

        expect(dedup.isInFlight("key")).toBe(false);
      });

      it("should return false for non-existent keys", () => {
        const dedup = new RequestDeduplicator();
        expect(dedup.isInFlight("nonexistent")).toBe(false);
      });
    });

    describe("activeCount", () => {
      it("should track number of active requests", async () => {
        const dedup = new RequestDeduplicator();
        const deferreds: Array<Deferred<void>> = [];
        const fn = vi.fn(() => {
          const deferred = createDeferred<void>();
          deferreds.push(deferred);
          return deferred.promise;
        });

        const promise1 = dedup.execute("key1", fn);
        const promise2 = dedup.execute("key2", fn);

        expect(dedup.activeCount).toBe(2);

        deferreds[0].resolve(undefined);
        await promise1;

        expect(dedup.activeCount).toBe(1);

        deferreds[1].resolve(undefined);
        await promise2;

        expect(dedup.activeCount).toBe(0);
      });
    });

    describe("getStats", () => {
      it("should return comprehensive stats", async () => {
        const dedup = new RequestDeduplicator();

        await dedup.execute("key1", () => Promise.resolve("success"));
        await expect(
          dedup.execute("key2", () => Promise.reject(new Error("fail")))
        ).rejects.toThrow();

        const stats = dedup.getStats();

        expect(stats.completed).toBe(1);
        expect(stats.failed).toBe(1);
        expect(stats.activeRequests).toBe(0);
      });
    });

    describe("resetStats", () => {
      it("should reset statistics", async () => {
        const dedup = new RequestDeduplicator();

        await dedup.execute("key", () => Promise.resolve());

        dedup.resetStats();

        const stats = dedup.getStats();
        expect(stats.completed).toBe(0);
        expect(stats.deduplicated).toBe(0);
        expect(stats.failed).toBe(0);
      });
    });

    describe("clear", () => {
      it("should clear all in-flight requests", () => {
        const dedup = new RequestDeduplicator();
        const neverResolves = (): Promise<void> => new Promise(() => {});
        const fn = vi.fn(neverResolves);

        dedup.execute("key1", fn);
        dedup.execute("key2", fn);

        expect(dedup.activeCount).toBe(2);

        dedup.clear();

        expect(dedup.activeCount).toBe(0);
      });
    });
  });

  describe("createDeduplicationKey", () => {
    it("should create key from method and endpoint", () => {
      const key = createDeduplicationKey("GET", "/api/users");
      expect(key).toBe("GET:/api/users");
    });

    it("should include sorted params", () => {
      const key = createDeduplicationKey("POST", "/api/users", {
        name: "test",
        id: 123,
      });

      expect(key).toContain("POST:/api/users");
      expect(key).toContain("id=123");
      expect(key).toContain("name=\"test\"");
    });

    it("should create consistent keys regardless of param order", () => {
      const key1 = createDeduplicationKey("GET", "/api", { a: 1, b: 2, c: 3 });
      const key2 = createDeduplicationKey("GET", "/api", { c: 3, a: 1, b: 2 });

      expect(key1).toBe(key2);
    });

    it("should handle empty params", () => {
      const key1 = createDeduplicationKey("GET", "/api");
      const key2 = createDeduplicationKey("GET", "/api", {});

      expect(key1).toBe("GET:/api");
      expect(key2).toBe("GET:/api");
    });

    it("should uppercase method", () => {
      const key = createDeduplicationKey("get", "/api");
      expect(key).toBe("GET:/api");
    });
  });
});
