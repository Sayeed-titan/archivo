import { chromium } from "playwright";
const shots = "C:/Users/User/AppData/Local/Temp/claude/d--Departmental-Official-Assignements-Achieve-Management/a2ec230a-e73b-4e67-91ce-8933e7f8200f/scratchpad";
const base = "http://localhost:3003";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1100 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto(`${base}/login`);
await page.fill('input[name="email"]', "admin@demo-ngo.org");
await page.fill('input[name="password"]', "Password123!");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard");
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${shots}/21-dashboard.png`, fullPage: true });

// 1. Archive by Category chips should now be real links.
const categoryCard = page.locator("h2", { hasText: "Archive by Category" }).locator("xpath=ancestor::div[contains(@class,'p-0')]");
const eventsChip = categoryCard.locator("a", { hasText: "Events" }).first();
console.log("Events category chip is a link:", await eventsChip.count() > 0);
await eventsChip.click();
await page.waitForURL("**/archives?categoryId=**");
await page.waitForLoadState("networkidle");
const heading = await page.locator("h1, h2").filter({ hasText: "All archives" }).first().isVisible().catch(() => false);
console.log("Landed on /archives filtered page:", heading, page.url());
await page.screenshot({ path: `${shots}/22-archives-filtered-by-category.png`, fullPage: true });
const rowCount = await page.locator("table tbody tr").count();
console.log("Filtered archive rows shown:", rowCount);

// 2. Go to /archives directly, search + paginate.
await page.goto(`${base}/archives`);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${shots}/23-archives-all.png`, fullPage: true });
const allRows = await page.locator("table tbody tr").count();
console.log("All archives rows (page 1):", allRows);

// 3. Search by name.
await page.fill('input[name="q"]', "Annual");
await page.click('button[type="submit"]');
await page.waitForLoadState("networkidle");
await page.waitForTimeout(200);
const searchRows = await page.locator("table tbody tr").count();
console.log("Search 'Annual' rows:", searchRows);
await page.screenshot({ path: `${shots}/24-archives-search.png`, fullPage: true });

// 4. Click an archive row -> should open folder explorer page.
await page.goto(`${base}/archives`);
await page.waitForLoadState("networkidle");
const firstArchiveLink = page.locator("table tbody tr td a").first();
const firstArchiveHref = await firstArchiveLink.getAttribute("href");
console.log("First archive href:", firstArchiveHref);
await Promise.all([
  page.waitForURL(`**${firstArchiveHref}`, { timeout: 10000 }).catch((e) => console.log("waitForURL error:", e.message)),
  firstArchiveLink.click(),
]);
await page.waitForLoadState("networkidle");
console.log("Clicked into archive:", firstArchiveHref, "-> now at", page.url());
const explorerVisible = await page.locator("nav").filter({ hasText: "Folders" }).first().isVisible().catch(() => false);
console.log("Folder explorer sidebar visible:", explorerVisible);

// 5. Back to dashboard, test Recent Uploads tabs.
await page.goto(`${base}/dashboard`);
await page.waitForLoadState("networkidle");
const browseTab = page.locator('button[role="tab"]', { hasText: "Browse" }).first();
await browseTab.click();
await page.waitForTimeout(200);
await page.screenshot({ path: `${shots}/25-dashboard-uploads-browse-tab.png`, fullPage: true });
const browseFormVisible = await page.locator('input[name="uploadsQ"]').isVisible();
console.log("Browse tab search field visible:", browseFormVisible);

await page.fill('input[name="uploadsQ"]', "pdf");
await page.locator('form:has(input[name="uploadsQ"]) button[type="submit"]').click();
await page.waitForLoadState("networkidle");
await page.waitForTimeout(200);
console.log("After browse search, URL:", page.url());
const uploadsSearchRows = await page.locator("table tbody tr").count();
console.log("Uploads browse search result rows:", uploadsSearchRows);
await page.screenshot({ path: `${shots}/26-dashboard-uploads-browse-results.png`, fullPage: true });

// 6. Recent Archives "View all" now points to /archives.
await page.goto(`${base}/dashboard`);
await page.waitForLoadState("networkidle");
const viewAllHref = await page.locator("a", { hasText: "View all" }).first().getAttribute("href");
console.log("Recent Archives 'View all' href:", viewAllHref);

console.log("console/page errors:", errors.length ? errors : "none");
await browser.close();
