/**
 * E2E Tests for Braze MCP Server
 * Tests MCP tools via the MCP protocol
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import path from "path";

/** Response shape for Braze API success responses */
interface BrazeSuccessResponse {
  success: boolean;
  message?: string;
}

/** Response shape for users_track endpoint */
interface UsersTrackResponse extends BrazeSuccessResponse {
  attributes_processed?: number;
  events_processed?: number;
  purchases_processed?: number;
}

/** Response shape for template creation */
interface TemplateCreateResponse extends BrazeSuccessResponse {
  email_template_id?: string;
}

/** Response shape for content block creation */
interface ContentBlockCreateResponse extends BrazeSuccessResponse {
  content_block_id?: string;
}

const API_KEY = process.env.BRAZE_API_KEY;
const REST_ENDPOINT = process.env.BRAZE_REST_ENDPOINT;

const skipTests = !API_KEY || !REST_ENDPOINT;

/**
 * Returns a date range for the last N days in YYYY-MM-DD format.
 */
function getDateRange(daysBack: number): { startDate: string; endDate: string } {
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  return { startDate, endDate };
}

describe.skipIf(skipTests)("E2E: Braze MCP Tools", () => {
  let client: Client;
  let transport: StdioClientTransport;
  const testExternalId = `mcp_test_user_${Date.now()}`;

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
      name: "test-client",
      version: "1.0.0",
    });

    await client.connect(transport);
  }, 30000);

  afterAll(async () => {
    if (client) {
      await client.close();
    }
  });

  /**
   * Calls an MCP tool and parses the JSON response from text content.
   */
  async function callTool<T = unknown>(
    name: string,
    args: Record<string, unknown> = {}
  ): Promise<T> {
    const result = await client.callTool({ name, arguments: args });

    if (result.content && Array.isArray(result.content)) {
      const textContent = result.content.find(
        (c): c is TextContent => c.type === "text"
      );
      if (textContent) {
        return JSON.parse(textContent.text) as T;
      }
    }
    return result as T;
  }

  // ========================================
  // USER DATA TESTS
  // ========================================

  describe("User Data Tools", () => {
    it("should track user attributes via users_track", async () => {
      const result = await callTool<UsersTrackResponse>("users_track", {
        attributes: [
          {
            external_id: testExternalId,
            first_name: "MCP",
            last_name: "TestUser",
            email: `${testExternalId}@test.example.com`,
            custom_attribute_test: "mcp_e2e_test",
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.attributes_processed).toBe(1);
    });

    it("should track custom events via users_track", async () => {
      const result = await callTool<UsersTrackResponse>("users_track", {
        events: [
          {
            external_id: testExternalId,
            name: "mcp_test_event",
            time: new Date().toISOString(),
            properties: {
              test_property: "e2e_test",
              timestamp: Date.now(),
            },
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.events_processed).toBe(1);
    });

    it("should track purchases via users_track", async () => {
      const result = await callTool<UsersTrackResponse>("users_track", {
        purchases: [
          {
            external_id: testExternalId,
            product_id: "mcp_test_product",
            currency: "USD",
            price: 9.99,
            quantity: 1,
            time: new Date().toISOString(),
            properties: {
              test: true,
            },
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.purchases_processed).toBe(1);
    });

    it("should create user alias via users_alias_new", async () => {
      const result = await callTool<BrazeSuccessResponse>("users_alias_new", {
        user_aliases: [
          {
            external_id: testExternalId,
            alias_name: `alias_${testExternalId}`,
            alias_label: "mcp_test",
          },
        ],
      });

      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // EXPORT TESTS
  // ========================================

  describe("Export Tools", () => {
    it("should list campaigns via campaigns_list", async () => {
      const result = await callTool<BrazeSuccessResponse>("campaigns_list", {
        page: 0,
        include_archived: false,
      });

      expect(result.success).toBe(true);
    });

    it("should list segments via segments_list", async () => {
      const result = await callTool<BrazeSuccessResponse>("segments_list", {
        page: 0,
      });

      expect(result.success).toBe(true);
    });

    it("should get KPI DAU data via kpi_dau", async () => {
      const result = await callTool<BrazeSuccessResponse>("kpi_dau", {
        length: 7,
      });

      expect(result.success).toBe(true);
    });

    it("should get KPI MAU data via kpi_mau", async () => {
      const result = await callTool<BrazeSuccessResponse>("kpi_mau", {
        length: 30,
      });

      expect(result.success).toBe(true);
    });

    it("should list events via events_list", async () => {
      const result = await callTool<BrazeSuccessResponse>("events_list", {
        page: 0,
      });

      expect(result.success).toBe(true);
    });

    it("should list product IDs via purchases_products", async () => {
      const result = await callTool<BrazeSuccessResponse>("purchases_products", {
        page: 0,
      });

      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // EMAIL LIST TESTS
  // ========================================

  describe("Email Tools", () => {
    it("should query hard bounces via email_hard_bounces", async () => {
      const { startDate, endDate } = getDateRange(30);

      const result = await callTool<BrazeSuccessResponse>("email_hard_bounces", {
        start_date: startDate,
        end_date: endDate,
        limit: 10,
      });

      expect(result.success).toBe(true);
    });

    it("should query unsubscribes via email_unsubscribes", async () => {
      const { startDate, endDate } = getDateRange(30);

      const result = await callTool<BrazeSuccessResponse>("email_unsubscribes", {
        start_date: startDate,
        end_date: endDate,
        limit: 10,
      });

      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // TEMPLATE TESTS
  // ========================================

  describe("Template Tools", () => {
    const testTemplateName = `mcp_test_template_${Date.now()}`;
    const testContentBlockName = `mcp_test_block_${Date.now()}`;
    let emailTemplateId: string | undefined;
    let contentBlockId: string | undefined;

    it("should list email templates via email_templates_list", async () => {
      const result = await callTool<BrazeSuccessResponse>("email_templates_list", {
        limit: 10,
      });

      expect(result.success).toBe(true);
    });

    it("should create an email template via email_templates_create", async () => {
      const result = await callTool<TemplateCreateResponse>("email_templates_create", {
        template_name: testTemplateName,
        subject: "MCP E2E Test Subject",
        body: "<html><body><h1>MCP E2E Test</h1><p>This is a test template.</p></body></html>",
        plaintext_body: "MCP E2E Test - This is a test template.",
      });

      expect(result.success).toBe(true);
      emailTemplateId = result.email_template_id;
    });

    it("should get email template info via email_templates_info", async () => {
      if (!emailTemplateId) {
        expect.fail("Skipped: email template was not created in previous test");
      }

      const result = await callTool<BrazeSuccessResponse>("email_templates_info", {
        email_template_id: emailTemplateId,
      });

      expect(result.success).toBe(true);
    });

    it("should list content blocks via content_blocks_list", async () => {
      const result = await callTool<BrazeSuccessResponse>("content_blocks_list", {
        limit: 10,
      });

      expect(result.success).toBe(true);
    });

    it("should create a content block via content_blocks_create", async () => {
      const result = await callTool<ContentBlockCreateResponse>("content_blocks_create", {
        name: testContentBlockName,
        content_type: "html",
        content: "<div class='mcp-test'>MCP E2E Test Content Block</div>",
        state: "draft",
      });

      expect(result.success).toBe(true);
      contentBlockId = result.content_block_id;
    });

    it("should get content block info via content_blocks_info", async () => {
      if (!contentBlockId) {
        expect.fail("Skipped: content block was not created in previous test");
      }

      const result = await callTool<BrazeSuccessResponse>("content_blocks_info", {
        content_block_id: contentBlockId,
      });

      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // SUBSCRIPTION GROUP TESTS
  // ========================================

  describe("Subscription Tools", () => {
    it("should get user subscription status via subscription_user_status", async () => {
      const result = await callTool<BrazeSuccessResponse>("subscription_user_status", {
        external_id: testExternalId,
      });

      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // CATALOG TESTS
  // ========================================

  describe("Catalog Tools", () => {
    const testCatalogName = `mcp_test_catalog_${Date.now()}`;
    let catalogCreated = false;

    it("should list catalogs via catalogs_list", async () => {
      const result = await callTool<BrazeSuccessResponse>("catalogs_list", {});

      expect(result.success).toBe(true);
    });

    it("should create a test catalog via catalogs_create", async () => {
      try {
        const result = await callTool<BrazeSuccessResponse>("catalogs_create", {
          catalogs: [
            {
              name: testCatalogName,
              description: "MCP E2E test catalog",
              fields: [
                { name: "id", type: "string" },
                { name: "name", type: "string" },
                { name: "price", type: "number" },
              ],
            },
          ],
        });

        expect(result.success).toBe(true);
        catalogCreated = true;
      } catch {
        // Catalog creation may fail if feature not enabled in Braze account
        console.log("Catalog creation skipped: feature may not be enabled");
      }
    });

    it("should delete test catalog if created via catalogs_delete", async () => {
      if (!catalogCreated) {
        expect.fail("Skipped: catalog was not created in previous test");
      }

      const result = await callTool<BrazeSuccessResponse>("catalogs_delete", {
        catalog_name: testCatalogName,
      });

      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // CLEANUP
  // ========================================

  describe("Cleanup", () => {
    it("should delete test user via users_delete", async () => {
      const result = await callTool<BrazeSuccessResponse>("users_delete", {
        external_ids: [testExternalId],
      });

      expect(result.success).toBe(true);
    });
  });
});
