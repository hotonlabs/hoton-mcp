import { describe, it, expect, vi } from "vitest";
import { handleBuyPremium, handleBuyPremiumBulk } from "./buyPremium.js";
import { createSession } from "../session.js";
import type { BackendClient } from "../backendClient.js";

const tx = { transaction: { validUntil: 9, messages: [{ address: "EQp", amount: "1000000000", payload: "b" }] }, historyId: "h" };

function makeDeps() {
  const session = createSession();
  session.setWallet({ address: "EQbuyer" });
  const client = {
    searchRecipient: vi.fn(async () => ({ ok: true, found: { recipient: "r1", name: "Alice" } })),
    buyPremium: vi.fn(async () => tx),
    buyPremiumBulk: vi.fn(async () => tx),
    resolveName: vi.fn(),
  } as unknown as BackendClient;
  return { client, session, config: { backendUrl: "http://x" } };
}

describe("handleBuyPremium", () => {
  it("passes months and resolves via the premium search", async () => {
    const d = makeDeps();
    await handleBuyPremium({ recipient: "@alice", months: "6", payToken: "GRAM" }, d);
    expect((d.client.searchRecipient as any).mock.calls[0]).toEqual(["premium", "alice", "6"]);
    expect((d.client.buyPremium as any).mock.calls[0][0].months).toBe("6");
  });
});

describe("handleBuyPremiumBulk", () => {
  it("resolves each with months and posts the recipients array", async () => {
    const d = makeDeps();
    await handleBuyPremiumBulk({ recipients: ["alice", "bob"], months: "12", payToken: "USDT" }, d);
    const body = (d.client.buyPremiumBulk as any).mock.calls[0][0];
    expect(body.months).toBe("12");
    expect(body.recipients).toHaveLength(2);
    expect(body.paymentMethod).toBe("usdt");
  });
});
