#!/usr/bin/env node
/**
 * MCP Braze Server Entry Point
 * 90 tools across 11 categories
 */

import "dotenv/config";
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

// Start server based on transport type
const transport = process.env.MCP_TRANSPORT || "stdio";

if (transport === "stdio") {
  logger.info("Starting MCP Braze server with STDIO transport");
  server.start({
    transportType: "stdio",
  });
} else if (transport === "http") {
  const port = parseInt(process.env.PORT || "3000", 10);
  logger.info("Starting MCP Braze server with HTTP transport", { port });
  server.start({
    transportType: "httpStream",
    httpStream: { port, endpoint: "/mcp" },
  });
} else {
  logger.error("Unknown transport type", undefined, { transport });
  process.exit(1);
}
