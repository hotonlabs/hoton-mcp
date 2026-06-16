import { describe, it, expect, vi } from "vitest";
import { handleUseWallet, handleUseReferrer, requireWallet } from "./wallet.js";
import { createSession } from "../session.js";
import { ToolError } from "./shared.js";
import type { BackendClient } from "../backendClient.js";

function deps(over: Partial<BackendClient> = {}) {
  const session = createSession();
  const client = { resolveName: vi.fn(), ...over } as unknown as BackendClient;
  return { client, session, config: { backendUrl: "http://x" } };
}

describe("handleUseWallet", () => {
  it("stores a wallet with an address", async () => {
    const d = deps();
    const r = await handleUseWallet({ address: "EQabc0000000000000000000000000000000000000000000", publicKey: "pk", walletStateInit: "si" }, d);
    expect(d.session.getWallet()?.address).toBe("EQabc0000000000000000000000000000000000000000000");
    expect(r.ok).toBe(true);
  });
  it("rejects an invalid address", async () => {
    await expect(handleUseWallet({ address: "nope" }, deps())).rejects.toThrowError(ToolError);
  });
});

describe("handleUseReferrer", () => {
  it("stores a resolved referrer", async () => {
    const d = deps({ resolveName: vi.fn(async () => ({ address: "EQjeri000000000000000000000000000000000000000000" })) });
    const r = await handleUseReferrer({ referrer: "hoton.tg/jeribond" }, d);
    expect(d.session.getReferrer()).toBe("EQjeri000000000000000000000000000000000000000000");
    expect(r.referrer).toBe("EQjeri000000000000000000000000000000000000000000");
  });
  it("clears the referrer when input resolves to nothing", async () => {
    const d = deps({ resolveName: vi.fn(async () => ({})) });
    const r = await handleUseReferrer({ referrer: "hoton.tg/hoton" }, d);
    expect(d.session.getReferrer()).toBeNull();
    expect(r.referrer).toBeNull();
  });
});

describe("requireWallet", () => {
  it("prefers the override, falls back to session, else throws", () => {
    const d = deps();
    expect(() => requireWallet(d)).toThrowError(/use_wallet/);
    d.session.setWallet({ address: "EQsession000000000000000000000000000000000000000" });
    expect(requireWallet(d).address).toBe("EQsession000000000000000000000000000000000000000");
    expect(requireWallet(d, { address: "EQoverride00000000000000000000000000000000000000" }).address).toBe("EQoverride00000000000000000000000000000000000000");
  });
});
