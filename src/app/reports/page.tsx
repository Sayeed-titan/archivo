import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { PageHeader, Button, Badge } from "@/components/ui";

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user.role.canGenerateReport) {
    redirect("/dashboard");
  }

  const templates = await prisma.reportTemplate.findMany({
    where: { organizationId: user.organizationId },
    orderBy: [{ isSystemDefault: "desc" }, { name: "asc" }],
  });

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-8">
      <PageHeader
        backHref="/dashboard"
        backLabel="← Back to dashboard"
        title="Reports"
        actions={<Button href="/reports/new">+ New report</Button>}
      />

      <ul className="mt-6 divide-y divide-slate-200 rounded-md border border-slate-200">
        {templates.map((template) => (
          <li key={template.id} className="px-4 py-3 text-sm">
            <Link href={`/reports/${template.id}`} className="font-medium hover:underline">
              {template.name}
            </Link>
            {template.isSystemDefault && (
              <Badge tone="neutral" pill={false} className="ml-2">
                default template
              </Badge>
            )}
            {template.description && <p className="mt-0.5 text-slate-500">{template.description}</p>}
          </li>
        ))}
        {templates.length === 0 && <li className="px-4 py-3 text-sm text-slate-400">No report templates yet.</li>}
      </ul>
    </main>
  );
}
