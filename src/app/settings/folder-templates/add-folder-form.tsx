"use client";

import { useActionState } from "react";
import { addFolderTemplate, type AddFolderState } from "@/app/actions/folder-templates";

export function AddFolderForm({ categoryId }: { categoryId: string }) {
  const [state, action, pending] = useActionState<AddFolderState, FormData>(addFolderTemplate, undefined);

  return (
    <form action={action} className="mt-3 flex items-center gap-2">
      <input type="hidden" name="categoryId" value={categoryId} />
      <input
        name="name"
        placeholder="Folder name"
        className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
      />
      <label className="flex items-center gap-1 text-xs text-slate-500">
        <input type="checkbox" name="isMandatory" />
        required
      </label>
      <button
        disabled={pending}
        type="submit"
        className="rounded-md bg-slate-900 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
      >
        Add
      </button>
      {state?.errors?.name && <p className="text-sm text-red-600">{state.errors.name[0]}</p>}
    </form>
  );
}
