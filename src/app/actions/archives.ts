"use server";

import * as z from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { withAuditContext } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { generateArchiveNumber } from "@/lib/archive-number";
import { notifyAdmins } from "@/lib/notifications";
import { submitExternalFileLink as submitExternalFileLinkImpl } from "@/lib/file-storage";
import { getAuditContext } from "@/lib/audit-context";

const CreateArchiveSchema = z.object({
  name: z.string().trim().min(1, { error: "Name is required." }),
  categoryId: z.string().optional(),
  eventDate: z.string().optional(),
  eventDateEnd: z.string().optional(),
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
  return withAuditContext(async (user) => {
    requirePermission(user.role, "canCreateArchive", "create an archive");

    const validated = CreateArchiveSchema.safeParse({
      name: formData.get("name"),
      categoryId: formData.get("categoryId") || undefined,
      eventDate: formData.get("eventDate") || undefined,
      eventDateEnd: formData.get("eventDateEnd") || undefined,
    });

    if (!validated.success) {
      return { errors: validated.error.flatten().fieldErrors };
    }

    const { name, categoryId, eventDate, eventDateEnd } = validated.data;

    const archiveNumber = await generateArchiveNumber(user.organizationId);

    const archive = await prisma.archive.create({
      data: {
        organizationId: user.organizationId,
        archiveNumber,
        name,
        categoryId,
        eventDate: eventDate ? new Date(eventDate) : undefined,
        eventEndDate: eventDateEnd && eventDateEnd !== eventDate ? new Date(eventDateEnd) : undefined,
        createdById: user.id,
      },
    });

    if (categoryId) {
      const templates = await prisma.folderTemplate.findMany({
        where: { organizationId: user.organizationId, categoryId },
        orderBy: { order: "asc" },
      });

      if (templates.length > 0) {
        // createMany isn't intercepted by the audit Prisma extension (no
        // per-row return value to stamp against), so createdById/createdIp
        // are set explicitly for these auto-provisioned folders.
        const auditIp = getAuditContext()?.ip ?? null;
        await prisma.folder.createMany({
          data: templates.map((t) => ({
            archiveId: archive.id,
            name: t.name,
            order: t.order,
            isMandatory: t.isMandatory,
            folderTemplateId: t.id,
            createdById: user.id,
            createdIp: auditIp,
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

    await notifyAdmins(
      user.organizationId,
      "archive_created",
      `${user.name} created archive "${archive.name}" (${archive.archiveNumber})`,
      `/archives/${archive.id}`
    );

    redirect(`/archives/${archive.id}`);
  });
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
  eventDate: z.string().optional(),
  eventDateEnd: z.string().optional(),
});

export type UpdateMetadataState = { errors?: { name?: string[] }; message?: string } | undefined;

// SRS.md FR-3.4: metadata edits are restricted to Administrator/Archive
// Officer and captured in the audit trail. Status is intentionally NOT
// editable here — it only changes via transitionArchiveStatus() below,
// which enforces the org's configured workflow requirements (Prompt 7).
// Letting status be set through this free-form form would let anyone
// bypass those requirements.
export async function updateArchiveMetadata(
  _state: UpdateMetadataState,
  formData: FormData
): Promise<UpdateMetadataState> {
  return withAuditContext(async (user) => {
    requirePermission(user.role, "canEditMetadata", "edit archive metadata");

    const validated = UpdateMetadataSchema.safeParse(Object.fromEntries(formData));
    if (!validated.success) {
      return { errors: validated.error.flatten().fieldErrors };
    }

    const { archiveId, eventDate, eventDateEnd, ...data } = validated.data;

    const existing = await prisma.archive.findFirst({
      where: { id: archiveId, organizationId: user.organizationId, deletedAt: null },
    });
    if (!existing) {
      return { message: "Archive not found." };
    }

    await prisma.archive.update({
      where: { id: archiveId },
      data: {
        ...data,
        eventDate: eventDate ? new Date(eventDate) : null,
        eventEndDate: eventDateEnd && eventDateEnd !== eventDate ? new Date(eventDateEnd) : null,
      },
    });

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
  });
}

export type SubmitExternalLinkState = { message?: string } | undefined;

// FolderRules.externalLinkFallback (a sub-folder's upload rules) lets the
// uploader paste a link instead of a file that's too large to upload —
// see submitExternalFileLink() in file-storage.ts for the File-row shape.
export async function submitExternalFileLink(
  archiveId: string,
  folderId: string,
  url: string,
  label?: string
): Promise<SubmitExternalLinkState> {
  return withAuditContext(async (user) => {
    requirePermission(user.role, "canUpload", "upload files");

    const result = await submitExternalFileLinkImpl(archiveId, folderId, url, user, label);
    if (!result.ok) {
      return { message: result.message };
    }

    revalidatePath(`/archives/${archiveId}`);
  });
}

// Move an archive to the next state in its org's configured workflow
// (Prompt 7 / HANDOFF.md point 7). Requirements are re-checked here, not
// just trusted from the client — the "allowed" flag shown in the UI is a
// convenience, not the authorization boundary.
export async function transitionArchiveStatus(archiveId: string, toState: string) {
  return withAuditContext(async (user) => {
    requirePermission(user.role, "canEditMetadata", "change archive status");

    const archive = await prisma.archive.findFirst({
      where: { id: archiveId, organizationId: user.organizationId, deletedAt: null },
      include: {
        folders: { include: { files: { where: { isLatest: true, deletedAt: null } }, folderTemplate: true } },
      },
    });
    if (!archive) {
      throw new Error("Archive not found.");
    }

    const { getAvailableTransitions } = await import("@/lib/workflow/engine");
    const transitions = await getAvailableTransitions(archive);
    const target = transitions.find((t) => t.toState === toState);

    if (!target) {
      throw new Error(`"${toState}" is not a valid transition from "${archive.status}".`);
    }
    if (!target.allowed) {
      throw new Error(`Requirements not met for moving to "${toState}".`);
    }

    await prisma.archive.update({ where: { id: archiveId }, data: { status: toState } });

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.id,
        action: "edit",
        entityType: "Archive",
        entityId: archiveId,
        note: `status: ${archive.status} → ${toState}`,
      },
    });

    if (toState === "Pending Review") {
      await notifyAdmins(user.organizationId, "review_pending", `"${archive.name}" is now pending review`, `/archives/${archiveId}`);
    }

    revalidatePath(`/archives/${archiveId}`);
  });
}

// Soft delete (HANDOFF.md point 5): recoverable, available to any role with
// canDeleteArchive (Administrator per SRS 3.9 — no other role has it today,
// but the check is by permission flag, not a hardcoded role name).
export async function softDeleteArchive(archiveId: string) {
  return withAuditContext(async (user) => {
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
  });
}

// Hard delete (HANDOFF.md point 5 & 8): Administrator-only, requires an
// explicit reason, and the hard-delete action itself is always logged —
// this is not skippable even though the note field is optional elsewhere.
export async function hardDeleteArchive(formData: FormData) {
  return withAuditContext(async (user) => {
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
  });
}
