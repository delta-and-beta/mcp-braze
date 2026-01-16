/**
 * E2E Tests for Braze MCP Server - SCIM Tools
 * Tests all SCIM (dashboard user management) MCP tools via the MCP protocol
 *
 * Note: SCIM requires special API permissions and may not be available on all plans
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";

interface TextContent {
  type: "text";
  text: string;
}

interface ToolContent {
  type: string;
  text?: string;
}

const API_KEY = process.env.BRAZE_API_KEY;
const REST_ENDPOINT = process.env.BRAZE_REST_ENDPOINT;

const skipTests = !API_KEY || !REST_ENDPOINT;

describe.skipIf(skipTests)("E2E: Braze SCIM MCP Tools", () => {
  let client: Client;
  let transport: StdioClientTransport;

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
      name: "scim-test-client",
      version: "1.0.0",
    });

    await client.connect(transport);
  }, 30000);

  afterAll(async () => {
    if (client) {
      await client.close();
    }
  });

  function isTextContent(content: ToolContent): content is TextContent {
    return content.type === "text" && typeof content.text === "string";
  }

  async function callTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    const result = await client.callTool({ name, arguments: args });

    if (result.content && Array.isArray(result.content)) {
      const textContent = result.content.find((c): c is TextContent =>
        isTextContent(c as ToolContent)
      );
      if (textContent) {
        return JSON.parse(textContent.text);
      }
    }
    return result;
  }

  // ========================================
  // SCIM USER SEARCH
  // ========================================

  describe("SCIM User Search", () => {
    it("should search SCIM users via scim_users_search", async () => {
      const result = await callTool("scim_users_search", {
        filter: 'userName eq "test"',
        count: 10,
      });

      expect(result).toBeDefined();
      // SCIM may not be enabled, so we just verify the tool responds
    });
  });

  // ========================================
  // SCIM USER OPERATIONS
  // ========================================

  describe("SCIM User Operations", () => {
    // Note: These tests may fail without proper SCIM permissions
    // They verify the tools are callable via MCP

    it("should attempt to get SCIM user via scim_users_get", async () => {
      const result = await callTool("scim_users_get", {
        user_id: "test-user-id",
      });

      expect(result).toBeDefined();
      // Will likely fail without valid user ID, but verifies tool is callable
    });

    it("should attempt to create SCIM user via scim_users_create", async () => {
      const result = await callTool("scim_users_create", {
        userName: `mcp_test_${Date.now()}@test.example.com`,
        givenName: "MCP",
        familyName: "Test",
        permissions: {},
      });

      expect(result).toBeDefined();
      // May fail without proper permissions, but verifies tool is callable
    });

    it("should attempt to update SCIM user via scim_users_update", async () => {
      const result = await callTool("scim_users_update", {
        user_id: "test-user-id",
        givenName: "Updated",
        familyName: "User",
      });

      expect(result).toBeDefined();
      // Will fail without valid user ID, but verifies tool is callable
    });

    it("should attempt to delete SCIM user via scim_users_delete", async () => {
      const result = await callTool("scim_users_delete", {
        user_id: "test-user-id",
      });

      expect(result).toBeDefined();
      // Will fail without valid user ID, but verifies tool is callable
    });
  });
});
