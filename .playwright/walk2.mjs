import { chromium } from "playwright";

const shots = "C:/Users/User/AppData/Local/Temp/claude/d--Departmental-Official-Assignements-Achieve-Management/f2152191-d11a-4066-b715-2c9edde0b7fe/scratchpad";
const base = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(`[${page.url()}] ${m.text()}`));
page.on("pageerror", (e) => errors.push(`[${page.url()}] ${String(e)}`));

await page.goto(`${base}/login`);
await page.fill('input[name="email"]', "admin@demo-ngo.org");
await page.fill('input[name="password"]', "Password123!");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard", { timeout: 20000 });
await page.waitForLoadState("networkidle");

// Toggle cycles pref: click then wait for the button label to reflect the new mode.
async function toggleThemeTo(expected) {
  await page.click('button[aria-label^="Theme:"]:not([disabled])');
  await page.waitForSelector(`button[aria-label^="Theme: ${expected}"]:not([disabled])`, { timeout: 20000 });
}

// current pref is "system" (or whatever last run left); read the label first
const label = await page.getAttribute('button[aria-label^="Theme:"]', "aria-label");
console.log("initial toggle label:", label);

// walk the cycle until we're in dark mode
for (let i = 0; i < 3; i++) {
  const mode = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
  if (mode === "dark") break;
  const next = mode === "light" ? "dark" : mode === "dark" ? "follows device" : "light";
  await toggleThemeTo(next);
}
const darkMode = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
console.log("data-theme now:", darkMode);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${shots}/26-dashboard-dark.png`, fullPage: true });
console.log("✓ 26-dashboard-dark");

// check a dark token actually applied
const surface = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
console.log("dark body surface:", surface);

// back to light
await toggleThemeTo("follows device");
await toggleThemeTo("light");
console.log("data-theme:", await page.evaluate(() => document.documentElement.getAttribute("data-theme")));

// Appearance: apply Ocean blue
await page.goto(`${base}/settings/appearance`);
await page.click('button[aria-label*="Ocean blue"]');
await page.screenshot({ path: `${shots}/27-appearance-preview-blue.png`, fullPage: true });
console.log("✓ 27-appearance-preview-blue");
await page.click('button:has-text("Apply to organization")');
await page.waitForSelector('div[role="status"]', { timeout: 20000 });
const snack = await page.textContent('div[role="status"]');
console.log("snackbar:", snack);
await page.waitForTimeout(800);
await page.goto(`${base}/dashboard`);
await page.waitForLoadState("networkidle");
const primary = await page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue("--md-sys-color-primary")
);
console.log("primary after blue reseed:", primary.trim());
await page.screenshot({ path: `${shots}/28-dashboard-blue.png`, fullPage: true });
console.log("✓ 28-dashboard-blue");

// restore baseline purple
await page.goto(`${base}/settings/appearance`);
await page.click('button[aria-label*="Baseline purple"]');
await page.click('button:has-text("Apply to organization")');
await page.waitForSelector('div[role="status"]', { timeout: 20000 });
await page.waitForTimeout(500);

// Mobile viewport
await page.setViewportSize({ width: 375, height: 800 });
await page.goto(`${base}/dashboard`);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${shots}/29-mobile-dashboard.png`, fullPage: true });
console.log("✓ 29-mobile-dashboard");
await page.click('button[aria-label="Open navigation"]');
await page.waitForTimeout(400);
await page.screenshot({ path: `${shots}/30-mobile-drawer.png` });
console.log("✓ 30-mobile-drawer");
await page.keyboard.press("Escape");
await page.mouse.wheel(500, 0);
await page.waitForTimeout(200);
console.log("mobile scrollX after horizontal wheel:", await page.evaluate(() => window.scrollX));

// archive detail on mobile (dense page)
const link = page.locator('a[href^="/archives/"]').first();
await link.click();
await page.waitForURL("**/archives/**");
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${shots}/31-mobile-archive.png`, fullPage: true });
console.log("✓ 31-mobile-archive");
await page.mouse.wheel(500, 0);
console.log("archive mobile scrollX:", await page.evaluate(() => window.scrollX));

console.log("\nconsole errors:", errors.length ? errors.slice(0, 8) : "none");
await browser.close();
