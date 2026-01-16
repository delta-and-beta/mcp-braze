/**
 * Scheduling Tools for Braze MCP Server
 * 10 tools for scheduling and managing scheduled messages, campaigns, and canvases
 */

import { z } from "zod";
import { server } from "../server.js";
import { extractApiKey, extractRestEndpoint } from "../lib/auth.js";
import { BrazeClient } from "../lib/client.js";
import { formatErrorResponse } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

// Response type for MCP tool handlers
type McpToolResponse = { content: Array<{ type: "text"; text: string }> };

/**
 * Creates a standardized JSON response for MCP tools
 */
function createJsonResponse(data: object): McpToolResponse {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Creates a standardized success response for MCP tools
 */
function createSuccessResponse(result: Record<string, unknown>): McpToolResponse {
  return createJsonResponse({ success: true, ...result });
}

/**
 * Creates a standardized error response for MCP tools
 */
function createErrorResponse(error: unknown, toolName: string): McpToolResponse {
  return createJsonResponse(formatErrorResponse(error, { tool: toolName }));
}

const userAliasSchema = z.object({
  alias_name: z.string().min(1),
  alias_label: z.string().min(1),
});

const scheduleSchema = z.object({
  time: z.string().describe("ISO 8601 datetime for send"),
  in_local_time: z.boolean().optional().describe("Send in user's local time"),
  at_optimal_time: z.boolean().optional().describe("Use Intelligent Timing"),
});

const audienceSchema = z.object({
  AND: z.array(z.record(z.unknown())).optional(),
  OR: z.array(z.record(z.unknown())).optional(),
}).optional();

const messagesSchema = z.object({
  apple_push: z.record(z.unknown()).optional(),
  android_push: z.record(z.unknown()).optional(),
  email: z.record(z.unknown()).optional(),
  webhook: z.record(z.unknown()).optional(),
  content_card: z.record(z.unknown()).optional(),
}).passthrough().optional();

// ========================================
// scheduled_broadcasts_list - List scheduled broadcasts
// ========================================

server.tool(
  "scheduled_broadcasts_list",
  "List upcoming scheduled campaigns and Canvases.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    end_time: z.string().describe("ISO 8601 end time for query range"),
  },
  async (args) => {
    try {
      logger.info("scheduled_broadcasts_list called");

      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<Record<string, unknown>>("/messages/scheduled_broadcasts", {
        method: "GET",
        queryParams: { end_time: args.end_time },
        context: { operation: "scheduled_broadcasts_list" },
      });

      logger.info("scheduled_broadcasts_list completed");
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error, "scheduled_broadcasts_list");
    }
  }
);

// ========================================
// messages_schedule_create - Schedule message
// ========================================

server.tool(
  "messages_schedule_create",
  "Schedule a message to be sent at a specific time.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    broadcast: z.boolean().optional(),
    external_user_ids: z.array(z.string()).optional(),
    user_aliases: z.array(userAliasSchema).optional(),
    segment_id: z.string().optional(),
    audience: audienceSchema,
    campaign_id: z.string().optional(),
    send_id: z.string().optional(),
    schedule: scheduleSchema,
    messages: messagesSchema,
  },
  async (args) => {
    try {
      logger.info("messages_schedule_create called", { scheduleTime: args.schedule.time });

      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<Record<string, unknown>>("/messages/schedule/create", {
        body: {
          broadcast: args.broadcast,
          external_user_ids: args.external_user_ids,
          user_aliases: args.user_aliases,
          segment_id: args.segment_id,
          audience: args.audience,
          campaign_id: args.campaign_id,
          send_id: args.send_id,
          schedule: args.schedule,
          messages: args.messages,
        },
        context: { operation: "messages_schedule_create" },
      });

      logger.info("messages_schedule_create completed");
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error, "messages_schedule_create");
    }
  }
);

// ========================================
// messages_schedule_update - Update scheduled message
// ========================================

server.tool(
  "messages_schedule_update",
  "Update a previously scheduled message.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    schedule_id: z.string().describe("Schedule ID to update"),
    schedule: scheduleSchema,
    messages: messagesSchema.optional(),
  },
  async (args) => {
    try {
      logger.info("messages_schedule_update called", { scheduleId: args.schedule_id });

      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<Record<string, unknown>>("/messages/schedule/update", {
        body: {
          schedule_id: args.schedule_id,
          schedule: args.schedule,
          messages: args.messages,
        },
        context: { operation: "messages_schedule_update" },
      });

      logger.info("messages_schedule_update completed");
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error, "messages_schedule_update");
    }
  }
);

// ========================================
// messages_schedule_delete - Delete scheduled message
// ========================================

server.tool(
  "messages_schedule_delete",
  "Delete a previously scheduled message.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    schedule_id: z.string().describe("Schedule ID to delete"),
  },
  async (args) => {
    try {
      logger.info("messages_schedule_delete called", { scheduleId: args.schedule_id });

      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<Record<string, unknown>>("/messages/schedule/delete", {
        body: { schedule_id: args.schedule_id },
        context: { operation: "messages_schedule_delete" },
      });

      logger.info("messages_schedule_delete completed");
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error, "messages_schedule_delete");
    }
  }
);

// ========================================
// campaigns_schedule_create - Schedule API campaign
// ========================================

