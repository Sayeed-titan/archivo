import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { logout } from "@/app/actions/auth";
import { prisma } from "@/lib/prisma";
import { archiveVisibilityWhere } from "@/lib/visibility";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  const recentArchives = await prisma.archive.findMany({
    where: { ...archiveVisibilityWhere(user), isMigrationInbox: false },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { category: true },
  });

  return (
    <main className="mx-auto max-w-2xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Welcome, {user.name}</h1>
        <form action={logout}>
          <button type="submit" className="text-sm text-slate-600 underline">
            Log out
          </button>
        </form>
      </div>
      <p className="mt-2 text-sm text-slate-500">
        Role: {user.role.name} · Department: {user.department ?? "—"}
      </p>

      <div className="mt-6 flex gap-3">
        {user.role.canCreateArchive && (
          <Link href="/archives/new" className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white">
            + Create archive
          </Link>
        )}
        <Link href="/search" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium">
          Search
        </Link>
        <Link href="/inbox" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium">
          Migration Inbox
        </Link>
        {user.role.canGenerateReport && (
          <Link href="/reports" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium">
            Reports
          </Link>
        )}
        {user.role.canManageSettings && (
          <Link href="/settings/folder-templates" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium">
            Folder templates
          </Link>
        )}
        {user.role.canManageSettings && (
          <Link href="/settings/integrations" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium">
            Integrations
          </Link>
        )}
        {user.role.canManageUsers && (
          <Link href="/audit-log" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium">
            Audit trail
          </Link>
        )}
      </div>

      <h2 className="mt-8 text-sm font-medium text-slate-700">Recent archives</h2>
      <ul className="mt-2 divide-y divide-slate-200 rounded-md border border-slate-200">
        {recentArchives.map((archive) => (
          <li key={archive.id} className="px-4 py-2 text-sm">
            <Link href={`/archives/${archive.id}`} className="font-medium hover:underline">
              {archive.name}
            </Link>
            <span className="ml-2 text-slate-400">
              {archive.category?.name ?? "Uncategorized"} · {archive.status}
            </span>
          </li>
        ))}
        {recentArchives.length === 0 && <li className="px-4 py-2 text-sm text-slate-400">No archives yet.</li>}
      </ul>
    </main>
  );
}
