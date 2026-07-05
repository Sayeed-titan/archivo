import { chromium } from "playwright";
const shots = "C:/Users/User/AppData/Local/Temp/claude/d--Departmental-Official-Assignements-Achieve-Management/51fc3e96-e3ec-4759-865a-4d2c4f83bebb/scratchpad";
const base = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 700, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto(`${base}/login`);
await page.fill('input[name="email"]', "admin@demo-ngo.org");
await page.fill('input[name="password"]', "Password123!");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard");

await page.goto(`${base}/search`);
await page.waitForLoadState("networkidle");

await page.screenshot({ path: `${shots}/search-narrow-initial.png` });

const info1 = await page.evaluate(() => {
  const el = document.querySelector("table")?.parentElement;
  if (!el) return null;
  return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, scrollLeft: el.scrollLeft };
});
console.log("scroll info before scrolling:", info1);

await page.evaluate(() => {
  const el = document.querySelector("table")?.parentElement;
  if (el) el.scrollLeft = el.scrollWidth;
});
await page.waitForTimeout(200);
await page.screenshot({ path: `${shots}/search-narrow-scrolled.png` });

const info2 = await page.evaluate(() => {
  const el = document.querySelector("table")?.parentElement;
  if (!el) return null;
  return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, scrollLeft: el.scrollLeft };
});
console.log("scroll info after scrolling:", info2);

const firstHeaderCell = page.locator("table thead th").first();
const box = await firstHeaderCell.boundingBox();
console.log("first header cell box after scroll:", box);

console.log("console/page errors:", errors.length ? errors : "none");
await browser.close();
