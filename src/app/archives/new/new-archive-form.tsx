"use client";

import { useActionState } from "react";
import { createArchive, type CreateArchiveState } from "@/app/actions/archives";
import { TextField, SelectField, Button } from "@/components/ui";
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

      <SelectField
        id="categoryId"
        name="categoryId"
        label={
          <>
            Category <span className="text-slate-400">(optional — sets up folders automatically)</span>
          </>
        }
      >
        <option value="">No category yet</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </SelectField>

      {state?.message && <p className="text-sm text-red-600">{state.message}</p>}

      <Button type="submit" loading={pending} loadingText="Creating..." className="w-full">
        Create archive
      </Button>
    </form>
  );
}
