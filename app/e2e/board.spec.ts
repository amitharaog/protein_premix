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
