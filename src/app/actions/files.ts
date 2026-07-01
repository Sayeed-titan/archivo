"use server";

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { classifyFileType } from "@/lib/file-type";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "uploads");

export type UploadFilesState = { message?: string } | undefined;

// Migration Inbox upload (HANDOFF.md point 3): old/backlog files can be
// dropped in with zero metadata, sorted into real archives later. The
// inbox archive itself (isMigrationInbox) has no category/folder
// structure, so every upload lands in a single flat "Unsorted" folder.
export async function uploadToInbox(_state: UploadFilesState, formData: FormData): Promise<UploadFilesState> {
  const user = await getCurrentUser();
  requirePermission(user.role, "canUpload", "upload files");

  const inbox = await prisma.archive.findFirst({
    where: { organizationId: user.organizationId, isMigrationInbox: true },
  });

  if (!inbox) {
    return { message: "Migration Inbox not found for this organization." };
  }

  let unsortedFolder = await prisma.folder.findFirst({
    where: { archiveId: inbox.id, name: "Unsorted" },
  });
  if (!unsortedFolder) {
    unsortedFolder = await prisma.folder.create({
      data: { archiveId: inbox.id, name: "Unsorted", order: 0 },
    });
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { message: "Choose at least one file." };
  }

  await mkdir(STORAGE_ROOT, { recursive: true });

  for (const file of files) {
    const storedName = `${randomUUID()}-${file.name}`;
    const storagePath = path.join(STORAGE_ROOT, storedName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(storagePath, buffer);

    const created = await prisma.file.create({
      data: {
        folderId: unsortedFolder.id,
        filename: file.name,
        fileType: classifyFileType(file.name),
        mimeType: file.type || "application/octet-stream",
        sizeBytes: buffer.byteLength,
        storagePath: storedName,
        uploadedById: user.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.id,
        action: "create",
        entityType: "File",
        entityId: created.id,
      },
    });
  }

  revalidatePath("/inbox");
}
