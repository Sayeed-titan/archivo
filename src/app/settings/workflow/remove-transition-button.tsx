"use client";

import { removeWorkflowTransition } from "@/app/actions/workflow";

export function RemoveTransitionButton({ transitionId }: { transitionId: string }) {
  return (
    <button onClick={() => removeWorkflowTransition(transitionId)} className="text-xs text-slate-400 hover:text-red-600">
      remove
    </button>
  );
}
