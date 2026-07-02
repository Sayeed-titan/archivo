import { chromium } from "playwright";

const shots = "C:/Users/User/AppData/Local/Temp/claude/d--Departmental-Official-Assignements-Achieve-Management/f2152191-d11a-4066-b715-2c9edde0b7fe/scratchpad";
const base = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(`[${page.url()}] ${m.text()}`));
page.on("pageerror", (e) => errors.push(`[${page.url()}] ${String(e)}`));

async function shot(name) {
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true });
  console.log("✓", name);
}

// 1. Login
await page.goto(`${base}/login`);
await shot("10-login");
await page.fill('input[name="email"]', "admin@demo-ngo.org");
await page.fill('input[name="password"]', "Password123!");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard", { timeout: 20000 });
await shot("11-dashboard");

// 2. Notifications panel
await page.click('button[aria-label*="Notifications"]');
await page.waitForTimeout(400);
await page.screenshot({ path: `${shots}/12-notifications.png` });
console.log("✓ 12-notifications");
await page.keyboard.press("Escape");
await page.click("body", { position: { x: 700, y: 400 } });

// 3. Search
await page.goto(`${base}/search?q=`);
await shot("13-search");

// 4. Archive detail (first recent archive link)
await page.goto(`${base}/dashboard`);
const archiveLink = page.locator('a[href^="/archives/"]').first();
await archiveLink.click();
await page.waitForURL("**/archives/**");
await shot("14-archive-detail");

// 5. Inbox / Reports / Audit
await page.goto(`${base}/inbox`);
await shot("15-inbox");
await page.goto(`${base}/reports`);
await shot("16-reports");
const reportLink = page.locator('a[href^="/reports/"]:not([href$="/new"])').first();
await reportLink.click();
await page.waitForURL("**/reports/**");
await shot("17-report-run");
await page.goto(`${base}/audit-log`);
await shot("18-audit-log");

// 6. Settings
await page.goto(`${base}/settings`);
await shot("19-settings-hub");
await page.goto(`${base}/settings/appearance`);
await shot("20-appearance");
await page.goto(`${base}/settings/organization`);
await shot("21-organization");
await page.goto(`${base}/settings/workflow`);
await shot("22-workflow");
await page.goto(`${base}/settings/folder-templates`);
await shot("23-folder-templates");
await page.goto(`${base}/settings/security`);
await shot("24-security");
await page.goto(`${base}/profile`);
await shot("25-profile");

// 7. Theme toggle → dark
await page.click('button[aria-label^="Theme:"]');
await page.waitForTimeout(1200); // server action + revalidate
await page.goto(`${base}/dashboard`);
await shot("26-dashboard-dark");
const dataTheme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
console.log("data-theme after toggle:", dataTheme);

// back to light for the seed-color test
await page.click('button[aria-label^="Theme:"]'); // dark -> system
await page.waitForTimeout(800);
await page.click('button[aria-label^="Theme:"]'); // system -> light
await page.waitForTimeout(800);

// 8. Appearance change: pick Ocean blue preset and apply
await page.goto(`${base}/settings/appearance`);
await page.click('button[aria-label*="Ocean blue"]');
await page.waitForTimeout(300);
await page.screenshot({ path: `${shots}/27-appearance-preview-blue.png`, fullPage: true });
console.log("✓ 27-appearance-preview-blue");
await page.click('button:has-text("Apply to organization")');
await page.waitForTimeout(1500);
await page.goto(`${base}/dashboard`);
await shot("28-dashboard-blue");
const primary = await page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue("--md-sys-color-primary")
);
console.log("primary after reseed:", primary.trim());

// restore baseline purple
await page.goto(`${base}/settings/appearance`);
await page.click('button[aria-label*="Baseline purple"]');
await page.click('button:has-text("Apply to organization")');
await page.waitForTimeout(1500);

// 9. Mobile viewport
await page.setViewportSize({ width: 375, height: 800 });
await page.goto(`${base}/dashboard`);
await shot("29-mobile-dashboard");
await page.click('button[aria-label="Open navigation"]');
await page.waitForTimeout(400);
await page.screenshot({ path: `${shots}/30-mobile-drawer.png` });
console.log("✓ 30-mobile-drawer");
// horizontal scroll check
await page.mouse.wheel(500, 0);
await page.waitForTimeout(200);
const scrollX = await page.evaluate(() => window.scrollX);
console.log("mobile scrollX after horizontal wheel:", scrollX);

console.log("\nconsole errors:", errors.length ? errors.slice(0, 8) : "none");
await browser.close();
