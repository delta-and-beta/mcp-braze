# Rate Limiting Guide

This guide explains how rate limiting works in the MCP Braze server and how to configure it for optimal performance.

## Overview

Rate limiting is crucial when working with the Braze API to:
- Respect Braze API limits
- Prevent service disruptions
- Ensure fair resource usage
- Optimize performance

## Braze API Limits

Braze enforces different rate limits based on your plan and endpoint:

### Standard Limits

| Endpoint Type | Default Limit | Notes |
|--------------|---------------|-------|
| User Track | 50,000 requests/minute | Batching recommended |
| Campaign Trigger | 250 requests/minute | Per campaign |
| Export | 100 requests/minute | Heavy operations |
| Analytics | 1,000 requests/minute | Read operations |
| Content | 1,000 requests/minute | Templates, blocks |

### Enterprise Limits

Enterprise customers may have custom limits. Check your Braze dashboard or contact support.

## Configuration

### Basic Rate Limiting

```bash
# Set requests per minute limit
BRAZE_RATE_LIMIT_REQUESTS_PER_MINUTE=1000

# Enable request queue (recommended)
BRAZE_ENABLE_QUEUE=true
```

### Advanced Configuration

```bash
# Queue configuration
BRAZE_QUEUE_CONCURRENCY=10          # Parallel requests
BRAZE_QUEUE_INTERVAL=60000          # Time window (ms)
BRAZE_QUEUE_INTERVAL_CAP=1000       # Requests per interval

# Retry configuration
BRAZE_RETRY_ATTEMPTS=3               # Max retry attempts
BRAZE_RETRY_DELAY=1000              # Initial delay (ms)
BRAZE_RETRY_MAX_DELAY=30000         # Max delay (ms)
BRAZE_RETRY_FACTOR=2                # Exponential backoff factor
```

## Implementation Details

### Queue System

The server uses a priority queue (p-queue) to manage requests:

```typescript
const queue = new PQueue({
  concurrency: 10,              // Process 10 requests simultaneously
  interval: 60000,              // Per minute
  intervalCap: 1000,            // Max 1000 requests per minute
});
```

### Automatic Retry

Failed requests are automatically retried with exponential backoff:

1. First retry: 1 second delay
2. Second retry: 2 seconds delay
3. Third retry: 4 seconds delay

### Rate Limit Detection

The server automatically detects rate limit errors:

```typescript
if (error.response?.status === 429) {
  const retryAfter = error.response.headers['retry-after'];
  // Wait and retry
}
```

## Usage Patterns

### Batch Operations

For high-volume operations, use batching:

```javascript
// Good: Batch user updates
{
  "tool": "track_user",
  "arguments": {
    "attributes": [
      { "external_id": "user1", "email": "user1@example.com" },
      { "external_id": "user2", "email": "user2@example.com" },
      // ... up to 75 users per batch
    ]
  }
}

// Bad: Individual requests
// This will quickly hit rate limits
for (const user of users) {
  await trackUser({ attributes: [user] });
}
```

### Concurrent Requests

The server automatically manages concurrency:

```javascript
// The server will process these optimally
const results = await Promise.all([
  listCampaigns(),
  listSegments(),
  getKpiMetrics(),
]);
```

### Time-Based Distribution

For scheduled operations, distribute load:

```javascript
// Spread campaign sends over time
const campaigns = await listCampaigns();
for (let i = 0; i < campaigns.length; i++) {
  const delay = i * 5000; // 5 seconds between each
  setTimeout(() => {
    sendCampaign({ campaign_id: campaigns[i].id });
  }, delay);
}
```

## Optimization Strategies

### 1. Enable Caching

Reduce API calls with Redis caching:

```bash
REDIS_URL=redis://localhost:6379
REDIS_CACHE_TTL=3600  # 1 hour cache
```

### 2. Use Appropriate Limits

Set limits based on your Braze plan:

```bash
# Basic plan
BRAZE_RATE_LIMIT_REQUESTS_PER_MINUTE=500

# Pro plan
BRAZE_RATE_LIMIT_REQUESTS_PER_MINUTE=1000

# Enterprise plan
BRAZE_RATE_LIMIT_REQUESTS_PER_MINUTE=5000
```

### 3. Implement Request Prioritization

For mixed workloads, prioritize critical operations:

