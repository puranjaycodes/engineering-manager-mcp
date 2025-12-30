// src/index.ts
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (go up from dist to root)
const envPath = path.resolve(__dirname, '..', '.env');
console.error(`Loading .env from: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.error('Successfully loaded .env file');
  console.error('Environment variables loaded:', Object.keys(result.parsed || {}).join(', '));
}

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Use .js extensions even though the source files are .ts
import { jiraTools, handleJiraTool } from './jira-handler.js';
import { slackTools, handleSlackTool } from './slack-handler.js';

const server = new Server(
  {
    name: 'engineering-manager-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List all available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [...jiraTools, ...slackTools],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Route to appropriate handler
  if (name.startsWith('jira_')) {
    return handleJiraTool(name, args);
  } else if (name.startsWith('slack_')) {
    return handleSlackTool(name, args);
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start the server
const transport = new StdioServerTransport();
server.connect(transport);
