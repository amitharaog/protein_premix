import { timingSafeEqual } from "node:crypto";

/** Constant-time check of a key taken from a URL against an env secret. A missing or short secret never matches. */
export function keyMatches(given: string | null | undefined, expected: string | undefined): boolean {
  if (!given || !expected || expected.length < 24) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
