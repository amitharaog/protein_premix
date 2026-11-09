import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { brand } from "@/config/brand";
import { launch } from "./launch";
import { contactStep, done, intro, personalities, ui } from "./survey";

// docs/COMPLIANCE.md banned words and the research wedge rule (no "healthy"/"sugar-free" positioning).
const BANNED = ["muscle", "recovery", "immunity", "diabetic", "weight loss", "burn", "detox", "cure", "doctor-recommended", "healthy", "sugar-free", "guilt-free"];
// The product name stays off public pages: the survey runs as the Ministry of Cravings (founder request, 8 Nov 2026).
const RETIRED = ["muggoozz"];

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx|md)$/.test(f) && !f.endsWith(".test.ts") ? [p] : [];
  });

const publicFiles = [
  ...files(join(__dirname)),
  ...files(join(__dirname, "..", "app", "(public)")),
  ...files(join(__dirname, "..", "app", "(launch)")),
];

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
    JSON.stringify([intro, done, ui, personalities, brand, contactStep]),
    intro.kicker(11),
    done.shareText("The Curious Crumb", "https://example.com/survey"),
  ].join(" ").toLowerCase();

  it("says nothing about the product", () => {
    for (const word of ["premix", "sachet", "mug cake", "recipe", "protein-based", "launching"]) expect(frame).not.toContain(word);
  });

  it("no longer promises anonymity, and says up front that it asks for a name and contact", () => {
    expect(frame).not.toContain("anonymous");
    expect(intro.contactNote.toLowerCase()).toContain("name");
    expect(intro.purpose.toLowerCase()).toContain("your name and contact");
  });

  it("makes no gluten or gram claims", () => {
    expect(frame).not.toContain("gluten");
    expect(frame).not.toMatch(/\b\d+(\.\d+)?\s?(g|gm|grams?)\b/);
  });
});

// The launch page shows the product (the waitlist-page exception), but CLAUDE.md rule 5 still holds there:
// "protein-based" only, no gram figure, no gluten-free, no prices, no cooking times while they are being tested.
describe("launch page copy", () => {
  const text = JSON.stringify(launch).toLowerCase();

  it("calls it protein-based and nothing stronger", () => {
    expect(text).toContain("protein-based");
    for (const phrase of ["high protein", "high-protein", "source of protein", "protein-rich", "packed with protein"]) expect(text).not.toContain(phrase);
  });

  it("has no gram figure, gluten, price or cooking time", () => {
    expect(text).not.toMatch(/\b\d+(\.\d+)?\s?(g|gm|grams?)\b/);
    expect(text).not.toContain("gluten");
    expect(text).not.toMatch(/₹|\brs\.?\s?\d|\binr\b|\bprice/);
    expect(text).not.toMatch(/\b\d+\s?(sec|secs|seconds?|min|mins|minutes?)\b/);
  });
});
