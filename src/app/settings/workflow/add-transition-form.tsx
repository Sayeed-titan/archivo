"use client";

import { useActionState } from "react";
import { addWorkflowTransition, type AddTransitionState } from "@/app/actions/workflow";
import { getRequirableFields } from "@/lib/workflow/requirements";

export function AddTransitionForm({ states }: { states: string[] }) {
  const [state, action, pending] = useActionState<AddTransitionState, FormData>(addWorkflowTransition, undefined);
  const requirableFields = getRequirableFields();

  if (states.length < 2) {
    return <p className="mt-3 text-sm text-slate-400">Add at least two states to define a transition.</p>;
  }

  return (
    <form action={action} className="mt-3 space-y-2 rounded-md border border-slate-200 p-3 text-sm">
      <div className="flex items-center gap-2">
        <select name="fromState" defaultValue={states[0]} className="rounded-md border border-slate-300 px-2 py-1">
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span>→</span>
        <select name="toState" defaultValue={states[1]} className="rounded-md border border-slate-300 px-2 py-1">
          {states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="text-xs font-medium text-slate-600">Requirements before this move is allowed:</p>
        <label className="mt-1 flex items-center gap-2 text-xs">
          <input type="checkbox" name="req_mandatoryFolders" />
          All mandatory folders must have at least one file
        </label>
        {requirableFields.map((field) => (
          <label key={field.key} className="mt-1 flex items-center gap-2 text-xs">
            <input type="checkbox" name="req_field" value={field.key} />
            &quot;{field.label}&quot; must be filled in
          </label>
        ))}
      </div>

      <button disabled={pending} type="submit" className="rounded-md bg-slate-900 px-3 py-1 font-medium text-white disabled:opacity-50">
        Add transition
      </button>
      {state?.message && <p className="text-red-600">{state.message}</p>}
    </form>
  );
}
