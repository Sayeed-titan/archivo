import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { runReport } from "@/lib/reports/execute";
import { parseFilters } from "@/lib/reports/filters";
import { buildExcelReport } from "@/lib/reports/export-excel";
import { buildPdfReport } from "@/lib/reports/export-pdf";

// SRS.md FR-8.2: reports exportable to PDF and Excel.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();

  if (!user.role.canGenerateReport) {
    return new Response("Forbidden", { status: 403 });
  }

  const template = await prisma.reportTemplate.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!template) {
    return new Response("Not found", { status: 404 });
  }

  const format = request.nextUrl.searchParams.get("format");
  const fields = template.fields as string[];
  const filters = parseFilters(template.filters);
  const rows = await runReport(user, fields, filters);

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorId: user.id,
      action: "download",
      entityType: "ReportTemplate",
      entityId: template.id,
      note: `exported as ${format}`,
    },
  });

  if (format === "excel") {
    const buffer = await buildExcelReport(template.name, fields, rows);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${template.name}.xlsx"`,
      },
    });
  }

  if (format === "pdf") {
    const buffer = await buildPdfReport(template.name, fields, rows);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${template.name}.pdf"`,
      },
    });
  }

  return new Response("Unsupported format. Use ?format=excel or ?format=pdf.", { status: 400 });
}
