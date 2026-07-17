import { resetTestDb } from "./reset-test-db";

// Runs once before the whole E2E run (not per-spec — see playwright.config.ts).
// Guarantees every spec starts from the same known seeded state regardless
// of what a previous local run left behind.
export default async function globalSetup() {
  await resetTestDb();
}
