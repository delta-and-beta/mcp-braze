# MCP Braze Server - Implementation Plan

## Overview

Building an MCP server for Braze with **116 API endpoints** across **13 categories**.

## API Endpoint Inventory

| Category | Endpoints | Priority | Tool File |
|----------|-----------|----------|-----------|
| User Data | 8 | P0 | `users.ts` |
| Send Messages | 5 | P0 | `messaging.ts` |
| Schedule Messages | 9 | P0 | `scheduling.ts` |
| Live Activities | 1 | P2 | `messaging.ts` |
| Campaign Export | 4 | P1 | `exports.ts` |
| Canvas Export | 4 | P1 | `exports.ts` |
| Segment Export | 3 | P1 | `exports.ts` |
| User Export | 3 | P1 | `exports.ts` |
| KPI Export | 4 | P1 | `exports.ts` |
| Custom Events Export | 2 | P1 | `exports.ts` |
| Purchases Export | 3 | P1 | `exports.ts` |
| Session Export | 1 | P2 | `exports.ts` |
| News Feed Export | 3 | P3 | `exports.ts` |
| Email Lists | 8 | P1 | `email.ts` |
| SMS | 2 | P1 | `sms.ts` |
| Subscription Groups | 4 | P1 | `subscriptions.ts` |
| Email Templates | 4 | P2 | `templates.ts` |
| Content Blocks | 4 | P2 | `templates.ts` |
| Catalogs | 13 | P2 | `catalogs.ts` |
| Preference Center | 5 | P3 | `preference-center.ts` |
| SCIM | 5 | P3 | `scim.ts` |
| **TOTAL** | **116** | | |

---

## Detailed Endpoint List by Tool File

### 1. `users.ts` - User Data (8 endpoints) - P0

| # | Endpoint | Method | Tool Name | Description |
|---|----------|--------|-----------|-------------|
| 1 | `/users/track` | POST | `users_track` | Track attributes, events, purchases |
| 2 | `/users/identify` | POST | `users_identify` | Identify alias users |
| 3 | `/users/alias/new` | POST | `users_alias_new` | Create new user alias |
| 4 | `/users/alias/update` | POST | `users_alias_update` | Update existing alias |
| 5 | `/users/delete` | POST | `users_delete` | Delete user profiles |
| 6 | `/users/merge` | POST | `users_merge` | Merge user profiles |
| 7 | `/users/external_ids/rename` | POST | `users_external_id_rename` | Rename external ID |
| 8 | `/users/external_ids/remove` | POST | `users_external_id_remove` | Remove deprecated external ID |

### 2. `messaging.ts` - Send Messages (6 endpoints) - P0

| # | Endpoint | Method | Tool Name | Description |
|---|----------|--------|-----------|-------------|
| 1 | `/messages/send` | POST | `messages_send` | Send messages immediately |
| 2 | `/campaigns/trigger/send` | POST | `campaigns_trigger_send` | Trigger API campaign |
| 3 | `/canvas/trigger/send` | POST | `canvas_trigger_send` | Trigger API Canvas |
| 4 | `/transactional/v1/campaigns/{id}/send` | POST | `transactional_email_send` | Send transactional email |
| 5 | `/sends/id/create` | POST | `send_id_create` | Create send ID |
| 6 | `/messages/live_activity/update` | POST | `live_activity_update` | Update iOS Live Activity |

### 3. `scheduling.ts` - Schedule Messages (9 endpoints) - P0

