import { expect, test } from "@playwright/test";

test("rejects a Razorpay webhook without a valid signature", async ({ request }) => {
  const response = await request.post("/api/webhooks/razorpay", {
    data: { event: "payment.captured" },
    headers: { "x-razorpay-signature": "wrong", "x-razorpay-event-id": "evt_test" },
  });
  expect(response.status()).toBe(400);
});

test("rejects the job runner without its secret", async ({ request }) => {
  const response = await request.post("/api/internal/jobs/run");
  expect(response.status()).toBe(401);
});

test("sends visitors away from billing", async ({ page }) => {
  await page.goto("/seller/billing");
  await expect(page).toHaveURL(/\/login$/);
});

test("sends visitors away from orders", async ({ page }) => {
  await page.goto("/buyer/orders");
  await expect(page).toHaveURL(/\/login$/);
});

test("protects order documents from visitors", async ({ request }) => {
  const id = "11111111-1111-4111-8111-111111111111";
  const response = await request.get(`/api/v1/orders/${id}/documents/contract`);
  expect(response.ok()).toBe(false);
  expect(response.headers()["content-type"]).not.toContain("application/pdf");
});

test("sends visitors away from seller tenders", async ({ page }) => {
  await page.goto("/seller/tenders");
  await expect(page).toHaveURL(/\/login$/);
});

test("shows the empty tender list to visitors", async ({ page }) => {
  await page.goto("/tenders");
  await expect(page.getByRole("heading", { name: "Tenders" })).toBeVisible();
});

test("refuses auction bids and live views from visitors", async ({ request }) => {
  const id = "11111111-1111-4111-8111-111111111111";
  const view = await request.get(`/api/v1/seller/tenders/${id}/auction`);
  expect(view.ok()).toBe(false);
  const buyerView = await request.get(`/api/v1/buyer/tenders/${id}/auction`);
  expect(buyerView.ok()).toBe(false);
});
