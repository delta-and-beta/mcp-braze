/**
 * E2E Tests for Braze MCP Server - Analytics and KPI Tools
 * Tests all analytics-related MCP tools via the MCP protocol
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";

interface ToolResponse {
  success: boolean;
  events?: string[];
  products?: string[];
  send_id?: string;
}

const API_KEY = process.env.BRAZE_API_KEY;
const REST_ENDPOINT = process.env.BRAZE_REST_ENDPOINT;

const skipTests = !API_KEY || !REST_ENDPOINT;

describe.skipIf(skipTests)("E2E: Braze Analytics MCP Tools", () => {
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
      name: "analytics-test-client",
      version: "1.0.0",
    });

    await client.connect(transport);
  }, 30000);

  afterAll(async () => {
    if (client) {
      await client.close();
    }
  });

  async function callTool(name: string, args: Record<string, unknown> = {}): Promise<ToolResponse> {
    const result = await client.callTool({ name, arguments: args });

    if (result.content && Array.isArray(result.content)) {
      const textContent = result.content.find((c) => c.type === "text");
      if (textContent && "text" in textContent) {
        return JSON.parse(textContent.text as string) as ToolResponse;
      }
    }
    return { success: false };
  }

  function expectSuccess(result: ToolResponse): void {
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  }

  // ========================================
  // KPI DATA
  // ========================================

  describe("KPI Data", () => {
    it("should get daily active users via kpi_dau", async () => {
      const result = await callTool("kpi_dau", { length: 7 });
      expectSuccess(result);
    });

    it("should get monthly active users via kpi_mau", async () => {
      const result = await callTool("kpi_mau", { length: 30 });
      expectSuccess(result);
    });

    it("should get new users via kpi_new_users", async () => {
      const result = await callTool("kpi_new_users", { length: 7 });
      expectSuccess(result);
    });

    it("should get uninstalls via kpi_uninstalls", async () => {
      const result = await callTool("kpi_uninstalls", { length: 7 });
      expectSuccess(result);
    });
  });

  // ========================================
  // SESSION ANALYTICS
  // ========================================

  describe("Session Analytics", () => {
    it("should get session analytics via sessions_analytics", async () => {
      const result = await callTool("sessions_analytics", { length: 7 });
      expectSuccess(result);
    });
  });

  // ========================================
  // EVENTS
  // ========================================

  describe("Events", () => {
    it("should list events via events_list", async () => {
      const result = await callTool("events_list", { page: 0 });
      expectSuccess(result);
    });

    it("should get event analytics via events_analytics", async () => {
      const listResult = await callTool("events_list", { page: 0 });
      const events = listResult.events;

      if (!events || events.length === 0) {
        console.log("Skipping: No events available for analytics test");
        return;
      }

      const result = await callTool("events_analytics", {
        event: events[0],
        length: 7,
      });
      expectSuccess(result);
    });
  });

  // ========================================
  // PURCHASES
  // ========================================

  describe("Purchases", () => {
    let testProductId: string | undefined;

    it("should list product IDs via purchases_products", async () => {
      const result = await callTool("purchases_products", { page: 0 });
      expectSuccess(result);

      if (result.products && result.products.length > 0) {
        testProductId = result.products[0];
      }
    });

    it("should get purchase quantity via purchases_quantity", async () => {
      if (!testProductId) {
        console.log("Skipping: No product available for quantity test");
        return;
      }

      const result = await callTool("purchases_quantity", {
        product_id: testProductId,
        length: 7,
      });
      expectSuccess(result);
    });

    it("should get purchase revenue via purchases_revenue", async () => {
      if (!testProductId) {
        console.log("Skipping: No product available for revenue test");
        return;
      }

      const result = await callTool("purchases_revenue", {
        product_id: testProductId,
        length: 7,
      });
      expectSuccess(result);
    });
  });

  // ========================================
  // SENDS ANALYTICS
  // ========================================

  describe("Sends Analytics", () => {
    it("should get sends analytics via sends_analytics", async () => {
      const sendIdResult = await callTool("send_id_create", {
        send_id: `mcp_analytics_test_${Date.now()}`,
      });

      if (!sendIdResult.send_id) {
        console.log("Skipping: Could not create send_id for analytics test");
        return;
      }

      const result = await callTool("sends_analytics", {
        send_id: sendIdResult.send_id,
      });

      expect(result).toBeDefined();
    });
  });
});
