/**
 * Export Tools for Braze MCP Server
 * 24 tools for exporting campaigns, canvas, segments, users, KPIs, events, purchases, sessions
 */

import { z } from "zod";
import { server, type SessionData } from "../server.js";
import { extractApiKey, extractRestEndpoint } from "../lib/auth.js";
import { BrazeClient } from "../lib/client.js";
import { formatErrorResponse } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const userAliasSchema = z.object({
  alias_name: z.string().min(1),
  alias_label: z.string().min(1),
});

const authSchema = z.object({
  apiKey: z.string().optional().describe("Braze REST API key"),
  restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
});

// ========================================
// CAMPAIGN EXPORTS
// ========================================

server.addTool({
  name: "campaigns_list",
  description: "List all campaigns in the workspace.",
  parameters: authSchema.extend({
    page: z.number().optional().describe("Page number (0-indexed)"),
    include_archived: z.boolean().optional().describe("Include archived campaigns"),
    sort_direction: z.enum(["asc", "desc"]).optional(),
    last_edit_time_gt: z.string().optional().describe("Filter by edit time (ISO 8601)"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("campaigns_list called");
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/campaigns/list", {
        method: "GET",
        queryParams: {
          page: args.page,
          include_archived: args.include_archived,
          sort_direction: args.sort_direction,
          "last_edit.time[gt]": args.last_edit_time_gt,
        },
        context: { operation: "campaigns_list" },
      });

      logger.info("campaigns_list completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "campaigns_list" }), null, 2);
    }
  },
});

