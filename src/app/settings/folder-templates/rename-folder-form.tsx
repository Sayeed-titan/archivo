"use client";

import { useActionState } from "react";
import { renameFolderTemplate, type RenameFolderState } from "@/app/actions/folder-templates";
import { Button } from "@/components/ui";

export function RenameFolderForm({
  folderTemplateId,
  name,
  isMandatory,
  onDone,
}: {
  folderTemplateId: string;
  name: string;
  isMandatory: boolean;
  onDone: () => void;
}) {
  const [state, action, pending] = useActionState<RenameFolderState, FormData>(renameFolderTemplate, undefined);

  return (
    <form
      action={async (formData) => {
        await action(formData);
        onDone();
      }}
      className="flex min-w-0 flex-1 items-center gap-2"
    >
      <input type="hidden" name="folderTemplateId" value={folderTemplateId} />
      <input type="hidden" name="isMandatory" value={isMandatory ? "on" : ""} />
      <input
        name="name"
        defaultValue={name}
        autoFocus
        className="min-w-0 flex-1 rounded-xs border border-outline bg-surface px-2 py-1 type-body-medium text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        onKeyDown={(e) => {
          if (e.key === "Escape") onDone();
        }}
      />
      <Button type="submit" size="inline" variant="text" disabled={pending}>
        save
      </Button>
      <Button type="button" size="inline" variant="text" onClick={onDone}>
        cancel
      </Button>
      {state?.message && <p className="type-body-small text-error">{state.message}</p>}
    </form>
  );
}