server.tool(
  "campaigns_schedule_create",
  "Schedule an API-triggered campaign for future delivery.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    campaign_id: z.string().describe("API-triggered campaign ID"),
    send_id: z.string().optional(),
    recipients: z.array(z.object({
      external_user_id: z.string().optional(),
      user_alias: userAliasSchema.optional(),
      trigger_properties: z.record(z.unknown()).optional(),
    })).optional(),
    audience: audienceSchema,
    broadcast: z.boolean().optional(),
    schedule: scheduleSchema,
  },
  async (args) => {
    try {
      logger.info("campaigns_schedule_create called", { campaignId: args.campaign_id });

      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<Record<string, unknown>>("/campaigns/trigger/schedule/create", {
        body: {
          campaign_id: args.campaign_id,
          send_id: args.send_id,
          recipients: args.recipients,
          audience: args.audience,
          broadcast: args.broadcast,
          schedule: args.schedule,
        },
        context: { operation: "campaigns_schedule_create" },
      });

      logger.info("campaigns_schedule_create completed");
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error, "campaigns_schedule_create");
    }
  }
);

// ========================================
// campaigns_schedule_update - Update scheduled campaign
// ========================================

server.tool(
  "campaigns_schedule_update",
  "Update a scheduled API-triggered campaign.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    campaign_id: z.string().describe("Campaign ID"),
    schedule_id: z.string().describe("Schedule ID to update"),
    schedule: scheduleSchema,
  },
  async (args) => {
    try {
      logger.info("campaigns_schedule_update called", { scheduleId: args.schedule_id });

      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<Record<string, unknown>>("/campaigns/trigger/schedule/update", {
        body: {
          campaign_id: args.campaign_id,
          schedule_id: args.schedule_id,
          schedule: args.schedule,
        },
        context: { operation: "campaigns_schedule_update" },
      });

      logger.info("campaigns_schedule_update completed");
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error, "campaigns_schedule_update");
    }
  }
);

// ========================================
// campaigns_schedule_delete - Delete scheduled campaign
// ========================================

server.tool(
  "campaigns_schedule_delete",
  "Delete a scheduled API-triggered campaign.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    campaign_id: z.string().describe("Campaign ID"),
    schedule_id: z.string().describe("Schedule ID to delete"),
  },
  async (args) => {
    try {
      logger.info("campaigns_schedule_delete called", { scheduleId: args.schedule_id });

      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<Record<string, unknown>>("/campaigns/trigger/schedule/delete", {
        body: {
          campaign_id: args.campaign_id,
          schedule_id: args.schedule_id,
        },
        context: { operation: "campaigns_schedule_delete" },
      });

      logger.info("campaigns_schedule_delete completed");
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error, "campaigns_schedule_delete");
    }
  }
);

// ========================================
// canvas_schedule_create - Schedule API Canvas
// ========================================

server.tool(
  "canvas_schedule_create",
  "Schedule an API-triggered Canvas for future delivery.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    canvas_id: z.string().describe("API-triggered Canvas ID"),
    recipients: z.array(z.object({
      external_user_id: z.string().optional(),
      user_alias: userAliasSchema.optional(),
      canvas_entry_properties: z.record(z.unknown()).optional(),
    })).optional(),
    audience: audienceSchema,
    broadcast: z.boolean().optional(),
    schedule: scheduleSchema,
  },
  async (args) => {
    try {
      logger.info("canvas_schedule_create called", { canvasId: args.canvas_id });

      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<Record<string, unknown>>("/canvas/trigger/schedule/create", {
        body: {
          canvas_id: args.canvas_id,
          recipients: args.recipients,
          audience: args.audience,
          broadcast: args.broadcast,
          schedule: args.schedule,
        },
        context: { operation: "canvas_schedule_create" },
      });

      logger.info("canvas_schedule_create completed");
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error, "canvas_schedule_create");
    }
  }
);

// ========================================
// canvas_schedule_update - Update scheduled Canvas
// ========================================

server.tool(
  "canvas_schedule_update",
  "Update a scheduled API-triggered Canvas.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    canvas_id: z.string().describe("Canvas ID"),
    schedule_id: z.string().describe("Schedule ID to update"),
    schedule: scheduleSchema,
  },
  async (args) => {
    try {
      logger.info("canvas_schedule_update called", { scheduleId: args.schedule_id });

      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<Record<string, unknown>>("/canvas/trigger/schedule/update", {
        body: {
          canvas_id: args.canvas_id,
          schedule_id: args.schedule_id,
          schedule: args.schedule,
        },
        context: { operation: "canvas_schedule_update" },
      });

      logger.info("canvas_schedule_update completed");
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error, "canvas_schedule_update");
    }
  }
);

// ========================================
// canvas_schedule_delete - Delete scheduled Canvas
// ========================================

server.tool(
  "canvas_schedule_delete",
  "Delete a scheduled API-triggered Canvas.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    canvas_id: z.string().describe("Canvas ID"),
    schedule_id: z.string().describe("Schedule ID to delete"),
  },
  async (args) => {
    try {
      logger.info("canvas_schedule_delete called", { scheduleId: args.schedule_id });

      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<Record<string, unknown>>("/canvas/trigger/schedule/delete", {
        body: {
          canvas_id: args.canvas_id,
          schedule_id: args.schedule_id,
        },
        context: { operation: "canvas_schedule_delete" },
      });

      logger.info("canvas_schedule_delete completed");
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error, "canvas_schedule_delete");
    }
  }
);
