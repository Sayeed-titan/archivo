import type { Page } from "@playwright/test";

// Matches prisma/seed.ts exactly — same accounts used throughout the rest
// of the project's ad-hoc .playwright/*.mjs scripts and docs/user-manual/.
export const DEMO_USERS = {
  admin: { email: "admin@demo-ngo.org", password: "Password123!", role: "Administrator" },
  officer: { email: "officer@demo-ngo.org", password: "Password123!", role: "Archive Officer" },
  deptUser: { email: "deptuser@demo-ngo.org", password: "Password123!", role: "Department User" },
  viewer: { email: "viewer@demo-ngo.org", password: "Password123!", role: "Viewer" },
} as const;

export async function login(page: Page, user: { email: string; password: string }) {
  await page.goto("/login");
  // Same selectors as the project's existing .playwright/shot.mjs walk
  // script — proven against this exact login form.
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard", { timeout: 20_000 });
}
