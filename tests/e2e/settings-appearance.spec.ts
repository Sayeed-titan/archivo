import { test, expect } from "@playwright/test";
import { DEMO_USERS, login } from "./fixtures/auth";

test.describe("settings roundtrip @smoke", () => {
  test("changing the brand color in Appearance persists after reload", async ({ page }) => {
    await login(page, DEMO_USERS.admin);

    await page.goto("/settings/appearance");

    // The visible, editable custom-hex field's accessible name is "Custom
    // <current value>" (a hidden sibling input mirrors the value for form
    // submission — that one isn't interactable, this is the real control).
    const hexInput = page.getByRole("textbox", { name: /^Custom/ });
    await hexInput.fill("#123456");
    await hexInput.press("Tab");

    await page.getByRole("button", { name: "Apply to organization" }).click();
    await page.waitForLoadState("networkidle");

    // The real assertion is persistence, not the transient success toast's
    // exact wording — reload and confirm the value actually stuck.
    await page.reload();
    await expect(page.getByRole("textbox", { name: /^Custom #123456/ })).toBeVisible();
  });
});
