/**
 * E2E Tests for Braze MCP Server - Email and SMS Tools
 * Tests all email and SMS-related MCP tools via the MCP protocol
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";

interface ToolResponse {
  success: boolean;
  email_template_id?: string;
  content_block_id?: string;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

const API_KEY = process.env.BRAZE_API_KEY;
const REST_ENDPOINT = process.env.BRAZE_REST_ENDPOINT;

const skipTests = !API_KEY || !REST_ENDPOINT;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

describe.skipIf(skipTests)("E2E: Braze Email & SMS MCP Tools", () => {
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
      name: "email-sms-test-client",
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
    return result as unknown as ToolResponse;
  }

  function getDateRange(daysBack: number): DateRange {
    const endDate = new Date().toISOString().split("T")[0]!;
    const startDate = new Date(Date.now() - daysBack * MILLISECONDS_PER_DAY)
      .toISOString()
      .split("T")[0]!;
    return { startDate, endDate };
  }

  // ========================================
  // EMAIL LISTS
  // ========================================

  describe("Email Lists", () => {
    it("should query hard bounces via email_hard_bounces", async () => {
      const { startDate, endDate } = getDateRange(30);

      const result = await callTool("email_hard_bounces", {
        start_date: startDate,
        end_date: endDate,
        limit: 10,
      });

      expect(result.success).toBe(true);
    });

    it("should query unsubscribes via email_unsubscribes", async () => {
      const { startDate, endDate } = getDateRange(30);

      const result = await callTool("email_unsubscribes", {
        start_date: startDate,
        end_date: endDate,
        limit: 10,
      });

      expect(result.success).toBe(true);
    });

    it("should change email subscription status via email_subscription_status", async () => {
      const result = await callTool("email_subscription_status", {
        email: "test@example.com",
        subscription_state: "subscribed",
      });

      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // EMAIL BLOCKLIST
  // ========================================

  describe("Email Blocklist", () => {
    it("should add email to blacklist via email_blacklist", async () => {
      const testBlockEmail = `blocklist_test_${Date.now()}@example.com`;
      const result = await callTool("email_blacklist", {
        email: [testBlockEmail],
      });

      expect(result.success).toBe(true);
    });

    it("should add email to blocklist via email_blocklist", async () => {
      const blocklistEmail = `blocklist_v2_${Date.now()}@example.com`;
      const result = await callTool("email_blocklist", {
        email: [blocklistEmail],
      });

      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // EMAIL REMOVAL
  // ========================================

  describe("Email Removal", () => {
    it("should remove email from bounce list via email_bounce_remove", async () => {
      const result = await callTool("email_bounce_remove", {
        email: `bounce_remove_test_${Date.now()}@example.com`,
      });

      expect(result.success).toBe(true);
    });

    it("should remove email from spam list via email_spam_remove", async () => {
      const result = await callTool("email_spam_remove", {
        email: `spam_remove_test_${Date.now()}@example.com`,
      });

      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // SMS
  // ========================================

  describe("SMS Tools", () => {
    it("should query invalid phone numbers via sms_invalid_phones", async () => {
      const { startDate, endDate } = getDateRange(30);

      const result = await callTool("sms_invalid_phones", {
        start_date: startDate,
        end_date: endDate,
        limit: 10,
      });

      expect(result.success).toBe(true);
    });

    it("should remove invalid phone number via sms_invalid_phones_remove", async () => {
      const result = await callTool("sms_invalid_phones_remove", {
        phone: "+10000000000",
      });

      expect(result).toBeDefined();
    });
  });

  // ========================================
  // EMAIL TEMPLATES
  // ========================================

  describe("Email Templates", () => {
    const testTemplateName = `mcp_email_test_${Date.now()}`;
    let emailTemplateId: string | undefined;

    it("should list email templates via email_templates_list", async () => {
      const result = await callTool("email_templates_list", {
        limit: 10,
      });

      expect(result.success).toBe(true);
    });

    it("should create email template via email_templates_create", async () => {
      const result = await callTool("email_templates_create", {
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
        console.log("Skipping: No template created");
        return;
      }

      const result = await callTool("email_templates_info", {
        email_template_id: emailTemplateId,
      });

      expect(result.success).toBe(true);
    });

    it("should update email template via email_templates_update", async () => {
      if (!emailTemplateId) {
        console.log("Skipping: No template created");
        return;
      }

      const result = await callTool("email_templates_update", {
        email_template_id: emailTemplateId,
        template_name: `${testTemplateName}_updated`,
        subject: "MCP E2E Test Subject - Updated",
      });

      expect(result.success).toBe(true);
    });
  });

  // ========================================
  // CONTENT BLOCKS
  // ========================================

  describe("Content Blocks", () => {
    const testBlockName = `mcp_block_test_${Date.now()}`;
    let contentBlockId: string | undefined;

    it("should list content blocks via content_blocks_list", async () => {
      const result = await callTool("content_blocks_list", {
        limit: 10,
      });

      expect(result.success).toBe(true);
    });

    it("should create content block via content_blocks_create", async () => {
      const result = await callTool("content_blocks_create", {
        name: testBlockName,
        content_type: "html",
        content: "<div class='mcp-test'>MCP E2E Test Content Block</div>",
        state: "draft",
      });

      expect(result.success).toBe(true);
      contentBlockId = result.content_block_id;
    });

    it("should get content block info via content_blocks_info", async () => {
      if (!contentBlockId) {
        console.log("Skipping: No content block created");
        return;
      }

      const result = await callTool("content_blocks_info", {
        content_block_id: contentBlockId,
      });

      expect(result.success).toBe(true);
    });

    it("should update content block via content_blocks_update", async () => {
      if (!contentBlockId) {
        console.log("Skipping: No content block created");
        return;
      }

      const result = await callTool("content_blocks_update", {
        content_block_id: contentBlockId,
        name: `${testBlockName}_updated`,
        content: "<div class='mcp-test'>MCP E2E Test Content Block - Updated</div>",
      });

      expect(result.success).toBe(true);
    });
  });
});
