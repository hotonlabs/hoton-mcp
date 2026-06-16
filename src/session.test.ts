import { describe, it, expect } from "vitest";
import { createSession } from "./session.js";

describe("session", () => {
  it("starts empty", () => {
    const s = createSession();
    expect(s.getWallet()).toBeNull();
    expect(s.getReferrer()).toBeNull();
  });
  it("stores and returns the wallet", () => {
    const s = createSession();
    s.setWallet({ address: "EQ...", publicKey: "pk", walletStateInit: "si" });
    expect(s.getWallet()?.address).toBe("EQ...");
  });
  it("stores and clears the referrer", () => {
    const s = createSession();
    s.setReferrer("EQref");
    expect(s.getReferrer()).toBe("EQref");
    s.setReferrer(null);
    expect(s.getReferrer()).toBeNull();
  });
});
