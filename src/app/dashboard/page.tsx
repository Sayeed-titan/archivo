import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { prisma, withConnectionRetry } from "@/lib/prisma";
import { getDashboardSummary, getRecentUploads, browseUploads, getCategoryCounts, formatBytes } from "@/lib/dashboard-data";
import { getRecentArchivesWithHealth } from "@/lib/archive-with-health";
import { browseArchives } from "@/lib/browse-archives";
import { getBackupStatus } from "@/lib/backup-status";
import { Icon } from "@/components/icon";
import { Badge, Card, LinearProgress, Button } from "@/components/ui";
import { RecentUploadsCard } from "./recent-uploads-card";
import { RecentArchivesCard } from "./recent-archives-card";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatEventDate(eventDate: Date | null, eventEndDate: Date | null): string | null {
  if (!eventDate) return null;
  if (eventEndDate && eventEndDate.getTime() !== eventDate.getTime()) {
    return `${eventDate.toLocaleDateString()} – ${eventEndDate.toLocaleDateString()}`;
  }
  return eventDate.toLocaleDateString();
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    uploadsQ?: string;
    uploadsDateFrom?: string;
    uploadsDateFromEnd?: string;
    tab?: string;
    archivesQ?: string;
    archivesDateFrom?: string;
    archivesDateFromEnd?: string;
  }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const hasBrowseParams = Boolean(params.uploadsQ || params.uploadsDateFrom || params.tab === "uploads-browse");
  const hasArchivesSearchParams = Boolean(params.archivesQ || params.archivesDateFrom);

  const [summary, recentArchives, archivesSearchResults, recentUploads, browseUploadResults, categories, backupStatus, org] =
    await Promise.all([
      getDashboardSummary(user),
      getRecentArchivesWithHealth(user),
      hasArchivesSearchParams
        ? browseArchives(user, { q: params.archivesQ, dateFrom: params.archivesDateFrom, dateFromEnd: params.archivesDateFromEnd })
        : Promise.resolve([]),
      getRecentUploads(user),
      hasBrowseParams
        ? browseUploads(user, { q: params.uploadsQ, dateFrom: params.uploadsDateFrom, dateFromEnd: params.uploadsDateFromEnd })
        : Promise.resolve([]),
      getCategoryCounts(user),
      user.role.canManageSettings ? getBackupStatus() : Promise.resolve(null),
      withConnectionRetry(() => prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } })),
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
          <RecentUploadsCard
            recent={recentUploads.map((file) => ({
              id: file.id,
              filename: file.filename,
              fileType: file.fileType,
              uploadedByName: file.uploadedBy.name,
              archiveId: file.folder.archive.id,
              archiveName: file.folder.archive.name,
              uploadedAt: file.uploadedAt.toLocaleDateString(),
            }))}
            browseResults={browseUploadResults.map((file) => ({
              id: file.id,
              filename: file.filename,
              fileType: file.fileType,
              uploadedByName: file.uploadedBy.name,
              archiveId: file.folder.archive.id,
              archiveName: file.folder.archive.name,
              uploadedAt: file.uploadedAt.toLocaleDateString(),
            }))}
            browseQuery={params.uploadsQ ?? ""}
            browseDateFrom={params.uploadsDateFrom ?? ""}
            browseDateFromEnd={params.uploadsDateFromEnd ?? ""}
            hasBrowseParams={hasBrowseParams}
          />
        </Card>

        <div className="flex min-w-0 flex-col gap-5">
          <Card variant="elevated" className="min-w-0 p-0!">
            <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
              <h2 className="type-title-medium text-on-surface">Recent Archives</h2>
              <Link
                href="/archives"
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 type-label-medium text-primary hover:bg-primary-8"
              >
                View all
                <Icon name="arrow_forward" size={14} />
              </Link>
            </div>
            <RecentArchivesCard
              recent={recentArchives.map((archive) => ({
                id: archive.id,
                name: archive.name,
                categoryName: archive.category?.name ?? "Uncategorized",
                status: archive.status,
                updatedAt: archive.updatedAt.toLocaleDateString(),
                eventDate: formatEventDate(archive.eventDate, archive.eventEndDate),
                health: archive.health,
              }))}
              searchResults={archivesSearchResults.map((archive) => ({
                id: archive.id,
                name: archive.name,
                categoryName: archive.category?.name ?? "Uncategorized",
                status: archive.status,
                updatedAt: archive.updatedAt.toLocaleDateString(),
                eventDate: formatEventDate(archive.eventDate, archive.eventEndDate),
                health: archive.health,
              }))}
              searchQuery={params.archivesQ ?? ""}
              searchDateFrom={params.archivesDateFrom ?? ""}
              searchDateFromEnd={params.archivesDateFromEnd ?? ""}
              hasSearchParams={hasArchivesSearchParams}
              canCreateArchive={user.role.canCreateArchive}
            />
          </Card>

          <Card variant="elevated" className="p-0!">
            <div className="border-b border-outline-variant px-4 py-3">
              <h2 className="type-title-medium text-on-surface">Archive by Category</h2>
            </div>
            <div className="flex flex-wrap gap-2 p-4">
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/archives?categoryId=${category.id}`}
                  className="transition-transform hover:scale-105"
                >
                  <Badge tone="neutral" className="cursor-pointer hover:bg-on-surface-8">
                    {category.name}
                    <span className="text-on-surface-variant/70">{category._count.archives}</span>
                  </Badge>
                </Link>
              ))}
              {categories.length === 0 && <p className="type-body-small text-on-surface-variant">No categories yet.</p>}
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
