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

// Use the seeded "Annual General Meeting 2026" archive, known to have real
// folders from prisma/seed.ts. Navigating directly by id (found via a
// one-off DB query) rather than discovering it through dashboard/search
// UI, which have their own independent timing/rendering to not conflate
// with what's under test here.
const archiveHref = "/archives/cmr28w4xq0055j020n9rduxk1";
await page.goto(`${base}${archiveHref}`);
await page.waitForLoadState("networkidle");

console.log("Testing archive at:", archiveHref);
await page.screenshot({ path: `${shots}/1-explorer-root-grid.png`, fullPage: true });

// --- View toggle: grid -> list -> details ---
const listBtn = page.locator('button[aria-label="List view"]');
await listBtn.click();
await page.waitForTimeout(150);
await page.screenshot({ path: `${shots}/2-explorer-root-list.png`, fullPage: true });

const detailsBtn = page.locator('button[aria-label="Details view"]');
await detailsBtn.click();
await page.waitForTimeout(150);
await page.screenshot({ path: `${shots}/3-explorer-root-details.png`, fullPage: true });

const gridBtn = page.locator('button[aria-label="Grid view"]');
await gridBtn.click();
await page.waitForTimeout(150);

// --- Click a folder to open it (breadcrumb navigation) ---
const firstFolder = page.locator('[role="button"]:has-text("files")').first();
const folderName = await firstFolder.locator('span').first().textContent().catch(() => "unknown");
await firstFolder.click();
await page.waitForTimeout(200);
await page.screenshot({ path: `${shots}/4-explorer-folder-open.png`, fullPage: true });
console.log("Opened folder:", folderName);

// breadcrumb back to root
const breadcrumbCount = await page.locator('nav button, nav span').count();
console.log("Breadcrumb elements:", breadcrumbCount);

// go back to root via breadcrumb
const archiveCrumb = page.locator('nav button').first();
await archiveCrumb.click();
await page.waitForTimeout(200);
await page.screenshot({ path: `${shots}/5-explorer-back-at-root.png`, fullPage: true });
const isBackAtRoot = await page.locator('[role="button"]:has-text("files")').first().isVisible().catch(() => false);
console.log("Back at root after breadcrumb click:", isBackAtRoot);

console.log("console/page errors so far:", errors.length ? errors : "none");
await browser.close();
