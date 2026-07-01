import "server-only";
import { prisma } from "@/lib/prisma";
import { archiveVisibilityWhere } from "@/lib/visibility";
import { getFieldDef } from "./fields";
import type { ReportFilter } from "./filters";
import type { Prisma, User, Role } from "@/generated/prisma/client";

export type ReportRow = Record<string, string | number | null>;

const RAW_FIELD_TO_COLUMN: Record<string, keyof Prisma.ArchiveWhereInput> = {
  archiveNumber: "archiveNumber",
  name: "name",
  department: "department",
  eventDate: "eventDate",
  venue: "venue",
  organizer: "organizer",
  coordinator: "coordinator",
  donor: "donor",
  projectName: "projectName",
  status: "status",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
};

function buildFilterWhere(filters: ReportFilter[]): Prisma.ArchiveWhereInput[] {
  const clauses: Prisma.ArchiveWhereInput[] = [];

  for (const filter of filters) {
    if (filter.field === "category") {
      clauses.push({ category: { name: { equals: filter.value, mode: "insensitive" } } });
      continue;
    }

    const column = RAW_FIELD_TO_COLUMN[filter.field];
    if (!column) continue; // unknown/computed field — ignore rather than error, so a stale template doesn't 500

    const fieldDef = getFieldDef(filter.field);
    const isDate = fieldDef?.type === "date";
    const value: string | Date = isDate ? new Date(filter.value) : filter.value;

    switch (filter.operator) {
      case "equals":
        clauses.push({ [column]: fieldDef?.type === "text" ? { equals: value, mode: "insensitive" } : value } as Prisma.ArchiveWhereInput);
        break;
      case "contains":
        clauses.push({ [column]: { contains: value, mode: "insensitive" } } as Prisma.ArchiveWhereInput);
        break;
      case "gte":
        clauses.push({ [column]: { gte: value } } as Prisma.ArchiveWhereInput);
        break;
      case "lte":
        clauses.push({ [column]: { lte: value } } as Prisma.ArchiveWhereInput);
        break;
      case "gt":
        clauses.push({ [column]: { gt: value } } as Prisma.ArchiveWhereInput);
        break;
      case "lt":
        clauses.push({ [column]: { lt: value } } as Prisma.ArchiveWhereInput);
        break;
    }
  }

  return clauses;
}

export async function runReport(
  user: User & { role: Role },
  fields: string[],
  filters: ReportFilter[]
): Promise<ReportRow[]> {
  const where: Prisma.ArchiveWhereInput = {
    ...archiveVisibilityWhere(user),
    isMigrationInbox: false,
  };

  const filterClauses = buildFilterWhere(filters);
  if (filterClauses.length > 0) where.AND = filterClauses;

  const archives = await prisma.archive.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 1000,
    include: {
      category: true,
      createdBy: true,
      folders: {
        include: {
          files: {
            where: { isLatest: true, deletedAt: null },
            include: { downloads: true },
          },
        },
      },
    },
  });

  return archives.map((archive) => {
    const row: ReportRow = {};

    for (const key of fields) {
      switch (key) {
        case "category":
          row[key] = archive.category?.name ?? null;
          break;
        case "createdByName":
          row[key] = archive.createdBy.name;
          break;
        case "fileCount":
          row[key] = archive.folders.reduce((sum, f) => sum + f.files.length, 0);
          break;
        case "storageBytes":
          row[key] = archive.folders.reduce(
            (sum, f) => sum + f.files.reduce((s, file) => s + file.sizeBytes, 0),
            0
          );
          break;
        case "missingMandatoryFolders":
          row[key] = archive.folders.filter((f) => f.isMandatory && f.files.length === 0).length;
          break;
        case "downloadCount":
          row[key] = archive.folders.reduce(
            (sum, f) => sum + f.files.reduce((s, file) => s + file.downloads.length, 0),
            0
          );
          break;
        case "eventDate":
        case "createdAt":
        case "updatedAt": {
          const value = archive[key as "eventDate" | "createdAt" | "updatedAt"];
          row[key] = value ? value.toISOString().slice(0, 10) : null;
          break;
        }
        default:
          row[key] = (archive as unknown as Record<string, string | null>)[key] ?? null;
      }
    }

    return row;
  });
}
