import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { logout } from "@/app/actions/auth";
import { getDashboardSummary, getRecentUploads, getCategoryCounts, formatBytes } from "@/lib/dashboard-data";
import { getRecentArchivesWithHealth } from "@/lib/archive-with-health";
import { getBackupStatus } from "@/lib/backup-status";
import { HealthBadge } from "@/components/health-badge";
import { NotificationBell } from "@/components/notification-bell";
import { Button, Badge, Card, Table, TableHead, Th, Td, TableRow, TableEmptyState } from "@/components/ui";

const STATUS_TONE: Record<string, "success" | "warning" | "neutral"> = {
  Archived: "success",
  "Pending Review": "warning",
  Draft: "neutral",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();

  const [summary, recentArchives, recentUploads, categories, notifications, backupStatus] = await Promise.all([
    getDashboardSummary(user),
    getRecentArchivesWithHealth(user),
    getRecentUploads(user),
    getCategoryCounts(user),
    prisma.notification.findMany({
      where: { recipientId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    user.role.canManageSettings ? getBackupStatus() : Promise.resolve(null),
  ]);

  const summaryCards = [
    { label: "Events Archived", value: summary.eventsCount, href: "/search?group=events" },
    { label: "Programs Archived", value: summary.programsCount, href: "/search?group=programs" },
    { label: "Total Documents", value: summary.documentsCount },
    { label: "Photos", value: summary.photosCount, href: "/search?docType=image" },
    { label: "Videos", value: summary.videosCount, href: "/search?docType=video" },
    { label: "Reports", value: summary.reportCount, href: user.role.canGenerateReport ? "/reports" : undefined },
    { label: "Pending Review", value: summary.pendingReviewCount, warn: true, href: "/search?status=Pending+Review" },
    { label: "Storage Used", value: formatBytes(summary.storageBytes) },
  ];

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Welcome, {user.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Role: {user.role.name} · Department: {user.department ?? "—"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell notifications={notifications} />
          <Button href="/profile" variant="ghost">
            Profile
          </Button>
          <form action={logout}>
            <Button type="submit" variant="ghost">
              Log out
            </Button>
          </form>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summaryCards.map((card) => {
          const body = (
            <Card
              tone={card.warn ? "warn" : "default"}
              className={`rounded-lg ${card.href ? "transition-colors hover:border-slate-400 hover:bg-slate-50" : ""}`}
            >
              <p className={`text-2xl font-semibold ${card.warn ? "text-amber-700" : "text-slate-900"}`}>{card.value}</p>
              <p className="mt-1 text-xs text-slate-500">{card.label}</p>
            </Card>
          );
          return card.href ? (
            <Link key={card.label} href={card.href} className="block">
              {body}
            </Link>
          ) : (
            <div key={card.label}>{body}</div>
          );
        })}
      </div>

      {backupStatus && (
        <Card tone={backupStatus.isOverdue ? "danger" : "default"} className="mt-3 py-2 text-sm">
          <span className={backupStatus.isOverdue ? "text-red-700" : "text-emerald-700"}>
            {backupStatus.lastBackup ? (
              <>
                Last backup: {new Date(backupStatus.lastBackup.createdAt).toLocaleString()} (
                {backupStatus.hoursSinceLastBackup !== null ? `${backupStatus.hoursSinceLastBackup.toFixed(1)}h ago` : "—"})
                {backupStatus.isOverdue && " — overdue (RPO target: 24h)"}
              </>
            ) : (
              "No backups found yet — run `npm run backup` or schedule it (see CLAUDE.md)."
            )}
          </span>
        </Card>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        {user.role.canCreateArchive && (
          <Button href="/archives/new" variant="primary" size="lg">
            + Create archive
          </Button>
        )}
        <Button href="/inbox" variant="secondary" size="lg">
          Migration Inbox
        </Button>
        <Button href="/search" variant="secondary" size="lg">
          Search
        </Button>
        {user.role.canGenerateReport && (
          <Button href="/reports" variant="secondary" size="lg">
            Reports
          </Button>
        )}
        {user.role.canManageSettings && (
          <Button href="/settings/folder-templates" variant="secondary" size="lg">
            Folder templates
          </Button>
        )}
        {user.role.canManageSettings && (
          <Button href="/settings/integrations" variant="secondary" size="lg">
            Integrations
          </Button>
        )}
        {user.role.canManageSettings && (
          <Button href="/settings/workflow" variant="secondary" size="lg">
            Workflow
          </Button>
        )}
        {user.role.canManageSettings && (
          <Button href="/settings/security" variant="secondary" size="lg">
            Security
          </Button>
        )}
        {user.role.canManageUsers && (
          <Button href="/audit-log" variant="secondary" size="lg">
            Audit trail
          </Button>
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
          <div className="mt-2">
            <Table>
              <TableHead>
                <Th>Date</Th>
                <Th>Archive</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th>Health</Th>
              </TableHead>
              <tbody>
                {recentArchives.map((archive) => (
                  <TableRow key={archive.id}>
                    <Td className="text-slate-500">{archive.createdAt.toLocaleDateString()}</Td>
                    <Td className="whitespace-normal">
                      <Link href={`/archives/${archive.id}`} className="font-medium hover:underline">
                        {archive.name}
                      </Link>
                    </Td>
                    <Td className="text-slate-500">{archive.category?.name ?? "Uncategorized"}</Td>
                    <Td>
                      <Badge tone={STATUS_TONE[archive.status] ?? "neutral"}>{archive.status}</Badge>
                    </Td>
                    <Td>
                      <HealthBadge health={archive.health} />
                    </Td>
                  </TableRow>
                ))}
                {recentArchives.length === 0 && <TableEmptyState colSpan={5} message="No archives yet." />}
              </tbody>
            </Table>
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
              <Badge key={category.id} tone="neutral" className="border-slate-300 bg-white text-slate-700">
                {category.name}
                <span className="ml-1 text-slate-400">{category._count.archives}</span>
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
