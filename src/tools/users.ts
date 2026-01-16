/**
 * User Data Tools for Braze MCP Server
 */

import { z } from "zod";
import { server } from "../server.js";
import { extractApiKey, extractRestEndpoint } from "../lib/auth.js";
import { BrazeClient } from "../lib/client.js";
import { formatErrorResponse } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { BATCH_LIMITS, validateBatchSize } from "../lib/validation.js";

// Common schemas
const userAliasSchema = z.object({
  alias_name: z.string().min(1),
  alias_label: z.string().min(1),
});

// Response type for API calls that return a message with optional additional fields
interface ApiMessageResponse {
  message?: string;
  [key: string]: unknown;
}

/**
 * Creates a standardized JSON response for MCP tools
 */
function createResponse(data: Record<string, unknown>): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

/**
 * Creates a standardized success response for MCP tools
 */
function createSuccessResponse(data: Record<string, unknown>): { content: Array<{ type: "text"; text: string }> } {
  return createResponse({ success: true, ...data });
}

/**
 * Creates a standardized error response for MCP tools
 */
function createErrorResponse(error: unknown, toolName: string): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [{ type: "text", text: JSON.stringify(formatErrorResponse(error, { tool: toolName }), null, 2) }],
  };
}

// ========================================
// users_track - Track user attributes, events, purchases
// ========================================

