import { test, expect } from "@playwright/test";
import { DEMO_USERS, login } from "./fixtures/auth";

test.describe("reports @smoke", () => {
  test("running a built-in report and exporting it downloads a file", async ({ page }) => {
    await login(page, DEMO_USERS.admin);

    await page.goto("/reports");
    await page.getByRole("link", { name: "Archive Register" }).click();
    await expect(page.getByRole("heading", { name: "Archive Register" })).toBeVisible();

    // Export Excel is a real navigational link (GET .../export?format=excel
    // with a Content-Disposition: attachment response), not a JS button.
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: "Export Excel" }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
  });
});
