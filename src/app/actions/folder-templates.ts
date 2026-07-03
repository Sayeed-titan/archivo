"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";

const AddFolderSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(1, { error: "Folder name is required." }),
  isMandatory: z.string().optional(),
});

export type AddFolderState =
  | {
      errors?: { name?: string[] };
      message?: string;
    }
  | undefined;

export async function addFolderTemplate(_state: AddFolderState, formData: FormData): Promise<AddFolderState> {
  const user = await getCurrentUser();
  requirePermission(user.role, "canManageSettings", "manage folder templates");

  const validated = AddFolderSchema.safeParse({
    categoryId: formData.get("categoryId"),
    name: formData.get("name"),
    isMandatory: formData.get("isMandatory") ?? undefined,
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { categoryId, name, isMandatory } = validated.data;

  const maxOrder = await prisma.folderTemplate.aggregate({
    where: { categoryId },
    _max: { order: true },
  });

  const created = await prisma.folderTemplate.create({
    data: {
      organizationId: user.organizationId,
      categoryId,
      name,
      order: (maxOrder._max.order ?? -1) + 1,
      isMandatory: isMandatory === "on",
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorId: user.id,
      action: "create",
      entityType: "FolderTemplate",
      entityId: created.id,
    },
  });

  revalidatePath("/settings/folder-templates");
}

// Reorders every folder template in a category to match `orderedIds`,
// always renumbering the whole set (0..n-1) rather than swapping two
// values — existing `order` values aren't guaranteed contiguous after
// past deletions, so a sparse update could collide or leave gaps.
export async function reorderFolderTemplates(categoryId: string, orderedIds: string[]) {
  const user = await getCurrentUser();
  requirePermission(user.role, "canManageSettings", "manage folder templates");

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.folderTemplate.update({
        where: { id, categoryId, organizationId: user.organizationId },
        data: { order: index },
      })
    )
  );

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorId: user.id,
      action: "edit",
      entityType: "FolderTemplate",
      entityId: categoryId,
      note: "reordered folder templates",
    },
  });

  revalidatePath("/settings/folder-templates");
}

export async function removeFolderTemplate(folderTemplateId: string) {
  const user = await getCurrentUser();
  requirePermission(user.role, "canManageSettings", "manage folder templates");

  await prisma.folderTemplate.delete({
    where: { id: folderTemplateId, organizationId: user.organizationId },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorId: user.id,
      action: "delete",
      entityType: "FolderTemplate",
      entityId: folderTemplateId,
    },
  });

  revalidatePath("/settings/folder-templates");
}
