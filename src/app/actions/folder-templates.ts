"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { parseFolderRules, type FolderRules } from "@/lib/folder-rules";
import { renumberName } from "@/lib/folder-name-numbering";

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
//
// Names that follow the "NN <rest>" convention (e.g. "03 Budget") get their
// leading number rewritten to match the new position, so the visible label
// stays in sync with drag-and-drop order instead of only the hidden `order`
// column changing. Renumbering is two-phase (temp placeholder, then final
// name) because @@unique([categoryId, name]) would otherwise reject a
// mid-transaction collision when two rows' target names cross over (e.g.
// "02 Approval" and "03 Budget" swapping to "03 Approval"/"02 Budget").
export async function reorderFolderTemplates(categoryId: string, orderedIds: string[]) {
  const user = await getCurrentUser();
  requirePermission(user.role, "canManageSettings", "manage folder templates");

  const existing = await prisma.folderTemplate.findMany({
    where: { id: { in: orderedIds }, categoryId, organizationId: user.organizationId },
  });
  const byId = new Map(existing.map((f) => [f.id, f]));

  const renames = orderedIds
    .map((id, index) => {
      const folder = byId.get(id);
      if (!folder) return null;
      const nextName = renumberName(folder.name, index);
      return nextName !== folder.name ? { id, nextName } : null;
    })
    .filter((r): r is { id: string; nextName: string } => r !== null);

  await prisma.$transaction([
    ...renames.map((r) => prisma.folderTemplate.update({ where: { id: r.id }, data: { name: `__reorder_tmp__${r.id}` } })),
    ...orderedIds.map((id, index) =>
      prisma.folderTemplate.update({
        where: { id, categoryId, organizationId: user.organizationId },
        data: { order: index },
      })
    ),
    ...renames.map((r) => prisma.folderTemplate.update({ where: { id: r.id }, data: { name: r.nextName } })),
  ]);

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

const RenameFolderSchema = z.object({
  folderTemplateId: z.string().min(1),
  name: z.string().trim().min(1, { error: "Folder name is required." }),
  isMandatory: z.string().optional(),
});

export type RenameFolderState = { message?: string } | undefined;

export async function renameFolderTemplate(_state: RenameFolderState, formData: FormData): Promise<RenameFolderState> {
  const user = await getCurrentUser();
  requirePermission(user.role, "canManageSettings", "manage folder templates");

  const validated = RenameFolderSchema.safeParse({
    folderTemplateId: formData.get("folderTemplateId"),
    name: formData.get("name"),
    isMandatory: formData.get("isMandatory") ?? undefined,
  });
  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "Invalid input." };
  }

  const { folderTemplateId, name, isMandatory } = validated.data;

  const existing = await prisma.folderTemplate.findFirst({
    where: { id: folderTemplateId, organizationId: user.organizationId },
  });
  if (!existing) {
    return { message: "Folder not found." };
  }

  const duplicate = await prisma.folderTemplate.findFirst({
    where: { categoryId: existing.categoryId, name, id: { not: folderTemplateId } },
  });
  if (duplicate) {
    return { message: `"${name}" already exists in this category.` };
  }

  await prisma.folderTemplate.update({
    where: { id: folderTemplateId },
    data: { name, isMandatory: isMandatory === "on" },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorId: user.id,
      action: "edit",
      entityType: "FolderTemplate",
      entityId: folderTemplateId,
      note: `renamed to "${name}"`,
    },
  });

  revalidatePath("/settings/folder-templates");
}

// Persists the rule editor's JSON blob (allowed types, min resolution, max
// size, per-type min/max counts, alternate document options, external-link
// fallback). Rules are looked up live from Folder.folderTemplateId at
// upload time, not re-snapshotted, so this affects every archive already
// using the template — see folder-rules.ts / file-storage.ts.
export async function updateFolderTemplateRules(folderTemplateId: string, rulesInput: unknown) {
  const user = await getCurrentUser();
  requirePermission(user.role, "canManageSettings", "manage folder templates");

  const rules: FolderRules = parseFolderRules(rulesInput);

  await prisma.folderTemplate.update({
    where: { id: folderTemplateId, organizationId: user.organizationId },
    data: { rules },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorId: user.id,
      action: "edit",
      entityType: "FolderTemplate",
      entityId: folderTemplateId,
      note: "updated upload rules",
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
