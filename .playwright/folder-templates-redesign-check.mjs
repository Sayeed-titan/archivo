import { chromium } from "playwright";
const shots =
  "C:/Users/User/AppData/Local/Temp/claude/d--Departmental-Official-Assignements-Achieve-Management/5f62f806-5562-4150-b36d-32bac533f206/scratchpad";
const base = process.env.ARCHIVO_BASE_URL ?? "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1200 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto(`${base}/login`);
await page.fill('input[name="email"]', "admin@demo-ngo.org");
await page.fill('input[name="password"]', "Password123!");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard");

await page.goto(`${base}/settings/folder-templates`);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${shots}/1-folder-templates-page.png`, fullPage: true });

// --- Add a test category (appends at bottom) ---
await page.fill('input[name="name"]', "ZZ Smoke Test Category");
await page.click('button:has-text("Add category")');
await page.waitForTimeout(600);
const categoryAdded = await page.locator("summary", { hasText: "ZZ Smoke Test Category" }).count();
console.log("Category added:", categoryAdded > 0);

// --- Duplicate name rejected ---
await page.fill('input[name="name"]', "ZZ Smoke Test Category");
await page.click('button:has-text("Add category")');
await page.waitForTimeout(500);
console.log("Duplicate category rejected:", (await page.locator("text=already exists").count()) > 0);

// --- Open the category, add two folders, confirm newest lands on top ---
const details = page.locator("details", { has: page.locator("summary", { hasText: "ZZ Smoke Test Category" }) });
await details.locator("summary").click();
await page.waitForTimeout(300);

const folderNameInput = details.locator('input[placeholder="Folder name"]');
const addFolderButton = folderNameInput.locator("xpath=ancestor::form").locator('button[type="submit"]');

await folderNameInput.fill("First Folder");
await addFolderButton.click();
await page.waitForTimeout(1000);
await folderNameInput.fill("Second Folder");
await addFolderButton.click();
await page.waitForTimeout(1000);

const rows = (await details.locator("li").allTextContents()).map((t) => t.replace(/\s+/g, " ").trim().slice(0, 40));
console.log("Folder rows (expect 'Second Folder' first):", rows);

// --- Icon+label buttons present ---
console.log("Edit buttons in category:", await details.locator('button:has-text("Edit")').count());
console.log("Remove buttons in category:", await details.locator('button:has-text("Remove")').count());

// --- Keyboard reorder: Up/Down directly moves the row, no Space pick-up needed ---
await details.scrollIntoViewIfNeeded();
const handle = details.locator('button[aria-label*="Reorder"]').first();
await handle.focus();
await page.waitForTimeout(150);
await page.screenshot({ path: `${shots}/2-focus-ring.png` });
await page.keyboard.press("ArrowDown");
await page.waitForTimeout(600);
const rowsAfterKb = (await details.locator("li").allTextContents()).map((t) => t.replace(/\s+/g, " ").trim().slice(0, 40));
console.log("Folder rows after plain ArrowDown (expect swapped):", rowsAfterKb);

// --- Rules button has icon+label ---
console.log("Rules buttons in category:", await details.locator('button:has-text("Rules")').count());

// --- Inline Required checkbox toggles without opening Edit ---
const requiredCheckbox = details.locator("li").first().getByLabel("Required");
const before = await requiredCheckbox.isChecked();
await requiredCheckbox.click();
await page.waitForTimeout(400);
console.log("Required checkbox toggled inline:", before, "->", await requiredCheckbox.isChecked());

// --- View toggle switches to the flat List view ---
await page.locator('button[aria-label="List view"]').click();
await page.waitForTimeout(400);
console.log("List view table visible:", (await page.locator("table").count()) > 0);
await page.locator('button[aria-label="Folders view"]').click();
await page.waitForTimeout(300);

// --- Empty-name validation blocks save (native required attr) ---
await details.locator("li").first().locator('button:has-text("Edit")').click();
await page.waitForTimeout(200);
console.log("Rename input has required attr:", await details.locator("li").first().locator('input[name="name"]').getAttribute("required") !== null);
await details.locator("li").first().locator('button:has-text("Cancel")').click();

// --- Search filter ---
await page.goto(`${base}/settings/folder-templates`);
await page.waitForLoadState("networkidle");
const search = page.locator('input[placeholder="Search categories…"]');
if (await search.count()) {
  await search.fill("ZZ Smoke");
  await page.waitForTimeout(300);
  console.log("Categories visible after search filter:", await page.locator("summary").count());
  await search.fill("");
}

// --- Delete guard (blocked) then successful cleanup delete ---
const eventsSummary = page.locator("summary", { hasText: "Events" }).first();
await eventsSummary.locator('button:has-text("Delete")').first().click();
await page.waitForTimeout(200);
await page.locator('dialog[open] button:has-text("Delete")').click();
await page.waitForTimeout(500);
console.log("Blocked delete still shows category:", (await page.locator("summary", { hasText: "Events" }).count()) > 0);

await page.reload();
await page.waitForLoadState("networkidle");
const testSummary = page.locator("summary", { hasText: "ZZ Smoke Test Category" });
await testSummary.locator('button:has-text("Delete")').first().click();
await page.waitForTimeout(200);
await page.locator('dialog[open] button:has-text("Delete")').click();
await page.waitForTimeout(700);
console.log("Test category cleaned up:", (await page.locator("text=ZZ Smoke Test Category").count()) === 0);

console.log("Console/page errors during walk:", errors);
await browser.close();
