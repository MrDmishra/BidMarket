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
