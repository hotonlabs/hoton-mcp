import { z } from "zod";
import { resolveRecipient } from "../resolvers.js";
import { buildBuyResult, ToolError } from "./shared.js";
import { requireWallet, type ToolDeps } from "./wallet.js";
import { accountJson, deviceJson, effectiveReferrer, resolveMany } from "./buyStars.js";
import type { WalletAccount } from "../session.js";

const amountSchema = z.string().regex(/^\d+(\.\d+)?$/, "Amount must be a number like 1.5");

function assertAmount(amount: string) {
  if (!/^\d+(\.\d+)?$/.test(amount) || parseFloat(amount) < 0.01) {
    throw new ToolError("Top-up amount must be a number of at least 0.01 GRAM.");
  }
}

export async function handleTopupTon(
  args: { recipient: string; amount: string; wallet?: WalletAccount; referrer?: string },
  deps: ToolDeps,
) {
  assertAmount(args.amount);
  const wallet = requireWallet(deps, args.wallet);
  const rec = await resolveRecipient(deps.client, args.recipient, "ton");
  const referrer = await effectiveReferrer(deps, args.referrer);
  const resp = await deps.client.topupTon({
    account: accountJson(wallet),
    device: deviceJson(),
    receipientId: rec.recipientId,
    amount: args.amount,
    recipientUsername: rec.username,
    recipientName: rec.name,
    ...(referrer ? { referrer } : {}),
  });
  return buildBuyResult(resp, "GRAM", `Top up ${args.amount} GRAM → @${rec.username}`, deps.config.maxOrder);
}

export async function handleTopupTonBulk(
  args: { recipients: string[]; amountEach: string; wallet?: WalletAccount; referrer?: string },
  deps: ToolDeps,
) {
  assertAmount(args.amountEach);
  const wallet = requireWallet(deps, args.wallet);
  const recipients = await resolveMany(deps, args.recipients, "ton");
  const referrer = await effectiveReferrer(deps, args.referrer);
  const resp = await deps.client.topupTonBulk({
    account: accountJson(wallet),
    device: deviceJson(),
    amount: args.amountEach,
    recipients,
    ...(referrer ? { referrer } : {}),
  });
  return buildBuyResult(resp, "GRAM", `Top up ${args.amountEach} GRAM × ${recipients.length}`, deps.config.maxOrder);
}

export function registerTopupTools(server: any, deps: ToolDeps, wrap: (fn: () => Promise<unknown>) => Promise<any>) {
  const referrerField = z.string().optional().describe("Referrer the user named. Omit if none.");
  const walletField = z
    .object({
      address: z.string(),
      publicKey: z.string().optional(),
      walletStateInit: z.string().optional(),
      chain: z.string().optional(),
    })
    .optional();

  server.registerTool(
    "hoton_topup_gram",
    {
      title: "Top up a Telegram account with GRAM",
      description:
        "Build an order to top up one Telegram account with GRAM. Returns messages[] to sign with @ton/mcp. GRAM only.",
      inputSchema: { recipient: z.string(), amount: amountSchema, referrer: referrerField, wallet: walletField },
    },
    async (args: any) => wrap(() => handleTopupTon(args, deps)),
  );

  server.registerTool(
    "hoton_topup_gram_bulk",
    {
      title: "Top up many Telegram accounts with GRAM",
      description:
        "Build ONE order topping up 1–10 Telegram accounts with the same GRAM amount each. Returns messages[] to sign with @ton/mcp. GRAM only.",
      inputSchema: {
        recipients: z.array(z.string()).min(1).max(10),
        amountEach: amountSchema,
        referrer: referrerField,
        wallet: walletField,
      },
    },
    async (args: any) => wrap(() => handleTopupTonBulk(args, deps)),
  );
}
