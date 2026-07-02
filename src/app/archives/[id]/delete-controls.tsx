"use client";

import { useState, useTransition } from "react";
import { softDeleteArchive, hardDeleteArchive } from "@/app/actions/archives";
import { Button, TextField, Card, Dialog } from "@/components/ui";

export function DeleteControls({
  archiveId,
  canDelete,
  canHardDelete,
}: {
  archiveId: string;
  canDelete: boolean;
  canHardDelete: boolean;
}) {
  const [confirmingSoftDelete, setConfirmingSoftDelete] = useState(false);
  const [confirmingHardDelete, setConfirmingHardDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!canDelete && !canHardDelete) return null;

  return (
    <Card tone="danger" className="mt-8">
      <h2 className="type-title-small">Danger zone</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {canDelete && (
          <Button onClick={() => setConfirmingSoftDelete(true)} variant="outlined-error" icon="delete">
            Delete (recoverable)
          </Button>
        )}
        {canHardDelete && !confirmingHardDelete && (
          <Button onClick={() => setConfirmingHardDelete(true)} variant="filled-error" icon="delete_forever">
            Permanently delete
          </Button>
        )}
      </div>

      <Dialog
        open={confirmingSoftDelete}
        onClose={() => setConfirmingSoftDelete(false)}
        icon="delete"
        headline="Delete this archive?"
        actions={
          <>
            <Button variant="text" type="button" onClick={() => setConfirmingSoftDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="text-error"
              type="button"
              loading={pending}
              loadingText="Deleting…"
              onClick={() => startTransition(() => softDeleteArchive(archiveId))}
            >
              Delete archive
            </Button>
          </>
        }
      >
        The archive is hidden from lists and search, but nothing is destroyed — an administrator can recover it.
      </Dialog>

      {canHardDelete && confirmingHardDelete && (
        <form action={hardDeleteArchive} className="mt-4 space-y-3">
          <input type="hidden" name="archiveId" value={archiveId} />
          <TextField
            name="reason"
            required
            compact
            label="Reason for permanent deletion (required, logged in the audit trail)"
            placeholder="e.g. duplicate created by mistake"
            className="w-full"
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="filled-error" icon="delete_forever">
              Confirm permanent delete
            </Button>
            <Button type="button" onClick={() => setConfirmingHardDelete(false)} variant="outlined">
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
