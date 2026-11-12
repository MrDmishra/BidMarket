import { describe, expect, it } from "vitest";
import { ACCOUNT_LINKS, dashboardHref } from "@/components/layout/account-links";

describe("signed-in navigation", () => {
  it("sends each account to its own dashboard", () => {
    expect(dashboardHref("seller")).toBe("/seller");
    expect(dashboardHref("buyer")).toBe("/buyer");
    expect(dashboardHref("admin")).toBe("/admin");
    expect(dashboardHref(null)).toBe("/onboarding");
  });

  it("always offers a way back to the dashboard, the marketplace and support", () => {
    for (const kind of ["seller", "buyer"] as const) {
      const hrefs = ACCOUNT_LINKS[kind].map((link) => link.href);
      expect(hrefs).toContain(`/${kind}`);
      expect(hrefs).toContain("/products");
      expect(hrefs).toContain("/support");
    }
  });
});
