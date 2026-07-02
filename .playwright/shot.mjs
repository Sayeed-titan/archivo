import { chromium } from "playwright";

const shots = "C:/Users/User/AppData/Local/Temp/claude/d--Departmental-Official-Assignements-Achieve-Management/f2152191-d11a-4066-b715-2c9edde0b7fe/scratchpad";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await page.screenshot({ path: `${shots}/01-login.png`, fullPage: true });

await page.fill('input[name="email"]', "admin@demo-ngo.org");
await page.fill('input[name="password"]', "Password123!");
await page.click('button[type="submit"]');
await page.waitForURL("**/dashboard", { timeout: 20000 });
await page.waitForLoadState("networkidle");
await page.screenshot({ path: `${shots}/02-dashboard.png`, fullPage: true });

console.log("URL:", page.url());
console.log("console errors:", errors.length ? errors.slice(0, 5) : "none");
await browser.close();
