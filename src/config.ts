export interface Config {
  backendUrl: string;
  /** Optional per-order cap. GRAM for GRAM orders, USDT for USDT orders. */
  maxOrder?: number;
}

export function loadConfig(): Config {
  const raw = process.env.HOTON_BACKEND_URL?.trim() || "https://hoton.up.railway.app";
  const backendUrl = raw.replace(/\/+$/, "");
  const maxOrderRaw = process.env.HOTON_MAX_ORDER?.trim();
  const maxOrder = maxOrderRaw && /^\d+(\.\d+)?$/.test(maxOrderRaw) ? Number(maxOrderRaw) : undefined;
  return { backendUrl, maxOrder };
}

/**
 * Synthetic TonConnect DeviceInfo presented to Fragment on the agent's behalf.
 * Mirrors the shape the browser sends (tonConnectUI.wallet.device). maxMessages
 * 10 matches the bulk recipient cap. Tune during integration if Fragment is picky.
 */
export const AGENT_DEVICE = {
  platform: "browser",
  appName: "hoton-agent",
  appVersion: "0.1.0",
  maxProtocolVersion: 2,
  features: [
    "SendTransaction",
    { name: "SendTransaction", maxMessages: 10 },
  ],
} as const;
