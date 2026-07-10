import { chromium } from "playwright";
import path from "path";
import fs from "fs";
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

// --- Rename the (already-renamed, still-green) first folder back, and open it ---
const firstTile = page.locator('[role="button"]:has-text("files")').first();
await firstTile.hover();
await firstTile.locator('button[aria-label^="Options for"]').click();
await page.waitForTimeout(150);
await page.locator('button[role="menuitem"]:has-text("Rename")').click();
await page.waitForTimeout(150);
await page.locator('dialog input[name="name"]').fill("01 Proposal");
await page.click('dialog button[type="submit"]:has-text("Rename")');
await page.waitForSelector("dialog[open]", { state: "detached", timeout: 15000 });
await page.waitForTimeout(300);
console.log("Folder renamed back to '01 Proposal'");

// reset color to default (neutral / first swatch)
const tileAfterRename = page.locator('[role="button"]:has-text("files")').first();
await tileAfterRename.hover();
await tileAfterRename.locator('button[aria-label^="Options for"]').click();
await page.waitForTimeout(150);
await page.locator('button[title="Default"]').click();
await page.waitForTimeout(300);
console.log("Folder color reset to default");

// --- Open the folder, upload a file, rename it ---
const openTile = page.locator('[role="button"]:has-text("files")').first();
await openTile.click();
await page.waitForTimeout(300);

const testFilePath = path.join(process.cwd(), ".playwright", "test-upload.txt");
fs.writeFileSync(testFilePath, "explorer rename test file content");
const fileInput = page.locator('input[type="file"]');
await fileInput.setInputFiles(testFilePath);
await page.waitForTimeout(2000);
await page.screenshot({ path: `${shots}/9-file-uploaded.png`, fullPage: true });

const fileTileVisible = await page.locator('span:has-text("test-upload")').first().isVisible().catch(() => false);
console.log("Uploaded file tile visible:", fileTileVisible);

if (fileTileVisible) {
  const fileTileRoot = page.locator("div.group").filter({ hasText: "test-upload" }).first();
  await fileTileRoot.hover();
  await page.waitForTimeout(150);
  await fileTileRoot.locator('button[aria-label^="Options for"]').click();
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${shots}/10-file-menu-open.png` });
  await page.locator('button[role="menuitem"]:has-text("Rename")').click();
  await page.waitForTimeout(150);
  await page.locator('dialog input[name="name"]').fill("Renamed Upload Test");
  await page.click('dialog button[type="submit"]:has-text("Rename")');
  await page.waitForSelector("dialog[open]", { state: "detached", timeout: 15000 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${shots}/11-file-renamed.png`, fullPage: true });
  const fileRenamedVisible = await page.locator('text="Renamed Upload Test.txt"').isVisible().catch(() => false);
  console.log("File renamed successfully:", fileRenamedVisible);
}

console.log("console/page errors:", errors.length ? errors : "none");
await browser.close();
