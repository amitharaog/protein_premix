import { expect, test } from "@playwright/test";

test("completes the survey on a phone, logged out, and joins the waitlist", async ({ page }) => {
  await page.goto("/survey?utm_source=e2e");
  await expect(page.getByRole("img", { name: "Ministry of Cravings" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Declare your cravings" })).toBeVisible();
  // The survey never names or describes the product, and says up front that it asks for a name and contact.
  await expect(page.locator("body")).not.toContainText(/muggoozz|premix|sachet|anonymous|mug cake/i);
  await expect(page.getByText(/the Minister asks your name/)).toBeVisible();
  await page.getByRole("button", { name: /^Let.s go/ }).click();

  // Q11, the 10 pm craving: big cards, the Minister reacts, then it moves on by itself.
  await page.getByText("Make something quick at home").click();
  await expect(page.getByText(/A home chef with a spoon and a plan/)).toBeVisible();
  await page.getByText("Late at night", { exact: true }).click(); // Q14 triggers, up to 3
  await page.getByRole("button", { name: "Next →" }).click();
  await page.getByText("Daily", { exact: true }).click(); // Q3, auto-advances
  // Q15 allows 2: a third pick is refused with a note.
  await page.getByText("Chocolate", { exact: true }).click();
  await page.getByText("Mithai", { exact: true }).click();
  await page.getByText("Ice cream", { exact: true }).click();
  await expect(page.getByText(/Max 2/)).toBeVisible();
  await page.getByRole("button", { name: "Next →" }).click();
  await page.getByText("₹100-200", { exact: true }).click(); // Q16 last spend
  await page.getByText("A little guilty").click(); // Q17, how it feels afterwards
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
  await page.getByText("2 minutes, one bowl, no mess").click(); // Q18 effort
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
  await page.getByRole("button", { name: "Next →" }).click();

  // Last step: name and contact are required, with consent.
  await expect(page.getByRole("heading", { name: "Who's declaring these cravings?" })).toBeVisible();
  await page.getByRole("button", { name: "Stamp my answers" }).click();
  await expect(page.getByText("Tell the Minister your name")).toBeVisible();
  await expect(page.getByText("Add a WhatsApp number or an email")).toBeVisible();
  await expect(page.getByText("Tick the box so we can keep your details")).toBeVisible();
  const email = `e2e-${Date.now()}@example.com`;
  await page.getByLabel("Your name").fill("E2E Tester");
  await expect(page.getByText("Tell the Minister your name")).toHaveCount(0); // fixing a field clears its message
  await page.getByLabel("or email").fill(email);
  await page.getByText(/Keep my name, contact and answers/).click();
  await page.getByRole("button", { name: "Stamp my answers" }).click();

  await expect(page.getByText("Your dessert personality is")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "The 2-Minute Chef" })).toBeVisible(); // Q11: makes something at home
  await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", /wa\.me\/\?text=The%20Ministry%20of%20Cravings/);

  await expect(page.getByLabel("Email")).toHaveValue(email); // the waitlist reuses the contact from the last step
  await page.getByRole("button", { name: "Save my spot" }).click();
  await expect(page.getByText(/Tick the box/)).toBeVisible(); // consent is unticked by default
  await page.getByText(/Yes, contact me/).click();
  await page.getByRole("button", { name: "Save my spot" }).click();
  await expect(page.getByText(/on the list/)).toBeVisible();

  // Consent can be withdrawn on the spot: the name and contact go, the answers stay.
  await page.getByRole("button", { name: "Remove my name and contact" }).click();
  await page.getByRole("button", { name: "Yes, delete them" }).click();
  await expect(page.getByText("Done. Your name and contact are deleted.")).toBeVisible();
});

test("admin and the CSV export are closed to people who are not signed in", async ({ page, request }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/signin/);
  expect((await request.get("/admin/export")).status()).toBe(404);
  expect((await request.get("/api/sheet/responses")).status()).toBe(404);
  expect((await request.get("/api/sheet/responses?key=wrong-key-wrong-key-wrong-key")).status()).toBe(404);
  // Names and contacts: only the sheet key opens that feed, never the owner's or the agents' Bearer token.
  expect((await request.get("/api/sheet/contacts")).status()).toBe(404);
  expect((await request.get("/api/sheet/contacts?key=wrong-key-wrong-key-wrong-key")).status()).toBe(404);
  const bearer = process.env.BOARD_KEY ?? "";
  if (bearer.length >= 24) {
    expect((await request.get("/api/sheet/responses", { headers: { authorization: `Bearer ${bearer}` } })).status()).toBe(200);
    expect((await request.get("/api/sheet/contacts", { headers: { authorization: `Bearer ${bearer}` } })).status()).toBe(404);
  }
});
