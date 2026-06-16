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

describe("handleConfirm", () => {
  it("confirms history with the session wallet when address omitted", async () => {
    const d = makeDeps();
    await handleConfirm({ historyId: "h1", txHash: "TX" }, d);
    expect((d.client.confirmHistory as any).mock.calls[0]).toEqual(["h1", { buyerWallet: "EQbuyer", txHash: "TX" }]);
    expect(d.client.confirmReferral).not.toHaveBeenCalled();
  });

  it("also confirms referral when purchaseId is present", async () => {
    const d = makeDeps();
    await handleConfirm({ historyId: "h1", purchaseId: "p1", txHash: "TX", walletAddress: "EQother" }, d);
    expect((d.client.confirmReferral as any).mock.calls[0][0]).toEqual({ purchaseId: "p1", buyerWallet: "EQother", txHash: "TX" });
  });

  it("throws when no wallet address is available", async () => {
    const d = makeDeps();
    const empty = { ...d, session: createSession() };
    await expect(handleConfirm({ historyId: "h1", txHash: "TX" }, empty as any)).rejects.toThrow(/wallet/i);
  });
});
