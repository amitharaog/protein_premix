import { describe, expect, it } from "vitest";
import { CAM_CLOSE, CAM_FINAL, CAM_WIDE, sceneAt, stepAt, STILLS } from "./timeline";

describe("launch page story", () => {
  it("starts with a whole sachet over an empty mug", () => {
    const s = sceneAt(0);
    expect(s.tear.o).toBe(1);
    expect(s.sachet).toMatchObject({ x: 300, r: 0, o: 1 });
    expect(s.powder).toBe(0);
    expect(s.fill).toBe(0);
    expect(s.oven.o).toBe(0);
    expect(s.idle).toBe(true);
    expect(s.cam).toEqual(CAM_CLOSE);
    expect(s.step).toBe(0);
  });

  it("tears the sachet, tips it and pours into the mug", () => {
    const s = sceneAt(0.8);
    expect(s.tear.o).toBe(0);
    expect(s.torn).toBe(1);
    expect(s.sachet.r).toBeCloseTo(150);
    expect(s.powder).toBe(1);
    expect(s.fill).toBeGreaterThan(0.1);
    expect(sceneAt(1.05).fill).toBeCloseTo(0.55);
  });

  it("adds milk, then stirs until it turns to batter", () => {
    expect(sceneAt(1.45).milk).toBe(1);
    expect(sceneAt(1.45).jug.o).toBe(1);
    expect(sceneAt(1.45).sachet.o).toBe(0);
    const stir = sceneAt(1.8);
    expect(stir.spoon.stir).toBe(true);
    expect(stir.milk).toBe(0);
    expect(sceneAt(1.95).batter).toBe(1);
  });

  it("cooks behind a shut door with the light on, and the dessert rises", () => {
    const s = sceneAt(2.85);
    expect(s.oven.o).toBe(1);
    expect(s.door).toBe(1);
    expect(s.light).toBe(1);
    expect(s.cooking).toBe(true);
    expect(s.mug.s).toBeCloseTo(0.62);
    expect(s.rise).toBeGreaterThan(0.5);
    expect(s.cam).toEqual(CAM_WIDE);
    expect(s.step).toBe(2);
  });

  it("dings, opens and ends on the finished dessert", () => {
    expect(sceneAt(3.02).ding).toBeGreaterThan(0);
    const s = sceneAt(4);
    expect(s.oven.o).toBe(0);
    expect(s.door).toBe(0);
    expect(s.light).toBe(0);
    expect(s.rise).toBe(1);
    expect(s.steam).toBe(1);
    expect(s.mug).toEqual({ x: 300, y: 656, s: 1.1 });
    expect(s.cam).toEqual(CAM_FINAL);
    expect(s.step).toBe(3);
  });

  it("only ever moves forward: the mug fills and the dessert rises without going back", () => {
    let fill = 0;
    let rise = 0;
    for (let t = 0; t <= 4; t += 0.01) {
      const s = sceneAt(t);
      expect(s.fill).toBeGreaterThanOrEqual(fill - 1e-9);
      expect(s.rise).toBeGreaterThanOrEqual(rise - 1e-9);
      fill = s.fill;
      rise = s.rise;
    }
  });

  it("keeps the words and the stills for reduced motion on the right step", () => {
    expect([0, 0.94, 0.96, 1.94, 1.96, 2.94, 2.96, 4].map(stepAt)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect(STILLS.map(stepAt)).toEqual([0, 1, 2, 3]);
    expect(sceneAt(-1)).toEqual(sceneAt(0));
    expect(sceneAt(9)).toEqual(sceneAt(4));
  });
});
