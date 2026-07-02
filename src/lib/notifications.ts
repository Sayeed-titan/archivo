import "server-only";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export type NotificationType =
  | "archive_created"
  | "missing_documents"
  | "upload_completed"
  | "review_pending"
  | "storage_limit";

const TYPE_SUBJECTS: Record<NotificationType, string> = {
  archive_created: "Archive created",
  missing_documents: "Missing required documents",
  upload_completed: "Upload completed",
  review_pending: "Review pending",
  storage_limit: "Storage limit warning",
};

// Fire-and-forget: a broken SMTP config or a down mail server must never
// block the underlying action (archive creation, upload, etc.) that
// triggered the notification — email is additive per SRS FR-10.2, the
// in-app Notification row is the one thing that's guaranteed to land.
async function sendEmailIfEnabled(recipientId: string, type: NotificationType, message: string, linkPath?: string) {
  const user = await prisma.user.findUnique({ where: { id: recipientId } });
  if (!user || !user.emailNotificationsEnabled) return;

  const linkUrl = linkPath ? `${process.env.APP_URL ?? "http://localhost:3000"}${linkPath}` : undefined;

  try {
    await sendEmail(user.email, TYPE_SUBJECTS[type], message, linkUrl);
  } catch (error) {
    console.error(`Failed to send notification email to ${user.email}:`, error);
  }
}

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
  await sendEmailIfEnabled(recipientId, type, message, linkPath);
}

export async function notifyAdmins(organizationId: string, type: NotificationType, message: string, linkPath?: string) {
  const admins = await prisma.user.findMany({
    where: { organizationId, isActive: true, role: { canManageSettings: true } },
  });
  await prisma.notification.createMany({
    data: admins.map((admin) => ({ organizationId, recipientId: admin.id, type, message, linkPath })),
  });
  await Promise.all(admins.map((admin) => sendEmailIfEnabled(admin.id, type, message, linkPath)));
}
