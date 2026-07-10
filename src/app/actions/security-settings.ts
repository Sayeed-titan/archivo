"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";
import { NAMING_TOKENS } from "@/lib/file-naming";

const WatermarkSettingsSchema = z.object({
  watermarkEnabled: z.string().optional(),
  watermarkText: z.string().trim().optional(),
});

export type WatermarkSettingsState = { message?: string } | undefined;

// SRS.md FR-11.5: watermarking is optional and org-configurable.
export async function updateWatermarkSettings(
  _state: WatermarkSettingsState,
  formData: FormData
): Promise<WatermarkSettingsState> {
  const user = await getCurrentUser();
  requirePermission(user.role, "canManageSettings", "manage watermark settings");

  const validated = WatermarkSettingsSchema.safeParse({
    watermarkEnabled: formData.get("watermarkEnabled") ?? undefined,
    watermarkText: formData.get("watermarkText") ?? undefined,
  });
  if (!validated.success) {
    return { message: "Invalid settings." };
  }

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: {
      watermarkEnabled: validated.data.watermarkEnabled === "on",
      watermarkText: validated.data.watermarkText || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorId: user.id,
      action: "edit",
      entityType: "Organization",
      entityId: user.organizationId,
      note: "updated watermark settings",
    },
  });

  revalidatePath("/settings/security");
  // Truthy-but-messageless state = success (the form shows a snackbar).
  return {};
}

const VALID_TOKENS = new Set<string>(NAMING_TOKENS.map((t) => t.token));

const FileNamingSchema = z.object({
  template: z.string().trim().min(1, { error: "Template cannot be empty." }),
});

export type FileNamingState = { message?: string } | undefined;

// Point 8 / configurable file naming: an admin composes a token-based
// template (see src/lib/file-naming.ts) applied at upload time. Enforces
// two invariants server-side, not just in the UI: every token used must be
// one this app actually resolves, and {originalName} must always appear so
// a computed name never fully loses the human-recognizable source filename
// (see the schema comment on Organization.fileNamingTemplate).
export async function updateFileNamingTemplate(
  _state: FileNamingState,
  formData: FormData
): Promise<FileNamingState> {
  const user = await getCurrentUser();
  requirePermission(user.role, "canManageSettings", "manage file naming settings");

  const validated = FileNamingSchema.safeParse({ template: formData.get("template") });
  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "Invalid template." };
  }

  const { template } = validated.data;

  if (!template.includes("{originalName}")) {
    return { message: "The template must include {originalName} so uploaded files stay traceable to their source name." };
  }

  const usedTokens = template.match(/\{[a-zA-Z]+\}/g) ?? [];
  const unknownToken = usedTokens.find((t) => !VALID_TOKENS.has(t));
  if (unknownToken) {
    return { message: `"${unknownToken}" is not a recognized token.` };
  }

  await prisma.organization.update({
    where: { id: user.organizationId },
    data: { fileNamingTemplate: template },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorId: user.id,
      action: "edit",
      entityType: "Organization",
      entityId: user.organizationId,
      note: "updated file naming template",
    },
  });

  revalidatePath("/settings/file-naming");
  return {};
}
