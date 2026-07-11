import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

// Carries the current request's actor + IP across the whole lifetime of a
// Server Action call, so the Prisma audit extension (src/lib/prisma.ts) can
// stamp createdById/updatedById/createdIp/updatedIp without every call site
// having to pass them explicitly. Populated by withAuditContext() (src/lib/dal.ts).
export type AuditContext = {
  userId: string;
  userName: string;
  ip: string | null;
};

const storage = new AsyncLocalStorage<AuditContext>();

export function getAuditContext(): AuditContext | undefined {
  return storage.getStore();
}

export function runWithAuditContext<T>(context: AuditContext, fn: () => T): T {
  return storage.run(context, fn);
}
