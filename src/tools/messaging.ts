/**
 * Messaging Tools for Braze MCP Server
 * 6 tools: messages_send, campaigns_trigger_send, canvas_trigger_send,
 *          transactional_email_send, send_id_create, live_activity_update
 */

import { z } from "zod";
import { server } from "../server.js";
import { extractApiKey, extractRestEndpoint } from "../lib/auth.js";
import { BrazeClient, type BrazeResponse } from "../lib/client.js";
import { formatErrorResponse, formatSuccessResponse } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const userAliasSchema = z.object({
  alias_name: z.string().min(1),
  alias_label: z.string().min(1),
});


const audienceSchema = z
  .object({
    AND: z.array(z.record(z.unknown())).optional(),
    OR: z.array(z.record(z.unknown())).optional(),
  })
  .optional();

/**
 * Helper to format API results into MCP tool response format
 */
function formatToolResponse(result: BrazeResponse): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [{ type: "text", text: JSON.stringify(formatSuccessResponse(result), null, 2) }],
  };
}

/**
 * Helper to format errors into MCP tool response format
 */
function formatToolError(error: unknown, toolName: string): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [{ type: "text", text: JSON.stringify(formatErrorResponse(error, { tool: toolName }), null, 2) }],
  };
}

const recipientSchema = z.object({
  external_user_id: z.string().optional(),
  user_alias: userAliasSchema.optional(),
  trigger_properties: z.record(z.unknown()).optional(),
  canvas_entry_properties: z.record(z.unknown()).optional(),
  send_to_existing_only: z.boolean().optional(),
  attributes: z.record(z.unknown()).optional(),
});

const messagesSchema = z.object({
  apple_push: z.record(z.unknown()).optional(),
  android_push: z.record(z.unknown()).optional(),
  email: z.record(z.unknown()).optional(),
  webhook: z.record(z.unknown()).optional(),
  content_card: z.record(z.unknown()).optional(),
}).passthrough().optional();

// ========================================
// messages_send - Send messages immediately
// ========================================

server.tool(
  "messages_send",
  "Send messages immediately to users via push, email, webhook, or content cards.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    broadcast: z.boolean().optional().describe("Send to entire segment"),
    external_user_ids: z.array(z.string()).optional().describe("User external IDs"),
    user_aliases: z.array(userAliasSchema).optional(),
    segment_id: z.string().optional().describe("Target segment ID"),
    audience: audienceSchema,
    campaign_id: z.string().optional().describe("Campaign ID for settings"),
    send_id: z.string().optional().describe("Custom send identifier"),
    override_frequency_capping: z.boolean().optional(),
    recipient_subscription_state: z.string().optional(),
    messages: messagesSchema.describe("Message content by channel"),
  },
  async (args) => {
    try {
      logger.info("messages_send called", {
        recipientCount: (args.external_user_ids?.length || 0) + (args.user_aliases?.length || 0),
        broadcast: args.broadcast,
      });

      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<BrazeResponse>("/messages/send", {
        body: {
          broadcast: args.broadcast,
          external_user_ids: args.external_user_ids,
          user_aliases: args.user_aliases,
          segment_id: args.segment_id,
          audience: args.audience,
          campaign_id: args.campaign_id,
          send_id: args.send_id,
          override_frequency_capping: args.override_frequency_capping,
          recipient_subscription_state: args.recipient_subscription_state,
          messages: args.messages,
        },
        context: { operation: "messages_send" },
      });

      logger.info("messages_send completed");
      return formatToolResponse(result);
    } catch (error) {
      return formatToolError(error, "messages_send");
    }
  }
);

// ========================================
// campaigns_trigger_send - Trigger API campaign
// ========================================

server.tool(
  "campaigns_trigger_send",
  "Trigger an API-triggered campaign. The campaign must be configured as API-triggered in Braze.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    campaign_id: z.string().describe("API-triggered campaign ID"),
    send_id: z.string().optional().describe("Custom send identifier"),
    trigger_properties: z.record(z.unknown()).optional().describe("Personalization properties"),
    broadcast: z.boolean().optional(),
    audience: audienceSchema,
    recipients: z.array(recipientSchema).optional().describe("Specific recipients"),
  },
  async (args) => {
    try {
      logger.info("campaigns_trigger_send called", { campaignId: args.campaign_id });

      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<BrazeResponse>("/campaigns/trigger/send", {
        body: {
          campaign_id: args.campaign_id,
          send_id: args.send_id,
          trigger_properties: args.trigger_properties,
          broadcast: args.broadcast,
          audience: args.audience,
          recipients: args.recipients,
        },
        context: { operation: "campaigns_trigger_send" },
      });

      logger.info("campaigns_trigger_send completed");
      return formatToolResponse(result);
    } catch (error) {
      return formatToolError(error, "campaigns_trigger_send");
    }
  }
);

