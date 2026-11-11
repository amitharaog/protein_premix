// Words on the launch page (/launch). This page shows the product, so it is the waitlist-page exception in the root
// CLAUDE.md disclosure rules: it stays behind BOARD_KEY until the founder approves every line, then
// FEATURE_LAUNCH_PAGE=true makes it public. Rule 5 applies: "protein-based" only, no gram figure, no gluten-free,
// no health claims, no prices, no cooking times (SPEC 1.1: times are still being tested). src/content/content.test.ts checks.

export type LaunchStep = { n: string; kicker: string; headline: string; title: string; body: string; cta?: boolean };

export const launch = {
  nav: { how: "How it works", inside: "What's inside", waitlist: "Waitlist", cta: "Join the waitlist" },
  scrollHint: "Scroll to tear it open",
  steps: [
    {
      n: "1",
      kicker: "Protein-based dessert premix",
      headline: "Tear it open",
      title: "One sachet. One mug.",
      body: "A real dessert you make yourself in minutes: rich, warm, soft and protein-based.",
      cta: true,
    },
    {
      n: "2",
      kicker: "Into your mug",
      headline: "Pour it in",
      title: "Add milk or water. Stir.",
      body: "Tip the mix into your favourite mug, pour in milk or water and stir until smooth.",
    },
    {
      n: "3",
      kicker: "Into the microwave",
      headline: "Let it rise",
      title: "Watch it puff up.",
      body: "Pop the mug in the microwave and watch it rise through the door.",
    },
    {
      n: "4",
      kicker: "Ding",
      headline: "Voilà, dessert",
      title: "Warm. Soft. Yours.",
      body: "All the indulgence, none of the second thoughts. Straight from the mug, while the craving is still fresh.",
      cta: true,
    },
  ] satisfies LaunchStep[],
  howLink: "See how it works",
  inside: {
    kicker: "What's inside",
    headline: "Indulgence, minus the second thoughts",
    body: "A real dessert first: warm, soft and rich. Then the label: protein, fibre and the minerals that matter, printed per serve on the pack.",
    tags: ["Protein-based", "Single serve", "Made in your mug"],
    table: "Nutrition",
    pending: "Numbers go up when the lab report on the final recipe is in.",
    // On the public page the nutrition table is hidden (founder, 10 Nov 2026), so the words do not promise numbers.
    bodyLive: "A real dessert first: warm, soft and rich. Protein-based, and made in your own mug in moments.",
  },
  waitlist: {
    kicker: "Coming soon",
    headline: "Be first to taste it",
    body: "Join the waitlist and we'll tell you first when it's ready.",
    email: "Email",
    phone: "WhatsApp number",
    either: "Fill in one or both.",
    consent: "You can message me about the launch.",
    purpose: "We use this only to tell you about the launch. Ask us any time and we'll delete it.",
    submit: "Join the waitlist",
    done: "You're on the list. We'll message you first.",
    doneNumber: "You're number {n} on the waitlist. We'll message you first.",
    preview: "Preview: this form switches on when you approve the page.",
  },
  // Shown on the survey's last screen, only after the answers are stamped (founder decision, 11 Nov 2026): the
  // questions stay blind, the reveal is the reward for finishing. Same rule 5 limits as the rest of this page.
  reveal: {
    sealed: "Top secret",
    sealedTitle: "The Ministry's secret project",
    sealedBody: "Your answers are stamped. You've earned a look at what they're for.",
    open: "Break the seal",
    kicker: "Declassified",
    lead: "Meet",
    body: "Everything you just told the Minister is shaping one thing: a protein-based dessert you make in your own mug.",
    steps: ["Tear", "Pour into your mug", "Add milk, stir", "Microwave", "Ding: dessert"],
    see: "Watch it come together",
  },
  footer: "Starting in Bengaluru.",
};
