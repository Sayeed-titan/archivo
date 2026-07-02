"use client";

import { useActionState } from "react";
import { addFolderTemplate, type AddFolderState } from "@/app/actions/folder-templates";
import { TextField, CheckboxField, Button } from "@/components/ui";

export function AddFolderForm({ categoryId }: { categoryId: string }) {
  const [state, action, pending] = useActionState<AddFolderState, FormData>(addFolderTemplate, undefined);

  return (
    <form action={action} className="mt-3 flex flex-wrap items-center gap-2">
      <input type="hidden" name="categoryId" value={categoryId} />
      <TextField name="name" placeholder="Folder name" compact className="flex-1" />
      <CheckboxField name="isMandatory" label="required" compact />
      <Button disabled={pending} type="submit" size="sm" icon="add">
        Add
      </Button>
      {state?.errors?.name && <p className="type-body-medium text-error">{state.errors.name[0]}</p>}
    </form>
  );
}
