import { describe, expect, it } from "vitest";
import { buildStair, stairPath } from "@/lib/charts/stair";

const BOX = { width: 110, height: 120, left: 5, right: 5, top: 10, bottom: 10 };

describe("buildStair", () => {
  it("keeps only falling L1 prices", () => {
    const points = buildStair([100, 120, 90, 95, 80], BOX);
    expect(points.map((point) => point.paise)).toEqual([100, 90, 80]);
  });

  it("places prices on one linear scale inside the box", () => {
    const points = buildStair([200, 150, 100], BOX);
    expect(points.map((point) => point.y)).toEqual([10, 60, 110]);
    expect(points.map((point) => point.x)).toEqual([5, 55, 105]);
  });

  it("returns nothing without a price change", () => {
    expect(buildStair([100], BOX)).toEqual([]);
    expect(buildStair([100, 100], BOX)).toEqual([]);
  });

  it("draws steps", () => {
    expect(stairPath(buildStair([200, 100], BOX))).toBe("M5 10H105V110");
  });
});
