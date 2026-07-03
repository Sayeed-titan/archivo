import { chromium } from "playwright";
const shots = "C:/Users/User/AppData/Local/Temp/claude/d--Departmental-Official-Assignements-Achieve-Management/f2152191-d11a-4066-b715-2c9edde0b7fe/scratchpad";
const base = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto(`${base}/login`);
await page.fill('input[name="email"]', "admin@demo-ngo.org");
await page.fill('input[name="password"]', "Password123!");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard");

// Search page: open category combobox, type to filter, select, verify hidden input + submit
await page.goto(`${base}/search`);
await page.waitForLoadState("networkidle");
const catInput = page.locator('input#categoryId');
await catInput.click();
await page.waitForTimeout(200);
await page.screenshot({ path: `${shots}/combobox-open.png` });
await catInput.fill("Meet");
await page.waitForTimeout(200);
await page.screenshot({ path: `${shots}/combobox-filtered.png` });
const optionCount = await page.locator('[role="option"]').count();
console.log("filtered option count for 'Meet':", optionCount);
await page.keyboard.press("ArrowDown");
await page.keyboard.press("Enter");
await page.waitForTimeout(200);
const hiddenVal = await page.locator('input[name="categoryId"][type="hidden"]').inputValue();
console.log("hidden categoryId after select:", hiddenVal);
const visibleVal = await catInput.inputValue();
console.log("visible input text after select:", visibleVal);

// clear via backspace
await catInput.click();
await page.keyboard.press("Backspace");
await page.waitForTimeout(100);
const clearedHidden = await page.locator('input[name="categoryId"][type="hidden"]').inputValue();
console.log("hidden categoryId after backspace-clear:", JSON.stringify(clearedHidden));

// clear via X icon: reselect then click X
await catInput.click();
await page.keyboard.press("ArrowDown");
await page.keyboard.press("Enter");
await page.waitForTimeout(100);
await page.click('button[aria-label="Clear selection"]');
await page.waitForTimeout(100);
const clearedViaIcon = await page.locator('input[name="categoryId"][type="hidden"]').inputValue();
console.log("hidden categoryId after X-click clear:", JSON.stringify(clearedViaIcon));

// Submit the form with a real selection and confirm search param round-trips
await catInput.click();
await page.keyboard.press("ArrowDown");
await page.keyboard.press("Enter");
await page.click('button[type="submit"]:has-text("Search")');
await page.waitForLoadState("networkidle");
console.log("URL after submit:", page.url());

console.log("console/page errors:", errors.length ? errors : "none");
await browser.close();
