"use client";

import { useActionState } from "react";
import { addWorkflowTransition, type AddTransitionState } from "@/app/actions/workflow";
import { getRequirableFields } from "@/lib/workflow/requirements";
import { SelectField, CheckboxField, Button, Card } from "@/components/ui";

export function AddTransitionForm({ states }: { states: string[] }) {
  const [state, action, pending] = useActionState<AddTransitionState, FormData>(addWorkflowTransition, undefined);
  const requirableFields = getRequirableFields();

  if (states.length < 2) {
    return <p className="mt-3 type-body-medium text-on-surface-variant">Add at least two states to define a transition.</p>;
  }

  return (
    <form action={action} className="mt-3">
      <Card className="space-y-2 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <SelectField name="fromState" defaultValue={states[0]} compact className="min-w-0 flex-1">
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectField>
          <span>→</span>
          <SelectField name="toState" defaultValue={states[1]} compact className="min-w-0 flex-1">
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectField>
        </div>

        <div>
          <p className="type-label-medium text-on-surface-variant">Requirements before this move is allowed:</p>
          <div className="mt-1">
            <CheckboxField
              name="req_mandatoryFolders"
              label="All mandatory folders must have at least one file"
              compact
            />
          </div>
          {requirableFields.map((field) => (
            <div key={field.key} className="mt-1">
              <CheckboxField
                name="req_field"
                value={field.key}
                label={<>&quot;{field.label}&quot; must be filled in</>}
                compact
              />
            </div>
          ))}
        </div>

        <Button disabled={pending} type="submit" size="sm" icon="add">
          Add transition
        </Button>
        {state?.message && <p className="type-body-medium text-error">{state.message}</p>}
      </Card>
    </form>
  );
}
