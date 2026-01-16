# MCP-Builder Retrospective: Gaps in Gold Standard Implementation

**Date:** 2026-01-15
**Project:** mcp-braze
**Comparison:** mcp-braze vs mcp-airtable (gold standard)

## Summary

After analyzing mcp-airtable and aligning mcp-braze to its standards, several significant gaps were identified in the mcp-builder skill that need to be addressed.

## What Was Missing in mcp-builder

### 1. Resilience Patterns Not Documented

The mcp-builder skill mentions "retry with backoff" but lacks implementation details for:

| Pattern | Purpose | Status in mcp-builder |
|---------|---------|----------------------|
| `retry.ts` | Exponential backoff with jitter | ❌ Implementation missing |
| `circuit-breaker.ts` | Cascade failure prevention | ❌ Not mentioned |
| `request-queue.ts` | Concurrency control | ❌ Not mentioned |
| `deduplication.ts` | Share concurrent requests | ❌ Not mentioned |
| `idempotency.ts` | Safe retry tracking | ❌ Not mentioned |

### 2. Health Check Probes

For Kubernetes deployments, the following are essential but missing from mcp-builder:

```typescript
// health.ts - NOT in mcp-builder documentation
export function checkLiveness(): HealthStatus
export function checkReadiness(): ReadinessStatus
export function getComponentStats(): Record<string, unknown>
```

### 3. Integration Guidance

mcp-builder shows project structure but lacks:
- How to integrate resilience patterns into the API client
- When to use circuit breakers vs retries
- How to compose multiple patterns (rate limit → queue → dedup → circuit breaker → retry)

### 4. Unit Test Examples

mcp-builder lists test file names but provides no example tests for:
- Circuit breaker state transitions
- Rate limiter sliding window behavior
- Cache TTL expiration
- Request deduplication

## Files Added to mcp-braze (Post-Gap Analysis)

| File | Lines | Tests | Purpose |
|------|-------|-------|---------|
| `src/lib/retry.ts` | 294 | 22 | Exponential backoff, jitter, Retry-After header |
| `src/lib/circuit-breaker.ts` | 324 | 24 | CLOSED/OPEN/HALF_OPEN states |
| `src/lib/rate-limiter.ts` | 62 | 13 | Token bucket rate limiting |
| `src/lib/cache.ts` | 218 | 28 | TTL-based caching with eviction |
| `src/lib/request-queue.ts` | 156 | 15 | Concurrency control |
| `src/lib/deduplication.ts` | 170 | 17 | Share in-flight requests |
| `src/lib/idempotency.ts` | 196 | 25 | Safe retry tracking |
| `src/lib/health.ts` | 178 | 10 | Kubernetes probes |
| `src/lib/sentry.ts` | 185 | 0 | Error tracking (optional) |

**Total Added:** 1,783 lines of production code + 154 unit tests

## Test Coverage Comparison

| Metric | mcp-braze (before) | mcp-braze (after) | mcp-airtable |
|--------|-------------------|-------------------|--------------|
| Tools | 92 | 92 | 24 |
| Unit Tests | 0 | 154 | 434 |
| E2E Tests | 126 | 126 | ~24 |
| Lib Modules | 3 | 12 | ~15 |

## Recommendations for mcp-builder Skill Update

### 1. Add Resilience Patterns Section

```markdown
## Resilience Patterns (Required)

Every production MCP server should include:

### Circuit Breaker
Prevents cascading failures when the API is unhealthy.
- CLOSED: Normal operation
- OPEN: Fast-fail after threshold failures
- HALF_OPEN: Testing recovery

### Request Queue
Limits concurrent requests to prevent overwhelming APIs.

### Request Deduplication
Shares in-flight requests to prevent duplicate API calls.

### Idempotency Keys
Tracks operations to prevent duplicate side effects during retries.
```

### 2. Add Health Checks Section

```markdown
## Health Checks (Kubernetes)

For deployments, implement:
- `/health/live` - Liveness probe (is the process responsive?)
- `/health/ready` - Readiness probe (can we accept traffic?)

Check: event loop, memory, circuit breaker states, queue depth
```

### 3. Add Unit Test Examples

```markdown
## Unit Test Patterns

### Circuit Breaker Test Example
test("should open circuit after threshold failures", () => {
  const cb = new CircuitBreaker({ failureThreshold: 3 });
  cb.recordFailure(new Error());
  cb.recordFailure(new Error());
  expect(cb.getState()).toBe(CircuitState.CLOSED);
  cb.recordFailure(new Error());
  expect(cb.getState()).toBe(CircuitState.OPEN);
});
```

### 4. Update Success Metrics

| Metric | Current Target | Recommended Target |
|--------|----------------|-------------------|
| Lib Modules | Not specified | 10+ |
| Unit Tests | 100+ | 150+ |
| Resilience Patterns | Not specified | 5+ (retry, circuit breaker, rate limit, queue, dedup) |

## Root Cause Analysis

Why weren't these patterns included initially?

1. **Scope Creep Prevention**: mcp-builder focused on MVP functionality
2. **Framework Assumption**: Assumed FastMCP would handle resilience
3. **Time Constraints**: Initial build prioritized tool coverage over infrastructure
4. **Documentation Gap**: mcp-airtable gold standard wasn't fully analyzed

## Action Items

- [ ] Update mcp-builder skill with resilience patterns section
- [ ] Add health check template to mcp-builder
- [ ] Include unit test examples for all lib modules
- [ ] Document the composition order of resilience patterns
- [ ] Add integration guide for BrazeClient-style API clients

---

**Completed:** 2026-01-15 10:45:00
**Duration:** ~1 hour to add all missing patterns
**Impact:** mcp-braze is now production-ready with full resilience infrastructure
