import { describe, expect, it } from "vitest";
import { looksLikeGithubToken, seal, unseal } from "./vault";

const secret = "board-token-secret-0123456789abcdef";
const token = "github_pat_11ABCDEFG0123456789_abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVW";

describe("vault", () => {
  it("round-trips a token and never stores it in the clear", () => {
    const sealed = seal(token, secret);
    expect(sealed).not.toContain("github_pat");
    expect(seal(token, secret)).not.toBe(sealed); // fresh IV every time
    expect(unseal(sealed, secret)).toBe(token);
  });

  it("gives null for a wrong secret, a changed value or no secret", () => {
    const sealed = seal(token, secret);
    expect(unseal(sealed, secret + "x")).toBeNull();
    const raw = Buffer.from(sealed, "base64url");
    raw[raw.length - 1] ^= 1;
    expect(unseal(raw.toString("base64url"), secret)).toBeNull();
    expect(unseal(sealed, undefined)).toBeNull();
    expect(() => seal(token, "short")).toThrow(/BOARD_TOKEN_SECRET/);
  });

  it("recognises GitHub personal access tokens only", () => {
    expect(looksLikeGithubToken(token)).toBe(true);
    expect(looksLikeGithubToken("ghp_" + "a".repeat(36))).toBe(true);
    expect(looksLikeGithubToken("hello")).toBe(false);
    expect(looksLikeGithubToken(token + " ")).toBe(false);
  });
});
