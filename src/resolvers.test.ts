import { describe, it, expect, vi } from "vitest";
import { resolveRecipient, resolveReferrer } from "./resolvers.js";
import { BackendError, type BackendClient } from "./backendClient.js";

function fakeClient(over: Partial<BackendClient>): BackendClient {
  return { searchRecipient: vi.fn(), resolveName: vi.fn(), ...over } as unknown as BackendClient;
}

describe("resolveRecipient", () => {
  it("returns recipientId from found.recipient and strips a leading @", async () => {
    const client = fakeClient({ searchRecipient: vi.fn(async () => ({ ok: true, found: { recipient: "r1", name: "Alice" } })) });
    const r = await resolveRecipient(client, "@alice", "stars");
    expect(r).toEqual({ recipientId: "r1", name: "Alice", username: "alice" });
    expect(client.searchRecipient).toHaveBeenCalledWith("stars", "alice", undefined);
  });

  it("passes months through for premium", async () => {
    const client = fakeClient({ searchRecipient: vi.fn(async () => ({ ok: true, found: { recipient: "r2", name: "Bob" } })) });
    await resolveRecipient(client, "bob", "premium", "6");
    expect(client.searchRecipient).toHaveBeenCalledWith("premium", "bob", "6");
  });

  it("throws a friendly, explanatory ToolError when not found", async () => {
    const client = fakeClient({ searchRecipient: vi.fn(async () => ({ ok: false, found: null })) });
    await expect(resolveRecipient(client, "ghost", "stars")).rejects.toThrowError(/not found.*personal Telegram account/s);
  });
});

describe("resolveReferrer", () => {
  it("returns a raw address directly", async () => {
    const client = fakeClient({});
    const addr = "EQDjdH5yC8bAoykZak0udtgt_SNf9lXl0aQOqdz_yVDpXksy";
    await expect(resolveReferrer(client, addr)).resolves.toBe(addr);
  });

  it("resolves a hoton.tg/<name> link via the backend", async () => {
    const client = fakeClient({ resolveName: vi.fn(async () => ({ address: "EQjeri" })) });
    await expect(resolveReferrer(client, "hoton.tg/jeribond")).resolves.toBe("EQjeri");
    expect(client.resolveName).toHaveBeenCalledWith("jeribond");
  });

  it("returns null for empty input or an unresolvable name", async () => {
    expect(await resolveReferrer(fakeClient({}), "")).toBeNull();
    const client = fakeClient({ resolveName: vi.fn(async () => ({})) });
    expect(await resolveReferrer(client, "nobody")).toBeNull();
  });

  it("returns null (proceeds) when the name lookup 404s instead of failing the purchase", async () => {
    const client = fakeClient({ resolveName: vi.fn(async () => { throw new BackendError("Not found", 404); }) });
    await expect(resolveReferrer(client, "typoname")).resolves.toBeNull();
  });
});
