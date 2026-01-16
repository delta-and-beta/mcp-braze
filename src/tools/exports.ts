/**
 * Export Tools for Braze MCP Server
 * 24 tools for exporting campaigns, canvas, segments, users, KPIs, events, purchases, sessions
 */

import { z } from "zod";
import { server } from "../server.js";
import { extractApiKey, extractRestEndpoint } from "../lib/auth.js";
import { BrazeClient } from "../lib/client.js";
import { formatErrorResponse, formatSuccessResponse } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const userAliasSchema = z.object({
  alias_name: z.string().min(1),
  alias_label: z.string().min(1),
});

interface ToolArgs {
  apiKey?: string;
  restEndpoint?: string;
}

interface ToolResponse {
  content: Array<{ type: "text"; text: string }>;
  [key: string]: unknown;
}

/**
 * Execute a Braze API request with standardized error handling and response formatting.
 */
async function executeToolRequest<T extends ToolArgs>(
  toolName: string,
  args: T,
  requestFn: (client: BrazeClient) => Promise<unknown>,
  logContext?: Record<string, unknown>
): Promise<ToolResponse> {
  try {
    logger.info(`${toolName} called`, logContext);
    const apiKey = extractApiKey(args);
    const restEndpoint = extractRestEndpoint(args);
    const client = new BrazeClient({ apiKey, restEndpoint });

    const result = await requestFn(client);

    logger.info(`${toolName} completed`);
    return {
      content: [{ type: "text", text: JSON.stringify(formatSuccessResponse(result), null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: JSON.stringify(formatErrorResponse(error, { tool: toolName }), null, 2) }],
    };
  }
}


// ========================================
// CAMPAIGN EXPORTS
// ========================================

server.tool(
  "campaigns_list",
  "List all campaigns in the workspace.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    page: z.number().optional().describe("Page number (0-indexed)"),
    include_archived: z.boolean().optional().describe("Include archived campaigns"),
    sort_direction: z.enum(["asc", "desc"]).optional(),
    last_edit_time_gt: z.string().optional().describe("Filter by edit time (ISO 8601)"),
  },
  (args) =>
    executeToolRequest("campaigns_list", args, (client) =>
      client.request("/campaigns/list", {
        method: "GET",
        queryParams: {
          page: args.page,
          include_archived: args.include_archived,
          sort_direction: args.sort_direction,
          "last_edit.time[gt]": args.last_edit_time_gt,
        },
        context: { operation: "campaigns_list" },
      })
    )
);

server.tool(
  "campaigns_details",
  "Get details for a specific campaign.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    campaign_id: z.string().describe("Campaign ID"),
  },
  (args) =>
    executeToolRequest(
      "campaigns_details",
      args,
      (client) =>
        client.request("/campaigns/details", {
          method: "GET",
          queryParams: { campaign_id: args.campaign_id },
          context: { operation: "campaigns_details" },
        }),
      { campaignId: args.campaign_id }
    )
);

server.tool(
  "campaigns_analytics",
  "Get campaign performance analytics over time.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    campaign_id: z.string().describe("Campaign ID"),
    length: z.number().describe("Number of days to return (max 100)"),
    ending_at: z.string().optional().describe("End date (ISO 8601)"),
  },
  (args) =>
    executeToolRequest(
      "campaigns_analytics",
      args,
      (client) =>
        client.request("/campaigns/data_series", {
          method: "GET",
          queryParams: {
            campaign_id: args.campaign_id,
            length: args.length,
            ending_at: args.ending_at,
          },
          context: { operation: "campaigns_analytics" },
        }),
      { campaignId: args.campaign_id }
    )
);

server.tool(
  "sends_analytics",
  "Get analytics for a specific send ID.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    campaign_id: z.string().describe("Campaign ID"),
    send_id: z.string().describe("Send ID"),
    length: z.number().describe("Number of days"),
    ending_at: z.string().optional(),
  },
  (args) =>
    executeToolRequest(
      "sends_analytics",
      args,
      (client) =>
        client.request("/sends/data_series", {
          method: "GET",
          queryParams: {
            campaign_id: args.campaign_id,
            send_id: args.send_id,
            length: args.length,
            ending_at: args.ending_at,
          },
          context: { operation: "sends_analytics" },
        }),
      { sendId: args.send_id }
    )
);

