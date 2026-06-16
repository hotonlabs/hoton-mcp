import { describe, it, expect } from "vitest";
import { buildBuyResult, toContent, ToolError } from "./shared.js";
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
});

describe("toContent", () => {
  it("wraps an object as JSON text content", () => {
    const c = toContent({ a: 1 });
    expect(c.content[0].type).toBe("text");
    expect(JSON.parse(c.content[0].text)).toEqual({ a: 1 });
  });
});
