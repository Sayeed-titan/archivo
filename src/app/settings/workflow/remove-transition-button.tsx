"use client";

import { removeWorkflowTransition } from "@/app/actions/workflow";
import { Button } from "@/components/ui";

export function RemoveTransitionButton({ transitionId }: { transitionId: string }) {
  return (
    <Button onClick={() => removeWorkflowTransition(transitionId)} variant="text-error" size="inline">
      remove
    </Button>
  );
}
