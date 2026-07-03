import "server-only";
import { prisma } from "@/lib/prisma";

// Shared between the audit-log page and its export route so both render
// exactly the same filtered result set (the export route reruns this
// rather than trusting a client-provided row list).
export type AuditLogFilters = { actorId?: string; entityType?: string; action?: string };

// Bounded read, matching the existing pattern elsewhere in the app
// (reports cap at 1000 rows) — DataTable paginates client-side over
// whatever comes back from here, see src/hooks/use-data-table.ts.
const MAX_ROWS = 1000;

export async function queryAuditLog(organizationId: string, filters: AuditLogFilters) {
  return prisma.auditLog.findMany({
    where: {
      organizationId,
      ...(filters.actorId ? { actorId: filters.actorId } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.action ? { action: filters.action } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
    include: { actor: true },
  });
}

export type AuditLogEntry = Awaited<ReturnType<typeof queryAuditLog>>[number];

export function toAuditLogRow(entry: AuditLogEntry) {
  return {
    id: entry.id,
    when: entry.createdAt.toLocaleString(),
    who: entry.actor.name,
    action: entry.action,
    entity: `${entry.entityType} · ${entry.entityId.slice(0, 8)}…`,
    note: entry.note ?? "—",
  };
}
