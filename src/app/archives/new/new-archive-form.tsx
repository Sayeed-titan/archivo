"use client";

import { useActionState } from "react";
import { createArchive, type CreateArchiveState } from "@/app/actions/archives";
import type { Category } from "@/generated/prisma/client";

export function NewArchiveForm({ categories }: { categories: Category[] }) {
  const [state, action, pending] = useActionState<CreateArchiveState, FormData>(createArchive, undefined);

  return (
    <form action={action} className="mt-6 space-y-4">
      <div className="space-y-1">
        <label htmlFor="name" className="text-sm font-medium text-slate-700">
          Archive name
        </label>
        <input
          id="name"
          name="name"
          autoFocus
          placeholder="e.g. Annual General Meeting 2027"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {state?.errors?.name && <p className="text-sm text-red-600">{state.errors.name[0]}</p>}
      </div>

      <div className="space-y-1">
        <label htmlFor="categoryId" className="text-sm font-medium text-slate-700">
          Category <span className="text-slate-400">(optional — sets up folders automatically)</span>
        </label>
        <select id="categoryId" name="categoryId" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm">
          <option value="">No category yet</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {state?.message && <p className="text-sm text-red-600">{state.message}</p>}

      <button
        disabled={pending}
        type="submit"
        className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Creating..." : "Create archive"}
      </button>
    </form>
  );
}
