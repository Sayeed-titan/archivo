"use client";

import { removeWorkflowState } from "@/app/actions/workflow";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";

export function RemoveStateButton({ stateId, asMenuItem }: { stateId: string; asMenuItem?: boolean }) {
  if (asMenuItem) {
    return (
      <button
        type="button"
        role="menuitem"
        onClick={() => removeWorkflowState(stateId)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left type-label-large text-error transition-colors hover:bg-error/8"
      >
        <Icon name="delete" size={20} />
        Delete
      </button>
    );
  }

  return (
    <Button onClick={() => removeWorkflowState(stateId)} variant="text-error" size="inline">
      remove
    </Button>
  );
}
