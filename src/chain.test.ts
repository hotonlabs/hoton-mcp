import { describe, it, expect, vi } from "vitest";
import { pollForSettledTx } from "./chain.js";

function okRes(body: unknown) {
  return { ok: true, json: async () => body } as unknown as Response;
}

describe("pollForSettledTx", () => {
  it("returns the tx whose out_msg value matches expectedAmount (base64 + hex)", async () => {
    const hashB64 = Buffer.from("ab".repeat(32), "hex").toString("base64");
    const fetchFn = vi.fn(async () => okRes({ ok: true, result: [
      { transaction_id: { hash: "OTHER" }, out_msgs: [{ value: "999" }] },
      { transaction_id: { hash: hashB64 }, out_msgs: [{ value: "1620000000" }] },
    ] })) as unknown as typeof fetch;
    const r = await pollForSettledTx({ wallet: "EQw", expectedAmount: "1620000000", fetchFn, intervalMs: 1, timeoutMs: 50 });
    expect(r?.txHashBase64).toBe(hashB64);
    expect(r?.txHashHex).toBe("ab".repeat(32));
  });

  it("falls back to the most recent tx when no expectedAmount is given", async () => {
    const hashB64 = Buffer.from("cd".repeat(32), "hex").toString("base64");
    const fetchFn = vi.fn(async () => okRes({ ok: true, result: [{ transaction_id: { hash: hashB64 } }] })) as unknown as typeof fetch;
    const r = await pollForSettledTx({ wallet: "EQw", fetchFn, intervalMs: 1, timeoutMs: 50 });
    expect(r?.txHashHex).toBe("cd".repeat(32));
  });

  it("returns null on timeout when nothing matches expectedAmount", async () => {
    const fetchFn = vi.fn(async () => okRes({ ok: true, result: [{ transaction_id: { hash: "X" }, out_msgs: [{ value: "5" }] }] })) as unknown as typeof fetch;
    const r = await pollForSettledTx({ wallet: "EQw", expectedAmount: "1620000000", fetchFn, intervalMs: 5, timeoutMs: 20 });
    expect(r).toBeNull();
  });

  it("keeps polling through a network error then succeeds", async () => {
    const hashB64 = Buffer.from("ef".repeat(32), "hex").toString("base64");
    let call = 0;
    const fetchFn = vi.fn(async () => {
      call++;
      if (call === 1) throw new Error("network blip");
      return okRes({ ok: true, result: [{ transaction_id: { hash: hashB64 }, out_msgs: [{ value: "7" }] }] });
    }) as unknown as typeof fetch;
    const r = await pollForSettledTx({ wallet: "EQw", expectedAmount: "7", fetchFn, intervalMs: 1, timeoutMs: 50 });
    expect(r?.txHashHex).toBe("ef".repeat(32));
    expect(call).toBeGreaterThanOrEqual(2);
  });
});
