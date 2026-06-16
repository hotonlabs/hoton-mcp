import { z } from "zod";
import { AGENT_DEVICE } from "../config.js";
import { resolveRecipient, resolveReferrer } from "../resolvers.js";
import { buildBuyResult, ToolError, type PayToken } from "./shared.js";
import { requireWallet, type ToolDeps } from "./wallet.js";
import type { WalletAccount } from "../session.js";
import type { BulkRecipient, Product } from "../backendClient.js";

export const payTokenSchema = z.enum(["GRAM", "USDT"]);

/** Prompt referrer wins (resolved); else the session referrer. */
export async function effectiveReferrer(deps: ToolDeps, argReferrer?: string): Promise<string | undefined> {
  if (argReferrer && argReferrer.trim()) {
    const resolved = await resolveReferrer(deps.client, argReferrer);
    return resolved || undefined;
  }
  return deps.session.getReferrer() || undefined;
}

export function accountJson(w: WalletAccount): string { return JSON.stringify(w); }
export function deviceJson(): string { return JSON.stringify(AGENT_DEVICE); }

export async function resolveMany(deps: ToolDeps, usernames: string[], product: Product, months?: string): Promise<BulkRecipient[]> {
  if (usernames.length < 1 || usernames.length > 10) throw new ToolError("Choose between 1 and 10 recipients.");
  const resolved = await Promise.all(usernames.map((u) => resolveRecipient(deps.client, u, product, months)));
  return resolved.map((r) => ({ recipientId: r.recipientId, username: r.username, name: r.name }));
}

export async function handleBuyStars(
  args: { recipient: string; amount: number; payToken: PayToken; wallet?: WalletAccount; referrer?: string },
  deps: ToolDeps,
) {
  const wallet = requireWallet(deps, args.wallet);
  const rec = await resolveRecipient(deps.client, args.recipient, "stars");
  const referrer = await effectiveReferrer(deps, args.referrer);
  const resp = await deps.client.buyStars({
    account: accountJson(wallet),
    device: deviceJson(),
    receipientId: rec.recipientId,
    amount: String(args.amount),
    paymentMethod: args.payToken === "USDT" ? "usdt" : "ton",
    recipientUsername: rec.username,
    recipientName: rec.name,
    ...(referrer ? { referrer } : {}),
  });
  return buildBuyResult(resp, args.payToken, `${args.amount}★ → @${rec.username}`, deps.config.maxOrder);
}

export async function handleBuyStarsBulk(
  args: { recipients: string[]; amountEach: number; payToken: PayToken; wallet?: WalletAccount; referrer?: string },
  deps: ToolDeps,
) {
  const wallet = requireWallet(deps, args.wallet);
  const recipients = await resolveMany(deps, args.recipients, "stars");
  const referrer = await effectiveReferrer(deps, args.referrer);
  const resp = await deps.client.buyStarsBulk({
    account: accountJson(wallet),
    device: deviceJson(),
    amount: String(args.amountEach),
    paymentMethod: args.payToken === "USDT" ? "usdt" : "ton",
    recipients,
    ...(referrer ? { referrer } : {}),
  });
  const total = args.amountEach * recipients.length;
  const label = `${args.amountEach}★ × ${recipients.length} (${total}★ total)`;
  return buildBuyResult(resp, args.payToken, label, deps.config.maxOrder);
}

export function registerStarsTools(server: any, deps: ToolDeps, wrap: (fn: () => Promise<unknown>) => Promise<any>) {
  const referrerField = z.string().optional().describe("Referrer the user named (hoton.tg/<name>, short name, or wallet). Omit if none.");
  const walletField = z.object({ address: z.string(), publicKey: z.string().optional(), walletStateInit: z.string().optional(), chain: z.string().optional() }).optional().describe("Override wallet; omit to use the session wallet from hoton_use_wallet.");

  server.registerTool(
    "hoton_buy_stars",
    {
      title: "Buy Telegram Stars (single recipient)",
      description: "Build an order to send Stars to one Telegram user. Returns messages[] to sign with @ton/mcp. Extract a referrer from the user's prompt if they named one.",
      inputSchema: {
        recipient: z.string().describe("Telegram username, with or without @"),
        amount: z.number().int().min(1).describe("Number of stars (site min 50)"),
        payToken: payTokenSchema.describe("Pay with GRAM (TON) or USDT"),
        referrer: referrerField,
        wallet: walletField,
      },
    },
    async (args: any) => wrap(() => handleBuyStars(args, deps)),
  );

  server.registerTool(
    "hoton_buy_stars_bulk",
    {
      title: "Buy Telegram Stars for many recipients",
      description: "Build ONE order sending the same star amount to 1–10 Telegram users. Returns messages[] (one per recipient) to sign with @ton/mcp in a single transaction.",
      inputSchema: {
        recipients: z.array(z.string()).min(1).max(10).describe("1–10 Telegram usernames"),
        amountEach: z.number().int().min(1).describe("Stars sent to EACH recipient"),
        payToken: payTokenSchema,
        referrer: referrerField,
        wallet: walletField,
      },
    },
    async (args: any) => wrap(() => handleBuyStarsBulk(args, deps)),
  );
}
