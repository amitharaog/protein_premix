import { expect, test } from "@playwright/test";

// The launch page shows the product, so it stays behind the board key until the founder approves it line by line.
const KEY = process.env.BOARD_KEY ?? "";

type Page = import("@playwright/test").Page;
const cssVar = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.querySelector(".lp-stage")!).getPropertyValue(n).trim(), name);

const scrollStory = (page: Page, p: number) =>
  page.evaluate((p) => {
    const s = document.getElementById("top")!;
    scrollTo(0, s.offsetTop + (s.offsetHeight - innerHeight) * p);
  }, p);

test("the launch page is private until it is approved, and its 404 gives nothing away", async ({ request }) => {
  const res = await request.get("/launch");
  expect(res.status()).toBe(404);
  expect(await res.text()).not.toMatch(/qixo|protein-based|your own mug|tear, pour/i);
  expect((await request.get("/launch?key=not-the-key-not-the-key-not-the-key")).status()).toBe(404);
});

test("the launch page plays the story as you scroll and ends at the waitlist", async ({ page }) => {
  await page.goto(`/launch?key=${encodeURIComponent(KEY)}`);
  const story = page.locator("#top");
  await expect(page.getByRole("heading", { level: 1, name: "Tear it open" })).toBeVisible();
  await expect(story).toHaveAttribute("data-step", "0");
  await expect(page.getByText("Preview", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "QIXO" })).toBeVisible();
  await expect(page).toHaveTitle(/QIXO/);

  await scrollStory(page, 0.66);
  await expect(story).toHaveAttribute("data-step", "2");
  await expect.poll(() => cssVar(page, "--ovenIn")).toBe("1");
  await expect.poll(() => cssVar(page, "--glow")).toBe("1");

  await scrollStory(page, 1);
  await expect(story).toHaveAttribute("data-step", "3");
  await expect(page.getByRole("heading", { name: "Voilà, dessert" })).toBeVisible();
  await expect.poll(() => cssVar(page, "--finalIn")).toBe("1");
  await expect.poll(() => cssVar(page, "--ovenOut")).toBe("1");

  await page.getByRole("link", { name: "Join the waitlist" }).first().click();
  await expect(page.getByRole("heading", { name: "Be first to taste it" })).toBeInViewport();
  await expect(page.getByRole("button", { name: "Join the waitlist" })).toBeDisabled();
  await expect(page.getByText("Preview: this form switches on when you approve the page.")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
});
