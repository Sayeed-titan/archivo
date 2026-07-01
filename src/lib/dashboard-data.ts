import "server-only";
import { prisma } from "@/lib/prisma";
import { archiveVisibilityWhere } from "@/lib/visibility";
import { getOrgStorageBytes } from "@/lib/storage-usage";
import type { User, Role } from "@/generated/prisma/client";

// SRS.md FR-1.1: Total Events Archived, Total Programs Archived, Total
// Documents, Photos, Videos, Reports, Pending Review, Storage Used.
// "Events" vs "Programs" isn't a schema distinction in this data model
// (both are just archives under different categories), so both roll up
// from the same visibility-scoped archive set, split by category name.
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
    prisma.archive.count({ where: { ...archiveWhere, category: { name: { in: ["Events", "Conferences", "Campaigns"] } } } }),
    prisma.archive.count({ where: { ...archiveWhere, category: { name: { in: ["NGO Projects"] } } } }),
    prisma.archive.count({ where: { ...archiveWhere, status: "Pending Review" } }),
    prisma.file.groupBy({
      by: ["fileType"],
      where: { isLatest: true, deletedAt: null, folder: { archive: archiveWhere } },
      _count: { _all: true },
    }),
    prisma.reportTemplate.count({ where: { organizationId: user.organizationId } }),
    getOrgStorageBytes(user.organizationId),
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
  return prisma.file.findMany({
    where: { deletedAt: null, folder: { archive: archiveVisibilityWhere(user) } },
    orderBy: { uploadedAt: "desc" },
    take,
    include: { uploadedBy: true, folder: { include: { archive: true } } },
  });
}

export async function getCategoryCounts(user: User & { role: Role }) {
  const categories = await prisma.category.findMany({
    where: { organizationId: user.organizationId, isActive: true },
    orderBy: { order: "asc" },
    include: {
      _count: {
        select: {
          archives: { where: { ...archiveVisibilityWhere(user), isMigrationInbox: false } },
        },
      },
    },
  });
  return categories;
}
