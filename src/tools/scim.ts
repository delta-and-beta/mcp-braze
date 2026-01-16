/**
 * SCIM Tools for Braze MCP Server
 * 5 tools for managing dashboard users via SCIM API
 */

import { z } from "zod";
import { server } from "../server.js";
import { extractApiKey, extractRestEndpoint } from "../lib/auth.js";
import { BrazeClient } from "../lib/client.js";
import { formatErrorResponse } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

// ========================================
// Types
// ========================================

interface ScimAppGroupPermission {
  appGroupName: string;
  appGroupPermissions?: string[];
  team?: string[];
}

interface ScimPermissions {
  companyPermissions?: string[];
  appGroup?: ScimAppGroupPermission[];
}

interface ScimUserResponse {
  id?: string;
  userName?: string;
  name?: { givenName?: string; familyName?: string };
  department?: string;
  permissions?: ScimPermissions;
  schemas?: string[];
  [key: string]: unknown;
}

interface ScimSearchResponse {
  totalResults?: number;
  itemsPerPage?: number;
  startIndex?: number;
  schemas?: string[];
  Resources?: ScimUserResponse[];
}

interface ScimName {
  givenName?: string;
  familyName?: string;
}

interface ScimUpdateBody {
  schemas: string[];
  userName?: string;
  name?: ScimName;
  department?: string;
  permissions?: ScimPermissions;
  [key: string]: unknown;
}

// ========================================
// Schemas
// ========================================

const authSchema = z.object({
  apiKey: z.string().optional().describe("Braze REST API key (requires SCIM permissions)"),
  restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
});

const permissionsSchema = z.object({
  companyPermissions: z.array(z.string()).optional(),
  appGroup: z.array(z.object({
    appGroupName: z.string(),
    appGroupPermissions: z.array(z.string()).optional(),
    team: z.array(z.string()).optional(),
  })).optional(),
}).optional();

// ========================================
// Helpers
// ========================================

const SCIM_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:User";

function formatSuccessResponse(result: ScimUserResponse | ScimSearchResponse): { content: [{ type: "text"; text: string }] } {
  return {
    content: [{ type: "text", text: JSON.stringify({ success: true, ...result }, null, 2) }],
  };
}

function formatToolError(error: unknown, tool: string): { content: [{ type: "text"; text: string }] } {
  return {
    content: [{ type: "text", text: JSON.stringify(formatErrorResponse(error, { tool }), null, 2) }],
  };
}

// ========================================
// scim_users_search - Search dashboard users by email
// ========================================

server.tool(
  "scim_users_search",
  "Search for dashboard users by email address.",
  authSchema.extend({
    filter: z.string().describe("SCIM filter (e.g., 'userName eq \"user@example.com\"')"),
    startIndex: z.number().optional().describe("1-based start index"),
    count: z.number().optional().describe("Number of results to return"),
  }).shape,
  async (args) => {
    try {
      logger.info("scim_users_search called", { filter: args.filter });
      const client = new BrazeClient({
        apiKey: extractApiKey(args),
        restEndpoint: extractRestEndpoint(args),
      });

      const queryParams: Record<string, string | number> = { filter: args.filter };
      if (args.startIndex !== undefined) queryParams.startIndex = args.startIndex;
      if (args.count !== undefined) queryParams.count = args.count;

      const result = await client.request<ScimSearchResponse>("/scim/v2/Users", {
        method: "GET",
        queryParams,
        context: { operation: "scim_users_search" },
      });

      logger.info("scim_users_search completed");
      return formatSuccessResponse(result);
    } catch (error) {
      return formatToolError(error, "scim_users_search");
    }
  }
);

// ========================================
// scim_users_create - Create dashboard user
// ========================================

