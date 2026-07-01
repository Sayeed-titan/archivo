import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { runReport } from "@/lib/reports/execute";
import { getFieldDef } from "@/lib/reports/fields";
import { parseFilters } from "@/lib/reports/filters";
import { DeleteReportButton } from "./delete-report-button";

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
    <main className="mx-auto max-w-4xl p-8">
      <Link href="/reports" className="text-sm text-slate-500 underline">
        ← Back to reports
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{template.name}</h1>
          {template.description && <p className="text-sm text-slate-500">{template.description}</p>}
        </div>
        <div className="flex gap-2">
          <a
            href={`/reports/${template.id}/export?format=excel`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium"
          >
            Export Excel
          </a>
          <a
            href={`/reports/${template.id}/export?format=pdf`}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium"
          >
            Export PDF
          </a>
          {!template.isSystemDefault && <DeleteReportButton templateId={template.id} />}
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-500">{rows.length} rows</p>

      <div className="mt-2 overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              {fields.map((key) => (
                <th key={key} className="whitespace-nowrap px-3 py-2">
                  {getFieldDef(key)?.label ?? key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-slate-100">
                {fields.map((key) => (
                  <td key={key} className="whitespace-nowrap px-3 py-2">
                    {row[key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={fields.length} className="px-3 py-4 text-center text-slate-400">
                  No matching archives.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