server.tool(
  "users_track",
  "Track user data including attributes, custom events, and purchases. Use this to update user profiles, log events, and record purchases in Braze.",
  {
    apiKey: z.string().optional().describe("Braze REST API key (optional if set via env/header)"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    attributes: z
      .array(
        z.object({
          external_id: z.string().optional(),
          user_alias: userAliasSchema.optional(),
          braze_id: z.string().optional(),
        }).passthrough()
      )
      .optional()
      .describe("User attributes to update (max 75)"),
    events: z
      .array(
        z.object({
          external_id: z.string().optional(),
          user_alias: userAliasSchema.optional(),
          braze_id: z.string().optional(),
          app_id: z.string().optional(),
          name: z.string(),
          time: z.string(),
          properties: z.record(z.unknown()).optional(),
        })
      )
      .optional()
      .describe("Custom events to log"),
    purchases: z
      .array(
        z.object({
          external_id: z.string().optional(),
          user_alias: userAliasSchema.optional(),
          braze_id: z.string().optional(),
          app_id: z.string().optional(),
          product_id: z.string(),
          currency: z.string(),
          price: z.number(),
          quantity: z.number().optional(),
          time: z.string(),
          properties: z.record(z.unknown()).optional(),
        })
      )
      .optional()
      .describe("Purchase events to record"),
  },
  async (args) => {
    try {
      logger.info("users_track called", {
        attributeCount: args.attributes?.length || 0,
        eventCount: args.events?.length || 0,
        purchaseCount: args.purchases?.length || 0,
      });

      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      // Validate batch sizes
      if (args.attributes) {
        validateBatchSize(args.attributes, BATCH_LIMITS.USERS_TRACK, "attributes");
      }

      const result = await client.usersTrack({
        attributes: args.attributes,
        events: args.events,
        purchases: args.purchases,
      });

      logger.info("users_track completed", {
        attributesProcessed: result.attributes_processed,
        eventsProcessed: result.events_processed,
        purchasesProcessed: result.purchases_processed,
      });

      return createSuccessResponse({
        attributes_processed: result.attributes_processed,
        events_processed: result.events_processed,
        purchases_processed: result.purchases_processed,
        message: result.message,
      });
    } catch (error) {
      return createErrorResponse(error, "users_track");
    }
  }
);

// ========================================
// users_identify - Identify users with aliases
// ========================================

server.tool(
  "users_identify",
  "Identify an alias-only user profile with an external_id. This merges the alias profile into the identified user.",
  {
    apiKey: z.string().optional().describe("Braze REST API key (optional if set via env/header)"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    aliases_to_identify: z
      .array(
        z.object({
          external_id: z.string(),
          user_alias: userAliasSchema,
        })
      )
      .min(1)
      .max(50)
      .describe("Array of alias-to-external-id mappings"),
  },
  async (args) => {
    try {
      logger.info("users_identify called", { count: args.aliases_to_identify.length });

      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.usersIdentify({
        aliases_to_identify: args.aliases_to_identify,
      });

      logger.info("users_identify completed");

      return createSuccessResponse({ message: result.message });
    } catch (error) {
      return createErrorResponse(error, "users_identify");
    }
  }
);

// ========================================
// users_alias_new - Create new user aliases
// ========================================

server.tool(
  "users_alias_new",
  "Create new user aliases for existing users or create alias-only profiles.",
  {
    apiKey: z.string().optional().describe("Braze REST API key (optional if set via env/header)"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    user_aliases: z
      .array(
        z.object({
          external_id: z.string().optional().describe("External ID to attach alias to"),
          alias_name: z.string(),
          alias_label: z.string(),
        })
      )
      .min(1)
      .max(50)
      .describe("Array of user aliases to create"),
  },
  async (args) => {
    try {
      logger.info("users_alias_new called", { count: args.user_aliases.length });

      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.usersAliasNew({
        user_aliases: args.user_aliases,
      });

      logger.info("users_alias_new completed");

      return createSuccessResponse({ message: result.message });
    } catch (error) {
      return createErrorResponse(error, "users_alias_new");
    }
  }
);

// ========================================
// users_delete - Delete user profiles
// ========================================

server.tool(
  "users_delete",
  "Delete user profiles from Braze. This is permanent and cannot be undone. Use for GDPR/CCPA compliance.",
  {
    apiKey: z.string().optional().describe("Braze REST API key (optional if set via env/header)"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    external_ids: z
      .array(z.string())
      .optional()
      .describe("External IDs of users to delete"),
    user_aliases: z.array(userAliasSchema).optional().describe("User aliases to delete"),
    braze_ids: z.array(z.string()).optional().describe("Braze IDs of users to delete"),
  },
  async (args) => {
    try {
      const totalUsers =
        (args.external_ids?.length || 0) +
        (args.user_aliases?.length || 0) +
        (args.braze_ids?.length || 0);

      logger.info("users_delete called", { totalUsers });

      if (totalUsers === 0) {
        return createResponse({ success: false, error: "At least one user identifier is required" });
      }

      validateBatchSize(
        [...(args.external_ids || []), ...(args.user_aliases || []), ...(args.braze_ids || [])],
        BATCH_LIMITS.USERS_DELETE,
        "users_delete"
      );

      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.usersDelete({
        external_ids: args.external_ids,
        user_aliases: args.user_aliases,
        braze_ids: args.braze_ids,
      });

      logger.info("users_delete completed", { deleted: result.deleted });

      return createSuccessResponse({ deleted: result.deleted, message: result.message });
    } catch (error) {
      return createErrorResponse(error, "users_delete");
    }
  }
);

// ========================================
// users_merge - Merge user profiles
// ========================================

server.tool(
  "users_merge",
  "Merge one user profile into another. Data from the merged user will be combined into the target user.",
  {
    apiKey: z.string().optional().describe("Braze REST API key (optional if set via env/header)"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    merge_updates: z
      .array(
        z.object({
          identifier_to_merge: z.object({
            external_id: z.string().optional(),
            user_alias: userAliasSchema.optional(),
          }),
          identifier_to_keep: z.object({
            external_id: z.string().optional(),
            user_alias: userAliasSchema.optional(),
          }),
        })
      )
      .min(1)
      .max(50)
      .describe("Array of merge operations"),
  },
  async (args) => {
    try {
      logger.info("users_merge called", { count: args.merge_updates.length });

      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.usersMerge({
        merge_updates: args.merge_updates,
      });

      logger.info("users_merge completed");

      return createSuccessResponse({ message: result.message });
    } catch (error) {
      return createErrorResponse(error, "users_merge");
    }
  }
);

// ========================================
// users_alias_update - Update existing user alias
// ========================================

server.tool(
  "users_alias_update",
  "Update existing user aliases. Changes the alias_name for a given alias_label.",
  {
    apiKey: z.string().optional().describe("Braze REST API key (optional if set via env/header)"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    alias_updates: z
      .array(
        z.object({
          alias_label: z.string().describe("The label of the alias to update"),
          old_alias_name: z.string().describe("Current alias name"),
          new_alias_name: z.string().describe("New alias name"),
        })
      )
      .min(1)
      .max(50)
      .describe("Array of alias updates"),
  },
  async (args) => {
    try {
      logger.info("users_alias_update called", { count: args.alias_updates.length });

      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<ApiMessageResponse>("/users/alias/update", {
        body: { alias_updates: args.alias_updates },
        context: { operation: "users_alias_update" },
      });

      logger.info("users_alias_update completed");

      return createSuccessResponse({ message: result.message });
    } catch (error) {
      return createErrorResponse(error, "users_alias_update");
    }
  }
);

// ========================================
// users_external_id_rename - Rename external IDs
// ========================================

server.tool(
  "users_external_id_rename",
  "Rename external IDs for users. Use for migrating to a new ID scheme.",
  {
    apiKey: z.string().optional().describe("Braze REST API key (optional if set via env/header)"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    external_id_renames: z
      .array(
        z.object({
          current_external_id: z.string().describe("Current external ID"),
          new_external_id: z.string().describe("New external ID"),
        })
      )
      .min(1)
      .max(50)
      .describe("Array of external ID renames"),
  },
  async (args) => {
    try {
      logger.info("users_external_id_rename called", { count: args.external_id_renames.length });

      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<ApiMessageResponse>("/users/external_ids/rename", {
        body: { external_id_renames: args.external_id_renames },
        context: { operation: "users_external_id_rename" },
      });

      logger.info("users_external_id_rename completed");

      return createSuccessResponse({ message: result.message });
    } catch (error) {
      return createErrorResponse(error, "users_external_id_rename");
    }
  }
);

// ========================================
// users_external_id_remove - Remove deprecated external IDs
// ========================================

server.tool(
  "users_external_id_remove",
  "Remove deprecated external IDs that were previously renamed. Cleans up old ID references.",
  {
    apiKey: z.string().optional().describe("Braze REST API key (optional if set via env/header)"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    external_ids: z
      .array(z.string())
      .min(1)
      .max(50)
      .describe("Array of deprecated external IDs to remove"),
  },
  async (args) => {
    try {
      logger.info("users_external_id_remove called", { count: args.external_ids.length });

      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<ApiMessageResponse>("/users/external_ids/remove", {
        body: { external_ids: args.external_ids },
        context: { operation: "users_external_id_remove" },
      });

      logger.info("users_external_id_remove completed");

      return createSuccessResponse({ message: result.message });
    } catch (error) {
      return createErrorResponse(error, "users_external_id_remove");
    }
  }
);
