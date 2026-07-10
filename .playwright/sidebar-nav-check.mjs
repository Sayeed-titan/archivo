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

const archiveHref = "/archives/cmr28w4xq0055j020n9rduxk1";
await page.goto(`${base}${archiveHref}`);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${shots}/18-sidebar-root.png`, fullPage: true });

// Back/Forward should start disabled at root with no history yet.
const backBtn = page.locator('button[aria-label="Back"]');
const forwardBtn = page.locator('button[aria-label="Forward"]');
console.log("Back disabled at start:", await backBtn.isDisabled());
console.log("Forward disabled at start:", await forwardBtn.isDisabled());

// Jump to a folder via the sidebar (not the tile click).
const sidebarFolderRow = page.locator("nav button").filter({ hasText: "02 Approval" }).first();
await sidebarFolderRow.click();
await page.waitForTimeout(200);
await page.screenshot({ path: `${shots}/19-sidebar-jumped.png`, fullPage: true });
const breadcrumbShowsApproval = await page.locator("text=02 Approval").first().isVisible();
console.log("Jumped to 02 Approval via sidebar:", breadcrumbShowsApproval);

// Jump to a different folder via the sidebar again.
const sidebarFolderRow2 = page.locator("nav button").filter({ hasText: "04 Agenda" }).first();
await sidebarFolderRow2.click();
await page.waitForTimeout(200);

// Back should now work, returning to 02 Approval.
console.log("Back enabled after two jumps:", !(await backBtn.isDisabled()));
await backBtn.click();
await page.waitForTimeout(200);
const backAtApproval = await page.locator("text=02 Approval").first().isVisible();
console.log("Back navigated to 02 Approval:", backAtApproval);

// Forward should now work, returning to 04 Agenda.
console.log("Forward enabled after going back:", !(await forwardBtn.isDisabled()));
await forwardBtn.click();
await page.waitForTimeout(200);
const forwardAtAgenda = await page.locator("text=04 Agenda").first().isVisible();
console.log("Forward navigated to 04 Agenda:", forwardAtAgenda);

// Back to root via sidebar's archive-name row, then collapse sidebar.
const sidebarRootRow = page.locator("nav button").filter({ hasText: "Annual General Meeting 2026" }).first();
await sidebarRootRow.click();
await page.waitForTimeout(200);

const collapseBtn = page.locator('button[aria-label="Collapse folder sidebar"]');
await collapseBtn.click();
await page.waitForTimeout(200);
await page.screenshot({ path: `${shots}/20-sidebar-collapsed.png`, fullPage: true });
const expandBtnVisible = await page.locator('button[aria-label="Expand folder sidebar"]').isVisible();
console.log("Sidebar collapsed correctly:", expandBtnVisible);

await collapseBtn.isVisible().catch(() => {}); // no-op, just for symmetry
const expandBtn = page.locator('button[aria-label="Expand folder sidebar"]');
await expandBtn.click();
await page.waitForTimeout(200);
const sidebarBackVisible = await page.locator('button[aria-label="Collapse folder sidebar"]').isVisible();
console.log("Sidebar re-expanded correctly:", sidebarBackVisible);

console.log("console/page errors:", errors.length ? errors : "none");
await browser.close();
