import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { getOrgStorageBytes } from "@/lib/storage-usage";
import { formatBytes } from "@/lib/dashboard-data";
import { PageHeader, Card, LinearProgress } from "@/components/ui";
import { OrgSettingsForm } from "./org-settings-form";

// Organization identity + storage quota (SRS FR-10.1 / NFR-2). Until now
// the quota could only be set via Prisma Studio — this closes that gap.
export default async function OrganizationSettingsPage() {
  const user = await getCurrentUser();
  if (!user.role.canManageSettings) {
    redirect("/dashboard");
  }

  const [org, usedBytes] = await Promise.all([
    prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } }),
    getOrgStorageBytes(user.organizationId),
  ]);

  const quotaBytes = org.storageQuotaBytes;
  const usedRatio = quotaBytes ? Number(usedBytes) / Number(quotaBytes) : null;

  return (
    <main className="mx-auto max-w-lg p-4 sm:p-8">
      <PageHeader
        backHref="/settings"
        backLabel="Settings"
        title="Organization"
        subtitle="Workspace identity and storage allocation."
      />

      <Card className="mt-6">
        <h2 className="type-title-medium text-on-surface">Storage</h2>
        <p className="mt-1 type-body-medium text-on-surface-variant">
          {formatBytes(Number(usedBytes))} used
          {quotaBytes ? ` of ${formatBytes(Number(quotaBytes))}` : " — no quota configured"}
        </p>
        {usedRatio !== null && (
          <>
            <LinearProgress value={usedRatio} className="mt-3" />
            <p className="mt-1 type-body-small text-on-surface-variant">
              Administrators are notified when usage crosses 80% of the quota.
            </p>
          </>
        )}
      </Card>

      <OrgSettingsForm
        initial={{
          name: org.name,
          industry: org.industry ?? "",
          storageQuotaGb: quotaBytes ? (Number(quotaBytes) / 1024 ** 3).toString() : "",
        }}
      />
    </main>
  );
}
