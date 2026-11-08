import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { brand } from "@/config/brand";
import { done, intro, personalities, ui } from "./survey";

// docs/COMPLIANCE.md banned words and the research wedge rule (no "healthy"/"sugar-free" positioning).
const BANNED = ["muscle", "recovery", "immunity", "diabetic", "weight loss", "burn", "detox", "cure", "doctor-recommended", "healthy", "sugar-free", "guilt-free"];
// The product name stays off public pages: the survey runs as the Ministry of Cravings (founder request, 8 Nov 2026).
const RETIRED = ["muggoozz"];

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx|md)$/.test(f) && !f.endsWith(".test.ts") ? [p] : [];
  });

const publicFiles = [...files(join(__dirname)), ...files(join(__dirname, "..", "app", "(public)"))];

describe("public copy", () => {
  it.each(publicFiles)("%s has no banned words", (file) => {
    const text = readFileSync(file, "utf8").toLowerCase();
    for (const word of [...BANNED, ...RETIRED]) expect(text, `"${word}" in ${file}`).not.toMatch(new RegExp(`\\b${word}\\b`));
  });
});

// Founder rules for the copy around the questions (8 Nov 2026): the survey never describes the product, so no
// product name, format or recipe. Questions may ask about gluten and protein amounts, but this copy never
// mentions gluten or a gram figure, so nothing reads as a gluten-free or protein claim (CLAUDE.md rule 5).
describe("copy around the questions", () => {
  const frame = [
    JSON.stringify([intro, done, ui, personalities, brand]),
    intro.kicker(11),
    done.shareText("The Curious Crumb", "https://example.com/survey"),
  ].join(" ").toLowerCase();

  it("says nothing about the product", () => {
    for (const word of ["premix", "sachet", "mug cake", "recipe", "protein-based", "launching"]) expect(frame).not.toContain(word);
  });

  it("makes no gluten or gram claims", () => {
    expect(frame).not.toContain("gluten");
    expect(frame).not.toMatch(/\b\d+(\.\d+)?\s?(g|gm|grams?)\b/);
  });
});
