import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { parseRequirements, describeRequirement } from "@/lib/workflow/requirements";
import { AddStateForm } from "./add-state-form";
import { AddTransitionForm } from "./add-transition-form";
import { RemoveStateButton } from "./remove-state-button";
import { RemoveTransitionButton } from "./remove-transition-button";
import { PageHeader, Badge } from "@/components/ui";

export default async function WorkflowSettingsPage() {
  const user = await getCurrentUser();
  if (!user.role.canManageSettings) {
    redirect("/dashboard");
  }

  const [states, transitions] = await Promise.all([
    prisma.workflowState.findMany({ where: { organizationId: user.organizationId }, orderBy: { order: "asc" } }),
    prisma.workflowTransition.findMany({ where: { organizationId: user.organizationId } }),
  ]);

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-8">
      <PageHeader
        backHref="/settings"
        backLabel="Settings"
        title="Approval workflow"
        subtitle="Define the sequence of statuses your organization uses and what must be true before an archive can move to the next one. This drives the Archive Health indicator too."
      />

      <h2 className="mt-6 type-title-medium text-on-surface">States</h2>
      <ul className="mt-2 divide-y divide-outline-variant/50 rounded-md border border-outline-variant bg-surface">
        {states.map((state) => (
          <li key={state.id} className="flex items-center justify-between px-4 py-2.5 type-body-medium text-on-surface">
            <span>
              {state.name}
              {state.isInitial && (
                <Badge tone="info" pill={false} className="ml-2">
                  initial
                </Badge>
              )}
              {state.isTerminal && (
                <Badge tone="success" pill={false} className="ml-2">
                  terminal
                </Badge>
              )}
            </span>
            <RemoveStateButton stateId={state.id} />
          </li>
        ))}
        {states.length === 0 && <li className="px-4 py-3 type-body-medium text-on-surface-variant">No states configured yet.</li>}
      </ul>
      <AddStateForm />

      <h2 className="mt-8 type-title-medium text-on-surface">Transitions</h2>
      <ul className="mt-2 divide-y divide-outline-variant/50 rounded-md border border-outline-variant bg-surface">
        {transitions.map((transition) => (
          <li key={transition.id} className="px-4 py-2.5 type-body-medium text-on-surface">
            <div className="flex items-center justify-between">
              <span className="type-label-large text-on-surface">
                {transition.fromState} → {transition.toState}
              </span>
              <RemoveTransitionButton transitionId={transition.id} />
            </div>
            <ul className="mt-1 type-body-small text-on-surface-variant">
              {parseRequirements(transition.requirements).map((req, i) => (
                <li key={i}>• {describeRequirement(req)}</li>
              ))}
              {parseRequirements(transition.requirements).length === 0 && <li>No requirements — always allowed.</li>}
            </ul>
          </li>
        ))}
        {transitions.length === 0 && <li className="px-4 py-3 type-body-medium text-on-surface-variant">No transitions configured yet.</li>}
      </ul>
      <AddTransitionForm states={states.map((s) => s.name)} />
    </main>
  );
}
