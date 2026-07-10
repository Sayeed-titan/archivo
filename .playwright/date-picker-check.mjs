import { chromium } from "playwright";
const shots = "C:/Users/User/AppData/Local/Temp/claude/d--Departmental-Official-Assignements-Achieve-Management/a2ec230a-e73b-4e67-91ce-8933e7f8200f/scratchpad";
const base = "http://localhost:3000";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto(`${base}/login`);
await page.fill('input[name="email"]', "admin@demo-ngo.org");
await page.fill('input[name="password"]', "Password123!");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard");

// --- 1. Create archive with a SINGLE date ---
await page.goto(`${base}/archives/new`);
await page.waitForLoadState("networkidle");
await page.fill('input[name="name"]', "Date Picker Test - Single Day");
const dateTrigger1 = page.locator('input[name="eventDate"][type="hidden"]').locator('xpath=following-sibling::button[1]');
await dateTrigger1.click();
await page.waitForTimeout(150);
await page.screenshot({ path: `${shots}/1-picker-open.png` });

// go to year combobox, pick 2024, month combobox pick March, then click day 15
const yearInputs = page.locator('input[role="combobox"]');
// month is first combobox in popover, year is second
const popover = page.locator('div.absolute.z-40', { hasText: "Multiple days" });
await popover.locator('input[role="combobox"]').nth(1).click();
await page.waitForTimeout(100);
await popover.locator('input[role="combobox"]').nth(1).fill("2024");
await page.waitForTimeout(150);
await page.screenshot({ path: `${shots}/2-year-search.png` });
await page.keyboard.press("ArrowDown");
await page.keyboard.press("Enter");
await page.waitForTimeout(100);

await popover.locator('input[role="combobox"]').nth(0).click();
await page.waitForTimeout(100);
await page.keyboard.press("ArrowDown");
await page.keyboard.press("ArrowDown");
await page.keyboard.press("Enter"); // March (index 2)
await page.waitForTimeout(150);
await page.screenshot({ path: `${shots}/3-month-year-set.png` });

// click day "15"
await popover.getByText("15", { exact: true }).click();
await page.waitForTimeout(150);
await page.screenshot({ path: `${shots}/4-day-picked-closed.png` });

const startVal = await page.locator('input[name="eventDate"][type="hidden"]').inputValue();
const endVal = await page.locator('input[name="eventDateEnd"][type="hidden"]').inputValue();
console.log("Single-day create: eventDate=", startVal, "eventDateEnd=", endVal);

await page.click('button[type="submit"]:has-text("Create archive")');
await page.waitForURL((url) => /\/archives\/[^/]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));
console.log("Created single-day archive at", page.url());

// --- 2. Create archive with a RANGE ---
await page.goto(`${base}/archives/new`);
await page.waitForLoadState("networkidle");
await page.fill('input[name="name"]', "Date Picker Test - Multi Day");
const dateTrigger2 = page.locator('input[name="eventDate"][type="hidden"]').locator('xpath=following-sibling::button[1]');
await dateTrigger2.click();
await page.waitForTimeout(150);

const switchInput = page.locator('label:has-text("Multiple days") input[type="checkbox"]');
await switchInput.click({ force: true });
await page.waitForTimeout(100);
await page.screenshot({ path: `${shots}/5-range-mode-on.png` });

const popover2 = page.locator('div.absolute.z-40', { hasText: "Multiple days" });
await popover2.getByText("10", { exact: true }).click();
await page.waitForTimeout(100);
await page.screenshot({ path: `${shots}/6-range-start-picked.png` });
await popover2.getByText("20", { exact: true }).click();
await page.waitForTimeout(150);
await page.screenshot({ path: `${shots}/7-range-end-picked-closed.png` });

const rangeStart = await page.locator('input[name="eventDate"][type="hidden"]').inputValue();
const rangeEnd = await page.locator('input[name="eventDateEnd"][type="hidden"]').inputValue();
console.log("Range create: eventDate=", rangeStart, "eventDateEnd=", rangeEnd);

await page.click('button[type="submit"]:has-text("Create archive")');
await page.waitForURL((url) => /\/archives\/[^/]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));
const rangeArchiveUrl = page.url();
console.log("Created range archive at", rangeArchiveUrl);

// --- 3. Edit metadata: verify defaultStart/defaultEnd populated the picker ---
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${shots}/8-archive-detail.png`, fullPage: true });
const metaTrigger = page.locator('input[name="eventDate"][type="hidden"]').locator('xpath=following-sibling::button[1]');
const metaLabel = await metaTrigger.textContent();
console.log("Metadata form date button label (should show the picked range):", metaLabel);

console.log("console/page errors so far:", errors.length ? errors : "none");
await browser.close();
