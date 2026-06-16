import { describe, it, expect, vi } from "vitest";
import { handleStatus } from "./status.js";
import { BackendError, type BackendClient } from "../backendClient.js";

describe("handleStatus", () => {
  it("reports healthy when /health returns ok", async () => {
    const client = { getHealth: vi.fn(async () => ({ ok: true })) } as unknown as BackendClient;
    const r = await handleStatus({ client, session: {} as any, config: {} as any });
    expect(r.healthy).toBe(true);
  });
  it("reports unhealthy and the reason when /health 503s", async () => {
    const client = { getHealth: vi.fn(async () => { throw new BackendError("Fragment session down", 503); }) } as unknown as BackendClient;
    const r = await handleStatus({ client, session: {} as any, config: {} as any });
    expect(r.healthy).toBe(false);
    expect(r.message).toContain("Fragment");
  });
});
