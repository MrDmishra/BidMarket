import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = [
  "/",
  "/categories",
  "/products",
  "/tenders",
  "/how-it-works",
  "/fees",
  "/guides",
  "/faqs",
  "/about",
  "/contact",
  "/terms",
  "/privacy",
  "/refund-policy",
  "/cancellation-policy",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/forbidden",
  "/no-such-page",
  "/internal/components",
];

for (const colorScheme of ["light", "dark"] as const) {
  for (const path of PAGES) {
    test(`${path} passes accessibility and width checks in ${colorScheme}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);

      const { violations } = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        violations.map((violation) => `${violation.id}: ${violation.nodes[0]?.target}`),
      ).toEqual([]);
    });
  }
}

test("legal pages are marked as placeholders", async ({ page }) => {
  for (const path of ["/terms", "/privacy", "/refund-policy", "/cancellation-policy"]) {
    await page.goto(path);
    await expect(page.getByText("A lawyer must draft this page before launch.")).toBeVisible();
  }
});

test("navigation marks the current page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Fees" }).click();
  await expect(page).toHaveURL(/\/fees$/);
  await expect(
    page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Fees" }),
  ).toHaveAttribute("aria-current", "page");
});

test("search sends the term to the product page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox").fill("cable");
  await page.getByRole("searchbox").press("Enter");
  await expect(page).toHaveURL(/\/products\?q=cable$/);
});

test("subscription calculator follows the fee rule", async ({ page }) => {
  await page.goto("/fees");
  const fee = page.getByTestId("subscription-fee");
  await expect(fee).toHaveText("₹26,500");
  await page.getByLabel("Total turnover").fill("25.5");
  await expect(fee).toHaveText("₹25,000");
  await page.getByLabel("Total turnover").fill("abc");
  await expect(page.getByText("Enter a number such as 40.")).toBeVisible();
});
