"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { withAuditContext } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";

const OrganizationSettingsSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required.").max(200),
  industry: z.string().trim().max(100).optional(),
  // Quota arrives in GB from the form; empty string = no limit.
  storageQuotaGb: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) > 0), "Storage quota must be a positive number of GB."),
});

export type OrganizationSettingsState = { status: "success" | "error"; message: string } | undefined;

export async function updateOrganizationSettings(
  _state: OrganizationSettingsState,
  formData: FormData
): Promise<OrganizationSettingsState> {
  return withAuditContext(async (user) => {
    requirePermission(user.role, "canManageSettings", "manage organization settings");

    const validated = OrganizationSettingsSchema.safeParse({
      name: formData.get("name"),
      industry: formData.get("industry") ?? undefined,
      storageQuotaGb: formData.get("storageQuotaGb") ?? undefined,
    });
    if (!validated.success) {
      return { status: "error", message: validated.error.issues[0]?.message ?? "Invalid organization settings." };
    }

    const { name, industry, storageQuotaGb } = validated.data;
    const storageQuotaBytes = storageQuotaGb ? BigInt(Math.round(Number(storageQuotaGb) * 1024 ** 3)) : null;

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: { name, industry: industry || null, storageQuotaBytes },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.id,
        action: "edit",
        entityType: "Organization",
        entityId: user.organizationId,
        note: `updated organization settings (name, industry, quota ${storageQuotaGb ? `${storageQuotaGb} GB` : "unlimited"})`,
      },
    });

    // Org name shows in the layout shell — revalidate everything.
    revalidatePath("/", "layout");
    return { status: "success", message: "Organization settings saved." };
  });
}
