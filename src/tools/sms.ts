/**
 * SMS Management Tools for Braze MCP Server
 * 2 tools for managing invalid phone numbers
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
// sms_invalid_phones - Query invalid phone numbers
// ========================================

server.addTool({
  name: "sms_invalid_phones",
  description: "Query phone numbers that have been marked as invalid within a date range.",
  parameters: authSchema.extend({
    start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
    limit: z.number().optional().describe("Max results (default 100, max 500)"),
    offset: z.number().optional().describe("Offset for pagination"),
    phone: z.string().optional().describe("Filter by specific phone number"),
    reason: z.array(z.string()).optional().describe("Filter by reason codes"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("sms_invalid_phones called");
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const queryParams: Record<string, string | number | boolean> = {};
      if (args.start_date) queryParams.start_date = args.start_date;
      if (args.end_date) queryParams.end_date = args.end_date;
      if (args.limit) queryParams.limit = args.limit;
      if (args.offset) queryParams.offset = args.offset;
      if (args.phone) queryParams.phone = args.phone;

      const result = await client.request("/sms/invalid_phone_numbers", {
        method: "GET",
        queryParams,
        context: { operation: "sms_invalid_phones" },
      });

      logger.info("sms_invalid_phones completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "sms_invalid_phones" }), null, 2);
    }
  },
});

// ========================================
// sms_invalid_phones_remove - Remove from invalid phone list
// ========================================

server.addTool({
  name: "sms_invalid_phones_remove",
  description: "Remove phone numbers from the invalid phone list.",
  parameters: authSchema.extend({
    phone: z.string().optional().describe("Single phone number to remove"),
    phones: z.array(z.string()).optional().describe("Multiple phone numbers to remove (max 50)"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("sms_invalid_phones_remove called");
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const body: Record<string, unknown> = {};
      if (args.phone) body.phone = args.phone;
      if (args.phones) body.phones = args.phones;

      const result = await client.request("/sms/invalid_phone_numbers/remove", {
        body,
        context: { operation: "sms_invalid_phones_remove" },
      });

      logger.info("sms_invalid_phones_remove completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "sms_invalid_phones_remove" }), null, 2);
    }
  },
});
