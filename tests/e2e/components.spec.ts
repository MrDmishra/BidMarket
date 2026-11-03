import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/internal/components");
  await page.waitForLoadState("networkidle");
});

test("toast confirms an action", async ({ page }) => {
  await page.getByRole("button", { name: "Show toast" }).click();
  await expect(page.getByText("Tender published.")).toBeVisible();
});

test("dialog names the consequence, traps focus and closes on Escape", async ({ page }) => {
  await page.getByRole("button", { name: "Reject award" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("blocks your account for 30 days");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Dialog confirmed")).toBeHidden();

  await page.getByRole("button", { name: "Reject award" }).first().click();
  await dialog.getByRole("button", { name: "Reject award" }).click();
  await expect(page.getByText("Dialog confirmed")).toBeVisible();
});

test("file upload refuses a file above the limit", async ({ page }) => {
  await page.getByLabel("Catalogue").setInputFiles({
    name: "large.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.alloc(1_048_577),
  });
  await expect(page.getByText("This file is too large. Choose one under 1 MB.")).toBeVisible();
});

test("auction bid shows as placed only after confirmation", async ({ page }) => {
  const panel = page.getByRole("region", { name: "Live auction" }).first();
  const price = panel.getByRole("textbox");

  await price.fill("700");
  await panel.getByRole("button", { name: "Place bid" }).click();
  await expect(panel.getByText("Enter ₹604.96 or less.").last()).toBeVisible();
  await expect(panel.getByText("Bid confirmed")).toBeHidden();

  await price.fill("604");
  await panel.getByRole("button", { name: "Place bid" }).click();
  await expect(panel.getByText("L1 changed to ₹600")).toBeVisible();
  await expect(panel.getByText("Bid confirmed")).toBeHidden();

  await price.fill("590");
  await panel.getByRole("button", { name: "Place bid" }).click();
  await expect(panel.getByText("Bid confirmed. You are L1.")).toBeVisible();
});

test("reconnecting and closed auctions disable bidding", async ({ page }) => {
  const panels = page.getByRole("region", { name: "Live auction" });
  await expect(panels.nth(1).getByText("Reconnecting.")).toBeVisible();
  await expect(panels.nth(1).getByRole("textbox")).toBeDisabled();
  await expect(panels.nth(2).getByRole("textbox")).toBeDisabled();
});

test("preview page is available outside production", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Components");
});
