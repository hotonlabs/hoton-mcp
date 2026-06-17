import { describe, it, expect, vi } from "vitest";
import { handleBuyStars, handleBuyStarsBulk } from "./buyStars.js";
import { createSession } from "../session.js";
import { BackendError } from "../backendClient.js";
import type { BackendClient } from "../backendClient.js";

const tx = { transaction: { validUntil: 9, messages: [{ address: "EQp", amount: "1620000000", payload: "b" }] }, historyId: "h", purchaseId: "p" };

function makeDeps(over: Partial<BackendClient> = {}) {
  const session = createSession();
  session.setWallet({ address: "EQbuyer", publicKey: "pk", walletStateInit: "si" });
  const client = {
    searchRecipient: vi.fn(async () => ({ ok: true, found: { recipient: "r1", name: "Alice" } })),
    buyStars: vi.fn(async () => tx),
    buyStarsBulk: vi.fn(async () => tx),
    resolveName: vi.fn(),
    ...over,
  } as unknown as BackendClient;
  return { client, session, config: { backendUrl: "http://x" } };
}

describe("handleBuyStars", () => {
  it("resolves the username, sends account+device JSON and receipientId, returns a buy result", async () => {
    const d = makeDeps();
    const r = await handleBuyStars({ recipient: "@alice", amount: 100, payToken: "GRAM" }, d);
    const body = (d.client.buyStars as any).mock.calls[0][0];
    expect(body.receipientId).toBe("r1");
    expect(body.paymentMethod).toBe("ton");
    expect(JSON.parse(body.account).address).toBe("EQbuyer");
    expect(typeof body.device).toBe("string");
    expect(r.summary).toContain("GRAM");
    expect(r.historyId).toBe("h");
  });

  it("passes a prompt referrer (resolved) over the session one", async () => {
    const d = makeDeps({ resolveName: vi.fn(async () => ({ address: "EQjeri" })) });
    await handleBuyStars({ recipient: "alice", amount: 50, payToken: "GRAM", referrer: "hoton.tg/jeribond" }, d);
    expect((d.client.buyStars as any).mock.calls[0][0].referrer).toBe("EQjeri");
  });

  it("throws when no wallet is set", async () => {
    const d = makeDeps();
    d.session.setReferrer(null);
    const empty = { ...d, session: createSession() };
    await expect(handleBuyStars({ recipient: "alice", amount: 50, payToken: "GRAM" }, empty as any)).rejects.toThrow(/use_wallet/);
  });
});

describe("handleBuyStarsBulk", () => {
  it("resolves each recipient and posts a recipients array with recipientId", async () => {
    const d = makeDeps();
    await handleBuyStarsBulk({ recipients: ["@alice", "bob"], amountEach: 100, payToken: "USDT" }, d);
    const body = (d.client.buyStarsBulk as any).mock.calls[0][0];
    expect(body.recipients).toHaveLength(2);
    expect(body.recipients[0].recipientId).toBe("r1");
    expect(body.paymentMethod).toBe("usdt");
  });
  it("rejects more than 10 recipients before calling the backend", async () => {
    const d = makeDeps();
    const many = Array.from({ length: 11 }, (_, i) => `u${i}`);
    await expect(handleBuyStarsBulk({ recipients: many, amountEach: 50, payToken: "GRAM" }, d)).rejects.toThrow(/1 and 10/);
    expect(d.client.buyStarsBulk).not.toHaveBeenCalled();
  });
  it("returns a clear money-safe error when the bulk endpoint 404s", async () => {
    const d = makeDeps({ buyStarsBulk: vi.fn(async () => { throw new BackendError("Request failed (404)", 404); }) });
    await expect(handleBuyStarsBulk({ recipients: ["alice", "bob"], amountEach: 50, payToken: "GRAM" }, d))
      .rejects.toThrowError(/bulk purchases aren't available/i);
  });
});
