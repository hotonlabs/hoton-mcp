import { z } from "zod";
import type { ToolDeps } from "./wallet.js";
import { recipientNotFoundMessage } from "../resolvers.js";

export async function handleFindRecipient(
  args: { username: string; product: "stars" | "premium" | "ton"; months?: string },
  deps: ToolDeps,
) {
  const clean = args.username.trim().replace(/^@/, "");
  const res = await deps.client.searchRecipient(args.product, clean, args.months);
  const id = res.found?.recipient;
  if (!res.ok || !res.found || !id) {
    return { found: false, username: clean, message: recipientNotFoundMessage(clean) };
  }
  return { found: true, recipientId: id, name: res.found.name || clean, photo: res.found.photo ?? null, username: clean };
}

export function registerFindRecipientTool(server: any, deps: ToolDeps, wrap: (fn: () => Promise<unknown>) => Promise<any>) {
  server.registerTool(
    "hoton_find_recipient",
    {
      title: "Verify a Telegram recipient",
      description: "Look up a Telegram @username before buying, to confirm the right person (returns display name + photo). For premium, pass months. Optional — buy tools also resolve usernames themselves.",
      inputSchema: {
        username: z.string().describe("Telegram username, with or without @"),
        product: z.enum(["stars", "premium", "ton"]).describe("Which product the recipient is for"),
        months: z.enum(["3", "6", "12"]).optional().describe("Premium duration (premium only)"),
      },
    },
    async (args: { username: string; product: "stars" | "premium" | "ton"; months?: "3" | "6" | "12" }) =>
      wrap(() => handleFindRecipient(args, deps)),
  );
}
