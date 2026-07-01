import "server-only";
import { prisma } from "@/lib/prisma";
import { archiveVisibilityWhere } from "@/lib/visibility";
import { computeArchiveHealth } from "@/lib/archive-health";
import type { User, Role } from "@/generated/prisma/client";

export async function getRecentArchivesWithHealth(user: User & { role: Role }, take = 10) {
  const archives = await prisma.archive.findMany({
    where: { ...archiveVisibilityWhere(user), isMigrationInbox: false },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      category: true,
      folders: { select: { isMandatory: true, files: { where: { isLatest: true, deletedAt: null }, select: { id: true } } } },
    },
  });

  return archives.map((archive) => {
    const missingMandatoryFolders = archive.folders.filter((f) => f.isMandatory && f.files.length === 0).length;
    const health = computeArchiveHealth({ status: archive.status, missingMandatoryFolders });
    return { ...archive, health };
  });
}
