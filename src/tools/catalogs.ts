/**
 * Catalog Tools for Braze MCP Server
 * 13 tools for managing catalogs and catalog items
 */

import { z } from "zod";
import { server } from "../server.js";
import { extractApiKey, extractRestEndpoint } from "../lib/auth.js";
import { BrazeClient } from "../lib/client.js";
import { formatErrorResponse } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

/**
 * Response type for catalog API operations
 */
interface CatalogApiResponse {
  message?: string;
  [key: string]: unknown;
}

/**
 * Creates a standardized success response for MCP tools
 */
function createSuccessResponse(data: Record<string, unknown>): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [{ type: "text", text: JSON.stringify({ success: true, ...data }, null, 2) }],
  };
}

/**
 * Creates a standardized error response for MCP tools
 */
function createErrorResponse(error: unknown, toolName: string): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [{ type: "text", text: JSON.stringify(formatErrorResponse(error, { tool: toolName }), null, 2) }],
  };
}

const catalogFieldSchema = z.object({
  name: z.string(),
  type: z.enum(["string", "number", "boolean", "time", "array"]),
});

// ========================================
// CATALOG OPERATIONS
// ========================================

server.tool(
  "catalogs_list",
  "List all catalogs in the workspace.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
  },
  async (args) => {
    try {
      logger.info("catalogs_list called");
      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<CatalogApiResponse>("/catalogs", {
        method: "GET",
        context: { operation: "catalogs_list" },
      });

      logger.info("catalogs_list completed");
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error, "catalogs_list");
    }
  }
);

server.tool(
  "catalogs_create",
  "Create a new catalog.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    catalogs: z.array(
      z.object({
        name: z.string().describe("Catalog name"),
        description: z.string().optional().describe("Catalog description"),
        fields: z.array(catalogFieldSchema).describe("Field definitions"),
      })
    ).describe("Catalogs to create"),
  },
  async (args) => {
    try {
      logger.info("catalogs_create called", { count: args.catalogs.length });
      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<CatalogApiResponse>("/catalogs", {
        body: { catalogs: args.catalogs },
        context: { operation: "catalogs_create" },
      });

      logger.info("catalogs_create completed");
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error, "catalogs_create");
    }
  }
);

server.tool(
  "catalogs_delete",
  "Delete a catalog and all its items.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    catalog_name: z.string().describe("Catalog name to delete"),
  },
  async (args) => {
    try {
      logger.info("catalogs_delete called", { catalogName: args.catalog_name });
      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<CatalogApiResponse>(`/catalogs/${encodeURIComponent(args.catalog_name)}`, {
        method: "DELETE",
        context: { operation: "catalogs_delete" },
      });

      logger.info("catalogs_delete completed");
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error, "catalogs_delete");
    }
  }
);

// ========================================
// CATALOG ITEMS - BULK OPERATIONS
// ========================================

server.tool(
  "catalog_items_list",
  "List items in a catalog.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    catalog_name: z.string().describe("Catalog name"),
    cursor: z.string().optional().describe("Pagination cursor"),
  },
  async (args) => {
    try {
      logger.info("catalog_items_list called", { catalogName: args.catalog_name });
      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<CatalogApiResponse>(`/catalogs/${encodeURIComponent(args.catalog_name)}/items`, {
        method: "GET",
        queryParams: args.cursor ? { cursor: args.cursor } : undefined,
        context: { operation: "catalog_items_list" },
      });

      logger.info("catalog_items_list completed");
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error, "catalog_items_list");
    }
  }
);

server.tool(
  "catalog_items_create",
  "Create multiple items in a catalog.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    catalog_name: z.string().describe("Catalog name"),
    items: z.array(
      z.object({
        id: z.string().describe("Item ID"),
      }).passthrough()
    ).describe("Items to create (max 50)"),
  },
  async (args) => {
    try {
      logger.info("catalog_items_create called", { catalogName: args.catalog_name, count: args.items.length });
      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<CatalogApiResponse>(`/catalogs/${encodeURIComponent(args.catalog_name)}/items`, {
        body: { items: args.items },
        context: { operation: "catalog_items_create" },
      });

      logger.info("catalog_items_create completed");
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error, "catalog_items_create");
    }
  }
);

server.tool(
  "catalog_items_update",
  "Update multiple items in a catalog (replaces entire item).",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    catalog_name: z.string().describe("Catalog name"),
    items: z.array(
      z.object({
        id: z.string().describe("Item ID"),
      }).passthrough()
    ).describe("Items to update (max 50)"),
  },
  async (args) => {
    try {
      logger.info("catalog_items_update called", { catalogName: args.catalog_name, count: args.items.length });
      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<CatalogApiResponse>(`/catalogs/${encodeURIComponent(args.catalog_name)}/items`, {
        method: "PUT",
        body: { items: args.items },
        context: { operation: "catalog_items_update" },
      });

      logger.info("catalog_items_update completed");
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error, "catalog_items_update");
    }
  }
);

