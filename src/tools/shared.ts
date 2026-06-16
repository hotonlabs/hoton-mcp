import { formatNanoTon } from "../format.js";
import type { BuyResponse, TxMessage } from "../backendClient.js";

export type { WalletAccount } from "../session.js";
export type PayToken = "GRAM" | "USDT";

/** Error whose message is safe to show the agent/user. */
export class ToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolError";
  }
}

export interface BuyResult {
  summary: string;
  price: string;
  payToken: PayToken;
  messages: TxMessage[];
  historyId: string;
  purchaseId: string | null;
  validUntil: number;
  expectedAmount: string;
  nextStep: string;
}

const NEXT_STEP =
  "Show the user `summary`, confirm, then call @ton/mcp send_raw_transaction with `messages`. " +
  "After it signs, call hoton_confirm with historyId, purchaseId (if present) and expectedAmount — " +
  "I'll find the settled transaction on-chain and return a tonviewer link.";

export function buildBuyResult(
  resp: BuyResponse,
  payToken: PayToken,
  label: string,
  maxOrder?: number,
): BuyResult {
  const tx = resp.transaction;
  if (!tx || !Array.isArray(tx.messages) || tx.messages.length === 0) {
    throw new ToolError(resp.error || "The order could not be built (no transaction returned).");
  }
  if (!resp.historyId) {
    throw new ToolError("The order is missing a historyId; cannot track it. Try again.");
  }

  const { price, numericTotal } = computePrice(resp, payToken, tx.messages);
  if (maxOrder !== undefined && numericTotal > maxOrder) {
    throw new ToolError(
      `Order total ${price} exceeds the configured limit of ${maxOrder} ${payToken}. Refused.`,
    );
  }

  return {
    summary: `${label}  =  ${price}`,
    price,
    payToken,
    messages: tx.messages,
    historyId: resp.historyId,
    purchaseId: resp.purchaseId ?? null,
    validUntil: tx.validUntil,
    expectedAmount: tx.messages[0].amount,
    nextStep: NEXT_STEP,
  };
}

function computePrice(
  resp: BuyResponse,
  payToken: PayToken,
  messages: TxMessage[],
): { price: string; numericTotal: number } {
  if (payToken === "USDT") {
    const display =
      resp.jettonProxy?.totalJettonDisplay ||
      resp.jettonProxy?.fragmentJettonDisplay ||
      "0";
    return { price: `${display} USDT`, numericTotal: Number(display) };
  }
  const totalNano = messages.reduce((sum, m) => sum + BigInt(m.amount), 0n);
  const gram = formatNanoTon(totalNano.toString());
  return { price: `${gram} GRAM`, numericTotal: Number(totalNano) / 1e9 };
}

export function toContent(result: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
}
