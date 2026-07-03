import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { AddStateForm } from "./add-state-form";
import { AddTransitionForm } from "./add-transition-form";
import { WorkflowStateEditor } from "./workflow-state-editor";
import { TransitionGraph } from "./transition-graph";
import { PageHeader } from "@/components/ui";

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
      <p className="mt-1 type-body-small text-on-surface-variant">
        Drag the handle (or select it and use arrow keys) to reorder — this is the sequence archives move through.
      </p>
      <div className="mt-2">
        <WorkflowStateEditor
          states={states.map((s) => ({ id: s.id, name: s.name, isInitial: s.isInitial, isTerminal: s.isTerminal }))}
        />
      </div>
      <AddStateForm />

      <h2 className="mt-8 type-title-medium text-on-surface">Transitions</h2>
      <p className="mt-1 type-body-small text-on-surface-variant">
        Click an arrow to see or change what&apos;s required before that move is allowed.
      </p>
      <div className="mt-2">
        <TransitionGraph
          states={states.map((s) => ({ id: s.id, name: s.name, order: s.order }))}
          transitions={transitions.map((t) => ({ id: t.id, fromState: t.fromState, toState: t.toState, requirements: t.requirements }))}
        />
      </div>
      <AddTransitionForm states={states.map((s) => s.name)} />
    </main>
  );
}
