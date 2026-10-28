import { expect, test } from "@playwright/test";

test("completes the survey on a phone, logged out, and joins the waitlist", async ({ page }) => {
  await page.goto("/survey?utm_source=e2e");
  await page.getByRole("button", { name: /^Start/ }).click();

  await page.getByText("Microwave", { exact: true }).click();
  await page.getByRole("button", { name: "Next →" }).click();
  await page.getByRole("button", { name: "Skip" }).click(); // Q2 optional
  await page.getByText("Daily", { exact: true }).click(); // auto-advances
  await page.getByText("Prefer eggless").click();

  // Q5 is required: Next without an answer is refused.
  await expect(page.getByRole("heading", { name: /What would you pay/ })).toBeVisible();
  await page.getByRole("button", { name: "Next →" }).click();
  await expect(page.getByText(/mug insists/)).toBeVisible();
  await page.getByText("₹60-80").click();

  await page.getByText("Vanilla", { exact: true }).click();
  await page.getByRole("button", { name: "Next →" }).click();
  await page.getByRole("button", { name: "Skip" }).click(); // Q7
  await page.getByRole("button", { name: "Skip" }).click(); // Q8
  await page.getByText("Probably").click(); // Q9 → auto-advance to Q10
  await page.getByRole("textbox").fill("Make it fudgy.");
  await page.getByRole("button", { name: "Serve my answers" }).click();

  await expect(page.getByText("Your dessert personality is")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", /wa\.me/);

  await page.getByLabel("Email").fill(`e2e-${Date.now()}@example.com`);
  await page.getByRole("button", { name: "Save my spot" }).click();
  await expect(page.getByText(/Tick the box/)).toBeVisible(); // consent is unticked by default
  await page.getByText(/Yes, contact me/).click();
  await page.getByRole("button", { name: "Save my spot" }).click();
  await expect(page.getByText(/on the list/)).toBeVisible();
});

test("admin is closed to people who are not signed in", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/signin/);
});
