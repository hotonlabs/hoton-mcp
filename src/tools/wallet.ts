import { z } from "zod";
import type { BackendClient } from "../backendClient.js";
import type { Session, WalletAccount } from "../session.js";
import type { Config } from "../config.js";
import { isValidTonAddress } from "../format.js";
import { resolveReferrer } from "../resolvers.js";
import { ToolError } from "./shared.js";

export interface ToolDeps { client: BackendClient; session: Session; config: Config }

export const walletAccountSchema = {
  address: z.string().describe("Wallet address (user-friendly EQ.../UQ... or raw 0:hex form)"),
  publicKey: z.string().optional().describe("Wallet public key (hex)"),
  walletStateInit: z.string().optional().describe("Base64 wallet state-init (from @ton/mcp wallet info)"),
  chain: z.string().optional().describe("Chain id, e.g. -239 for mainnet"),
};

export async function handleUseWallet(account: WalletAccount, deps: ToolDeps) {
  if (!account?.address || !isValidTonAddress(account.address)) {
    throw new ToolError("A valid wallet address is required. Get it from @ton/mcp (the agentic wallet).");
  }
  deps.session.setWallet(account);
  return { ok: true, address: account.address, note: "Wallet remembered for this session. Buy tools will use it." };
}

export async function handleUseReferrer(args: { referrer: string }, deps: ToolDeps) {
  const resolved = await resolveReferrer(deps.client, args.referrer);
  deps.session.setReferrer(resolved);
  return resolved
    ? { ok: true, referrer: resolved, note: "Referrer set for this session." }
    : { ok: true, referrer: null, note: "No referrer set (no link, house link, or unresolvable name)." };
}

/** Active wallet = explicit override, else session wallet. Throws if neither. */
export function requireWallet(deps: ToolDeps, override?: WalletAccount): WalletAccount {
  const w = override ?? deps.session.getWallet();
  if (!w) throw new ToolError("No wallet set. Call hoton_use_wallet first (get the account from @ton/mcp).");
  return w;
}

export function registerWalletTools(
  server: any,
  deps: ToolDeps,
  wrap: (fn: () => Promise<unknown>) => Promise<any>,
) {
  server.registerTool(
    "hoton_use_wallet",
    {
      title: "Remember the agent wallet for buying",
      description:
        "Store the agent's TON wallet identity (from @ton/mcp) for this session so buy tools can target it. Call this once before buying.",
      inputSchema: walletAccountSchema,
    },
    async (account: WalletAccount) => wrap(() => handleUseWallet(account, deps)),
  );

  server.registerTool(
    "hoton_use_referrer",
    {
      title: "Set the referrer for this session",
      description:
        "Set a referral link/short-name/wallet (e.g. 'hoton.tg/jeribond') so subsequent purchases credit that referrer 35% of the fee. Only set this if the user named a referrer. The house link (hoton.tg/hoton) or none means no commission.",
      inputSchema: { referrer: z.string().describe("hoton.tg/<name> link, a short name, or a wallet address") },
    },
    async (args: { referrer: string }) => wrap(() => handleUseReferrer(args, deps)),
  );
}