| # | Endpoint | Method | Tool Name | Description |
|---|----------|--------|-----------|-------------|
| 1 | `/messages/scheduled_broadcasts` | GET | `scheduled_broadcasts_list` | List scheduled broadcasts |
| 2 | `/messages/schedule/create` | POST | `messages_schedule_create` | Schedule message |
| 3 | `/messages/schedule/update` | POST | `messages_schedule_update` | Update scheduled message |
| 4 | `/messages/schedule/delete` | POST | `messages_schedule_delete` | Delete scheduled message |
| 5 | `/campaigns/trigger/schedule/create` | POST | `campaigns_schedule_create` | Schedule API campaign |
| 6 | `/campaigns/trigger/schedule/update` | POST | `campaigns_schedule_update` | Update scheduled campaign |
| 7 | `/campaigns/trigger/schedule/delete` | POST | `campaigns_schedule_delete` | Delete scheduled campaign |
| 8 | `/canvas/trigger/schedule/create` | POST | `canvas_schedule_create` | Schedule API Canvas |
| 9 | `/canvas/trigger/schedule/update` | POST | `canvas_schedule_update` | Update scheduled Canvas |
| 10 | `/canvas/trigger/schedule/delete` | POST | `canvas_schedule_delete` | Delete scheduled Canvas |

### 4. `exports.ts` - Data Exports (24 endpoints) - P1

#### Campaign & Canvas
| # | Endpoint | Method | Tool Name |
|---|----------|--------|-----------|
| 1 | `/campaigns/list` | GET | `campaigns_list` |
| 2 | `/campaigns/details` | GET | `campaigns_details` |
| 3 | `/campaigns/data_series` | GET | `campaigns_analytics` |
| 4 | `/sends/data_series` | GET | `sends_analytics` |
| 5 | `/canvas/list` | GET | `canvas_list` |
| 6 | `/canvas/details` | GET | `canvas_details` |
| 7 | `/canvas/data_series` | GET | `canvas_analytics` |
| 8 | `/canvas/data_summary` | GET | `canvas_summary` |

#### Segments
| # | Endpoint | Method | Tool Name |
|---|----------|--------|-----------|
| 9 | `/segments/list` | GET | `segments_list` |
| 10 | `/segments/details` | GET | `segments_details` |
| 11 | `/segments/data_series` | GET | `segments_analytics` |

#### Users
| # | Endpoint | Method | Tool Name |
|---|----------|--------|-----------|
| 12 | `/users/export/ids` | POST | `users_export` |
| 13 | `/users/export/segment` | POST | `users_export_segment` |
| 14 | `/users/export/global_control_group` | POST | `users_export_control_group` |

#### KPIs
| # | Endpoint | Method | Tool Name |
|---|----------|--------|-----------|
| 15 | `/kpi/dau/data_series` | GET | `kpi_dau` |
| 16 | `/kpi/mau/data_series` | GET | `kpi_mau` |
| 17 | `/kpi/new_users/data_series` | GET | `kpi_new_users` |
| 18 | `/kpi/uninstalls/data_series` | GET | `kpi_uninstalls` |

#### Events & Purchases
| # | Endpoint | Method | Tool Name |
|---|----------|--------|-----------|
| 19 | `/events/list` | GET | `events_list` |
| 20 | `/events/data_series` | GET | `events_analytics` |
| 21 | `/purchases/product_list` | GET | `purchases_products` |
| 22 | `/purchases/quantity_series` | GET | `purchases_quantity` |
| 23 | `/purchases/revenue_series` | GET | `purchases_revenue` |

#### Sessions
| # | Endpoint | Method | Tool Name |
|---|----------|--------|-----------|
| 24 | `/sessions/data_series` | GET | `sessions_analytics` |

### 5. `email.ts` - Email Management (8 endpoints) - P1

| # | Endpoint | Method | Tool Name | Description |
|---|----------|--------|-----------|-------------|
| 1 | `/email/hard_bounces` | GET | `email_hard_bounces` | Query bounced emails |
| 2 | `/email/unsubscribes` | GET | `email_unsubscribes` | Query unsubscribed emails |
| 3 | `/email/status` | POST | `email_subscription_status` | Change subscription status |
| 4 | `/email/bounce/remove` | POST | `email_bounce_remove` | Remove from bounce list |
| 5 | `/email/spam/remove` | POST | `email_spam_remove` | Remove from spam list |
| 6 | `/email/blocklist` | POST | `email_blocklist` | Add to blocklist |
| 7 | `/email/blacklist` | POST | `email_blacklist` | Add to blacklist (deprecated) |

