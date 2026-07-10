import "server-only";
import { randomUUID } from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { classifyFileType } from "@/lib/file-type";
import { extractVideoDuration, extractVideoResolution, generateVideoThumbnail } from "@/lib/video-processing";
import { notify } from "@/lib/notifications";
import { checkStorageLimit } from "@/lib/storage-usage";
import { parseFolderRules, type FolderRules, type FileTypeCategory } from "@/lib/folder-rules";
import { resolveFileName } from "@/lib/file-naming";
import type { User } from "@/generated/prisma/client";

export const STORAGE_ROOT = path.join(process.cwd(), "storage", "uploads");
export const AVATAR_STORAGE_ROOT = path.join(process.cwd(), "storage", "avatars");

// Context needed to resolve the configurable filename template — omitted
// entirely for uploads into the Migration Inbox's "Unsorted" folder, which
// has no archive metadata worth templating on (falls back to the raw
// uploaded filename, see resolveUploadFilename below).
export type NamingFolderContext = {
  folderName: string;
  archiveName: string;
  archiveNumber: string;
  eventDate: Date | null;
  department: string | null;
};

async function resolveUploadFilename(
  originalName: string,
  folderId: string,
  organizationId: string,
  namingCtx?: NamingFolderContext
): Promise<string> {
  if (!namingCtx) return originalName;

  const [org, sequence] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { fileNamingTemplate: true } }),
    prisma.file.count({ where: { folderId } }).then((n) => n + 1),
  ]);

  return resolveFileName(org.fileNamingTemplate, {
    originalName,
    folderName: namingCtx.folderName,
    archiveName: namingCtx.archiveName,
    archiveNumber: namingCtx.archiveNumber,
    eventDate: namingCtx.eventDate,
    department: namingCtx.department,
    sequence,
  });
}

