"use client";

import { useActionState } from "react";
import { updateWorkflowState, type UpdateStateState } from "@/app/actions/workflow";
import { Dialog } from "@/components/ui/dialog";
import { Button, TextField, CheckboxField } from "@/components/ui";

type StateItem = { id: string; name: string; isInitial: boolean; isTerminal: boolean };

// Success closes the dialog implicitly: a successful save calls
// revalidatePath, the parent re-renders with the new name, and the parent
// itself owns `open` — this component only needs to render whatever
// validation message comes back on failure, not track its own success state.
export function EditStateDialog({
  state,
  open,
  onClose,
}: {
  state: StateItem;
  open: boolean;
  onClose: () => void;
}) {
  const boundAction = updateWorkflowState.bind(null, state.id);
  const [result, formAction, pending] = useActionState<UpdateStateState, FormData>(boundAction, undefined);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      headline={`Edit "${state.name}"`}
      actions={
        <>
          <Button variant="text" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="text" type="submit" form={`edit-state-${state.id}`} disabled={pending}>
            Save
          </Button>
        </>
      }
    >
      <form id={`edit-state-${state.id}`} action={formAction} className="space-y-3">
        <TextField name="name" defaultValue={state.name} label="State name" />
        <div className="flex items-center gap-4">
          <CheckboxField name="isInitial" label="Initial" defaultChecked={state.isInitial} />
          <CheckboxField name="isTerminal" label="Terminal" defaultChecked={state.isTerminal} />
        </div>
        {result?.message && <p className="type-body-small text-error">{result.message}</p>}
      </form>
    </Dialog>
  );
}
