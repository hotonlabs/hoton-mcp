import { describe, it, expect, vi, beforeEach } from "vitest";
import { createBackendClient, BackendError } from "./backendClient.js";

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as typeof fetch;
}

describe("backendClient", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("GET /health returns the parsed body", async () => {
    const fetchFn = mockFetch(200, { ok: true });
    const client = createBackendClient("http://x", fetchFn);
    await expect(client.getHealth()).resolves.toEqual({ ok: true });
    expect(fetchFn).toHaveBeenCalledWith("http://x/health", expect.objectContaining({ method: "GET" }));
  });

  it("buyStars posts the misspelled receipientId field", async () => {
    const fetchFn = mockFetch(200, { transaction: { validUntil: 1, messages: [] }, historyId: "h" });
    const client = createBackendClient("http://x", fetchFn);
    await client.buyStars({ account: "A", device: "D", receipientId: "r1", amount: "100", paymentMethod: "ton" });
    const [, init] = (fetchFn as any).mock.calls[0];
    const sent = JSON.parse(init.body);
    expect(sent.receipientId).toBe("r1");
    expect(sent.paymentMethod).toBe("ton");
  });

  it("buyStarsBulk posts recipients[].recipientId", async () => {
    const fetchFn = mockFetch(200, { transaction: { validUntil: 1, messages: [] }, historyId: "h" });
    const client = createBackendClient("http://x", fetchFn);
    await client.buyStarsBulk({ account: "A", device: "D", amount: "100", paymentMethod: "ton", recipients: [{ recipientId: "r1", username: "alice" }] });
    const sent = JSON.parse((fetchFn as any).mock.calls[0][1].body);
    expect(sent.recipients[0].recipientId).toBe("r1");
  });

  it("throws BackendError with the backend error message on non-2xx", async () => {
    const fetchFn = mockFetch(400, { error: "Invalid amount" });
    const client = createBackendClient("http://x", fetchFn);
    await expect(client.buyStars({ account: "A", device: "D", receipientId: "r", amount: "1", paymentMethod: "ton" }))
      .rejects.toThrowError(new BackendError("Invalid amount", 400));
  });

  it("searchRecipient builds the right query per product", async () => {
    const fetchFn = mockFetch(200, { ok: true, found: { recipient: "r1", name: "Alice" } });
    const client = createBackendClient("http://x", fetchFn);
    await client.searchRecipient("premium", "alice", "6");
    expect((fetchFn as any).mock.calls[0][0]).toBe("http://x/premium-recipient?userName=alice&months=6");
  });

  it("converts an aborted/timed-out request into a BackendError(504)", async () => {
    const fetchFn = vi.fn(async () => { const e = new Error("aborted"); e.name = "AbortError"; throw e; }) as unknown as typeof fetch;
    const client = createBackendClient("http://x", fetchFn, 5);
    await expect(client.getHealth()).rejects.toMatchObject({ name: "BackendError", status: 504 });
  });
});
