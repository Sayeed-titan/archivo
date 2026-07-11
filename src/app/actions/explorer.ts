"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { withAuditContext } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { archiveVisibilityWhere } from "@/lib/visibility";
import { resolveArchiveAccess, canUploadToFolder } from "@/lib/access";
import { FOLDER_COLORS, type FolderColorKey } from "@/lib/folder-colors";

// File-explorer UX actions (point 8): rename in place (files and folders)
// and folder colorization. Deliberately separate from files.ts-style
// upload logic — these are metadata edits on already-uploaded content, not
// part of the upload pipeline.

const RenameFileSchema = z.object({
  fileId: z.string().min(1),
  name: z.string().trim().min(1, { error: "File name is required." }),
});

export type RenameFileState = { message?: string } | undefined;

// Preserves the file's original extension regardless of what the user
// types — renaming is about the human-readable part, not letting someone
// accidentally turn a .pdf into a .txt on record without actually
// converting the underlying bytes.
function splitExtension(filename: string): { base: string; ext: string } {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return { base: filename, ext: "" };
  return { base: filename.slice(0, dot), ext: filename.slice(dot) };
}

export async function renameFile(_state: RenameFileState, formData: FormData): Promise<RenameFileState> {
  return withAuditContext(async (user) => {
    const validated = RenameFileSchema.safeParse({
      fileId: formData.get("fileId"),
      name: formData.get("name"),
    });
    if (!validated.success) {
      return { message: validated.error.issues[0]?.message ?? "Invalid name." };
    }
    const { fileId, name } = validated.data;

    const file = await prisma.file.findFirst({
      where: { id: fileId, deletedAt: null, folder: { archive: { organizationId: user.organizationId } } },
      include: { folder: { include: { archive: true } } },
    });
    if (!file) {
      return { message: "File not found." };
    }

    const access = await resolveArchiveAccess(user, file.folder.archiveId);
    const canEdit = user.role.canEditMetadata || (access && canUploadToFolder(access, file.folderId));
    if (!canEdit) {
      return { message: "Not authorized to rename this file." };
    }

    const { ext } = splitExtension(file.filename);
    const { base: newBase } = splitExtension(name);
    const nextFilename = `${newBase}${ext}`;

    const duplicate = await prisma.file.findFirst({
      where: { folderId: file.folderId, filename: nextFilename, isLatest: true, deletedAt: null, id: { not: fileId } },
    });
    if (duplicate) {
      return { message: `"${nextFilename}" already exists in this folder.` };
    }

    await prisma.file.update({ where: { id: fileId }, data: { filename: nextFilename } });

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.id,
        action: "edit",
        entityType: "File",
        entityId: fileId,
        note: `renamed to "${nextFilename}"`,
      },
    });

    revalidatePath(`/archives/${file.folder.archiveId}`);
    // Truthy-but-messageless state = success — RenameDialog's effect only
    // fires on state change, and its initial state is also undefined, so a
    // bare `return;` here would be indistinguishable from "never submitted."
    return {};
  });
}

const RenameFolderSchema = z.object({
  folderId: z.string().min(1),
  name: z.string().trim().min(1, { error: "Folder name is required." }),
});

export type RenameFolderState = { message?: string } | undefined;

export async function renameFolder(_state: RenameFolderState, formData: FormData): Promise<RenameFolderState> {
  return withAuditContext(async (user) => {
    requirePermission(user.role, "canEditMetadata", "rename folders");

    const validated = RenameFolderSchema.safeParse({
      folderId: formData.get("folderId"),
      name: formData.get("name"),
    });
    if (!validated.success) {
      return { message: validated.error.issues[0]?.message ?? "Invalid name." };
    }
    const { folderId, name } = validated.data;

    const folder = await prisma.folder.findFirst({
      where: { id: folderId, archive: archiveVisibilityWhere(user) },
    });
    if (!folder) {
      return { message: "Folder not found." };
    }

    const duplicate = await prisma.folder.findFirst({
      where: { archiveId: folder.archiveId, name, id: { not: folderId } },
    });
    if (duplicate) {
      return { message: `"${name}" already exists in this archive.` };
    }

    await prisma.folder.update({ where: { id: folderId }, data: { name } });

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.id,
        action: "edit",
        entityType: "Archive",
        entityId: folder.archiveId,
        note: `renamed folder to "${name}"`,
      },
    });

    revalidatePath(`/archives/${folder.archiveId}`);
    return {};
  });
}

const VALID_COLORS = new Set(FOLDER_COLORS.map((c) => c.key));

export async function setFolderColor(folderId: string, color: FolderColorKey | null) {
  return withAuditContext(async (user) => {
    requirePermission(user.role, "canEditMetadata", "colorize folders");

    if (color !== null && !VALID_COLORS.has(color)) {
      throw new Error("Invalid folder color.");
    }

    const folder = await prisma.folder.findFirst({
      where: { id: folderId, archive: archiveVisibilityWhere(user) },
    });
    if (!folder) return;

    await prisma.folder.update({ where: { id: folderId }, data: { color } });

    revalidatePath(`/archives/${folder.archiveId}`);
  });
}
