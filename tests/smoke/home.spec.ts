import { expect, test } from "@playwright/test";

test("health answers, with the database reachable", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBe(true);
  expect(await res.json()).toEqual({ ok: true, database: "reachable" });
});

test("a signed-out visitor lands on sign-in at phone width", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
