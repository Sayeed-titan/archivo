import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

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
    <main className="mx-auto max-w-2xl p-8">
      <Link href="/dashboard" className="text-sm text-slate-500 underline">
        ← Back to dashboard
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Reports</h1>
        <Link href="/reports/new" className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white">
          + New report
        </Link>
      </div>

      <ul className="mt-6 divide-y divide-slate-200 rounded-md border border-slate-200">
        {templates.map((template) => (
          <li key={template.id} className="px-4 py-3 text-sm">
            <Link href={`/reports/${template.id}`} className="font-medium hover:underline">
              {template.name}
            </Link>
            {template.isSystemDefault && <span className="ml-2 text-xs text-slate-400">default template</span>}
            {template.description && <p className="mt-0.5 text-slate-500">{template.description}</p>}
          </li>
        ))}
        {templates.length === 0 && <li className="px-4 py-3 text-sm text-slate-400">No report templates yet.</li>}
      </ul>
    </main>
  );
}
