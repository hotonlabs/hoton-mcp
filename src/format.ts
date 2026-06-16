/** Mirrors backend/src/index.ts formatNanoTon: truncates to 4 fractional digits. */
export function formatNanoTon(nano: string | number | undefined): string {
  const value = BigInt(String(nano || "0"));
  const whole = value / 1000000000n;
  const fraction = value % 1000000000n;
  const fractionText = fraction.toString().padStart(9, "0").replace(/0+$/, "").slice(0, 4);
  return fractionText ? `${whole}.${fractionText}` : whole.toString();
}

export function isValidTonAddress(addr: string): boolean {
  return /^[A-Za-z0-9_-]{48}$/.test(addr) || /^-?[0-9]:[0-9a-fA-F]{64}$/.test(addr);
}

export type ReferrerInput = { kind: "address"; value: string } | { kind: "name"; value: string };

/**
 * Parse a referrer the agent extracted from the user's prompt. Accepts:
 *  - a raw wallet address          -> { kind: "address" }
 *  - a hoton.tg/<name> link        -> { kind: "name" }
 *  - a bare short name             -> { kind: "name" }
 * Returns null when there is nothing usable.
 */
export function parseReferrerInput(input: string): ReferrerInput | null {
  const trimmed = (input || "").trim();
  if (!trimmed) return null;
  if (isValidTonAddress(trimmed)) return { kind: "address", value: trimmed };

  const linkMatch = trimmed.match(/(?:https?:\/\/)?hoton\.tg\/([A-Za-z0-9_-]{1,32})/i);
  if (linkMatch) return { kind: "name", value: linkMatch[1].toLowerCase() };

  if (/^[A-Za-z0-9_-]{1,32}$/.test(trimmed)) return { kind: "name", value: trimmed.toLowerCase() };
  return null;
}
