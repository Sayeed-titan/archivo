import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
});

async function login(email) {
  await page.goto("http://localhost:3000/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "Password123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 10000 });
}

// 1. Log in as admin, link a Google account at /profile.
await login("admin@demo-ngo.org");
await page.goto("http://localhost:3000/profile");
await page.waitForSelector('input[name="googleEmail"]');
const googleForm = page.locator('form:has(input[name="googleEmail"])');
await googleForm.locator('input[name="googleEmail"]').fill("");
await googleForm.locator('input[name="googleEmail"]').fill("test.reviewer@gmail.com");
await googleForm.locator('button:has-text("Save")').click();
await page.waitForTimeout(800);
const savedValue = await page.inputValue('input[name="googleEmail"]');
console.log("Profile googleEmail field after save:", savedValue);

// Confirm it persists across reload (not just optimistic UI).
await page.reload();
await page.waitForSelector('input[name="googleEmail"]');
const persistedValue = await page.inputValue('input[name="googleEmail"]');
console.log("Profile googleEmail field after reload:", persistedValue);

// 2. Check /settings/integrations to see whether Google is connected for this org.
await page.goto("http://localhost:3000/settings/integrations");
await page.waitForTimeout(500);
const integrationsPageText = await page.textContent("body");
console.log("Integrations page mentions 'Connected':", integrationsPageText.includes("Connected"));
console.log("Integrations page mentions 'Google':", integrationsPageText.includes("Google"));

await page.screenshot({ path: ".playwright/google-embed-integrations.png", fullPage: true });

console.log("Console/page errors captured:", errors.length ? errors : "none");

await browser.close();
