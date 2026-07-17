// Regenerates every screenshot used in docs/user-manual/.
// Run with the dev server up (npm run dev:all) and the demo org seeded:
//   node .playwright/user-manual-screenshots.mjs
//
// Uses the Administrator demo account for almost every shot (it can see every
// settings page); a couple of shots switch to the Viewer account to show a
// restricted view. Writes PNGs straight into docs/user-manual/images/.

import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "docs", "user-manual", "images");
const BASE = "http://localhost:3001";

const ADMIN = { email: "admin@demo-ngo.org", password: "Password123!" };
const VIEWER = { email: "viewer@demo-ngo.org", password: "Password123!" };

async function shot(page, name, { fullPage = true } = {}) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage });
  console.log("captured", name);
}

async function login(page, { email, password }) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 20000 });
  await page.waitForLoadState("networkidle");
}

async function logout(page) {
  // Clicking the "Sign out" menu item is flaky under automation (a
  // click-outside handler races the form submit and can swallow it) —
  // clearing the session cookie directly is the reliable way to switch
  // demo accounts within one script run. This isn't how a real user signs
  // out; it's just how this script hops between roles for screenshots.
  await page.context().clearCookies();
}

async function goto(page, urlPath) {
  await page.goto(`${BASE}${urlPath}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

// --- Login ---
await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
await shot(page, "login");

await login(page, ADMIN);
await shot(page, "dashboard-admin");

// --- Command palette ---
await page.getByRole("button", { name: "Open quick search" }).first().click();
await page.waitForTimeout(300);
await shot(page, "command-palette", { fullPage: false });
await page.keyboard.press("Escape");

// --- Notifications ---
await page.getByRole("button", { name: /^Notifications/ }).click();
await page.waitForTimeout(300);
await shot(page, "notifications-panel", { fullPage: false });
await page.keyboard.press("Escape");

// --- Account menu ---
await page.getByRole("button", { name: /^Account:/ }).click();
await page.waitForTimeout(300);
await shot(page, "account-menu", { fullPage: false });
await page.keyboard.press("Escape");

// --- New archive ---
await goto(page, "/archives/new");
await shot(page, "archive-new");

// --- Archive detail (JMI Archieve — has folders, workflow stepper, mixed health) ---
await goto(page, "/archives/cmrhnz209000e0c20nfnwjud4");
await shot(page, "archive-detail");

// Open a folder to show the file row + upload dropzone
await page.getByRole("button", { name: "Invoices & Vouchers", exact: false }).first().click();
await page.waitForTimeout(300);
await shot(page, "archive-folder-open");

// Share dialog
await page.getByRole("button", { name: /^Share /, exact: false }).first().click();
await page.waitForTimeout(300);
await shot(page, "archive-file-share-dialog", { fullPage: false });
await page.keyboard.press("Escape");

// Preview dialog
await page.getByRole("button", { name: /^Preview /, exact: false }).first().click();
await page.waitForTimeout(400);
await shot(page, "archive-file-preview-dialog", { fullPage: false });
await page.keyboard.press("Escape");

// Access page
await goto(page, "/archives/cmrhnz209000e0c20nfnwjud4/access");
await shot(page, "archive-access");

// --- Migration inbox ---
await goto(page, "/inbox");
await shot(page, "migration-inbox");

// --- Search ---
await goto(page, "/search");
await page.getByRole("button", { name: "Search", exact: true }).last().click();
await page.waitForTimeout(500);
await shot(page, "search-results");

// --- Reports ---
await goto(page, "/reports");
await shot(page, "reports-hub");

await goto(page, "/reports/new");
await shot(page, "report-builder");

await goto(page, "/reports/cmr2fk1bi0004z020scipg1d8"); // Archive Register
await shot(page, "report-run");

// --- Audit log ---
await goto(page, "/audit-log");
await shot(page, "audit-log");

// --- Settings ---
await goto(page, "/settings");
await shot(page, "settings-hub");

await goto(page, "/settings/appearance");
await shot(page, "settings-appearance");

await goto(page, "/settings/organization");
await shot(page, "settings-organization");

await goto(page, "/settings/folder-templates");
await shot(page, "settings-folder-templates");

await goto(page, "/settings/file-naming");
await shot(page, "settings-file-naming");

await goto(page, "/settings/workflow");
await shot(page, "settings-workflow");

await goto(page, "/settings/roles");
await shot(page, "settings-roles");

await goto(page, "/settings/integrations");
await shot(page, "settings-integrations");

await goto(page, "/settings/security");
await shot(page, "settings-security");

// --- Profile ---
await goto(page, "/profile");
await shot(page, "profile");

// --- Mobile nav drawer (still admin) ---
await page.setViewportSize({ width: 390, height: 844 });
await goto(page, "/dashboard");
await page.getByRole("button", { name: "Open navigation" }).click();
await page.waitForTimeout(300);
await shot(page, "mobile-nav-drawer", { fullPage: false });
await page.setViewportSize({ width: 1440, height: 900 });

// --- Viewer role dashboard (restricted nav/quick actions) ---
await logout(page);
await login(page, VIEWER);
await shot(page, "dashboard-viewer");

console.log("page errors:", errors.length ? errors.slice(0, 10) : "none");
await browser.close();
