import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { WatermarkSettingsForm } from "./watermark-settings-form";
import { PageHeader } from "@/components/ui";

export default async function SecuritySettingsPage() {
  const user = await getCurrentUser();
  if (!user.role.canManageSettings) {
    redirect("/dashboard");
  }

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } });

  return (
    <main className="mx-auto max-w-lg p-4 sm:p-8">
      <PageHeader
        title="Security & watermarking"
        subtitle="Optional watermark applied to downloaded images and exported PDF reports (SRS FR-11.5)."
      />
      <WatermarkSettingsForm
        watermarkEnabled={org.watermarkEnabled}
        watermarkText={org.watermarkText}
        orgName={org.name}
      />
    </main>
  );
}
