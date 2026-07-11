import { chromium } from "playwright";
const shots =
  "C:/Users/User/AppData/Local/Temp/claude/d--Departmental-Official-Assignements-Achieve-Management/5f62f806-5562-4150-b36d-32bac533f206/scratchpad";
const base = "http://localhost:3003";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1200 } });

await page.goto(`${base}/login`);
await page.fill('input[name="email"]', "admin@demo-ngo.org");
await page.fill('input[name="password"]', "Password123!");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard");

await page.goto(`${base}/settings/folder-templates`);
await page.waitForLoadState("networkidle");

const eventsDetails = page.locator("details", { has: page.locator("summary", { hasText: "Events" }) }).first();
await eventsDetails.locator("summary").click();
await page.waitForTimeout(300);
await eventsDetails.scrollIntoViewIfNeeded();

const rowsBefore = (await eventsDetails.locator("li").allTextContents()).map((t) => t.replace(/\s+/g, " ").trim().slice(0, 30));
console.log("Rows before:", rowsBefore);

// Scenario A: click the handle directly (mouse), then press ArrowDown WITHOUT Space first
const handle = eventsDetails.locator('button[aria-label*="Reorder"]').first();
await handle.click();
await page.waitForTimeout(150);
const isFocusedAfterClick = await handle.evaluate((el) => el === document.activeElement);
console.log("Handle focused after click:", isFocusedAfterClick);
await page.screenshot({ path: `${shots}/diag-1-after-click.png` });

await page.keyboard.press("ArrowDown");
await page.waitForTimeout(400);
const rowsAfterArrowOnly = (await eventsDetails.locator("li").allTextContents()).map((t) => t.replace(/\s+/g, " ").trim().slice(0, 30));
console.log("Rows after ArrowDown WITHOUT Space first (expect unchanged):", rowsAfterArrowOnly);
await page.screenshot({ path: `${shots}/diag-2-after-arrow-no-space.png` });

// Scenario B: proper Space -> ArrowDown -> Space sequence
await page.keyboard.press("Space");
await page.waitForTimeout(200);
await page.screenshot({ path: `${shots}/diag-3-after-space-pickup.png` });
await page.keyboard.press("ArrowDown");
await page.waitForTimeout(200);
await page.screenshot({ path: `${shots}/diag-4-after-arrow-picked-up.png` });
await page.keyboard.press("Space");
await page.waitForTimeout(600);
const rowsAfterProperSequence = (await eventsDetails.locator("li").allTextContents()).map((t) => t.replace(/\s+/g, " ").trim().slice(0, 30));
console.log("Rows after proper Space->ArrowDown->Space:", rowsAfterProperSequence);
await page.screenshot({ path: `${shots}/diag-5-after-proper-sequence.png` });

await browser.close();
