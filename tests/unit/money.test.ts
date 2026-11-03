import { describe, expect, it } from "vitest";
import { applyBps, formatInr, rupeesToPaise } from "@/lib/money";

describe("formatInr", () => {
  it("uses Indian digit grouping", () => {
    expect(formatInr(12_500_000)).toBe("₹1,25,000");
    expect(formatInr(10_000_000_000)).toBe("₹10,00,00,000");
  });

  it("shows paise only when present", () => {
    expect(formatInr(60_496)).toBe("₹604.96");
    expect(formatInr(5)).toBe("₹0.05");
    expect(formatInr(-150)).toBe("-₹1.50");
  });

  it("rejects non-integer paise", () => {
    expect(() => formatInr(10.5)).toThrow(RangeError);
  });
});

describe("rupeesToPaise", () => {
  it("avoids floating-point drift", () => {
    expect(rupeesToPaise("1.15")).toBe(115);
    expect(rupeesToPaise("19.99")).toBe(1999);
    expect(rupeesToPaise("1250.5")).toBe(125_050);
  });

  it.each(["", "abc", "1.234", "-5", "1,000"])("rejects %j", (value) => {
    expect(() => rupeesToPaise(value)).toThrow(RangeError);
  });
});

describe("applyBps", () => {
  it("calculates the documented fees", () => {
    expect(applyBps(5_000_000, 10)).toBe(5_000);
    expect(applyBps(5_000, 1_800)).toBe(900);
  });

  it("rounds half up", () => {
    expect(applyBps(50, 1_000)).toBe(5);
    expect(applyBps(5, 1_000)).toBe(1);
    expect(applyBps(4, 1_000)).toBe(0);
  });

  it("rejects invalid input", () => {
    expect(() => applyBps(-1, 10)).toThrow(RangeError);
    expect(() => applyBps(100, 1.5)).toThrow(RangeError);
  });
});
