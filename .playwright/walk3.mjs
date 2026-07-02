import { chromium } from "playwright";
const shots = "C:/Users/User/AppData/Local/Temp/claude/d--Departmental-Official-Assignements-Achieve-Management/f2152191-d11a-4066-b715-2c9edde0b7fe/scratchpad";
const base = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
await page.goto(`${base}/login`);
await page.fill('input[name="email"]', "admin@demo-ngo.org");
await page.fill('input[name="password"]', "Password123!");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard");
await page.waitForLoadState("networkidle");
// navigate via a table archive link (main content, not the rail FAB)
const href = await page.locator('main a[href^="/archives/c"]').first().getAttribute("href");
await page.goto(base + href);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${shots}/31-mobile-archive.png`, fullPage: true });
await page.mouse.wheel(500, 0);
await page.waitForTimeout(200);
console.log("archive mobile scrollX:", await page.evaluate(() => window.scrollX));
// reset user theme pref to system for a clean demo state
await browser.close();
