import { describe, it, expect } from "vitest";
import { buildBuyResult, buildOrder, toContent, ToolError } from "./shared.js";
import { BackendError } from "../backendClient.js";
import type { BuyResponse } from "../backendClient.js";

const gramResp: BuyResponse = {
  transaction: { validUntil: 1718000000, messages: [{ address: "EQproxy", amount: "1620000000", payload: "b64" }] },
  historyId: "h1",
  purchaseId: "p1",
};

describe("buildBuyResult", () => {
  it("maps a GRAM response and computes the GRAM total", () => {
    const r = buildBuyResult(gramResp, "GRAM", "100★ → @alice");
    expect(r.payToken).toBe("GRAM");
    expect(r.price).toBe("1.62 GRAM");
    expect(r.summary).toBe("100★ → @alice  =  1.62 GRAM");
    expect(r.messages).toHaveLength(1);
    expect(r.historyId).toBe("h1");
    expect(r.purchaseId).toBe("p1");
    expect(r.validUntil).toBe(1718000000);
    expect(r.expectedAmount).toBe("1620000000");
  });

  it("sums multiple messages for a bulk GRAM total", () => {
    const bulk: BuyResponse = { transaction: { validUntil: 5, messages: [
      { address: "a", amount: "1000000000", payload: "x" },
      { address: "a", amount: "1000000000", payload: "x" },
    ] }, historyId: "h" };
    expect(buildBuyResult(bulk, "GRAM", "lbl").price).toBe("2 GRAM");
  });

  it("uses jettonProxy display for USDT", () => {
    const usdt: BuyResponse = { transaction: { validUntil: 5, messages: [{ address: "a", amount: "80000000", payload: "x" }] }, historyId: "h", jettonProxy: { totalJettonDisplay: "1.545" } };
    expect(buildBuyResult(usdt, "USDT", "lbl").price).toBe("1.545 USDT");
  });

  it("nulls purchaseId when the backend omitted it (no referrer)", () => {
    const noRef: BuyResponse = { transaction: gramResp.transaction, historyId: "h1" };
    expect(buildBuyResult(noRef, "GRAM", "lbl").purchaseId).toBeNull();
  });

  it("throws ToolError when the GRAM total exceeds maxOrder", () => {
    expect(() => buildBuyResult(gramResp, "GRAM", "lbl", 1)).toThrowError(ToolError);
  });

  it("throws ToolError when the backend response has no transaction", () => {
    expect(() => buildBuyResult({ error: "boom" }, "GRAM", "lbl")).toThrowError(ToolError);
  });

  it("caps on the exact total, not the truncated display value", () => {
    // 1.00005 GRAM displays as "1.0000" but must still exceed a cap of 1
    const resp: BuyResponse = { transaction: { validUntil: 5, messages: [{ address: "a", amount: "1000050000", payload: "x" }] }, historyId: "h" };
    expect(() => buildBuyResult(resp, "GRAM", "lbl", 1)).toThrowError(ToolError);
  });

  it("falls back to fragmentJettonDisplay for USDT when totalJettonDisplay is absent", () => {
    const usdt: BuyResponse = { transaction: { validUntil: 5, messages: [{ address: "a", amount: "80000000", payload: "x" }] }, historyId: "h", jettonProxy: { fragmentJettonDisplay: "2.5" } };
    expect(buildBuyResult(usdt, "USDT", "lbl").price).toBe("2.5 USDT");
  });
});

describe("toContent", () => {
  it("wraps an object as JSON text content", () => {
    const c = toContent({ a: 1 });
    expect(c.content[0].type).toBe("text");
    expect(JSON.parse(c.content[0].text)).toEqual({ a: 1 });
  });
});

describe("buildOrder", () => {
  it("returns the value on success", async () => {
    await expect(buildOrder(async () => 42, { bulk: false })).resolves.toBe(42);
  });
  it("passes a ToolError through unchanged", async () => {
    await expect(buildOrder(async () => { throw new ToolError("nope"); }, { bulk: false })).rejects.toThrowError("nope");
  });
  it("turns a bulk 404 into a clear, money-safe message", async () => {
    await expect(buildOrder(async () => { throw new BackendError("Request failed (404)", 404); }, { bulk: true }))
      .rejects.toThrowError(/bulk purchases aren't available[\s\S]*no funds moved/i);
  });
  it("turns any other backend error into a money-safe message", async () => {
    await expect(buildOrder(async () => { throw new BackendError("Invalid amount", 400); }, { bulk: false }))
      .rejects.toThrowError(/Invalid amount[\s\S]*no funds moved/i);
  });
});
