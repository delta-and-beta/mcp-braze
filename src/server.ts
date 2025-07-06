import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { BrazeClient } from './braze/client.js';
import { createToolHandlers, toolDefinitions } from './handlers/tools.js';
import { createResourceHandlers } from './handlers/resources.js';
import { logger } from './utils/logger.js';
import { loadConfig } from './utils/config.js';

export class BrazeMcpServer {
  private server: Server;
  private client: BrazeClient;
  private toolHandlers: ReturnType<typeof createToolHandlers>;
  private resourceHandlers: ReturnType<typeof createResourceHandlers>;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-braze',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    const config = loadConfig();
    this.client = new BrazeClient(config);
    this.toolHandlers = createToolHandlers(this.client);
    this.resourceHandlers = createResourceHandlers(this.client);

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: toolDefinitions.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: {
            type: 'object',
            properties: tool.inputSchema.shape,
            required: Object.keys(tool.inputSchema.shape).filter(
              key => !tool.inputSchema.shape[key].isOptional()
            ),
          },
        })),
      };
    });

    // Call a tool
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      const handler = this.toolHandlers[name as keyof typeof this.toolHandlers];
      if (!handler) {
        throw new Error(`Unknown tool: ${name}`);
      }

      try {
        const result = await handler(args);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        logger.error(`Error in tool ${name}`, error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error.message || 'An error occurred',
                code: error.code || 'UNKNOWN_ERROR',
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });

    // List resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return await this.resourceHandlers.listResources();
    });

    // Read a resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      return await this.resourceHandlers.readResource(uri);
    });

    // Handle errors
    this.server.onerror = (error) => {
      logger.error('Server error:', error);
    };
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info('Braze MCP server started');
  }

  async stop(): Promise<void> {
    await this.client.close();
    await this.server.close();
    logger.info('Braze MCP server stopped');
  }
}