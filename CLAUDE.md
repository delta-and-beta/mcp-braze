# MCP Braze Server

MCP server for Braze customer engagement platform.

## Project Overview

This is a Model Context Protocol (MCP) server that provides tools for interacting with the Braze REST API. It enables AI assistants like Claude to manage user data, messaging, campaigns, and analytics.

## Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript (strict mode)
- **Framework**: FastMCP
- **Validation**: Zod
- **Testing**: Vitest

## Project Structure

```
src/
├── index.ts              # Entry point (transport selection)
├── server.ts             # FastMCP server initialization
├── tools/                # Tool definitions by category
│   ├── users.ts          # User data operations
│   ├── messaging.ts      # Message sending/scheduling
│   ├── campaigns.ts      # Campaign management
│   └── exports.ts        # Data exports
└── lib/                  # Shared utilities
    ├── auth.ts           # API key extraction
    ├── client.ts         # Braze API client
    ├── errors.ts         # Error handling
    ├── validation.ts     # Input validation
    └── logger.ts         # Logging utilities
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

- Unit tests: `src/__tests__/unit/`
- E2E tests: `src/__tests__/e2e/`
- Coverage target: 90%+ on lib/

## Braze API Reference

- [API Home](https://www.braze.com/docs/api/home/)
- [User Data Endpoints](https://www.braze.com/docs/api/endpoints/user_data/)
- [Messaging Endpoints](https://www.braze.com/docs/api/endpoints/messaging/)
- [Export Endpoints](https://www.braze.com/docs/api/endpoints/export/)
