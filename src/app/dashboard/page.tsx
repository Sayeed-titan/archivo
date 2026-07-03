import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getDashboardSummary, getRecentUploads, getCategoryCounts, formatBytes } from "@/lib/dashboard-data";
import { getRecentArchivesWithHealth } from "@/lib/archive-with-health";
import { getBackupStatus } from "@/lib/backup-status";
import { fileTypeIcon } from "@/lib/file-icon";
import { HealthBadge } from "@/components/health-badge";
import { Icon } from "@/components/icon";
import { Badge, Card, LinearProgress, EmptyState, Button } from "@/components/ui";

const STATUS_TONE: Record<string, "success" | "warning" | "neutral"> = {
  Archived: "success",
  "Pending Review": "warning",
  Draft: "neutral",
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  const [summary, recentArchives, recentUploads, categories, backupStatus, org] = await Promise.all([
    getDashboardSummary(user),
    getRecentArchivesWithHealth(user),
    getRecentUploads(user),
    getCategoryCounts(user),
    user.role.canManageSettings ? getBackupStatus() : Promise.resolve(null),
    prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } }),
  ]);

  const quotaBytes = org.storageQuotaBytes ? Number(org.storageQuotaBytes) : null;
  const storageRatio = quotaBytes ? Number(summary.storageBytes) / quotaBytes : null;

  const summaryCards: { label: string; value: string | number; icon: string; warn?: boolean; href?: string }[] = [
    { label: "Events Archived", value: summary.eventsCount, icon: "event", href: "/search?group=events" },
    { label: "Programs Archived", value: summary.programsCount, icon: "flag", href: "/search?group=programs" },
    { label: "Total Documents", value: summary.documentsCount, icon: "description" },
    { label: "Photos", value: summary.photosCount, icon: "photo_library", href: "/search?docType=image" },
    { label: "Videos", value: summary.videosCount, icon: "smart_display", href: "/search?docType=video" },
    {
      label: "Reports",
      value: summary.reportCount,
      icon: "monitoring",
      href: user.role.canGenerateReport ? "/reports" : undefined,
    },
    {
      label: "Pending Review",
      value: summary.pendingReviewCount,
      icon: "pending_actions",
      warn: summary.pendingReviewCount > 0,
      href: "/search?status=Pending+Review",
    },
    { label: "Storage Used", value: formatBytes(summary.storageBytes), icon: "database" },
  ];

  const quickActions: { label: string; icon: string; href: string }[] = [
    ...(user.role.canCreateArchive ? [{ label: "New Archive", icon: "add_circle", href: "/archives/new" }] : []),
    { label: "Migration Inbox", icon: "inbox", href: "/inbox" },
    { label: "Search", icon: "search", href: "/search" },
    ...(user.role.canGenerateReport ? [{ label: "Reports", icon: "monitoring", href: "/reports" }] : []),
    ...(user.role.canManageUsers ? [{ label: "Audit Log", icon: "history", href: "/audit-log" }] : []),
    ...(user.role.canManageSettings ? [{ label: "Settings", icon: "settings", href: "/settings" }] : []),
  ];

  return (
    <main className="mx-auto max-w-7xl p-4 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="type-body-medium text-on-surface-variant">
            {greeting()}, {user.name.split(" ")[0]}
          </p>
          <h1 className="type-headline-medium text-on-surface">{org.name}</h1>
          <p className="mt-1 type-body-small text-on-surface-variant">
            {user.role.name} · {user.department ?? "No department"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {quickActions.map((action) => (
            <Button key={action.href} href={action.href} variant="tonal" size="sm" icon={action.icon}>
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {backupStatus && (
        <Card
          tone={backupStatus.isOverdue ? "danger" : "default"}
          variant={backupStatus.isOverdue ? "outlined" : "filled"}
          className="mt-5 flex items-center gap-3 py-2.5"
        >
          <Icon
            name={backupStatus.isOverdue ? "gpp_bad" : "verified_user"}
            size={20}
            className={backupStatus.isOverdue ? "" : "text-success"}
          />
          <span className="type-body-medium">
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

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summaryCards.map((card) => {
          const body = (
            <Card
              variant="elevated"
              tone={card.warn ? "warn" : "default"}
              className={`h-full rounded-lg! p-4! ${card.href ? "transition-shadow hover:shadow-elevation-2" : ""}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                    card.warn ? "bg-warning-container text-on-warning-container" : "bg-primary-container text-on-primary-container"
                  }`}
                >
                  <Icon name={card.icon} size={20} />
                </span>
                <div className="min-w-0">
                  <p className={`type-headline-small leading-tight ${card.warn ? "" : "text-on-surface"}`}>{card.value}</p>
                  <p className={`truncate type-body-small ${card.warn ? "" : "text-on-surface-variant"}`}>{card.label}</p>
                </div>
              </div>
              {card.label === "Storage Used" && storageRatio !== null && (
                <LinearProgress value={storageRatio} className="mt-3" />
              )}
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

      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card variant="elevated" className="min-w-0 p-0!">
          <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
            <h2 className="type-title-medium text-on-surface">Recent Archives</h2>
            <Link
              href="/search"
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 type-label-medium text-primary hover:bg-primary-8"
            >
              View all
              <Icon name="arrow_forward" size={14} />
            </Link>
          </div>
          {recentArchives.length > 0 ? (
            <ul className="divide-y divide-outline-variant/60">
              {recentArchives.map((archive) => (
                <li key={archive.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/archives/${archive.id}`}
                      className="truncate font-medium text-on-surface hover:text-primary hover:underline"
                    >
                      {archive.name}
                    </Link>
                    <span className="whitespace-nowrap type-body-small text-on-surface-variant">
                      {archive.createdAt.toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="type-body-small text-on-surface-variant">
                      {archive.category?.name ?? "Uncategorized"}
                    </span>
                    <Badge tone={STATUS_TONE[archive.status] ?? "neutral"}>{archive.status}</Badge>
                    <HealthBadge health={archive.health} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon="folder_off"
              title="No archives yet"
              description="Create the first one to get started."
              action={
                user.role.canCreateArchive ? (
                  <Button href="/archives/new" variant="tonal" size="sm">
                    New Archive
                  </Button>
                ) : undefined
              }
            />
          )}
        </Card>

        <div className="flex flex-col gap-5">
          <Card variant="elevated" className="p-0!">
            <div className="border-b border-outline-variant px-4 py-3">
              <h2 className="type-title-medium text-on-surface">Recent Uploads</h2>
            </div>
            {recentUploads.length > 0 ? (
              <ul className="divide-y divide-outline-variant/60">
                {recentUploads.map((file) => (
                  <li key={file.id} className="flex items-start gap-3 px-4 py-2.5">
                    <Icon name={fileTypeIcon(file.fileType)} size={20} className="mt-0.5 text-on-surface-variant" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate type-body-medium text-on-surface">{file.filename}</span>
                        <span className="whitespace-nowrap type-body-small text-on-surface-variant">
                          {file.uploadedAt.toLocaleDateString()}
                        </span>
                      </div>
                      <p className="truncate type-body-small text-on-surface-variant">
                        {file.uploadedBy.name} · {file.folder.archive.name}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon="cloud_upload"
                title="No uploads yet"
                description="Files added to any archive will show up here."
                action={
                  <Button href="/inbox" variant="tonal" size="sm">
                    Open Migration Inbox
                  </Button>
                }
              />
            )}
          </Card>

          <Card variant="elevated" className="p-0!">
            <div className="border-b border-outline-variant px-4 py-3">
              <h2 className="type-title-medium text-on-surface">Archive by Category</h2>
            </div>
            <div className="flex flex-wrap gap-2 p-4">
              {categories.map((category) => (
                <Badge key={category.id} tone="neutral">
                  {category.name}
                  <span className="text-on-surface-variant/70">{category._count.archives}</span>
                </Badge>
              ))}
              {categories.length === 0 && <p className="type-body-small text-on-surface-variant">No categories yet.</p>}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
