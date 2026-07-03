"use server";

import * as z from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { saveAvatar } from "@/lib/file-storage";

export type EmailPreferenceState = { message?: string } | undefined;

export async function updateEmailPreference(_state: EmailPreferenceState, formData: FormData): Promise<EmailPreferenceState> {
  const user = await getCurrentUser();

  await prisma.user.update({
    where: { id: user.id },
    data: { emailNotificationsEnabled: formData.get("emailNotificationsEnabled") === "on" },
  });

  revalidatePath("/profile");
  return undefined;
}

const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { error: "Current password is required." }),
    newPassword: z.string().min(8, { error: "New password must be at least 8 characters." }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    error: "New password and confirmation don't match.",
    path: ["confirmPassword"],
  });

export type ChangePasswordState = { message?: string; success?: boolean } | undefined;

export async function changePassword(_state: ChangePasswordState, formData: FormData): Promise<ChangePasswordState> {
  const user = await getCurrentUser();

  const validated = ChangePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!validated.success) {
    return { message: validated.error.issues[0]?.message ?? "Invalid input." };
  }

  const passwordMatches = await bcrypt.compare(validated.data.currentPassword, user.passwordHash);
  if (!passwordMatches) {
    return { message: "Current password is incorrect." };
  }

  const newHash = await bcrypt.hash(validated.data.newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });

  await prisma.auditLog.create({
    data: {
      organizationId: user.organizationId,
      actorId: user.id,
      action: "edit",
      entityType: "User",
      entityId: user.id,
      note: "changed password",
    },
  });

  return { success: true };
}

export type AvatarUploadState = { message?: string } | undefined;

export async function uploadAvatar(_state: AvatarUploadState, formData: FormData): Promise<AvatarUploadState> {
  const user = await getCurrentUser();

  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return { message: "No file provided." };
  }

  const result = await saveAvatar(file, user.avatarPath);
  if (!result.ok) {
    return { message: result.message };
  }

  await prisma.user.update({ where: { id: user.id }, data: { avatarPath: result.avatarPath } });

  revalidatePath("/", "layout"); // avatar shows in the top-bar user menu too
  return undefined;
}
