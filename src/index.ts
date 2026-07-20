#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { extractAccessToken } from "./auth.js";
import { AmbienceAITools } from "./tools.js";
import dotenv from "dotenv";

// Load environment variables silently for MCP compatibility
// Temporarily suppress console output during dotenv loading
const originalConsoleLog = console.log;
console.log = () => {};
dotenv.config();
console.log = originalConsoleLog;

/**
 * Ambience AI MCP Server
 *
 * Provides AI generation tools through the Model Context Protocol:
 * - Image generation
 * - Video generation  
 * - Audio generation (speech & music)
 * - Credits management
 * - Library management
 */
class AmbienceAIMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "ambienceai-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(
      ListToolsRequestSchema,
      async (request, extra) => {
        const authToken = this.authenticate(extra);
        if (!authToken) {
          throw new Error(
            "Authentication required. Set the AMBIENCE_ACCESS_TOKEN environment variable to an Ambience AI API token. " +
              "Tokens are included with the Premium, Team, and Business plans: sign up at https://www.ambienceai.com/pricing, " +
              "then create a token in Settings. Setup guide: https://www.ambienceai.com/guides/connect-claude-mcp",
          );
        }

        const tools = new AmbienceAITools(authToken);

        return {
          tools: await tools.getTools(),
        };
      },
    );

    // Execute tools
    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request, extra) => {
        const authToken = this.authenticate(extra);
        if (!authToken) {
          throw new Error(
            "Authentication required. Set the AMBIENCE_ACCESS_TOKEN environment variable to an Ambience AI API token. " +
              "Tokens are included with the Premium, Team, and Business plans: sign up at https://www.ambienceai.com/pricing, " +
              "then create a token in Settings. Setup guide: https://www.ambienceai.com/guides/connect-claude-mcp",
          );
        }

        const tools = new AmbienceAITools(authToken);

        try {
          const result = await tools.executeTool(
            request.params.name,
            request.params.arguments || {},
          );
          return result;
        } catch (error) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Error executing ${request.params.name}: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          };
        }
      },
    );
  }

  private authenticate(extra: any): string | null {
    // Extract token from MCP request context
    // Token validation will be handled by the backend API
    return extractAccessToken(extra);
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error("Ambience AI MCP Server started");
    console.error(
      "Available tools: get_credits, generate_image, generate_video, generate_audio, get_library, get_creation_status",
    );
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.error("Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.error("Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});

// Bin entry point: start unconditionally. An import.meta.url guard here
// breaks symlinked launches (npx runs the bin through a symlink).
const server = new AmbienceAIMCPServer();
server.start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
