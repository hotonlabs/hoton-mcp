import { z } from "zod";
import { ToolError } from "./shared.js";
import type { ToolDeps } from "./wallet.js";
import { pollForSettledTx, type SettledTx } from "../chain.js";

type Poller = (opts: { wallet: string; expectedAmount?: string }) => Promise<SettledTx | null>;

export async function handleConfirm(
  args: { historyId: string; expectedAmount: string; purchaseId?: string; walletAddress?: string },
  deps: ToolDeps,
  poll: Poller = (o) => pollForSettledTx(o),
) {
  const buyerWallet = args.walletAddress || deps.session.getWallet()?.address;
  if (!buyerWallet) throw new ToolError("No wallet address: pass walletAddress or call hoton_use_wallet first.");

  // The settled on-chain transaction is the source of truth for delivery — find it.
  const settled = await poll({ wallet: buyerWallet, expectedAmount: args.expectedAmount });
  if (!settled) {
    return {
      ok: true,
      delivered: false,
      message: "Couldn't find the settled transaction on-chain yet. If you just signed, it may still be propagating — wait a few seconds and call hoton_confirm again. Your payment was likely sent; you can check the wallet link.",
      walletExplorer: `https://tonviewer.com/${buyerWallet}`,
    };
  }

  const tonviewerUrl = `https://tonviewer.com/transaction/${settled.txHashHex}`;

  // Delivery is proven on-chain. Recording history + referral is best-effort bookkeeping —
  // a lagging indexer must never make a delivered purchase look failed.
  let historyRecorded = false;
  let referralRecorded = false;
  try {
    await deps.client.confirmHistory(args.historyId, { buyerWallet, txHash: settled.txHashBase64 });
    historyRecorded = true;
  } catch { /* indexer lag — delivery already confirmed on-chain */ }
  if (args.purchaseId) {
    try {
      await deps.client.confirmReferral({ purchaseId: args.purchaseId, buyerWallet, txHash: settled.txHashBase64 });
      referralRecorded = true;
    } catch { /* best-effort */ }
  }

  return {
    ok: true,
    delivered: true,
    message: "✅ Paid and settled on-chain — the purchase is delivered.",
    txHash: settled.txHashHex,
    tonviewerUrl,
    historyRecorded,
    referralRecorded,
  };
}

export function registerConfirmTool(server: any, deps: ToolDeps, wrap: (fn: () => Promise<unknown>) => Promise<any>) {
  server.registerTool(
    "hoton_confirm",
    {
      title: "Confirm a purchase settled on-chain",
      description: "Call after @ton/mcp send_raw_transaction signs the order. I poll the TON chain for the settled transaction, return whether it's delivered + a tonviewer link, and record it in Hoton's history + referral. Pass `expectedAmount` from the buy result so I can pinpoint the exact transaction. The purchase settles on-chain when signed, so a failure here never means you should re-buy — just retry confirm.",
      inputSchema: {
        historyId: z.string().describe("historyId from the buy tool result"),
        expectedAmount: z.string().describe("expectedAmount (nanoton) from the buy result — used to find the exact transaction on-chain"),
        purchaseId: z.string().optional().describe("purchaseId from the buy result (only when a referrer was attached)"),
        walletAddress: z.string().optional().describe("Buyer wallet; defaults to the session wallet"),
      },
    },
    async (args: any) => wrap(() => handleConfirm(args, deps)),
  );
}
