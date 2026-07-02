import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Button, Badge } from "@/components/ui";
import { Icon } from "@/components/icon";

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
        backHref="/settings"
        backLabel="Settings"
        title="Document editor integration"
        subtitle="Word/Excel/PowerPoint files can be opened for native co-editing in your organization's Office suite instead of downloading a local copy each time."
      />

      <Card className="mt-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
            <Icon name="cloud" size={22} />
          </span>
          <h2 className="type-title-medium text-on-surface">Google Workspace</h2>
          {org.docEditorProvider === "google" && integration && <Badge tone="success">Active</Badge>}
        </div>
        {integration ? (
          <p className="mt-2 type-body-medium text-on-surface-variant">
            Connected by {integration.connectedBy.name} on {integration.createdAt.toLocaleDateString()}.
          </p>
        ) : (
          <p className="mt-2 type-body-medium text-on-surface-variant">Not connected.</p>
        )}
        <Button href="/api/integrations/google/connect" className="mt-4" icon="link">
          {integration ? "Reconnect" : "Connect"} Google Workspace
        </Button>
      </Card>

      <Card className="mt-4 opacity-60">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-container-highest text-on-surface-variant">
            <Icon name="cloud_off" size={22} />
          </span>
          <h2 className="type-title-medium text-on-surface">Microsoft 365</h2>
          <Badge tone="neutral">Coming soon</Badge>
        </div>
        <p className="mt-2 type-body-medium text-on-surface-variant">
          Not yet available — connector is stubbed for a future release.
        </p>
      </Card>
    </main>
  );
}
