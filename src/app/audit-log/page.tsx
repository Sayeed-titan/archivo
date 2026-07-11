import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { queryAuditLog, toAuditLogRow } from "@/lib/audit-log-query";
import { PageHeader, Combobox, Button } from "@/components/ui";
import { AuditLogTable } from "./audit-log-table";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ actorId?: string; entityType?: string; action?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user.role.canManageUsers) {
    redirect("/dashboard");
  }

  const { actorId, entityType, action } = await searchParams;

  const [entries, users] = await Promise.all([
    queryAuditLog(user.organizationId, { actorId, entityType, action }),
    prisma.user.findMany({ where: { organizationId: user.organizationId } }),
  ]);

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-8">
      <PageHeader
        backHref="/dashboard"
        backLabel="Dashboard"
        title="Audit trail"
        subtitle="Every create, edit, delete, and download action, logged."
      />

      <form className="mt-4 flex flex-wrap items-start gap-3" action="/audit-log">
        <Combobox
          name="actorId"
          defaultValue={actorId ?? ""}
          placeholder="All users"
          compact
          className="w-56"
          options={users.map((u) => ({ value: u.id, label: u.name, description: u.department ?? undefined }))}
        />

        <Combobox
          name="entityType"
          defaultValue={entityType ?? ""}
          placeholder="All entity types"
          compact
          className="w-48"
          options={[
            { value: "Archive", label: "Archive" },
            { value: "File", label: "File" },
            { value: "Category", label: "Category" },
            { value: "FolderTemplate", label: "Folder Template" },
          ]}
        />

        <Combobox
          name="action"
          defaultValue={action ?? ""}
          placeholder="All actions"
          compact
          className="w-40"
          options={[
            { value: "create", label: "Create" },
            { value: "edit", label: "Edit" },
            { value: "delete", label: "Delete" },
            { value: "hard_delete", label: "Hard delete" },
            { value: "download", label: "Download" },
          ]}
        />

        <Button type="submit" size="sm" icon="filter_alt" className="mt-0.5">
          Filter
        </Button>
      </form>

      <div className="mt-6">
        <AuditLogTable rows={entries.map(toAuditLogRow)} filters={{ actorId, entityType, action }} />
      </div>
    </main>
  );
}
