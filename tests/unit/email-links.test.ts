import { describe, expect, it } from "vitest";
import { emailLinkSchema, linkDestination } from "@/lib/supabase/email-links";

describe("email links", () => {
  it("only lands on known pages", () => {
    expect(linkDestination("/reset-password")).toBe("/reset-password");
    expect(linkDestination("https://evil.example")).toBe("/onboarding");
    expect(linkDestination("//evil.example")).toBe("/onboarding");
    expect(linkDestination(null)).toBe("/onboarding");
  });

  it("sends a reset link to the new password page when no page is named", () => {
    expect(linkDestination(null, "recovery")).toBe("/reset-password");
  });

  it("accepts only known link types", () => {
    expect(emailLinkSchema.safeParse({ token_hash: "abc", type: "recovery" }).success).toBe(true);
    expect(emailLinkSchema.safeParse({ token_hash: "abc", type: "admin" }).success).toBe(false);
    expect(emailLinkSchema.safeParse({ token_hash: "", type: "signup" }).success).toBe(false);
  });
});