// ========================================
// CANVAS EXPORTS
// ========================================

server.tool(
  "canvas_list",
  "List all Canvases in the workspace.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    page: z.number().optional(),
    include_archived: z.boolean().optional(),
    sort_direction: z.enum(["asc", "desc"]).optional(),
    last_edit_time_gt: z.string().optional(),
  },
  (args) =>
    executeToolRequest("canvas_list", args, (client) =>
      client.request("/canvas/list", {
        method: "GET",
        queryParams: {
          page: args.page,
          include_archived: args.include_archived,
          sort_direction: args.sort_direction,
          "last_edit.time[gt]": args.last_edit_time_gt,
        },
        context: { operation: "canvas_list" },
      })
    )
);

server.tool(
  "canvas_details",
  "Get details for a specific Canvas.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    canvas_id: z.string().describe("Canvas ID"),
  },
  (args) =>
    executeToolRequest(
      "canvas_details",
      args,
      (client) =>
        client.request("/canvas/details", {
          method: "GET",
          queryParams: { canvas_id: args.canvas_id },
          context: { operation: "canvas_details" },
        }),
      { canvasId: args.canvas_id }
    )
);

server.tool(
  "canvas_analytics",
  "Get Canvas performance analytics over time.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    canvas_id: z.string().describe("Canvas ID"),
    length: z.number().describe("Number of days"),
    ending_at: z.string().optional(),
    include_variant_breakdown: z.boolean().optional(),
    include_step_breakdown: z.boolean().optional(),
  },
  (args) =>
    executeToolRequest(
      "canvas_analytics",
      args,
      (client) =>
        client.request("/canvas/data_series", {
          method: "GET",
          queryParams: {
            canvas_id: args.canvas_id,
            length: args.length,
            ending_at: args.ending_at,
            include_variant_breakdown: args.include_variant_breakdown,
            include_step_breakdown: args.include_step_breakdown,
          },
          context: { operation: "canvas_analytics" },
        }),
      { canvasId: args.canvas_id }
    )
);

server.tool(
  "canvas_summary",
  "Get summary analytics for a Canvas.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    canvas_id: z.string().describe("Canvas ID"),
    length: z.number().describe("Number of days"),
    ending_at: z.string().optional(),
  },
  (args) =>
    executeToolRequest(
      "canvas_summary",
      args,
      (client) =>
        client.request("/canvas/data_summary", {
          method: "GET",
          queryParams: {
            canvas_id: args.canvas_id,
            length: args.length,
            ending_at: args.ending_at,
          },
          context: { operation: "canvas_summary" },
        }),
      { canvasId: args.canvas_id }
    )
);

// ========================================
// SEGMENT EXPORTS
// ========================================

server.tool(
  "segments_list",
  "List all segments in the workspace.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    page: z.number().optional(),
    sort_direction: z.enum(["asc", "desc"]).optional(),
  },
  (args) =>
    executeToolRequest("segments_list", args, (client) =>
      client.request("/segments/list", {
        method: "GET",
        queryParams: { page: args.page, sort_direction: args.sort_direction },
        context: { operation: "segments_list" },
      })
    )
);

server.tool(
  "segments_details",
  "Get details for a specific segment.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    segment_id: z.string().describe("Segment ID"),
  },
  (args) =>
    executeToolRequest(
      "segments_details",
      args,
      (client) =>
        client.request("/segments/details", {
          method: "GET",
          queryParams: { segment_id: args.segment_id },
          context: { operation: "segments_details" },
        }),
      { segmentId: args.segment_id }
    )
);

server.tool(
  "segments_analytics",
  "Get segment size analytics over time.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    segment_id: z.string().describe("Segment ID"),
    length: z.number().describe("Number of days"),
    ending_at: z.string().optional(),
  },
  (args) =>
    executeToolRequest(
      "segments_analytics",
      args,
      (client) =>
        client.request("/segments/data_series", {
          method: "GET",
          queryParams: {
            segment_id: args.segment_id,
            length: args.length,
            ending_at: args.ending_at,
          },
          context: { operation: "segments_analytics" },
        }),
      { segmentId: args.segment_id }
    )
);

