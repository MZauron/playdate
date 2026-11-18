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
  // Q26: the Share buttons open the phone's share sheet. Here the "sheet" keeps what was shared, so the test can read it.
  await page.addInitScript(() => {
    const shared: string[] = [];
    Object.assign(window, { __shared: shared });
    Object.defineProperty(navigator, "share", { configurable: true, value: async (data: { text?: string }) => void shared.push(data.text ?? "") });
  });
  const lastShared = () => page.evaluate(() => (window as unknown as { __shared: string[] }).__shared.at(-1) ?? "");

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
  await expect(page.locator("body")).not.toContainText("555"); // no friend's number anywhere (Q26)
  await page.getByRole("button", { name: "Share with Dee" }).click();
  await expect(page.getByRole("button", { name: "✓ Shared with Dee" })).toBeVisible();
  const body = await lastShared();
  expect(body.startsWith("Park on the weekend?\n\n")).toBe(true); // the message exactly as typed, then the link (KD-05)
  const token = body.match(/\/r\/([A-Za-z0-9_-]{22})$/)?.[1];
  expect(token).toBeTruthy();

  // 3. The organizer opens the playdate and waits for the live connection.
  await page.getByRole("link", { name: "Back to Home" }).click();
  await page.getByRole("link", { name: /Leo & Ava/ }).click();
  await expect(page.getByText("0 of 1 answered")).toBeVisible();
  // Preview what friends see (T27): the friend's page with the answer buttons disabled, then back.
  await page.getByRole("link", { name: "Preview what friends see" }).click();
  await expect(page.getByText("Preview: this is what friends see. Nothing here is sent.")).toBeVisible();
  await expect(page.getByText("Park on the weekend?")).toBeVisible();
  await expect(page.getByRole("button", { name: "We're in!" })).toBeDisabled();
  await page.getByRole("link", { name: "← Back to your playdate" }).click();
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

  // 5. The organizer sees it without reloading, confirms, and gets the Share buttons for the news.
  await expect(page.getByText("1 of 1 answered")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("1 family can come: Dee")).toBeVisible();
  await page.getByRole("button", { name: /^Confirm · / }).click();
  await expect(page.getByRole("heading", { name: "✓ Update sent" })).toBeVisible();
  await page.getByRole("button", { name: "Share with Dee" }).click();
  expect(await lastShared()).toContain("It's on! 🎉 See you");

  // 6. The friend's page now says it's on.
  await friend.reload();
  await expect(friend.getByText(/It's on! 🎉 See you/)).toBeVisible();
  await expect(friend.getByText("Confirmed", { exact: true })).toBeVisible();
  await expect(friend.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy"); // T24, for friends too

  // 7. Delete my account (T24): from the Profile tab (T39), asked first; the organizer's playdate and the friend's link go with it.
  // The playdate page reads itself again a few seconds after going live; that refresh can interrupt this jump, so it may try again.
  await expect(async () => {
    await page.goto("/");
  }).toPass({ timeout: 20_000 });
  await page.getByRole("link", { name: "Profile" }).click();
  await expect(page.getByRole("link", { name: "Privacy and your data" })).toHaveAttribute("href", "/privacy");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expect(page.getByRole("alertdialog", { name: "Delete your account?" })).toBeVisible();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete my account" }).click();
  await expect(page).toHaveURL(/\/sign-in\?deleted=1$/);
  await expect(page.getByText("Your account and everything in it are deleted.")).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/); // signed out on this device
  await friend.reload();
  await expect(friend.getByRole("heading", { name: "This link doesn't work" })).toBeVisible();
  await friendContext.close();
});
