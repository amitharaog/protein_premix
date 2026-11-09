// The launch page's scroll story as a pure function of one number, T, from 0 (top of the page) to 4 (the end).
// Step 1 (0-1): the sachet tears open and pours into the mug. Step 2 (1-2): milk or water goes in and a spoon stirs.
// Step 3 (2-3): the mug goes into the microwave and rises behind the glass. Step 4 (3-4): ding, out it comes, voilà.
// The page maps scroll position to T and draws the scene from this; unit tests read it directly.

export type Pose = { x: number; y: number; r: number; o: number };

export type Scene = {
  sachet: Pose;          // centre of the sachet, rotation in degrees
  tear: Pose;            // the torn-off strip, relative to the sachet
  torn: number;          // the jagged open edge left on the sachet, 0..1
  idle: boolean;         // the sachet bobs gently before anything happens
  powder: number;        // falling powder stream, 0..1
  fill: number;          // how full the mug is, 0..1
  batter: number;        // 0 = dry powder colour, 1 = stirred batter colour
  jug: Pose;             // milk jug, spout side facing the mug
  milk: number;          // milk stream, 0..1
  spoon: Pose & { stir: boolean };
  mug: { x: number; y: number; s: number }; // bottom centre of the mug, and its scale
  oven: { y: number; o: number };            // microwave slide (px down) and opacity
  door: number;          // 0 = open, 1 = shut
  light: number;         // light inside the microwave, 0..1
  cooking: boolean;      // turntable and display loop
  rise: number;          // the dessert rising out of the mug, 0..1
  ding: number;          // "Ding!" burst, 0..1
  steam: number;         // steam over the finished dessert, 0..1
  sparkle: number;       // sparkles around it, 0..1
  swirl: number;         // caramel swirl behind the last step, 0..1
  hint: number;          // "scroll" hint on the first screen, 0..1
  cam: Cam;              // the part of the board in view: close on the sachet and mug, wide for the microwave
  step: 0 | 1 | 2 | 3;   // which step's words are showing
};

export type Cam = { x: number; y: number; w: number; h: number };
export const CAM_CLOSE: Cam = { x: 120, y: 80, w: 400, h: 600 };
export const CAM_WIDE: Cam = { x: 20, y: 170, w: 560, h: 530 };
export const CAM_FINAL: Cam = { x: 110, y: 236, w: 400, h: 464 };

export const T_END = 4;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Progress through the window [a, b] of T, 0..1. */
const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
const lerp = (a: number, b: number, p: number) => a + (b - a) * p;
/** Ease in and out, so nothing starts or stops with a jolt. */
const ease = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const camLerp = (a: Cam, b: Cam, p: number): Cam => ({ x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w: lerp(a.w, b.w, p), h: lerp(a.h, b.h, p) });

export const stepAt = (t: number): Scene["step"] => (t < 0.95 ? 0 : t < 1.95 ? 1 : t < 2.95 ? 2 : 3);

/** With reduced motion, each step jumps straight to a still that tells it. */
export const STILLS = [0.8, 1.45, 2.85, 4] as const;

export function sceneAt(t: number): Scene {
  t = Math.min(T_END, Math.max(0, t));

  // Step 1: tear, tilt, pour.
  const tearP = ease(seg(t, 0.12, 0.42));
  const tiltP = ease(seg(t, 0.42, 0.62));
  const leaveP = ease(seg(t, 1.02, 1.22));
  const sachet: Pose = {
    x: lerp(300, 250, tiltP) - 260 * leaveP,
    y: lerp(232, 283, tiltP) - 190 * leaveP,
    r: lerp(0, 150, tiltP) + 60 * leaveP,
    o: 1 - seg(t, 1.08, 1.2),
  };
  const tear: Pose = { x: 74 * tearP, y: -64 * tearP, r: 38 * tearP, o: 1 - seg(t, 0.3, 0.44) };
  const powder = seg(t, 0.58, 0.64) * (1 - seg(t, 0.98, 1.06));

  // Step 2: milk, then a stir.
  const jugIn = ease(seg(t, 1.06, 1.24));
  const jugTip = ease(seg(t, 1.24, 1.36)) * (1 - ease(seg(t, 1.6, 1.7)));
  const jugOut = ease(seg(t, 1.68, 1.82));
  const jug: Pose = { x: lerp(720, 455, jugIn) + 320 * jugOut, y: 330, r: -55 * jugTip, o: jugIn * (1 - seg(t, 1.74, 1.82)) };
  const milk = seg(t, 1.35, 1.39) * (1 - seg(t, 1.57, 1.61));
  const spoonIn = ease(seg(t, 1.62, 1.74));
  const spoonOut = ease(seg(t, 1.9, 2.0));
  const spoon = { x: 322, y: lerp(150, 452, spoonIn) - 300 * spoonOut, r: 16, o: spoonIn * (1 - spoonOut), stir: t >= 1.72 && t < 1.92 };
  const fill = 0.55 * ease(seg(t, 0.62, 1.04)) + 0.25 * ease(seg(t, 1.36, 1.6));
  const batter = ease(seg(t, 1.6, 1.92));

  // Step 3: into the microwave, door shut, light on, it rises.
  const ovenIn = ease(seg(t, 1.98, 2.24));
  const ovenOut = ease(seg(t, 3.22, 3.5));
  const oven = { y: lerp(520, 0, ovenIn) + 140 * ovenOut, o: seg(t, 1.98, 2.08) * (1 - seg(t, 3.22, 3.4)) };
  const inP = ease(seg(t, 2.2, 2.48));
  const outP = ease(seg(t, 3.24, 3.6));
  const mug = {
    x: lerp(lerp(300, 237, inP), 300, outP),
    y: lerp(lerp(640, 604, inP), 656, outP),
    s: lerp(lerp(1, 0.62, inP), 1.1, outP),
  };
  const door = ease(seg(t, 2.5, 2.62)) * (1 - ease(seg(t, 3.1, 3.24)));
  const light = seg(t, 2.62, 2.7) * (1 - seg(t, 3.06, 3.16));
  const rise = ease(seg(t, 2.66, 2.98));

  // Step 4: ding, out, voilà.
  const ding = seg(t, 2.98, 3.04) * (1 - seg(t, 3.3, 3.42));
  const cam = camLerp(camLerp(CAM_CLOSE, CAM_WIDE, ovenIn), CAM_FINAL, outP);

  return {
    sachet, tear, torn: seg(t, 0.2, 0.3), idle: t < 0.1, powder, fill, batter, jug, milk, spoon, mug, oven,
    door, light, cooking: t >= 2.64 && t < 3.04, rise, ding,
    steam: seg(t, 3.45, 3.65), sparkle: seg(t, 3.55, 3.75), swirl: seg(t, 3.35, 3.7), hint: 1 - seg(t, 0.02, 0.12),
    cam, step: stepAt(t),
  };
}
