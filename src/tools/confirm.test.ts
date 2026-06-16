import { describe, it, expect, vi } from "vitest";
import { handleConfirm } from "./confirm.js";
import { createSession } from "../session.js";
import type { BackendClient } from "../backendClient.js";

function makeDeps() {
  const session = createSession();
  session.setWallet({ address: "EQbuyer" });
  const client = {
    confirmHistory: vi.fn(async () => ({ ok: true })),
    confirmReferral: vi.fn(async () => ({ confirmed: true })),
  } as unknown as BackendClient;
  return { client, session, config: { backendUrl: "http://x" } };
}
const settled = { txHashBase64: "B64HASH", txHashHex: "deadbeef" };

describe("handleConfirm", () => {
  it("polls, reports delivered + tonviewer link, records history with the base64 hash", async () => {
    const d = makeDeps();
    const poll = vi.fn(async () => settled);
    const r = await handleConfirm({ historyId: "h1", expectedAmount: "1620000000" }, d, poll);
    expect(poll).toHaveBeenCalledWith({ wallet: "EQbuyer", expectedAmount: "1620000000" });
    expect(r.delivered).toBe(true);
    expect(r.txHash).toBe("deadbeef");
    expect(r.tonviewerUrl).toContain("deadbeef");
    expect((d.client.confirmHistory as any).mock.calls[0]).toEqual(["h1", { buyerWallet: "EQbuyer", txHash: "B64HASH" }]);
    expect(r.historyRecorded).toBe(true);
    expect(d.client.confirmReferral).not.toHaveBeenCalled();
  });

  it("records the referral too when purchaseId is present", async () => {
    const d = makeDeps();
    const r = await handleConfirm({ historyId: "h1", purchaseId: "p1", expectedAmount: "1" }, d, async () => settled);
    expect((d.client.confirmReferral as any).mock.calls[0][0]).toEqual({ purchaseId: "p1", buyerWallet: "EQbuyer", txHash: "B64HASH" });
    expect(r.referralRecorded).toBe(true);
  });

  it("still reports delivered when the bookkeeping record fails (indexer lag)", async () => {
    const d = makeDeps();
    (d.client.confirmHistory as any).mockRejectedValueOnce(new Error("not verified"));
    const r = await handleConfirm({ historyId: "h1", expectedAmount: "1" }, d, async () => settled);
    expect(r.delivered).toBe(true);
    expect(r.historyRecorded).toBe(false);
  });

  it("reports not-delivered with a wallet explorer link when the tx isn't found", async () => {
    const d = makeDeps();
    const r = await handleConfirm({ historyId: "h1", expectedAmount: "1" }, d, async () => null);
    expect(r.delivered).toBe(false);
    expect(r.walletExplorer).toContain("EQbuyer");
    expect(d.client.confirmHistory).not.toHaveBeenCalled();
  });

  it("throws when no wallet address is available", async () => {
    const d = makeDeps();
    const empty = { ...d, session: createSession() };
    await expect(handleConfirm({ historyId: "h1", expectedAmount: "1" }, empty as any, async () => settled)).rejects.toThrow(/wallet/i);
  });
});
