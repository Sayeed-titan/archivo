import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { runReport } from "@/lib/reports/execute";
import { getFieldDef } from "@/lib/reports/fields";
import { parseFilters } from "@/lib/reports/filters";
import { DeleteReportButton } from "./delete-report-button";
import { PageHeader, Button, Table, TableHead, Th, Td, TableRow, TableEmptyState } from "@/components/ui";

export default async function ReportRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user.role.canGenerateReport) {
    redirect("/dashboard");
  }

  const template = await prisma.reportTemplate.findFirst({
    where: { id, organizationId: user.organizationId },
  });
  if (!template) {
    notFound();
  }

  const fields = template.fields as string[];
  const filters = parseFilters(template.filters);
  const rows = await runReport(user, fields, filters);

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-8">
      <PageHeader
        backHref="/reports"
        backLabel="Reports"
        title={template.name}
        subtitle={template.description}
        actions={
          <>
            <Button href={`/reports/${template.id}/export?format=excel`} variant="outlined" icon="table_chart">
              Export Excel
            </Button>
            <Button href={`/reports/${template.id}/export?format=pdf`} variant="outlined" icon="picture_as_pdf">
              Export PDF
            </Button>
            {!template.isSystemDefault && <DeleteReportButton templateId={template.id} />}
          </>
        }
      />

      <p className="mt-4 type-body-medium text-on-surface-variant">
        {rows.length} {rows.length === 1 ? "row" : "rows"}
      </p>

      <div className="mt-2">
        <Table>
          <TableHead>
            {fields.map((key) => (
              <Th key={key}>{getFieldDef(key)?.label ?? key}</Th>
            ))}
          </TableHead>
          <tbody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                {fields.map((key) => (
                  <Td key={key}>{row[key] ?? "—"}</Td>
                ))}
              </TableRow>
            ))}
            {rows.length === 0 && <TableEmptyState colSpan={fields.length} message="No matching archives." />}
          </tbody>
        </Table>
      </div>
    </main>
  );
}
