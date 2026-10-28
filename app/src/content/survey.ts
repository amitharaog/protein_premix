// Playful copy around the survey. Question wording itself comes from the survey_questions table, so
// results stay comparable with the old survey. Rules: no brand name, no health claims, no banned words
// (see docs/COMPLIANCE.md; enforced by src/content/content.test.ts).

export const intro = {
  kicker: (n: number) => `${n} quick questions · no login`,
  tagline: "Mug cake quiz",
  badges: [["Protein-", "based"], ["Gluten-free", "ingredients"], ["Ready in", "minutes"]] as [string[], string[], string[]],
  stepsTitle: "3-step premix",
  steps: ["Tip the mix into a mug", "Add milk or water, stir", "Bake. Ready in minutes"],
  headline: "Give us your cravings",
  sub: "The quiz takes about a minute.",
  spec: "We're making muggoozz: a protein-based mug cake premix you bake at home in 3 steps, ready in minutes. Made with gluten-free ingredients.",
  host: "Hi, I'm a mug cake. I ask people about dessert. It's my whole personality.",
  cta: "Let's go",
  purpose:
    "Anonymous. We store your answers, the link you came from, and a scrambled version of your IP that only stops bots. Purpose: deciding what to make. Nothing is sold or shared.",
};

type QuestionCopy = {
  host: string; // what the mug says while you read the question
  emoji: Record<string, string>; // option → emoji
  reactions?: Record<string, string>; // option → what the mug says when you pick it
};

export const questionCopy: Record<string, QuestionCopy> = {
  Q1: {
    host: "First, a kitchen audit. No judgement. Okay, mild judgement.",
    emoji: { Microwave: "🍿", "Air fryer": "🌪️", "OTG / oven": "🔥", "Pressure cooker": "🚂", "None of these": "🙈" },
    reactions: {
      "Pressure cooker": "Ah, the whistle. India's real alarm clock.",
      "Air fryer": "The appliance everyone bought in 2021 and now worships.",
      "None of these": "A minimalist. Respect.",
      Microwave: "The 2 a.m. hero.",
    },
  },
  Q2: {
    host: "Protein check. Be honest, your mom isn't reading this.",
    emoji: {
      "Whey / protein powder": "🥤",
      "Protein bars or snacks": "🍫",
      "Protein dairy (milk, curd, buttermilk)": "🥛",
      "Regular food only (dal, paneer, eggs)": "🍛",
      "I don't think about protein": "🤷",
    },
    reactions: {
      "Regular food only (dal, paneer, eggs)": "Dal supremacy. Correct answer.",
      "I don't think about protein": "Living free. Iconic.",
      "Whey / protein powder": "Shaker bottle gang, we see you.",
    },
  },
  Q3: {
    host: "Sweet tooth check. How often does it text you?",
    emoji: { Daily: "🚨", "3-5 times a week": "🌙", "1-2 times a week": "📆", Rarely: "🧊" },
    reactions: {
      Daily: "Daily. Same. We're in this together.",
      "3-5 times a week": "A respectable schedule.",
      "1-2 times a week": "Disciplined. Slightly suspicious.",
      Rarely: "Rarely? Blink twice if you need help.",
    },
  },
  Q4: {
    host: "Eggs. Where do you stand?",
    emoji: { "Must be eggless": "🌱", "Prefer eggless": "🙂", "Doesn't matter": "🤝" },
    reactions: {
      "Must be eggless": "Noted. In permanent ink.",
      "Doesn't matter": "Chill. We like chill.",
    },
  },
  Q5: {
    host: "The money question. We'll act very casual about it.",
    emoji: { "₹40-60": "🪙", "₹60-80": "💵", "₹80-100": "💸", "₹100-150": "👑", "₹150+": "💎", "Wouldn't pay for this": "🙅" },
    reactions: {
      "Wouldn't pay for this": "Ouch. But thank you, honesty keeps us humble.",
      "₹100-150": "Royalty has entered the chat.",
      "₹150+": "Big spender. The mug is blushing.",
    },
  },
  Q6: {
    host: "Build your tasting flight. Pick up to 3. Choose wisely, the flavours can hear you.",
    emoji: {
      "Chocolate fudge / brownie": "🍫",
      Vanilla: "🍦",
      "Filter coffee": "☕",
      "Kesar pista": "💛",
      "Elaichi / chai spice": "🫖",
      "Gulab jamun": "🟤",
      "Gajar halwa": "🥕",
      "Peanut butter": "🥜",
      "Red velvet": "❤️",
    },
    reactions: {
      "Gulab jamun": "Bold. Your nani would be proud.",
      "Filter coffee": "Bengaluru energy detected.",
      "Chocolate fudge / brownie": "A classic. No notes.",
    },
  },
  Q7: {
    host: "If it existed, where would you grab it?",
    emoji: {
      "Blinkit / Zepto / Instamart": "🛵",
      "Amazon / Flipkart": "📦",
      "Brand website": "🖥️",
      "Gym or café": "☕",
      Supermarket: "🛒",
      "Office or hostel canteen": "🏫",
    },
    reactions: {
      "Blinkit / Zepto / Instamart": "10-minute delivery, 10-second decision.",
      "Office or hostel canteen": "The canteen uncle deserves this.",
    },
  },
  Q8: {
    host: "What would make you side-eye it? Pick up to 2.",
    emoji: {
      "Taste / protein aftertaste": "😖",
      "Dry or rubbery texture": "🧽",
      Price: "💰",
      "Sugar / ingredients": "🔍",
      "Whether the protein claim is true": "🕵️",
      "Effort to make": "😴",
    },
    reactions: {
      "Dry or rubbery texture": "The rubber-brownie trauma is real. We hear you.",
      "Whether the protein claim is true": "A sceptic. Good, keep everyone honest.",
      "Effort to make": "Dessert, not a project. Understood.",
    },
  },
  Q9: {
    host: "If it tasted genuinely good, how likely would you buy it?",
    emoji: { "1": "🙅", "2": "😐", "3": "🤔", "4": "😋", "5": "🤤" },
    reactions: {
      "1": "Tough crowd. We love you anyway.",
      "2": "Lukewarm. Like microwaved tea.",
      "3": "Maybe! The door is open.",
      "4": "Ooh. We'll take it.",
      "5": "Okay, calm down. (Please don't calm down.)",
    },
  },
  Q10: {
    host: "Last one. What would make it a must-buy or a no-go? Rants welcome.",
    emoji: {},
  },
};

