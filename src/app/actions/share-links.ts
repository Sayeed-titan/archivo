"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";

// Sharing exposes the same content a download would, so it's gated on
// canDownload — same permission level, not a separate one.
const CreateShareLinkSchema = z.object({
  fileId: z.string().min(1),
  expiresInDays: z.string().optional(),
  maxDownloads: z.string().optional(),
});

export type CreateShareLinkState = { message?: string; token?: string } | undefined;

export async function createShareLink(_state: CreateShareLinkState, formData: FormData): Promise<CreateShareLinkState> {
  const user = await getCurrentUser();
  requirePermission(user.role, "canDownload", "share files");

  const validated = CreateShareLinkSchema.safeParse({
    fileId: formData.get("fileId"),
    expiresInDays: formData.get("expiresInDays") || undefined,
    maxDownloads: formData.get("maxDownloads") || undefined,
  });
  if (!validated.success) {
    return { message: "Invalid request." };
  }

  const file = await prisma.file.findFirst({
    where: { id: validated.data.fileId, deletedAt: null, folder: { archive: { organizationId: user.organizationId } } },
  });
  if (!file) {
    return { message: "File not found." };
  }

  const expiresInDays = validated.data.expiresInDays ? Number(validated.data.expiresInDays) : null;
  const maxDownloads = validated.data.maxDownloads ? Number(validated.data.maxDownloads) : null;

  const shareLink = await prisma.shareLink.create({
    data: {
      organizationId: user.organizationId,
      fileId: file.id,
      createdById: user.id,
      expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : null,
      maxDownloads: maxDownloads && maxDownloads > 0 ? maxDownloads : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorId: user.id,
      action: "create",
      entityType: "File",
      entityId: file.id,
      note: `created a share link for "${file.filename}"`,
    },
  });

  return { token: shareLink.token };
}

export async function revokeShareLink(shareLinkId: string) {
  const user = await getCurrentUser();
  requirePermission(user.role, "canDownload", "share files");

  await prisma.shareLink.updateMany({
    where: { id: shareLinkId, organizationId: user.organizationId },
    data: { revokedAt: new Date() },
  });

  revalidatePath("/archives", "layout");
}
