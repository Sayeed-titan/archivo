import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { searchArchives, type SearchParams } from "@/lib/search-archives";
import { exportDataTable } from "@/lib/data-table/export";

// Small, page-specific export route (see audit-log/export/route.ts for
// the same pattern) — reruns searchArchives() with the same query params
// the search page itself used, so the export matches what's on screen.
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  const params = request.nextUrl.searchParams;
  const format = params.get("format");
  if (format !== "excel" && format !== "pdf") {
    return new Response("Unsupported format. Use ?format=excel or ?format=pdf.", { status: 400 });
  }

  const searchParams: SearchParams = {
    q: params.get("q") ?? undefined,
    categoryId: params.get("categoryId") ?? undefined,
    status: params.get("status") ?? undefined,
    projectName: params.get("projectName") ?? undefined,
    dateFrom: params.get("dateFrom") ?? undefined,
    dateFromEnd: params.get("dateFromEnd") ?? undefined,
    docType: params.get("docType") ?? undefined,
    group: params.get("group") ?? undefined,
  };

  const results = await searchArchives(user, searchParams);
  const rows = results.map((file) => ({
    filename: file.filename,
    fileType: file.fileType,
    archiveName: file.folder.archive.name,
    donor: file.folder.archive.donor ?? "—",
    uploadedBy: file.uploadedBy.name,
    uploadedAt: file.uploadedAt.toLocaleDateString(),
  }));

  const columns = [
    { key: "filename", label: "File" },
    { key: "fileType", label: "Type" },
    { key: "archiveName", label: "Archive" },
    { key: "donor", label: "Donor" },
    { key: "uploadedBy", label: "Uploaded by" },
    { key: "uploadedAt", label: "Date" },
  ];

  const { buffer, contentType, filename } = await exportDataTable(format, "Search Results", columns, rows);

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorId: user.id,
      action: "download",
      entityType: "Archive",
      entityId: user.organizationId,
      note: `exported search results as ${format}`,
    },
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
