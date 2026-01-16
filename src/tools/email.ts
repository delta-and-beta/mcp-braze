/**
 * Email Management Tools for Braze MCP Server
 * 7 tools for managing email bounces, unsubscribes, and blocklists
 */

import { z } from "zod";
import { server } from "../server.js";
import { extractApiKey, extractRestEndpoint } from "../lib/auth.js";
import { BrazeClient, type BrazeResponse } from "../lib/client.js";
import { formatErrorResponse, formatSuccessResponse } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const authSchema = z.object({
  apiKey: z.string().optional().describe("Braze REST API key"),
  restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
});

interface ToolContentResponse {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
}

function createClient(args: { apiKey?: string; restEndpoint?: string }): BrazeClient {
  const apiKey = extractApiKey(args);
  const restEndpoint = extractRestEndpoint(args);
  return new BrazeClient({ apiKey, restEndpoint });
}

function formatResponse(result: BrazeResponse): ToolContentResponse {
  return {
    content: [{ type: "text", text: JSON.stringify(formatSuccessResponse(result), null, 2) }],
  };
}

function formatError(error: unknown, tool: string): ToolContentResponse {
  return {
    content: [{ type: "text", text: JSON.stringify(formatErrorResponse(error, { tool }), null, 2) }],
  };
}

// ========================================
// email_hard_bounces - Query hard bounced emails
// ========================================

server.tool(
  "email_hard_bounces",
  "Query emails that have hard bounced within a date range.",
  authSchema.extend({
    start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
    limit: z.number().optional().describe("Max results (default 100, max 500)"),
    offset: z.number().optional().describe("Offset for pagination"),
    email: z.string().optional().describe("Filter by specific email"),
  }).shape,
  async (args) => {
    try {
      logger.info("email_hard_bounces called");
      const client = createClient(args);

      const result = await client.request<BrazeResponse>("/email/hard_bounces", {
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
      return formatResponse(result);
    } catch (error) {
      return formatError(error, "email_hard_bounces");
    }
  }
);

// ========================================
// email_unsubscribes - Query unsubscribed emails
// ========================================

server.tool(
  "email_unsubscribes",
  "Query emails that have unsubscribed within a date range.",
  authSchema.extend({
    start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
    limit: z.number().optional().describe("Max results (default 100, max 500)"),
    offset: z.number().optional().describe("Offset for pagination"),
    sort_direction: z.enum(["asc", "desc"]).optional(),
    email: z.string().optional().describe("Filter by specific email"),
  }).shape,
  async (args) => {
    try {
      logger.info("email_unsubscribes called");
      const client = createClient(args);

      const result = await client.request<BrazeResponse>("/email/unsubscribes", {
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
      return formatResponse(result);
    } catch (error) {
      return formatError(error, "email_unsubscribes");
    }
  }
);

// ========================================
// email_subscription_status - Change subscription status
// ========================================

server.tool(
  "email_subscription_status",
  "Change email subscription status for users.",
  authSchema.extend({
    email: z.string().describe("Email address to update"),
    subscription_state: z.enum(["subscribed", "unsubscribed", "opted_in"]).describe("New subscription state"),
  }).shape,
  async (args) => {
    try {
      logger.info("email_subscription_status called", { email: args.email });
      const client = createClient(args);

      const result = await client.request<BrazeResponse>("/email/status", {
        body: {
          email: args.email,
          subscription_state: args.subscription_state,
        },
        context: { operation: "email_subscription_status" },
      });

      logger.info("email_subscription_status completed");
      return formatResponse(result);
    } catch (error) {
      return formatError(error, "email_subscription_status");
    }
  }
);

// ========================================
// email_bounce_remove - Remove from hard bounce list
// ========================================

server.tool(
  "email_bounce_remove",
  "Remove email addresses from the hard bounce list.",
  authSchema.extend({
    email: z.string().optional().describe("Single email to remove"),
    emails: z.array(z.string()).optional().describe("Multiple emails to remove (max 50)"),
  }).shape,
  async (args) => {
    try {
      logger.info("email_bounce_remove called");
      const client = createClient(args);

      const body: Record<string, string | string[]> = {};
      if (args.email) body.email = args.email;
      if (args.emails) body.emails = args.emails;

      const result = await client.request<BrazeResponse>("/email/bounce/remove", {
        body,
        context: { operation: "email_bounce_remove" },
      });

      logger.info("email_bounce_remove completed");
      return formatResponse(result);
    } catch (error) {
      return formatError(error, "email_bounce_remove");
    }
  }
);

// ========================================
// email_spam_remove - Remove from spam list
// ========================================

server.tool(
  "email_spam_remove",
  "Remove email addresses from the spam list.",
  authSchema.extend({
    email: z.string().optional().describe("Single email to remove"),
    emails: z.array(z.string()).optional().describe("Multiple emails to remove (max 50)"),
  }).shape,
  async (args) => {
    try {
      logger.info("email_spam_remove called");
      const client = createClient(args);

      const body: Record<string, string | string[]> = {};
      if (args.email) body.email = args.email;
      if (args.emails) body.emails = args.emails;

      const result = await client.request<BrazeResponse>("/email/spam/remove", {
        body,
        context: { operation: "email_spam_remove" },
      });

      logger.info("email_spam_remove completed");
      return formatResponse(result);
    } catch (error) {
      return formatError(error, "email_spam_remove");
    }
  }
);

// ========================================
// email_blocklist - Add to blocklist
// ========================================

server.tool(
  "email_blocklist",
  "Add email addresses to the blocklist. Blocked emails will not receive any messages.",
  authSchema.extend({
    email: z.array(z.string()).describe("Email addresses to blocklist (max 50)"),
  }).shape,
  async (args) => {
    try {
      logger.info("email_blocklist called", { count: args.email.length });
      const client = createClient(args);

      const result = await client.request<BrazeResponse>("/email/blocklist", {
        body: { email: args.email },
        context: { operation: "email_blocklist" },
      });

      logger.info("email_blocklist completed");
      return formatResponse(result);
    } catch (error) {
      return formatError(error, "email_blocklist");
    }
  }
);

// ========================================
// email_blacklist - Add to blacklist (deprecated, use blocklist)
// ========================================

server.tool(
  "email_blacklist",
  "[DEPRECATED: Use email_blocklist] Add email addresses to the blacklist.",
  authSchema.extend({
    email: z.array(z.string()).describe("Email addresses to blacklist"),
  }).shape,
  async (args) => {
    try {
      logger.info("email_blacklist called (deprecated)", { count: args.email.length });
      const client = createClient(args);

      const result = await client.request<BrazeResponse>("/email/blacklist", {
        body: { email: args.email },
        context: { operation: "email_blacklist" },
      });

      logger.info("email_blacklist completed");
      return formatResponse(result);
    } catch (error) {
      return formatError(error, "email_blacklist");
    }
  }
);
