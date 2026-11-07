import { expect, test } from "@playwright/test";

for (const path of [
  "/buyer",
  "/seller",
  "/seller/products",
  "/seller/products/new",
  "/admin",
  "/admin/security",
  "/onboarding",
  "/onboarding/verify",
  "/support",
  "/admin/organisations",
  "/admin/incidents",
  "/admin/tickets",
  "/admin/tenders",
  "/admin/orders",
  "/admin/audit",
]) {
  test(`${path} sends visitors to log in`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Log in");
  });
}

test("log in shows field errors", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByText("Enter an email address such as name@company.com.")).toBeVisible();
  await expect(page.getByText("Enter your password.")).toBeVisible();
});

test("sign-up checks the password", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Email").fill("buyer@example.com");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Use at least 10 characters.")).toBeVisible();
});

test("the callback refuses to redirect to another site", async ({ page }) => {
  await page.goto("/auth/callback?next=https://evil.example");
  await expect(page).toHaveURL(/\/login\?link=expired$/);
  await expect(page.getByText("That link has expired.")).toBeVisible();
});

test("organisation API refuses a visitor", async ({ request }) => {
  const response = await request.post("/api/v1/onboarding/organisation", {
    data: { kind: "buyer", entityType: "company", legalName: "Visitor", acceptedTerms: true },
  });
  expect(response.status()).toBeGreaterThanOrEqual(400);
  expect(await response.text()).not.toContain("organisation_id");
});
