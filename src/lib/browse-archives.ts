import "server-only";
import { prisma, withConnectionRetry } from "@/lib/prisma";
import { archiveVisibilityWhere } from "@/lib/visibility";
import { resolveArchiveHealthBatch } from "@/lib/workflow/health";
import type { Prisma, User, Role } from "@/generated/prisma/client";

export type BrowseArchivesParams = {
  q?: string; // matches name/venue/organizer/coordinator/donor/project/description/tags/archiveNumber
  categoryId?: string;
  status?: string;
  dateFrom?: string; // "YYYY-MM-DD" — inclusive
  dateFromEnd?: string; // inclusive; same as dateFrom for a single-day filter (DateRangePicker's paired field)
};

// Archive-level browse/search, distinct from search-archives.ts's
// file-level search — this is "find an archive" (Recent Archives → View
// all, and the Archive-by-Category drill-in), that one is "find a
// document". Row shape and pagination are handled client-side by
// DataTable, matching every other list in the app at this data scale.
export async function browseArchives(user: User & { role: Role }, params: BrowseArchivesParams) {
  const and: Prisma.ArchiveWhereInput[] = [];
  if (params.categoryId) and.push({ categoryId: params.categoryId });
  if (params.status) and.push({ status: params.status });
  if (params.dateFrom || params.dateFromEnd) {
    const from = params.dateFrom ? new Date(params.dateFrom) : null;
    const to = params.dateFromEnd
      ? new Date(`${params.dateFromEnd}T23:59:59.999`)
      : from
        ? new Date(`${params.dateFrom}T23:59:59.999`)
        : null;
    if (from) and.push({ OR: [{ eventEndDate: { gte: from } }, { eventEndDate: null, eventDate: { gte: from } }] });
    if (to) and.push({ eventDate: { lte: to } });
  }
  if (params.q) {
    const q = params.q;
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { venue: { contains: q, mode: "insensitive" } },
        { organizer: { contains: q, mode: "insensitive" } },
        { coordinator: { contains: q, mode: "insensitive" } },
        { donor: { contains: q, mode: "insensitive" } },
        { projectName: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { tags: { has: q } },
        { archiveNumber: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.ArchiveWhereInput = {
    ...archiveVisibilityWhere(user),
    isMigrationInbox: false,
    ...(and.length > 0 ? { AND: and } : {}),
  };

  const archives = await withConnectionRetry(() =>
    prisma.archive.findMany({
      where,
      orderBy: { createdAt: "desc" },
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

  return archives.map((archive, i) => ({
    ...archive,
    fileCount: archive.folders.reduce((sum, f) => sum + f.files.length, 0),
    health: healthResults[i],
  }));
}
