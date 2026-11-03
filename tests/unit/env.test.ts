import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/env/schema";

describe("parseServerEnv", () => {
  it("allows local development without provider values", () => {
    expect(parseServerEnv({}).APP_ENV).toBe("local");
  });

  it("treats blank values from .env files as missing", () => {
    expect(
      parseServerEnv({ NEXT_PUBLIC_SUPABASE_URL: "" }).NEXT_PUBLIC_SUPABASE_URL,
    ).toBeUndefined();
  });

  it("requires core values in production", () => {
    expect(() => parseServerEnv({ APP_ENV: "production" })).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("accepts a complete production configuration", () => {
    const env = parseServerEnv({
      APP_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://example.com",
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-key",
    });
    expect(env.APP_ENV).toBe("production");
  });

  it("names the variable without echoing its value", () => {
    expect.assertions(2);
    try {
      parseServerEnv({ SENTRY_DSN: "not-a-url-secret" });
    } catch (error) {
      expect(String(error)).toContain("SENTRY_DSN");
      expect(String(error)).not.toContain("not-a-url-secret");
    }
  });
});
