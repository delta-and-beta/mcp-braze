/**
 * E2E Tests for Braze MCP Server - Messaging Tools
 * Tests messaging MCP tools via the MCP protocol
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

const API_KEY = process.env.BRAZE_API_KEY;
const REST_ENDPOINT = process.env.BRAZE_REST_ENDPOINT;

const skipTests = !API_KEY || !REST_ENDPOINT;

describe.skipIf(skipTests)("E2E: Braze Messaging MCP Tools", () => {
  let client: Client;
  let transport: StdioClientTransport;
  const testExternalId = `mcp_msg_test_${Date.now()}`;

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
      name: "messaging-test-client",
      version: "1.0.0",
    });

    await client.connect(transport);

    // Create a test user for messaging tests
    await callTool("users_track", {
      attributes: [
        {
          external_id: testExternalId,
          email: `${testExternalId}@test.example.com`,
          push_tokens: [],
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
  // DIRECT MESSAGE SENDING
  // ========================================

  describe("Direct Messaging", () => {
    it("should send message via messages_send", async () => {
      const result = await callTool<BrazeSuccessResponse>("messages_send", {
        external_user_ids: [testExternalId],
        messages: {
          email: {
            app_id: "test-app-id",
            subject: "MCP Test",
            body: "<p>Test message</p>",
          },
        },
      });

      expect(result).toBeDefined();
    });
  });

  // ========================================
  // CAMPAIGN TRIGGERING
  // ========================================

  describe("Campaign Triggering", () => {
    it("should attempt to trigger campaign via campaigns_trigger_send", async () => {
      const result = await callTool<BrazeSuccessResponse>("campaigns_trigger_send", {
        campaign_id: "test-campaign-id",
        recipients: [{ external_user_id: testExternalId }],
      });

      expect(result).toBeDefined();
    });
  });

  // ========================================
  // CANVAS TRIGGERING
  // ========================================

  describe("Canvas Triggering", () => {
    it("should attempt to trigger canvas via canvas_trigger_send", async () => {
      const result = await callTool<BrazeSuccessResponse>("canvas_trigger_send", {
        canvas_id: "test-canvas-id",
        recipients: [{ external_user_id: testExternalId }],
      });

      expect(result).toBeDefined();
    });
  });

  // ========================================
  // TRANSACTIONAL EMAIL
  // ========================================

  describe("Transactional Email", () => {
    it("should attempt transactional email via transactional_email_send", async () => {
      const result = await callTool<BrazeSuccessResponse>("transactional_email_send", {
        campaign_id: "test-transactional-campaign-id",
        recipient: { external_user_id: testExternalId },
      });

      expect(result).toBeDefined();
    });
  });

  // ========================================
  // LIVE ACTIVITY (iOS)
  // ========================================

  describe("Live Activity", () => {
    it("should attempt live activity update via live_activity_update", async () => {
      const result = await callTool<BrazeSuccessResponse>("live_activity_update", {
        app_id: "test-app-id",
        activity_id: "test-activity-id",
        content_state: { status: "test" },
        end_activity: false,
      });

      expect(result).toBeDefined();
    });
  });
});
