"use client";

import { useActionState, useState, useTransition } from "react";
import { updateRole, deleteRole, type RoleFormState } from "@/app/actions/roles";
import { PERMISSION_LABELS } from "./permission-labels";
import { TextField, CheckboxField, Button, Card, Dialog, Badge, useSnackbar } from "@/components/ui";

export type RoleWithCount = {
  id: string;
  name: string;
  userCount: number;
  permissions: Record<string, boolean>;
};

export function RoleCard({ role }: { role: RoleWithCount }) {
  const updateWithId = async (_state: RoleFormState, formData: FormData) => updateRole(role.id, formData);
  const [state, action, pending] = useActionState<RoleFormState, FormData>(updateWithId, undefined);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [deletePending, startDeleteTransition] = useTransition();
  const { showSnackbar } = useSnackbar();

  return (
    <Card>
      <form action={action} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TextField name="name" defaultValue={role.name} compact className="max-w-56" />
          <Badge tone="neutral">
            {role.userCount} {role.userCount === 1 ? "user" : "users"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
          {PERMISSION_LABELS.map(({ key, label }) => (
            <CheckboxField key={key} name={key} label={label} defaultChecked={role.permissions[key]} compact />
          ))}
        </div>

        {state?.message && <p className="type-body-medium text-error">{state.message}</p>}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" size="sm" loading={pending} loadingText="Saving…" icon="save">
            Save
          </Button>
          <Button
            type="button"
            variant="outlined-error"
            size="sm"
            icon="delete"
            onClick={() => {
              setDeleteMessage(null);
              setConfirmingDelete(true);
            }}
          >
            Delete role
          </Button>
        </div>
      </form>

      <Dialog
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        icon="delete"
        headline={`Delete "${role.name}"?`}
        actions={
          <>
            <Button variant="text" type="button" onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="text-error"
              type="button"
              loading={deletePending}
              loadingText="Deleting…"
              onClick={() =>
                startDeleteTransition(async () => {
                  const result = await deleteRole(role.id);
                  if (result?.message) {
                    setDeleteMessage(result.message);
                  } else {
                    setConfirmingDelete(false);
                    showSnackbar("Role deleted.");
                  }
                })
              }
            >
              Delete
            </Button>
          </>
        }
      >
        {deleteMessage ?? "This can't be undone."}
      </Dialog>
    </Card>
  );
}
