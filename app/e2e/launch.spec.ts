import { expect, test } from "@playwright/test";

// The launch page shows the product, so it stays behind the board key until the founder approves it line by line.
const KEY = process.env.BOARD_KEY ?? "";

const scrollStory = (page: import("@playwright/test").Page, p: number) =>
  page.evaluate((p) => {
    const s = document.getElementById("top")!;
    scrollTo(0, s.offsetTop + (s.offsetHeight - innerHeight) * p);
  }, p);

test("the launch page is private until it is approved", async ({ request }) => {
  expect((await request.get("/launch")).status()).toBe(404);
  expect((await request.get("/launch?key=not-the-key-not-the-key-not-the-key")).status()).toBe(404);
});

test("the launch page plays the story as you scroll and ends at the waitlist", async ({ page }) => {
  await page.goto(`/launch?key=${encodeURIComponent(KEY)}`);
  const story = page.locator("#top");
  await expect(page.getByRole("heading", { level: 1, name: "Tear it open" })).toBeVisible();
  await expect(story).toHaveAttribute("data-step", "0");
  await expect(page.getByText("Preview", { exact: false }).first()).toBeVisible();

  await scrollStory(page, 0.66);
  await expect(story).toHaveAttribute("data-step", "2");
  await expect(page.locator('[data-part="ovenFront"]')).toHaveAttribute("opacity", "1");
  await expect(page.locator('[data-part="door"]')).toHaveAttribute("transform", /scale\(1 1\)/);

  await scrollStory(page, 1);
  await expect(story).toHaveAttribute("data-step", "3");
  await expect(page.getByRole("heading", { name: "Voilà, dessert" })).toBeVisible();
  await expect(page.locator('[data-part="ovenFront"]')).toHaveAttribute("opacity", "0");

  await page.getByRole("link", { name: "Join the waitlist" }).first().click();
  await expect(page.getByRole("heading", { name: "Be first to taste it" })).toBeInViewport();
  await expect(page.getByRole("button", { name: "Join the waitlist" })).toBeDisabled();
  await expect(page.getByText("Preview: this form switches on when you approve the page.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
});
