"use server";

import * as z from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { generateArchiveNumber } from "@/lib/archive-number";

const CreateArchiveSchema = z.object({
  name: z.string().trim().min(1, { error: "Name is required." }),
  categoryId: z.string().optional(),
});

export type CreateArchiveState =
  | {
      errors?: { name?: string[] };
      message?: string;
    }
  | undefined;

// Zero-Friction Capture (HANDOFF.md point 9): only Name is required.
// Everything else can be filled in later from the archive detail page.
export async function createArchive(_state: CreateArchiveState, formData: FormData): Promise<CreateArchiveState> {
  const user = await getCurrentUser();
  requirePermission(user.role, "canCreateArchive", "create an archive");

  const validated = CreateArchiveSchema.safeParse({
    name: formData.get("name"),
    categoryId: formData.get("categoryId") || undefined,
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { name, categoryId } = validated.data;

  const archiveNumber = await generateArchiveNumber(user.organizationId);

  const archive = await prisma.archive.create({
    data: {
      organizationId: user.organizationId,
      archiveNumber,
      name,
      categoryId,
      createdById: user.id,
    },
  });

  if (categoryId) {
    const templates = await prisma.folderTemplate.findMany({
      where: { organizationId: user.organizationId, categoryId },
      orderBy: { order: "asc" },
    });

    if (templates.length > 0) {
      await prisma.folder.createMany({
        data: templates.map((t) => ({
          archiveId: archive.id,
          name: t.name,
          order: t.order,
          isMandatory: t.isMandatory,
        })),
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorId: user.id,
      action: "create",
      entityType: "Archive",
      entityId: archive.id,
    },
  });

  redirect(`/archives/${archive.id}`);
}

const UpdateMetadataSchema = z.object({
  archiveId: z.string().min(1),
  name: z.string().trim().min(1, { error: "Name is required." }),
  department: z.string().trim().optional(),
  venue: z.string().trim().optional(),
  organizer: z.string().trim().optional(),
  coordinator: z.string().trim().optional(),
  donor: z.string().trim().optional(),
  projectName: z.string().trim().optional(),
  description: z.string().trim().optional(),
  status: z.string().trim().optional(),
});

export type UpdateMetadataState = { errors?: { name?: string[] }; message?: string } | undefined;

// SRS.md FR-3.4: metadata edits are restricted to Administrator/Archive
// Officer and captured in the audit trail.
export async function updateArchiveMetadata(
  _state: UpdateMetadataState,
  formData: FormData
): Promise<UpdateMetadataState> {
  const user = await getCurrentUser();
  requirePermission(user.role, "canEditMetadata", "edit archive metadata");

  const validated = UpdateMetadataSchema.safeParse(Object.fromEntries(formData));
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { archiveId, ...data } = validated.data;

  const existing = await prisma.archive.findFirst({
    where: { id: archiveId, organizationId: user.organizationId, deletedAt: null },
  });
  if (!existing) {
    return { message: "Archive not found." };
  }

  await prisma.archive.update({ where: { id: archiveId }, data });

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorId: user.id,
      action: "edit",
      entityType: "Archive",
      entityId: archiveId,
    },
  });

  revalidatePath(`/archives/${archiveId}`);
}

// Soft delete (HANDOFF.md point 5): recoverable, available to any role with
// canDeleteArchive (Administrator per SRS 3.9 — no other role has it today,
// but the check is by permission flag, not a hardcoded role name).
export async function softDeleteArchive(archiveId: string) {
  const user = await getCurrentUser();
  requirePermission(user.role, "canDeleteArchive", "delete an archive");

  const archive = await prisma.archive.findFirst({
    where: { id: archiveId, organizationId: user.organizationId, deletedAt: null },
  });
  if (!archive) return;

  await prisma.archive.update({ where: { id: archiveId }, data: { deletedAt: new Date() } });

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorId: user.id,
      action: "delete",
      entityType: "Archive",
      entityId: archiveId,
    },
  });

  redirect("/dashboard");
}

// Hard delete (HANDOFF.md point 5 & 8): Administrator-only, requires an
// explicit reason, and the hard-delete action itself is always logged —
// this is not skippable even though the note field is optional elsewhere.
export async function hardDeleteArchive(formData: FormData) {
  const user = await getCurrentUser();
  requirePermission(user.role, "canHardDelete", "permanently delete an archive");

  const archiveId = String(formData.get("archiveId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!archiveId || !reason) {
    throw new Error("A reason is required to permanently delete an archive.");
  }

  const archive = await prisma.archive.findFirst({
    where: { id: archiveId, organizationId: user.organizationId },
  });
  if (!archive) return;

  await prisma.$transaction([
    prisma.archive.delete({ where: { id: archiveId } }),
    prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.id,
        action: "hard_delete",
        entityType: "Archive",
        entityId: archiveId,
        note: reason,
      },
    }),
  ]);

  redirect("/dashboard");
}