server.tool(
  "scim_users_create",
  "Create a new dashboard user account.",
  authSchema.extend({
    userName: z.string().describe("Email address for the new user"),
    givenName: z.string().describe("First name"),
    familyName: z.string().describe("Last name"),
    department: z.string().optional().describe("Department"),
    permissions: permissionsSchema.describe("User permissions"),
  }).shape,
  async (args) => {
    try {
      logger.info("scim_users_create called", { userName: args.userName });
      const client = new BrazeClient({
        apiKey: extractApiKey(args),
        restEndpoint: extractRestEndpoint(args),
      });

      const result = await client.request<ScimUserResponse>("/scim/v2/Users", {
        body: {
          schemas: [SCIM_SCHEMA],
          userName: args.userName,
          name: {
            givenName: args.givenName,
            familyName: args.familyName,
          },
          department: args.department,
          permissions: args.permissions,
        },
        context: { operation: "scim_users_create" },
      });

      logger.info("scim_users_create completed");
      return formatSuccessResponse(result);
    } catch (error) {
      return formatToolError(error, "scim_users_create");
    }
  }
);

// ========================================
// scim_users_get - Get dashboard user by ID
// ========================================

server.tool(
  "scim_users_get",
  "Get a dashboard user account by SCIM ID.",
  authSchema.extend({
    user_id: z.string().describe("SCIM user ID"),
  }).shape,
  async (args) => {
    try {
      logger.info("scim_users_get called", { userId: args.user_id });
      const client = new BrazeClient({
        apiKey: extractApiKey(args),
        restEndpoint: extractRestEndpoint(args),
      });

      const result = await client.request<ScimUserResponse>(
        `/scim/v2/Users/${encodeURIComponent(args.user_id)}`,
        {
          method: "GET",
          context: { operation: "scim_users_get" },
        }
      );

      logger.info("scim_users_get completed");
      return formatSuccessResponse(result);
    } catch (error) {
      return formatToolError(error, "scim_users_get");
    }
  }
);

// ========================================
// scim_users_update - Update dashboard user
// ========================================

server.tool(
  "scim_users_update",
  "Update a dashboard user account.",
  authSchema.extend({
    user_id: z.string().describe("SCIM user ID"),
    userName: z.string().optional().describe("New email address"),
    givenName: z.string().optional().describe("New first name"),
    familyName: z.string().optional().describe("New last name"),
    department: z.string().optional().describe("New department"),
    permissions: permissionsSchema.describe("New permissions"),
  }).shape,
  async (args) => {
    try {
      logger.info("scim_users_update called", { userId: args.user_id });
      const client = new BrazeClient({
        apiKey: extractApiKey(args),
        restEndpoint: extractRestEndpoint(args),
      });

      const body: ScimUpdateBody = { schemas: [SCIM_SCHEMA] };

      if (args.userName) body.userName = args.userName;
      if (args.givenName || args.familyName) {
        body.name = {
          givenName: args.givenName,
          familyName: args.familyName,
        };
      }
      if (args.department) body.department = args.department;
      if (args.permissions) body.permissions = args.permissions;

      const result = await client.request<ScimUserResponse>(
        `/scim/v2/Users/${encodeURIComponent(args.user_id)}`,
        {
          method: "PUT",
          body,
          context: { operation: "scim_users_update" },
        }
      );

      logger.info("scim_users_update completed");
      return formatSuccessResponse(result);
    } catch (error) {
      return formatToolError(error, "scim_users_update");
    }
  }
);

// ========================================
// scim_users_delete - Delete dashboard user
// ========================================

server.tool(
  "scim_users_delete",
  "Delete a dashboard user account. This is permanent.",
  authSchema.extend({
    user_id: z.string().describe("SCIM user ID to delete"),
  }).shape,
  async (args) => {
    try {
      logger.info("scim_users_delete called", { userId: args.user_id });
      const client = new BrazeClient({
        apiKey: extractApiKey(args),
        restEndpoint: extractRestEndpoint(args),
      });

      const result = await client.request<ScimUserResponse>(
        `/scim/v2/Users/${encodeURIComponent(args.user_id)}`,
        {
          method: "DELETE",
          context: { operation: "scim_users_delete" },
        }
      );

      logger.info("scim_users_delete completed");
      return formatSuccessResponse(result);
    } catch (error) {
      return formatToolError(error, "scim_users_delete");
    }
  }
);
