# MCP Braze Server

MCP server for Braze customer engagement platform.

## Project Overview

This is a Model Context Protocol (MCP) server that provides tools for interacting with the Braze REST API. It enables AI assistants like Claude to manage user data, messaging, campaigns, and analytics.

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript (strict mode)
- **Framework**: MCP SDK (@modelcontextprotocol/sdk)
- **Validation**: Zod
- **Testing**: Vitest

## Project Structure

```
src/
├── index.ts              # Entry point (STDIO transport)
├── server.ts             # MCP server initialization
├── tools/                # Tool definitions by category (92 tools across 11 categories)
│   ├── users.ts          # User data operations (8 tools)
│   ├── messaging.ts      # Message sending (6 tools)
│   ├── scheduling.ts     # Campaign/Canvas scheduling (10 tools)
│   ├── exports.ts        # Data exports (24 tools)
│   ├── email.ts          # Email management (7 tools)
│   ├── sms.ts            # SMS operations (2 tools)
│   ├── subscriptions.ts  # Subscription groups (4 tools)
│   ├── templates.ts      # Template management (8 tools)
│   ├── catalogs.ts       # Catalog operations (13 tools)
│   ├── preference-center.ts # Preference centers (5 tools)
│   └── scim.ts           # SCIM user provisioning (5 tools)
└── lib/                  # Shared utilities (15 modules)
    ├── index.ts          # Barrel exports
    ├── auth.ts           # API key extraction
    ├── client.ts         # Braze API client
    ├── errors.ts         # Error handling
    ├── validation.ts     # Input validation
    ├── logger.ts         # Logging utilities
    ├── retry.ts          # Exponential backoff with jitter
    ├── circuit-breaker.ts # Cascade failure prevention
    ├── rate-limiter.ts   # Token bucket rate limiting
    ├── cache.ts          # TTL-based caching with LRU eviction
    ├── request-queue.ts  # Concurrency control
    ├── deduplication.ts  # Share in-flight requests
    ├── idempotency.ts    # Safe retry tracking
    ├── health.ts         # Kubernetes liveness/readiness probes
    └── sentry.ts         # Error tracking (optional)
```

## Commands

```bash
npm run dev        # Run with tsx (development)
npm run build      # Compile TypeScript
npm run start      # Run compiled version
npm run test       # Run unit tests
npm run test:e2e   # Run E2E tests (requires BRAZE_API_KEY)
```

## Configuration

Set environment variables or pass via HTTP headers:

- `BRAZE_API_KEY` - Braze REST API key
- `BRAZE_REST_ENDPOINT` - Braze instance URL (e.g., https://rest.iad-01.braze.com)
- `BRAZE_APP_ID` - App identifier (optional)

## Code Conventions

- No `any` types in lib/ directory
- All inputs validated with Zod schemas
- Errors include tool context for debugging
- Logging via stderr for STDIO transport compatibility
- API keys extracted from: tool params > HTTP headers > env vars

## Testing

- Unit tests: `src/__tests__/unit/` (154 tests across 8 files)
- E2E tests: `src/__tests__/e2e/` (126 tests across 11 files)
- Coverage target: 90%+ on lib/
- Run: `npm test` (unit) or `npm run test:e2e` (requires API key)

## Braze API Reference

- [API Home](https://www.braze.com/docs/api/home/)
- [User Data Endpoints](https://www.braze.com/docs/api/endpoints/user_data/)
- [Messaging Endpoints](https://www.braze.com/docs/api/endpoints/messaging/)
- [Export Endpoints](https://www.braze.com/docs/api/endpoints/export/)
