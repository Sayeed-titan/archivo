import { test, expect } from "@playwright/test";
import path from "node:path";
import { DEMO_USERS, login } from "./fixtures/auth";

test.describe("workflow transition gating @smoke", () => {
  test("a transition blocked on missing mandatory folders becomes available once they're filled", async ({ page }) => {
    await login(page, DEMO_USERS.admin);

    const archiveName = `E2E Workflow Test ${Date.now()}`;

    await page.goto("/archives/new");
    await page.getByPlaceholder("e.g. Annual General Meeting 2027").fill(archiveName);
    const categoryInput = page.getByPlaceholder("No category yet");
    await categoryInput.click();
    await categoryInput.fill("Meetings");
    await page.getByText("Meetings", { exact: true }).click();
    await page.getByRole("button", { name: "Create archive" }).click();
    await expect(page.getByRole("heading", { name: archiveName })).toBeVisible({ timeout: 15_000 });

    // Draft -> Pending Review has no requirements in the seeded workflow.
    // The stepper's clickable control is "Move to <state>" — the plain
    // state label next to it is a separate, non-interactive element.
    await page.getByRole("button", { name: "Move to Pending Review" }).click();
    await expect(page.getByText(/needs attention/i).first()).toBeVisible();

    // Pending Review -> Archived requires every mandatory folder to have a
    // file (see prisma/seed.ts). Meetings' lean folder set has three
    // mandatory folders: 01 Proposal, 02 Approval, 15 Final Report.
    await expect(page.getByText(/all mandatory folders must have at least one file/i)).toBeVisible();

    const fixture = path.join(__dirname, "fixtures", "sample-upload.txt");
    for (const folder of ["01 Proposal", "02 Approval", "15 Final Report"]) {
      // exact:true — the folder grid card and its "Options for…" button
      // both also contain the folder name as a text substring.
      await page.getByRole("button", { name: folder, exact: true }).click();
      await page.locator('input[type="file"]').setInputFiles(fixture);
      await expect(page.getByText("sample-upload", { exact: false }).first()).toBeVisible({ timeout: 15_000 });
    }

    // The requirement text itself stays visible elsewhere on the page (now
    // shown satisfied, in the transition's requirement checklist) — the
    // invariant that actually matters is that the move is reachable now.
    await page.getByRole("button", { name: "Move to Archived" }).click();
    await expect(page.getByText(/^healthy$/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
