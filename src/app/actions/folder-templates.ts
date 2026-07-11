"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { withAuditContext } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { parseFolderRules, type FolderRules } from "@/lib/folder-rules";

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

// New folders are inserted at the top of their category (order 0), not
// appended — every existing row in that category is shifted down by one in
// the same transaction, so there's never a window where two rows share an
// order value.
export async function addFolderTemplate(_state: AddFolderState, formData: FormData): Promise<AddFolderState> {
  return withAuditContext(async (user) => {
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

    const created = await prisma.$transaction(async (tx) => {
      await tx.folderTemplate.updateMany({
        where: { categoryId, organizationId: user.organizationId },
        data: { order: { increment: 1 } },
      });

      return tx.folderTemplate.create({
        data: {
          organizationId: user.organizationId,
          categoryId,
          name,
          order: 0,
          isMandatory: isMandatory === "on",
        },
      });
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
  });
}

// Reorders every folder template in a category to match `orderedIds`,
// always renumbering the whole set (0..n-1) rather than swapping two
// values — existing `order` values aren't guaranteed contiguous after past
// deletions, so a sparse update could collide or leave gaps.
//
// Only the `order` column changes here — folder `name` text is never
// rewritten as a side effect of drag/keyboard reordering. Position is shown
// in the UI as a separate ordinal badge derived from array index (see
// folder-template-list.tsx), not baked into the stored name.
export async function reorderFolderTemplates(categoryId: string, orderedIds: string[]) {
  return withAuditContext(async (user) => {
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
  });
}

const RenameFolderSchema = z.object({
  folderTemplateId: z.string().min(1),
  name: z.string().trim().min(1, { error: "Folder name is required." }),
  isMandatory: z.string().optional(),
});

export type RenameFolderState = { message?: string } | undefined;

export async function renameFolderTemplate(_state: RenameFolderState, formData: FormData): Promise<RenameFolderState> {
  return withAuditContext(async (user) => {
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
  });
}

// Persists the rule editor's JSON blob (allowed types, min resolution, max
// size, per-type min/max counts, alternate document options, external-link
// fallback). Rules are looked up live from Folder.folderTemplateId at
// upload time, not re-snapshotted, so this affects every archive already
// using the template — see folder-rules.ts / file-storage.ts.
export async function updateFolderTemplateRules(folderTemplateId: string, rulesInput: unknown) {
  return withAuditContext(async (user) => {
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
  });
}

// Flips required/optional inline, independent of renaming — the row-level
// checkbox (see folder-template-list.tsx) doesn't need to open the rename
// form just to change this one flag.
export async function toggleFolderMandatory(folderTemplateId: string, isMandatory: boolean) {
  return withAuditContext(async (user) => {
    requirePermission(user.role, "canManageSettings", "manage folder templates");

    const updated = await prisma.folderTemplate.update({
      where: { id: folderTemplateId, organizationId: user.organizationId },
      data: { isMandatory },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.id,
        action: "edit",
        entityType: "FolderTemplate",
        entityId: folderTemplateId,
        note: isMandatory ? `marked "${updated.name}" as required` : `marked "${updated.name}" as optional`,
      },
    });

    revalidatePath("/settings/folder-templates");
  });
}

export async function removeFolderTemplate(folderTemplateId: string) {
  return withAuditContext(async (user) => {
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
  });
}