### 6. `sms.ts` - SMS Management (2 endpoints) - P1

| # | Endpoint | Method | Tool Name | Description |
|---|----------|--------|-----------|-------------|
| 1 | `/sms/invalid_phone_numbers` | GET | `sms_invalid_phones` | Query invalid phones |
| 2 | `/sms/invalid_phone_numbers/remove` | POST | `sms_invalid_phones_remove` | Remove invalid phones |

### 7. `subscriptions.ts` - Subscription Groups (4 endpoints) - P1

| # | Endpoint | Method | Tool Name | Description |
|---|----------|--------|-----------|-------------|
| 1 | `/subscription/status/get` | GET | `subscription_status_get` | Get user subscription status |
| 2 | `/subscription/user/status` | GET | `subscription_user_status` | List user's groups |
| 3 | `/subscription/status/set` | POST | `subscription_status_set` | Update subscription status |
| 4 | `/v2/subscription/status/set` | POST | `subscription_status_set_v2` | Update status (V2) |

### 8. `templates.ts` - Templates & Content Blocks (8 endpoints) - P2

| # | Endpoint | Method | Tool Name | Description |
|---|----------|--------|-----------|-------------|
| 1 | `/templates/email/list` | GET | `email_templates_list` | List email templates |
| 2 | `/templates/email/info` | GET | `email_templates_info` | Get template details |
| 3 | `/templates/email/create` | POST | `email_templates_create` | Create email template |
| 4 | `/templates/email/update` | POST | `email_templates_update` | Update email template |
| 5 | `/content_blocks/list` | GET | `content_blocks_list` | List content blocks |
| 6 | `/content_blocks/info` | GET | `content_blocks_info` | Get content block details |
| 7 | `/content_blocks/create` | POST | `content_blocks_create` | Create content block |
| 8 | `/content_blocks/update` | POST | `content_blocks_update` | Update content block |

### 9. `catalogs.ts` - Catalogs (13 endpoints) - P2

| # | Endpoint | Method | Tool Name | Description |
|---|----------|--------|-----------|-------------|
| 1 | `/catalogs` | GET | `catalogs_list` | List all catalogs |
| 2 | `/catalogs` | POST | `catalogs_create` | Create catalog |
| 3 | `/catalogs/{name}` | DELETE | `catalogs_delete` | Delete catalog |
| 4 | `/catalogs/{name}/items` | GET | `catalog_items_list` | List catalog items |
| 5 | `/catalogs/{name}/items` | POST | `catalog_items_create` | Create multiple items |
| 6 | `/catalogs/{name}/items` | PUT | `catalog_items_update` | Update multiple items |
| 7 | `/catalogs/{name}/items` | PATCH | `catalog_items_edit` | Edit multiple items |
| 8 | `/catalogs/{name}/items` | DELETE | `catalog_items_delete` | Delete multiple items |
| 9 | `/catalogs/{name}/items/{id}` | GET | `catalog_item_get` | Get single item |
| 10 | `/catalogs/{name}/items/{id}` | POST | `catalog_item_create` | Create single item |
| 11 | `/catalogs/{name}/items/{id}` | PUT | `catalog_item_update` | Update single item |
| 12 | `/catalogs/{name}/items/{id}` | PATCH | `catalog_item_edit` | Edit single item |
| 13 | `/catalogs/{name}/items/{id}` | DELETE | `catalog_item_delete` | Delete single item |

### 10. `preference-center.ts` - Preference Center (5 endpoints) - P3

