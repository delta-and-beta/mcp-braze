/**
 * SCIM Tools for Braze MCP Server
 * 5 tools for managing dashboard users via SCIM API
 */

import { z } from "zod";
import { server, type SessionData } from "../server.js";
import { extractApiKey, extractRestEndpoint } from "../lib/auth.js";
import { BrazeClient } from "../lib/client.js";
import { formatErrorResponse } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const authSchema = z.object({
  apiKey: z.string().optional().describe("Braze REST API key (requires SCIM permissions)"),
  restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
});

// SCIM user schema used for validation reference
const _scimUserSchemaRef = z.object({
  schemas: z.array(z.string()).optional().default(["urn:ietf:params:scim:schemas:core:2.0:User"]),
  userName: z.string().describe("Email address of the user"),
  name: z.object({
    givenName: z.string().describe("First name"),
    familyName: z.string().describe("Last name"),
  }),
  department: z.string().optional().describe("Department name"),
  permissions: z.object({
    companyPermissions: z.array(z.string()).optional(),
    appGroup: z.array(z.object({
      appGroupName: z.string(),
      appGroupPermissions: z.array(z.string()).optional(),
      team: z.array(z.string()).optional(),
    })).optional(),
  }).optional(),
});
void _scimUserSchemaRef; // Reference to avoid unused warning

// ========================================
// scim_users_search - Search dashboard users by email
// ========================================

server.addTool({
  name: "scim_users_search",
  description: "Search for dashboard users by email address.",
  parameters: authSchema.extend({
    filter: z.string().describe("SCIM filter (e.g., 'userName eq \"user@example.com\"')"),
    startIndex: z.number().optional().describe("1-based start index"),
    count: z.number().optional().describe("Number of results to return"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("scim_users_search called", { filter: args.filter });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const queryParams: Record<string, string | number | boolean> = {
        filter: args.filter,
      };
      if (args.startIndex) queryParams.startIndex = args.startIndex;
      if (args.count) queryParams.count = args.count;

      const result = await client.request("/scim/v2/Users", {
        method: "GET",
        queryParams,
        context: { operation: "scim_users_search" },
      });

      logger.info("scim_users_search completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "scim_users_search" }), null, 2);
    }
  },
});

// ========================================
// scim_users_create - Create dashboard user
// ========================================

server.addTool({
  name: "scim_users_create",
  description: "Create a new dashboard user account.",
  parameters: authSchema.extend({
    userName: z.string().describe("Email address for the new user"),
    givenName: z.string().describe("First name"),
    familyName: z.string().describe("Last name"),
    department: z.string().optional().describe("Department"),
    permissions: z.object({
      companyPermissions: z.array(z.string()).optional(),
      appGroup: z.array(z.object({
        appGroupName: z.string(),
        appGroupPermissions: z.array(z.string()).optional(),
        team: z.array(z.string()).optional(),
      })).optional(),
    }).optional().describe("User permissions"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("scim_users_create called", { userName: args.userName });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/scim/v2/Users", {
        body: {
          schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
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
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "scim_users_create" }), null, 2);
    }
  },
});

// ========================================
// scim_users_get - Get dashboard user by ID
// ========================================

server.addTool({
  name: "scim_users_get",
  description: "Get a dashboard user account by SCIM ID.",
  parameters: authSchema.extend({
    user_id: z.string().describe("SCIM user ID"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("scim_users_get called", { userId: args.user_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request(`/scim/v2/Users/${encodeURIComponent(args.user_id)}`, {
        method: "GET",
        context: { operation: "scim_users_get" },
      });

      logger.info("scim_users_get completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "scim_users_get" }), null, 2);
    }
  },
});

// ========================================
// scim_users_update - Update dashboard user
// ========================================

server.addTool({
  name: "scim_users_update",
  description: "Update a dashboard user account.",
  parameters: authSchema.extend({
    user_id: z.string().describe("SCIM user ID"),
    userName: z.string().optional().describe("New email address"),
    givenName: z.string().optional().describe("New first name"),
    familyName: z.string().optional().describe("New last name"),
    department: z.string().optional().describe("New department"),
    permissions: z.object({
      companyPermissions: z.array(z.string()).optional(),
      appGroup: z.array(z.object({
        appGroupName: z.string(),
        appGroupPermissions: z.array(z.string()).optional(),
        team: z.array(z.string()).optional(),
      })).optional(),
    }).optional().describe("New permissions"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("scim_users_update called", { userId: args.user_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const body: Record<string, unknown> = {
        schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
      };

      if (args.userName) body.userName = args.userName;
      if (args.givenName || args.familyName) {
        body.name = {};
        if (args.givenName) (body.name as Record<string, string>).givenName = args.givenName;
        if (args.familyName) (body.name as Record<string, string>).familyName = args.familyName;
      }
      if (args.department) body.department = args.department;
      if (args.permissions) body.permissions = args.permissions;

      const result = await client.request(`/scim/v2/Users/${encodeURIComponent(args.user_id)}`, {
        method: "PUT",
        body,
        context: { operation: "scim_users_update" },
      });

      logger.info("scim_users_update completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "scim_users_update" }), null, 2);
    }
  },
});

// ========================================
// scim_users_delete - Delete dashboard user
// ========================================

server.addTool({
  name: "scim_users_delete",
  description: "Delete a dashboard user account. This is permanent.",
  parameters: authSchema.extend({
    user_id: z.string().describe("SCIM user ID to delete"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("scim_users_delete called", { userId: args.user_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request(`/scim/v2/Users/${encodeURIComponent(args.user_id)}`, {
        method: "DELETE",
        context: { operation: "scim_users_delete" },
      });

      logger.info("scim_users_delete completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "scim_users_delete" }), null, 2);
    }
  },
});