// ========================================
// USER EXPORTS
// ========================================

server.tool(
  "users_export",
  "Export user profiles by identifier (external_id, user_alias, or braze_id).",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    external_ids: z.array(z.string()).optional().describe("External IDs to export"),
    user_aliases: z.array(userAliasSchema).optional(),
    braze_ids: z.array(z.string()).optional(),
    fields_to_export: z.array(z.string()).optional().describe("Specific fields to return"),
  },
  (args) =>
    executeToolRequest("users_export", args, (client) =>
      client.request("/users/export/ids", {
        body: {
          external_ids: args.external_ids,
          user_aliases: args.user_aliases,
          braze_ids: args.braze_ids,
          fields_to_export: args.fields_to_export,
        },
        context: { operation: "users_export" },
      })
    )
);

server.tool(
  "users_export_segment",
  "Export all user profiles in a segment (async job).",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    segment_id: z.string().describe("Segment ID to export"),
    callback_endpoint: z.string().optional().describe("Webhook URL for completion"),
    fields_to_export: z.array(z.string()).optional(),
    output_format: z.enum(["zip", "gzip"]).optional(),
  },
  (args) =>
    executeToolRequest(
      "users_export_segment",
      args,
      (client) =>
        client.request("/users/export/segment", {
          body: {
            segment_id: args.segment_id,
            callback_endpoint: args.callback_endpoint,
            fields_to_export: args.fields_to_export,
            output_format: args.output_format,
          },
          context: { operation: "users_export_segment" },
        }),
      { segmentId: args.segment_id }
    )
);

server.tool(
  "users_export_control_group",
  "Export users in the Global Control Group.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    callback_endpoint: z.string().optional(),
    fields_to_export: z.array(z.string()).optional(),
    output_format: z.enum(["zip", "gzip"]).optional(),
  },
  (args) =>
    executeToolRequest("users_export_control_group", args, (client) =>
      client.request("/users/export/global_control_group", {
        body: {
          callback_endpoint: args.callback_endpoint,
          fields_to_export: args.fields_to_export,
          output_format: args.output_format,
        },
        context: { operation: "users_export_control_group" },
      })
    )
);

// ========================================
// KPI EXPORTS
// ========================================

server.tool(
  "kpi_dau",
  "Get daily active users (DAU) over time.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    length: z.number().describe("Number of days"),
    ending_at: z.string().optional(),
    app_id: z.string().optional().describe("Specific app ID"),
  },
  (args) =>
    executeToolRequest("kpi_dau", args, (client) =>
      client.request("/kpi/dau/data_series", {
        method: "GET",
        queryParams: { length: args.length, ending_at: args.ending_at, app_id: args.app_id },
        context: { operation: "kpi_dau" },
      })
    )
);

server.tool(
  "kpi_mau",
  "Get monthly active users (MAU) over time.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    length: z.number().describe("Number of days"),
    ending_at: z.string().optional(),
    app_id: z.string().optional(),
  },
  (args) =>
    executeToolRequest("kpi_mau", args, (client) =>
      client.request("/kpi/mau/data_series", {
        method: "GET",
        queryParams: { length: args.length, ending_at: args.ending_at, app_id: args.app_id },
        context: { operation: "kpi_mau" },
      })
    )
);

server.tool(
  "kpi_new_users",
  "Get new users count over time.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    length: z.number().describe("Number of days"),
    ending_at: z.string().optional(),
    app_id: z.string().optional(),
  },
  (args) =>
    executeToolRequest("kpi_new_users", args, (client) =>
      client.request("/kpi/new_users/data_series", {
        method: "GET",
        queryParams: { length: args.length, ending_at: args.ending_at, app_id: args.app_id },
        context: { operation: "kpi_new_users" },
      })
    )
);

