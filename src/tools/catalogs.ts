/**
 * Catalog Tools for Braze MCP Server
 * 13 tools for managing catalogs and catalog items
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

const catalogFieldSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "time", "array"]),
});

// ========================================
// CATALOG OPERATIONS
// ========================================

server.addTool({
  name: "catalogs_list",
  description: "List all catalogs in the workspace.",
  parameters: authSchema,
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("catalogs_list called");
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/catalogs", {
        method: "GET",
        context: { operation: "catalogs_list" },
      });

      logger.info("catalogs_list completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "catalogs_list" }), null, 2);
    }
  },
});

server.addTool({
  name: "catalogs_create",
  description: "Create a new catalog.",
  parameters: authSchema.extend({
    catalogs: z.array(
      z.object({
        name: z.string().describe("Catalog name"),
        description: z.string().optional().describe("Catalog description"),
        fields: z.array(catalogFieldSchema).describe("Field definitions"),
      })
    ).describe("Catalogs to create"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("catalogs_create called", { count: args.catalogs.length });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/catalogs", {
        body: { catalogs: args.catalogs },
        context: { operation: "catalogs_create" },
      });

      logger.info("catalogs_create completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "catalogs_create" }), null, 2);
    }
  },
});

server.addTool({
  name: "catalogs_delete",
  description: "Delete a catalog and all its items.",
  parameters: authSchema.extend({
    catalog_name: z.string().describe("Catalog name to delete"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("catalogs_delete called", { catalogName: args.catalog_name });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request(`/catalogs/${encodeURIComponent(args.catalog_name)}`, {
        method: "DELETE",
        context: { operation: "catalogs_delete" },
      });

      logger.info("catalogs_delete completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "catalogs_delete" }), null, 2);
    }
  },
});

// ========================================
// CATALOG ITEMS - BULK OPERATIONS
// ========================================

server.addTool({
  name: "catalog_items_list",
  description: "List items in a catalog.",
  parameters: authSchema.extend({
    catalog_name: z.string().describe("Catalog name"),
    cursor: z.string().optional().describe("Pagination cursor"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("catalog_items_list called", { catalogName: args.catalog_name });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request(`/catalogs/${encodeURIComponent(args.catalog_name)}/items`, {
        method: "GET",
        queryParams: args.cursor ? { cursor: args.cursor } : undefined,
        context: { operation: "catalog_items_list" },
      });

      logger.info("catalog_items_list completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "catalog_items_list" }), null, 2);
    }
  },
});

server.addTool({
  name: "catalog_items_create",
  description: "Create multiple items in a catalog.",
  parameters: authSchema.extend({
    catalog_name: z.string().describe("Catalog name"),
    items: z.array(
      z.object({
        id: z.string().describe("Item ID"),
      }).passthrough()
    ).describe("Items to create (max 50)"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("catalog_items_create called", { catalogName: args.catalog_name, count: args.items.length });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request(`/catalogs/${encodeURIComponent(args.catalog_name)}/items`, {
        body: { items: args.items },
        context: { operation: "catalog_items_create" },
      });

      logger.info("catalog_items_create completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "catalog_items_create" }), null, 2);
    }
  },
});

server.addTool({
  name: "catalog_items_update",
  description: "Update multiple items in a catalog (replaces entire item).",
  parameters: authSchema.extend({
    catalog_name: z.string().describe("Catalog name"),
    items: z.array(
      z.object({
        id: z.string().describe("Item ID"),
      }).passthrough()
    ).describe("Items to update (max 50)"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("catalog_items_update called", { catalogName: args.catalog_name, count: args.items.length });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request(`/catalogs/${encodeURIComponent(args.catalog_name)}/items`, {
        method: "PUT",
        body: { items: args.items },
        context: { operation: "catalog_items_update" },
      });

      logger.info("catalog_items_update completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "catalog_items_update" }), null, 2);
    }
  },
});

server.addTool({
  name: "catalog_items_edit",
  description: "Edit multiple items in a catalog (partial update).",
  parameters: authSchema.extend({
    catalog_name: z.string().describe("Catalog name"),
    items: z.array(
      z.object({
        id: z.string().describe("Item ID"),
      }).passthrough()
    ).describe("Items to edit (max 50)"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("catalog_items_edit called", { catalogName: args.catalog_name, count: args.items.length });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request(`/catalogs/${encodeURIComponent(args.catalog_name)}/items`, {
        method: "PATCH",
        body: { items: args.items },
        context: { operation: "catalog_items_edit" },
      });

      logger.info("catalog_items_edit completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "catalog_items_edit" }), null, 2);
    }
  },
});

server.addTool({
  name: "catalog_items_delete",
  description: "Delete multiple items from a catalog.",
  parameters: authSchema.extend({
    catalog_name: z.string().describe("Catalog name"),
    items: z.array(
      z.object({
        id: z.string().describe("Item ID to delete"),
      })
    ).describe("Items to delete (max 50)"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("catalog_items_delete called", { catalogName: args.catalog_name, count: args.items.length });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request(`/catalogs/${encodeURIComponent(args.catalog_name)}/items`, {
        method: "DELETE",
        body: { items: args.items },
        context: { operation: "catalog_items_delete" },
      });

      logger.info("catalog_items_delete completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "catalog_items_delete" }), null, 2);
    }
  },
});

// ========================================
// CATALOG ITEMS - SINGLE ITEM OPERATIONS
// ========================================

server.addTool({
  name: "catalog_item_get",
  description: "Get a single catalog item by ID.",
  parameters: authSchema.extend({
    catalog_name: z.string().describe("Catalog name"),
    item_id: z.string().describe("Item ID"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("catalog_item_get called", { catalogName: args.catalog_name, itemId: args.item_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request(
        `/catalogs/${encodeURIComponent(args.catalog_name)}/items/${encodeURIComponent(args.item_id)}`,
        {
          method: "GET",
          context: { operation: "catalog_item_get" },
        }
      );

      logger.info("catalog_item_get completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "catalog_item_get" }), null, 2);
    }
  },
});

server.addTool({
  name: "catalog_item_create",
  description: "Create a single catalog item.",
  parameters: authSchema.extend({
    catalog_name: z.string().describe("Catalog name"),
    item_id: z.string().describe("Item ID"),
    item_data: z.record(z.unknown()).describe("Item data fields"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("catalog_item_create called", { catalogName: args.catalog_name, itemId: args.item_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request(
        `/catalogs/${encodeURIComponent(args.catalog_name)}/items/${encodeURIComponent(args.item_id)}`,
        {
          body: args.item_data,
          context: { operation: "catalog_item_create" },
        }
      );

      logger.info("catalog_item_create completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "catalog_item_create" }), null, 2);
    }
  },
});

server.addTool({
  name: "catalog_item_update",
  description: "Update a single catalog item (replaces entire item).",
  parameters: authSchema.extend({
    catalog_name: z.string().describe("Catalog name"),
    item_id: z.string().describe("Item ID"),
    item_data: z.record(z.unknown()).describe("New item data"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("catalog_item_update called", { catalogName: args.catalog_name, itemId: args.item_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request(
        `/catalogs/${encodeURIComponent(args.catalog_name)}/items/${encodeURIComponent(args.item_id)}`,
        {
          method: "PUT",
          body: args.item_data,
          context: { operation: "catalog_item_update" },
        }
      );

      logger.info("catalog_item_update completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "catalog_item_update" }), null, 2);
    }
  },
});

server.addTool({
  name: "catalog_item_edit",
  description: "Edit a single catalog item (partial update).",
  parameters: authSchema.extend({
    catalog_name: z.string().describe("Catalog name"),
    item_id: z.string().describe("Item ID"),
    item_data: z.record(z.unknown()).describe("Fields to update"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("catalog_item_edit called", { catalogName: args.catalog_name, itemId: args.item_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request(
        `/catalogs/${encodeURIComponent(args.catalog_name)}/items/${encodeURIComponent(args.item_id)}`,
        {
          method: "PATCH",
          body: args.item_data,
          context: { operation: "catalog_item_edit" },
        }
      );

      logger.info("catalog_item_edit completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "catalog_item_edit" }), null, 2);
    }
  },
});

server.addTool({
  name: "catalog_item_delete",
  description: "Delete a single catalog item.",
  parameters: authSchema.extend({
    catalog_name: z.string().describe("Catalog name"),
    item_id: z.string().describe("Item ID to delete"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("catalog_item_delete called", { catalogName: args.catalog_name, itemId: args.item_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request(
        `/catalogs/${encodeURIComponent(args.catalog_name)}/items/${encodeURIComponent(args.item_id)}`,
        {
          method: "DELETE",
          context: { operation: "catalog_item_delete" },
        }
      );

      logger.info("catalog_item_delete completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "catalog_item_delete" }), null, 2);
    }
  },
});
