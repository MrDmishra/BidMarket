import { describe, expect, it } from "vitest";
import { countdownTone, formatRemaining } from "@/lib/time/countdown";

describe("formatRemaining", () => {
  it.each([
    [0, "Ended"],
    [-5, "Ended"],
    [45_000, "00m 45s"],
    [3_725_000, "1h 02m 05s"],
    [176_400_000, "2d 1h"],
  ])("formats %d ms", (remaining, expected) => {
    expect(formatRemaining(remaining)).toBe(expected);
  });
});

describe("countdownTone", () => {
  it.each([
    [600_000, "normal"],
    [599_999, "warn"],
    [60_000, "warn"],
    [59_999, "bad"],
    [0, "ended"],
  ])("gives %d ms the right tone", (remaining, expected) => {
    expect(countdownTone(remaining)).toBe(expected);
  });
});
