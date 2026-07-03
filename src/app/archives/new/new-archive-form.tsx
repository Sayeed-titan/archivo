"use client";

import { useActionState } from "react";
import { createArchive, type CreateArchiveState } from "@/app/actions/archives";
import { TextField, Combobox, Button } from "@/components/ui";
import type { Category } from "@/generated/prisma/client";

export function NewArchiveForm({ categories }: { categories: Category[] }) {
  const [state, action, pending] = useActionState<CreateArchiveState, FormData>(createArchive, undefined);

  return (
    <form action={action} className="mt-6 space-y-4">
      <TextField
        id="name"
        name="name"
        autoFocus
        label="Archive name"
        placeholder="e.g. Annual General Meeting 2027"
        error={state?.errors?.name?.[0]}
      />

      <Combobox
        name="categoryId"
        label={
          <>
            Category <span className="text-on-surface-variant/70">(optional — sets up folders automatically)</span>
          </>
        }
        placeholder="No category yet"
        options={categories.map((c) => ({ value: c.id, label: c.name }))}
      />

      {state?.message && <p className="type-body-medium text-error">{state.message}</p>}

      <Button type="submit" loading={pending} loadingText="Creating…" icon="create_new_folder" className="w-full">
        Create archive
      </Button>
    </form>
  );
}
