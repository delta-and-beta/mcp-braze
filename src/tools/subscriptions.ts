/**
 * Subscription Group Tools for Braze MCP Server
 * 4 tools for managing subscription group status
 */

import { z } from "zod";
import { server, type SessionData } from "../server.js";
import { extractApiKey, extractRestEndpoint } from "../lib/auth.js";
import { BrazeClient } from "../lib/client.js";
import { formatErrorResponse } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const authSchema = z.object({
  apiKey: z.string().optional().describe("Braze REST API key"),
  restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
});

// ========================================
// subscription_status_get - Get subscription group status
// ========================================

server.addTool({
  name: "subscription_status_get",
  description: "Get the subscription group status for users.",
  parameters: authSchema.extend({
    subscription_group_id: z.string().describe("Subscription group ID"),
    external_id: z.array(z.string()).optional().describe("External IDs to query"),
    phone: z.array(z.string()).optional().describe("Phone numbers to query (for SMS)"),
    email: z.array(z.string()).optional().describe("Emails to query"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("subscription_status_get called", { groupId: args.subscription_group_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
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

      const result = await client.request("/subscription/status/get", {
        method: "GET",
        queryParams,
        context: { operation: "subscription_status_get" },
      });

      logger.info("subscription_status_get completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "subscription_status_get" }), null, 2);
    }
  },
});

// ========================================
// subscription_user_status - List user's subscription groups
// ========================================

server.addTool({
  name: "subscription_user_status",
  description: "List all subscription groups for a specific user.",
  parameters: authSchema.extend({
    external_id: z.string().optional().describe("User's external ID"),
    email: z.string().optional().describe("User's email"),
    phone: z.string().optional().describe("User's phone number"),
    limit: z.number().optional().describe("Max results"),
    offset: z.number().optional(),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("subscription_user_status called");
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const queryParams: Record<string, string | number | boolean> = {};
      if (args.external_id) queryParams.external_id = args.external_id;
      if (args.email) queryParams.email = args.email;
      if (args.phone) queryParams.phone = args.phone;
      if (args.limit) queryParams.limit = args.limit;
      if (args.offset) queryParams.offset = args.offset;

      const result = await client.request("/subscription/user/status", {
        method: "GET",
        queryParams,
        context: { operation: "subscription_user_status" },
      });

      logger.info("subscription_user_status completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "subscription_user_status" }), null, 2);
    }
  },
});

// ========================================
// subscription_status_set - Update subscription status
// ========================================

server.addTool({
  name: "subscription_status_set",
  description: "Update subscription group status for users (email or SMS/WhatsApp).",
  parameters: authSchema.extend({
    subscription_group_id: z.string().describe("Subscription group ID"),
    subscription_state: z.enum(["subscribed", "unsubscribed"]).describe("New status"),
    external_id: z.array(z.string()).optional().describe("External IDs to update"),
    email: z.array(z.string()).optional().describe("Emails to update"),
    phone: z.array(z.string()).optional().describe("Phone numbers to update"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("subscription_status_set called", { groupId: args.subscription_group_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/subscription/status/set", {
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
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "subscription_status_set" }), null, 2);
    }
  },
});

// ========================================
// subscription_status_set_v2 - Update subscription status (V2)
// ========================================

server.addTool({
  name: "subscription_status_set_v2",
  description: "Update subscription group status for users (V2 API with more options).",
  parameters: authSchema.extend({
    subscription_groups: z.array(
      z.object({
        subscription_group_id: z.string().describe("Subscription group ID"),
        subscription_state: z.enum(["subscribed", "unsubscribed"]).describe("New status"),
      })
    ).describe("Subscription groups to update"),
    external_id: z.string().optional().describe("External ID"),
    email: z.string().optional().describe("Email address"),
    phone: z.string().optional().describe("Phone number"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("subscription_status_set_v2 called");
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/v2/subscription/status/set", {
        body: {
          subscription_groups: args.subscription_groups,
          external_id: args.external_id,
          email: args.email,
          phone: args.phone,
        },
        context: { operation: "subscription_status_set_v2" },
      });

      logger.info("subscription_status_set_v2 completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "subscription_status_set_v2" }), null, 2);
    }
  },
});
