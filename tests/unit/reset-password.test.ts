import { describe, expect, it } from "vitest";
import { resetPasswordSchema } from "@/modules/accounts/schemas";

const passwords = { password: "a-long-password", confirmPassword: "a-long-password" };

describe("password reset input", () => {
  it("works without a code for accounts without two-factor sign-in", () => {
    expect(resetPasswordSchema.safeParse(passwords).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ ...passwords, code: "" }).success).toBe(true);
  });

  it("accepts a 6-digit authenticator code", () => {
    expect(resetPasswordSchema.safeParse({ ...passwords, code: "123456" }).success).toBe(true);
    expect(resetPasswordSchema.safeParse({ ...passwords, code: "12345" }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ ...passwords, code: "abcdef" }).success).toBe(false);
  });
});
