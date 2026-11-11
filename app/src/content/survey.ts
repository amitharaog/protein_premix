// Playful copy around the survey. Question wording itself comes from the survey_questions table
// (seed/survey_questions.json). Rules: no product name, no product description, no health claims and no
// banned words (see docs/COMPLIANCE.md; enforced by src/content/content.test.ts). The host is a made-up
// "Minister of Cravings", so the survey asks about people's habits and never pitches a product. Since
// 8 Nov 2026 it is not anonymous: the last step asks for a name and contact, and the copy says so up front.

export const intro = {
  kicker: (n: number) => `${n} questions · 3 min · no login`,
  ribbon: "Official dessert census",
  est: "Est. MMXXVI", // the made-up ministry was founded in 2026
  badges: [["Zero", "login"], ["Mildly", "official"]] as [string[], string[]],
  host: "Good evening. I'm the Minister of Cravings, and I have questions. Mostly about dessert.",
  headline: "Declare your cravings",
  sub: "No right answers. A few funny ones.",
  agendaTitle: "Today's agenda",
  agenda: ["The 10 pm dilemma", "Your sweet-tooth triggers", "Your official dessert personality"],
  contactNote: "At the end, the Minister asks your name and a WhatsApp number or email.",
  secret: "Finish the census to unlock the Ministry's secret project.",
  cta: "Let's go",
  purpose:
    "We store your answers, your name and contact, the link you came from, and a scrambled version of your IP that only stops bots. Purpose: research for a new dessert idea, and following up with you about it. The Ministry is a joke; the research is real. Your details are never sold or shared, and you can delete them any time: on the last screen, or by replying to any message from us.",
};

// The last step: name and contact are required since 8 Nov 2026 (founder request). Stored apart from the answers.
export const contactStep = {
  label: "Last step",
  host: "Before I stamp this: who's declaring? The Ministry likes to know its citizens.",
  title: "Who's declaring these cravings?",
  hint: "Your name, and a WhatsApp number or an email. One of the two is enough.",
  name: "Your name",
  phone: "WhatsApp number",
  phonePlaceholder: "98xxxxxxxx",
  email: "or email",
  consent: "Keep my name, contact and answers, and contact me about this research. I can ask for them to be deleted any time.",
  whatsapp: "WhatsApp messages are fine",
  honest: "The Ministry is a joke; the person behind it is real: someone in Bengaluru researching a new dessert idea. Your details go only to them. Never sold, never shared.",
  errors: {
    name: "Tell the Minister your name",
    nameLong: "Keep it under 80 characters",
    contact: "Add a WhatsApp number or an email",
    phone: "Enter a 10-digit Indian mobile number",
    email: "That email looks off",
    consent: "Tick the box so we can keep your details",
  },
};

export type QuestionCopy = {
  host: string; // what the Minister says while you read the question
  emoji: Record<string, string>; // option → emoji
  reactions?: Record<string, string>; // option → what the Minister says when you pick it
  style?: "cards" | "slider"; // cards: big scenario cards; slider: drag along the options in order
  short?: Record<string, string>; // option → short label under a slider stop
};

