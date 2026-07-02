import Link from "next/link";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getDashboardSummary, getRecentUploads, getCategoryCounts, formatBytes } from "@/lib/dashboard-data";
import { getRecentArchivesWithHealth } from "@/lib/archive-with-health";
import { getBackupStatus } from "@/lib/backup-status";
import { HealthBadge } from "@/components/health-badge";
import { Icon } from "@/components/icon";
import {
  Badge,
  Card,
  LinearProgress,
  PageHeader,
  Table,
  TableHead,
  Th,
  Td,
  TableRow,
  TableEmptyState,
  EmptyState,
  Button,
} from "@/components/ui";

const STATUS_TONE: Record<string, "success" | "warning" | "neutral"> = {
  Archived: "success",
  "Pending Review": "warning",
  Draft: "neutral",
};

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

  return (
    <main className="mx-auto max-w-5xl p-4 sm:p-8">
      <PageHeader
        title={`Welcome, ${user.name}`}
        subtitle={`${user.role.name} · ${user.department ?? "No department"}`}
      />

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summaryCards.map((card) => {
          const body = (
            <Card
              tone={card.warn ? "warn" : "default"}
              className={`h-full rounded-lg ${card.href ? "transition-shadow hover:shadow-elevation-1" : ""}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className={`type-headline-small ${card.warn ? "" : "text-on-surface"}`}>{card.value}</p>
                <Icon
                  name={card.icon}
                  size={20}
                  className={card.warn ? "text-on-warning-container" : "text-on-surface-variant"}
                />
              </div>
              <p className={`mt-1 type-body-small ${card.warn ? "" : "text-on-surface-variant"}`}>{card.label}</p>
              {card.label === "Storage Used" && quotaBytes && (
                <LinearProgress value={Number(summary.storageBytes) / quotaBytes} className="mt-2" />
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

      {backupStatus && (
        <Card tone={backupStatus.isOverdue ? "danger" : "default"} className="mt-4 flex items-center gap-3 py-3">
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

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex items-center justify-between">
            <h2 className="type-title-medium text-on-surface">Recent Archives</h2>
            <Link
              href="/search"
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 type-label-medium text-primary hover:bg-primary-8"
            >
              View all
              <Icon name="arrow_forward" size={14} />
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
                    <Td className="text-on-surface-variant">{archive.createdAt.toLocaleDateString()}</Td>
                    <Td className="whitespace-normal">
                      <Link href={`/archives/${archive.id}`} className="font-medium text-on-surface hover:text-primary hover:underline">
                        {archive.name}
                      </Link>
                    </Td>
                    <Td className="text-on-surface-variant">{archive.category?.name ?? "Uncategorized"}</Td>
                    <Td>
                      <Badge tone={STATUS_TONE[archive.status] ?? "neutral"}>{archive.status}</Badge>
                    </Td>
                    <Td>
                      <HealthBadge health={archive.health} />
                    </Td>
                  </TableRow>
                ))}
                {recentArchives.length === 0 && <TableEmptyState colSpan={5} message="No archives yet — create the first one." />}
              </tbody>
            </Table>
          </div>
        </div>

        <div>
          <h2 className="type-title-medium text-on-surface">Recent Uploads</h2>
          <div className="mt-2 overflow-hidden rounded-md border border-outline-variant bg-surface">
            {recentUploads.length > 0 ? (
              <ul className="divide-y divide-outline-variant/60">
                {recentUploads.map((file) => (
                  <li key={file.id} className="flex items-start gap-3 px-3 py-2.5">
                    <Icon name="draft" size={20} className="mt-0.5 text-on-surface-variant" />
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
          </div>

          <h2 className="mt-6 type-title-medium text-on-surface">Archive by Category</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.map((category) => (
              <Badge key={category.id} tone="neutral">
                {category.name}
                <span className="text-on-surface-variant/70">{category._count.archives}</span>
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
