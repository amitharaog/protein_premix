import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

// Encrypts the GitHub token the board keeps in the database: AES-256-GCM, key derived from BOARD_TOKEN_SECRET.
// Stored as base64url(iv | tag | ciphertext). A wrong secret or a changed value decrypts to null, never to garbage.

const keyFrom = (secret: string) => Buffer.from(hkdfSync("sha256", secret, "muggoozz-agent-board", "github-token", 32));

function usable(secret: string | undefined): secret is string {
  return typeof secret === "string" && secret.length >= 24;
}

export function seal(plain: string, secret: string | undefined): string {
  if (!usable(secret)) throw new Error("BOARD_TOKEN_SECRET is missing or shorter than 24 characters");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", keyFrom(secret), iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

export function unseal(sealed: string, secret: string | undefined): string | null {
  if (!usable(secret)) return null;
  try {
    const raw = Buffer.from(sealed, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", keyFrom(secret), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** GitHub personal access tokens: fine-grained (github_pat_…) or classic (ghp_…). */
export const looksLikeGithubToken = (t: string) => /^(github_pat_[A-Za-z0-9_]{30,255}|ghp_[A-Za-z0-9]{30,255})$/.test(t);
