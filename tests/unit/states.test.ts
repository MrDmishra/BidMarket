import { describe, expect, it } from "vitest";
import { INDIAN_STATES, stateName } from "@/lib/india/states";

describe("Indian states", () => {
  it("uses GST state codes", () => {
    expect(stateName("23")).toBe("Madhya Pradesh");
    expect(stateName("27")).toBe("Maharashtra");
  });

  it("returns nothing for an unknown code", () => {
    expect(stateName("99")).toBe("");
    expect(stateName(null)).toBe("");
  });

  it("has no duplicate codes", () => {
    expect(new Set(INDIAN_STATES.map(([code]) => code)).size).toBe(INDIAN_STATES.length);
  });
});
