import { z } from "zod";
import { resolveRecipient } from "../resolvers.js";
import { buildBuyResult, buildOrder, type PayToken } from "./shared.js";
import { requireWallet, type ToolDeps } from "./wallet.js";
import { accountJson, deviceJson, effectiveReferrer, payTokenSchema, resolveMany } from "./buyStars.js";
import type { WalletAccount } from "../session.js";

const monthsSchema = z.enum(["3", "6", "12"]);
const monthLabel = (m: string) => (m === "12" ? "1 year" : `${m} months`);

export async function handleBuyPremium(
  args: { recipient: string; months: "3" | "6" | "12"; payToken: PayToken; wallet?: WalletAccount; referrer?: string },
  deps: ToolDeps,
) {
  return buildOrder(async () => {
    const wallet = requireWallet(deps, args.wallet);
    const rec = await resolveRecipient(deps.client, args.recipient, "premium", args.months);
    const referrer = await effectiveReferrer(deps, args.referrer);
    const resp = await deps.client.buyPremium({
      account: accountJson(wallet),
      device: deviceJson(),
      receipientId: rec.recipientId,
      months: args.months,
      paymentMethod: args.payToken === "USDT" ? "usdt" : "ton",
      recipientUsername: rec.username,
      recipientName: rec.name,
      ...(referrer ? { referrer } : {}),
    });
    return buildBuyResult(resp, args.payToken, `Premium ${monthLabel(args.months)} → @${rec.username}`, deps.config.maxOrder);
  }, { bulk: false });
}

export async function handleBuyPremiumBulk(
  args: { recipients: string[]; months: "3" | "6" | "12"; payToken: PayToken; wallet?: WalletAccount; referrer?: string },
  deps: ToolDeps,
) {
  return buildOrder(async () => {
    const wallet = requireWallet(deps, args.wallet);
    const recipients = await resolveMany(deps, args.recipients, "premium", args.months);
    const referrer = await effectiveReferrer(deps, args.referrer);
    const resp = await deps.client.buyPremiumBulk({
      account: accountJson(wallet),
      device: deviceJson(),
      months: args.months,
      paymentMethod: args.payToken === "USDT" ? "usdt" : "ton",
      recipients,
      ...(referrer ? { referrer } : {}),
    });
    return buildBuyResult(resp, args.payToken, `Premium ${monthLabel(args.months)} × ${recipients.length}`, deps.config.maxOrder);
  }, { bulk: true });
}

export function registerPremiumTools(server: any, deps: ToolDeps, wrap: (fn: () => Promise<unknown>) => Promise<any>) {
  const referrerField = z.string().optional().describe("Referrer the user named (hoton.tg/<name>, short name, or wallet). Omit if none.");
  const walletField = z
    .object({
      address: z.string(),
      publicKey: z.string().optional(),
      walletStateInit: z.string().optional(),
      chain: z.string().optional(),
    })
    .optional();

  server.registerTool(
    "hoton_buy_premium",
    {
      title: "Gift Telegram Premium (single recipient)",
      description:
        "Build an order to gift Telegram Premium (3, 6 or 12 months) to one user. Returns messages[] to sign with @ton/mcp.",
      inputSchema: { recipient: z.string(), months: monthsSchema, payToken: payTokenSchema, referrer: referrerField, wallet: walletField },
    },
    async (args: any) => wrap(() => handleBuyPremium(args, deps)),
  );

  server.registerTool(
    "hoton_buy_premium_bulk",
    {
      title: "Gift Telegram Premium to many recipients",
      description:
        "Build ONE order gifting the same Premium duration to 1–10 users. Returns messages[] (one per recipient) to sign with @ton/mcp.",
      inputSchema: {
        recipients: z.array(z.string()).min(1).max(10),
        months: monthsSchema,
        payToken: payTokenSchema,
        referrer: referrerField,
        wallet: walletField,
      },
    },
    async (args: any) => wrap(() => handleBuyPremiumBulk(args, deps)),
  );
}
