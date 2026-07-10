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

// Open the "01 Proposal" folder tile (grid view, root).
const firstTile = page.locator('[role="button"]:has-text("files")').first();
await firstTile.click();
await page.waitForTimeout(300);

// Focus the dropzone, then dispatch a synthetic paste event carrying a
// real File in clipboardData.files — this is exactly what Chrome/Edge
// populate on a genuine Ctrl+V after copying a file in Windows Explorer,
// so it exercises the same onPaste handler a real OS paste would hit.
const dropzone = page.locator('div[tabindex="0"]').filter({ hasText: "Drag files here" }).first();
await dropzone.click();

await page.evaluate(() => {
  const dt = new DataTransfer();
  const file = new File(["pasted file content from clipboard"], "pasted-from-explorer.txt", { type: "text/plain" });
  dt.items.add(file);
  const target = document.querySelectorAll('div[tabindex="0"]');
  const zone = Array.from(target).find((el) => el.textContent.includes("Drag files here"));
  const pasteEvent = new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: dt });
  zone.dispatchEvent(pasteEvent);
});

await page.waitForTimeout(2000);
await page.screenshot({ path: `${shots}/17-paste-upload.png`, fullPage: true });

const uploaded = await page.locator('span:has-text("pasted-from-explorer")').first().isVisible().catch(() => false);
console.log("Pasted file uploaded and visible:", uploaded);
console.log("console/page errors:", errors.length ? errors : "none");
await browser.close();
