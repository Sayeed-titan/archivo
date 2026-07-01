import "server-only";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/notifications";

const WARNING_THRESHOLD = 0.8; // SRS.md use case 5: notify at 80% of allocated storage

export async function getOrgStorageBytes(organizationId: string): Promise<bigint> {
  const result = await prisma.file.aggregate({
    where: { deletedAt: null, isLatest: true, folder: { archive: { organizationId } } },
    _sum: { sizeBytes: true },
  });
  return BigInt(result._sum.sizeBytes ?? 0);
}

// Called after an upload completes — cheap enough to run inline since
// storage totals are already being touched; avoids needing a scheduled
// job just to catch the 80% threshold in this phase (see PRODUCT_ROADMAP.md
// Phase 2 "storage & missing documents" review for the longer-term version).
export async function checkStorageLimit(organizationId: string) {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org?.storageQuotaBytes) return;

  const used = await getOrgStorageBytes(organizationId);
  const ratio = Number(used) / Number(org.storageQuotaBytes);

  if (ratio >= WARNING_THRESHOLD) {
    const alreadyNotifiedRecently = await prisma.notification.findFirst({
      where: {
        organizationId,
        type: "storage_limit",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (alreadyNotifiedRecently) return;

    await notifyAdmins(
      organizationId,
      "storage_limit",
      `Storage usage is at ${(ratio * 100).toFixed(0)}% of your allocated quota.`,
      "/dashboard"
    );
  }
}
