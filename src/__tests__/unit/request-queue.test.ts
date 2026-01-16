/**
 * Unit tests for request-queue.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RequestQueue } from "../../lib/request-queue.js";

/** Creates a promise with an externally accessible resolve function */
function createControllablePromise(): {
  promise: Promise<void>;
  resolve: () => void;
} {
  let resolve: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve: resolve! };
}

describe("request-queue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("RequestQueue", () => {
    describe("enqueue", () => {
      it("should execute and return result", async () => {
        const queue = new RequestQueue();
        const fn = vi.fn().mockResolvedValue("result");

        const result = await queue.enqueue(fn);

        expect(result).toBe("result");
        expect(fn).toHaveBeenCalledTimes(1);
      });

      it("should propagate errors", async () => {
        const queue = new RequestQueue();
        const fn = vi.fn().mockRejectedValue(new Error("test error"));

        await expect(queue.enqueue(fn)).rejects.toThrow("test error");
      });

      it("should respect maxConcurrency", async () => {
        const queue = new RequestQueue({ maxConcurrency: 2 });
        const resolvers: Array<() => void> = [];
        const fn = vi.fn(
          () =>
            new Promise<void>((resolve) => {
              resolvers.push(resolve);
            })
        );

        // Queue 4 requests
        const promises = [
          queue.enqueue(fn),
          queue.enqueue(fn),
          queue.enqueue(fn),
          queue.enqueue(fn),
        ];

        // Only 2 should be executing
        expect(fn).toHaveBeenCalledTimes(2);
        expect(queue.active).toBe(2);
        expect(queue.pending).toBe(2);

        // Resolve first batch
        resolvers[0]();
        resolvers[1]();

        await Promise.all(promises.slice(0, 2));

        // Should start next batch
        expect(fn).toHaveBeenCalledTimes(4);
        expect(queue.active).toBe(2);

        resolvers[2]();
        resolvers[3]();

        await Promise.all(promises.slice(2));
      });

      it("should reject when queue is full", async () => {
        const queue = new RequestQueue({ maxConcurrency: 1, maxQueueSize: 2 });
        const neverResolves = (): Promise<void> => new Promise(() => {});

        queue.enqueue(neverResolves); // Executing
        queue.enqueue(neverResolves); // Pending 1
        queue.enqueue(neverResolves); // Pending 2

        await expect(queue.enqueue(neverResolves)).rejects.toThrow("queue");
      });
    });

    describe("pending", () => {
      it("should return number of queued requests", () => {
        const queue = new RequestQueue({ maxConcurrency: 1 });
        const neverResolves = (): Promise<void> => new Promise(() => {});

        expect(queue.pending).toBe(0);

        queue.enqueue(neverResolves);
        expect(queue.pending).toBe(0); // First one is executing

        queue.enqueue(neverResolves);
        queue.enqueue(neverResolves);
        expect(queue.pending).toBe(2);
      });
    });

    describe("active", () => {
      it("should return number of executing requests", async () => {
        const queue = new RequestQueue({ maxConcurrency: 3 });
        const controllable1 = createControllablePromise();
        const controllable2 = createControllablePromise();
        const controllable3 = createControllablePromise();

        expect(queue.active).toBe(0);

        const promise1 = queue.enqueue(() => controllable1.promise);
        const promise2 = queue.enqueue(() => controllable2.promise);
        queue.enqueue(() => controllable3.promise);

        expect(queue.active).toBe(3);

        controllable1.resolve();
        await promise1;
        expect(queue.active).toBe(2);

        controllable2.resolve();
        await promise2;
        expect(queue.active).toBe(1);
      });
    });

    describe("isIdle", () => {
      it("should return true when no pending or active requests", async () => {
        const queue = new RequestQueue();

        expect(queue.isIdle).toBe(true);

        const promise = queue.enqueue(() => Promise.resolve());
        expect(queue.isIdle).toBe(false);

        await promise;
        expect(queue.isIdle).toBe(true);
      });
    });

    describe("waitUntilIdle", () => {
      it("should resolve immediately if already idle", async () => {
        const queue = new RequestQueue();

        await queue.waitUntilIdle(100);
      });

      it("should wait for queue to become idle", async () => {
        const queue = new RequestQueue();
        const { promise, resolve } = createControllablePromise();

        queue.enqueue(() => promise);

        const waitPromise = queue.waitUntilIdle(5000);
        let hasResolved = false;
        waitPromise.then(() => {
          hasResolved = true;
        });

        vi.advanceTimersByTime(100);
        expect(hasResolved).toBe(false);

        resolve();
        await vi.runAllTimersAsync();

        expect(hasResolved).toBe(true);
      });

      it("should reject if timeout exceeded", async () => {
        vi.useRealTimers(); // Use real timers for this test

        const queue = new RequestQueue({ name: "test" });
        const neverResolves = (): Promise<void> => new Promise(() => {});
        queue.enqueue(neverResolves);

        await expect(queue.waitUntilIdle(100)).rejects.toThrow("100ms");

        vi.useFakeTimers(); // Restore fake timers
      });
    });

    describe("clear", () => {
      it("should reject all pending requests", async () => {
        const queue = new RequestQueue({ maxConcurrency: 1 });
        const neverResolves = (): Promise<void> => new Promise(() => {});

        queue.enqueue(neverResolves); // Executing

        const pending1 = queue.enqueue(neverResolves);
        const pending2 = queue.enqueue(neverResolves);

        const count = queue.clear();

        expect(count).toBe(2);
        await expect(pending1).rejects.toThrow("cleared");
        await expect(pending2).rejects.toThrow("cleared");
      });
    });

    describe("getStats", () => {
      it("should return comprehensive stats", async () => {
        const queue = new RequestQueue();

        await queue.enqueue(() => Promise.resolve());
        await expect(
          queue.enqueue(() => Promise.reject(new Error("test")))
        ).rejects.toThrow();

        const stats = queue.getStats();

        expect(stats.completed).toBe(1);
        expect(stats.failed).toBe(1);
        expect(stats.pending).toBe(0);
        expect(stats.active).toBe(0);
      });

      it("should track maxConcurrencyReached", () => {
        const queue = new RequestQueue({ maxConcurrency: 2 });
        const controllable1 = createControllablePromise();
        const controllable2 = createControllablePromise();

        queue.enqueue(() => controllable1.promise);
        queue.enqueue(() => controllable2.promise); // Hits max concurrency

        const stats = queue.getStats();
        expect(stats.maxConcurrencyReached).toBe(1);

        // Cleanup
        controllable1.resolve();
        controllable2.resolve();
      });

      it("should track rejected requests", async () => {
        const queue = new RequestQueue({ maxConcurrency: 1, maxQueueSize: 1 });
        const { promise, resolve } = createControllablePromise();

        queue.enqueue(() => promise); // Executing (slot 1 of 1 concurrency)
        queue.enqueue(() => Promise.resolve()); // Pending (slot 1 of 1 queue)

        // Now queue is full, next should reject
        await expect(queue.enqueue(() => Promise.resolve())).rejects.toThrow();

        expect(queue.getStats().rejected).toBe(1);

        // Cleanup
        resolve();
      });
    });

    describe("resetStats", () => {
      it("should reset all statistics", async () => {
        const queue = new RequestQueue();

        await queue.enqueue(() => Promise.resolve());

        queue.resetStats();

        const stats = queue.getStats();
        expect(stats.completed).toBe(0);
        expect(stats.failed).toBe(0);
        expect(stats.rejected).toBe(0);
        expect(stats.maxConcurrencyReached).toBe(0);
      });
    });
  });
});
