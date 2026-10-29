import { expect, test } from "@playwright/test";

const key = process.env.BOARD_KEY ?? "";

test("the agent board opens only with its key", async ({ page, request }) => {
  expect((await request.get("/board")).status()).toBe(404);
  expect((await request.get("/board?key=wrong-key-wrong-key-wrong-key")).status()).toBe(404);
  test.skip(key.length < 24, "BOARD_KEY is not set for this run");

  await page.goto(`/board?key=${encodeURIComponent(key)}`);
  await expect(page.getByRole("heading", { name: "Agent board" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "demand-scout" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Road to the demand gate" })).toBeVisible();
});

test("an agent card opens its page with how to run it", async ({ page }) => {
  test.skip(key.length < 24, "BOARD_KEY is not set for this run");
  await page.goto(`/board?key=${encodeURIComponent(key)}`);
  await page.getByRole("link", { name: /^demand-scout/ }).click();
  await expect(page.getByRole("heading", { name: "demand-scout", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "How to run it" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Full instructions" })).toBeVisible();
  expect((await page.request.get("/board/demand-scout")).status()).toBe(404);
  expect((await page.request.get(`/board/not-an-agent?key=${encodeURIComponent(key)}`)).status()).toBe(404);
});
