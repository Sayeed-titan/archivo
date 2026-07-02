import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { WatermarkSettingsForm } from "./watermark-settings-form";

export default async function SecuritySettingsPage() {
  const user = await getCurrentUser();
  if (!user.role.canManageSettings) {
    redirect("/dashboard");
  }

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } });

  return (
    <main className="mx-auto max-w-lg p-4 sm:p-8">
      <h1 className="text-xl font-semibold">Security &amp; watermarking</h1>
      <p className="mt-1 text-sm text-slate-500">
        Optional watermark applied to downloaded images and exported PDF reports (SRS FR-11.5).
      </p>
      <WatermarkSettingsForm
        watermarkEnabled={org.watermarkEnabled}
        watermarkText={org.watermarkText}
        orgName={org.name}
      />
    </main>
  );
}
