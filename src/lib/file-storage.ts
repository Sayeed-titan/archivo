import "server-only";
import { randomUUID } from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { classifyFileType } from "@/lib/file-type";
import { extractVideoDuration, generateVideoThumbnail } from "@/lib/video-processing";
import { notify } from "@/lib/notifications";
import { checkStorageLimit } from "@/lib/storage-usage";
import type { User } from "@/generated/prisma/client";

export const STORAGE_ROOT = path.join(process.cwd(), "storage", "uploads");
export const AVATAR_STORAGE_ROOT = path.join(process.cwd(), "storage", "avatars");

// SRS.md FR-4.4 (HANDOFF.md point 5): re-uploading a file with the same
// name in the same folder creates a new version instead of overwriting —
// the previous version is kept, just no longer flagged isLatest.
export async function saveUploadedFile(folderId: string, file: File, user: User) {
  await mkdir(STORAGE_ROOT, { recursive: true });

  const storedName = `${randomUUID()}-${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const fullStoragePath = path.join(STORAGE_ROOT, storedName);
  await writeFile(fullStoragePath, buffer);

  const fileType = classifyFileType(file.name);

  // SRS.md FR-6.2: best-effort — a failed extraction never blocks the
  // upload, the File row is just created with null duration/thumbnail.
  let durationSeconds: number | null = null;
  let thumbnailPath: string | null = null;
  if (fileType === "video") {
    [durationSeconds, thumbnailPath] = await Promise.all([
      extractVideoDuration(fullStoragePath),
      generateVideoThumbnail(fullStoragePath),
    ]);
  }

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
          fileType,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: buffer.byteLength,
          storagePath: storedName,
          uploadedById: user.id,
          version: existing.version + 1,
          isLatest: true,
          previousVersionId: existing.id,
          durationSeconds,
          thumbnailPath,
        },
      }),
    ]);
    return created;
  }

  return prisma.file.create({
    data: {
      folderId,
      filename: file.name,
      fileType,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: buffer.byteLength,
      storagePath: storedName,
      uploadedById: user.id,
      durationSeconds,
      thumbnailPath,
    },
  });
}

export type ProcessUploadTarget =
  | { kind: "inbox" }
  | { kind: "folder"; archiveId: string; folderId: string };

export type ProcessUploadResult =
  | { ok: true }
  | { ok: false; message: string };

// Shared single-file upload pipeline used by both the legacy form-action
// path (src/app/actions/files.ts) and the progress-capable API route
// (src/app/api/upload/route.ts) — resolves the target folder (creating
// the inbox's "Unsorted" folder on first use), saves the file via
// saveUploadedFile, writes the audit log entry, and fires the same
// upload-completed notification + storage-limit check uploadToFolder
// always has. One file per call so the API route can report progress
// and per-file completion independently.
export async function processUpload(target: ProcessUploadTarget, file: File, user: User): Promise<ProcessUploadResult> {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Empty or invalid file." };
  }

  let folderId: string;
  let archiveId: string | null = null;
  let folderName = "";
  let archiveCreatedById: string | null = null;
  let archiveName = "";

  if (target.kind === "inbox") {
    const inbox = await prisma.archive.findFirst({
      where: { organizationId: user.organizationId, isMigrationInbox: true },
    });
    if (!inbox) {
      return { ok: false, message: "Migration Inbox not found for this organization." };
    }

    let unsortedFolder = await prisma.folder.findFirst({
      where: { archiveId: inbox.id, name: "Unsorted" },
    });
    if (!unsortedFolder) {
      unsortedFolder = await prisma.folder.create({
        data: { archiveId: inbox.id, name: "Unsorted", order: 0 },
      });
    }
    folderId = unsortedFolder.id;
  } else {
    const folder = await prisma.folder.findFirst({
      where: { id: target.folderId, archive: { id: target.archiveId, organizationId: user.organizationId } },
      include: { archive: true },
    });
    if (!folder) {
      return { ok: false, message: "Folder not found." };
    }
    folderId = folder.id;
    archiveId = folder.archiveId;
    folderName = folder.name;
    archiveCreatedById = folder.archive.createdById;
    archiveName = folder.archive.name;
  }

  const created = await saveUploadedFile(folderId, file, user);

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

  if (target.kind === "folder" && archiveId && archiveCreatedById && archiveCreatedById !== user.id) {
    await notify(
      user.organizationId,
      archiveCreatedById,
      "upload_completed",
      `${user.name} uploaded 1 file(s) to "${archiveName}" / ${folderName}`,
      `/archives/${archiveId}`
    );
  }

  if (target.kind === "folder") {
    await checkStorageLimit(user.organizationId);
  }

  return { ok: true };
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2MB
const AVATAR_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export type SaveAvatarResult = { ok: true; avatarPath: string } | { ok: false; message: string };

// Simpler sibling of saveUploadedFile: no versioning chain (a profile
// photo just gets replaced), resized to a square thumbnail via sharp
// (already a dependency, used for watermarking) so avatars never balloon
// storage regardless of what the user uploads.
export async function saveAvatar(file: File, previousAvatarPath: string | null): Promise<SaveAvatarResult> {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "No file provided." };
  }
  if (!AVATAR_MIME_TYPES.has(file.type)) {
    return { ok: false, message: "Please upload a JPEG, PNG, WebP, or GIF image." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { ok: false, message: "Image must be 2MB or smaller." };
  }

  await mkdir(AVATAR_STORAGE_ROOT, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  const resized = await sharp(buffer)
    .resize(256, 256, { fit: "cover" })
    .jpeg({ quality: 85 })
    .toBuffer();

  const storedName = `${randomUUID()}.jpg`;
  await writeFile(path.join(AVATAR_STORAGE_ROOT, storedName), resized);

  if (previousAvatarPath) {
    await unlink(path.join(AVATAR_STORAGE_ROOT, previousAvatarPath)).catch(() => {
      // Best-effort cleanup — a missing old file must never block the new upload.
    });
  }

  return { ok: true, avatarPath: storedName };
}
