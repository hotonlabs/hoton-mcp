import type { BackendClient, Product } from "./backendClient.js";
import { parseReferrerInput } from "./format.js";
import { ToolError } from "./tools/shared.js";

export interface ResolvedRecipient { recipientId: string; name: string; username: string }

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
    throw new ToolError(res.error || `No Telegram user @${clean} could be found.`);
  }
  return { recipientId: id, name: res.found.name || clean, username: clean };
}

/** Resolve prompt-supplied referrer input to a wallet address, or null. */
export async function resolveReferrer(client: BackendClient, input: string): Promise<string | null> {
  const parsed = parseReferrerInput(input);
  if (!parsed) return null;
  if (parsed.kind === "address") return parsed.value;
  const res = await client.resolveName(parsed.value);
  return res.address || null;
}
