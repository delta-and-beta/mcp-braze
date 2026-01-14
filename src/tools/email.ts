/**
 * Email Management Tools for Braze MCP Server
 * 7 tools for managing email bounces, unsubscribes, and blocklists
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
// email_hard_bounces - Query hard bounced emails
// ========================================

server.addTool({
  name: "email_hard_bounces",
  description: "Query emails that have hard bounced within a date range.",
  parameters: authSchema.extend({
    start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
    limit: z.number().optional().describe("Max results (default 100, max 500)"),
    offset: z.number().optional().describe("Offset for pagination"),
    email: z.string().optional().describe("Filter by specific email"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("email_hard_bounces called");
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/email/hard_bounces", {
        method: "GET",
        queryParams: {
          start_date: args.start_date,
          end_date: args.end_date,
          limit: args.limit,
          offset: args.offset,
          email: args.email,
        },
        context: { operation: "email_hard_bounces" },
      });

      logger.info("email_hard_bounces completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "email_hard_bounces" }), null, 2);
    }
  },
});

// ========================================
// email_unsubscribes - Query unsubscribed emails
// ========================================

server.addTool({
  name: "email_unsubscribes",
  description: "Query emails that have unsubscribed within a date range.",
  parameters: authSchema.extend({
    start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
    limit: z.number().optional().describe("Max results (default 100, max 500)"),
    offset: z.number().optional().describe("Offset for pagination"),
    sort_direction: z.enum(["asc", "desc"]).optional(),
    email: z.string().optional().describe("Filter by specific email"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("email_unsubscribes called");
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/email/unsubscribes", {
        method: "GET",
        queryParams: {
          start_date: args.start_date,
          end_date: args.end_date,
          limit: args.limit,
          offset: args.offset,
          sort_direction: args.sort_direction,
          email: args.email,
        },
        context: { operation: "email_unsubscribes" },
      });

      logger.info("email_unsubscribes completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "email_unsubscribes" }), null, 2);
    }
  },
});

// ========================================
// email_subscription_status - Change subscription status
// ========================================

server.addTool({
  name: "email_subscription_status",
  description: "Change email subscription status for users.",
  parameters: authSchema.extend({
    email: z.string().describe("Email address to update"),
    subscription_state: z.enum(["subscribed", "unsubscribed", "opted_in"]).describe("New subscription state"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("email_subscription_status called", { email: args.email });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/email/status", {
        body: {
          email: args.email,
          subscription_state: args.subscription_state,
        },
        context: { operation: "email_subscription_status" },
      });

      logger.info("email_subscription_status completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "email_subscription_status" }), null, 2);
    }
  },
});

// ========================================
// email_bounce_remove - Remove from hard bounce list
// ========================================

server.addTool({
  name: "email_bounce_remove",
  description: "Remove email addresses from the hard bounce list.",
  parameters: authSchema.extend({
    email: z.string().optional().describe("Single email to remove"),
    emails: z.array(z.string()).optional().describe("Multiple emails to remove (max 50)"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("email_bounce_remove called");
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const body: Record<string, unknown> = {};
      if (args.email) body.email = args.email;
      if (args.emails) body.emails = args.emails;

      const result = await client.request("/email/bounce/remove", {
        body,
        context: { operation: "email_bounce_remove" },
      });

      logger.info("email_bounce_remove completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "email_bounce_remove" }), null, 2);
    }
  },
});

// ========================================
// email_spam_remove - Remove from spam list
// ========================================

server.addTool({
  name: "email_spam_remove",
  description: "Remove email addresses from the spam list.",
  parameters: authSchema.extend({
    email: z.string().optional().describe("Single email to remove"),
    emails: z.array(z.string()).optional().describe("Multiple emails to remove (max 50)"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("email_spam_remove called");
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const body: Record<string, unknown> = {};
      if (args.email) body.email = args.email;
      if (args.emails) body.emails = args.emails;

      const result = await client.request("/email/spam/remove", {
        body,
        context: { operation: "email_spam_remove" },
      });

      logger.info("email_spam_remove completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "email_spam_remove" }), null, 2);
    }
  },
});

// ========================================
// email_blocklist - Add to blocklist
// ========================================

server.addTool({
  name: "email_blocklist",
  description: "Add email addresses to the blocklist. Blocked emails will not receive any messages.",
  parameters: authSchema.extend({
    email: z.array(z.string()).describe("Email addresses to blocklist (max 50)"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("email_blocklist called", { count: args.email.length });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/email/blocklist", {
        body: { email: args.email },
        context: { operation: "email_blocklist" },
      });

      logger.info("email_blocklist completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "email_blocklist" }), null, 2);
    }
  },
});

// ========================================
// email_blacklist - Add to blacklist (deprecated, use blocklist)
// ========================================

server.addTool({
  name: "email_blacklist",
  description: "[DEPRECATED: Use email_blocklist] Add email addresses to the blacklist.",
  parameters: authSchema.extend({
    email: z.array(z.string()).describe("Email addresses to blacklist"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("email_blacklist called (deprecated)", { count: args.email.length });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/email/blacklist", {
        body: { email: args.email },
        context: { operation: "email_blacklist" },
      });

      logger.info("email_blacklist completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "email_blacklist" }), null, 2);
    }
  },
});
