"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";

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
}