server.tool(
  "kpi_uninstalls",
  "Get app uninstalls over time.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    length: z.number().describe("Number of days"),
    ending_at: z.string().optional(),
    app_id: z.string().optional(),
  },
  (args) =>
    executeToolRequest("kpi_uninstalls", args, (client) =>
      client.request("/kpi/uninstalls/data_series", {
        method: "GET",
        queryParams: { length: args.length, ending_at: args.ending_at, app_id: args.app_id },
        context: { operation: "kpi_uninstalls" },
      })
    )
);

// ========================================
// EVENTS & PURCHASES EXPORTS
// ========================================

server.tool(
  "events_list",
  "List all custom events tracked in the app.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    page: z.number().optional(),
  },
  (args) =>
    executeToolRequest("events_list", args, (client) =>
      client.request("/events/list", {
        method: "GET",
        queryParams: { page: args.page },
        context: { operation: "events_list" },
      })
    )
);

server.tool(
  "events_analytics",
  "Get custom event analytics over time.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    event: z.string().describe("Event name"),
    length: z.number().describe("Number of days"),
    ending_at: z.string().optional(),
    app_id: z.string().optional(),
    unit: z.enum(["day", "hour", "week", "month"]).optional(),
  },
  (args) =>
    executeToolRequest(
      "events_analytics",
      args,
      (client) =>
        client.request("/events/data_series", {
          method: "GET",
          queryParams: {
            event: args.event,
            length: args.length,
            ending_at: args.ending_at,
            app_id: args.app_id,
            unit: args.unit,
          },
          context: { operation: "events_analytics" },
        }),
      { event: args.event }
    )
);

server.tool(
  "purchases_products",
  "List all product IDs from purchase events.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    page: z.number().optional(),
  },
  (args) =>
    executeToolRequest("purchases_products", args, (client) =>
      client.request("/purchases/product_list", {
        method: "GET",
        queryParams: { page: args.page },
        context: { operation: "purchases_products" },
      })
    )
);

server.tool(
  "purchases_quantity",
  "Get purchase quantity analytics over time.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    product_id: z.string().describe("Product ID"),
    length: z.number().describe("Number of days"),
    ending_at: z.string().optional(),
    app_id: z.string().optional(),
    unit: z.enum(["day", "hour", "week", "month"]).optional(),
  },
  (args) =>
    executeToolRequest(
      "purchases_quantity",
      args,
      (client) =>
        client.request("/purchases/quantity_series", {
          method: "GET",
          queryParams: {
            product_id: args.product_id,
            length: args.length,
            ending_at: args.ending_at,
            app_id: args.app_id,
            unit: args.unit,
          },
          context: { operation: "purchases_quantity" },
        }),
      { productId: args.product_id }
    )
);

server.tool(
  "purchases_revenue",
  "Get revenue analytics over time.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    product_id: z.string().describe("Product ID"),
    length: z.number().describe("Number of days"),
    ending_at: z.string().optional(),
    app_id: z.string().optional(),
    unit: z.enum(["day", "hour", "week", "month"]).optional(),
  },
  (args) =>
    executeToolRequest(
      "purchases_revenue",
      args,
      (client) =>
        client.request("/purchases/revenue_series", {
          method: "GET",
          queryParams: {
            product_id: args.product_id,
            length: args.length,
            ending_at: args.ending_at,
            app_id: args.app_id,
            unit: args.unit,
          },
          context: { operation: "purchases_revenue" },
        }),
      { productId: args.product_id }
    )
);

// ========================================
// SESSIONS
// ========================================

server.tool(
  "sessions_analytics",
  "Get app session analytics over time.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    length: z.number().describe("Number of days"),
    ending_at: z.string().optional(),
    app_id: z.string().optional(),
    unit: z.enum(["day", "hour", "week", "month"]).optional(),
  },
  (args) =>
    executeToolRequest("sessions_analytics", args, (client) =>
      client.request("/sessions/data_series", {
        method: "GET",
        queryParams: {
          length: args.length,
          ending_at: args.ending_at,
          app_id: args.app_id,
          unit: args.unit,
        },
        context: { operation: "sessions_analytics" },
      })
    )
);
