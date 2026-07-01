import "server-only";
import { prisma } from "@/lib/prisma";

export type NotificationType =
  | "archive_created"
  | "missing_documents"
  | "upload_completed"
  | "review_pending"
  | "storage_limit";

// SRS.md FR-10.1: notify relevant users on archive created, missing
// required documents, upload completed, review pending, storage limit.
// "Relevant users" here = the archive's creator plus anyone in the org
// who can manage settings (Administrators) for org-wide signals like
// storage limits — kept simple since there's no per-user subscription
// model yet.
export async function notify(
  organizationId: string,
  recipientId: string,
  type: NotificationType,
  message: string,
  linkPath?: string
) {
  await prisma.notification.create({
    data: { organizationId, recipientId, type, message, linkPath },
  });
}

export async function notifyAdmins(organizationId: string, type: NotificationType, message: string, linkPath?: string) {
  const admins = await prisma.user.findMany({
    where: { organizationId, isActive: true, role: { canManageSettings: true } },
  });
  await prisma.notification.createMany({
    data: admins.map((admin) => ({ organizationId, recipientId: admin.id, type, message, linkPath })),
  });
}
