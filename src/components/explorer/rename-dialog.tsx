"use client";

import { useActionState, useEffect, useState } from "react";
import { Dialog, Button, TextField, useSnackbar } from "@/components/ui";

// Shared rename dialog for both files and folders — the target id is
// carried as a hidden field so the same small component works for either
// server action without duplicating the dialog chrome.
export function RenameDialog({
  open,
  onClose,
  title,
  currentName,
  hiddenFieldName,
  hiddenFieldValue,
  action,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  currentName: string;
  hiddenFieldName: string;
  hiddenFieldValue: string;
  action: (state: { message?: string } | undefined, formData: FormData) => Promise<{ message?: string } | undefined>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  // Parent components only mount RenameDialog while `open` is true (see
  // folder-tile.tsx / file-tile.tsx's `{renaming && <RenameDialog .../>}`),
  // so a plain useState initializer already gets a fresh currentName on
  // every open — no effect needed to resync it.
  const [name, setName] = useState(currentName);
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    if (state && !state.message) {
      showSnackbar("Renamed.");
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onClose intentionally excluded: re-running this on every render would immediately re-close a freshly-reopened dialog
  }, [state, showSnackbar]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      headline={title}
      actions={
        <>
          <Button variant="text" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="rename-form" loading={pending} loadingText="Renaming…">
            Rename
          </Button>
        </>
      }
    >
      <form id="rename-form" action={formAction} className="space-y-2">
        <input type="hidden" name={hiddenFieldName} value={hiddenFieldValue} />
        <TextField
          name="name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={state?.message}
        />
      </form>
    </Dialog>
  );
}
