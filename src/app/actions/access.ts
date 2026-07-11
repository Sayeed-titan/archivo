"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser, withAuditContext } from "@/lib/dal";
import { prisma, withConnectionRetry } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";

// Archive access grants (point 8): who beyond the archive's own
// role/department visibility can see it, and which folders they may
// upload to. Gated on canManageUsers — the same permission that already
// governs assigning users to roles at /settings/roles, since granting a
// specific person access to a specific archive is the same class of
// action (deciding what a user can reach), just scoped to one archive
// instead of org-wide.

const GrantSchema = z.object({
  archiveId: z.string().min(1),
  userId: z.string().min(1),
  folderId: z.string().optional(),
  canView: z.string().optional(),
  canUpload: z.string().optional(),
});

export type GrantAccessState = { message?: string } | undefined;

async function assertManageableArchive(organizationId: string, archiveId: string) {
  const archive = await prisma.archive.findFirst({ where: { id: archiveId, organizationId, deletedAt: null } });
  if (!archive) throw new Error("Archive not found.");
  return archive;
}

export async function grantArchiveAccess(_state: GrantAccessState, formData: FormData): Promise<GrantAccessState> {
  return withAuditContext(async (user) => {
    requirePermission(user.role, "canManageUsers", "manage archive access");

    const validated = GrantSchema.safeParse(Object.fromEntries(formData));
    if (!validated.success) {
      return { message: "Invalid grant." };
    }
    const { archiveId, userId, folderId, canView, canUpload } = validated.data;

    await assertManageableArchive(user.organizationId, archiveId);

    const targetUser = await prisma.user.findFirst({ where: { id: userId, organizationId: user.organizationId } });
    if (!targetUser) {
      return { message: "User not found." };
    }

    if (folderId) {
      const folder = await prisma.folder.findFirst({ where: { id: folderId, archiveId } });
      if (!folder) {
        return { message: "Folder not found on this archive." };
      }
    }

    // Prisma's compound-unique upsert can't target a NULL folderId (Postgres
    // treats NULLs as distinct from one another, so the unique index doesn't
    // actually dedupe archive-level grants) — resolved manually here instead.
    const existingGrant = await prisma.archiveGrant.findFirst({
      where: { archiveId, userId, folderId: folderId || null },
    });

    if (existingGrant) {
      await prisma.archiveGrant.update({
        where: { id: existingGrant.id },
        data: { canView: canView === "on", canUpload: canUpload === "on" },
      });
    } else {
      await prisma.archiveGrant.create({
        data: {
          organizationId: user.organizationId,
          archiveId,
          userId,
          folderId: folderId || null,
          canView: canView === "on",
          canUpload: canUpload === "on",
          createdById: user.id,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.id,
        action: "edit",
        entityType: "Archive",
        entityId: archiveId,
        note: `granted access to ${targetUser.name}${folderId ? ` (folder-scoped)` : ""}`,
      },
    });

    revalidatePath(`/archives/${archiveId}/access`);
  });
}

export async function revokeArchiveAccess(grantId: string) {
  return withAuditContext(async (user) => {
    requirePermission(user.role, "canManageUsers", "manage archive access");

    const grant = await prisma.archiveGrant.findFirst({ where: { id: grantId, organizationId: user.organizationId } });
    if (!grant) return;

    await prisma.archiveGrant.delete({ where: { id: grantId } });

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.id,
        action: "edit",
        entityType: "Archive",
        entityId: grant.archiveId,
        note: "revoked archive access grant",
      },
    });

    revalidatePath(`/archives/${grant.archiveId}/access`);
  });
}

// Lists org users a grant could plausibly matter for — anyone visible to
// the current admin, minus the archive-visibility check (a grant's whole
// point is to let someone in who wouldn't otherwise see the archive).
export async function listGrantableUsers(archiveId: string) {
  const user = await getCurrentUser();
  requirePermission(user.role, "canManageUsers", "manage archive access");
  await assertManageableArchive(user.organizationId, archiveId);

  return withConnectionRetry(() =>
    prisma.user.findMany({
      where: { organizationId: user.organizationId, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, department: true },
    })
  );
}
