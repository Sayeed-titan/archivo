import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { browseArchives, type BrowseArchivesParams } from "@/lib/browse-archives";
import { exportDataTable } from "@/lib/data-table/export";

// Small, page-specific export route (see audit-log/export/route.ts and
// search/export/route.ts for the same pattern) — reruns browseArchives()
// with the same query params the /archives page itself used, so the
// export always matches the currently filtered results on screen.
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  const params = request.nextUrl.searchParams;
  const format = params.get("format");
  if (format !== "excel" && format !== "pdf") {
    return new Response("Unsupported format. Use ?format=excel or ?format=pdf.", { status: 400 });
  }

  const browseParams: BrowseArchivesParams = {
    q: params.get("q") ?? undefined,
    categoryId: params.get("categoryId") ?? undefined,
    status: params.get("status") ?? undefined,
    dateFrom: params.get("dateFrom") ?? undefined,
    dateFromEnd: params.get("dateFromEnd") ?? undefined,
  };

  const archives = await browseArchives(user, browseParams);
  const rows = archives.map((archive) => ({
    name: archive.name,
    archiveNumber: archive.archiveNumber,
    category: archive.category?.name ?? "Uncategorized",
    status: archive.status,
    health: archive.health.label,
    eventDate: archive.eventDate
      ? archive.eventEndDate && archive.eventEndDate.getTime() !== archive.eventDate.getTime()
        ? `${archive.eventDate.toLocaleDateString()} – ${archive.eventEndDate.toLocaleDateString()}`
        : archive.eventDate.toLocaleDateString()
      : "—",
    fileCount: archive.fileCount,
    updatedAt: archive.updatedAt.toLocaleDateString(),
  }));

  const columns = [
    { key: "name", label: "Archive" },
    { key: "archiveNumber", label: "ID" },
    { key: "category", label: "Category" },
    { key: "status", label: "Status" },
    { key: "health", label: "Health" },
    { key: "eventDate", label: "Event date" },
    { key: "fileCount", label: "Files" },
    { key: "updatedAt", label: "Last updated" },
  ];

  const { buffer, contentType, filename } = await exportDataTable(format, "Archives", columns, rows);

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorId: user.id,
      action: "download",
      entityType: "Archive",
      entityId: user.organizationId,
      note: `exported archives list as ${format}`,
    },
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
