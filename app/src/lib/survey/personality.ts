import { personalities, type Personality } from "@/content/survey";

type Answers = Record<string, string | string[] | undefined>;

const asList = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);

/** Q11, the 10 pm dilemma: each answer has its own personality. */
const BY_DILEMMA: Record<string, Personality> = {
  "Bake a warm cake in a mug in 2 minutes and indulge": personalities.chef,
  "Order something sweet and feel a bit guilty": personalities.sheepish,
  "Order something sweet, zero guilt": personalities.unbothered,
  "Raid the kitchen: biscuits, chocolate, anything": personalities.raider,
  "Fight it. I am a monk.": personalities.monk,
};
const BIG_PROTEIN = ["Like a protein bar, about 20 g", "Like a scoop of whey, 25 g or more"];

/** Deterministic, playful result card. Checked in priority order; first match wins. */
export function personalityFor(a: Answers): Personality {
  const likely = Number(a.Q9 ?? 0);
  const worries = asList(a.Q8);
  const protein = asList(a.Q2);
  const kit = asList(a.Q1);
  const dilemma = typeof a.Q11 === "string" ? BY_DILEMMA[a.Q11] : undefined;

  if (likely > 0 && likely <= 2) return personalities.critic;
  if (worries.includes("Whether the protein claim is true") || a.Q13 === "I can't have gluten (allergy or intolerance)") return personalities.detective;
  if (worries.includes("Dry or rubbery texture")) return personalities.texture;
  if (typeof a.Q12 === "string" && BIG_PROTEIN.includes(a.Q12)) return personalities.macro;
  if (dilemma) return dilemma;
  if (a.Q3 === "Daily") return personalities.midnight;
  if (protein.includes("Whey / protein powder") || protein.includes("Protein bars or snacks")) return personalities.macro;
  if (worries.includes("Effort to make") || kit.includes("None of these")) return personalities.lazy;
  return personalities.curious;
}