// SRS.md FR-4.4 (HANDOFF.md point 5): re-uploading a file with the same
// name in the same folder creates a new version instead of overwriting —
// the previous version is kept, just no longer flagged isLatest. "Same
// name" is checked against the resolved (templated) filename, since that's
// what's actually shown/stored as File.filename.
export async function saveUploadedFile(
  folderId: string,
  file: File,
  user: User,
  alternateOptionLabel?: string | null,
  namingCtx?: NamingFolderContext
) {
  await mkdir(STORAGE_ROOT, { recursive: true });

  const storedName = `${randomUUID()}-${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const fullStoragePath = path.join(STORAGE_ROOT, storedName);
  await writeFile(fullStoragePath, buffer);

  const fileType = classifyFileType(file.name);
  const filename = await resolveUploadFilename(file.name, folderId, user.organizationId, namingCtx);

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
    where: { folderId, filename, isLatest: true, deletedAt: null },
  });

  if (existing) {
    const [, created] = await prisma.$transaction([
      prisma.file.update({ where: { id: existing.id }, data: { isLatest: false } }),
      prisma.file.create({
        data: {
          folderId,
          filename,
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
          alternateOptionLabel: alternateOptionLabel || null,
        },
      }),
    ]);
    return created;
  }

  return prisma.file.create({
    data: {
      folderId,
      filename,
      fileType,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: buffer.byteLength,
      storagePath: storedName,
      uploadedById: user.id,
      durationSeconds,
      thumbnailPath,
      alternateOptionLabel: alternateOptionLabel || null,
    },
  });
}

// Checked before saveUploadedFile persists anything, so a rejected upload
// never touches disk or the DB. Returns null when the file passes every
// configured rule, or a message describing the first rule it fails.
// `offerExternalLink` is set only for the size-exceeded case when the
// folder's rules explicitly allow the link fallback — every other failure
// is a hard rejection with no alternative.
type RuleCheckResult = { ok: true } | { ok: false; message: string; offerExternalLink?: true };

async function checkFolderRules(rules: FolderRules, folderId: string, file: File): Promise<RuleCheckResult> {
  const fileType = classifyFileType(file.name) as FileTypeCategory;

  if (rules.allowedFileTypes?.length && !rules.allowedFileTypes.includes(fileType)) {
    return { ok: false, message: `This folder only accepts: ${rules.allowedFileTypes.join(", ")}.` };
  }

  if (rules.maxSizeBytes && file.size > rules.maxSizeBytes) {
    const maxMb = (rules.maxSizeBytes / (1024 * 1024)).toFixed(1);
    if (rules.externalLinkFallback?.enabled) {
      return {
        ok: false,
        offerExternalLink: true,
        message: rules.externalLinkFallback.helpText || `File exceeds the ${maxMb} MB limit for this folder. Share an external link instead.`,
      };
    }
    return { ok: false, message: `File exceeds the ${maxMb} MB limit for this folder.` };
  }

  if (rules.minResolution && (fileType === "image" || fileType === "video")) {
    const buffer = Buffer.from(await file.arrayBuffer());
    let resolution: { width: number; height: number } | null = null;

    if (fileType === "image") {
      try {
        const metadata = await sharp(buffer).metadata();
        if (metadata.width && metadata.height) resolution = { width: metadata.width, height: metadata.height };
      } catch {
        resolution = null;
      }
    } else {
      const tempPath = path.join(STORAGE_ROOT, `${randomUUID()}-${file.name}`);
      await mkdir(STORAGE_ROOT, { recursive: true });
      await writeFile(tempPath, buffer);
      resolution = await extractVideoResolution(tempPath);
      await unlink(tempPath).catch(() => {});
    }

    if (!resolution || resolution.width < rules.minResolution.width || resolution.height < rules.minResolution.height) {
      return {
        ok: false,
        message: `Minimum resolution for this folder is ${rules.minResolution.width}×${rules.minResolution.height}.`,
      };
    }
  }

  const maxCount = rules.counts?.[fileType]?.max;
  if (maxCount !== undefined) {
    const currentCount = await prisma.file.count({ where: { folderId, fileType, isLatest: true, deletedAt: null } });
    if (currentCount >= maxCount) {
      return { ok: false, message: `This folder already has the maximum of ${maxCount} ${fileType} file(s).` };
    }
  }

  return { ok: true };
}

export type ProcessUploadTarget =
  | { kind: "inbox" }
  | { kind: "folder"; archiveId: string; folderId: string };

export type ProcessUploadResult =
  | { ok: true }
  | { ok: false; message: string; offerExternalLink?: true };

// Shared single-file upload pipeline used by both the legacy form-action
// path (src/app/actions/files.ts) and the progress-capable API route
// (src/app/api/upload/route.ts) — resolves the target folder (creating
// the inbox's "Unsorted" folder on first use), saves the file via
// saveUploadedFile, writes the audit log entry, and fires the same
// upload-completed notification + storage-limit check uploadToFolder
// always has. One file per call so the API route can report progress
// and per-file completion independently.
export async function processUpload(
  target: ProcessUploadTarget,
  file: File,
  user: User,
  alternateOptionLabel?: string | null
): Promise<ProcessUploadResult> {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Empty or invalid file." };
  }

  let folderId: string;
  let archiveId: string | null = null;
  let folderName = "";
  let archiveCreatedById: string | null = null;
  let archiveName = "";
  let namingCtx: NamingFolderContext | undefined;

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
      include: { archive: true, folderTemplate: true },
    });
    if (!folder) {
      return { ok: false, message: "Folder not found." };
    }
    folderId = folder.id;
    archiveId = folder.archiveId;
    folderName = folder.name;
    archiveCreatedById = folder.archive.createdById;
    archiveName = folder.archive.name;
    namingCtx = {
      folderName: folder.name,
      archiveName: folder.archive.name,
      archiveNumber: folder.archive.archiveNumber,
      eventDate: folder.archive.eventDate,
      department: folder.archive.department,
    };

    // Rules are looked up live from the linked FolderTemplate — folders
    // with no link (pre-existing archives, or the inbox's Unsorted folder)
    // simply have nothing to enforce.
    if (folder.folderTemplate) {
      const rules = parseFolderRules(folder.folderTemplate.rules);
      const check = await checkFolderRules(rules, folderId, file);
      if (!check.ok) {
        return { ok: false, message: check.message, offerExternalLink: check.offerExternalLink };
      }
    }
  }

  const created = await saveUploadedFile(folderId, file, user, alternateOptionLabel, namingCtx);

  await recordUploadCompletion(created, user, { archiveId, archiveCreatedById, archiveName, folderName, isFolderTarget: target.kind === "folder" });

  return { ok: true };
}

// Shared by processUpload and submitExternalFileLink so the audit log +
// upload-completed notification + storage-limit check aren't duplicated
// across the two upload paths.
async function recordUploadCompletion(
  created: { id: string; version: number },
  user: User,
  ctx: { archiveId: string | null; archiveCreatedById: string | null; archiveName: string; folderName: string; isFolderTarget: boolean }
) {
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

  if (ctx.isFolderTarget && ctx.archiveId && ctx.archiveCreatedById && ctx.archiveCreatedById !== user.id) {
    await notify(
      user.organizationId,
      ctx.archiveCreatedById,
      "upload_completed",
      `${user.name} uploaded 1 file(s) to "${ctx.archiveName}" / ${ctx.folderName}`,
      `/archives/${ctx.archiveId}`
    );
  }

  if (ctx.isFolderTarget) {
    await checkStorageLimit(user.organizationId);
  }
}

export type SubmitExternalLinkResult = { ok: true } | { ok: false; message: string };

// Fallback for FolderRules.externalLinkFallback: creates a real File row
// with isExternalLink instead of storing bytes on disk — still subject to
// the same per-type count rules as a normal upload, and shows up in the
// folder/tree-view as a link-out row (see file-row.tsx).
export async function submitExternalFileLink(
  archiveId: string,
  folderId: string,
  url: string,
  user: User,
  label?: string | null
): Promise<SubmitExternalLinkResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, message: "Please enter a valid URL." };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, message: "Please enter a valid http(s) URL." };
  }

  const folder = await prisma.folder.findFirst({
    where: { id: folderId, archive: { id: archiveId, organizationId: user.organizationId } },
    include: { archive: true, folderTemplate: true },
  });
  if (!folder) {
    return { ok: false, message: "Folder not found." };
  }

  const fileType: FileTypeCategory = "other";
  if (folder.folderTemplate) {
    const rules = parseFolderRules(folder.folderTemplate.rules);
    const maxCount = rules.counts?.[fileType]?.max;
    if (maxCount !== undefined) {
      const currentCount = await prisma.file.count({ where: { folderId, fileType, isLatest: true, deletedAt: null } });
      if (currentCount >= maxCount) {
        return { ok: false, message: `This folder already has the maximum of ${maxCount} ${fileType} file(s).` };
      }
    }
  }

  const created = await prisma.file.create({
    data: {
      folderId,
      filename: label?.trim() || parsed.hostname,
      fileType,
      mimeType: "",
      sizeBytes: 0,
      storagePath: "",
      uploadedById: user.id,
      isExternalLink: true,
      externalUrl: url,
      alternateOptionLabel: label || null,
    },
  });

  await recordUploadCompletion(created, user, {
    archiveId: folder.archiveId,
    archiveCreatedById: folder.archive.createdById,
    archiveName: folder.archive.name,
    folderName: folder.name,
    isFolderTarget: true,
  });

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
