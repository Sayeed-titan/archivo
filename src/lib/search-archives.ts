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
export async function searchArchives(user: User & { role: Role }, params: SearchParams) {
  const where: Prisma.ArchiveWhereInput = {
    ...archiveVisibilityWhere(user),
    isMigrationInbox: false,
  };

  const and: Prisma.ArchiveWhereInput[] = [];

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
        { folders: { some: { files: { some: { filename: { contains: q, mode: "insensitive" } } } } } },
      ],
    });
  }

  if (params.group && CATEGORY_GROUPS[params.group]) {
    and.push({ category: { name: { in: CATEGORY_GROUPS[params.group] } } });
  }
  if (params.categoryId) and.push({ categoryId: params.categoryId });
  if (params.status) and.push({ status: params.status });
  if (params.projectName) and.push({ projectName: params.projectName });
  if (params.docType) {
    and.push({ folders: { some: { files: { some: { fileType: params.docType, isLatest: true } } } } });
  }
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

  if (and.length > 0) where.AND = and;

  return prisma.archive.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { category: true },
  });
}