export const scaleLabels: Record<string, string> = { "1": "Never", "2": "Meh", "3": "Maybe", "4": "Probably", "5": "Take my money" };

export const freeTextPlaceholders = [
  "e.g. If it tastes like chalk, I'm writing a strongly worded poem.",
  "e.g. Must be fudgy. Not 'fudgy for a protein thing'. Actually fudgy.",
  "e.g. Make a filter coffee one and I'll tell my whole office.",
];

export const ui = {
  next: "Next",
  back: "Back",
  skip: "Skip",
  submit: "Serve my answers",
  submitting: "Plating…",
  required: "This one's mandatory. The mug insists.",
  maxReached: (n: number) => `Plate's full! Max ${n}. Unpick one to swap.`,
  charsLeft: (n: number) => `${n} crumbs of space left`,
  progress: (i: number, n: number) => `Question ${i} of ${n}`,
  welcomeBack: "Welcome back! Your earlier answers are loaded. Change anything you like.",
  error: "The mug dropped something. Try again in a moment?",
  tooFast: "Whoa, speedrun! Take a few more seconds so we know you're human.",
  rateLimited: "Lots of answers from your network this hour. Try again later?",
};

export const done = {
  title: "All done",
  personalityLead: "Your dessert personality is",
  shareLead: "Make your friends take it too. It's only fair.",
  shareText: (personality: string, url: string) =>
    `Took the muggoozz mug cake quiz and apparently I'm "${personality}". Your turn: ${url}`,
  copy: "Copy link",
  copied: "Copied!",
  waitlistTitle: "Want first dibs when it exists?",
  waitlistBody: "Leave an email or WhatsApp number. One message when there's something to taste. That's it.",
  consent: "Yes, contact me about this dessert's launch. I can ask for my details to be deleted any time.",
  whatsappOptin: "Also okay to message me on WhatsApp",
  join: "Save my spot",
  joined: "You're on the list. We'll message once, when there's something to taste.",
  edit: "Change my answers",
};

export type Personality = { id: string; title: string; line: string };

export const personalities: Record<string, Personality> = {
  critic: { id: "critic", title: "The Honest Critic", line: "Tough crowd. Every product needs one of you." },
  detective: { id: "detective", title: "The Label Detective", line: "Nobody fools you. Not even a mug." },
  texture: { id: "texture", title: "The Texture Snob", line: "You can spot a rubbery brownie from across the room." },
  midnight: { id: "midnight", title: "The Midnight Spoon", line: "You and dessert have a standing appointment." },
  macro: { id: "macro", title: "The Shaker Bottle Sage", line: "You read the back of the pack before the front." },
  lazy: { id: "lazy", title: "The Zero-Effort Legend", line: "You want dessert, not a project. Valid." },
  curious: { id: "curious", title: "The Curious Crumb", line: "Open mind, open spoon." },
};
