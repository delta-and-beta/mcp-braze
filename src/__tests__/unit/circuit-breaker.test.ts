/**
 * Unit tests for circuit-breaker.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  CircuitBreaker,
  CircuitState,
  CircuitBreakerError,
  getCircuitBreaker,
  resetAllCircuitBreakers,
  clearAllCircuitBreakers,
  getAllCircuitBreakerStats,
} from "../../lib/circuit-breaker.js";

describe("circuit-breaker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearAllCircuitBreakers();
  });

  afterEach(() => {
    vi.useRealTimers();
    clearAllCircuitBreakers();
  });

  describe("CircuitBreaker", () => {
    describe("initial state", () => {
      it("should start in CLOSED state", () => {
        const cb = new CircuitBreaker();
        expect(cb.getState()).toBe(CircuitState.CLOSED);
      });

      it("should accept custom options", () => {
        const cb = new CircuitBreaker({
          failureThreshold: 10,
          resetTimeoutMs: 60000,
          name: "test",
        });

        expect(cb.getState()).toBe(CircuitState.CLOSED);
      });
    });

    describe("canRequest", () => {
      it("should allow requests in CLOSED state", () => {
        const cb = new CircuitBreaker();
        expect(cb.canRequest()).toBe(true);
      });

      it("should throw CircuitBreakerError in OPEN state", () => {
        const cb = new CircuitBreaker({
          failureThreshold: 1,
          name: "test",
        });

        cb.recordFailure(new Error("test"));

        expect(() => cb.canRequest()).toThrow(CircuitBreakerError);
      });

      it("should include retry time in error", () => {
        const cb = new CircuitBreaker({
          failureThreshold: 1,
          resetTimeoutMs: 30000,
          name: "test",
        });

        cb.recordFailure(new Error("test"));

        expect(() => cb.canRequest()).toThrow(
          expect.objectContaining({
            circuitName: "test",
            nextRetryTime: expect.any(Number),
          })
        );
      });
    });

    describe("recordSuccess", () => {
      it("should increment success counters", () => {
        const cb = new CircuitBreaker();
        cb.recordSuccess();
        cb.recordSuccess();

        const stats = cb.getStats();
        expect(stats.totalSuccesses).toBe(2);
        expect(stats.totalRequests).toBe(2);
      });

      it("should reset failure count in CLOSED state", () => {
        const cb = new CircuitBreaker({ failureThreshold: 3 });

        cb.recordFailure(new Error("test"));
        cb.recordFailure(new Error("test"));
        cb.recordSuccess();

        // Still in closed state, failures should be reset
        expect(cb.getState()).toBe(CircuitState.CLOSED);
      });

      it("should close circuit after enough successes in HALF_OPEN state", () => {
        const cb = new CircuitBreaker({
          failureThreshold: 1,
          successThreshold: 2,
          resetTimeoutMs: 1000,
        });

        cb.recordFailure(new Error("test")); // Opens circuit
        expect(cb.getState()).toBe(CircuitState.OPEN);

        vi.advanceTimersByTime(1001); // Transition to half-open
        expect(cb.getState()).toBe(CircuitState.HALF_OPEN);

        cb.recordSuccess();
        // After first success, still half-open (need 2)
        expect(cb.getState()).toBe(CircuitState.HALF_OPEN);

        cb.recordSuccess();
        // After second success, should close
        expect(cb.getState()).toBe(CircuitState.CLOSED);
      });
    });

    describe("recordFailure", () => {
      it("should open circuit after threshold failures", () => {
        const cb = new CircuitBreaker({
          failureThreshold: 3,
          failureWindowMs: 60000,
        });

        cb.recordFailure(new Error("test1"));
        cb.recordFailure(new Error("test2"));
        expect(cb.getState()).toBe(CircuitState.CLOSED);

        cb.recordFailure(new Error("test3"));
        expect(cb.getState()).toBe(CircuitState.OPEN);
      });

      it("should reopen circuit on failure in HALF_OPEN state", () => {
        const cb = new CircuitBreaker({
          failureThreshold: 1,
          resetTimeoutMs: 1000,
        });

        cb.recordFailure(new Error("test"));
        expect(cb.getState()).toBe(CircuitState.OPEN);

        vi.advanceTimersByTime(1001);
        expect(cb.getState()).toBe(CircuitState.HALF_OPEN);

        cb.recordFailure(new Error("test"));
        expect(cb.getState()).toBe(CircuitState.OPEN);
      });
    });

    describe("execute", () => {
      it("should execute function and record success", async () => {
        const cb = new CircuitBreaker();
        const fn = vi.fn().mockResolvedValue("result");

        const result = await cb.execute(fn);

        expect(result).toBe("result");
        expect(fn).toHaveBeenCalledTimes(1);
        expect(cb.getStats().totalSuccesses).toBe(1);
      });

      it("should record failure on error", async () => {
        const cb = new CircuitBreaker();
        const fn = vi.fn().mockRejectedValue(new Error("test"));

        await expect(cb.execute(fn)).rejects.toThrow("test");
        expect(cb.getStats().totalFailures).toBe(1);
      });

      it("should throw CircuitBreakerError when circuit is open", async () => {
        const cb = new CircuitBreaker({ failureThreshold: 1 });

        cb.recordFailure(new Error("test"));

        await expect(cb.execute(() => Promise.resolve())).rejects.toThrow(
          CircuitBreakerError
        );
      });
    });

    describe("reset", () => {
      it("should reset circuit to initial state", () => {
        const cb = new CircuitBreaker({ failureThreshold: 1 });

        cb.recordFailure(new Error("test"));
        expect(cb.getState()).toBe(CircuitState.OPEN);

        cb.reset();
        expect(cb.getState()).toBe(CircuitState.CLOSED);
        expect(cb.getStats().failures).toBe(0);
      });
    });

    describe("forceState", () => {
      it("should force circuit to specified state", () => {
        const cb = new CircuitBreaker();

        cb.forceState(CircuitState.OPEN);
        expect(cb.getState()).toBe(CircuitState.OPEN);

        cb.forceState(CircuitState.HALF_OPEN);
        expect(cb.getState()).toBe(CircuitState.HALF_OPEN);

        cb.forceState(CircuitState.CLOSED);
        expect(cb.getState()).toBe(CircuitState.CLOSED);
      });
    });

    describe("getStats", () => {
      it("should return comprehensive stats", () => {
        const cb = new CircuitBreaker();

        cb.recordSuccess();
        cb.recordFailure(new Error("test"));

        const stats = cb.getStats();

        expect(stats.state).toBe(CircuitState.CLOSED);
        expect(stats.totalRequests).toBe(2);
        expect(stats.totalSuccesses).toBe(1);
        expect(stats.totalFailures).toBe(1);
        expect(stats.lastSuccessTime).not.toBeNull();
        expect(stats.lastFailureTime).not.toBeNull();
      });
    });

    describe("automatic transition to HALF_OPEN", () => {
      it("should transition from OPEN to HALF_OPEN after reset timeout", () => {
        const cb = new CircuitBreaker({
          failureThreshold: 1,
          resetTimeoutMs: 5000,
        });

        cb.recordFailure(new Error("test"));
        expect(cb.getState()).toBe(CircuitState.OPEN);

        vi.advanceTimersByTime(4999);
        expect(cb.getState()).toBe(CircuitState.OPEN);

        vi.advanceTimersByTime(2);
        expect(cb.getState()).toBe(CircuitState.HALF_OPEN);
      });
    });
  });

  describe("getCircuitBreaker", () => {
    it("should create new circuit breaker if not exists", () => {
      const cb = getCircuitBreaker("new-breaker");
      expect(cb).toBeInstanceOf(CircuitBreaker);
    });

    it("should return existing circuit breaker", () => {
      const cb1 = getCircuitBreaker("test");
      const cb2 = getCircuitBreaker("test");

      expect(cb1).toBe(cb2);
    });

    it("should apply options only on creation", () => {
      const cb1 = getCircuitBreaker("test2", { failureThreshold: 5 });
      const cb2 = getCircuitBreaker("test2", { failureThreshold: 10 });

      expect(cb1).toBe(cb2);
      // Options from first call should be used
    });
  });

  describe("resetAllCircuitBreakers", () => {
    it("should reset all circuit breakers", () => {
      const cb1 = getCircuitBreaker("cb1", { failureThreshold: 1 });
      const cb2 = getCircuitBreaker("cb2", { failureThreshold: 1 });

      cb1.recordFailure(new Error("test"));
      cb2.recordFailure(new Error("test"));

      expect(cb1.getState()).toBe(CircuitState.OPEN);
      expect(cb2.getState()).toBe(CircuitState.OPEN);

      resetAllCircuitBreakers();

      expect(cb1.getState()).toBe(CircuitState.CLOSED);
      expect(cb2.getState()).toBe(CircuitState.CLOSED);
    });
  });

  describe("getAllCircuitBreakerStats", () => {
    it("should return stats for all circuit breakers", () => {
      getCircuitBreaker("cb1");
      getCircuitBreaker("cb2");

      const stats = getAllCircuitBreakerStats();

      expect(stats.size).toBe(2);
      expect(stats.has("cb1")).toBe(true);
      expect(stats.has("cb2")).toBe(true);
    });
  });

  describe("CircuitBreakerError", () => {
    it("should have correct properties", () => {
      const error = new CircuitBreakerError("Test error", "test-circuit", 12345);

      expect(error.message).toBe("Test error");
      expect(error.name).toBe("CircuitBreakerError");
      expect(error.code).toBe("CIRCUIT_OPEN");
      expect(error.circuitName).toBe("test-circuit");
      expect(error.nextRetryTime).toBe(12345);
    });

    it("should use defaults", () => {
      const error = new CircuitBreakerError();

      expect(error.message).toBe("Circuit breaker is open");
    });
  });
});
