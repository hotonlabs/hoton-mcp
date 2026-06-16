import { BackendError } from "../backendClient.js";
import type { ToolDeps } from "./wallet.js";

export async function handleStatus(deps: ToolDeps) {
  try {
    const health = await deps.client.getHealth();
    return { healthy: health.ok === true, message: health.ok ? "Hoton is up." : (health.error || "Hoton is down.") };
  } catch (err) {
    const message = err instanceof BackendError ? err.message : "Hoton is unreachable.";
    return { healthy: false, message };
  }
}

export function registerStatusTool(server: any, deps: ToolDeps, wrap: (fn: () => Promise<unknown>) => Promise<any>) {
  server.registerTool(
    "hoton_status",
    {
      title: "Check if Hoton is online",
      description: "Returns whether Hoton/Fragment is healthy right now. Call before buying if unsure; if unhealthy, tell the user to try later instead of buying.",
      inputSchema: {},
    },
    async () => wrap(() => handleStatus(deps)),
  );
}
