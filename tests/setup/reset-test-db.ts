import { Client } from "pg";
import { execSync } from "node:child_process";

// The embedded `prisma dev` Postgres intermittently drops live connections
// under concurrent/rapid connect-disconnect churn — the same documented
// characteristic src/lib/prisma.ts's withConnectionRetry() exists to paper
// over for the app itself (see its comment for detail). Running several
// test files back-to-back, each truncating + reseeding, reproduces exactly
// that churn, so this helper retries the same way rather than duplicating
// a second explanation of the same root cause.
const RETRYABLE_MESSAGE = /connection terminated|server has closed the connection|econnreset|connection.*closed/i;

async function withRetry<T>(fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!(error instanceof Error) || !RETRYABLE_MESSAGE.test(error.message)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 300 * (i + 1)));
    }
  }
  throw lastError;
}

// Wipes every table in the test database and reseeds it via the project's
// real prisma/seed.ts (run as a subprocess, not imported — the seed script
// runs its own main()/process.exit()/$disconnect() at module load time, so
// importing it directly would interfere with the caller's own process).
//
// Truncating is schema-driven (reads pg_tables) rather than a hardcoded
// table list, so it never drifts out of sync with prisma/schema.prisma.
export async function resetTestDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set — is .env.test loaded?");
  }
  if (!/localhost|127\.0\.0\.1/.test(url)) {
    // Cheap guardrail: this helper TRUNCATEs every table. Refuse to run
    // against anything that doesn't look like a local test database.
    throw new Error(`Refusing to reset a non-local DATABASE_URL: ${url}`);
  }

  try {
    await resetTestDbInner(url);
  } catch (error) {
    throw new Error(explainDbError(error), { cause: error });
  }
}

// Turns a raw pg/connection error into an actionable message instead of a
// bare ECONNRESET/ECONNREFUSED — this is what shows up in a failed
// `pre-push` run, and "why did my push fail" shouldn't require reading this
// file's source to answer. See docs/testing.md's "known gotcha" section.
function explainDbError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/econnrefused/i.test(message)) {
    return (
      `Could not reach the local test database (${message}). ` +
      `It's probably not running — start it with:\n\n  npm run test:db:start\n\n` +
      `See docs/testing.md's "The test database" section.`
    );
  }
  if (RETRYABLE_MESSAGE.test(message)) {
    return (
      `The local test database kept dropping the connection after several ` +
      `retries (${message}). CI is unaffected by this — see docs/testing.md's ` +
      `"known gotcha" section for the local-only cause. Try restarting it:\n\n` +
      `  npx prisma dev rm test --force\n  npm run test:db:start\n  npm run test:db:reset\n`
    );
  }
  return message;
}

async function resetTestDbInner(url: string) {
  await withRetry(async () => {
    const client = new Client({ connectionString: url });
    // pg's Client emits its own "error" event when the embedded engine
    // drops the connection mid-operation — with no listener attached, Node
    // treats that as an uncaught exception and crashes the whole process,
    // bypassing the try/catch below entirely. A listener here just lets
    // the awaited call below reject normally so withRetry can catch it.
    client.on("error", () => {});
    await client.connect();
    try {
      const { rows } = await client.query<{ tablename: string }>(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
      );
      if (rows.length > 0) {
        const tables = rows.map((r) => `"${r.tablename}"`).join(", ");
        await client.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
      }
    } finally {
      await client.end();
    }
  });

  await withRetry(async () => {
    execSync("npx tsx prisma/seed.ts", {
      stdio: process.env.CI ? "inherit" : "pipe",
      env: process.env,
    });
  });

  // The seed subprocess opens and closes its own connection to the embedded
  // engine; querying again immediately from the test file's own long-lived
  // Prisma client occasionally races that teardown and gets a dropped
  // connection (see the comment on RETRYABLE_MESSAGE above). A brief settle
  // delay is cheap insurance against that, on top of the retries already in
  // place for the truncate/seed steps themselves.
  await new Promise((resolve) => setTimeout(resolve, 400));
}
