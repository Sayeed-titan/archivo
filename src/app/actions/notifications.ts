"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

// Notification has no createdBy/updatedBy tracking — getCurrentUser() is sufficient here.
export async function markNotificationRead(notificationId: string) {
  const user = await getCurrentUser();

  await prisma.notification.updateMany({
    where: { id: notificationId, recipientId: user.id },
    data: { readAt: new Date() },
  });

  revalidatePath("/", "layout"); // bell now lives in the layout shell
}

// Notification has no createdBy/updatedBy tracking — getCurrentUser() is sufficient here.
export async function markAllNotificationsRead() {
  const user = await getCurrentUser();

  await prisma.notification.updateMany({
    where: { recipientId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/", "layout"); // bell now lives in the layout shell
}
