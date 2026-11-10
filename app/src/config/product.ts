// The product's brand (founder, 10 Nov 2026; was QIXO from 9 Nov). Only the launch page (/launch) uses it: the survey
// stays blind and never names the product, which src/content/content.test.ts checks. A trademark search before it goes
// public is the founder's call.
//
// Nutrition per serve, for the launch page's "What's inside" panel (founder request, 10 Nov 2026). Every value stays
// null until it comes from a lab report on the final recipe (CLAUDE.md rule 5, docs/COMPLIANCE.md): the page then shows
// a dash, never an estimate. Fill value and set labTested when the report is in.
export type Nutrient = { key: string; label: string; unit: "g" | "kcal" | "mg"; value: number | null; highlight?: boolean };

export const product = {
  name: "BRUKN",
  nutrition: {
    basis: "Per serve, made with milk",
    labTested: false,
    rows: [
      { key: "protein", label: "Protein", unit: "g", value: null, highlight: true },
      { key: "fibre", label: "Dietary fibre", unit: "g", value: null, highlight: true },
      { key: "energy", label: "Energy", unit: "kcal", value: null },
      { key: "carbs", label: "Carbohydrate", unit: "g", value: null },
      { key: "sugars", label: "of which sugars", unit: "g", value: null },
      { key: "fat", label: "Fat", unit: "g", value: null },
      { key: "calcium", label: "Calcium", unit: "mg", value: null, highlight: true },
    ] satisfies Nutrient[],
  },
} as const;
