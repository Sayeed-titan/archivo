import "server-only";
import { prisma, withConnectionRetry } from "@/lib/prisma";
import { archiveVisibilityWhere } from "@/lib/visibility";
import type { User, Role } from "@/generated/prisma/client";

// Layered on top of the role/department model (src/lib/authz.ts,
// src/lib/visibility.ts), never a substitute for it — see the schema
// comment on ArchiveGrant for the full narrow/extend contract. This module
// is the single place that reconciles the two into what a specific user
// may actually do on a specific archive, so every call site (explorer UI,
// upload routes, the access-management admin page) agrees.
//
// Rules, in order:
// 1. Department/own-archive visibility (archiveVisibilityWhere) is the
//    hard boundary. If a user fails it, no grant can override that — an
//    ArchiveGrant row for an archive outside a Department User's own
//    department is simply never consulted.
// 2. A role with canViewAll sees every folder in every visible archive by
//    default (matches today's behavior — introducing grants shouldn't
//    suddenly hide folders from admins who could already see everything).
// 3. A role WITHOUT canViewAll (Department User, Viewer) sees every folder
//    by default UNLESS at least one folder-scoped grant row exists for
//    that user on that archive — at that point the grant rows become an
//    allow-list and any folder with no matching row is hidden. This is
//    opt-in per archive: an archive with zero grants for a user behaves
//    exactly as before (full visibility to whatever the role permits).
// 4. canUpload is per-folder: the role's own canUpload flag is the
//    baseline for every folder; a grant with canUpload=true additionally
//    allows upload on that one folder even if the role can't upload
//    org-wide, and a folder-scoped grant with canUpload=false does NOT
//    revoke the role's own canUpload (grants only add, an admin managing
//    access removes the grant row entirely to take a folder away, not by
//    setting canUpload=false on a view-only grant).

export type ArchiveAccess = {
  canView: boolean;
  canUploadArchive: boolean; // role-level canUpload, before per-folder grants
  /** Folder ids explicitly granted to this user on this archive, if any exist. Empty = no folder-scoped grants (full visibility). */
  restrictedToFolderIds: Set<string> | null;
  /** Folder ids where a grant extends upload rights beyond the role's own canUpload. */
  uploadGrantedFolderIds: Set<string>;
};

export async function resolveArchiveAccess(
  user: User & { role: Role },
  archiveId: string
): Promise<ArchiveAccess | null> {
  const archive = await withConnectionRetry(() =>
    prisma.archive.findFirst({
      where: { id: archiveId, ...archiveVisibilityWhere(user) },
      select: { id: true },
    })
  );
  if (!archive) return null;

  const grants = await withConnectionRetry(() => prisma.archiveGrant.findMany({ where: { archiveId, userId: user.id } }));

  const folderScoped = grants.filter((g) => g.folderId !== null);
  const restrictedToFolderIds = user.role.canViewAll || folderScoped.length === 0
    ? null
    : new Set(folderScoped.filter((g) => g.canView).map((g) => g.folderId as string));

  const uploadGrantedFolderIds = new Set(
    grants.filter((g) => g.canUpload && g.folderId).map((g) => g.folderId as string)
  );
  // An archive-level grant (folderId null) with canUpload extends upload
  // rights to every folder — resolved lazily by callers via
  // canUploadToFolder() rather than enumerated here, since the folder set
  // isn't known at this point.
  const archiveLevelUpload = grants.some((g) => g.folderId === null && g.canUpload);

  return {
    canView: true,
    canUploadArchive: user.role.canUpload || archiveLevelUpload,
    restrictedToFolderIds,
    uploadGrantedFolderIds,
  };
}

export function canViewFolder(access: ArchiveAccess, folderId: string): boolean {
  return access.restrictedToFolderIds === null || access.restrictedToFolderIds.has(folderId);
}

export function canUploadToFolder(access: ArchiveAccess, folderId: string): boolean {
  return access.canUploadArchive || access.uploadGrantedFolderIds.has(folderId);
}
