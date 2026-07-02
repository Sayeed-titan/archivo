import { chromium } from "playwright";
const shots = "C:/Users/User/AppData/Local/Temp/claude/d--Departmental-Official-Assignements-Achieve-Management/f2152191-d11a-4066-b715-2c9edde0b7fe/scratchpad";
const base = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 400 } });
await page.goto(`${base}/login`);
await page.fill('input[name="email"]', "admin@demo-ngo.org");
await page.fill('input[name="password"]', "Password123!");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard");
await page.waitForLoadState("networkidle");
// user pref should still be "light" from walk2; cycle to dark
const mode = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
if (mode !== "dark") {
  await page.click('button[aria-label^="Theme:"]:not([disabled])');
  await page.waitForSelector('button[aria-label^="Theme: dark"]:not([disabled])', { timeout: 20000 });
}
await page.screenshot({ path: `${shots}/32-dark-topbar.png` });
console.log("mode:", await page.evaluate(() => document.documentElement.getAttribute("data-theme")));
// leave the demo user on system (org default)
await page.click('button[aria-label^="Theme:"]:not([disabled])');
await page.waitForSelector('button[aria-label^="Theme: follows device"]:not([disabled])', { timeout: 20000 });
console.log("restored pref to system");
await browser.close();
