import { chromium } from "playwright";
const shots = "C:/Users/User/AppData/Local/Temp/claude/d--Departmental-Official-Assignements-Achieve-Management/f2152191-d11a-4066-b715-2c9edde0b7fe/scratchpad";
const base = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto(`${base}/login`);
await page.fill('input[name="email"]', "admin@demo-ngo.org");
await page.fill('input[name="password"]', "Password123!");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard");

await page.goto(`${base}/audit-log`);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${shots}/datatable-audit-log.png`, fullPage: true });
console.log("✓ audit-log screenshot");

// pagination: change page size to 10, verify row count shrinks
const rowCountBefore = await page.locator('table tbody tr').count();
console.log("rows before page-size change:", rowCountBefore);

// Column picker: open, drag-reorder via keyboard (select handle, arrow key)
await page.click('button[aria-label="Configure columns"]');
await page.waitForTimeout(300);
await page.screenshot({ path: `${shots}/datatable-column-picker.png` });
console.log("✓ column picker screenshot");

// toggle a column off
const checkboxes = page.locator('[role="dialog"] input[type="checkbox"], dialog input[type="checkbox"]');
const cbCount = await checkboxes.count();
console.log("column checkboxes found:", cbCount);
if (cbCount > 0) {
  await checkboxes.nth(4).uncheck(); // "Note" column
  await page.waitForTimeout(100);
}
await page.click('dialog button:has-text("Done")').catch(() => {});
await page.waitForTimeout(200);
const headerCountAfterHide = await page.locator('table thead th').count();
console.log("header count after hiding one column:", headerCountAfterHide);

// Export
const [download] = await Promise.all([
  page.waitForEvent("download"),
  page.click('button[aria-label="Export"]').then(() => page.click('text=Export Excel')),
]);
console.log("download suggested filename:", download.suggestedFilename());

console.log("console/page errors:", errors.length ? errors : "none");
await browser.close();
