"use client";

import { useActionState } from "react";
import { addWorkflowState, type AddStateState } from "@/app/actions/workflow";
import { TextField, CheckboxField, Button } from "@/components/ui";

export function AddStateForm() {
  const [state, action, pending] = useActionState<AddStateState, FormData>(addWorkflowState, undefined);

  return (
    <form action={action} className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      <TextField name="name" placeholder="State name (e.g. Approved)" compact className="flex-1" />
      <CheckboxField name="isInitial" label="initial" compact />
      <CheckboxField name="isTerminal" label="terminal" compact />
      <Button disabled={pending} type="submit" size="sm">
        Add state
      </Button>
      {state?.message && <p className="w-full text-red-600">{state.message}</p>}
    </form>
  );
}
