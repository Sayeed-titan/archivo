import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { archiveVisibilityWhere } from "@/lib/visibility";
import { fileTypeIcon } from "@/lib/file-icon";

// Backing endpoint for the ⌘K command palette (src/components/command-
// palette). Deliberately separate from searchArchives() in
// search-archives.ts — that one powers the full /search page's filter
// form and returns up to 100 rows; this is a fast, small-result-set
// "type a few letters, jump somewhere" lookup across archives *and*
// files in one round trip.
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return Response.json({ archives: [], files: [] });
  }

  const archiveWhere = { ...archiveVisibilityWhere(user), isMigrationInbox: false };

  const [archives, files] = await Promise.all([
    prisma.archive.findMany({
      where: {
        ...archiveWhere,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { archiveNumber: { contains: q, mode: "insensitive" } },
          { donor: { contains: q, mode: "insensitive" } },
          { organizer: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, archiveNumber: true, status: true, category: { select: { name: true } } },
    }),
    prisma.file.findMany({
      where: {
        isLatest: true,
        deletedAt: null,
        filename: { contains: q, mode: "insensitive" },
        folder: { archive: archiveWhere },
      },
      orderBy: { uploadedAt: "desc" },
      take: 6,
      select: {
        id: true,
        filename: true,
        fileType: true,
        folder: { select: { id: true, archiveId: true, name: true, archive: { select: { name: true } } } },
      },
    }),
  ]);

  return Response.json({
    archives: archives.map((a) => ({
      id: a.id,
      title: a.name,
      subtitle: [a.archiveNumber, a.category?.name].filter(Boolean).join(" · "),
      status: a.status,
      href: `/archives/${a.id}`,
    })),
    files: files.map((f) => ({
      id: f.id,
      title: f.filename,
      subtitle: `${f.folder.archive.name} / ${f.folder.name}`,
      icon: fileTypeIcon(f.fileType),
      href: `/archives/${f.folder.archiveId}`,
    })),
  });
}
