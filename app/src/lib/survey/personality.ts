import { personalities, type Personality } from "@/content/survey";

type Answers = Record<string, string | string[] | undefined>;

const INDIAN = ["Kesar pista", "Elaichi / chai spice", "Gulab jamun", "Gajar halwa", "Filter coffee"];
const asList = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

/** Deterministic, playful result card. Checked in priority order; first match wins. */
export function personalityFor(a: Answers): Personality {
  const likely = Number(a.Q9 ?? 0);
  const worries = asList(a.Q8);
  const flavours = asList(a.Q6);
  const protein = asList(a.Q2);
  const kit = asList(a.Q1);

  if (likely > 0 && likely <= 2) return personalities.critic;
  if (worries.includes("Whether the protein claim is true")) return personalities.detective;
  if (flavours.length > 0 && flavours.filter((f) => INDIAN.includes(f)).length * 2 > flavours.length) return personalities.mithai;
  if (a.Q3 === "Daily") return personalities.midnight;
  if (protein.includes("Whey / protein powder") || protein.includes("Protein bars or snacks")) return personalities.macro;
  if (worries.includes("Effort to make") || kit.includes("None of these")) return personalities.lazy;
  return personalities.curious;
}
