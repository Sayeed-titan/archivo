import "server-only";
import { prisma, withConnectionRetry } from "@/lib/prisma";
import { archiveVisibilityWhere } from "@/lib/visibility";
import { getOrgStorageBytes } from "@/lib/storage-usage";
import type { Prisma, User, Role } from "@/generated/prisma/client";

// SRS.md FR-1.1: Total Events Archived, Total Programs Archived, Total
// Documents, Photos, Videos, Reports, Pending Review, Storage Used.
// "Events" vs "Programs" isn't a schema distinction in this data model
// (both are just archives under different categories), so both roll up
// from the same visibility-scoped archive set, split by category name.
//
// Every query here runs inside withConnectionRetry (see src/lib/prisma.ts)
// — the dashboard fires many of these concurrently via Promise.all, which
// is exactly the load pattern that trips the local dev embedded
// database's occasional dropped-connection behavior.
export async function getDashboardSummary(user: User & { role: Role }) {
  const archiveWhere = { ...archiveVisibilityWhere(user), isMigrationInbox: false };

  const [
    eventsCount,
    programsCount,
    pendingReviewCount,
    fileCounts,
    reportCount,
    storageBytes,
  ] = await Promise.all([
    withConnectionRetry(() =>
      prisma.archive.count({ where: { ...archiveWhere, category: { name: { in: ["Events", "Conferences", "Campaigns"] } } } })
    ),
    withConnectionRetry(() => prisma.archive.count({ where: { ...archiveWhere, category: { name: { in: ["NGO Projects"] } } } })),
    withConnectionRetry(() => prisma.archive.count({ where: { ...archiveWhere, status: "Pending Review" } })),
    withConnectionRetry(() =>
      prisma.file.groupBy({
        by: ["fileType"],
        where: { isLatest: true, deletedAt: null, folder: { archive: archiveWhere } },
        _count: { _all: true },
      })
    ),
    withConnectionRetry(() => prisma.reportTemplate.count({ where: { organizationId: user.organizationId } })),
    withConnectionRetry(() => getOrgStorageBytes(user.organizationId)),
  ]);

  const countByType = (types: string[]) =>
    fileCounts.filter((f) => types.includes(f.fileType)).reduce((sum, f) => sum + f._count._all, 0);

  return {
    eventsCount,
    programsCount,
    documentsCount: countByType(["pdf", "word", "excel", "powerpoint", "zip", "other"]),
    photosCount: countByType(["image"]),
    videosCount: countByType(["video"]),
    reportCount,
    pendingReviewCount,
    storageBytes,
  };
}

export function formatBytes(bytes: bigint | number): string {
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = n / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export async function getRecentUploads(user: User & { role: Role }, take = 8) {
  return withConnectionRetry(() =>
    prisma.file.findMany({
      where: { deletedAt: null, folder: { archive: archiveVisibilityWhere(user) } },
      orderBy: { uploadedAt: "desc" },
      take,
      include: { uploadedBy: true, folder: { include: { archive: true } } },
    })
  );
}

export type BrowseUploadsParams = {
  q?: string;
  dateFrom?: string; // "YYYY-MM-DD" — inclusive, filters by uploadedAt
  dateFromEnd?: string; // inclusive; same as dateFrom for a single-day filter
};

// Backs the "Browse" tab of the dashboard's Recent Uploads card — a
// filename search + upload-date range over the same visibility-scoped
// file set as getRecentUploads, but not capped to a small preview count
// (DataTable paginates client-side, same pattern as search-archives.ts).
export async function browseUploads(user: User & { role: Role }, params: BrowseUploadsParams) {
  const where: Prisma.FileWhereInput = {
    deletedAt: null,
    folder: { archive: archiveVisibilityWhere(user) },
  };
  if (params.q) {
    const q = params.q;
    where.OR = [
      { filename: { contains: q, mode: "insensitive" } },
      { folder: { archive: { name: { contains: q, mode: "insensitive" } } } },
    ];
  }
  if (params.dateFrom || params.dateFromEnd) {
    const from = params.dateFrom ? new Date(params.dateFrom) : null;
    const to = params.dateFromEnd
      ? new Date(`${params.dateFromEnd}T23:59:59.999`)
      : from
        ? new Date(`${params.dateFrom}T23:59:59.999`)
        : null;
    where.uploadedAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
  }

  return withConnectionRetry(() =>
    prisma.file.findMany({
      where,
      orderBy: { uploadedAt: "desc" },
      take: 300,
      include: { uploadedBy: true, folder: { include: { archive: true } } },
    })
  );
}

export async function getCategoryCounts(user: User & { role: Role }) {
  return withConnectionRetry(() =>
    prisma.category.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      orderBy: { order: "asc" },
      include: {
        _count: {
          select: {
            archives: { where: { ...archiveVisibilityWhere(user), isMigrationInbox: false } },
          },
        },
      },
    })
  );
}
