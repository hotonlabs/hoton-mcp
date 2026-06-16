import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolDeps } from "./tools/wallet.js";
import { registerWalletTools } from "./tools/wallet.js";
import { registerFindRecipientTool } from "./tools/findRecipient.js";
import { registerStarsTools } from "./tools/buyStars.js";
import { registerPremiumTools } from "./tools/buyPremium.js";
import { registerTopupTools } from "./tools/topup.js";
import { registerConfirmTool } from "./tools/confirm.js";
import { registerStatusTool } from "./tools/status.js";
import { toContent } from "./tools/shared.js";

export type WrapFn = (fn: () => Promise<unknown>) => Promise<any>;

export function makeWrap(): WrapFn {
  return async (fn) => {
    try {
      return toContent(await fn());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { content: [{ type: "text" as const, text: message }], isError: true };
    }
  };
}

/** Registers all tools on the given server. `server` is injectable for testing. */
export function buildServer(deps: ToolDeps, server: any = new McpServer({ name: "hoton-mcp", version: "0.1.0" })) {
  const wrap = makeWrap();
  registerWalletTools(server, deps, wrap);
  registerFindRecipientTool(server, deps, wrap);
  registerStarsTools(server, deps, wrap);
  registerPremiumTools(server, deps, wrap);
  registerTopupTools(server, deps, wrap);
  registerConfirmTool(server, deps, wrap);
  registerStatusTool(server, deps, wrap);
  return server;
}
