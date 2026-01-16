/**
 * Unit tests for health.ts
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  checkLiveness,
  checkReadiness,
  getComponentStats,
} from "../../lib/health.js";
import { clearAllCircuitBreakers } from "../../lib/circuit-breaker.js";

interface MemoryStats {
  heapUsedMB: number;
  heapTotalMB: number;
  rssMB: number;
  externalMB: number;
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
}

interface ComponentStats {
  uptime: number;
  version: string;
  memory: MemoryStats;
  cache: {
    schema: CacheStats;
    response: CacheStats;
  };
  circuitBreakers: Record<string, unknown>;
  rateLimiter: Record<string, unknown>;
  requestQueue: Record<string, unknown>;
  deduplicator: Record<string, unknown>;
  idempotency: Record<string, unknown>;
}

describe("health", () => {
  beforeEach(() => {
    clearAllCircuitBreakers();
  });

  afterEach(() => {
    clearAllCircuitBreakers();
  });

  describe("checkLiveness", () => {
    it("should return healthy status", () => {
      const status = checkLiveness();

      expect(status.status).toBe("healthy");
      expect(status.timestamp).toBeDefined();
      expect(status.uptime).toBeGreaterThan(0);
      expect(status.version).toBeDefined();
      expect(status.checks).toBeInstanceOf(Array);
      expect(status.checks.length).toBeGreaterThan(0);
    });

    it("should include event loop check", () => {
      const status = checkLiveness();
      const eventLoopCheck = status.checks.find((c) => c.name === "event_loop");

      expect(eventLoopCheck).toBeDefined();
      expect(eventLoopCheck?.status).toBe("pass");
    });

    it("should include memory check", () => {
      const status = checkLiveness();
      const memoryCheck = status.checks.find((c) => c.name === "memory");

      expect(memoryCheck).toBeDefined();
      expect(memoryCheck?.data).toBeDefined();

      const memoryData = memoryCheck?.data as MemoryStats | undefined;
      expect(memoryData?.heapUsedMB).toBeGreaterThan(0);
    });
  });

  describe("checkReadiness", () => {
    it("should return ready status by default", () => {
      const status = checkReadiness();

      expect(status.ready).toBe(true);
      expect(status.timestamp).toBeDefined();
      expect(status.checks).toBeInstanceOf(Array);
    });

    it("should include circuit breaker check", () => {
      const status = checkReadiness();
      const cbCheck = status.checks.find(
        (c) => c.name === "circuit_breakers"
      );

      expect(cbCheck).toBeDefined();
      expect(cbCheck?.status).toBe("pass");
    });

    it("should include request queue check", () => {
      const status = checkReadiness();
      const queueCheck = status.checks.find(
        (c) => c.name === "request_queue"
      );

      expect(queueCheck).toBeDefined();
      expect(queueCheck?.status).toBe("pass");
    });

    it("should include rate limiter check", () => {
      const status = checkReadiness();
      const rateLimitCheck = status.checks.find(
        (c) => c.name === "rate_limiter"
      );

      expect(rateLimitCheck).toBeDefined();
      expect(rateLimitCheck?.status).toBe("pass");
    });
  });

  describe("getComponentStats", () => {
    it("should return comprehensive stats", () => {
      const stats = getComponentStats() as ComponentStats;

      expect(stats.uptime).toBeGreaterThan(0);
      expect(stats.version).toBeDefined();
      expect(stats.circuitBreakers).toBeDefined();
      expect(stats.rateLimiter).toBeDefined();
      expect(stats.requestQueue).toBeDefined();
      expect(stats.deduplicator).toBeDefined();
      expect(stats.idempotency).toBeDefined();
      expect(stats.cache).toBeDefined();
      expect(stats.memory).toBeDefined();
    });

    it("should include memory stats", () => {
      const stats = getComponentStats() as ComponentStats;

      expect(stats.memory.heapUsedMB).toBeGreaterThan(0);
      expect(stats.memory.heapTotalMB).toBeGreaterThan(0);
      expect(stats.memory.rssMB).toBeGreaterThan(0);
    });

    it("should include cache stats", () => {
      const stats = getComponentStats() as ComponentStats;

      expect(stats.cache.schema).toBeDefined();
      expect(stats.cache.response).toBeDefined();
    });
  });
});
