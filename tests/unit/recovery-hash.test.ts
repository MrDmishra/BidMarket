import { describe, expect, it } from "vitest";
import { parseRecoveryHash } from "@/lib/supabase/recovery-hash";

describe("reset link sign-in", () => {
  it("reads the tokens a reset link carries", () => {
    expect(parseRecoveryHash("#access_token=a&refresh_token=r&type=recovery")).toEqual({
      accessToken: "a",
      refreshToken: "r",
      isRecovery: true,
    });
  });

  it("treats an expired or broken link as no sign-in", () => {
    expect(parseRecoveryHash("#error=access_denied&error_code=otp_expired")).toBeNull();
    expect(parseRecoveryHash("#access_token=a")).toBeNull();
    expect(parseRecoveryHash("")).toBeNull();
  });
});
