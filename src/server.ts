/**
 * FastMCP Server Setup for Braze
 */

import { FastMCP } from "fastmcp";
import type { IncomingHttpHeaders } from "http";
import { logger } from "./lib/logger.js";

export interface SessionData {
  headers: IncomingHttpHeaders;
  [key: string]: unknown;
}

export const server = new FastMCP<SessionData>({
  name: "mcp-braze",
  version: "1.0.0",
  authenticate: async (request): Promise<SessionData> => {
    logger.info("New session authenticated");
    return {
      headers: request.headers,
    };
  },
});

logger.info("MCP Braze server initialized");
