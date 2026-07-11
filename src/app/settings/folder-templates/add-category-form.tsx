"use client";

import { useActionState } from "react";
import { createCategory, type CategoryFormState } from "@/app/actions/categories";
import { TextField, Button } from "@/components/ui";

export function AddCategoryForm() {
  const [state, action, pending] = useActionState<CategoryFormState, FormData>(createCategory, undefined);

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <TextField name="name" placeholder="Category name" compact className="flex-1" required />
      <Button disabled={pending} type="submit" size="sm" icon="add">
        Add category
      </Button>
      {state?.message && <p className="w-full type-body-medium text-error">{state.message}</p>}
    </form>
  );
}
