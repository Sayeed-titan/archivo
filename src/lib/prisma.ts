import "server-only";
import { PrismaClient, Prisma } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalThis.prismaGlobal ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = prisma;
}

// Local dev only: `prisma dev`'s embedded WASM Postgres intermittently
// drops live connections under concurrent load ("Server has closed the
// connection") — a known characteristic of that embedded engine (see
// CLAUDE.md's shadow-database note for its other rough edges), not a
// pool-exhaustion bug in this app. Wrap call sites that fire several
// concurrent queries (Promise.all on page load) with this instead of a
// client-wide $extends, which erases the precise overload types Prisma
// needs for things like groupBy. Retries once, briefly, and only for
// this specific transient error — anything else (constraint violations,
// business-logic errors) rethrows immediately.
const RETRYABLE_MESSAGE =
  /server has closed the connection|connection.*closed|connection.*terminated|econnreset|connectionclosed/i;

function isRetryableConnectionError(error: unknown): boolean {
  // Surfaces as different shapes depending on where in the stack it's
  // caught — a typed Prisma error, the underlying pg driver's plain
  // Error, or a DriverAdapterError wrapped in `cause` — so match on
  // message text across all of them rather than a specific class.
  if (error instanceof Error) {
    if (RETRYABLE_MESSAGE.test(error.message)) return true;
    if (error.cause instanceof Error && RETRYABLE_MESSAGE.test(error.cause.message)) return true;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P1017") return true;
  return false;
}

// Cold starts (right after `next dev` restarts) can see the whole pg pool
// still establishing itself while several queries fire at once — one
// quick retry isn't always enough in that window. Backs off across a few
// attempts before giving up and surfacing the error for real.
const RETRY_DELAYS_MS = [150, 400, 900];

export async function withConnectionRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (const delay of RETRY_DELAYS_MS) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryableConnectionError(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  return fn();
}
