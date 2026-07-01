import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

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
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-semibold">Document editor integration</h1>
      <p className="mt-1 text-sm text-slate-500">
        Word/Excel/PowerPoint files can be opened for native co-editing in your organization&apos;s Office
        suite instead of downloading a local copy each time.
      </p>

      <div className="mt-6 rounded-md border border-slate-200 p-4">
        <h2 className="font-medium">Google Workspace</h2>
        {integration ? (
          <p className="mt-1 text-sm text-slate-500">
            Connected by {integration.connectedBy.name} on {integration.createdAt.toLocaleDateString()}.
            {org.docEditorProvider === "google" && <span className="ml-1 text-emerald-600">Active provider.</span>}
          </p>
        ) : (
          <p className="mt-1 text-sm text-slate-500">Not connected.</p>
        )}
        <a
          href="/api/integrations/google/connect"
          className="mt-3 inline-block rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
        >
          {integration ? "Reconnect" : "Connect"} Google Workspace
        </a>
      </div>

      <div className="mt-4 rounded-md border border-slate-200 p-4 opacity-60">
        <h2 className="font-medium">Microsoft 365</h2>
        <p className="mt-1 text-sm text-slate-500">Not yet available — connector is stubbed for a future release.</p>
      </div>
    </main>
  );
}
