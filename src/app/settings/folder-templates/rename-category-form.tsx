"use client";

import { useActionState, useEffect, useRef } from "react";
import { renameCategory, type CategoryFormState } from "@/app/actions/categories";
import { Button } from "@/components/ui";

export function RenameCategoryForm({
  categoryId,
  name,
  onDone,
}: {
  categoryId: string;
  name: string;
  onDone: () => void;
}) {
  const action = renameCategory.bind(null, categoryId);
  const [state, formAction, pending] = useActionState<CategoryFormState, FormData>(action, undefined);
  const lastHandledMessage = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (state === undefined) return;
    if (!state.message && lastHandledMessage.current !== undefined) {
      onDone();
    }
    lastHandledMessage.current = state.message;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex min-w-0 flex-1 flex-col gap-1" onClick={(e) => e.stopPropagation()}>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <input
          name="name"
          defaultValue={name}
          autoFocus
          required
          className="min-w-0 flex-1 rounded-xs border border-outline bg-surface px-2 py-1 type-body-medium text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          onKeyDown={(e) => {
            if (e.key === "Escape") onDone();
          }}
        />
        <Button type="submit" size="inline" variant="text" icon="save" disabled={pending}>
          Save
        </Button>
        <Button type="button" size="inline" variant="text" icon="close" onClick={onDone}>
          Cancel
        </Button>
      </div>
      {state?.message && <p className="type-body-small text-error">{state.message}</p>}
    </form>
  );
}
