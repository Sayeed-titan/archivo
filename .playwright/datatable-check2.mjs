import { chromium } from "playwright";
const shots = "C:/Users/User/AppData/Local/Temp/claude/d--Departmental-Official-Assignements-Achieve-Management/f2152191-d11a-4066-b715-2c9edde0b7fe/scratchpad";
const base = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto(`${base}/login`);
await page.fill('input[name="email"]', "admin@demo-ngo.org");
await page.fill('input[name="password"]', "Password123!");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard");

// Search results table
await page.goto(`${base}/search`);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${shots}/search-datatable.png`, fullPage: true });
const searchRowCount = await page.locator('table tbody tr').count();
console.log("search results rows:", searchRowCount);
const [dl1] = await Promise.all([
  page.waitForEvent("download"),
  page.click('button[aria-label="Export"]').then(() => page.click('text=Export Excel')),
]);
console.log("search export filename:", dl1.suggestedFilename());

// Reports run page
await page.goto(`${base}/reports`);
await page.waitForLoadState("networkidle");
const firstReport = page.locator('a[href^="/reports/"]:not([href$="/new"])').first();
await firstReport.click();
await page.waitForURL("**/reports/**");
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${shots}/report-run-datatable.png`, fullPage: true });
const reportRowCount = await page.locator('table tbody tr').count();
console.log("report run rows:", reportRowCount);
// existing Excel/PDF export buttons should still work (not the DataTable's own export menu, since none was wired here)
const hasOwnExportMenu = await page.locator('button[aria-label="Export"]').count();
console.log("report page has DataTable export menu (expect 0, uses PageHeader buttons instead):", hasOwnExportMenu);
const [dl2] = await Promise.all([
  page.waitForEvent("download"),
  page.click('a:has-text("Export Excel")'),
]);
console.log("report export filename:", dl2.suggestedFilename());

console.log("errors:", errors.length ? errors : "none");
await browser.close();
