/**
 * E2E Tests for Braze MCP Server - Catalog Tools
 * Tests all catalog MCP tools via the MCP protocol
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";

// Response types for type-safe assertions
interface BrazeResponse {
  success: boolean;
}

interface CatalogListResponse extends BrazeResponse {
  catalogs: Array<{ name: string }>;
}

interface CatalogItemsListResponse extends BrazeResponse {
  items: Array<{ id: string }>;
}

const API_KEY = process.env.BRAZE_API_KEY;
const REST_ENDPOINT = process.env.BRAZE_REST_ENDPOINT;

const skipTests = !API_KEY || !REST_ENDPOINT;

describe.skipIf(skipTests)("E2E: Braze Catalog MCP Tools", () => {
  let client: Client;
  let transport: StdioClientTransport;
  const testCatalogName = `mcp_catalog_${Date.now()}`;
  let catalogCreated = false;
  const testItemId = `item_${Date.now()}`;

  beforeAll(async () => {
    if (!API_KEY || !REST_ENDPOINT) {
      throw new Error("BRAZE_API_KEY and BRAZE_REST_ENDPOINT must be set");
    }

    const serverPath = path.resolve(__dirname, "../../../dist/index.js");

    transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
      env: {
        ...process.env,
        BRAZE_API_KEY: API_KEY,
        BRAZE_REST_ENDPOINT: REST_ENDPOINT,
      },
    });

    client = new Client({
      name: "catalog-test-client",
      version: "1.0.0",
    });

    await client.connect(transport);
  }, 30000);

  afterAll(async () => {
    if (catalogCreated) {
      try {
        await callTool("catalogs_delete", { catalog_name: testCatalogName });
      } catch {
        // Ignore cleanup errors
      }
    }

    if (client) {
      await client.close();
    }
  });

  async function callTool<T = BrazeResponse>(
    name: string,
    args: Record<string, unknown> = {}
  ): Promise<T> {
    const result = await client.callTool({ name, arguments: args });

    if (result.content && Array.isArray(result.content)) {
      const textContent = result.content.find((c) => c.type === "text");
      if (textContent && "text" in textContent) {
        return JSON.parse(textContent.text as string) as T;
      }
    }
    return result as T;
  }

  describe("Catalog Management", () => {
    it("should list all catalogs via catalogs_list", async () => {
      const result = await callTool<CatalogListResponse>("catalogs_list");

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.catalogs).toBeDefined();
    });

    it("should create a new catalog via catalogs_create", async () => {
      const result = await callTool("catalogs_create", {
        catalogs: [
          {
            name: testCatalogName,
            description: "MCP E2E test catalog for comprehensive testing",
            fields: [
              { name: "id", type: "string" },
              { name: "name", type: "string" },
              { name: "price", type: "number" },
              { name: "description", type: "string" },
              { name: "in_stock", type: "boolean" },
            ],
          },
        ],
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      catalogCreated = true;
    });

    it("should list catalogs and find the created one", async () => {
      if (!catalogCreated) return;

      const result = await callTool<CatalogListResponse>("catalogs_list");

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.catalogs?.find((c) => c.name === testCatalogName)).toBeDefined();
    });
  });

  describe("Catalog Items (Bulk Operations)", () => {
    it("should list items in catalog via catalog_items_list", async () => {
      if (!catalogCreated) return;

      const result = await callTool("catalog_items_list", {
        catalog_name: testCatalogName,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should create multiple items via catalog_items_create", async () => {
      if (!catalogCreated) return;

      const result = await callTool("catalog_items_create", {
        catalog_name: testCatalogName,
        items: [
          {
            id: testItemId,
            name: "Test Product 1",
            price: 29.99,
            description: "A test product for MCP E2E testing",
            in_stock: true,
          },
          {
            id: `${testItemId}_2`,
            name: "Test Product 2",
            price: 49.99,
            description: "Another test product",
            in_stock: false,
          },
        ],
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should list items after creation", async () => {
      if (!catalogCreated) return;

      // Delay for Braze eventual consistency
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const result = await callTool<CatalogItemsListResponse>("catalog_items_list", {
        catalog_name: testCatalogName,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.items).toBeDefined();
    });

    it("should update multiple items via catalog_items_update", async () => {
      if (!catalogCreated) return;

      const result = await callTool("catalog_items_update", {
        catalog_name: testCatalogName,
        items: [
          {
            id: testItemId,
            name: "Test Product 1 - Updated",
            price: 34.99,
          },
        ],
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should patch multiple items via catalog_items_edit", async () => {
      if (!catalogCreated) return;

      const result = await callTool("catalog_items_edit", {
        catalog_name: testCatalogName,
        items: [
          {
            id: testItemId,
            in_stock: false,
          },
        ],
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should delete multiple items via catalog_items_delete", async () => {
      if (!catalogCreated) return;

      const result = await callTool("catalog_items_delete", {
        catalog_name: testCatalogName,
        items: [{ id: `${testItemId}_2` }],
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe("Catalog Item (Single Operations)", () => {
    const singleItemId = `single_item_${Date.now()}`;

    it("should create a single item via catalog_item_create", async () => {
      if (!catalogCreated) return;

      const result = await callTool("catalog_item_create", {
        catalog_name: testCatalogName,
        item_id: singleItemId,
        item_data: {
          name: "Single Item Test",
          price: 19.99,
          description: "Single item creation test",
          in_stock: true,
        },
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should get a single item via catalog_item_get", async () => {
      if (!catalogCreated) return;

      const result = await callTool("catalog_item_get", {
        catalog_name: testCatalogName,
        item_id: singleItemId,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should update a single item via catalog_item_update", async () => {
      if (!catalogCreated) return;

      const result = await callTool("catalog_item_update", {
        catalog_name: testCatalogName,
        item_id: singleItemId,
        item_data: {
          name: "Single Item Test - Updated",
          price: 24.99,
          description: "Updated description",
          in_stock: true,
        },
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should patch a single item via catalog_item_edit", async () => {
      if (!catalogCreated) return;

      const result = await callTool("catalog_item_edit", {
        catalog_name: testCatalogName,
        item_id: singleItemId,
        item_data: {
          price: 29.99,
          in_stock: false,
        },
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should retrieve patched item via catalog_item_get", async () => {
      if (!catalogCreated) return;

      const result = await callTool("catalog_item_get", {
        catalog_name: testCatalogName,
        item_id: singleItemId,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should delete a single item via catalog_item_delete", async () => {
      if (!catalogCreated) return;

      const result = await callTool("catalog_item_delete", {
        catalog_name: testCatalogName,
        item_id: singleItemId,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe("Catalog Cleanup", () => {
    it("should delete remaining test items via catalog_items_delete", async () => {
      if (!catalogCreated) return;

      const result = await callTool("catalog_items_delete", {
        catalog_name: testCatalogName,
        items: [{ id: testItemId }],
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should delete the test catalog via catalogs_delete", async () => {
      if (!catalogCreated) return;

      const result = await callTool("catalogs_delete", {
        catalog_name: testCatalogName,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      catalogCreated = false;
    });

    it("should verify catalog no longer exists", async () => {
      const result = await callTool<CatalogListResponse>("catalogs_list");

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.catalogs?.find((c) => c.name === testCatalogName)).toBeUndefined();
    });
  });
});
