/**
 * E2E Tests for Braze MCP Server - Campaign, Canvas, and Segment Tools
 * Tests campaign, canvas, segment, scheduling, and send ID MCP tools via the MCP protocol
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";

interface BrazeToolResult {
  success: boolean;
  campaigns?: Array<{ id: string }>;
  canvases?: Array<{ id: string }>;
  segments?: Array<{ id: string }>;
}

const API_KEY = process.env.BRAZE_API_KEY;
const REST_ENDPOINT = process.env.BRAZE_REST_ENDPOINT;

const skipTests = !API_KEY || !REST_ENDPOINT;

describe.skipIf(skipTests)("E2E: Braze Campaign & Canvas MCP Tools", () => {
  let client: Client;
  let transport: StdioClientTransport;
  let testCampaignId: string | null = null;
  let testCanvasId: string | null = null;

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
      name: "campaign-canvas-test-client",
      version: "1.0.0",
    });

    await client.connect(transport);
  }, 30000);

  afterAll(async () => {
    if (client) {
      await client.close();
    }
  });

  async function callTool(name: string, args: Record<string, unknown> = {}): Promise<BrazeToolResult> {
    const result = await client.callTool({ name, arguments: args });

    if (result.content && Array.isArray(result.content)) {
      const textContent = result.content.find((c) => c.type === "text");
      if (textContent && "text" in textContent) {
        return JSON.parse(textContent.text as string) as BrazeToolResult;
      }
    }
    return result as unknown as BrazeToolResult;
  }

  // ========================================
  // CAMPAIGN LISTING AND DETAILS
  // ========================================

  describe("Campaign Listing", () => {
    it("should list campaigns via campaigns_list", async () => {
      const result = await callTool("campaigns_list", {
        page: 0,
        include_archived: false,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      if (result.campaigns && result.campaigns.length > 0) {
        testCampaignId = result.campaigns[0].id;
      }
    });

    it("should get campaign details via campaigns_details", async () => {
      if (!testCampaignId) {
        console.log("Skipping: No campaign available for details test");
        return;
      }

      const result = await callTool("campaigns_details", {
        campaign_id: testCampaignId,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should get campaign analytics via campaigns_analytics", async () => {
      if (!testCampaignId) {
        console.log("Skipping: No campaign available for analytics test");
        return;
      }

      const result = await callTool("campaigns_analytics", {
        campaign_id: testCampaignId,
        length: 7,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // CANVAS LISTING AND DETAILS
  // ========================================

  describe("Canvas Listing", () => {
    it("should list canvases via canvas_list", async () => {
      const result = await callTool("canvas_list", {
        page: 0,
        include_archived: false,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      if (result.canvases && result.canvases.length > 0) {
        testCanvasId = result.canvases[0].id;
      }
    });

    it("should get canvas details via canvas_details", async () => {
      if (!testCanvasId) {
        console.log("Skipping: No canvas available for details test");
        return;
      }

      const result = await callTool("canvas_details", {
        canvas_id: testCanvasId,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should get canvas summary via canvas_summary", async () => {
      if (!testCanvasId) {
        console.log("Skipping: No canvas available for summary test");
        return;
      }

      const result = await callTool("canvas_summary", {
        canvas_id: testCanvasId,
        ending_at: new Date().toISOString(),
        length: 7,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should get canvas analytics via canvas_analytics", async () => {
      if (!testCanvasId) {
        console.log("Skipping: No canvas available for analytics test");
        return;
      }

      const result = await callTool("canvas_analytics", {
        canvas_id: testCanvasId,
        ending_at: new Date().toISOString(),
        length: 7,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // SEGMENTS
  // ========================================

  describe("Segments", () => {
    let testSegmentId: string | null = null;

    it("should list segments via segments_list", async () => {
      const result = await callTool("segments_list", {
        page: 0,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      if (result.segments && result.segments.length > 0) {
        testSegmentId = result.segments[0].id;
      }
    });

    it("should get segment details via segments_details", async () => {
      if (!testSegmentId) {
        console.log("Skipping: No segment available for details test");
        return;
      }

      const result = await callTool("segments_details", {
        segment_id: testSegmentId,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it("should get segment analytics via segments_analytics", async () => {
      if (!testSegmentId) {
        console.log("Skipping: No segment available for analytics test");
        return;
      }

      const result = await callTool("segments_analytics", {
        segment_id: testSegmentId,
        length: 7,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // SCHEDULING
  // ========================================

  describe("Scheduling", () => {
    it("should list scheduled broadcasts via scheduled_broadcasts_list", async () => {
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const result = await callTool("scheduled_broadcasts_list", {
        end_time: thirtyDaysFromNow,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe("Send ID", () => {
    it("should create send ID via send_id_create", async () => {
      const result = await callTool("send_id_create", {
        campaign_id: testCampaignId ?? undefined,
        send_id: `mcp_test_${Date.now()}`,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });
});