// ========================================
// canvas_trigger_send - Trigger API Canvas
// ========================================

server.tool(
  "canvas_trigger_send",
  "Trigger an API-triggered Canvas. The Canvas must be configured as API-triggered in Braze.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    canvas_id: z.string().describe("API-triggered Canvas ID"),
    canvas_entry_properties: z.record(z.unknown()).optional().describe("Entry properties"),
    broadcast: z.boolean().optional(),
    audience: audienceSchema,
    recipients: z.array(recipientSchema).optional(),
  },
  async (args) => {
    try {
      logger.info("canvas_trigger_send called", { canvasId: args.canvas_id });

      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<BrazeResponse>("/canvas/trigger/send", {
        body: {
          canvas_id: args.canvas_id,
          canvas_entry_properties: args.canvas_entry_properties,
          broadcast: args.broadcast,
          audience: args.audience,
          recipients: args.recipients,
        },
        context: { operation: "canvas_trigger_send" },
      });

      logger.info("canvas_trigger_send completed");
      return formatToolResponse(result);
    } catch (error) {
      return formatToolError(error, "canvas_trigger_send");
    }
  }
);

// ========================================
// transactional_email_send - Send transactional email
// ========================================

server.tool(
  "transactional_email_send",
  "Send a transactional email via an API-triggered campaign. Used for order confirmations, password resets, etc.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    campaign_id: z.string().describe("Transactional campaign ID"),
    external_send_id: z.string().optional().describe("Custom identifier for this send"),
    trigger_properties: z.record(z.unknown()).optional().describe("Email personalization data"),
    recipient: z.object({
      external_user_id: z.string().optional(),
      user_alias: userAliasSchema.optional(),
      attributes: z.record(z.unknown()).optional(),
    }).describe("Single recipient for transactional email"),
  },
  async (args) => {
    try {
      logger.info("transactional_email_send called", { campaignId: args.campaign_id });

      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<BrazeResponse>(`/transactional/v1/campaigns/${args.campaign_id}/send`, {
        body: {
          external_send_id: args.external_send_id,
          trigger_properties: args.trigger_properties,
          recipient: args.recipient,
        },
        context: { operation: "transactional_email_send" },
      });

      logger.info("transactional_email_send completed");
      return formatToolResponse(result);
    } catch (error) {
      return formatToolError(error, "transactional_email_send");
    }
  }
);

// ========================================
// send_id_create - Create send ID
// ========================================

server.tool(
  "send_id_create",
  "Create a send ID for tracking message sends. Use to correlate sends with analytics.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    campaign_id: z.string().optional().describe("Campaign to create send ID for"),
    send_id: z.string().describe("Custom send identifier to create"),
  },
  async (args) => {
    try {
      logger.info("send_id_create called", { sendId: args.send_id });

      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<BrazeResponse>("/sends/id/create", {
        body: {
          campaign_id: args.campaign_id,
          send_id: args.send_id,
        },
        context: { operation: "send_id_create" },
      });

      logger.info("send_id_create completed");
      return formatToolResponse(result);
    } catch (error) {
      return formatToolError(error, "send_id_create");
    }
  }
);

// ========================================
// live_activity_update - Update iOS Live Activity
// ========================================

server.tool(
  "live_activity_update",
  "Update an iOS Live Activity. Used for real-time updates like sports scores, delivery tracking.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    app_id: z.string().describe("Braze app ID"),
    activity_id: z.string().describe("Live Activity ID to update"),
    content_state: z.record(z.unknown()).describe("Updated content state"),
    end_activity: z.boolean().optional().describe("End the Live Activity"),
    dismissal_date: z.string().optional().describe("ISO 8601 dismissal time"),
    stale_date: z.string().optional().describe("ISO 8601 stale time"),
    notification: z.object({
      alert: z.object({
        title: z.string().optional(),
        body: z.string().optional(),
        sound: z.string().optional(),
      }).optional(),
    }).optional(),
  },
  async (args) => {
    try {
      logger.info("live_activity_update called", { activityId: args.activity_id });

      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<BrazeResponse>("/messages/live_activity/update", {
        body: {
          app_id: args.app_id,
          activity_id: args.activity_id,
          content_state: args.content_state,
          end_activity: args.end_activity,
          dismissal_date: args.dismissal_date,
          stale_date: args.stale_date,
          notification: args.notification,
        },
        context: { operation: "live_activity_update" },
      });

      logger.info("live_activity_update completed");
      return formatToolResponse(result);
    } catch (error) {
      return formatToolError(error, "live_activity_update");
    }
  }
);
