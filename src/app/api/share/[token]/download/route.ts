import { readFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { STORAGE_ROOT } from "@/lib/file-storage";

// Public endpoint — no getCurrentUser() call, validated purely by token.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
    include: { file: true },
  });

  if (!shareLink || shareLink.revokedAt || shareLink.file.deletedAt) {
    return new Response("Not found", { status: 404 });
  }
  if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
    return new Response("This link has expired.", { status: 410 });
  }

  // Atomically claim one download slot: the WHERE clause re-checks the
  // cap at the database level, so two simultaneous requests can't both
  // squeak through when only one slot remains.
  if (shareLink.maxDownloads !== null) {
    const claimed = await prisma.shareLink.updateMany({
      where: { id: shareLink.id, downloadCount: { lt: shareLink.maxDownloads } },
      data: { downloadCount: { increment: 1 } },
    });
    if (claimed.count === 0) {
      return new Response("This link has reached its download limit.", { status: 410 });
    }
  } else {
    await prisma.shareLink.update({ where: { id: shareLink.id }, data: { downloadCount: { increment: 1 } } });
  }

  const buffer = await readFile(path.join(STORAGE_ROOT, shareLink.file.storagePath));

  await prisma.auditLog.create({
    data: {
      organizationId: shareLink.organizationId,
      actorId: shareLink.createdById,
      action: "download",
      entityType: "File",
      entityId: shareLink.fileId,
      note: "downloaded via share link",
    },
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": shareLink.file.mimeType,
      "Content-Disposition": `attachment; filename="${shareLink.file.filename}"`,
    },
  });
}
