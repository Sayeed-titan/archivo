import "server-only";
import { prisma } from "@/lib/prisma";
import { archiveVisibilityWhere } from "@/lib/visibility";
import type { Prisma, User, Role } from "@/generated/prisma/client";

export type SearchParams = {
  q?: string; // free text — matches event/program name, venue, organizer, donor, keywords, filename
  categoryId?: string;
  status?: string;
  projectName?: string;
  month?: string; // "1".."12"
  year?: string;
  docType?: string; // filters to archives containing at least one file of this type
  group?: string; // dashboard summary grouping: "events" | "programs" (spans multiple categories)
};

// Keep in sync with getDashboardSummary() in dashboard-data.ts — the
// dashboard "Events Archived" / "Programs Archived" counts split the same
// archive set by these category-name groups, so drilling in from a card
// must use the same definition.
const CATEGORY_GROUPS: Record<string, string[]> = {
  events: ["Events", "Conferences", "Campaigns"],
  programs: ["NGO Projects"],
};

// SRS.md FR-7.1/7.2: search by event/program name, date, year, location,
// department, organizer, donor, keywords, doc type, filename — plus
// advanced filters (month, category, project, status), combinable.
//
// Returns one row per matching FILE, not per archive — a filename/doc-type
// match should point straight at the actual document, with its parent
// archive shown for context, rather than making the user open the archive
// to hunt for which file matched.
export async function searchArchives(user: User & { role: Role }, params: SearchParams) {
  // Scoping/filters that always apply to the file's parent archive,
  // regardless of whether a free-text query matched on metadata or on the
  // file's own name.
  const and: Prisma.ArchiveWhereInput[] = [];
  if (params.group && CATEGORY_GROUPS[params.group]) {
    and.push({ category: { name: { in: CATEGORY_GROUPS[params.group] } } });
  }
  if (params.categoryId) and.push({ categoryId: params.categoryId });
  if (params.status) and.push({ status: params.status });
  if (params.projectName) and.push({ projectName: params.projectName });
  if (params.month || params.year) {
    const now = new Date();
    const year = params.year ? Number(params.year) : now.getFullYear();
    if (params.month) {
      const month = Number(params.month) - 1;
      and.push({ eventDate: { gte: new Date(year, month, 1), lt: new Date(year, month + 1, 1) } });
    } else {
      and.push({ eventDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } });
    }
  }

  const scopedArchiveWhere: Prisma.ArchiveWhereInput = {
    ...archiveVisibilityWhere(user),
    isMigrationInbox: false,
    ...(and.length > 0 ? { AND: and } : {}),
  };

  const fileWhere: Prisma.FileWhereInput = {
    isLatest: true,
    deletedAt: null,
    folder: { archive: scopedArchiveWhere },
  };
  if (params.docType) fileWhere.fileType = params.docType;

  // A free-text query matches either the file's own filename, or one of
  // the archive's metadata fields — matching on metadata still returns
  // every file in that archive (consistent with the old archive-level
  // search), but matching on filename narrows down to just the file(s)
  // whose name actually matched, instead of surfacing every unrelated
  // file in the same archive.
  if (params.q) {
    const q = params.q;
    fileWhere.OR = [
      { filename: { contains: q, mode: "insensitive" } },
      {
        folder: {
          archive: {
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
          },
        },
      },
    ];
  }

  return prisma.file.findMany({
    where: fileWhere,
    orderBy: { uploadedAt: "desc" },
    take: 100,
    include: {
      uploadedBy: true,
      folder: { include: { archive: { include: { category: true } } } },
    },
  });
}
