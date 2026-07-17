import { test, expect } from "@playwright/test";
import path from "node:path";
import { DEMO_USERS, login } from "./fixtures/auth";

test.describe("search @smoke", () => {
  test("an uploaded file can be found by name from the full search page", async ({ page }) => {
    await login(page, DEMO_USERS.admin);

    const archiveName = `E2E Search Test ${Date.now()}`;

    await page.goto("/archives/new");
    await page.getByPlaceholder("e.g. Annual General Meeting 2027").fill(archiveName);
    // A category is required to get any folders at all — an uncategorized
    // archive has nowhere to upload into (confirmed live: "No folders yet —
    // assign a category to auto-provision the standard folder set.").
    const categoryInput = page.getByPlaceholder("No category yet");
    await categoryInput.click();
    await categoryInput.fill("Meetings");
    await page.getByText("Meetings", { exact: true }).click();
    await page.getByRole("button", { name: "Create archive" }).click();
    await expect(page.getByRole("heading", { name: archiveName })).toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "17 Supporting Documents", exact: true }).click();

    const fixture = path.join(__dirname, "fixtures", "sample-upload.txt");
    await page.locator('input[type="file"]').setInputFiles(fixture);
    await expect(page.getByText("sample-upload", { exact: false }).first()).toBeVisible({ timeout: 15_000 });

    await page.goto("/search");
    await page.getByPlaceholder("Search archives…").fill(archiveName);
    await page.getByRole("button", { name: "Search", exact: true }).click();

    await expect(page.getByText("sample-upload", { exact: false }).first()).toBeVisible({ timeout: 15_000 });
    // exact:true — the uploaded file's resolved name includes the archive
    // name as a substring (see file-naming.ts's default template), so its
    // row link also matches a non-exact search for the archive name.
    await expect(page.getByRole("link", { name: archiveName, exact: true })).toBeVisible();
  });
});
