import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { FileNamingForm } from "./file-naming-form";
import { PageHeader } from "@/components/ui";

export default async function FileNamingSettingsPage() {
  const user = await getCurrentUser();
  if (!user.role.canManageSettings) {
    redirect("/dashboard");
  }

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } });

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-8">
      <PageHeader
        backHref="/settings"
        backLabel="Settings"
        title="File naming"
        subtitle="Control how uploaded files are automatically renamed. Applies to every upload across every archive."
      />
      <FileNamingForm template={org.fileNamingTemplate} />
    </main>
  );
}
