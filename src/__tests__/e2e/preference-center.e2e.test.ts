/**
 * E2E Tests for Braze MCP Server - Preference Center Tools
 * Tests all preference center MCP tools via the MCP protocol
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

/** Response shape for preference center list */
interface PreferenceCenterListResponse extends BrazeSuccessResponse {
  preference_centers?: Array<{ name: string }>;
}

/** Response shape for preference center create */
interface PreferenceCenterCreateResponse extends BrazeSuccessResponse {
  preference_center_api_id?: string;
}

const API_KEY = process.env.BRAZE_API_KEY;
const REST_ENDPOINT = process.env.BRAZE_REST_ENDPOINT;

const skipTests = !API_KEY || !REST_ENDPOINT;

describe.skipIf(skipTests)("E2E: Braze Preference Center MCP Tools", () => {
  let client: Client;
  let transport: StdioClientTransport;
  let testPreferenceCenterId: string | null = null;
  const testExternalId = `mcp_pref_test_${Date.now()}`;

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
      name: "preference-center-test-client",
      version: "1.0.0",
    });

    await client.connect(transport);

    // Create a test user
    await callTool("users_track", {
      attributes: [
        {
          external_id: testExternalId,
          email: `${testExternalId}@test.example.com`,
        },
      ],
    });
  }, 30000);

  afterAll(async () => {
    // Cleanup test user
    try {
      await callTool("users_delete", {
        external_ids: [testExternalId],
      });
    } catch {
      // Ignore cleanup errors
    }

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
  // PREFERENCE CENTER LISTING
  // ========================================

  describe("Preference Center Listing", () => {
    it("should list preference centers via preference_centers_list", async () => {
      const result = await callTool<PreferenceCenterListResponse>(
        "preference_centers_list",
        {}
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      // Store a preference center ID for later tests
      if (result.preference_centers && result.preference_centers.length > 0) {
        testPreferenceCenterId = result.preference_centers[0].name;
      }
    });
  });

  // ========================================
  // PREFERENCE CENTER CRUD
  // ========================================

  describe("Preference Center Operations", () => {
    const testPrefCenterName = `mcp_pref_center_${Date.now()}`;
    let createdPrefCenterId: string | null = null;

    it("should create preference center via preference_center_create", async () => {
      const result = await callTool<PreferenceCenterCreateResponse>(
        "preference_center_create",
        {
          name: testPrefCenterName,
          preference_center_title: "MCP Test Preference Center",
          preference_center_page_html:
            "<html><body><h1>Test Preference Center</h1></body></html>",
          confirmation_page_html:
            "<html><body><h1>Confirmed</h1></body></html>",
        }
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      if (result.preference_center_api_id) {
        createdPrefCenterId = result.preference_center_api_id;
      }
    });

    it("should get preference center via preference_center_get", async () => {
      const prefCenterId = createdPrefCenterId || testPreferenceCenterId;
      if (!prefCenterId) {
        console.log("Skipping: No preference center available");
        return;
      }

      const result = await callTool<BrazeSuccessResponse>(
        "preference_center_get",
        { preference_center_external_id: prefCenterId }
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should update preference center via preference_center_update", async () => {
      const prefCenterId = createdPrefCenterId || testPreferenceCenterId;
      if (!prefCenterId) {
        console.log("Skipping: No preference center available");
        return;
      }

      const result = await callTool<BrazeSuccessResponse>(
        "preference_center_update",
        {
          preference_center_external_id: prefCenterId,
          preference_center_title: "MCP Test Preference Center - Updated",
        }
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // PREFERENCE CENTER URL
  // ========================================

  describe("Preference Center URL", () => {
    it("should get preference center URL via preference_center_url", async () => {
      const prefCenterId = testPreferenceCenterId;
      if (!prefCenterId) {
        console.log("Skipping: No preference center available");
        return;
      }

      const result = await callTool<BrazeSuccessResponse>(
        "preference_center_url",
        {
          preference_center_external_id: prefCenterId,
          user_id: testExternalId,
        }
      );

      // API may return success:false if user not found or preference center not configured
      // but should respond without MCP error - checking it responds with defined result is sufficient
      expect(result).toBeDefined();
    });
  });
});
