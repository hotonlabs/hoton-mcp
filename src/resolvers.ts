import { BackendError, type BackendClient, type Product } from "./backendClient.js";
import { parseReferrerInput } from "./format.js";
import { ToolError } from "./tools/shared.js";

export interface ResolvedRecipient { recipientId: string; name: string; username: string }

/**
 * Friendly "couldn't find that recipient" message, shared by find_recipient and the
 * buy resolver so they never drift. The common gotcha (e.g. @durov) is that Stars/
 * Premium only go to a *personal* account, never a channel/bot/group.
 */
export function recipientNotFoundMessage(username: string): string {
  return `@${username} — not found. Stars & Premium can only be sent to a personal Telegram account — not channels, bots, or groups. Check the spelling, or try the person's personal @username.`;
}

export async function resolveRecipient(
  client: BackendClient,
  username: string,
  product: Product,
  months?: string,
): Promise<ResolvedRecipient> {
  const clean = username.trim().replace(/^@/, "");
  if (!clean) throw new ToolError("A Telegram username is required.");
  const res = await client.searchRecipient(product, clean, months);
  const id = res.found?.recipient;
  if (!res.ok || !res.found || !id) {
    throw new ToolError(recipientNotFoundMessage(clean));
  }
  return { recipientId: id, name: res.found.name || clean, username: clean };
}

/** Resolve prompt-supplied referrer input to a wallet address, or null. */
export async function resolveReferrer(client: BackendClient, input: string): Promise<string | null> {
  const parsed = parseReferrerInput(input);
  if (!parsed) return null;
  if (parsed.kind === "address") return parsed.value;
  try {
    const res = await client.resolveName(parsed.value);
    return res.address || null;
  } catch (err) {
    // Unknown short name (backend 404) or any resolve failure → no referrer, proceed.
    // Referral attachment is best-effort and must never block a purchase.
    if (err instanceof BackendError) return null;
    throw err;
  }
}
