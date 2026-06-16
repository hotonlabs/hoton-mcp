#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { createBackendClient } from "./backendClient.js";
import { createSession } from "./session.js";
import { buildServer } from "./server.js";

async function main() {
  const config = loadConfig();
  const deps = {
    config,
    client: createBackendClient(config.backendUrl),
    session: createSession(),
  };
  const server = buildServer(deps);
  await server.connect(new StdioServerTransport());
  // Never write to stdout — stdio transport owns it. Logs go to stderr.
  console.error(`hoton-mcp ready (backend: ${config.backendUrl})`);
}

main().catch((err) => {
  console.error("hoton-mcp failed to start:", err);
  process.exit(1);
});
