import { describe, it, expect, vi } from "vitest";
import { handleFindRecipient } from "./findRecipient.js";
import type { BackendClient } from "../backendClient.js";

function deps(found: unknown) {
  const client = { searchRecipient: vi.fn(async () => ({ ok: true, found })) } as unknown as BackendClient;
  return { d: { client, session: {} as any, config: {} as any }, client };
}

describe("handleFindRecipient", () => {
  it("returns a normalized recipient", async () => {
    const { d } = deps({ recipient: "r1", name: "Alice", photo: "<img>" });
    const r = await handleFindRecipient({ username: "@alice", product: "stars" }, d);
    expect(r).toMatchObject({ found: true, recipientId: "r1", name: "Alice", username: "alice" });
  });
  it("reports not-found cleanly (no throw) with the explanatory message", async () => {
    const { d } = deps(null);
    const r = await handleFindRecipient({ username: "ghost", product: "stars" }, d);
    expect(r.found).toBe(false);
    expect(r.message).toContain("personal Telegram account");
  });
});
