import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// docs/COMPLIANCE.md banned words, plus the research wedge rule (no "healthy"/"sugar-free" positioning).
const BANNED = ["muscle", "recovery", "immunity", "diabetic", "weight loss", "burn", "detox", "cure", "doctor-recommended", "healthy", "sugar-free", "guilt-free"];

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx|md)$/.test(f) && !f.endsWith(".test.ts") ? [p] : [];
  });

const publicFiles = [...files(join(__dirname)), ...files(join(__dirname, "..", "app", "(public)"))];

describe("public copy", () => {
  it.each(publicFiles)("%s has no banned words", (file) => {
    const text = readFileSync(file, "utf8").toLowerCase();
    for (const word of BANNED) expect(text, `"${word}" in ${file}`).not.toMatch(new RegExp(`\\b${word}\\b`));
  });
});
