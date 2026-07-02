import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { PageHeader, SelectField, Button, Badge, Table, TableHead, Th, Td, TableRow, TableEmptyState } from "@/components/ui";

const ACTION_TONE: Record<string, "success" | "info" | "danger" | "neutral"> = {
  create: "success",
  edit: "info",
  delete: "danger",
  hard_delete: "danger",
  download: "neutral",
};

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
    prisma.auditLog.findMany({
      where: {
        organizationId: user.organizationId,
        ...(actorId ? { actorId } : {}),
        ...(entityType ? { entityType } : {}),
        ...(action ? { action } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { actor: true },
    }),
    prisma.user.findMany({ where: { organizationId: user.organizationId } }),
  ]);

  return (
    <main className="mx-auto max-w-4xl p-4 sm:p-8">
      <PageHeader
        title="Audit trail"
        subtitle="Every create, edit, delete, and download action, logged."
      />

      <form className="mt-4 flex flex-wrap items-center gap-3" action="/audit-log">
        <SelectField name="actorId" defaultValue={actorId ?? ""} compact>
          <option value="">All users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </SelectField>

        <SelectField name="entityType" defaultValue={entityType ?? ""} compact>
          <option value="">All entity types</option>
          <option value="Archive">Archive</option>
          <option value="File">File</option>
          <option value="FolderTemplate">Folder Template</option>
        </SelectField>

        <SelectField name="action" defaultValue={action ?? ""} compact>
          <option value="">All actions</option>
          <option value="create">Create</option>
          <option value="edit">Edit</option>
          <option value="delete">Delete</option>
          <option value="hard_delete">Hard delete</option>
          <option value="download">Download</option>
        </SelectField>

        <Button type="submit" size="sm" icon="filter_alt">
          Filter
        </Button>
      </form>

      <div className="mt-6">
        <Table>
          <TableHead>
            <Th>When</Th>
            <Th>Who</Th>
            <Th>Action</Th>
            <Th>Entity</Th>
            <Th>Note</Th>
          </TableHead>
          <tbody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <Td className="text-on-surface-variant">{entry.createdAt.toLocaleString()}</Td>
                <Td>{entry.actor.name}</Td>
                <Td>
                  <Badge tone={ACTION_TONE[entry.action] ?? "neutral"}>{entry.action}</Badge>
                </Td>
                <Td className="text-on-surface-variant">
                  {entry.entityType} · {entry.entityId.slice(0, 8)}…
                </Td>
                <Td className="text-on-surface-variant">{entry.note ?? "—"}</Td>
              </TableRow>
            ))}
            {entries.length === 0 && <TableEmptyState colSpan={5} message="No matching audit entries." />}
          </tbody>
        </Table>
      </div>
    </main>
  );
}
