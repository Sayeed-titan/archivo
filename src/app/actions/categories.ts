"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { withAuditContext } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";

const CategorySchema = z.object({
  name: z.string().trim().min(1, { error: "Category name is required." }),
});

export type CategoryFormState = { message?: string } | undefined;

export async function createCategory(_state: CategoryFormState, formData: FormData): Promise<CategoryFormState> {
  return withAuditContext(async (user) => {
    requirePermission(user.role, "canManageSettings", "manage categories");

    const validated = CategorySchema.safeParse({ name: formData.get("name") });
    if (!validated.success) {
      return { message: validated.error.issues[0]?.message };
    }

    const existing = await prisma.category.findUnique({
      where: { organizationId_name: { organizationId: user.organizationId, name: validated.data.name } },
    });
    if (existing) {
      return { message: `A category named "${validated.data.name}" already exists.` };
    }

    const maxOrder = await prisma.category.aggregate({
      where: { organizationId: user.organizationId },
      _max: { order: true },
    });

    const category = await prisma.category.create({
      data: {
        organizationId: user.organizationId,
        name: validated.data.name,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.id,
        action: "create",
        entityType: "Category",
        entityId: category.id,
        note: `created category "${category.name}"`,
      },
    });

    revalidatePath("/settings/folder-templates");
  });
}

export async function renameCategory(
  categoryId: string,
  _state: CategoryFormState,
  formData: FormData
): Promise<CategoryFormState> {
  return withAuditContext(async (user) => {
    requirePermission(user.role, "canManageSettings", "manage categories");

    const validated = CategorySchema.safeParse({ name: formData.get("name") });
    if (!validated.success) {
      return { message: validated.error.issues[0]?.message };
    }

    const existing = await prisma.category.findFirst({
      where: {
        organizationId: user.organizationId,
        name: validated.data.name,
        NOT: { id: categoryId },
      },
    });
    if (existing) {
      return { message: `A category named "${validated.data.name}" already exists.` };
    }

    await prisma.category.update({
      where: { id: categoryId, organizationId: user.organizationId },
      data: { name: validated.data.name },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.id,
        action: "edit",
        entityType: "Category",
        entityId: categoryId,
        note: `renamed to "${validated.data.name}"`,
      },
    });

    revalidatePath("/settings/folder-templates");
  });
}

export type DeleteCategoryState = { message?: string } | undefined;

export async function deleteCategory(categoryId: string): Promise<DeleteCategoryState> {
  return withAuditContext(async (user) => {
    requirePermission(user.role, "canManageSettings", "manage categories");

    const category = await prisma.category.findFirst({
      where: { id: categoryId, organizationId: user.organizationId },
    });
    if (!category) return;

    const archiveCount = await prisma.archive.count({ where: { categoryId } });
    if (archiveCount > 0) {
      return {
        message: `"${category.name}" is used by ${archiveCount} ${archiveCount === 1 ? "archive" : "archives"} — it can't be deleted.`,
      };
    }

    // FolderTemplate.category has onDelete: Cascade, so this category's
    // folder templates are removed automatically — no manual cleanup needed.
    await prisma.category.delete({ where: { id: categoryId } });

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.id,
        action: "delete",
        entityType: "Category",
        entityId: categoryId,
        note: `deleted category "${category.name}"`,
      },
    });

    revalidatePath("/settings/folder-templates");
  });
}