export const questionCopy: Record<string, QuestionCopy> = {
  Q11: {
    host: "Order, order! First, a moral dilemma.",
    style: "cards",
    emoji: {
      "Make something quick at home": "🥣",
      "Order in (Swiggy, Zomato, Blinkit)": "🛵",
      "Eat whatever sweet is already at home": "🍪",
      "Nothing. I wait it out.": "🧘",
    },
    reactions: {
      "Make something quick at home": "A home chef with a spoon and a plan. Noted.",
      "Order in (Swiggy, Zomato, Blinkit)": "The delivery app knows your order by heart, doesn't it?",
      "Eat whatever sweet is already at home": "Biscuits dunked in anything. Resourceful.",
      "Nothing. I wait it out.": "Your willpower deserves its own documentary.",
    },
  },
  Q14: {
    host: "Every craving has a trigger. Confess yours. Pick up to 3.",
    emoji: {
      "Right after lunch or dinner": "🍛",
      "Late at night": "🌙",
      "Stress or a rough day": "😤",
      "Boredom or scrolling": "📱",
      "Chai or coffee time": "☕",
      "After a workout": "🏃",
      "Celebrating or treating myself": "🎉",
      "That time of the month": "🌸",
    },
    reactions: {
      "Right after lunch or dinner": "A meal isn't over until something sweet says so.",
      "Late at night": "The 11 pm fridge visit. A classic.",
      "Stress or a rough day": "Dessert as therapy. Valid.",
      "Boredom or scrolling": "Scroll, crave, repeat.",
      "Chai or coffee time": "Chai without something sweet is just hot water.",
      "After a workout": "Earned it. Obviously.",
      "That time of the month": "Respect. Pass the chocolate.",
    },
  },
  Q15: {
    host: "Name your usual suspects. Pick up to 2.",
    emoji: {
      Chocolate: "🍫",
      "Ice cream": "🍦",
      Mithai: "🟠",
      "Biscuits or cookies": "🍪",
      "Bakery cake, brownie or pastry": "🍰",
      "Protein bar": "🥜",
      "Homemade dessert": "🏠",
    },
    reactions: {
      Mithai: "Kaju katli supremacy, we assume.",
      "Protein bar": "Chewy, chalky, convenient. We know.",
      "Ice cream": "Brain freeze is a small price.",
      "Homemade dessert": "Someone at home is a legend.",
    },
  },
  Q16: {
    host: "Receipts, please. Roughly is fine.",
    emoji: { "Under ₹50": "🪙", "₹50-100": "💵", "₹100-200": "💸", "₹200 or more": "💎", "Can't remember": "🤷" },
    reactions: {
      "Under ₹50": "A thrifty sweet tooth. Smart.",
      "₹200 or more": "Treat-yourself energy. Respect.",
      "Can't remember": "Spent and forgotten. The best kind.",
    },
  },
  Q17: {
    host: "And afterwards? Be honest, the Ministry won't tell.",
    style: "cards",
    emoji: { "Happy. Zero regrets.": "😌", "A little guilty": "😬", "Guilty enough to skip it next time": "🙈" },
    reactions: {
      "Happy. Zero regrets.": "As it should be.",
      "A little guilty": "The guilt shows up right after the last bite. Classic.",
      "Guilty enough to skip it next time": "That's a lot of guilt for one brownie. We hear you.",
    },
  },
  Q18: {
    host: "Effort check. How much work is a dessert worth?",
    emoji: {
      "None. Ready to eat or nothing": "🛋️",
      "2 minutes, one bowl, no mess": "⏱️",
      "10-15 minutes is fine": "🍳",
      "I enjoy proper baking": "🎂",
    },
    reactions: {
      "None. Ready to eat or nothing": "Couch mode. Understood.",
      "2 minutes, one bowl, no mess": "Fast and clean. A person of efficiency.",
      "I enjoy proper baking": "A real baker! The oven salutes you.",
    },
  },
  Q1: {
    host: "Quick kitchen audit. No judgement. Okay, mild judgement.",
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
    host: "Next. How often does your sweet tooth text you?",
    emoji: { Daily: "🚨", "3-5 times a week": "🌙", "1-2 times a week": "📆", Rarely: "🧊" },
    reactions: {
      Daily: "Daily. Same. We're in this together.",
      "3-5 times a week": "A respectable schedule.",
      "1-2 times a week": "Disciplined. Slightly suspicious.",
      Rarely: "Rarely? Blink twice if you need help.",
    },
  },
  Q12: {
    host: "Slide the spoon. How much protein makes a dessert worth it?",
    style: "slider",
    emoji: {
      "Don't care, dessert is dessert": "🍰",
      "A little, about 5 g": "🤏",
      "Like 2 eggs, about 12 g": "🥚",
      "Like a protein bar, about 20 g": "🍫",
      "Like a scoop of whey, 25 g or more": "🥤",
    },
    short: {
      "Don't care, dessert is dessert": "Don't care",
      "A little, about 5 g": "~5 g",
      "Like 2 eggs, about 12 g": "~12 g",
      "Like a protein bar, about 20 g": "~20 g",
      "Like a scoop of whey, 25 g or more": "25 g+",
    },
    reactions: {
      "Don't care, dessert is dessert": "A purist. Dessert should taste like dessert, full stop.",
      "A little, about 5 g": "A small bonus. Nice, not needy.",
      "Like 2 eggs, about 12 g": "Two eggs' worth. Very sensible.",
      "Like a protein bar, about 20 g": "Protein bar territory. Serious business.",
      "Like a scoop of whey, 25 g or more": "A full scoop?! The shaker bottle just blushed.",
    },
  },
  Q13: {
    host: "Gluten time. The Ministry takes no sides.",
    emoji: {
      "I can't have gluten (allergy or intolerance)": "🚫",
      "I'd pick gluten-free if I had the choice": "🌾",
      "Don't mind either way": "🤷",
      "Wait, what's gluten?": "🤔",
    },
    reactions: {
      "I can't have gluten (allergy or intolerance)": "Noted in permanent ink. Your tummy makes the rules.",
      "I'd pick gluten-free if I had the choice": "Choosy. We respect choosy.",
      "Don't mind either way": "Easygoing. The Ministry approves.",
      "Wait, what's gluten?": "It's the stretchy protein in wheat dough. You're welcome.",
    },
  },
  Q4: {
    host: "An eggs-istential question.",
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
      "₹150+": "Big spender. The Minister is blushing.",
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
    host: "Now picture it. Really picture it.",
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
    host: "Last one. Must-buy or hard no? Rants welcome.",
    emoji: {},
  },
};

