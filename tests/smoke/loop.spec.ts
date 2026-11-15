// The Phase 1 loop end to end (T11), with fakes: a parent signs up, adds a friend, plans (a place found by search, T17) and sends;
// the friend answers from their link in a separate browser with no account; the organizer sees it live and confirms; the friend sees
// it's on. Nothing is texted: the test reads the friend's link from the organizer's Text button, as a phone would open it.
import { devices, expect, test } from "@playwright/test";
import { resetSmokeAccount, smokePhone } from "./reset";

const ZONE = "America/Toronto";
test.use({ timezoneId: ZONE, locale: "en-CA" });
test.beforeEach(({}, testInfo) => resetSmokeAccount(smokePhone(testInfo.retry))); // every attempt, retries included, signs up from nothing

/** A day a few days ahead, as the date picker takes it. */
function dayAhead(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

test("sign up, invite a friend by text link, the friend answers, the organizer sees it live and confirms", async ({ page, browser }, testInfo) => {
  // 1. Sign in with the smoke test number (fixed code, nothing sent) and finish Setup.
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.getByLabel("Your phone number").fill(smokePhone(testInfo.retry).slice(1)); // without the leading 1
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByLabel("6-digit code").fill("123456");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/setup$/);
  await page.getByLabel("Your first name").fill("Sam");
  await page.getByLabel("Child's first name").fill("Leo");
  await page.getByLabel("Age").selectOption("5");
  await page.getByRole("button", { name: "Get started" }).click();
  await expect(page.getByRole("heading", { name: "Welcome, Sam" })).toBeVisible();

  // 2. Plan: add a friend on the spot, pick a time, write a message, send.
  await page.getByRole("link", { name: "Plan a playdate" }).click();
  await page.getByRole("button", { name: "+ Add a friend" }).click();
  await page.getByLabel("Parent's name").fill("Dee Friend");
  await page.getByLabel("Child's first name").fill("Ava");
  await page.getByLabel("Phone number").fill("416 555 0177");
  await page.getByRole("button", { name: "Add friend" }).click();
  // A friend added here is selected right away (C2).
  await expect(page.getByRole("button", { name: /Ava's parent/ })).toHaveAttribute("aria-pressed", "true");

  await page.getByLabel("Date").fill(dayAhead(3));
  await page.getByRole("button", { name: "Done" }).click();
  // Find a place (T17, fake provider): a quick chip, then Select. Only the provider's id is stored.
  await page.getByRole("button", { name: "Find a place" }).click();
  await page.getByRole("button", { name: "Parks", exact: true }).click();
  await page.getByRole("button", { name: "Select High Park" }).click();
  await expect(page.getByRole("button", { name: "Change place" })).toBeVisible();
  await page.getByLabel("Message to the parents").fill("Park on the weekend?");
  await page.getByRole("button", { name: "Send invite" }).click();

  await expect(page.getByRole("heading", { name: "Your invite is ready" })).toBeVisible();
  const href = await page.getByRole("link", { name: "Text Dee" }).getAttribute("href");
  expect(href).toMatch(/^sms:\+14165550177\?&body=/);
  const body = decodeURIComponent(href!.split("body=")[1]!);
  expect(body.startsWith("Park on the weekend?\n\n")).toBe(true); // the message exactly as typed, then the link (KD-05)
  const token = body.match(/\/r\/([A-Za-z0-9_-]{22})$/)?.[1];
  expect(token).toBeTruthy();

  // 3. The organizer opens the playdate and waits for the live connection.
  await page.getByRole("link", { name: "Back to Home" }).click();
  await page.getByRole("link", { name: /Playdate: Leo & Ava/ }).click();
  await expect(page.getByText("0 of 1 answered")).toBeVisible();
  await expect(page.getByText("· Live")).toBeVisible({ timeout: 20_000 });

  // 4. The friend, with no account, answers from the link in their own browser.
  const friendContext = await browser.newContext({ ...devices["iPhone 13"], timezoneId: ZONE, locale: "en-CA" });
  const friend = await friendContext.newPage();
  await friend.goto(`/r/${token}`);
  await expect(friend.getByText("Sam · Leo's parent")).toBeVisible();
  await expect(friend.getByText("Park on the weekend?")).toBeVisible();
  await expect(friend.getByText("High Park", { exact: true })).toBeVisible();
  await friend.getByRole("button", { name: "We're in!" }).click();
  await expect(friend.getByText("Thanks! Your answer is in")).toBeVisible();

  // 5. The organizer sees it without reloading, confirms, and gets the Text buttons for the news.
  await expect(page.getByText("1 of 1 answered")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("1 family can come: Dee")).toBeVisible();
  await page.getByRole("button", { name: "Confirm and send update" }).click();
  await expect(page.getByRole("heading", { name: "✓ Update sent" })).toBeVisible();
  const news = await page.getByRole("link", { name: "Text Dee" }).getAttribute("href");
  expect(decodeURIComponent(news!)).toContain("It's on! 🎉 See you");

  // 6. The friend's page now says it's on.
  await friend.reload();
  await expect(friend.getByText(/It's on! 🎉 See you/)).toBeVisible();
  await expect(friend.getByText("Confirmed", { exact: true })).toBeVisible();
  await friendContext.close();
});
