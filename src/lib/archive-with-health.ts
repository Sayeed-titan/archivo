import "server-only";
import { prisma, withConnectionRetry } from "@/lib/prisma";
import { archiveVisibilityWhere } from "@/lib/visibility";
import { resolveArchiveHealthBatch } from "@/lib/workflow/health";
import type { User, Role } from "@/generated/prisma/client";

export async function getRecentArchivesWithHealth(user: User & { role: Role }, take = 10) {
  const archives = await withConnectionRetry(() =>
    prisma.archive.findMany({
      where: { ...archiveVisibilityWhere(user), isMigrationInbox: false },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        category: true,
        folders: { select: { isMandatory: true, files: { where: { isLatest: true, deletedAt: null }, select: { id: true } } } },
      },
    })
  );

  const missingCounts = archives.map((archive) => ({
    status: archive.status,
    missingMandatoryFolders: archive.folders.filter((f) => f.isMandatory && f.files.length === 0).length,
  }));
  const healthResults = await resolveArchiveHealthBatch(user.organizationId, missingCounts);

  return archives.map((archive, i) => ({ ...archive, health: healthResults[i] }));
}
