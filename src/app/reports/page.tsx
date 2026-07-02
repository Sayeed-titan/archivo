import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { PageHeader, Button, Badge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/icon";

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
        title="Reports"
        subtitle="Run a saved template, or build a new one from any combination of fields and filters."
        actions={
          <Button href="/reports/new" icon="add">
            New report
          </Button>
        }
      />

      <div className="mt-6 overflow-hidden rounded-md border border-outline-variant bg-surface">
        {templates.length > 0 ? (
          <ul className="divide-y divide-outline-variant/60">
            {templates.map((template) => (
              <li key={template.id}>
                <Link
                  href={`/reports/${template.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-on-surface-8"
                >
                  <Icon name="monitoring" size={22} className="shrink-0 text-on-surface-variant" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="type-body-large text-on-surface">{template.name}</span>
                      {template.isSystemDefault && (
                        <Badge tone="info" className="shrink-0">
                          built-in
                        </Badge>
                      )}
                    </span>
                    {template.description && (
                      <span className="block type-body-small text-on-surface-variant">{template.description}</span>
                    )}
                  </span>
                  <Icon name="chevron_right" size={20} className="shrink-0 text-on-surface-variant" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon="monitoring"
            title="No report templates yet"
            description="Build one by picking fields and filters — it saves as a reusable template."
            action={
              <Button href="/reports/new" variant="tonal" icon="add">
                New report
              </Button>
            }
          />
        )}
      </div>
    </main>
  );
}