server.tool(
  "catalog_items_edit",
  "Edit multiple items in a catalog (partial update).",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    catalog_name: z.string().describe("Catalog name"),
    items: z.array(
      z.object({
        id: z.string().describe("Item ID"),
      }).passthrough()
    ).describe("Items to edit (max 50)"),
  },
  async (args) => {
    try {
      logger.info("catalog_items_edit called", { catalogName: args.catalog_name, count: args.items.length });
      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<CatalogApiResponse>(`/catalogs/${encodeURIComponent(args.catalog_name)}/items`, {
        method: "PATCH",
        body: { items: args.items },
        context: { operation: "catalog_items_edit" },
      });

      logger.info("catalog_items_edit completed");
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error, "catalog_items_edit");
    }
  }
);

server.tool(
  "catalog_items_delete",
  "Delete multiple items from a catalog.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    catalog_name: z.string().describe("Catalog name"),
    items: z.array(
      z.object({
        id: z.string().describe("Item ID to delete"),
      })
    ).describe("Items to delete (max 50)"),
  },
  async (args) => {
    try {
      logger.info("catalog_items_delete called", { catalogName: args.catalog_name, count: args.items.length });
      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<CatalogApiResponse>(`/catalogs/${encodeURIComponent(args.catalog_name)}/items`, {
        method: "DELETE",
        body: { items: args.items },
        context: { operation: "catalog_items_delete" },
      });

      logger.info("catalog_items_delete completed");
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error, "catalog_items_delete");
    }
  }
);

// ========================================
// CATALOG ITEMS - SINGLE ITEM OPERATIONS
// ========================================

server.tool(
  "catalog_item_get",
  "Get a single catalog item by ID.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    catalog_name: z.string().describe("Catalog name"),
    item_id: z.string().describe("Item ID"),
  },
  async (args) => {
    try {
      logger.info("catalog_item_get called", { catalogName: args.catalog_name, itemId: args.item_id });
      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<CatalogApiResponse>(
        `/catalogs/${encodeURIComponent(args.catalog_name)}/items/${encodeURIComponent(args.item_id)}`,
        {
          method: "GET",
          context: { operation: "catalog_item_get" },
        }
      );

      logger.info("catalog_item_get completed");
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error, "catalog_item_get");
    }
  }
);

server.tool(
  "catalog_item_create",
  "Create a single catalog item.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    catalog_name: z.string().describe("Catalog name"),
    item_id: z.string().describe("Item ID"),
    item_data: z.record(z.unknown()).describe("Item data fields"),
  },
  async (args) => {
    try {
      logger.info("catalog_item_create called", { catalogName: args.catalog_name, itemId: args.item_id });
      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<CatalogApiResponse>(
        `/catalogs/${encodeURIComponent(args.catalog_name)}/items/${encodeURIComponent(args.item_id)}`,
        {
          method: "PUT",
          body: { items: [args.item_data] },
          context: { operation: "catalog_item_create" },
        }
      );

      logger.info("catalog_item_create completed");
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error, "catalog_item_create");
    }
  }
);

server.tool(
  "catalog_item_update",
  "Update a single catalog item (replaces entire item).",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    catalog_name: z.string().describe("Catalog name"),
    item_id: z.string().describe("Item ID"),
    item_data: z.record(z.unknown()).describe("New item data"),
  },
  async (args) => {
    try {
      logger.info("catalog_item_update called", { catalogName: args.catalog_name, itemId: args.item_id });
      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<CatalogApiResponse>(
        `/catalogs/${encodeURIComponent(args.catalog_name)}/items/${encodeURIComponent(args.item_id)}`,
        {
          method: "PUT",
          body: { items: [args.item_data] },
          context: { operation: "catalog_item_update" },
        }
      );

      logger.info("catalog_item_update completed");
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error, "catalog_item_update");
    }
  }
);

server.tool(
  "catalog_item_edit",
  "Edit a single catalog item (partial update).",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    catalog_name: z.string().describe("Catalog name"),
    item_id: z.string().describe("Item ID"),
    item_data: z.record(z.unknown()).describe("Fields to update"),
  },
  async (args) => {
    try {
      logger.info("catalog_item_edit called", { catalogName: args.catalog_name, itemId: args.item_id });
      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<CatalogApiResponse>(
        `/catalogs/${encodeURIComponent(args.catalog_name)}/items/${encodeURIComponent(args.item_id)}`,
        {
          method: "PATCH",
          body: { items: [args.item_data] },
          context: { operation: "catalog_item_edit" },
        }
      );

      logger.info("catalog_item_edit completed");
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error, "catalog_item_edit");
    }
  }
);

server.tool(
  "catalog_item_delete",
  "Delete a single catalog item.",
  {
    apiKey: z.string().optional().describe("Braze REST API key"),
    restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
    catalog_name: z.string().describe("Catalog name"),
    item_id: z.string().describe("Item ID to delete"),
  },
  async (args) => {
    try {
      logger.info("catalog_item_delete called", { catalogName: args.catalog_name, itemId: args.item_id });
      const apiKey = extractApiKey(args);
      const restEndpoint = extractRestEndpoint(args);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request<CatalogApiResponse>(
        `/catalogs/${encodeURIComponent(args.catalog_name)}/items/${encodeURIComponent(args.item_id)}`,
        {
          method: "DELETE",
          context: { operation: "catalog_item_delete" },
        }
      );

      logger.info("catalog_item_delete completed");
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error, "catalog_item_delete");
    }
  }
);
