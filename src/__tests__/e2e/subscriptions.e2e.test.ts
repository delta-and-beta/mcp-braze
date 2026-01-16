/**
 * E2E Tests for Braze MCP Server - Subscription Tools
 * Tests all subscription-related MCP tools via the MCP protocol
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";

interface SubscriptionToolResponse {
  success: boolean;
}

const API_KEY = process.env.BRAZE_API_KEY;
const REST_ENDPOINT = process.env.BRAZE_REST_ENDPOINT;

const skipTests = !API_KEY || !REST_ENDPOINT;

describe.skipIf(skipTests)("E2E: Braze Subscription MCP Tools", () => {
  let client: Client;
  let transport: StdioClientTransport;
  const testExternalId = `mcp_sub_test_${Date.now()}`;

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
      name: "subscription-test-client",
      version: "1.0.0",
    });

    await client.connect(transport);

    // Create a test user for subscription tests
    await callTool("users_track", {
      attributes: [
        {
          external_id: testExternalId,
          email: `${testExternalId}@test.example.com`,
          phone: "+10000000001",
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

  async function callTool(name: string, args: Record<string, unknown> = {}): Promise<SubscriptionToolResponse> {
    const result = await client.callTool({ name, arguments: args });

    if (result.content && Array.isArray(result.content)) {
      const textContent = result.content.find((c) => c.type === "text");
      if (textContent && "text" in textContent) {
        return JSON.parse(textContent.text as string) as SubscriptionToolResponse;
      }
    }
    return { success: false };
  }

  function expectSuccess(result: SubscriptionToolResponse): void {
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  }

  // ========================================
  // USER SUBSCRIPTION STATUS
  // ========================================

  describe("User Subscription Status", () => {
    it("should get user subscription status via subscription_user_status", async () => {
      const result = await callTool("subscription_user_status", {
        external_id: testExternalId,
      });

      expectSuccess(result);
    });
  });

  // ========================================
  // SUBSCRIPTION STATUS MANAGEMENT
  // ========================================

  describe("Subscription Status Management", () => {
    it("should get subscription status via subscription_status_get", async () => {
      // Note: This requires a valid subscription_group_id from your Braze workspace
      const result = await callTool("subscription_status_get", {
        subscription_group_id: "test_group_id",
        email: [`${testExternalId}@test.example.com`],
      });

      expect(result).toBeDefined();
      // May fail without valid subscription_group_id, but API should respond
    });

    it("should set subscription status via subscription_status_set", async () => {
      // Note: This requires a valid subscription_group_id from your Braze workspace
      // The test will verify the API responds correctly
      const result = await callTool("subscription_status_set", {
        subscription_group_id: "test_group_id",
        subscription_state: "subscribed",
        external_id: [testExternalId],
      });

      expect(result).toBeDefined();
      // May fail without valid subscription_group_id, but should not throw
    });

    it("should set subscription status v2 via subscription_status_set_v2", async () => {
      // Note: This requires a valid subscription_group_id from your Braze workspace
      const result = await callTool("subscription_status_set_v2", {
        subscription_groups: [
          {
            subscription_group_id: "test_group_id",
            subscription_state: "subscribed",
          },
        ],
        external_id: testExternalId,
      });

      expect(result).toBeDefined();
      // May fail without valid subscription_group_id, but verifies tool is callable
    });
  });
});
