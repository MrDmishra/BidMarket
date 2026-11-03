import { expect, test } from "@playwright/test";

test("home page shows the brand and an example auction", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("sellers compete");
  await expect(page.getByText("Illustration with example prices")).toBeVisible();
  const fonts = await page.evaluate(() =>
    document.fonts.ready.then(() => document.fonts.check('16px "Instrument Sans Variable"')),
  );
  expect(fonts).toBe(true);
});

test("the page never scrolls sideways", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("dark theme follows the system setting", async ({ page }) => {
  const background = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  const light = await background();
  await page.emulateMedia({ colorScheme: "dark" });
  expect(await background()).not.toBe(light);
});

test("an explicit light theme overrides a dark system setting", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(background).toBe("rgb(240, 245, 242)");
});

for (const path of ["/login", "/signup", "/forbidden"]) {
  test(`base route ${path} loads`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
}

test("unknown routes show the 404 page", async ({ page }) => {
  const response = await page.goto("/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("We can't find this page");
});

test("health endpoint uses the API envelope", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.data).toEqual({ status: "ok", app: "ok", supabase: "not_configured" });
  expect(body.meta.requestId).toMatch(/^req_/);
});
