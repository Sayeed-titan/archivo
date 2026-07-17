import { test, expect } from "@playwright/test";
import { DEMO_USERS, login } from "./fixtures/auth";

test.describe("role-gated navigation @smoke", () => {
  test("a Viewer does not see Settings, and cannot reach it directly", async ({ page }) => {
    await login(page, DEMO_USERS.viewer);

    await expect(page.getByRole("link", { name: "Settings" })).toHaveCount(0);

    // Server-side enforcement, not just a hidden nav item — this is the
    // invariant archivo/CLAUDE.md calls out: never trust the client flag as
    // the authorization boundary.
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toHaveCount(0);
  });

  test("a Viewer does not see the New Archive action", async ({ page }) => {
    await login(page, DEMO_USERS.viewer);
    await expect(page.getByRole("link", { name: "New Archive" })).toHaveCount(0);
  });

  test("an Administrator sees the full quick-actions row", async ({ page }) => {
    await login(page, DEMO_USERS.admin);
    for (const label of ["New Archive", "Migration Inbox", "Search", "Reports", "Audit Log", "Settings"]) {
      await expect(page.getByRole("link", { name: label }).first()).toBeVisible();
    }
  });
});
