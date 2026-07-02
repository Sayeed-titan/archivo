import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { parseRequirements, describeRequirement } from "@/lib/workflow/requirements";
import { AddStateForm } from "./add-state-form";
import { AddTransitionForm } from "./add-transition-form";
import { RemoveStateButton } from "./remove-state-button";
import { RemoveTransitionButton } from "./remove-transition-button";

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
      <h1 className="text-xl font-semibold">Approval workflow</h1>
      <p className="mt-1 text-sm text-slate-500">
        Define the sequence of statuses your organization uses and what must be true before an archive can
        move to the next one. This drives the Archive Health indicator too.
      </p>

      <h2 className="mt-6 text-sm font-medium text-slate-700">States</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-md border border-slate-200">
        {states.map((state) => (
          <li key={state.id} className="flex items-center justify-between px-4 py-2 text-sm">
            <span>
              {state.name}
              {state.isInitial && <span className="ml-2 text-xs text-blue-600">initial</span>}
              {state.isTerminal && <span className="ml-2 text-xs text-emerald-600">terminal</span>}
            </span>
            <RemoveStateButton stateId={state.id} />
          </li>
        ))}
        {states.length === 0 && <li className="px-4 py-2 text-sm text-slate-400">No states configured yet.</li>}
      </ul>
      <AddStateForm />

      <h2 className="mt-8 text-sm font-medium text-slate-700">Transitions</h2>
      <ul className="mt-2 divide-y divide-slate-100 rounded-md border border-slate-200">
        {transitions.map((transition) => (
          <li key={transition.id} className="px-4 py-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {transition.fromState} → {transition.toState}
              </span>
              <RemoveTransitionButton transitionId={transition.id} />
            </div>
            <ul className="mt-1 text-xs text-slate-500">
              {parseRequirements(transition.requirements).map((req, i) => (
                <li key={i}>• {describeRequirement(req)}</li>
              ))}
              {parseRequirements(transition.requirements).length === 0 && <li>No requirements — always allowed.</li>}
            </ul>
          </li>
        ))}
        {transitions.length === 0 && <li className="px-4 py-2 text-sm text-slate-400">No transitions configured yet.</li>}
      </ul>
      <AddTransitionForm states={states.map((s) => s.name)} />
    </main>
  );
}
