/**
 * E2E Tests for Braze MCP Server - User Tools
 * Tests all user-related MCP tools via the MCP protocol
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

const API_KEY = process.env.BRAZE_API_KEY;
const REST_ENDPOINT = process.env.BRAZE_REST_ENDPOINT;

const skipTests = !API_KEY || !REST_ENDPOINT;

describe.skipIf(skipTests)("E2E: Braze User MCP Tools", () => {
  let client: Client;
  let transport: StdioClientTransport;
  const testExternalId = `mcp_user_test_${Date.now()}`;
  const testExternalId2 = `mcp_user_test2_${Date.now()}`;
  const testAliasName = `alias_${Date.now()}`;
  const testAliasLabel = "mcp_e2e_test";

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
      name: "user-test-client",
      version: "1.0.0",
    });

    await client.connect(transport);
  }, 30000);

  afterAll(async () => {
    // Cleanup test users
    try {
      await callTool<BrazeSuccessResponse>("users_delete", {
        external_ids: [testExternalId, testExternalId2],
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
  // USER TRACKING
  // ========================================

  describe("User Tracking", () => {
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
  });

  // ========================================
  // USER ALIASES
  // ========================================

  describe("User Aliases", () => {
    it("should create user alias via users_alias_new", async () => {
      const result = await callTool<BrazeSuccessResponse>("users_alias_new", {
        user_aliases: [
          {
            external_id: testExternalId,
            alias_name: testAliasName,
            alias_label: testAliasLabel,
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it("should update user alias via users_alias_update", async () => {
      const result = await callTool<BrazeSuccessResponse>("users_alias_update", {
        alias_updates: [
          {
            alias_label: testAliasLabel,
            old_alias_name: testAliasName,
            new_alias_name: `${testAliasName}_updated`,
          },
        ],
      });

      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // USER IDENTIFICATION
  // ========================================

  describe("User Identification", () => {
    it("should create alias-only user for identify test", async () => {
      const result = await callTool<UsersTrackResponse>("users_track", {
        attributes: [
          {
            user_alias: {
              alias_name: `identify_test_${Date.now()}`,
              alias_label: "identify_test",
            },
            first_name: "IdentifyTest",
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it("should identify users via users_identify", async () => {
      const identifyAlias = `identify_alias_${Date.now()}`;

      // Create alias-only user first
      await callTool<UsersTrackResponse>("users_track", {
        attributes: [
          {
            user_alias: {
              alias_name: identifyAlias,
              alias_label: "identify_test",
            },
            first_name: "ToIdentify",
          },
        ],
      });

      // Small delay for eventual consistency
      await new Promise((resolve) => setTimeout(resolve, 500));

      const result = await callTool<BrazeSuccessResponse>("users_identify", {
        aliases_to_identify: [
          {
            external_id: testExternalId2,
            user_alias: {
              alias_name: identifyAlias,
              alias_label: "identify_test",
            },
          },
        ],
      });

      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // USER EXTERNAL ID MANAGEMENT
  // ========================================

  describe("External ID Management", () => {
    const renameTestId = `rename_test_${Date.now()}`;
    const newExternalId = `new_ext_${Date.now()}`;

    it("should create user for rename test", async () => {
      const result = await callTool<UsersTrackResponse>("users_track", {
        attributes: [
          {
            external_id: renameTestId,
            first_name: "RenameTest",
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it("should rename external ID via users_external_id_rename", async () => {
      const result = await callTool<BrazeSuccessResponse>("users_external_id_rename", {
        external_id_renames: [
          {
            current_external_id: renameTestId,
            new_external_id: newExternalId,
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it("should remove external ID via users_external_id_remove", async () => {
      const result = await callTool<BrazeSuccessResponse>("users_external_id_remove", {
        external_ids: [newExternalId],
      });

      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // USER EXPORT
  // ========================================

  describe("User Export", () => {
    it("should export user by ID via users_export", async () => {
      const result = await callTool<BrazeSuccessResponse>("users_export", {
        external_ids: [testExternalId],
        fields_to_export: ["external_id", "first_name", "email"],
      });

      expect(result.success).toBe(true);
    });

    it("should attempt segment export via users_export_segment", async () => {
      // Note: Requires valid segment_id - will fail but verifies tool is callable
      const result = await callTool<BrazeSuccessResponse>("users_export_segment", {
        segment_id: "test-segment-id",
        fields_to_export: ["external_id", "first_name"],
      });

      expect(result).toBeDefined();
    });

    it("should attempt control group export via users_export_control_group", async () => {
      // Note: Requires valid campaign_id - will fail but verifies tool is callable
      const result = await callTool<BrazeSuccessResponse>("users_export_control_group", {
        campaign_id: "test-campaign-id",
        fields_to_export: ["external_id", "first_name"],
      });

      expect(result).toBeDefined();
    });
  });

  // ========================================
  // USER MERGE
  // ========================================

  describe("User Merge", () => {
    const mergeUser1 = `merge_user1_${Date.now()}`;
    const mergeUser2 = `merge_user2_${Date.now()}`;

    it("should create users for merge test", async () => {
      const result1 = await callTool<UsersTrackResponse>("users_track", {
        attributes: [
          {
            external_id: mergeUser1,
            first_name: "MergeUser1",
          },
        ],
      });

      const result2 = await callTool<UsersTrackResponse>("users_track", {
        attributes: [
          {
            external_id: mergeUser2,
            first_name: "MergeUser2",
          },
        ],
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it("should merge users via users_merge", async () => {
      // Small delay for eventual consistency
      await new Promise((resolve) => setTimeout(resolve, 500));

      const result = await callTool<BrazeSuccessResponse>("users_merge", {
        merge_updates: [
          {
            identifier_to_merge: {
              external_id: mergeUser2,
            },
            identifier_to_keep: {
              external_id: mergeUser1,
            },
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it("should cleanup merged user", async () => {
      await callTool<BrazeSuccessResponse>("users_delete", {
        external_ids: [mergeUser1],
      });
    });
  });

  // ========================================
  // USER DELETE
  // ========================================

  describe("User Delete", () => {
    it("should delete users via users_delete", async () => {
      const result = await callTool<BrazeSuccessResponse>("users_delete", {
        external_ids: [testExternalId],
      });

      expect(result.success).toBe(true);
    });
  });
});
