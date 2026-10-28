import { createHash, createHmac, timingSafeEqual } from "node:crypto";

const secret = () => process.env.AUTH_SECRET || process.env.IP_HASH_SALT || "dev-only-secret";

/** Signed page-load time, so the server can reject submits faster than SURVEY_MIN_SECONDS. */
export function signStart(ms: number = Date.now()): string {
  const sig = createHmac("sha256", secret()).update(String(ms)).digest("base64url");
  return `${ms}.${sig}`;
}

export function secondsSinceStart(token: string, now: number = Date.now()): number | null {
  const [ms, sig] = token.split(".");
  if (!ms || !sig || !/^\d+$/.test(ms)) return null;
  const expected = createHmac("sha256", secret()).update(ms).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return (now - Number(ms)) / 1000;
}

/** sha256(ip + salt). Raw IPs are never stored (COMPLIANCE.md, DPDP basics). */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip + (process.env.IP_HASH_SALT ?? "")).digest("hex");
}

export const MIN_SECONDS = () => Number(process.env.SURVEY_MIN_SECONDS ?? 8);
export const MAX_SUBMITS_PER_HOUR = 5;
export const RID_COOKIE = "rid";
