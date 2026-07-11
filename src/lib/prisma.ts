import "server-only";
import { PrismaClient, Prisma } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getAuditContext } from "@/lib/audit-context";

declare global {
  var prismaGlobal: ReturnType<typeof createExtendedClient> | undefined;
}

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

// Which tracking columns each model actually has, keyed by Prisma model name
// (as seen in the extension's `model` query-callback argument). Kept as a
// hand-written map next to this list rather than reflecting on
// Prisma.dmmf at runtime — the model set rarely changes, and a mismatch here
// (naming a column that doesn't exist) fails immediately and loudly via tsc/
// a P2009-style Prisma error, rather than silently doing nothing. Update
// this map in the same commit as any future tracking-column schema change.
type TrackedFields = {
  createdById?: string;
  updatedById?: string;
  createdIp?: string;
  updatedIp?: string;
};

const MODEL_TRACKED_FIELDS: Record<string, TrackedFields> = {
  // Full create+update tracking.
  Organization: { createdById: "createdById", updatedById: "updatedById", createdIp: "createdIp", updatedIp: "updatedIp" },
  User: { createdById: "createdById", updatedById: "updatedById", createdIp: "createdIp", updatedIp: "updatedIp" },
  Role: { createdById: "createdById", updatedById: "updatedById", createdIp: "createdIp", updatedIp: "updatedIp" },
  Category: { createdById: "createdById", updatedById: "updatedById", createdIp: "createdIp", updatedIp: "updatedIp" },
  LookupList: { createdById: "createdById", updatedById: "updatedById", createdIp: "createdIp", updatedIp: "updatedIp" },
  LookupListItem: { createdById: "createdById", updatedById: "updatedById", createdIp: "createdIp", updatedIp: "updatedIp" },
  FolderTemplate: { createdById: "createdById", updatedById: "updatedById", createdIp: "createdIp", updatedIp: "updatedIp" },
  Folder: { createdById: "createdById", updatedById: "updatedById", createdIp: "createdIp", updatedIp: "updatedIp" },
  CustomFieldDefinition: { createdById: "createdById", updatedById: "updatedById", createdIp: "createdIp", updatedIp: "updatedIp" },
  Archive: { updatedById: "updatedById", createdIp: "createdIp", updatedIp: "updatedIp" }, // createdById already set explicitly by createArchive()
  WorkflowState: { createdById: "createdById", updatedById: "updatedById", createdIp: "createdIp", updatedIp: "updatedIp" },
  WorkflowTransition: { createdById: "createdById", updatedById: "updatedById", createdIp: "createdIp", updatedIp: "updatedIp" },
  ReportTemplate: { updatedById: "updatedById", createdIp: "createdIp", updatedIp: "updatedIp" }, // createdById already set explicitly
  OrgIntegration: { updatedById: "updatedById", createdIp: "createdIp", updatedIp: "updatedIp" }, // connectedById already set explicitly
  // Append-only event/log models: create-only, no updatedAt/updatedById exists on these.
  AuditLog: { createdIp: "ip" },
  FileDownload: { createdIp: "ip" },
  File: { createdIp: "uploadIp" },
  ArchiveGrant: { createdIp: "createdIp" },
  ShareLink: { createdIp: "createdIp" },
  ExternalDocLink: { createdIp: "createdIp" },
};

function buildCreateFields(model: string, ctx: { userId: string; ip: string | null }) {
  const tracked = MODEL_TRACKED_FIELDS[model];
  if (!tracked) return {};
  const fields: Record<string, unknown> = {};
  if (tracked.createdById) fields[tracked.createdById] = ctx.userId;
  if (tracked.createdIp) fields[tracked.createdIp] = ctx.ip;
  return fields;
}

function buildUpdateFields(model: string, ctx: { userId: string; ip: string | null }) {
  const tracked = MODEL_TRACKED_FIELDS[model];
  if (!tracked?.updatedById && !tracked?.updatedIp) return {};
  const fields: Record<string, unknown> = {};
  if (tracked.updatedById) fields[tracked.updatedById] = ctx.userId;
  if (tracked.updatedIp) fields[tracked.updatedIp] = ctx.ip;
  return fields;
}

function createExtendedClient() {
  return createClient().$extends({
    name: "audit-tracking",
    query: {
      $allModels: {
        async create({ model, args, query }) {
          const ctx = getAuditContext();
          if (ctx) {
            (args as { data: Record<string, unknown> }).data = {
              ...(args as { data: Record<string, unknown> }).data,
              ...buildCreateFields(model, ctx),
            };
          }
          return query(args);
        },
        async update({ model, args, query }) {
          const ctx = getAuditContext();
          if (ctx) {
            (args as { data: Record<string, unknown> }).data = {
              ...(args as { data: Record<string, unknown> }).data,
              ...buildUpdateFields(model, ctx),
            };
          }
          return query(args);
        },
        async upsert({ model, args, query }) {
          const ctx = getAuditContext();
          if (ctx) {
            const typedArgs = args as { create: Record<string, unknown>; update: Record<string, unknown> };
            typedArgs.create = { ...typedArgs.create, ...buildCreateFields(model, ctx) };
            typedArgs.update = { ...typedArgs.update, ...buildUpdateFields(model, ctx) };
          }
          return query(args);
        },
      },
    },
  });
}

export const prisma = globalThis.prismaGlobal ?? createExtendedClient();

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
