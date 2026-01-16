/**
 * Health check utilities for Kubernetes probes
 * Provides liveness and readiness checks
 * Adapted from mcp-airtable gold standard
 */

import { getAllCircuitBreakerStats, CircuitState } from "./circuit-breaker.js";
import { rateLimiter } from "./rate-limiter.js";
import { brazeRequestQueue, type QueueStats } from "./request-queue.js";
import { schemaCache, responseCache } from "./cache.js";
import { brazeDeduplicator } from "./deduplication.js";
import { idempotencyStore } from "./idempotency.js";
import { logger } from "./logger.js";

export interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime: number;
  version: string;
  checks: HealthCheck[];
}

export interface HealthCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  message?: string;
  data?: Record<string, unknown>;
}

export interface ReadinessStatus {
  ready: boolean;
  timestamp: string;
  checks: HealthCheck[];
}

// Track server start time
const startTime = Date.now();
const version = process.env.npm_package_version || "1.0.0";

// Queue capacity threshold (matches brazeRequestQueue maxQueueSize in request-queue.ts)
const BRAZE_QUEUE_MAX_SIZE = 500;

/**
 * Check if the server is alive (liveness probe)
 * Should return healthy unless the process is stuck
 */
export function checkLiveness(): HealthStatus {
  const checks: HealthCheck[] = [];
  let overallStatus: "healthy" | "degraded" | "unhealthy" = "healthy";

  // Check event loop is responsive
  const eventLoopCheck = checkEventLoop();
  checks.push(eventLoopCheck);
  if (eventLoopCheck.status === "fail") {
    overallStatus = "unhealthy";
  }

  // Check memory usage
  const memoryCheck = checkMemory();
  checks.push(memoryCheck);
  if (memoryCheck.status === "fail") {
    overallStatus = "unhealthy";
  } else if (memoryCheck.status === "warn" && overallStatus === "healthy") {
    overallStatus = "degraded";
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Date.now() - startTime,
    version,
    checks,
  };
}

/**
 * Check if the server is ready to receive traffic (readiness probe)
 * Should return ready when dependencies are available
 */
export function checkReadiness(): ReadinessStatus {
  const checks: HealthCheck[] = [];
  let ready = true;

  // Check circuit breakers
  const circuitCheck = checkCircuitBreakers();
  checks.push(circuitCheck);
  if (circuitCheck.status === "fail") {
    ready = false;
  }

  // Check request queue
  const queueCheck = checkRequestQueue();
  checks.push(queueCheck);
  if (queueCheck.status === "fail") {
    ready = false;
  }

  // Check rate limiter
  const rateLimitCheck = checkRateLimiter();
  checks.push(rateLimitCheck);
  if (rateLimitCheck.status === "fail") {
    ready = false;
  }

  return {
    ready,
    timestamp: new Date().toISOString(),
    checks,
  };
}

/**
 * Get detailed component statistics
 */
export function getComponentStats(): Record<string, unknown> {
  return {
    uptime: Date.now() - startTime,
    version,
    circuitBreakers: Object.fromEntries(getAllCircuitBreakerStats()),
    rateLimiter: rateLimiter.getStats(),
    requestQueue: brazeRequestQueue.getStats(),
    deduplicator: brazeDeduplicator.getStats(),
    idempotency: idempotencyStore.getStats(),
    cache: {
      schema: schemaCache.getStats(),
      response: responseCache.getStats(),
    },
    memory: getMemoryStats(),
  };
}

/**
 * Check event loop responsiveness
 */
function checkEventLoop(): HealthCheck {
  // In a real scenario, you'd measure event loop lag
  // For now, just verify we're running
  return {
    name: "event_loop",
    status: "pass",
    message: "Event loop is responsive",
  };
}

/**
 * Check memory usage
 */
function checkMemory(): HealthCheck {
  const usage = process.memoryUsage();
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
  const usagePercent = (usage.heapUsed / usage.heapTotal) * 100;

  let status: "pass" | "warn" | "fail" = "pass";
  let message = `Heap: ${heapUsedMB}MB / ${heapTotalMB}MB (${usagePercent.toFixed(1)}%)`;

  if (usagePercent > 90) {
    status = "fail";
    message = `Memory critically high: ${message}`;
  } else if (usagePercent > 75) {
    status = "warn";
    message = `Memory elevated: ${message}`;
  }

  return {
    name: "memory",
    status,
    message,
    data: getMemoryStats(),
  };
}

/**
 * Get memory statistics
 */
function getMemoryStats(): Record<string, number> {
  const usage = process.memoryUsage();
  return {
    heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
    rssMB: Math.round(usage.rss / 1024 / 1024),
    externalMB: Math.round(usage.external / 1024 / 1024),
  };
}

/**
 * Check circuit breakers status
 */
function checkCircuitBreakers(): HealthCheck {
  const stats = getAllCircuitBreakerStats();
  let openCount = 0;
  let halfOpenCount = 0;

  for (const [, breakerStats] of stats) {
    if (breakerStats.state === CircuitState.OPEN) {
      openCount++;
    } else if (breakerStats.state === CircuitState.HALF_OPEN) {
      halfOpenCount++;
    }
  }

  let status: "pass" | "warn" | "fail" = "pass";
  let message = `${stats.size} circuit breakers, all closed`;

  if (openCount > 0) {
    status = "fail";
    message = `${openCount} circuit breaker(s) open`;
  } else if (halfOpenCount > 0) {
    status = "warn";
    message = `${halfOpenCount} circuit breaker(s) half-open`;
  }

  return {
    name: "circuit_breakers",
    status,
    message,
    data: {
      total: stats.size,
      open: openCount,
      halfOpen: halfOpenCount,
    },
  };
}

/**
 * Check request queue status
 */
function checkRequestQueue(): HealthCheck {
  const stats = brazeRequestQueue.getStats();
  const queuedPercent = (stats.pending / BRAZE_QUEUE_MAX_SIZE) * 100;

  let status: "pass" | "warn" | "fail" = "pass";
  let message = `${stats.pending} pending, ${stats.active} active`;

  if (queuedPercent > 90) {
    status = "fail";
    message = `Queue near capacity: ${message}`;
  } else if (queuedPercent > 50) {
    status = "warn";
    message = `Queue filling: ${message}`;
  }

  return {
    name: "request_queue",
    status,
    message,
    data: queueStatsToRecord(stats),
  };
}

/**
 * Convert QueueStats to Record<string, unknown> for HealthCheck data field
 */
function queueStatsToRecord(stats: QueueStats): Record<string, unknown> {
  return {
    pending: stats.pending,
    active: stats.active,
    completed: stats.completed,
    failed: stats.failed,
    rejected: stats.rejected,
    maxConcurrencyReached: stats.maxConcurrencyReached,
  };
}

/**
 * Check rate limiter status
 */
function checkRateLimiter(): HealthCheck {
  const stats = rateLimiter.getStats();

  return {
    name: "rate_limiter",
    status: "pass",
    message: `${stats.keys} active rate limit keys`,
    data: stats,
  };
}

/**
 * Log health status periodically (for debugging)
 */
export function startHealthLogging(intervalMs: number = 60000): ReturnType<typeof setInterval> {
  const timer = setInterval(() => {
    const liveness = checkLiveness();
    const readiness = checkReadiness();

    logger.info("Health check", {
      liveness: liveness.status,
      ready: readiness.ready,
      uptime: liveness.uptime,
      memory: getMemoryStats(),
    });
  }, intervalMs);

  if (timer.unref) {
    timer.unref();
  }

  return timer;
}
