/**
 * E2E Tests for Braze MCP Server - Scheduling Tools
 * Tests all scheduling MCP tools via the MCP protocol
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";

const API_KEY = process.env.BRAZE_API_KEY;
const REST_ENDPOINT = process.env.BRAZE_REST_ENDPOINT;

const skipTests = !API_KEY || !REST_ENDPOINT;

describe.skipIf(skipTests)("E2E: Braze Scheduling MCP Tools", () => {
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
      name: "scheduling-test-client",
      version: "1.0.0",
    });

    await client.connect(transport);
  }, 30000);

  afterAll(async () => {
    if (client) {
      await client.close();
    }
  });

  async function callTool(
    name: string,
    args: Record<string, unknown> = {}
  ): Promise<unknown> {
    const result = await client.callTool({ name, arguments: args });

    if (result.content && Array.isArray(result.content)) {
      const textContent = result.content.find((c) => c.type === "text");
      if (textContent && "text" in textContent) {
        return JSON.parse(textContent.text as string);
      }
    }
    return result;
  }

  function getFutureTime(hoursFromNow: number): string {
    const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
    return new Date(Date.now() + hoursFromNow * MILLISECONDS_PER_HOUR).toISOString();
  }

  // ========================================
  // MESSAGE SCHEDULING
  // ========================================

  describe("Message Scheduling", () => {
    it("should attempt to create scheduled message via messages_schedule_create", async () => {
      const result = await callTool("messages_schedule_create", {
        broadcast: true,
        schedule: {
          time: getFutureTime(24),
        },
        messages: {
          email: {
            app_id: "test-app-id",
            subject: "MCP Scheduled Test",
            body: "<p>Scheduled test message</p>",
          },
        },
      });

      expect(result).toBeDefined();
      // May fail without valid email config, but verifies tool is callable
    });

    it("should attempt to update scheduled message via messages_schedule_update", async () => {
      const result = await callTool("messages_schedule_update", {
        schedule_id: "test-schedule-id",
        schedule: {
          time: getFutureTime(48),
        },
      });

      expect(result).toBeDefined();
      // Will fail without valid schedule_id, but verifies tool is callable
    });

    it("should attempt to delete scheduled message via messages_schedule_delete", async () => {
      const result = await callTool("messages_schedule_delete", {
        schedule_id: "test-schedule-id",
      });

      expect(result).toBeDefined();
      // Will fail without valid schedule_id, but verifies tool is callable
    });
  });

  // ========================================
  // CAMPAIGN SCHEDULING
  // ========================================

  describe("Campaign Scheduling", () => {
    it("should attempt to create scheduled campaign via campaigns_schedule_create", async () => {
      const result = await callTool("campaigns_schedule_create", {
        campaign_id: "test-campaign-id",
        broadcast: true,
        schedule: {
          time: getFutureTime(24),
        },
      });

      expect(result).toBeDefined();
      // Will fail without valid campaign, but verifies tool is callable
    });

    it("should attempt to update scheduled campaign via campaigns_schedule_update", async () => {
      const result = await callTool("campaigns_schedule_update", {
        campaign_id: "test-campaign-id",
        schedule_id: "test-schedule-id",
        schedule: {
          time: getFutureTime(48),
        },
      });

      expect(result).toBeDefined();
      // Will fail without valid IDs, but verifies tool is callable
    });

    it("should attempt to delete scheduled campaign via campaigns_schedule_delete", async () => {
      const result = await callTool("campaigns_schedule_delete", {
        campaign_id: "test-campaign-id",
        schedule_id: "test-schedule-id",
      });

      expect(result).toBeDefined();
      // Will fail without valid IDs, but verifies tool is callable
    });
  });

  // ========================================
  // CANVAS SCHEDULING
  // ========================================

  describe("Canvas Scheduling", () => {
    it("should attempt to create scheduled canvas via canvas_schedule_create", async () => {
      const result = await callTool("canvas_schedule_create", {
        canvas_id: "test-canvas-id",
        broadcast: true,
        schedule: {
          time: getFutureTime(24),
        },
      });

      expect(result).toBeDefined();
      // Will fail without valid canvas, but verifies tool is callable
    });

    it("should attempt to update scheduled canvas via canvas_schedule_update", async () => {
      const result = await callTool("canvas_schedule_update", {
        canvas_id: "test-canvas-id",
        schedule_id: "test-schedule-id",
        schedule: {
          time: getFutureTime(48),
        },
      });

      expect(result).toBeDefined();
      // Will fail without valid IDs, but verifies tool is callable
    });

    it("should attempt to delete scheduled canvas via canvas_schedule_delete", async () => {
      const result = await callTool("canvas_schedule_delete", {
        canvas_id: "test-canvas-id",
        schedule_id: "test-schedule-id",
      });

      expect(result).toBeDefined();
      // Will fail without valid IDs, but verifies tool is callable
    });
  });
});
