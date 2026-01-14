/**
 * Preference Center Tools for Braze MCP Server
 * 5 tools for managing email preference centers
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
// preference_centers_list - List preference centers
// ========================================

server.addTool({
  name: "preference_centers_list",
  description: "List all preference centers in the workspace.",
  parameters: authSchema.extend({
    limit: z.number().optional().describe("Max results"),
    offset: z.number().optional(),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("preference_centers_list called");
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/preference_center/v1/list", {
        method: "GET",
        queryParams: {
          limit: args.limit,
          offset: args.offset,
        },
        context: { operation: "preference_centers_list" },
      });

      logger.info("preference_centers_list completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "preference_centers_list" }), null, 2);
    }
  },
});

// ========================================
// preference_center_get - Get preference center details
// ========================================

server.addTool({
  name: "preference_center_get",
  description: "Get details for a specific preference center.",
  parameters: authSchema.extend({
    preference_center_external_id: z.string().describe("Preference center external ID"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("preference_center_get called", { id: args.preference_center_external_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request(
        `/preference_center/v1/${encodeURIComponent(args.preference_center_external_id)}`,
        {
          method: "GET",
          context: { operation: "preference_center_get" },
        }
      );

      logger.info("preference_center_get completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "preference_center_get" }), null, 2);
    }
  },
});

// ========================================
// preference_center_url - Generate preference center URL for user
// ========================================

server.addTool({
  name: "preference_center_url",
  description: "Generate a preference center URL for a specific user.",
  parameters: authSchema.extend({
    preference_center_external_id: z.string().describe("Preference center external ID"),
    user_id: z.string().describe("User external ID"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("preference_center_url called", {
        centerId: args.preference_center_external_id,
        userId: args.user_id,
      });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request(
        `/preference_center/v1/${encodeURIComponent(args.preference_center_external_id)}/url/${encodeURIComponent(args.user_id)}`,
        {
          method: "GET",
          context: { operation: "preference_center_url" },
        }
      );

      logger.info("preference_center_url completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "preference_center_url" }), null, 2);
    }
  },
});

// ========================================
// preference_center_create - Create preference center
// ========================================

server.addTool({
  name: "preference_center_create",
  description: "Create a new preference center.",
  parameters: authSchema.extend({
    name: z.string().describe("Preference center name"),
    preference_center_title: z.string().optional().describe("Title shown to users"),
    preference_center_page_html: z.string().optional().describe("Custom HTML content"),
    confirmation_page_html: z.string().optional().describe("Confirmation page HTML"),
    redirect_page_html: z.string().optional().describe("Redirect page HTML"),
    preference_center_options: z.object({
      meta_viewport_content: z.string().optional(),
    }).optional(),
    state: z.enum(["active", "draft"]).optional(),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("preference_center_create called", { name: args.name });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/preference_center/v1", {
        body: {
          name: args.name,
          preference_center_title: args.preference_center_title,
          preference_center_page_html: args.preference_center_page_html,
          confirmation_page_html: args.confirmation_page_html,
          redirect_page_html: args.redirect_page_html,
          preference_center_options: args.preference_center_options,
          state: args.state,
        },
        context: { operation: "preference_center_create" },
      });

      logger.info("preference_center_create completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "preference_center_create" }), null, 2);
    }
  },
});

// ========================================
// preference_center_update - Update preference center
// ========================================

server.addTool({
  name: "preference_center_update",
  description: "Update an existing preference center.",
  parameters: authSchema.extend({
    preference_center_external_id: z.string().describe("Preference center external ID"),
    name: z.string().optional().describe("New name"),
    preference_center_title: z.string().optional().describe("New title"),
    preference_center_page_html: z.string().optional().describe("New page HTML"),
    confirmation_page_html: z.string().optional().describe("New confirmation HTML"),
    redirect_page_html: z.string().optional().describe("New redirect HTML"),
    preference_center_options: z.object({
      meta_viewport_content: z.string().optional(),
    }).optional(),
    state: z.enum(["active", "draft"]).optional(),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("preference_center_update called", { id: args.preference_center_external_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request(
        `/preference_center/v1/${encodeURIComponent(args.preference_center_external_id)}`,
        {
          method: "PUT",
          body: {
            name: args.name,
            preference_center_title: args.preference_center_title,
            preference_center_page_html: args.preference_center_page_html,
            confirmation_page_html: args.confirmation_page_html,
            redirect_page_html: args.redirect_page_html,
            preference_center_options: args.preference_center_options,
            state: args.state,
          },
          context: { operation: "preference_center_update" },
        }
      );

      logger.info("preference_center_update completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "preference_center_update" }), null, 2);
    }
  },
});
