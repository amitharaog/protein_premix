import { expect, test } from "@playwright/test";

test("completes the survey on a phone, logged out, and joins the waitlist", async ({ page }) => {
  await page.goto("/survey?utm_source=e2e");
  await expect(page.getByRole("img", { name: "Ministry of Cravings" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Declare your cravings" })).toBeVisible();
  // The survey never names or describes the product.
  await expect(page.locator("body")).not.toContainText(/muggoozz|premix|sachet/i);
  await page.getByRole("button", { name: /^Let.s go/ }).click();

  // Q11, the 10 pm dilemma: big cards, the Minister reacts, then it moves on by itself.
  await page.getByText("Bake a warm cake in a mug in 2 minutes and indulge").click();
  await expect(page.getByText(/A home chef with a mug and a dream/)).toBeVisible();
  await page.getByText("Daily", { exact: true }).click(); // Q3, auto-advances
  await page.getByRole("button", { name: "Skip" }).click(); // Q2 optional

  // Q12 is a slider: arrow keys move along the stops, and the stops can be tapped.
  await expect(page.getByRole("heading", { name: /How much protein should a dessert have/ })).toBeVisible();
  const slider = page.getByRole("slider");
  for (let i = 0; i < 3; i++) await slider.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuetext", "Like 2 eggs, about 12 g");
  await page.getByRole("button", { name: "A little, about 5 g" }).click();
  await expect(slider).toHaveAttribute("aria-valuetext", "A little, about 5 g");
  await page.getByRole("button", { name: "Next →" }).click();

  await page.getByText("Wait, what's gluten?").click(); // Q13
  await expect(page.getByText(/stretchy protein in wheat dough/)).toBeVisible();
  await page.getByRole("button", { name: "Skip" }).click(); // Q4 optional
  await page.getByText("Microwave", { exact: true }).click(); // Q1 multi
  await page.getByRole("button", { name: "Next →" }).click();
  await page.getByText("Price", { exact: true }).click(); // Q8 multi
  await page.getByRole("button", { name: "Next →" }).click();

  // Q9 is required: Next without an answer is refused.
  await expect(page.getByRole("heading", { name: /How likely are you to buy it/ })).toBeVisible();
  await expect(page.getByText("Which flavours would you try?")).toHaveCount(0);
  await page.getByRole("button", { name: "Next →" }).click();
  await expect(page.getByText(/Minister insists/)).toBeVisible();
  await page.getByText("Probably").click(); // auto-advances to Q5
  await page.getByText("₹100-150").click(); // Q5 → Q10

  await page.getByRole("textbox").fill("Make it fudgy.");
  await page.getByRole("button", { name: "Stamp my answers" }).click();

  await expect(page.getByText("Your dessert personality is")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "The 2-Minute Chef" })).toBeVisible();
  await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", /wa\.me\/\?text=The%20Ministry%20of%20Cravings/);

  await page.getByLabel("Email").fill(`e2e-${Date.now()}@example.com`);
  await page.getByRole("button", { name: "Save my spot" }).click();
  await expect(page.getByText(/Tick the box/)).toBeVisible(); // consent is unticked by default
  await page.getByText(/Yes, contact me/).click();
  await page.getByRole("button", { name: "Save my spot" }).click();
  await expect(page.getByText(/on the list/)).toBeVisible();
});

test("admin and the CSV export are closed to people who are not signed in", async ({ page, request }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/signin/);
  expect((await request.get("/admin/export")).status()).toBe(404);
  expect((await request.get("/api/sheet/responses")).status()).toBe(404);
  expect((await request.get("/api/sheet/responses?key=wrong-key-wrong-key-wrong-key")).status()).toBe(404);
});
