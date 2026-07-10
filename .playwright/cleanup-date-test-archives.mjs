import { chromium } from "playwright";
const base = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });

await page.goto(`${base}/login`);
await page.fill('input[name="email"]', "admin@demo-ngo.org");
await page.fill('input[name="password"]', "Password123!");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard");

const ids = [
  "cmrek0cvg00099w20346693j1", // Date Picker Test - Single Day
  "cmrek0eud000c9w205mq3jl53", // Date Picker Test - Multi Day
];

for (const id of ids) {
  await page.goto(`${base}/archives/${id}`);
  await page.waitForLoadState("networkidle");
  const heading = await page.locator("h1").first().textContent().catch(() => null);
  if (!heading) {
    console.log(id, "-> not found, skipping");
    continue;
  }
  console.log(id, "->", heading);
  await page.click('button:has-text("Permanently delete")');
  await page.waitForTimeout(200);
  await page.fill('input[name="reason"]', "Playwright verification test data cleanup");
  await page.click('button[type="submit"]:has-text("Confirm permanent delete")');
  await page.waitForURL("**/dashboard");
  console.log(id, "-> deleted");
}

await browser.close();
