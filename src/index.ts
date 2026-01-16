#!/usr/bin/env node
/**
 * MCP Braze Server Entry Point
 * 92 tools across 11 categories
 */

import "dotenv/config";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { server } from "./server.js";
import { logger } from "./lib/logger.js";

// Import all tools to register them with the server
import "./tools/users.js";           // 8 tools
import "./tools/messaging.js";       // 6 tools
import "./tools/scheduling.js";      // 10 tools
import "./tools/exports.js";         // 24 tools
import "./tools/email.js";           // 7 tools
import "./tools/sms.js";             // 2 tools
import "./tools/subscriptions.js";   // 4 tools
import "./tools/templates.js";       // 8 tools
import "./tools/catalogs.js";        // 13 tools
import "./tools/preference-center.js"; // 5 tools
import "./tools/scim.js";            // 5 tools

async function main() {
  logger.info("Starting MCP Braze server with STDIO transport");

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("MCP Braze server connected and ready");
}

main().catch((error) => {
  logger.error("Failed to start MCP Braze server", error);
  process.exit(1);
});
