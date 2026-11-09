// The launch page's scroll story as numbers from 0 to 1, all from one input T: 0 at the top of the page, 4 at the end.
// Step 1 (0-1): the QIXO sachet tears open and pours, and the mug rises in to catch it. Step 2 (1-2): milk goes in.
// Step 3 (2-3): into the microwave; the light comes on and it rises behind the glass. Step 4 (3-4): ding, the camera
// goes through the door, and there is the finished dessert. The page turns these into CSS variables; tests read them.

export type Story = {
  idle: boolean;     // the sachet bobs gently before anything happens
  tear: number;      // the strip rips off the sachet
  tilt: number;      // the sachet tips over the mug
  pour: number;      // the powder stream
  sachetOut: number; // the sachet lifts away
  milkIn: number;    // the photo of the mug rises into place
  milkZoom: number;  // a slow push-in on that photo
  milkOut: number;   // it falls back as the microwave arrives
  ovenIn: number;    // the microwave arrives
  glow: number;      // the light inside comes on
  rise: number;      // the dessert rises behind the glass
  ding: number;      // "Ding!"
  zoom: number;      // the camera pushes through the door
  ovenOut: number;   // the microwave fades as the camera goes through
  finalIn: number;   // the finished dessert
  steam: number;
  sparkle: number;
  swirl: number;     // caramel swirl behind the finished dessert
  hint: number;      // the "scroll" hint on the first screen
  step: 0 | 1 | 2 | 3; // which step's words are showing
};

export const T_END = 4;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Progress through the window [a, b] of T, 0..1. */
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
/** Ease in and out, so nothing starts or stops with a jolt. */
const ease = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

export const stepAt = (t: number): Story["step"] => (t < 0.95 ? 0 : t < 1.95 ? 1 : t < 2.95 ? 2 : 3);

/** With reduced motion, each step jumps straight to a still that tells it. */
export const STILLS = [0.9, 1.6, 2.8, 4] as const;

export function storyAt(t: number): Story {
  t = Math.min(T_END, Math.max(0, t));
  return {
    idle: t < 0.1,
    tear: ease(seg(t, 0.12, 0.4)),
    tilt: ease(seg(t, 0.4, 0.62)),
    pour: seg(t, 0.56, 0.62) * (1 - seg(t, 1.16, 1.24)),
    sachetOut: ease(seg(t, 1.1, 1.34)),
    milkIn: ease(seg(t, 0.66, 1.12)),
    milkZoom: seg(t, 1.12, 2.0),
    milkOut: ease(seg(t, 1.86, 2.08)),
    ovenIn: ease(seg(t, 1.92, 2.2)),
    glow: seg(t, 2.28, 2.38),
    rise: ease(seg(t, 2.34, 2.9)),
    ding: seg(t, 2.9, 2.96) * (1 - seg(t, 3.18, 3.3)),
    zoom: ease(seg(t, 3.0, 3.4)),
    ovenOut: seg(t, 3.18, 3.36),
    finalIn: ease(seg(t, 3.12, 3.46)),
    steam: seg(t, 3.44, 3.68),
    sparkle: seg(t, 3.54, 3.78),
    swirl: ease(seg(t, 3.24, 3.62)),
    hint: 1 - seg(t, 0.02, 0.12),
    step: stepAt(t),
  };
}

/** The story as CSS custom properties (--tear, --tilt, …), rounded so they are cheap to write every frame. */
export function storyVars(s: Story): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(s)) {
    if (k !== "step" && typeof v === "number") out[`--${k}`] = String(Math.round(v * 1000) / 1000);
  }
  return out;
}
