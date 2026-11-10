import { describe, expect, it } from "vitest";
import { stepAt, STILLS, storyAt, storyVars } from "./timeline";

describe("launch page story", () => {
  it("starts with a whole BRUKN sachet and nothing else on stage", () => {
    const s = storyAt(0);
    expect(s).toMatchObject({ idle: true, tear: 0, tilt: 0, pour: 0, mugZoom: 0, milkIn: 0, ovenIn: 0, finalIn: 0, hint: 1, step: 0 });
  });

  it("tears the sachet, tips it and pours into the mug", () => {
    const s = storyAt(0.8);
    expect(s.tear).toBe(1);
    expect(s.tilt).toBe(1);
    expect(s.pour).toBe(1);
    expect(s.milkIn).toBe(0);
    expect(storyAt(1.3).milkIn).toBe(1);
  });

  it("shows the milk going in once the sachet has gone", () => {
    const s = storyAt(1.6);
    expect(s.sachetOut).toBe(1);
    expect(s.pour).toBe(0);
    expect(s.mugZoom).toBe(1);
    expect(s.milkIn).toBe(1);
    expect(s.milkOut).toBe(0);
    expect(s.ovenIn).toBe(0);
    expect(s.step).toBe(1);
  });

  it("cooks with the light on and the dessert rising behind the glass", () => {
    const s = storyAt(2.7);
    expect(s.milkOut).toBe(1);
    expect(s.mugOut).toBe(1);
    expect(s.ovenIn).toBe(1);
    expect(s.glow).toBe(1);
    expect(s.rise).toBeGreaterThan(0.5);
    expect(s.zoom).toBe(0);
    expect(s.step).toBe(2);
  });

  it("dings, goes through the door and ends on the finished dessert", () => {
    expect(storyAt(3.05).ding).toBe(1);
    const s = storyAt(4);
    expect(s).toMatchObject({ ding: 0, zoom: 1, ovenOut: 1, finalIn: 1, steam: 1, sparkle: 1, swirl: 1, step: 3 });
  });

  it("only moves forward: nothing that arrives ever goes back", () => {
    const keys = ["tear", "tilt", "sachetOut", "mugZoom", "milkIn", "milkOut", "mugOut", "ovenIn", "glow", "rise", "zoom", "ovenOut", "finalIn"] as const;
    let prev = storyAt(0);
    for (let t = 0.01; t <= 4; t += 0.01) {
      const s = storyAt(t);
      for (const k of keys) expect(s[k], `${k} at ${t.toFixed(2)}`).toBeGreaterThanOrEqual(prev[k] - 1e-9);
      prev = s;
    }
  });

  it("turns the story into CSS variables, without the step", () => {
    const v = storyVars(storyAt(0.8));
    expect(v["--tear"]).toBe("1");
    expect(v["--pour"]).toBe("1");
    expect(v["--step"]).toBeUndefined();
    expect(v["--idle"]).toBeUndefined();
  });

  it("keeps the words and the reduced-motion stills on the right step", () => {
    expect([0, 0.94, 0.96, 1.94, 1.96, 2.94, 2.96, 4].map(stepAt)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect(STILLS.map(stepAt)).toEqual([0, 1, 2, 3]);
    expect(storyAt(-1)).toEqual(storyAt(0));
    expect(storyAt(9)).toEqual(storyAt(4));
  });
});
