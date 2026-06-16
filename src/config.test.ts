import { describe, it, expect, beforeEach, afterEach } from "vitest";

describe("loadConfig", () => {
  const saved = { ...process.env };
  beforeEach(() => { delete process.env.HOTON_BACKEND_URL; delete process.env.HOTON_MAX_ORDER; });
  afterEach(() => { process.env = { ...saved }; });

  it("defaults the backend URL to Railway", async () => {
    const { loadConfig } = await import("./config.js");
    expect(loadConfig().backendUrl).toBe("https://hoton.up.railway.app");
  });

  it("strips a trailing slash from a custom backend URL", async () => {
    process.env.HOTON_BACKEND_URL = "http://localhost:3000/";
    const { loadConfig } = await import("./config.js");
    expect(loadConfig().backendUrl).toBe("http://localhost:3000");
  });

  it("parses HOTON_MAX_ORDER as a number, undefined when unset", async () => {
    const { loadConfig } = await import("./config.js");
    expect(loadConfig().maxOrder).toBeUndefined();
    process.env.HOTON_MAX_ORDER = "5";
    expect(loadConfig().maxOrder).toBe(5);
  });
});
