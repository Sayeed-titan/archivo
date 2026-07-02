"use client";

import { removeWorkflowState } from "@/app/actions/workflow";
import { Button } from "@/components/ui";

export function RemoveStateButton({ stateId }: { stateId: string }) {
  return (
    <Button onClick={() => removeWorkflowState(stateId)} variant="text-error" size="inline">
      remove
    </Button>
  );
}
