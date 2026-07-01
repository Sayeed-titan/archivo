"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { saveUploadedFile } from "@/lib/file-storage";

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

  for (const file of files) {
    const created = await saveUploadedFile(unsortedFolder.id, file, user);

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.id,
        action: created.version > 1 ? "edit" : "create",
        entityType: "File",
        entityId: created.id,
        note: created.version > 1 ? `uploaded version ${created.version}` : undefined,
      },
    });
  }

  revalidatePath("/inbox");
}

// Upload into a real archive's folder (Prompt 4): same versioning behavior
// as the inbox — re-uploading a file with the same name creates a new
// version rather than silently overwriting it.
export async function uploadToFolder(_state: UploadFilesState, formData: FormData): Promise<UploadFilesState> {
  const user = await getCurrentUser();
  requirePermission(user.role, "canUpload", "upload files");

  const folderId = String(formData.get("folderId") ?? "");
  const archiveId = String(formData.get("archiveId") ?? "");

  const folder = await prisma.folder.findFirst({
    where: { id: folderId, archive: { id: archiveId, organizationId: user.organizationId } },
  });
  if (!folder) {
    return { message: "Folder not found." };
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return { message: "Choose at least one file." };
  }

  for (const file of files) {
    const created = await saveUploadedFile(folder.id, file, user);

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.id,
        action: created.version > 1 ? "edit" : "create",
        entityType: "File",
        entityId: created.id,
        note: created.version > 1 ? `uploaded version ${created.version}` : undefined,
      },
    });
  }

  revalidatePath(`/archives/${archiveId}`);
}