server.addTool({
  name: "campaigns_details",
  description: "Get details for a specific campaign.",
  parameters: authSchema.extend({
    campaign_id: z.string().describe("Campaign ID"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("campaigns_details called", { campaignId: args.campaign_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/campaigns/details", {
        method: "GET",
        queryParams: { campaign_id: args.campaign_id },
        context: { operation: "campaigns_details" },
      });

      logger.info("campaigns_details completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "campaigns_details" }), null, 2);
    }
  },
});

server.addTool({
  name: "campaigns_analytics",
  description: "Get campaign performance analytics over time.",
  parameters: authSchema.extend({
    campaign_id: z.string().describe("Campaign ID"),
    length: z.number().describe("Number of days to return (max 100)"),
    ending_at: z.string().optional().describe("End date (ISO 8601)"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("campaigns_analytics called", { campaignId: args.campaign_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/campaigns/data_series", {
        method: "GET",
        queryParams: {
          campaign_id: args.campaign_id,
          length: args.length,
          ending_at: args.ending_at,
        },
        context: { operation: "campaigns_analytics" },
      });

      logger.info("campaigns_analytics completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "campaigns_analytics" }), null, 2);
    }
  },
});

server.addTool({
  name: "sends_analytics",
  description: "Get analytics for a specific send ID.",
  parameters: authSchema.extend({
    campaign_id: z.string().describe("Campaign ID"),
    send_id: z.string().describe("Send ID"),
    length: z.number().describe("Number of days"),
    ending_at: z.string().optional(),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("sends_analytics called", { sendId: args.send_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/sends/data_series", {
        method: "GET",
        queryParams: {
          campaign_id: args.campaign_id,
          send_id: args.send_id,
          length: args.length,
          ending_at: args.ending_at,
        },
        context: { operation: "sends_analytics" },
      });

      logger.info("sends_analytics completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "sends_analytics" }), null, 2);
    }
  },
});

// ========================================
// CANVAS EXPORTS
// ========================================

server.addTool({
  name: "canvas_list",
  description: "List all Canvases in the workspace.",
  parameters: authSchema.extend({
    page: z.number().optional(),
    include_archived: z.boolean().optional(),
    sort_direction: z.enum(["asc", "desc"]).optional(),
    last_edit_time_gt: z.string().optional(),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("canvas_list called");
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/canvas/list", {
        method: "GET",
        queryParams: {
          page: args.page,
          include_archived: args.include_archived,
          sort_direction: args.sort_direction,
          "last_edit.time[gt]": args.last_edit_time_gt,
        },
        context: { operation: "canvas_list" },
      });

      logger.info("canvas_list completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "canvas_list" }), null, 2);
    }
  },
});

server.addTool({
  name: "canvas_details",
  description: "Get details for a specific Canvas.",
  parameters: authSchema.extend({
    canvas_id: z.string().describe("Canvas ID"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("canvas_details called", { canvasId: args.canvas_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/canvas/details", {
        method: "GET",
        queryParams: { canvas_id: args.canvas_id },
        context: { operation: "canvas_details" },
      });

      logger.info("canvas_details completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "canvas_details" }), null, 2);
    }
  },
});

server.addTool({
  name: "canvas_analytics",
  description: "Get Canvas performance analytics over time.",
  parameters: authSchema.extend({
    canvas_id: z.string().describe("Canvas ID"),
    length: z.number().describe("Number of days"),
    ending_at: z.string().optional(),
    include_variant_breakdown: z.boolean().optional(),
    include_step_breakdown: z.boolean().optional(),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("canvas_analytics called", { canvasId: args.canvas_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/canvas/data_series", {
        method: "GET",
        queryParams: {
          canvas_id: args.canvas_id,
          length: args.length,
          ending_at: args.ending_at,
          include_variant_breakdown: args.include_variant_breakdown,
          include_step_breakdown: args.include_step_breakdown,
        },
        context: { operation: "canvas_analytics" },
      });

      logger.info("canvas_analytics completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "canvas_analytics" }), null, 2);
    }
  },
});

server.addTool({
  name: "canvas_summary",
  description: "Get summary analytics for a Canvas.",
  parameters: authSchema.extend({
    canvas_id: z.string().describe("Canvas ID"),
    length: z.number().describe("Number of days"),
    ending_at: z.string().optional(),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("canvas_summary called", { canvasId: args.canvas_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/canvas/data_summary", {
        method: "GET",
        queryParams: {
          canvas_id: args.canvas_id,
          length: args.length,
          ending_at: args.ending_at,
        },
        context: { operation: "canvas_summary" },
      });

      logger.info("canvas_summary completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "canvas_summary" }), null, 2);
    }
  },
});

// ========================================
// SEGMENT EXPORTS
// ========================================

server.addTool({
  name: "segments_list",
  description: "List all segments in the workspace.",
  parameters: authSchema.extend({
    page: z.number().optional(),
    sort_direction: z.enum(["asc", "desc"]).optional(),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("segments_list called");
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/segments/list", {
        method: "GET",
        queryParams: { page: args.page, sort_direction: args.sort_direction },
        context: { operation: "segments_list" },
      });

      logger.info("segments_list completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "segments_list" }), null, 2);
    }
  },
});

server.addTool({
  name: "segments_details",
  description: "Get details for a specific segment.",
  parameters: authSchema.extend({
    segment_id: z.string().describe("Segment ID"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("segments_details called", { segmentId: args.segment_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/segments/details", {
        method: "GET",
        queryParams: { segment_id: args.segment_id },
        context: { operation: "segments_details" },
      });

      logger.info("segments_details completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "segments_details" }), null, 2);
    }
  },
});

server.addTool({
  name: "segments_analytics",
  description: "Get segment size analytics over time.",
  parameters: authSchema.extend({
    segment_id: z.string().describe("Segment ID"),
    length: z.number().describe("Number of days"),
    ending_at: z.string().optional(),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("segments_analytics called", { segmentId: args.segment_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/segments/data_series", {
        method: "GET",
        queryParams: {
          segment_id: args.segment_id,
          length: args.length,
          ending_at: args.ending_at,
        },
        context: { operation: "segments_analytics" },
      });

      logger.info("segments_analytics completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "segments_analytics" }), null, 2);
    }
  },
});

// ========================================
// USER EXPORTS
// ========================================

server.addTool({
  name: "users_export",
  description: "Export user profiles by identifier (external_id, user_alias, or braze_id).",
  parameters: authSchema.extend({
    external_ids: z.array(z.string()).optional().describe("External IDs to export"),
    user_aliases: z.array(userAliasSchema).optional(),
    braze_ids: z.array(z.string()).optional(),
    fields_to_export: z.array(z.string()).optional().describe("Specific fields to return"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("users_export called");
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/users/export/ids", {
        body: {
          external_ids: args.external_ids,
          user_aliases: args.user_aliases,
          braze_ids: args.braze_ids,
          fields_to_export: args.fields_to_export,
        },
        context: { operation: "users_export" },
      });

      logger.info("users_export completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "users_export" }), null, 2);
    }
  },
});

server.addTool({
  name: "users_export_segment",
  description: "Export all user profiles in a segment (async job).",
  parameters: authSchema.extend({
    segment_id: z.string().describe("Segment ID to export"),
    callback_endpoint: z.string().optional().describe("Webhook URL for completion"),
    fields_to_export: z.array(z.string()).optional(),
    output_format: z.enum(["zip", "gzip"]).optional(),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("users_export_segment called", { segmentId: args.segment_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/users/export/segment", {
        body: {
          segment_id: args.segment_id,
          callback_endpoint: args.callback_endpoint,
          fields_to_export: args.fields_to_export,
          output_format: args.output_format,
        },
        context: { operation: "users_export_segment" },
      });

      logger.info("users_export_segment completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "users_export_segment" }), null, 2);
    }
  },
});

server.addTool({
  name: "users_export_control_group",
  description: "Export users in the Global Control Group.",
  parameters: authSchema.extend({
    callback_endpoint: z.string().optional(),
    fields_to_export: z.array(z.string()).optional(),
    output_format: z.enum(["zip", "gzip"]).optional(),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("users_export_control_group called");
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/users/export/global_control_group", {
        body: {
          callback_endpoint: args.callback_endpoint,
          fields_to_export: args.fields_to_export,
          output_format: args.output_format,
        },
        context: { operation: "users_export_control_group" },
      });

      logger.info("users_export_control_group completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "users_export_control_group" }), null, 2);
    }
  },
});

// ========================================
// KPI EXPORTS
// ========================================

server.addTool({
  name: "kpi_dau",
  description: "Get daily active users (DAU) over time.",
  parameters: authSchema.extend({
    length: z.number().describe("Number of days"),
    ending_at: z.string().optional(),
    app_id: z.string().optional().describe("Specific app ID"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("kpi_dau called");
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/kpi/dau/data_series", {
        method: "GET",
        queryParams: { length: args.length, ending_at: args.ending_at, app_id: args.app_id },
        context: { operation: "kpi_dau" },
      });

      logger.info("kpi_dau completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "kpi_dau" }), null, 2);
    }
  },
});

server.addTool({
  name: "kpi_mau",
  description: "Get monthly active users (MAU) over time.",
  parameters: authSchema.extend({
    length: z.number().describe("Number of days"),
    ending_at: z.string().optional(),
    app_id: z.string().optional(),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("kpi_mau called");
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/kpi/mau/data_series", {
        method: "GET",
        queryParams: { length: args.length, ending_at: args.ending_at, app_id: args.app_id },
        context: { operation: "kpi_mau" },
      });

      logger.info("kpi_mau completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "kpi_mau" }), null, 2);
    }
  },
});

server.addTool({
  name: "kpi_new_users",
  description: "Get new users count over time.",
  parameters: authSchema.extend({
    length: z.number().describe("Number of days"),
    ending_at: z.string().optional(),
    app_id: z.string().optional(),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("kpi_new_users called");
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/kpi/new_users/data_series", {
        method: "GET",
        queryParams: { length: args.length, ending_at: args.ending_at, app_id: args.app_id },
        context: { operation: "kpi_new_users" },
      });

      logger.info("kpi_new_users completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "kpi_new_users" }), null, 2);
    }
  },
});

server.addTool({
  name: "kpi_uninstalls",
  description: "Get app uninstalls over time.",
  parameters: authSchema.extend({
    length: z.number().describe("Number of days"),
    ending_at: z.string().optional(),
    app_id: z.string().optional(),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("kpi_uninstalls called");
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/kpi/uninstalls/data_series", {
        method: "GET",
        queryParams: { length: args.length, ending_at: args.ending_at, app_id: args.app_id },
        context: { operation: "kpi_uninstalls" },
      });

      logger.info("kpi_uninstalls completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "kpi_uninstalls" }), null, 2);
    }
  },
});

// ========================================
// EVENTS & PURCHASES EXPORTS
// ========================================

server.addTool({
  name: "events_list",
  description: "List all custom events tracked in the app.",
  parameters: authSchema.extend({
    page: z.number().optional(),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("events_list called");
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/events/list", {
        method: "GET",
        queryParams: { page: args.page },
        context: { operation: "events_list" },
      });

      logger.info("events_list completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "events_list" }), null, 2);
    }
  },
});

server.addTool({
  name: "events_analytics",
  description: "Get custom event analytics over time.",
  parameters: authSchema.extend({
    event: z.string().describe("Event name"),
    length: z.number().describe("Number of days"),
    ending_at: z.string().optional(),
    app_id: z.string().optional(),
    unit: z.enum(["day", "hour", "week", "month"]).optional(),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("events_analytics called", { event: args.event });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/events/data_series", {
        method: "GET",
        queryParams: {
          event: args.event,
          length: args.length,
          ending_at: args.ending_at,
          app_id: args.app_id,
          unit: args.unit,
        },
        context: { operation: "events_analytics" },
      });

      logger.info("events_analytics completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "events_analytics" }), null, 2);
    }
  },
});

server.addTool({
  name: "purchases_products",
  description: "List all product IDs from purchase events.",
  parameters: authSchema.extend({
    page: z.number().optional(),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("purchases_products called");
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/purchases/product_list", {
        method: "GET",
        queryParams: { page: args.page },
        context: { operation: "purchases_products" },
      });

      logger.info("purchases_products completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "purchases_products" }), null, 2);
    }
  },
});

server.addTool({
  name: "purchases_quantity",
  description: "Get purchase quantity analytics over time.",
  parameters: authSchema.extend({
    product_id: z.string().describe("Product ID"),
    length: z.number().describe("Number of days"),
    ending_at: z.string().optional(),
    app_id: z.string().optional(),
    unit: z.enum(["day", "hour", "week", "month"]).optional(),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("purchases_quantity called", { productId: args.product_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/purchases/quantity_series", {
        method: "GET",
        queryParams: {
          product_id: args.product_id,
          length: args.length,
          ending_at: args.ending_at,
          app_id: args.app_id,
          unit: args.unit,
        },
        context: { operation: "purchases_quantity" },
      });

      logger.info("purchases_quantity completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "purchases_quantity" }), null, 2);
    }
  },
});

server.addTool({
  name: "purchases_revenue",
  description: "Get revenue analytics over time.",
  parameters: authSchema.extend({
    product_id: z.string().describe("Product ID"),
    length: z.number().describe("Number of days"),
    ending_at: z.string().optional(),
    app_id: z.string().optional(),
    unit: z.enum(["day", "hour", "week", "month"]).optional(),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("purchases_revenue called", { productId: args.product_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/purchases/revenue_series", {
        method: "GET",
        queryParams: {
          product_id: args.product_id,
          length: args.length,
          ending_at: args.ending_at,
          app_id: args.app_id,
          unit: args.unit,
        },
        context: { operation: "purchases_revenue" },
      });

      logger.info("purchases_revenue completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "purchases_revenue" }), null, 2);
    }
  },
});

// ========================================
// SESSIONS
// ========================================

server.addTool({
  name: "sessions_analytics",
  description: "Get app session analytics over time.",
  parameters: authSchema.extend({
    length: z.number().describe("Number of days"),
    ending_at: z.string().optional(),
    app_id: z.string().optional(),
    unit: z.enum(["day", "hour", "week", "month"]).optional(),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("sessions_analytics called");
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/sessions/data_series", {
        method: "GET",
        queryParams: {
          length: args.length,
          ending_at: args.ending_at,
          app_id: args.app_id,
          unit: args.unit,
        },
        context: { operation: "sessions_analytics" },
      });

      logger.info("sessions_analytics completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "sessions_analytics" }), null, 2);
    }
  },
});
