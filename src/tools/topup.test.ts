import { describe, it, expect, vi } from "vitest";
import { handleTopupTon, handleTopupTonBulk } from "./topup.js";
import { createSession } from "../session.js";
import type { BackendClient } from "../backendClient.js";

const tx = { transaction: { validUntil: 9, messages: [{ address: "EQp", amount: "1500000000", payload: "b" }] }, historyId: "h" };

function makeDeps() {
  const session = createSession();
  session.setWallet({ address: "EQbuyer" });
  const client = {
    searchRecipient: vi.fn(async () => ({ ok: true, found: { recipient: "r1", name: "Alice" } })),
    topupTon: vi.fn(async () => tx),
    topupTonBulk: vi.fn(async () => tx),
    resolveName: vi.fn(),
  } as unknown as BackendClient;
  return { client, session, config: { backendUrl: "http://x" } };
}

describe("handleTopupTon", () => {
  it("resolves via ton search and sends a string amount", async () => {
    const d = makeDeps();
    const r = await handleTopupTon({ recipient: "@alice", amount: "1.5" }, d);
    expect((d.client.searchRecipient as any).mock.calls[0][0]).toBe("ton");
    expect((d.client.topupTon as any).mock.calls[0][0].amount).toBe("1.5");
    expect(r.price).toContain("GRAM");
  });
  it("rejects a non-numeric amount", async () => {
    await expect(handleTopupTon({ recipient: "alice", amount: "lots" }, makeDeps())).rejects.toThrow(/amount/i);
  });
});

describe("handleTopupTonBulk", () => {
  it("posts a recipients array (GRAM only, no paymentMethod)", async () => {
    const d = makeDeps();
    await handleTopupTonBulk({ recipients: ["alice", "bob"], amountEach: "2" }, d);
    const body = (d.client.topupTonBulk as any).mock.calls[0][0];
    expect(body.recipients).toHaveLength(2);
    expect(body.paymentMethod).toBeUndefined();
  });
});
