import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

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
    <main className="mx-auto max-w-3xl p-8">
      <Link href="/dashboard" className="text-sm text-slate-500 underline">
        ← Back to dashboard
      </Link>

      <h1 className="mt-4 text-xl font-semibold">Audit trail</h1>
      <p className="mt-1 text-sm text-slate-500">Every create, edit, delete, and download action, logged.</p>

      <form className="mt-4 flex flex-wrap gap-3 text-sm" action="/audit-log">
        <select name="actorId" defaultValue={actorId ?? ""} className="rounded-md border border-slate-300 px-2 py-1">
          <option value="">All users</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        <select name="entityType" defaultValue={entityType ?? ""} className="rounded-md border border-slate-300 px-2 py-1">
          <option value="">All entity types</option>
          <option value="Archive">Archive</option>
          <option value="File">File</option>
          <option value="FolderTemplate">Folder Template</option>
        </select>

        <select name="action" defaultValue={action ?? ""} className="rounded-md border border-slate-300 px-2 py-1">
          <option value="">All actions</option>
          <option value="create">Create</option>
          <option value="edit">Edit</option>
          <option value="delete">Delete</option>
          <option value="hard_delete">Hard delete</option>
          <option value="download">Download</option>
        </select>

        <button type="submit" className="rounded-md bg-slate-900 px-3 py-1 text-white">
          Filter
        </button>
      </form>

      <table className="mt-6 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="py-2">When</th>
            <th className="py-2">Who</th>
            <th className="py-2">Action</th>
            <th className="py-2">Entity</th>
            <th className="py-2">Note</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-slate-100">
              <td className="py-2 text-slate-500">{entry.createdAt.toLocaleString()}</td>
              <td className="py-2">{entry.actor.name}</td>
              <td className="py-2">{entry.action}</td>
              <td className="py-2 text-slate-500">
                {entry.entityType} · {entry.entityId.slice(0, 8)}…
              </td>
              <td className="py-2 text-slate-500">{entry.note ?? "—"}</td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-slate-400">
                No matching audit entries.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
