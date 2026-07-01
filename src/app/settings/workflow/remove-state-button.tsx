"use client";

import { removeWorkflowState } from "@/app/actions/workflow";

export function RemoveStateButton({ stateId }: { stateId: string }) {
  return (
    <button onClick={() => removeWorkflowState(stateId)} className="text-xs text-slate-400 hover:text-red-600">
      remove
    </button>
  );
}
