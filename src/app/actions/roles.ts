"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";

// The 10 permission flags on Role — UI for what authz.ts already
// enforces, no new granular permission model (see CLAUDE.md decision).
const PERMISSION_KEYS = [
  "canCreateArchive",
  "canUpload",
  "canEditMetadata",
  "canDeleteArchive",
  "canHardDelete",
  "canManageUsers",
  "canManageSettings",
  "canGenerateReport",
  "canViewAll",
  "canDownload",
] as const;

function permissionsFromFormData(formData: FormData) {
  return Object.fromEntries(PERMISSION_KEYS.map((key) => [key, formData.get(key) === "on"]));
}

const RoleSchema = z.object({
  name: z.string().trim().min(1, { error: "Role name is required." }),
});

export type RoleFormState = { message?: string } | undefined;

export async function createRole(_state: RoleFormState, formData: FormData): Promise<RoleFormState> {
  const user = await getCurrentUser();
  requirePermission(user.role, "canManageSettings", "manage roles");

  const validated = RoleSchema.safeParse({ name: formData.get("name") });
  if (!validated.success) {
    return { message: validated.error.issues[0]?.message };
  }

  const existing = await prisma.role.findUnique({
    where: { organizationId_name: { organizationId: user.organizationId, name: validated.data.name } },
  });
  if (existing) {
    return { message: `A role named "${validated.data.name}" already exists.` };
  }

  const role = await prisma.role.create({
    data: {
      organizationId: user.organizationId,
      name: validated.data.name,
      ...permissionsFromFormData(formData),
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorId: user.id,
      action: "create",
      entityType: "Role",
      entityId: role.id,
      note: `created role "${role.name}"`,
    },
  });

  revalidatePath("/settings/roles");
}

export async function updateRole(roleId: string, formData: FormData): Promise<RoleFormState> {
  const user = await getCurrentUser();
  requirePermission(user.role, "canManageSettings", "manage roles");

  const validated = RoleSchema.safeParse({ name: formData.get("name") });
  if (!validated.success) {
    return { message: validated.error.issues[0]?.message };
  }

  const existing = await prisma.role.findFirst({
    where: {
      organizationId: user.organizationId,
      name: validated.data.name,
      NOT: { id: roleId },
    },
  });
  if (existing) {
    return { message: `A role named "${validated.data.name}" already exists.` };
  }

  await prisma.role.update({
    where: { id: roleId, organizationId: user.organizationId },
    data: {
      name: validated.data.name,
      ...permissionsFromFormData(formData),
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorId: user.id,
      action: "edit",
      entityType: "Role",
      entityId: roleId,
      note: `updated role "${validated.data.name}"`,
    },
  });

  revalidatePath("/settings/roles");
}

export type DeleteRoleState = { message?: string } | undefined;

export async function deleteRole(roleId: string): Promise<DeleteRoleState> {
  const user = await getCurrentUser();
  requirePermission(user.role, "canManageSettings", "manage roles");

  const role = await prisma.role.findFirst({ where: { id: roleId, organizationId: user.organizationId } });
  if (!role) return;

  const assignedCount = await prisma.user.count({ where: { roleId } });
  if (assignedCount > 0) {
    return {
      message: `"${role.name}" is assigned to ${assignedCount} ${assignedCount === 1 ? "user" : "users"} — reassign them first.`,
    };
  }

  await prisma.role.delete({ where: { id: roleId } });

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorId: user.id,
      action: "delete",
      entityType: "Role",
      entityId: roleId,
      note: `deleted role "${role.name}"`,
    },
  });

  revalidatePath("/settings/roles");
}

// Role *assignment* additionally requires canManageUsers — more clearly
// a user-management action than a settings-shape one, even though the
// page itself (like every /settings/* page) gates on canManageSettings.
export async function assignUserRole(userId: string, roleId: string) {
  const user = await getCurrentUser();
  requirePermission(user.role, "canManageSettings", "manage roles");
  requirePermission(user.role, "canManageUsers", "assign user roles");

  const [targetUser, role] = await Promise.all([
    prisma.user.findFirst({ where: { id: userId, organizationId: user.organizationId } }),
    prisma.role.findFirst({ where: { id: roleId, organizationId: user.organizationId } }),
  ]);
  if (!targetUser || !role) return;

  await prisma.user.update({ where: { id: userId }, data: { roleId } });

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorId: user.id,
      action: "edit",
      entityType: "User",
      entityId: userId,
      note: `assigned role "${role.name}"`,
    },
  });

  revalidatePath("/settings/roles");
}
