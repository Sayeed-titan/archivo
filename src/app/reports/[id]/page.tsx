import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { runReport } from "@/lib/reports/execute";
import { getFieldDef } from "@/lib/reports/fields";
import { parseFilters } from "@/lib/reports/filters";
import { DeleteReportButton } from "./delete-report-button";
import { ReportRunTable } from "./report-run-table";
import { PrintButton } from "./print-button";
import { PageHeader, Button } from "@/components/ui";

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
          <span className="no-print flex flex-wrap items-center gap-2">
            <PrintButton />
            <Button href={`/reports/${template.id}/export?format=excel`} variant="outlined" icon="table_chart">
              Export Excel
            </Button>
            <Button href={`/reports/${template.id}/export?format=pdf`} variant="outlined" icon="picture_as_pdf">
              Export PDF
            </Button>
            {!template.isSystemDefault && <DeleteReportButton templateId={template.id} />}
          </span>
        }
      />

      <p className="mt-4 type-body-medium text-on-surface-variant">
        {rows.length} {rows.length === 1 ? "row" : "rows"}
      </p>

      <div className="mt-2">
        <ReportRunTable
          rows={rows.map((row, i) => ({ ...row, __rowId: String(i) }))}
          fields={fields}
          fieldLabels={Object.fromEntries(fields.map((key) => [key, getFieldDef(key)?.label ?? key]))}
          storageKey={`report-table:${template.id}`}
        />
      </div>
    </main>
  );
}