| # | Endpoint | Method | Tool Name |
|---|----------|--------|-----------|
| 1 | `/preference_center/v1/list` | GET | `preference_centers_list` |
| 2 | `/preference_center/v1/{id}` | GET | `preference_center_get` |
| 3 | `/preference_center/v1/{id}/url/{user}` | GET | `preference_center_url` |
| 4 | `/preference_center/v1` | POST | `preference_center_create` |
| 5 | `/preference_center/v1/{id}` | PUT | `preference_center_update` |

### 11. `scim.ts` - SCIM User Management (5 endpoints) - P3

| # | Endpoint | Method | Tool Name |
|---|----------|--------|-----------|
| 1 | `/scim/v2/Users` | GET | `scim_users_search` |
| 2 | `/scim/v2/Users` | POST | `scim_users_create` |
| 3 | `/scim/v2/Users/{id}` | GET | `scim_users_get` |
| 4 | `/scim/v2/Users/{id}` | PUT | `scim_users_update` |
| 5 | `/scim/v2/Users/{id}` | DELETE | `scim_users_delete` |

---

## Implementation Phases

### Phase 1: Foundation (P0) - 23 tools
- [ ] Project setup (package.json, tsconfig, etc.)
- [ ] Core lib modules (auth, client, errors, validation, logger)
- [ ] `users.ts` - 8 tools
- [ ] `messaging.ts` - 6 tools
- [ ] `scheduling.ts` - 9 tools

### Phase 2: Analytics & Lists (P1) - 38 tools
- [ ] `exports.ts` - 24 tools
- [ ] `email.ts` - 7 tools
- [ ] `sms.ts` - 2 tools
- [ ] `subscriptions.ts` - 4 tools

### Phase 3: Content Management (P2) - 22 tools
- [ ] `templates.ts` - 8 tools
- [ ] `catalogs.ts` - 13 tools
- [ ] Live Activity (1 tool in messaging.ts)

### Phase 4: Advanced Features (P3) - 10 tools
- [ ] `preference-center.ts` - 5 tools
- [ ] `scim.ts` - 5 tools

---

## File Structure

```
mcp-braze/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── vitest.e2e.config.ts
├── .gitignore
├── .env.example
├── CLAUDE.md
├── PLAN.md
└── src/
    ├── index.ts                 # Entry point
    ├── server.ts                # FastMCP server
    ├── lib/
    │   ├── index.ts             # Re-exports
    │   ├── auth.ts              # API key extraction
    │   ├── client.ts            # Braze HTTP client
    │   ├── errors.ts            # Error classes
    │   ├── validation.ts        # Zod schemas
    │   └── logger.ts            # Logging
    ├── tools/
    │   ├── users.ts             # 8 tools
    │   ├── messaging.ts         # 6 tools
    │   ├── scheduling.ts        # 9 tools
    │   ├── exports.ts           # 24 tools
    │   ├── email.ts             # 7 tools
    │   ├── sms.ts               # 2 tools
    │   ├── subscriptions.ts     # 4 tools
    │   ├── templates.ts         # 8 tools
    │   ├── catalogs.ts          # 13 tools
    │   ├── preference-center.ts # 5 tools
    │   └── scim.ts              # 5 tools
    └── __tests__/
        ├── unit/
        │   ├── auth.test.ts
        │   ├── validation.test.ts
        │   └── errors.test.ts
        └── e2e/
            └── tools.e2e.test.ts
```

---

## Questions Before Proceeding

1. **Scope**: Should I implement all 116 endpoints, or focus on P0+P1 first (61 tools)?
2. **News Feed**: News Feed is deprecated in Braze - skip those 3 endpoints?
3. **SCIM**: SCIM is for dashboard admin - include or skip?
4. **Catalogs**: Catalogs are complex with 13 endpoints - include in initial release?

---

## Estimated Tool Count by Priority

| Priority | Tools | Cumulative |
|----------|-------|------------|
| P0 | 23 | 23 |
| P1 | 38 | 61 |
| P2 | 22 | 83 |
| P3 | 10 | 93 |
| **Total** | **93** | (excluding 3 deprecated News Feed) |
