import { chromium } from "playwright";
const base = "http://localhost:3003";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });

await page.goto(`${base}/login`);
await page.fill('input[name="email"]', "admin@demo-ngo.org");
await page.fill('input[name="password"]', "Password123!");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard");

await page.goto(`${base}/archives/cmr28w4xq0055j020n9rduxk1/access`);
await page.waitForLoadState("networkidle");

const revokeBtn = page.locator('button[aria-label="Revoke access"]').first();
const exists = await revokeBtn.isVisible().catch(() => false);
if (exists) {
  await revokeBtn.click();
  await page.waitForTimeout(500);
  console.log("Revoked test grant.");
} else {
  console.log("No grant to revoke.");
}

await browser.close();
