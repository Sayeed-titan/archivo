import { readFile } from "fs/promises";
import path from "path";
import { withAuditContext } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { STORAGE_ROOT } from "@/lib/file-storage";
import { applyImageWatermark, WATERMARKABLE_FILE_TYPES } from "@/lib/watermark";

// SRS.md FR-4.6 / FR-11.6: every download is logged (who, when), and
// download itself is a role-gated capability, not just view/search.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return withAuditContext(async (user) => {
    if (!user.role.canDownload) {
      return new Response("Forbidden", { status: 403 });
    }

    const file = await prisma.file.findFirst({
      where: {
        id,
        deletedAt: null,
        folder: { archive: { organizationId: user.organizationId } },
      },
    });

    if (!file) {
      return new Response("Not found", { status: 404 });
    }

    let buffer: Buffer = await readFile(path.join(STORAGE_ROOT, file.storagePath));

    if (WATERMARKABLE_FILE_TYPES.has(file.fileType)) {
      const org = await prisma.organization.findUnique({ where: { id: user.organizationId } });
      if (org?.watermarkEnabled) {
        buffer = await applyImageWatermark(buffer, org.watermarkText || org.name);
      }
    }

    await prisma.$transaction([
      prisma.fileDownload.create({ data: { fileId: file.id, downloadedBy: user.id } }),
      prisma.auditLog.create({
        data: {
          organizationId: user.organizationId,
          actorId: user.id,
          action: "download",
          entityType: "File",
          entityId: file.id,
        },
      }),
    ]);

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `attachment; filename="${file.filename}"`,
      },
    });
  });
}
