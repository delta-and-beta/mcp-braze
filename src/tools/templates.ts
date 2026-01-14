/**
 * Template Tools for Braze MCP Server
 * 8 tools for email templates and content blocks
 */

import { z } from "zod";
import { server, type SessionData } from "../server.js";
import { extractApiKey, extractRestEndpoint } from "../lib/auth.js";
import { BrazeClient } from "../lib/client.js";
import { formatErrorResponse } from "../lib/errors.js";
import { logger } from "../lib/logger.js";

const authSchema = z.object({
  apiKey: z.string().optional().describe("Braze REST API key"),
  restEndpoint: z.string().optional().describe("Braze REST endpoint URL"),
});

// ========================================
// EMAIL TEMPLATES
// ========================================

server.addTool({
  name: "email_templates_list",
  description: "List all email templates in the workspace.",
  parameters: authSchema.extend({
    modified_after: z.string().optional().describe("Filter by modified date (ISO 8601)"),
    modified_before: z.string().optional().describe("Filter by modified date (ISO 8601)"),
    limit: z.number().optional().describe("Max results (default 100)"),
    offset: z.number().optional(),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("email_templates_list called");
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/templates/email/list", {
        method: "GET",
        queryParams: {
          modified_after: args.modified_after,
          modified_before: args.modified_before,
          limit: args.limit,
          offset: args.offset,
        },
        context: { operation: "email_templates_list" },
      });

      logger.info("email_templates_list completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "email_templates_list" }), null, 2);
    }
  },
});

server.addTool({
  name: "email_templates_info",
  description: "Get details for a specific email template.",
  parameters: authSchema.extend({
    email_template_id: z.string().describe("Email template ID"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("email_templates_info called", { templateId: args.email_template_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/templates/email/info", {
        method: "GET",
        queryParams: { email_template_id: args.email_template_id },
        context: { operation: "email_templates_info" },
      });

      logger.info("email_templates_info completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "email_templates_info" }), null, 2);
    }
  },
});

server.addTool({
  name: "email_templates_create",
  description: "Create a new email template.",
  parameters: authSchema.extend({
    template_name: z.string().describe("Template name"),
    subject: z.string().describe("Email subject line"),
    body: z.string().describe("HTML body content"),
    plaintext_body: z.string().optional().describe("Plain text body"),
    preheader: z.string().optional().describe("Email preheader text"),
    tags: z.array(z.string()).optional().describe("Tags for organization"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("email_templates_create called", { name: args.template_name });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/templates/email/create", {
        body: {
          template_name: args.template_name,
          subject: args.subject,
          body: args.body,
          plaintext_body: args.plaintext_body,
          preheader: args.preheader,
          tags: args.tags,
        },
        context: { operation: "email_templates_create" },
      });

      logger.info("email_templates_create completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "email_templates_create" }), null, 2);
    }
  },
});

server.addTool({
  name: "email_templates_update",
  description: "Update an existing email template.",
  parameters: authSchema.extend({
    email_template_id: z.string().describe("Template ID to update"),
    template_name: z.string().optional().describe("New template name"),
    subject: z.string().optional().describe("New subject line"),
    body: z.string().optional().describe("New HTML body"),
    plaintext_body: z.string().optional().describe("New plain text body"),
    preheader: z.string().optional().describe("New preheader"),
    tags: z.array(z.string()).optional().describe("New tags"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("email_templates_update called", { templateId: args.email_template_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/templates/email/update", {
        body: {
          email_template_id: args.email_template_id,
          template_name: args.template_name,
          subject: args.subject,
          body: args.body,
          plaintext_body: args.plaintext_body,
          preheader: args.preheader,
          tags: args.tags,
        },
        context: { operation: "email_templates_update" },
      });

      logger.info("email_templates_update completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "email_templates_update" }), null, 2);
    }
  },
});

// ========================================
// CONTENT BLOCKS
// ========================================

server.addTool({
  name: "content_blocks_list",
  description: "List all content blocks in the workspace.",
  parameters: authSchema.extend({
    modified_after: z.string().optional().describe("Filter by modified date (ISO 8601)"),
    modified_before: z.string().optional().describe("Filter by modified date (ISO 8601)"),
    limit: z.number().optional().describe("Max results (default 100)"),
    offset: z.number().optional(),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("content_blocks_list called");
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/content_blocks/list", {
        method: "GET",
        queryParams: {
          modified_after: args.modified_after,
          modified_before: args.modified_before,
          limit: args.limit,
          offset: args.offset,
        },
        context: { operation: "content_blocks_list" },
      });

      logger.info("content_blocks_list completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "content_blocks_list" }), null, 2);
    }
  },
});

server.addTool({
  name: "content_blocks_info",
  description: "Get details for a specific content block.",
  parameters: authSchema.extend({
    content_block_id: z.string().describe("Content block ID"),
    include_inclusion_data: z.boolean().optional().describe("Include campaigns/canvases using this block"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("content_blocks_info called", { blockId: args.content_block_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/content_blocks/info", {
        method: "GET",
        queryParams: {
          content_block_id: args.content_block_id,
          include_inclusion_data: args.include_inclusion_data,
        },
        context: { operation: "content_blocks_info" },
      });

      logger.info("content_blocks_info completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "content_blocks_info" }), null, 2);
    }
  },
});

server.addTool({
  name: "content_blocks_create",
  description: "Create a new content block.",
  parameters: authSchema.extend({
    name: z.string().describe("Content block name"),
    content_type: z.enum(["html", "text"]).optional().describe("Content type (default: html)"),
    content: z.string().describe("Content block HTML/text content"),
    state: z.enum(["active", "draft"]).optional().describe("Initial state"),
    tags: z.array(z.string()).optional().describe("Tags for organization"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("content_blocks_create called", { name: args.name });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/content_blocks/create", {
        body: {
          name: args.name,
          content_type: args.content_type,
          content: args.content,
          state: args.state,
          tags: args.tags,
        },
        context: { operation: "content_blocks_create" },
      });

      logger.info("content_blocks_create completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "content_blocks_create" }), null, 2);
    }
  },
});

server.addTool({
  name: "content_blocks_update",
  description: "Update an existing content block.",
  parameters: authSchema.extend({
    content_block_id: z.string().describe("Content block ID to update"),
    name: z.string().optional().describe("New name"),
    content: z.string().optional().describe("New content"),
    state: z.enum(["active", "draft"]).optional().describe("New state"),
    tags: z.array(z.string()).optional().describe("New tags"),
  }),
  execute: async (args, context: { session?: SessionData }) => {
    try {
      logger.info("content_blocks_update called", { blockId: args.content_block_id });
      const apiKey = extractApiKey(args, context);
      const restEndpoint = extractRestEndpoint(args, context);
      const client = new BrazeClient({ apiKey, restEndpoint });

      const result = await client.request("/content_blocks/update", {
        body: {
          content_block_id: args.content_block_id,
          name: args.name,
          content: args.content,
          state: args.state,
          tags: args.tags,
        },
        context: { operation: "content_blocks_update" },
      });

      logger.info("content_blocks_update completed");
      return JSON.stringify({ success: true, ...(result as object) }, null, 2);
    } catch (error) {
      return JSON.stringify(formatErrorResponse(error, { tool: "content_blocks_update" }), null, 2);
    }
  },
});
