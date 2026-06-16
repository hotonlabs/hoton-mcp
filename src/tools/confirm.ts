import { z } from "zod";
import { ToolError } from "./shared.js";
import type { ToolDeps } from "./wallet.js";

export async function handleConfirm(
  args: { historyId: string; txHash: string; purchaseId?: string; walletAddress?: string },
  deps: ToolDeps,
) {
  const buyerWallet = args.walletAddress || deps.session.getWallet()?.address;
  if (!buyerWallet) throw new ToolError("No wallet address: pass walletAddress or call hoton_use_wallet first.");
  if (!args.txHash) throw new ToolError("txHash is required to confirm a purchase.");

  await deps.client.confirmHistory(args.historyId, { buyerWallet, txHash: args.txHash });
  let referralConfirmed = false;
  let referralError: string | undefined;
  if (args.purchaseId) {
    try {
      await deps.client.confirmReferral({ purchaseId: args.purchaseId, buyerWallet, txHash: args.txHash });
      referralConfirmed = true;
    } catch (err) {
      // Referral tracking is best-effort: the on-chain fee split already happened at
      // payment time, so a tracking failure here does not undo the referrer's reward.
      referralError = err instanceof Error ? err.message : String(err);
    }
  }
  return { ok: true, historyConfirmed: true, referralConfirmed, ...(referralError ? { referralError } : {}) };
}

export function registerConfirmTool(server: any, deps: ToolDeps, wrap: (fn: () => Promise<unknown>) => Promise<any>) {
  server.registerTool(
    "hoton_confirm",
    {
      title: "Confirm a completed purchase",
      description:
        "Call after @ton/mcp send_raw_transaction returns a txHash. Records the purchase in history and credits any referral. Use the historyId and purchaseId from the buy tool's result. The purchase already settled on-chain when it was signed, so this only records bookkeeping — a failure here never means you should buy again.",
      inputSchema: {
        historyId: z.string().describe("historyId from the buy tool result"),
        txHash: z.string().describe("Transaction hash from send_raw_transaction"),
        purchaseId: z.string().optional().describe("purchaseId from the buy result (only present when a referrer was attached)"),
        walletAddress: z.string().optional().describe("Buyer wallet; defaults to the session wallet"),
      },
    },
    async (args: any) => wrap(() => handleConfirm(args, deps)),
  );
}
