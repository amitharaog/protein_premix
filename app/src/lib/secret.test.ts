import { describe, expect, it } from "vitest";
import { keyMatches } from "./secret";

const secret = "a-long-enough-secret-0123456789";

describe("keyMatches", () => {
  it("accepts only the exact key", () => {
    expect(keyMatches(secret, secret)).toBe(true);
    expect(keyMatches(secret.slice(0, -1), secret)).toBe(false);
    expect(keyMatches(secret + "x", secret)).toBe(false);
  });

  it("never matches when the key or the secret is missing, or the secret is short", () => {
    expect(keyMatches(undefined, secret)).toBe(false);
    expect(keyMatches("", secret)).toBe(false);
    expect(keyMatches(secret, undefined)).toBe(false);
    expect(keyMatches("short", "short")).toBe(false);
  });
});
