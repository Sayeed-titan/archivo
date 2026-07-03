"use client";

import { useActionState, useEffect, useRef } from "react";
import { createRole, type RoleFormState } from "@/app/actions/roles";
import { PERMISSION_LABELS } from "./permission-labels";
import { TextField, CheckboxField, Button, Card, useSnackbar } from "@/components/ui";

export function CreateRoleForm() {
  const [state, action, pending] = useActionState<RoleFormState, FormData>(createRole, undefined);
  const { showSnackbar } = useSnackbar();
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.message) {
      showSnackbar("Role created.");
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, state, showSnackbar]);

  return (
    <form ref={formRef} action={action} className="mt-2">
      <Card>
        <h3 className="type-title-small text-on-surface">New role</h3>
        <div className="mt-3 space-y-3">
          <TextField name="name" label="Role name" placeholder="e.g. Regional Coordinator" compact />
          <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {PERMISSION_LABELS.map(({ key, label }) => (
              <CheckboxField key={key} name={key} label={label} compact />
            ))}
          </div>
          {state?.message && <p className="type-body-medium text-error">{state.message}</p>}
          <Button type="submit" size="sm" loading={pending} loadingText="Creating…" icon="add">
            Create role
          </Button>
        </div>
      </Card>
    </form>
  );
}
