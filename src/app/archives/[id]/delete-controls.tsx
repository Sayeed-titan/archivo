"use client";

import { useState } from "react";
import { softDeleteArchive, hardDeleteArchive } from "@/app/actions/archives";
import { Button, TextField, Card } from "@/components/ui";

export function DeleteControls({
  archiveId,
  canDelete,
  canHardDelete,
}: {
  archiveId: string;
  canDelete: boolean;
  canHardDelete: boolean;
}) {
  const [confirmingHardDelete, setConfirmingHardDelete] = useState(false);

  if (!canDelete && !canHardDelete) return null;

  return (
    <Card tone="danger" className="mt-8 space-y-3">
      <h2 className="text-sm font-medium text-red-800">Danger zone</h2>

      {canDelete && (
        <Button onClick={() => softDeleteArchive(archiveId)} variant="danger-outline">
          Delete (recoverable)
        </Button>
      )}

      {canHardDelete && !confirmingHardDelete && (
        <Button onClick={() => setConfirmingHardDelete(true)} variant="danger-solid" className="ml-2">
          Permanently delete
        </Button>
      )}

      {canHardDelete && confirmingHardDelete && (
        <form action={hardDeleteArchive} className="mt-2 space-y-2">
          <input type="hidden" name="archiveId" value={archiveId} />
          <TextField
            name="reason"
            required
            compact
            label="Reason for permanent deletion (required, logged in the audit trail)"
            placeholder="e.g. duplicate created by mistake"
          />
          <div className="flex gap-2">
            <Button type="submit" variant="danger-solid">
              Confirm permanent delete
            </Button>
            <Button type="button" onClick={() => setConfirmingHardDelete(false)} variant="secondary">
              Cancel
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
