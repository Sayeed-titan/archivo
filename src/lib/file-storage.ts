import "server-only";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { classifyFileType } from "@/lib/file-type";
import type { User } from "@/generated/prisma/client";

export const STORAGE_ROOT = path.join(process.cwd(), "storage", "uploads");

// SRS.md FR-4.4 (HANDOFF.md point 5): re-uploading a file with the same
// name in the same folder creates a new version instead of overwriting —
// the previous version is kept, just no longer flagged isLatest.
export async function saveUploadedFile(folderId: string, file: File, user: User) {
  await mkdir(STORAGE_ROOT, { recursive: true });

  const storedName = `${randomUUID()}-${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(STORAGE_ROOT, storedName), buffer);

  const existing = await prisma.file.findFirst({
    where: { folderId, filename: file.name, isLatest: true, deletedAt: null },
  });

  if (existing) {
    const [, created] = await prisma.$transaction([
      prisma.file.update({ where: { id: existing.id }, data: { isLatest: false } }),
      prisma.file.create({
        data: {
          folderId,
          filename: file.name,
          fileType: classifyFileType(file.name),
          mimeType: file.type || "application/octet-stream",
          sizeBytes: buffer.byteLength,
          storagePath: storedName,
          uploadedById: user.id,
          version: existing.version + 1,
          isLatest: true,
          previousVersionId: existing.id,
        },
      }),
    ]);
    return created;
  }

  return prisma.file.create({
    data: {
      folderId,
      filename: file.name,
      fileType: classifyFileType(file.name),
      mimeType: file.type || "application/octet-stream",
      sizeBytes: buffer.byteLength,
      storagePath: storedName,
      uploadedById: user.id,
    },
  });
}
