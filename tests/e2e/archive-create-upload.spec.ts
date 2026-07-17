import { test, expect } from "@playwright/test";
import path from "node:path";
import { DEMO_USERS, login } from "./fixtures/auth";

test.describe("create archive and upload a file @smoke", () => {
  test("creating an archive with a category provisions folders, and an upload appears in its folder", async ({ page }) => {
    await login(page, DEMO_USERS.admin);

    const archiveName = `E2E Test Archive ${Date.now()}`;

    await page.goto("/archives/new");
    await page.getByPlaceholder("e.g. Annual General Meeting 2027").fill(archiveName);

    const categoryInput = page.getByPlaceholder("No category yet");
    await categoryInput.click();
    await categoryInput.fill("Meetings");
    await page.getByText("Meetings", { exact: true }).click();

    await page.getByRole("button", { name: "Create archive" }).click();

    // Lands on the new archive's detail page.
    await expect(page.getByRole("heading", { name: archiveName })).toBeVisible({ timeout: 15_000 });

    // Meetings is the seeded lean category — "17 Supporting Documents" is
    // a non-mandatory folder, safe to upload into without touching the
    // workflow-gating requirements exercised separately in workflow.spec.ts.
    // exact:true is required — the folder grid card and its "Options for…"
    // button both also contain this text as a substring.
    await page.getByRole("button", { name: "17 Supporting Documents", exact: true }).click();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, "fixtures", "sample-upload.txt"));

    await expect(page.getByText("sample-upload", { exact: false })).toBeVisible({ timeout: 15_000 });
  });
});
