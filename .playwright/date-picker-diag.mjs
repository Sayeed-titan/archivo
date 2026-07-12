import { chromium } from "playwright";
const shots = "C:/Users/User/AppData/Local/Temp/claude/d--Departmental-Official-Assignements-Achieve-Management/1983eb71-51b2-4438-a60f-691893f9cc6d/scratchpad";
const base = "http://localhost:3001";
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

await page.goto(`${base}/search`);
await page.waitForLoadState("networkidle");

// open the date picker (the "Select date…" button)
const trigger = page.getByRole("button", { name: /select date/i });
await trigger.click();
await page.waitForTimeout(250);
await page.screenshot({ path: `${shots}/diag-picker-open.png` });

// measure the popover and a week row grid
const diag = await page.evaluate(() => {
  const popover = document.querySelector("div.absolute.z-40");
  if (!popover) return { error: "popover not found" };
  const rows = popover.querySelectorAll("div.grid");
  const info = [];
  rows.forEach((r, i) => {
    const cs = getComputedStyle(r);
    info.push({
      i,
      display: cs.display,
      gridTemplateColumns: cs.gridTemplateColumns,
      width: r.getBoundingClientRect().width,
    });
  });
  const pcs = getComputedStyle(popover);
  return {
    popoverRect: popover.getBoundingClientRect(),
    popoverWidth: pcs.width,
    popoverDisplay: pcs.display,
    gridRows: info,
  };
});
console.log(JSON.stringify(diag, null, 2));
console.log("errors:", errors.length ? errors : "none");
await browser.close();
