/**
 * Unit tests for rate-limiter.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RateLimiter } from "../../lib/rate-limiter.js";
import { RateLimitError } from "../../lib/errors.js";

describe("rate-limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("RateLimiter", () => {
    describe("check", () => {
      it("should allow requests within limit", () => {
        const limiter = new RateLimiter(3);

        expect(() => limiter.check("key")).not.toThrow();
        expect(() => limiter.check("key")).not.toThrow();
        expect(() => limiter.check("key")).not.toThrow();
      });

      it("should throw RateLimitError when limit exceeded", () => {
        const limiter = new RateLimiter(2);

        limiter.check("key");
        limiter.check("key");

        expect(() => limiter.check("key")).toThrow(RateLimitError);
      });

      it("should include retry-after in error", () => {
        const limiter = new RateLimiter(1);

        limiter.check("key");

        let thrownError: RateLimitError | undefined;
        try {
          limiter.check("key");
        } catch (error) {
          if (error instanceof RateLimitError) {
            thrownError = error;
          }
        }

        expect(thrownError).toBeInstanceOf(RateLimitError);
        expect(thrownError?.retryAfter).toBeDefined();
        expect(thrownError?.retryAfter).toBeGreaterThan(0);
      });

      it("should track keys independently", () => {
        const limiter = new RateLimiter(2);

        limiter.check("key1");
        limiter.check("key1");
        limiter.check("key2");
        limiter.check("key2");

        expect(() => limiter.check("key1")).toThrow(RateLimitError);
        expect(() => limiter.check("key2")).toThrow(RateLimitError);
      });

      it("should reset after window expires", () => {
        const limiter = new RateLimiter(2);

        limiter.check("key");
        limiter.check("key");

        // Advance past the 1-minute window
        vi.advanceTimersByTime(61 * 1000);

        // Should allow new requests
        expect(() => limiter.check("key")).not.toThrow();
      });

      it("should use sliding window", () => {
        const limiter = new RateLimiter(3);

        limiter.check("key"); // t=0

        vi.advanceTimersByTime(30 * 1000);
        limiter.check("key"); // t=30s

        vi.advanceTimersByTime(20 * 1000);
        limiter.check("key"); // t=50s

        // At t=50s, all 3 requests are within the window
        expect(() => limiter.check("key")).toThrow(RateLimitError);

        // Advance to t=61s - first request should expire
        vi.advanceTimersByTime(11 * 1000);

        // Should allow one more request
        expect(() => limiter.check("key")).not.toThrow();
      });
    });

    describe("reset", () => {
      it("should reset limit for specific key", () => {
        const limiter = new RateLimiter(1);

        limiter.check("key");
        expect(() => limiter.check("key")).toThrow(RateLimitError);

        limiter.reset("key");

        expect(() => limiter.check("key")).not.toThrow();
      });

      it("should not affect other keys", () => {
        const limiter = new RateLimiter(1);

        limiter.check("key1");
        limiter.check("key2");

        limiter.reset("key1");

        expect(() => limiter.check("key1")).not.toThrow();
        expect(() => limiter.check("key2")).toThrow(RateLimitError);
      });
    });

    describe("resetAll", () => {
      it("should reset all keys", () => {
        const limiter = new RateLimiter(1);

        limiter.check("key1");
        limiter.check("key2");
        limiter.check("key3");

        limiter.resetAll();

        expect(() => limiter.check("key1")).not.toThrow();
        expect(() => limiter.check("key2")).not.toThrow();
        expect(() => limiter.check("key3")).not.toThrow();
      });
    });

    describe("getStats", () => {
      it("should return number of tracked keys", () => {
        const limiter = new RateLimiter(10);

        limiter.check("key1");
        limiter.check("key2");
        limiter.check("key3");

        const stats = limiter.getStats();
        expect(stats.keys).toBe(3);
      });

      it("should return total request count", () => {
        const limiter = new RateLimiter(10);

        limiter.check("key1");
        limiter.check("key1");
        limiter.check("key2");

        const stats = limiter.getStats();
        expect(stats.totalRequests).toBe(3);
      });

      it("should update after window expiration", () => {
        const limiter = new RateLimiter(10);

        limiter.check("key1");
        limiter.check("key1");

        vi.advanceTimersByTime(61 * 1000);

        limiter.check("key1"); // Triggers cleanup

        const stats = limiter.getStats();
        expect(stats.totalRequests).toBe(1); // Old requests expired
      });
    });

    describe("constructor defaults", () => {
      it("should default to 60 requests per minute", () => {
        const limiter = new RateLimiter();

        // Should allow 60 requests
        for (let i = 0; i < 60; i++) {
          expect(() => limiter.check("key")).not.toThrow();
        }

        // 61st should fail
        expect(() => limiter.check("key")).toThrow(RateLimitError);
      });
    });
  });
});
