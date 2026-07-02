"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

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
