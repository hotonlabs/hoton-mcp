import { describe, it, expect } from "vitest";
import { formatNanoTon, isValidTonAddress, parseReferrerInput } from "./format.js";

describe("formatNanoTon", () => {
  it("formats whole and fractional nanoton like the backend", () => {
    expect(formatNanoTon("1000000000")).toBe("1");
    expect(formatNanoTon("1620000000")).toBe("1.62");
    expect(formatNanoTon("0")).toBe("0");
    expect(formatNanoTon(undefined)).toBe("0");
  });
  it("truncates to 4 fractional digits", () => {
    expect(formatNanoTon("1123456789")).toBe("1.1234");
  });
});

describe("isValidTonAddress", () => {
  it("accepts user-friendly and raw forms", () => {
    expect(isValidTonAddress("EQDjdH5yC8bAoykZak0udtgt_SNf9lXl0aQOqdz_yVDpXksy")).toBe(true);
    expect(isValidTonAddress("0:" + "a".repeat(64))).toBe(true);
  });
  it("rejects junk", () => {
    expect(isValidTonAddress("hello")).toBe(false);
  });
});

describe("parseReferrerInput", () => {
  it("returns a raw wallet address as-is (kind=address)", () => {
    const addr = "EQDjdH5yC8bAoykZak0udtgt_SNf9lXl0aQOqdz_yVDpXksy";
    expect(parseReferrerInput(addr)).toEqual({ kind: "address", value: addr });
  });
  it("extracts a short name from a hoton.tg link", () => {
    expect(parseReferrerInput("https://hoton.tg/jeribond")).toEqual({ kind: "name", value: "jeribond" });
    expect(parseReferrerInput("hoton.tg/jeribond")).toEqual({ kind: "name", value: "jeribond" });
  });
  it("treats a bare short name as a name", () => {
    expect(parseReferrerInput("jeribond")).toEqual({ kind: "name", value: "jeribond" });
  });
  it("returns null for empty/none", () => {
    expect(parseReferrerInput("")).toBeNull();
    expect(parseReferrerInput("   ")).toBeNull();
  });
  it("does not extract from a look-alike host", () => {
    expect(parseReferrerInput("nothoton.tg/alice")).toBeNull();
  });
});
