export class BackendError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "BackendError";
  }
}

export interface TxMessage { address: string; amount: string; payload: string }
export interface BuyResponse {
  transaction?: { validUntil: number; messages: TxMessage[] };
  historyId?: string;
  purchaseId?: string;
  jettonProxy?: { totalJettonDisplay?: string; fragmentJettonDisplay?: string };
  error?: string;
}
export interface RecipientSearchResponse {
  ok?: boolean;
  found?: { recipient?: string; name?: string; photo?: string } | null;
  error?: string;
}

export type Product = "stars" | "premium" | "ton";
export interface BulkRecipient { recipientId: string; username?: string; name?: string }

export interface BackendClient {
  getHealth(): Promise<{ ok: boolean; error?: string }>;
  resolveName(name: string): Promise<{ address?: string }>;
  searchRecipient(product: Product, username: string, months?: string): Promise<RecipientSearchResponse>;
  buyStars(body: { account: string; device: string; receipientId: string; amount: string; paymentMethod: "ton" | "usdt"; recipientUsername?: string; recipientName?: string; referrer?: string }): Promise<BuyResponse>;
  buyStarsBulk(body: { account: string; device: string; amount: string; paymentMethod: "ton" | "usdt"; recipients: BulkRecipient[]; referrer?: string }): Promise<BuyResponse>;
  buyPremium(body: { account: string; device: string; receipientId: string; months: string; paymentMethod: "ton" | "usdt"; recipientUsername?: string; recipientName?: string; referrer?: string }): Promise<BuyResponse>;
  buyPremiumBulk(body: { account: string; device: string; months: string; paymentMethod: "ton" | "usdt"; recipients: BulkRecipient[]; referrer?: string }): Promise<BuyResponse>;
  topupTon(body: { account: string; device: string; receipientId: string; amount: string; recipientUsername?: string; recipientName?: string; referrer?: string }): Promise<BuyResponse>;
  topupTonBulk(body: { account: string; device: string; amount: string; recipients: BulkRecipient[]; referrer?: string }): Promise<BuyResponse>;
  confirmHistory(historyId: string, body: { buyerWallet: string; txHash: string }): Promise<unknown>;
  confirmReferral(body: { purchaseId: string; buyerWallet: string; txHash: string }): Promise<unknown>;
}

export function createBackendClient(baseUrl: string, fetchFn: typeof fetch = fetch): BackendClient {
  async function request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const res = await fetchFn(`${baseUrl}${path}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) throw new BackendError(data?.error || `Request failed (${res.status})`, res.status);
    return data as T;
  }

  const searchPath: Record<Product, string> = {
    stars: "/star-recipient",
    premium: "/premium-recipient",
    ton: "/ton-recipient",
  };

  return {
    getHealth: () => request("GET", "/health"),
    resolveName: (name) => request("GET", `/resolve/${encodeURIComponent(name)}`),
    searchRecipient: (product, username, months) => {
      const qs = new URLSearchParams({ userName: username });
      if (product === "premium" && months) qs.set("months", months);
      return request("GET", `${searchPath[product]}?${qs.toString()}`);
    },
    buyStars: (body) => request("POST", "/buy-stars", body),
    buyStarsBulk: (body) => request("POST", "/buy-stars-bulk", body),
    buyPremium: (body) => request("POST", "/premium", body),
    buyPremiumBulk: (body) => request("POST", "/premium-bulk", body),
    topupTon: (body) => request("POST", "/add-funds", body),
    topupTonBulk: (body) => request("POST", "/add-funds-bulk", body),
    confirmHistory: (historyId, body) => request("POST", `/transactions/history/${encodeURIComponent(historyId)}/confirm`, body),
    confirmReferral: (body) => request("POST", "/referral/purchase-confirmed", body),
  };
}
