import { describe, it, expect, vi } from "vitest";
import { buildServer, makeWrap } from "./server.js";
import { createSession } from "./session.js";
import { ToolError } from "./tools/shared.js";
import type { BackendClient } from "./backendClient.js";

describe("makeWrap", () => {
  it("returns JSON content on success", async () => {
    const wrap = makeWrap();
    const res = await wrap(async () => ({ a: 1 }));
    expect(JSON.parse(res.content[0].text)).toEqual({ a: 1 });
    expect(res.isError).toBeFalsy();
  });
  it("returns an isError message for ToolError", async () => {
    const wrap = makeWrap();
    const res = await wrap(async () => { throw new ToolError("nope"); });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("nope");
  });
  it("returns isError for any unexpected error, not just ToolError", async () => {
    const wrap = makeWrap();
    const res = await wrap(async () => { throw new Error("network timeout"); });
    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("network timeout");
  });
});

describe("buildServer", () => {
  it("registers all 11 tools", () => {
    const names: string[] = [];
    const fakeServer = { registerTool: (name: string) => names.push(name) };
    buildServer(
      { client: {} as BackendClient, session: createSession(), config: { backendUrl: "http://x" } },
      fakeServer as any,
    );
    expect(names.sort()).toEqual([
      "hoton_buy_premium", "hoton_buy_premium_bulk", "hoton_buy_stars", "hoton_buy_stars_bulk",
      "hoton_confirm", "hoton_find_recipient", "hoton_status", "hoton_topup_ton",
      "hoton_topup_ton_bulk", "hoton_use_referrer", "hoton_use_wallet",
    ]);
  });
});
