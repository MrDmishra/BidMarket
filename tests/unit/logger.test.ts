import { describe, expect, it } from "vitest";
import { sanitize } from "@/lib/logger";

describe("sanitize", () => {
  it("redacts sensitive keys at any depth", () => {
    const result = sanitize({
      password: "a",
      otp: "123456",
      company: "Example Pvt Ltd",
      nested: { authorization: "Bearer x", account_number: "1234", pan_enc: "z" },
    });
    expect(result).toEqual({
      password: "[REDACTED]",
      otp: "[REDACTED]",
      company: "Example Pvt Ltd",
      nested: {
        authorization: "[REDACTED]",
        account_number: "[REDACTED]",
        pan_enc: "[REDACTED]",
      },
    });
  });

  it("redacts PAN and Aadhaar patterns in free text", () => {
    expect(sanitize("PAN AAAAA0000A and id 1234 5678 9012")).toBe(
      "PAN [REDACTED] and id [REDACTED]",
    );
  });

  it("stops at circular references", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => JSON.stringify(sanitize(circular))).not.toThrow();
  });

  it("drops stack traces from errors", () => {
    expect(sanitize(new Error("failed"))).toEqual({ name: "Error", message: "failed" });
  });
});
