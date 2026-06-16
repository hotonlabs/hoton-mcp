import { describe, it, expect, afterEach, vi } from "vitest";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it("defaults the backend URL to Railway", () => {
    vi.stubEnv("HOTON_BACKEND_URL", "");
    expect(loadConfig().backendUrl).toBe("https://hoton.up.railway.app");
  });

  it("strips a trailing slash from a custom backend URL", () => {
    vi.stubEnv("HOTON_BACKEND_URL", "http://localhost:3000/");
    expect(loadConfig().backendUrl).toBe("http://localhost:3000");
  });

  it("parses HOTON_MAX_ORDER as a number, undefined when unset", () => {
    vi.stubEnv("HOTON_MAX_ORDER", "");
    expect(loadConfig().maxOrder).toBeUndefined();
    vi.stubEnv("HOTON_MAX_ORDER", "5");
    expect(loadConfig().maxOrder).toBe(5);
  });
});
