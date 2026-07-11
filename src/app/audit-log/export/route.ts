import { NextRequest } from "next/server";
import { withAuditContext } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { queryAuditLog, toAuditLogRow } from "@/lib/audit-log-query";
import { exportDataTable } from "@/lib/data-table/export";

// Small, page-specific export route (per the plan: no single "god route"
// for every entity type) — reruns the exact same query the audit-log
// page itself uses, so the export always matches what's on screen.
export async function POST(request: NextRequest) {
  return withAuditContext(async (user) => {
    if (!user.role.canManageUsers) {
      return new Response("Forbidden", { status: 403 });
    }

    const params = request.nextUrl.searchParams;
    const format = params.get("format");
    if (format !== "excel" && format !== "pdf") {
      return new Response("Unsupported format. Use ?format=excel or ?format=pdf.", { status: 400 });
    }

    const entries = await queryAuditLog(user.organizationId, {
      actorId: params.get("actorId") ?? undefined,
      entityType: params.get("entityType") ?? undefined,
      action: params.get("action") ?? undefined,
    });
    const rows = entries.map(toAuditLogRow);

    const columns = [
      { key: "when", label: "When" },
      { key: "who", label: "Who" },
      { key: "action", label: "Action" },
      { key: "entity", label: "Entity" },
      { key: "note", label: "Note" },
    ];

    const { buffer, contentType, filename } = await exportDataTable(format, "Audit Trail", columns, rows);

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.id,
        action: "download",
        entityType: "AuditLog",
        entityId: user.organizationId,
        note: `exported audit trail as ${format}`,
      },
    });

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  });
}