/** Copy for a question that has none here (a new question added in the database first): it still shows. */
export const fallbackCopy: QuestionCopy = { host: "The Ministry would like to know.", emoji: {} };

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
  submit: "Stamp my answers",
  submitting: "Stamping…",
  required: "This one's mandatory. The Minister insists.",
  maxReached: (n: number) => `Plate's full! Max ${n}. Unpick one to swap.`,
  charsLeft: (n: number) => `${n} crumbs of space left`,
  progress: (i: number, n: number) => `Question ${i} of ${n}`,
  sliderPrompt: "Drag the spoon, or tap a stop",
  welcomeBack: "Welcome back! Your earlier answers are loaded. Change anything you like.",
  error: "The Ministry dropped a file. Try again in a moment?",
  tooFast: "Whoa, speedrun! Take a few more seconds so we know you're human.",
  rateLimited: "Lots of answers from your network this hour. Try again later?",
};

export const done = {
  title: "All done",
  personalityLead: "By order of the Ministry, your dessert personality is",
  stamp: "Official",
  shareLead: "Make your friends take it too. It's only fair.",
  shareText: (personality: string, url: string) =>
    `The Ministry of Cravings has ruled: I'm "${personality}". Declare your cravings and get yours: ${url}`,
  copy: "Copy link",
  copied: "Copied!",
  waitlistTitle: "Want a spot in the first batch?",
  waitlistBody: "Your details from the last step are already in. Tick the box and you're on the list. One message when there's something to taste.",
  consent: "Yes, contact me about this dessert's launch. I can ask for my details to be deleted any time.",
  whatsappOptin: "Also okay to message me on WhatsApp",
  join: "Save my spot",
  joined: "You're on the list. We'll message once, when there's something to taste.",
  joinedNumber: (n: number) => `You're number ${n} on the list. We'll message once, when there's something to taste.`,
  peerTitle: "The census so far",
  peerSub: (n: number) => `Live from ${n} citizens. Your answer is marked.`,
  peerYou: "You",
  peerSame: (p: number) => `${p}% of citizens are with you on this one.`,
  edit: "Change my answers",
  forget: "Remove my name and contact",
  forgetConfirm: "Delete your name and contact? Your answers stay, without them.",
  forgetYes: "Yes, delete them",
  forgotten: "Done. Your name and contact are deleted.",
  forgetNo: "Keep them",
  forgetError: "Couldn't delete them just now. Try again?",
};

export type Personality = { id: string; title: string; line: string };

export const personalities: Record<string, Personality> = {
  critic: { id: "critic", title: "The Honest Critic", line: "Tough crowd. Every dessert needs one of you." },
  detective: { id: "detective", title: "The Label Detective", line: "Nobody fools you. Not even dessert." },
  texture: { id: "texture", title: "The Texture Snob", line: "You can spot a rubbery brownie from across the room." },
  chef: { id: "chef", title: "The 2-Minute Chef", line: "Why order when you can whip it up in your pyjamas?" },
  sheepish: { id: "sheepish", title: "The Sheepish Snacker", line: "You order the dessert, then apologise to it. Relatable." },
  unbothered: { id: "unbothered", title: "The Unbothered Indulger", line: "Dessert happens. You don't explain yourself." },
  raider: { id: "raider", title: "The Pantry Raider", line: "Biscuits, chocolate, a spoon of something. You make it work." },
  monk: { id: "monk", title: "The Dessert Monk", line: "Cravings knock. You don't answer. Respect." },
  comfort: { id: "comfort", title: "The Comfort Spooner", line: "Rough day? Spoon first, questions later." },
  chai: { id: "chai", title: "The Chai-Time Dunker", line: "No cup of chai goes unaccompanied on your watch." },
  midnight: { id: "midnight", title: "The Midnight Spoon", line: "You and dessert have a standing appointment." },
  macro: { id: "macro", title: "The Shaker Bottle Sage", line: "You read the back of the pack before the front." },
  lazy: { id: "lazy", title: "The Zero-Effort Legend", line: "You want dessert, not a project. Valid." },
  curious: { id: "curious", title: "The Curious Crumb", line: "Open mind, open spoon." },
};
