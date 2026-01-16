<div align="center">

<br>

# MCP Braze

<br>

**Production-ready MCP server for Braze customer engagement**

<br>

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/Tests-280_passing-00D9C0?style=flat-square)](./src/__tests__)
[![License](https://img.shields.io/badge/License-MIT-FF6B5B?style=flat-square)](./LICENSE)

<br>

*Built with the [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk) — Works with Claude Desktop & Claude.ai*

<br>

---

<br>

</div>

## Overview

A comprehensive MCP server enabling AI assistants to interact with Braze's customer engagement platform. Features **92 tools** covering user management, messaging, campaigns, analytics, email/SMS operations, catalogs, and SCIM provisioning—built for production reliability.

<br>

## Δ Capabilities

<table>
<tr>
<td width="50%" valign="top">

### Core

**92 Tools** — Users, messaging, campaigns, analytics
**Multi-Channel** — Push, email, SMS, in-app, webhooks
**Header Auth** — Multi-tenant ready architecture

</td>
<td width="50%" valign="top">

### Reliability

**Circuit Breaker** — Cascading failure prevention
**Auto-Retry** — Exponential backoff with jitter
**Health Checks** — K8s liveness & readiness probes

</td>
</tr>
<tr>
<td width="50%" valign="top">

### Security

**Input Validation** — Zod schemas everywhere
**Injection Prevention** — XSS & path attacks blocked
**Rate Limiting** — Token bucket algorithm

</td>
<td width="50%" valign="top">

### Performance

**Request Queue** — Concurrency control (10 max)
**Request Deduplication** — Shares concurrent results
**Response Caching** — TTL-based with LRU eviction

</td>
</tr>
</table>

<br>

## Quick Start

```bash
npm install && npm run build
node dist/index.js
```

<br>

## Configuration

<details>
<summary><b>Claude Desktop (stdio)</b></summary>
<br>

```json
{
  "mcpServers": {
    "braze": {
      "command": "node",
      "args": ["/path/to/mcp-braze/dist/index.js"],
      "env": {
        "BRAZE_API_KEY": "your-api-key",
        "BRAZE_REST_ENDPOINT": "https://rest.iad-01.braze.com"
      }
    }
  }
}
```

</details>

<details>
<summary><b>Remote HTTP (mcp-remote)</b></summary>
<br>

```json
{
  "mcpServers": {
    "braze": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote",
        "https://your-server.com/mcp",
        "--header", "x-braze-api-key:your-api-key",
        "--header", "x-braze-rest-endpoint:https://rest.iad-01.braze.com"
      ]
    }
  }
}
```

</details>

<details>
<summary><b>Claude.ai Web</b></summary>
<br>

1. Deploy server with HTTP transport
2. Claude.ai → Settings → Connectors
3. Add URL: `https://your-server.com/mcp`
4. Add headers: `x-braze-api-key`, `x-braze-rest-endpoint`

</details>

<br>

| Platform | Config Path |
|:---------|:------------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |

→ [Get your API key](https://dashboard.braze.com/app_settings/developer_console)

<br>

## β Tools

| Category | Tools |
|:---------|:------|
| **Users** | `users_track` · `users_identify` · `users_alias_new` · `users_alias_update` · `users_delete` · `users_merge` · `users_external_id_rename` · `users_external_id_remove` |
| **Messaging** | `messages_send` · `campaigns_trigger_send` · `canvas_trigger_send` · `transactional_email_send` · `send_id_create` · `live_activity_update` |
| **Scheduling** | `scheduled_broadcasts_list` · `messages_schedule_create` · `messages_schedule_update` · `messages_schedule_delete` · `campaigns_schedule_create` · `campaigns_schedule_update` · `campaigns_schedule_delete` · `canvas_schedule_create` · `canvas_schedule_update` · `canvas_schedule_delete` |
| **Exports** | `campaigns_list` · `campaigns_details` · `campaigns_analytics` · `sends_analytics` · `canvas_list` · `canvas_details` · `canvas_analytics` · `canvas_summary` · `segments_list` · `segments_details` · `segments_analytics` · `users_export` · `users_export_segment` · `users_export_control_group` · `kpi_dau` · `kpi_mau` · `kpi_new_users` · `kpi_uninstalls` · `events_list` · `events_analytics` · `purchases_products` · `purchases_quantity` · `purchases_revenue` · `sessions_analytics` |
| **Email** | `email_hard_bounces` · `email_unsubscribes` · `email_subscription_status` · `email_bounce_remove` · `email_spam_remove` · `email_blocklist` · `email_blacklist`° |
| **SMS** | `sms_invalid_phones` · `sms_invalid_phones_remove` |
| **Subscriptions** | `subscription_status_get` · `subscription_user_status` · `subscription_status_set` · `subscription_status_set_v2` |
| **Templates** | `email_templates_list` · `email_templates_info` · `email_templates_create` · `email_templates_update` · `content_blocks_list` · `content_blocks_info` · `content_blocks_create` · `content_blocks_update` |
| **Catalogs** | `catalogs_list` · `catalogs_create` · `catalogs_delete` · `catalog_items_list` · `catalog_items_create` · `catalog_items_update` · `catalog_items_edit` · `catalog_items_delete` · `catalog_item_get` · `catalog_item_create` · `catalog_item_update` · `catalog_item_edit` · `catalog_item_delete` |
| **Preferences** | `preference_centers_list` · `preference_center_get` · `preference_center_url` · `preference_center_create` · `preference_center_update` |
| **SCIM** | `scim_users_search` · `scim_users_get` · `scim_users_create` · `scim_users_update` · `scim_users_delete` |

° *Deprecated — use `email_blocklist` instead*

<br>

## Usage

```
"Track a purchase event for user123 with amount $99.99"

"Send the welcome campaign to users who signed up today"

"Get campaign analytics for the last 30 days"

"List all users in the Premium segment"

"Create a new email template for order confirmations"
```

<br>

## Authentication

| Priority | API Key | REST Endpoint |
|:--------:|:--------|:--------------|
| 1 | `x-braze-api-key` header | `x-braze-rest-endpoint` header |
| 2 | `Authorization: Bearer` header | `restEndpoint` parameter |
| 3 | `brazeApiKey` parameter | `BRAZE_REST_ENDPOINT` env |
| 4 | `BRAZE_API_KEY` env | — |

<br>

## Braze REST Endpoints

<details>
<summary><b>Available Regions</b></summary>
<br>

| Region | Endpoint |
|:-------|:---------|
| US-01 | `https://rest.iad-01.braze.com` |
| US-02 | `https://rest.iad-02.braze.com` |
| US-03 | `https://rest.iad-03.braze.com` |
| US-04 | `https://rest.iad-04.braze.com` |
| US-05 | `https://rest.iad-05.braze.com` |
| US-06 | `https://rest.iad-06.braze.com` |
| US-07 | `https://rest.iad-07.braze.com` |
| US-08 | `https://rest.iad-08.braze.com` |
| EU-01 | `https://rest.fra-01.braze.eu` |
| EU-02 | `https://rest.fra-02.braze.eu` |

Find your endpoint in Braze Dashboard → Settings → APIs and Identifiers

</details>

<br>

## Stability & Resilience

<details>
<summary><b>Retry with Exponential Backoff</b></summary>
<br>

- Auto-retries on HTTP 429, 500, 502, 503, 504
- Handles network errors (ECONNRESET, ETIMEDOUT, ECONNREFUSED)
- Respects `Retry-After` headers
- Configurable max retries, delays, jitter

</details>

<details>
<summary><b>Circuit Breaker Pattern</b></summary>
<br>

Prevents cascading failures:
- **CLOSED** — Normal operation
- **OPEN** — Fast-fail mode (5 failures trigger)
- **HALF_OPEN** — Recovery testing

</details>

<details>
<summary><b>Request Management</b></summary>
<br>

- **Timeout**: 30s default (AbortController)
- **Deduplication**: Shares identical concurrent requests
- **Queue**: Limits to 10 concurrent requests
- **Rate Limiting**: Token bucket algorithm

</details>

<details>
<summary><b>Health Checks</b></summary>
<br>

Kubernetes-ready probes:
- `health` — Full status report
- `liveness` — Alive check
- `readiness` — Traffic ready

</details>

<br>

## Deployment

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```bash
docker build -t mcp-braze .
docker run -p 3000:3000 \
  -e BRAZE_API_KEY=your-key \
  -e BRAZE_REST_ENDPOINT=https://rest.iad-01.braze.com \
  mcp-braze
```

<details>
<summary><b>Environment Variables</b></summary>
<br>

```bash
# Server
PORT=3000
NODE_ENV=production

# Auth (prefer headers in production)
BRAZE_API_KEY=
BRAZE_REST_ENDPOINT=
BRAZE_APP_ID=

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_SECOND=10

# Caching
CACHE_ENABLED=true
CACHE_TTL_SECONDS=300
CACHE_MAX_SIZE=1000

# Circuit Breaker
CIRCUIT_BREAKER_ENABLED=true
CIRCUIT_BREAKER_THRESHOLD=5
CIRCUIT_BREAKER_RESET_TIMEOUT=60000

# Logging
LOG_LEVEL=info

# Sentry (Optional)
SENTRY_DSN=
SENTRY_ENVIRONMENT=production
```

</details>

<br>

## Architecture

```
src/
├── index.ts                 # Entry point
├── server.ts                # MCP server init
├── tools/                   # 92 tools
│   ├── users.ts
│   ├── messaging.ts
│   ├── scheduling.ts
│   ├── exports.ts
│   ├── email.ts
│   ├── sms.ts
│   ├── subscriptions.ts
│   ├── templates.ts
│   ├── catalogs.ts
│   ├── preference-center.ts
│   └── scim.ts
└── lib/                     # Core utilities
    ├── auth.ts              # API key extraction
    ├── client.ts            # Braze HTTP client
    ├── validation.ts        # Zod schemas
    ├── errors.ts            # Error handling
    ├── retry.ts             # Backoff
    ├── circuit-breaker.ts   # Failure prevention
    ├── rate-limiter.ts      # Token bucket
    ├── cache.ts             # TTL cache
    ├── request-queue.ts     # Concurrency
    ├── deduplication.ts     # Request dedup
    ├── idempotency.ts       # Safe retries
    ├── health.ts            # K8s probes
    ├── logger.ts            # Structured logging
    └── sentry.ts            # Error tracking
```

**~3,500 lines** · **154 unit tests** · **126 e2e tests**

<br>

## References

| | |
|:--|:--|
| MCP Specification | [modelcontextprotocol.io](https://modelcontextprotocol.io/specification/2025-11-25) |
| MCP SDK | [github.com/modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk) |
| mcp-remote | [npmjs.com/package/mcp-remote](https://www.npmjs.com/package/mcp-remote) |
| Braze API | [braze.com/docs/api](https://www.braze.com/docs/api/basics/) |

<br>

---

<div align="center">

<br>

MIT License

<br>

**DELTΔ & βETΑ**

*From Change to What's Next*

<br>

</div>
