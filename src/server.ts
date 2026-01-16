/**
 * MCP Server Setup for Braze using official SDK
 */

import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

interface PackageJson {
  name: string;
  version: string;
}

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as PackageJson;

export const server = new McpServer({
  name: pkg.name,
  version: pkg.version,
});
