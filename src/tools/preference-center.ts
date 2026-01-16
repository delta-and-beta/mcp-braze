/**
 * Preference Center Tools for Braze MCP Server
 * 5 tools for managing email preference centers
 */

import { z } from "zod";
import { server } from "../server.js";
import { extractApiKey, extractRestEndpoint } from "../lib/auth.js";
import { BrazeClient, type BrazeResponse } from "../lib/client.js";
import { formatErrorResponse, formatSuccessResponse } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

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
// preference_centers_list - List preference centers
// ========================================

server.tool(
  "preference_centers_list",
  "List all preference centers in the workspace.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    limit: z.number().optional().describe("Max results"),
    offset: z.number().optional(),
  },
  async (args) => {
    try {
      logger.info("preference_centers_list called");
      const client = createClient(args);

      const result = await client.request<BrazeResponse>("/preference_center/v1/list", {
        method: "GET",
        queryParams: {
          limit: args.limit,
          offset: args.offset,
        },
        context: { operation: "preference_centers_list" },
      });

      logger.info("preference_centers_list completed");
      return formatResponse(result);
    } catch (error) {
      return formatError(error, "preference_centers_list");
    }
  }
);

// ========================================
// preference_center_get - Get preference center details
// ========================================

server.tool(
  "preference_center_get",
  "Get details for a specific preference center.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    preference_center_external_id: z.string().describe("Preference center external ID"),
  },
  async (args) => {
    try {
      logger.info("preference_center_get called", { id: args.preference_center_external_id });
      const client = createClient(args);

      const result = await client.request<BrazeResponse>(
        `/preference_center/v1/${encodeURIComponent(args.preference_center_external_id)}`,
        {
          method: "GET",
          context: { operation: "preference_center_get" },
        }
      );

      logger.info("preference_center_get completed");
      return formatResponse(result);
    } catch (error) {
      return formatError(error, "preference_center_get");
    }
  }
);

// ========================================
// preference_center_url - Generate preference center URL for user
// ========================================

server.tool(
  "preference_center_url",
  "Generate a preference center URL for a specific user.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    preference_center_external_id: z.string().describe("Preference center external ID"),
    user_id: z.string().describe("User external ID"),
  },
  async (args) => {
    try {
      logger.info("preference_center_url called", {
        centerId: args.preference_center_external_id,
        userId: args.user_id,
      });
      const client = createClient(args);

      const result = await client.request<BrazeResponse>(
        `/preference_center/v1/${encodeURIComponent(args.preference_center_external_id)}/url/${encodeURIComponent(args.user_id)}`,
        {
          method: "GET",
          context: { operation: "preference_center_url" },
        }
      );

      logger.info("preference_center_url completed");
      return formatResponse(result);
    } catch (error) {
      return formatError(error, "preference_center_url");
    }
  }
);

// ========================================
// preference_center_create - Create preference center
// ========================================

const preferenceCenterOptionsSchema = z.object({
  meta_viewport_content: z.string().optional(),
});

server.tool(
  "preference_center_create",
  "Create a new preference center.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    name: z.string().describe("Preference center name"),
    preference_center_title: z.string().optional().describe("Title shown to users"),
    preference_center_page_html: z.string().optional().describe("Custom HTML content"),
    confirmation_page_html: z.string().optional().describe("Confirmation page HTML"),
    redirect_page_html: z.string().optional().describe("Redirect page HTML"),
    preference_center_options: preferenceCenterOptionsSchema.optional(),
    state: z.enum(["active", "draft"]).optional(),
  },
  async (args) => {
    try {
      logger.info("preference_center_create called", { name: args.name });
      const client = createClient(args);

      const result = await client.request<BrazeResponse>("/preference_center/v1", {
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
      return formatResponse(result);
    } catch (error) {
      return formatError(error, "preference_center_create");
    }
  }
);

// ========================================
// preference_center_update - Update preference center
// ========================================

server.tool(
  "preference_center_update",
  "Update an existing preference center.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    preference_center_external_id: z.string().describe("Preference center external ID"),
    name: z.string().optional().describe("New name"),
    preference_center_title: z.string().optional().describe("New title"),
    preference_center_page_html: z.string().optional().describe("New page HTML"),
    confirmation_page_html: z.string().optional().describe("New confirmation HTML"),
    redirect_page_html: z.string().optional().describe("New redirect HTML"),
    preference_center_options: preferenceCenterOptionsSchema.optional(),
    state: z.enum(["active", "draft"]).optional(),
  },
  async (args) => {
    try {
      logger.info("preference_center_update called", { id: args.preference_center_external_id });
      const client = createClient(args);

      const result = await client.request<BrazeResponse>(
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
      return formatResponse(result);
    } catch (error) {
      return formatError(error, "preference_center_update");
    }
  }
);