```typescript
// High priority: Campaign sends
await queue.add(() => sendCampaign(data), { priority: 1 });

// Low priority: Analytics
await queue.add(() => getAnalytics(data), { priority: 3 });
```

### 4. Monitor Rate Limit Usage

Track your usage to avoid hitting limits:

```javascript
// Check rate limit headers
const response = await brazeRequest();
console.log('Rate limit remaining:', response.headers['x-ratelimit-remaining']);
console.log('Rate limit reset:', response.headers['x-ratelimit-reset']);
```

## Error Handling

### Rate Limit Errors

When rate limits are exceeded:

```json
{
  "error": "Braze API rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "retryAfter": 60
  }
}
```

### Handling in Applications

```javascript
try {
  const result = await client.sendCampaign(campaignData);
} catch (error) {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    // Wait and retry
    const delay = error.details.retryAfter * 1000;
    await sleep(delay);
    // Retry the operation
  }
}
```

## Best Practices

### 1. Batch Where Possible

Always batch operations when the API supports it:

- User tracking: Up to 75 users per request
- Event tracking: Up to 75 events per request
- Attribute updates: Up to 75 updates per request

### 2. Use Queue Mode

Always enable queue mode in production:

```bash
BRAZE_ENABLE_QUEUE=true
```

### 3. Set Conservative Limits

Start with conservative limits and increase gradually:

```bash
# Start with 50% of your limit
BRAZE_RATE_LIMIT_REQUESTS_PER_MINUTE=500

# Monitor and increase if needed
BRAZE_RATE_LIMIT_REQUESTS_PER_MINUTE=750
```

### 4. Implement Circuit Breakers

For critical applications, implement circuit breakers:

```typescript
const circuitBreaker = new CircuitBreaker(brazeOperation, {
  timeout: 10000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});
```

## Monitoring

### Metrics to Track

1. **Request Rate**: Requests per minute
2. **Queue Size**: Pending requests
3. **Error Rate**: Failed requests percentage
4. **Response Time**: Average latency
5. **Rate Limit Hits**: 429 error frequency

### Logging

Enable detailed logging for monitoring:

```bash
LOG_LEVEL=debug
BRAZE_LOG_RATE_LIMITS=true
```

### Alerts

Set up alerts for:
- Queue size > 1000 requests
- Error rate > 5%
- Rate limit errors > 10 per minute
- Response time > 5 seconds

## Troubleshooting

### Common Issues

1. **Frequent 429 errors**
   - Reduce `BRAZE_RATE_LIMIT_REQUESTS_PER_MINUTE`
   - Enable request queuing
   - Implement batching

2. **Slow performance**
   - Check queue size
   - Increase concurrency limit
   - Enable caching

3. **Timeout errors**
   - Increase timeout values
   - Check network connectivity
   - Reduce batch sizes

### Debug Mode

Enable debug mode to see rate limiting details:

```bash
LOG_LEVEL=debug
BRAZE_DEBUG_RATE_LIMITS=true
```

This will log:
- Queue status
- Rate limit headers
- Retry attempts
- Timing information

## Advanced Topics

### Custom Rate Limiting

Implement custom rate limiting logic:

```typescript
class CustomRateLimiter {
  async checkLimit(endpoint: string): Promise<boolean> {
    // Custom logic based on endpoint
    if (endpoint.includes('/users/track')) {
      return this.checkUserTrackLimit();
    }
    return this.checkGeneralLimit();
  }
}
```

### Dynamic Rate Adjustment

Adjust rates based on response headers:

```typescript
function adjustRateLimit(headers: Headers): void {
  const remaining = parseInt(headers['x-ratelimit-remaining']);
  const reset = parseInt(headers['x-ratelimit-reset']);
  
  if (remaining < 100) {
    // Slow down requests
    queue.concurrency = 5;
  }
}
```

### Multi-Tenant Rate Limiting

For multi-tenant setups:

```typescript
const tenantQueues = new Map<string, PQueue>();

function getQueueForTenant(tenantId: string): PQueue {
  if (!tenantQueues.has(tenantId)) {
    tenantQueues.set(tenantId, new PQueue({
      concurrency: 5,
      interval: 60000,
      intervalCap: 500,
    }));
  }
  return tenantQueues.get(tenantId)!;
}
```