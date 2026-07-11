import { NextRequest } from "next/server";
import { Readable } from "stream";
import { ZipArchive } from "archiver";
import { withAuditContext } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { STORAGE_ROOT } from "@/lib/file-storage";
import { getAuditContext } from "@/lib/audit-context";

// Bulk zip download for the tree view's multi-select (item 7). Body is a
// flat list of file ids — folder/archive-level selections are already
// expanded to concrete file ids client-side by the tree's selection
// state (see tree-view-selection.tsx), but every id is re-validated
// server-side against the current user's org scoping here, exactly like
// the single-file download route — a client-supplied id list is never
// trusted blindly.
export async function POST(request: NextRequest) {
  return withAuditContext(async (user) => {
    if (!user.role.canDownload) {
      return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const fileIds = Array.isArray(body?.fileIds) ? body.fileIds.filter((id: unknown) => typeof id === "string") : [];
    if (fileIds.length === 0) {
      return new Response(JSON.stringify({ message: "No files selected." }), { status: 400 });
    }

    const files = await prisma.file.findMany({
      where: {
        id: { in: fileIds },
        deletedAt: null,
        folder: { archive: { organizationId: user.organizationId } },
      },
      include: { folder: true },
    });

    if (files.length === 0) {
      return new Response(JSON.stringify({ message: "None of the selected files could be found." }), { status: 404 });
    }

    const archive = new ZipArchive({ zlib: { level: 6 } });
    archive.on("error", (err) => {
      throw err;
    });

    // Preserve folder structure in the zip; dedupe same-name files across
    // folders by prefixing with the folder name (archiver would otherwise
    // silently overwrite entries with identical paths).
    const usedNames = new Set<string>();
    for (const file of files) {
      let entryName = `${file.folder.name}/${file.filename}`;
      let suffix = 1;
      while (usedNames.has(entryName)) {
        entryName = `${file.folder.name}/${suffix}-${file.filename}`;
        suffix += 1;
      }
      usedNames.add(entryName);
      archive.file(`${STORAGE_ROOT}/${file.storagePath}`, { name: entryName });
    }
    archive.finalize();

    // createMany can't be intercepted by the audit Prisma extension (it has
    // no per-row return value to stamp against), so `ip` is set explicitly.
    const ip = getAuditContext()?.ip ?? null;
    await prisma.$transaction([
      prisma.fileDownload.createMany({
        data: files.map((f) => ({ fileId: f.id, downloadedBy: user.id, ip })),
      }),
      prisma.auditLog.create({
        data: {
          organizationId: user.organizationId,
          actorId: user.id,
          action: "download",
          entityType: "File",
          entityId: user.organizationId,
          note: `bulk downloaded ${files.length} file(s) as zip`,
        },
      }),
    ]);

    return new Response(Readable.toWeb(archive) as ReadableStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="archive-files.zip"`,
      },
    });
  });
}
