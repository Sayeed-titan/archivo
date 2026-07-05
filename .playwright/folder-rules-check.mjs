import { chromium } from "playwright";

const shots = "C:/Users/User/AppData/Local/Temp/claude/d--Departmental-Official-Assignements-Achieve-Management/6f6366ba-e682-42c0-9027-634280f53e3f/scratchpad";
const base = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto(`${base}/login`);
await page.fill('input[name="email"]', "admin@demo-ngo.org");
await page.fill('input[name="password"]', "Password123!");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard");

// 1. Go to folder templates settings, open a category, add a test folder, configure rules
await page.goto(`${base}/settings/folder-templates`);
await page.waitForLoadState("networkidle");

const firstDetails = page.locator("details").first();
await firstDetails.evaluate((el) => (el.open = true));
const alreadyExists = (await page.locator("li").filter({ hasText: "Rules Test Folder" }).count()) > 0;
if (!alreadyExists) {
  await page.fill('input[name="name"]', "Rules Test Folder");
  await page.click('button[type="submit"]:has-text("Add")');
  await page.waitForTimeout(600);
}
await page.screenshot({ path: `${shots}/1-added-folder.png`, fullPage: true });

const row = page.locator("li").filter({ hasText: "Rules Test Folder" });
console.log("matching rows:", await row.count());
const rulesButton = row.first().getByRole("button", { name: "rules", exact: true });
console.log("rules button found on row:", await rulesButton.count());
await rulesButton.click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${shots}/2-rules-dialog-open.png`, fullPage: true });

const dialog = page.locator("dialog[open]");
await dialog.getByLabel("image", { exact: true }).check();
await dialog.locator('input[placeholder="Max size (MB)"]').fill("0.01");
await dialog.getByRole("button", { name: "Add count rule" }).click();
await page.waitForTimeout(200);
await dialog.locator("select").first().selectOption("image");
await dialog.locator('input[placeholder="Max"]').fill("2");
await dialog.getByLabel("Accept alternate document types", { exact: true }).check();
await dialog.locator('input[placeholder="e.g. Tender"]').fill("Tender");
await dialog.getByRole("button", { name: "Add", exact: true }).click();
await page.waitForTimeout(100);
await dialog.locator('input[placeholder="e.g. Tender"]').fill("TOR");
await page.keyboard.press("Enter");
await dialog.getByLabel("Allow external link when a file is too large", { exact: true }).check();
await page.screenshot({ path: `${shots}/3-rules-configured.png`, fullPage: true });

await dialog.getByRole("button", { name: "Save rules", exact: true }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${shots}/4-after-save.png`, fullPage: true });

await rulesButton.click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${shots}/5-reopened-rules.png`, fullPage: true });
const dialog2 = page.locator("dialog[open]");
const maxSizeVal = await dialog2.locator('input[placeholder="Max size (MB)"]').inputValue();
console.log("round-tripped max size MB:", maxSizeVal);
const altChips = await dialog2.locator("span", { hasText: "Tender" }).count();
console.log("alt option chips found on reopen:", altChips);

console.log("errors so far:", errors.length ? errors : "none");
await browser.close();
