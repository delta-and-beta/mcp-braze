/**
 * SMS Management Tools for Braze MCP Server
 * 2 tools for managing invalid phone numbers
 */

import { z } from "zod";
import { server } from "../server.js";
import { extractApiKey, extractRestEndpoint } from "../lib/auth.js";
import { BrazeClient } from "../lib/client.js";
import { formatErrorResponse, formatSuccessResponse } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const authSchema = z.object({
  apiKey: z.string().optional().describe("Braze REST API key"),
  restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
});

// ========================================
// sms_invalid_phones - Query invalid phone numbers
// ========================================

server.tool(
  "sms_invalid_phones",
  "Query phone numbers that have been marked as invalid within a date range.",
  authSchema.extend({
    start_date: z.string().optional().describe("Start date (YYYY-MM-DD)"),
    end_date: z.string().optional().describe("End date (YYYY-MM-DD)"),
    limit: z.number().optional().describe("Max results (default 100, max 500)"),
    offset: z.number().optional().describe("Offset for pagination"),
    phone: z.string().optional().describe("Filter by specific phone number"),
  }).shape,
  async (args) => {
    try {
      logger.info("sms_invalid_phones called");
      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/sms/invalid_phone_numbers", {
        method: "GET",
        queryParams: {
          start_date: args.start_date,
          end_date: args.end_date,
          limit: args.limit,
          offset: args.offset,
          phone: args.phone,
        },
        context: { operation: "sms_invalid_phones" },
      });

      logger.info("sms_invalid_phones completed");
      return {
        content: [{ type: "text", text: JSON.stringify(formatSuccessResponse(result), null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: JSON.stringify(formatErrorResponse(error, { tool: "sms_invalid_phones" }), null, 2) }],
      };
    }
  }
);

// ========================================
// sms_invalid_phones_remove - Remove from invalid phone list
// ========================================

server.tool(
  "sms_invalid_phones_remove",
  "Remove phone numbers from the invalid phone list.",
  authSchema.extend({
    phone: z.string().optional().describe("Single phone number to remove"),
    phones: z.array(z.string()).optional().describe("Multiple phone numbers to remove (max 50)"),
  }).shape,
  async (args) => {
    try {
      logger.info("sms_invalid_phones_remove called");
      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const body: Record<string, string | string[]> = {};
      if (args.phone) body.phone = args.phone;
      if (args.phones) body.phones = args.phones;

      const result = await client.request("/sms/invalid_phone_numbers/remove", {
        body,
        context: { operation: "sms_invalid_phones_remove" },
      });

      logger.info("sms_invalid_phones_remove completed");
      return {
        content: [{ type: "text", text: JSON.stringify(formatSuccessResponse(result), null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: JSON.stringify(formatErrorResponse(error, { tool: "sms_invalid_phones_remove" }), null, 2) }],
      };
    }
  }
);
