/**
 * Subscription Group Tools for Braze MCP Server
 * 4 tools: subscription_status_get, subscription_user_status,
 *          subscription_status_set, subscription_status_set_v2
 */

import { z } from "zod";
import { server } from "../server.js";
import { extractApiKey, extractRestEndpoint } from "../lib/auth.js";
import { BrazeClient, type BrazeResponse } from "../lib/client.js";
import { formatErrorResponse, formatSuccessResponse } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

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

// ========================================
// subscription_status_get - Get subscription group status
// ========================================

server.tool(
  "subscription_status_get",
  "Get the subscription group status for users.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    subscription_group_id: z.string().describe("Subscription group ID"),
    external_id: z.array(z.string()).optional().describe("External IDs to query"),
    phone: z.array(z.string()).optional().describe("Phone numbers to query (for SMS)"),
    email: z.array(z.string()).optional().describe("Emails to query"),
  },
  async (args) => {
    try {
      logger.info("subscription_status_get called", { groupId: args.subscription_group_id });
      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const queryParams: Record<string, string | number | boolean> = {
        subscription_group_id: args.subscription_group_id,
      };

      // Handle array parameters
      if (args.external_id?.length) {
        queryParams["external_id[]"] = args.external_id.join(",");
      }
      if (args.phone?.length) {
        queryParams["phone[]"] = args.phone.join(",");
      }
      if (args.email?.length) {
        queryParams["email[]"] = args.email.join(",");
      }

      const result = await client.request<BrazeResponse>("/subscription/status/get", {
        method: "GET",
        queryParams,
        context: { operation: "subscription_status_get" },
      });

      logger.info("subscription_status_get completed");
      return formatToolResponse(result);
    } catch (error) {
      return formatToolError(error, "subscription_status_get");
    }
  }
);

// ========================================
// subscription_user_status - List user's subscription groups
// ========================================

server.tool(
  "subscription_user_status",
  "List all subscription groups for a specific user.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    external_id: z.string().optional().describe("User's external ID"),
    email: z.string().optional().describe("User's email"),
    phone: z.string().optional().describe("User's phone number"),
    limit: z.number().optional().describe("Max results"),
    offset: z.number().optional(),
  },
  async (args) => {
    try {
      logger.info("subscription_user_status called");
      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const queryParams: Record<string, string | number | boolean> = {};
      if (args.external_id) queryParams.external_id = args.external_id;
      if (args.email) queryParams.email = args.email;
      if (args.phone) queryParams.phone = args.phone;
      if (args.limit) queryParams.limit = args.limit;
      if (args.offset) queryParams.offset = args.offset;

      const result = await client.request<BrazeResponse>("/subscription/user/status", {
        method: "GET",
        queryParams,
        context: { operation: "subscription_user_status" },
      });

      logger.info("subscription_user_status completed");
      return formatToolResponse(result);
    } catch (error) {
      return formatToolError(error, "subscription_user_status");
    }
  }
);

// ========================================
// subscription_status_set - Update subscription status
// ========================================

server.tool(
  "subscription_status_set",
  "Update subscription group status for users (email or SMS/WhatsApp).",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    subscription_group_id: z.string().describe("Subscription group ID"),
    subscription_state: z.enum(["subscribed", "unsubscribed"]).describe("New status"),
    external_id: z.array(z.string()).optional().describe("External IDs to update"),
    email: z.array(z.string()).optional().describe("Emails to update"),
    phone: z.array(z.string()).optional().describe("Phone numbers to update"),
  },
  async (args) => {
    try {
      logger.info("subscription_status_set called", { groupId: args.subscription_group_id });
      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<BrazeResponse>("/subscription/status/set", {
        body: {
          subscription_group_id: args.subscription_group_id,
          subscription_state: args.subscription_state,
          external_id: args.external_id,
          email: args.email,
          phone: args.phone,
        },
        context: { operation: "subscription_status_set" },
      });

      logger.info("subscription_status_set completed");
      return formatToolResponse(result);
    } catch (error) {
      return formatToolError(error, "subscription_status_set");
    }
  }
);

// ========================================
// subscription_status_set_v2 - Update subscription status (V2)
// ========================================

server.tool(
  "subscription_status_set_v2",
  "Update subscription group status for users (V2 API with more options).",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    subscription_groups: z.array(
      z.object({
        subscription_group_id: z.string().describe("Subscription group ID"),
        subscription_state: z.enum(["subscribed", "unsubscribed"]).describe("New status"),
      })
    ).describe("Subscription groups to update"),
    external_id: z.string().optional().describe("External ID"),
    email: z.string().optional().describe("Email address"),
    phone: z.string().optional().describe("Phone number"),
  },
  async (args) => {
    try {
      logger.info("subscription_status_set_v2 called");
      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<BrazeResponse>("/v2/subscription/status/set", {
        body: {
          subscription_groups: args.subscription_groups,
          external_id: args.external_id,
          email: args.email,
          phone: args.phone,
        },
        context: { operation: "subscription_status_set_v2" },
      });

      logger.info("subscription_status_set_v2 completed");
      return formatToolResponse(result);
    } catch (error) {
      return formatToolError(error, "subscription_status_set_v2");
    }
  }
);
