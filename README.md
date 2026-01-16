# MCP Braze Server

An MCP (Model Context Protocol) server that provides tools for interacting with the [Braze](https://www.braze.com/) customer engagement platform. This server enables AI assistants to manage users, send messages, schedule campaigns, and export analytics data.

## Features

- **User Management**: Track attributes, events, purchases; create/update aliases; merge profiles
- **Messaging**: Send messages immediately via campaigns, canvases, or transactional email
- **Scheduling**: Schedule and manage campaign/canvas sends with full lifecycle control
- **Analytics & Exports**: Export campaign, canvas, segment, and KPI data
- **Email & SMS**: Manage bounces, unsubscribes, blocklists, and invalid phone numbers
- **Subscriptions**: Query and update subscription group status
- **Templates**: Create and manage email templates and content blocks
- **Catalogs**: Full CRUD operations on catalogs and catalog items
- **Preference Centers**: Create and manage email preference centers
- **SCIM**: Provision and manage dashboard users via SCIM 2.0

## Installation

```bash
# Clone the repository
git clone https://github.com/marchi-lau/mcp-braze.git
cd mcp-braze

# Install dependencies
npm install

# Build
npm run build
```

## Configuration

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Add your Braze credentials:
   ```env
   BRAZE_API_KEY=your-api-key-here
   BRAZE_REST_ENDPOINT=https://rest.iad-01.braze.com
   BRAZE_APP_ID=your-app-id-here  # Optional
   ```

3. Get your API key from the Braze Dashboard:
   - Navigate to **Settings > API Keys**
   - Create a new API key with the required permissions
   - Select the appropriate REST endpoint for your instance

### Braze REST Endpoints

| Region | Endpoint |
|--------|----------|
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

## Usage

### Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

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

## Tools Reference

### User Data (8 tools)

| Tool | Description |
|------|-------------|
| `users_track` | Track user attributes, events, and purchases |
| `users_identify` | Identify users by alias |
| `users_alias_new` | Create new user aliases |
| `users_alias_update` | Update existing user aliases |
| `users_delete` | Delete user profiles |
| `users_merge` | Merge duplicate user profiles |
| `users_external_id_rename` | Rename external user IDs |
| `users_external_id_remove` | Remove deprecated external IDs |

### Messaging (6 tools)

| Tool | Description |
|------|-------------|
| `messages_send` | Send messages immediately |
| `campaigns_trigger_send` | Trigger API-triggered campaigns |
| `canvas_trigger_send` | Trigger API-triggered canvases |
| `transactional_email_send` | Send transactional emails |
| `send_id_create` | Create send IDs for analytics |
| `live_activity_update` | Update iOS Live Activities |

### Scheduling (10 tools)

| Tool | Description |
|------|-------------|
| `scheduled_broadcasts_list` | List scheduled broadcasts |
| `messages_schedule_create` | Schedule a message |
| `messages_schedule_update` | Update a scheduled message |
| `messages_schedule_delete` | Delete a scheduled message |
| `campaigns_schedule_create` | Schedule an API campaign |
| `campaigns_schedule_update` | Update a scheduled campaign |
| `campaigns_schedule_delete` | Delete a scheduled campaign |
| `canvas_schedule_create` | Schedule an API canvas |
| `canvas_schedule_update` | Update a scheduled canvas |
| `canvas_schedule_delete` | Delete a scheduled canvas |

### Exports & Analytics (24 tools)

| Tool | Description |
|------|-------------|
| `campaigns_list` | List all campaigns |
| `campaigns_details` | Get campaign details |
| `campaigns_analytics` | Get campaign analytics |
| `sends_analytics` | Get send analytics |
| `canvas_list` | List all canvases |
| `canvas_details` | Get canvas details |
| `canvas_analytics` | Get canvas analytics |
| `canvas_summary` | Get canvas summary |
| `segments_list` | List all segments |
| `segments_details` | Get segment details |
| `segments_analytics` | Get segment analytics |
| `users_export` | Export users by IDs |
| `users_export_segment` | Export users by segment |
| `users_export_control_group` | Export global control group |
| `kpi_dau` | Get daily active users |
| `kpi_mau` | Get monthly active users |
| `kpi_new_users` | Get new users data |
| `kpi_uninstalls` | Get uninstall data |
| `events_list` | List custom events |
| `events_analytics` | Get event analytics |
| `purchases_products` | List purchased products |
| `purchases_quantity` | Get purchase quantities |
| `purchases_revenue` | Get revenue data |
| `sessions_analytics` | Get session analytics |

### Email Management (7 tools)

| Tool | Description |
|------|-------------|
| `email_hard_bounces` | Query hard bounced emails |
| `email_unsubscribes` | Query unsubscribed emails |
| `email_subscription_status` | Update email subscription |
| `email_bounce_remove` | Remove from bounce list |
| `email_spam_remove` | Remove from spam list |
| `email_blocklist` | Add to email blocklist |
| `email_blacklist` | Add to blacklist (deprecated) |

### SMS Management (2 tools)

| Tool | Description |
|------|-------------|
| `sms_invalid_phones` | Query invalid phone numbers |
| `sms_invalid_phones_remove` | Remove invalid phones |

### Subscriptions (4 tools)

| Tool | Description |
|------|-------------|
| `subscription_status_get` | Get subscription status |
| `subscription_user_status` | Get user's subscription groups |
| `subscription_status_set` | Update subscription status |
| `subscription_status_set_v2` | Update status (v2 API) |

### Templates (8 tools)

| Tool | Description |
|------|-------------|
| `email_templates_list` | List email templates |
| `email_templates_info` | Get template details |
| `email_templates_create` | Create email template |
| `email_templates_update` | Update email template |
| `content_blocks_list` | List content blocks |
| `content_blocks_info` | Get content block details |
| `content_blocks_create` | Create content block |
| `content_blocks_update` | Update content block |

### Catalogs (13 tools)

| Tool | Description |
|------|-------------|
| `catalogs_list` | List all catalogs |
| `catalogs_create` | Create a catalog |
| `catalogs_delete` | Delete a catalog |
| `catalog_items_list` | List catalog items |
| `catalog_items_create` | Create multiple items |
| `catalog_items_update` | Update multiple items |
| `catalog_items_edit` | Patch multiple items |
| `catalog_items_delete` | Delete multiple items |
| `catalog_item_get` | Get a single item |
| `catalog_item_create` | Create a single item |
| `catalog_item_update` | Update a single item |
| `catalog_item_edit` | Patch a single item |
| `catalog_item_delete` | Delete a single item |

### Preference Centers (5 tools)

| Tool | Description |
|------|-------------|
| `preference_centers_list` | List preference centers |
| `preference_center_get` | Get preference center details |
| `preference_center_url` | Get user's preference center URL |
| `preference_center_create` | Create preference center |
| `preference_center_update` | Update preference center |

### SCIM (5 tools)

| Tool | Description |
|------|-------------|
| `scim_users_search` | Search dashboard users |
| `scim_users_get` | Get dashboard user |
| `scim_users_create` | Create dashboard user |
| `scim_users_update` | Update dashboard user |
| `scim_users_delete` | Delete dashboard user |

## Development

```bash
# Run in development mode
npm run dev

# Build TypeScript
npm run build

# Run tests
npm test

# Run E2E tests (requires API key)
npm run test:e2e

# Type checking
npm run typecheck

# Lint
npm run lint
```

## Examples

### Track User Attributes

```javascript
// Track a user's attributes and custom event
await callTool("users_track", {
  attributes: [{
    external_id: "user123",
    first_name: "John",
    email: "john@example.com",
    custom_attribute: "premium"
  }],
  events: [{
    external_id: "user123",
    name: "purchase_completed",
    time: new Date().toISOString(),
    properties: { item: "Pro Plan", amount: 99.99 }
  }]
});
```

### Send a Campaign

```javascript
// Trigger an API campaign
await callTool("campaigns_trigger_send", {
  campaign_id: "campaign_abc123",
  recipients: [{
    external_user_id: "user123",
    trigger_properties: {
      product_name: "Premium Subscription"
    }
  }]
});
```

### Export Segment Users

```javascript
// Export users from a segment
await callTool("users_export_segment", {
  segment_id: "segment_xyz789",
  fields_to_export: ["external_id", "email", "first_name"]
});
```

## Architecture

```
src/
├── index.ts              # Entry point (STDIO transport)
├── server.ts             # MCP server initialization
├── tools/                # Tool definitions (92 tools across 11 files)
│   ├── users.ts          # User data operations
│   ├── messaging.ts      # Message sending
│   ├── scheduling.ts     # Campaign/Canvas scheduling
│   ├── exports.ts        # Data exports & analytics
│   ├── email.ts          # Email management
│   ├── sms.ts            # SMS operations
│   ├── subscriptions.ts  # Subscription groups
│   ├── templates.ts      # Template management
│   ├── catalogs.ts       # Catalog operations
│   ├── preference-center.ts # Preference centers
│   └── scim.ts           # SCIM user provisioning
└── lib/                  # Shared utilities (15 modules)
    ├── auth.ts           # API key extraction
    ├── client.ts         # Braze HTTP client
    ├── errors.ts         # Error handling
    ├── validation.ts     # Input validation
    ├── logger.ts         # Logging utilities
    ├── retry.ts          # Exponential backoff
    ├── circuit-breaker.ts # Cascade failure prevention
    ├── rate-limiter.ts   # Token bucket rate limiting
    ├── cache.ts          # TTL-based caching
    ├── request-queue.ts  # Concurrency control
    ├── deduplication.ts  # Request deduplication
    ├── idempotency.ts    # Safe retry tracking
    ├── health.ts         # Kubernetes probes
    └── sentry.ts         # Error tracking (optional)
```

## Testing

- **Unit tests**: 154 tests across 8 files
- **E2E tests**: 126 tests across 11 files
- **Coverage target**: 90%+ on lib/

## License

MIT
