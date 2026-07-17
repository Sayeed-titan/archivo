import { test, expect } from "@playwright/test";
import { DEMO_USERS, login } from "./fixtures/auth";

test.describe("login @smoke", () => {
  test("valid credentials reach the dashboard", async ({ page }) => {
    await login(page, DEMO_USERS.admin);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("link", { name: "New Archive" }).first()).toBeVisible();
  });

  test("invalid credentials show an error and keep the user on the login page", async ({ page }) => {
    await page.goto("/login");
    await page.fill('input[name="email"]', DEMO_USERS.admin.email);
    await page.fill('input[name="password"]', "wrong-password");
    await page.click('button[type="submit"]');

    await expect(page.getByText(/invalid email or password/i)).toBeVisible();
    expect(page.url()).toContain("/login");
  });

  test("an unauthenticated visit to a protected page redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
