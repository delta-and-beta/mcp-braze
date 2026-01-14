/**
 * Scheduling Tools for Braze MCP Server
 * 10 tools for scheduling and managing scheduled messages, campaigns, and canvases
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

server.addTool({
  name: "scheduled_broadcasts_list",
  description: "List upcoming scheduled campaigns and Canvases.",
  parameters: authSchema.extend({
    end_time: z.string().describe("ISO 8601 end time for query range"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("scheduled_broadcasts_list called");

      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/messages/scheduled_broadcasts", {
        method: "GET",
        queryParams: { end_time: args.end_time },
        context: { operation: "scheduled_broadcasts_list" },
      });

      logger.info("scheduled_broadcasts_list completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "scheduled_broadcasts_list" }), null, 2);
    }
  },
});

// ========================================
// messages_schedule_create - Schedule message
// ========================================

server.addTool({
  name: "messages_schedule_create",
  description: "Schedule a message to be sent at a specific time.",
  parameters: authSchema.extend({
    broadcast: z.boolean().optional(),
    external_user_ids: z.array(z.string()).optional(),
    user_aliases: z.array(userAliasSchema).optional(),
    segment_id: z.string().optional(),
    audience: audienceSchema,
    campaign_id: z.string().optional(),
    send_id: z.string().optional(),
    schedule: scheduleSchema,
    messages: messagesSchema,
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("messages_schedule_create called", { scheduleTime: args.schedule.time });

      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/messages/schedule/create", {
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
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "messages_schedule_create" }), null, 2);
    }
  },
});

// ========================================
// messages_schedule_update - Update scheduled message
// ========================================

server.addTool({
  name: "messages_schedule_update",
  description: "Update a previously scheduled message.",
  parameters: authSchema.extend({
    schedule_id: z.string().describe("Schedule ID to update"),
    schedule: scheduleSchema,
    messages: messagesSchema.optional(),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("messages_schedule_update called", { scheduleId: args.schedule_id });

      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/messages/schedule/update", {
        body: {
          schedule_id: args.schedule_id,
          schedule: args.schedule,
          messages: args.messages,
        },
        context: { operation: "messages_schedule_update" },
      });

      logger.info("messages_schedule_update completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "messages_schedule_update" }), null, 2);
    }
  },
});

// ========================================
// messages_schedule_delete - Delete scheduled message
// ========================================

server.addTool({
  name: "messages_schedule_delete",
  description: "Delete a previously scheduled message.",
  parameters: authSchema.extend({
    schedule_id: z.string().describe("Schedule ID to delete"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("messages_schedule_delete called", { scheduleId: args.schedule_id });

      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/messages/schedule/delete", {
        body: { schedule_id: args.schedule_id },
        context: { operation: "messages_schedule_delete" },
      });

      logger.info("messages_schedule_delete completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "messages_schedule_delete" }), null, 2);
    }
  },
});

// ========================================
// campaigns_schedule_create - Schedule API campaign
// ========================================

server.addTool({
  name: "campaigns_schedule_create",
  description: "Schedule an API-triggered campaign for future delivery.",
  parameters: authSchema.extend({
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
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("campaigns_schedule_create called", { campaignId: args.campaign_id });

      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/campaigns/trigger/schedule/create", {
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
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "campaigns_schedule_create" }), null, 2);
    }
  },
});

// ========================================
// campaigns_schedule_update - Update scheduled campaign
// ========================================

server.addTool({
  name: "campaigns_schedule_update",
  description: "Update a scheduled API-triggered campaign.",
  parameters: authSchema.extend({
    campaign_id: z.string().describe("Campaign ID"),
    schedule_id: z.string().describe("Schedule ID to update"),
    schedule: scheduleSchema,
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("campaigns_schedule_update called", { scheduleId: args.schedule_id });

      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/campaigns/trigger/schedule/update", {
        body: {
          campaign_id: args.campaign_id,
          schedule_id: args.schedule_id,
          schedule: args.schedule,
        },
        context: { operation: "campaigns_schedule_update" },
      });

      logger.info("campaigns_schedule_update completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "campaigns_schedule_update" }), null, 2);
    }
  },
});

// ========================================
// campaigns_schedule_delete - Delete scheduled campaign
// ========================================

server.addTool({
  name: "campaigns_schedule_delete",
  description: "Delete a scheduled API-triggered campaign.",
  parameters: authSchema.extend({
    campaign_id: z.string().describe("Campaign ID"),
    schedule_id: z.string().describe("Schedule ID to delete"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("campaigns_schedule_delete called", { scheduleId: args.schedule_id });

      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/campaigns/trigger/schedule/delete", {
        body: {
          campaign_id: args.campaign_id,
          schedule_id: args.schedule_id,
        },
        context: { operation: "campaigns_schedule_delete" },
      });

      logger.info("campaigns_schedule_delete completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "campaigns_schedule_delete" }), null, 2);
    }
  },
});

// ========================================
// canvas_schedule_create - Schedule API Canvas
// ========================================

server.addTool({
  name: "canvas_schedule_create",
  description: "Schedule an API-triggered Canvas for future delivery.",
  parameters: authSchema.extend({
    canvas_id: z.string().describe("API-triggered Canvas ID"),
    recipients: z.array(z.object({
      external_user_id: z.string().optional(),
      user_alias: userAliasSchema.optional(),
      canvas_entry_properties: z.record(z.unknown()).optional(),
    })).optional(),
    audience: audienceSchema,
    broadcast: z.boolean().optional(),
    schedule: scheduleSchema,
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("canvas_schedule_create called", { canvasId: args.canvas_id });

      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/canvas/trigger/schedule/create", {
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
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "canvas_schedule_create" }), null, 2);
    }
  },
});

// ========================================
// canvas_schedule_update - Update scheduled Canvas
// ========================================

server.addTool({
  name: "canvas_schedule_update",
  description: "Update a scheduled API-triggered Canvas.",
  parameters: authSchema.extend({
    canvas_id: z.string().describe("Canvas ID"),
    schedule_id: z.string().describe("Schedule ID to update"),
    schedule: scheduleSchema,
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("canvas_schedule_update called", { scheduleId: args.schedule_id });

      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/canvas/trigger/schedule/update", {
        body: {
          canvas_id: args.canvas_id,
          schedule_id: args.schedule_id,
          schedule: args.schedule,
        },
        context: { operation: "canvas_schedule_update" },
      });

      logger.info("canvas_schedule_update completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "canvas_schedule_update" }), null, 2);
    }
  },
});

// ========================================
// canvas_schedule_delete - Delete scheduled Canvas
// ========================================

server.addTool({
  name: "canvas_schedule_delete",
  description: "Delete a scheduled API-triggered Canvas.",
  parameters: authSchema.extend({
    canvas_id: z.string().describe("Canvas ID"),
    schedule_id: z.string().describe("Schedule ID to delete"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("canvas_schedule_delete called", { scheduleId: args.schedule_id });

      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/canvas/trigger/schedule/delete", {
        body: {
          canvas_id: args.canvas_id,
          schedule_id: args.schedule_id,
        },
        context: { operation: "canvas_schedule_delete" },
      });

      logger.info("canvas_schedule_delete completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "canvas_schedule_delete" }), null, 2);
    }
  },
});
