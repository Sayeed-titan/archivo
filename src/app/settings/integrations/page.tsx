import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Button } from "@/components/ui";

export default async function IntegrationsPage() {
  const user = await getCurrentUser();
  if (!user.role.canManageSettings) {
    redirect("/dashboard");
  }

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } });
  const integration = await prisma.orgIntegration.findUnique({
    where: { organizationId_provider: { organizationId: user.organizationId, provider: "google" } },
    include: { connectedBy: true },
  });

  return (
    <main className="mx-auto max-w-lg p-4 sm:p-8">
      <PageHeader
        title="Document editor integration"
        subtitle="Word/Excel/PowerPoint files can be opened for native co-editing in your organization's Office suite instead of downloading a local copy each time."
      />

      <Card className="mt-6">
        <h2 className="font-medium">Google Workspace</h2>
        {integration ? (
          <p className="mt-1 text-sm text-slate-500">
            Connected by {integration.connectedBy.name} on {integration.createdAt.toLocaleDateString()}.
            {org.docEditorProvider === "google" && <span className="ml-1 text-emerald-600">Active provider.</span>}
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-500">Not connected.</p>
        )}
        <Button href="/api/integrations/google/connect" className="mt-3">
          {integration ? "Reconnect" : "Connect"} Google Workspace
        </Button>
      </Card>

      <Card className="mt-4 opacity-60">
        <h2 className="font-medium">Microsoft 365</h2>
        <p className="mt-1 text-sm text-slate-500">Not yet available — connector is stubbed for a future release.</p>
      </Card>
    </main>
  );
}
