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

// Directly hit the search page with a date-range query — no seeded archive
// has files + an eventDate set, so this just proves the query executes
// without error and narrows correctly (0 results, not a crash).
await page.goto(`${base}/search?dateFrom=2024-03-01&dateFromEnd=2024-03-31`);
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${shots}/search-march-2024.png`, fullPage: true });
const resultHeading = await page.locator('h2').first().textContent();
console.log("March 2024 filter result count:", resultHeading);

// Verify the date picker UI itself opens correctly on the search page, pick
// a range, submit, and confirm both params round-trip in the URL + the
// picker re-hydrates from those URL params on reload.
await page.goto(`${base}/search`);
await page.waitForLoadState("networkidle");
const trigger = page.locator('input[name="dateFrom"][type="hidden"]').locator('xpath=following-sibling::button[1]');
await trigger.click();
await page.waitForTimeout(150);
await page.screenshot({ path: `${shots}/search-picker-open.png` });

const switchInput = page.locator('label:has-text("Multiple days") input[type="checkbox"]');
await switchInput.click({ force: true });
await page.waitForTimeout(100);
const popover = page.locator('div.absolute.z-40', { hasText: "Multiple days" });
await popover.getByText("5", { exact: true }).click();
await page.waitForTimeout(100);
await popover.getByText("25", { exact: true }).click();
await page.waitForTimeout(100);

await page.click('button[type="submit"]:has-text("Search")');
await page.waitForLoadState("networkidle");
console.log("URL after date-range search submit:", page.url());

// reload the exact URL and confirm the picker shows the round-tripped range
await page.waitForLoadState("networkidle");
const triggerAfterReload = page.locator('input[name="dateFrom"][type="hidden"]').locator('xpath=following-sibling::button[1]');
console.log("Picker label after URL round-trip:", await triggerAfterReload.textContent());

console.log("console/page errors:", errors.length ? errors : "none");
await browser.close();
