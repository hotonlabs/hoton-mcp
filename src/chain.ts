const TONCENTER_API = (process.env.HOTON_TONCENTER_API || "https://toncenter.com/api/v2").replace(/\/+$/, "");
const TONCENTER_API_KEY = process.env.HOTON_TONCENTER_API_KEY?.trim();

export interface SettledTx {
  /** Toncenter's transaction hash, base64 — pass this to the backend confirm (it exact-matches). */
  txHashBase64: string;
  /** Same hash in hex — for a tonviewer link. */
  txHashHex: string;
}

interface ToncenterMsg { value?: string | number }
interface ToncenterTx { transaction_id?: { hash?: string }; out_msgs?: ToncenterMsg[] }

export interface PollOptions {
  wallet: string;
  /** nanoton string (buy result's messages[0].amount); pinpoints the buyer's purchase tx by out_msg value. */
  expectedAmount?: string;
  fetchFn?: typeof fetch;
  intervalMs?: number;
  timeoutMs?: number;
  /** injectable clock for tests; defaults to Date.now */
  nowFn?: () => number;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function toncenterUrl(wallet: string): string {
  const params = new URLSearchParams({ address: wallet, limit: "15" });
  if (TONCENTER_API_KEY) params.set("api_key", TONCENTER_API_KEY);
  return `${TONCENTER_API}/getTransactions?${params.toString()}`;
}

/**
 * Polls Toncenter for the buyer's settled transaction. With expectedAmount, returns the
 * tx whose out_msg value matches (the buyer -> proxy/jetton-wallet message). Without it,
 * returns the most recent tx. Returns null if nothing matches before the timeout.
 */
export async function pollForSettledTx(opts: PollOptions): Promise<SettledTx | null> {
  const fetchFn = opts.fetchFn ?? fetch;
  const now = opts.nowFn ?? Date.now;
  const intervalMs = opts.intervalMs ?? 2000;
  const timeoutMs = opts.timeoutMs ?? 90000;
  const deadline = now() + timeoutMs;

  while (now() <= deadline) {
    try {
      const res = await fetchFn(toncenterUrl(opts.wallet));
      if (res.ok) {
        const data = (await res.json()) as { ok?: boolean; result?: ToncenterTx[] };
        if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
          const tx = opts.expectedAmount
            ? data.result.find((t) => (t.out_msgs || []).some((m) => String(m.value) === opts.expectedAmount))
            : data.result[0];
          const hashB64 = tx?.transaction_id?.hash;
          if (hashB64) {
            return { txHashBase64: hashB64, txHashHex: Buffer.from(hashB64, "base64").toString("hex") };
          }
        }
      }
    } catch {
      // network blip — keep polling until the deadline
    }
    if (now() > deadline - intervalMs) break;
    await sleep(intervalMs);
  }
  return null;
}
