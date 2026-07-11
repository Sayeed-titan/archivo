"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { withAuditContext } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/authz";

// ── Per-user light/dark preference (top-bar toggle, any signed-in user) ──

export async function setThemePreference(preference: "light" | "dark" | "system") {
  return withAuditContext(async (user) => {
    if (preference !== "light" && preference !== "dark" && preference !== "system") return;

    await prisma.user.update({
      where: { id: user.id },
      data: { themePreference: preference },
    });

    // The theme attribute is rendered by the root layout — revalidate it.
    revalidatePath("/", "layout");
  });
}

// ── Org-wide MD3 appearance settings (/settings/appearance) ─────────────

const AppearanceSchema = z.object({
  themeSeedColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Seed color must be a hex value like #6750A4"),
  themeMode: z.enum(["light", "dark", "system"]),
  themeShape: z.enum(["sharp", "standard", "rounded"]),
  themeFontScale: z.enum(["small", "medium", "large"]),
});

export type AppearanceFormState = { status: "success" | "error"; message: string } | undefined;

export async function updateAppearanceSettings(
  _state: AppearanceFormState,
  formData: FormData
): Promise<AppearanceFormState> {
  return withAuditContext(async (user) => {
    requirePermission(user.role, "canManageSettings", "manage appearance settings");

    const validated = AppearanceSchema.safeParse({
      themeSeedColor: formData.get("themeSeedColor"),
      themeMode: formData.get("themeMode"),
      themeShape: formData.get("themeShape"),
      themeFontScale: formData.get("themeFontScale"),
    });
    if (!validated.success) {
      return { status: "error", message: validated.error.issues[0]?.message ?? "Invalid appearance settings." };
    }

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: validated.data,
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        actorId: user.id,
        action: "edit",
        entityType: "Organization",
        entityId: user.organizationId,
        note: `updated appearance settings (seed ${validated.data.themeSeedColor}, ${validated.data.themeMode} mode, ${validated.data.themeShape} shape, ${validated.data.themeFontScale} text)`,
      },
    });

    // Tokens are emitted in the root layout — revalidate everything.
    revalidatePath("/", "layout");
    return { status: "success", message: "Appearance updated for the whole organization." };
  });
}
