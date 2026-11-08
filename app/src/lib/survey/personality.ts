import { personalities, type Personality } from "@/content/survey";

type Answers = Record<string, string | string[] | undefined>;

const asList = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

const BIG_PROTEIN = ["Like a protein bar, about 20 g", "Like a scoop of whey, 25 g or more"];
const GUILTY = ["A little guilty", "Guilty enough to skip it next time"];

/** Deterministic, playful result card. Checked in priority order; first match wins. */
export function personalityFor(a: Answers): Personality {
  const likely = Number(a.Q9 ?? 0);
  const worries = asList(a.Q8);
  const protein = asList(a.Q2);
  const kit = asList(a.Q1);
  const triggers = asList(a.Q14);
  const guilty = typeof a.Q17 === "string" ? GUILTY.includes(a.Q17) : null; // null: skipped

  if (likely > 0 && likely <= 2) return personalities.critic;
  if (worries.includes("Whether the protein claim is true") || a.Q13 === "I can't have gluten (allergy or intolerance)") return personalities.detective;
  if (worries.includes("Dry or rubbery texture")) return personalities.texture;
  if (typeof a.Q12 === "string" && BIG_PROTEIN.includes(a.Q12)) return personalities.macro;
  if (triggers.includes("Stress or a rough day")) return personalities.comfort;
  if (triggers.includes("Chai or coffee time")) return personalities.chai;
  // Q11, the 10 pm dilemma, then Q17, how they feel afterwards.
  if (a.Q11 === "Make something quick at home") return personalities.chef;
  if (a.Q11 === "Eat whatever sweet is already at home") return personalities.raider;
  if (a.Q11 === "Nothing. I wait it out.") return personalities.monk;
  if (guilty === true) return personalities.sheepish;
  if (guilty === false || a.Q11 === "Order in (Swiggy, Zomato, Blinkit)") return personalities.unbothered;
  if (a.Q3 === "Daily" || triggers.includes("Late at night")) return personalities.midnight;
  if (protein.includes("Whey / protein powder") || protein.includes("Protein bars or snacks")) return personalities.macro;
  if (worries.includes("Effort to make") || kit.includes("None of these") || a.Q18 === "None. Ready to eat or nothing") return personalities.lazy;
  return personalities.curious;
}
