import { chromium } from "playwright";
const shots = "C:/Users/User/AppData/Local/Temp/claude/d--Departmental-Official-Assignements-Achieve-Management/a2ec230a-e73b-4e67-91ce-8933e7f8200f/scratchpad";
const base = "http://localhost:3003";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto(`${base}/login`);
await page.fill('input[name="email"]', "admin@demo-ngo.org");
await page.fill('input[name="password"]', "Password123!");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard");

// --- File naming settings ---
await page.goto(`${base}/settings/file-naming`);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${shots}/12-file-naming-settings.png`, fullPage: true });

const previewText = await page.locator("p.font-mono").textContent();
console.log("Default template preview:", previewText);

// click a token chip to insert it, verify preview updates
const templateInput = page.locator('input[name="template"]');
const before = await templateInput.inputValue();
await page.locator('button:has-text("Sequence number")').click();
await page.waitForTimeout(150);
const after = await templateInput.inputValue();
console.log("Template before token click:", before);
console.log("Template after token click:", after);
console.log("Token insertion worked:", after !== before && after.includes("{sequence}"));

// reset back to default and save (leave settings unchanged)
await page.click('button:has-text("Reset to default")');
await page.waitForTimeout(100);
await page.click('button[type="submit"]:has-text("Save template")');
await page.waitForTimeout(600);
await page.screenshot({ path: `${shots}/13-file-naming-saved.png`, fullPage: true });

// --- Access grants ---
const archiveHref = "/archives/cmr28w4xq0055j020n9rduxk1/access";
await page.goto(`${base}${archiveHref}`);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${shots}/14-access-page.png`, fullPage: true });

// grant view access to the officer user for the whole archive
const userCombo = page.locator('input#userId, input[placeholder="Select a user…"]').first();
await userCombo.click();
await page.waitForTimeout(150);
await userCombo.fill("officer");
await page.waitForTimeout(200);
await page.screenshot({ path: `${shots}/15-access-user-search.png` });
await page.keyboard.press("ArrowDown");
await page.keyboard.press("Enter");
await page.click('button[type="submit"]:has-text("Grant access")');
await page.waitForTimeout(600);
await page.screenshot({ path: `${shots}/16-access-granted.png`, fullPage: true });

const grantVisible = await page.locator("text=/officer/i").first().isVisible().catch(() => false);
console.log("Grant appears in list:", grantVisible);

console.log("console/page errors:", errors.length ? errors : "none");
await browser.close();
