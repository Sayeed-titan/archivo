"use client";

import { useActionState } from "react";
import { addWorkflowState, type AddStateState } from "@/app/actions/workflow";

export function AddStateForm() {
  const [state, action, pending] = useActionState<AddStateState, FormData>(addWorkflowState, undefined);

  return (
    <form action={action} className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      <input name="name" placeholder="State name (e.g. Approved)" className="flex-1 rounded-md border border-slate-300 px-2 py-1" />
      <label className="flex items-center gap-1 text-xs text-slate-500">
        <input type="checkbox" name="isInitial" />
        initial
      </label>
      <label className="flex items-center gap-1 text-xs text-slate-500">
        <input type="checkbox" name="isTerminal" />
        terminal
      </label>
      <button disabled={pending} type="submit" className="rounded-md bg-slate-900 px-3 py-1 font-medium text-white disabled:opacity-50">
        Add state
      </button>
      {state?.message && <p className="w-full text-red-600">{state.message}</p>}
    </form>
  );
}
