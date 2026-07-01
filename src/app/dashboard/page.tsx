import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { logout } from "@/app/actions/auth";
import { getDashboardSummary, getRecentUploads, getCategoryCounts, formatBytes } from "@/lib/dashboard-data";
import { getRecentArchivesWithHealth } from "@/lib/archive-with-health";
import { HealthBadge } from "@/components/health-badge";
import { NotificationBell } from "@/components/notification-bell";

const STATUS_BADGE_CLASSES: Record<string, string> = {
  Archived: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Pending Review": "bg-amber-50 text-amber-700 border-amber-200",
  Draft: "bg-slate-100 text-slate-600 border-slate-200",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();

  const [summary, recentArchives, recentUploads, categories, notifications] = await Promise.all([
    getDashboardSummary(user),
    getRecentArchivesWithHealth(user),
    getRecentUploads(user),
    getCategoryCounts(user),
    prisma.notification.findMany({
      where: { recipientId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const summaryCards = [
    { label: "Events Archived", value: summary.eventsCount },
    { label: "Programs Archived", value: summary.programsCount },
    { label: "Total Documents", value: summary.documentsCount },
    { label: "Photos", value: summary.photosCount },
    { label: "Videos", value: summary.videosCount },
    { label: "Reports", value: summary.reportCount },
    { label: "Pending Review", value: summary.pendingReviewCount, warn: true },
    { label: "Storage Used", value: formatBytes(summary.storageBytes) },
  ];

  return (
    <main className="mx-auto max-w-5xl p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Welcome, {user.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Role: {user.role.name} · Department: {user.department ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell notifications={notifications} />
          <form action={logout}>
            <button type="submit" className="text-sm text-slate-600 underline">
              Log out
            </button>
          </form>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summaryCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-lg border p-4 ${card.warn ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}
          >
            <p className={`text-2xl font-semibold ${card.warn ? "text-amber-700" : "text-slate-900"}`}>{card.value}</p>
            <p className="mt-1 text-xs text-slate-500">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {user.role.canCreateArchive && (
          <Link href="/archives/new" className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white">
            + Create archive
          </Link>
        )}
        <Link href="/inbox" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium">
          Migration Inbox
        </Link>
        <Link href="/search" className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium">
          Search
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

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-700">Recent Archives</h2>
            <Link href="/search" className="text-xs text-slate-500 underline">
              View all →
            </Link>
          </div>
          <div className="mt-2 overflow-x-auto rounded-md border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Archive</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Health</th>
                </tr>
              </thead>
              <tbody>
                {recentArchives.map((archive) => (
                  <tr key={archive.id} className="border-b border-slate-100">
                    <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                      {archive.createdAt.toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      <Link href={`/archives/${archive.id}`} className="font-medium hover:underline">
                        {archive.name}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                      {archive.category?.name ?? "Uncategorized"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASSES[archive.status] ?? STATUS_BADGE_CLASSES.Draft}`}
                      >
                        {archive.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <HealthBadge health={archive.health} />
                    </td>
                  </tr>
                ))}
                {recentArchives.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-4 text-center text-slate-400">
                      No archives yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-medium text-slate-700">Recent Uploads</h2>
          <ul className="mt-2 divide-y divide-slate-200 rounded-md border border-slate-200">
            {recentUploads.map((file) => (
              <li key={file.id} className="px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="truncate">{file.filename}</span>
                  <span className="whitespace-nowrap text-xs text-slate-400">
                    {file.uploadedAt.toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {file.uploadedBy.name} · {file.folder.archive.name}
                </p>
              </li>
            ))}
            {recentUploads.length === 0 && <li className="px-3 py-4 text-center text-sm text-slate-400">No uploads yet.</li>}
          </ul>

          <h2 className="mt-6 text-sm font-medium text-slate-700">Archive by Category</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.map((category) => (
              <span
                key={category.id}
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700"
              >
                {category.name}
                <span className="ml-1 text-slate-400">{category._count.archives}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
