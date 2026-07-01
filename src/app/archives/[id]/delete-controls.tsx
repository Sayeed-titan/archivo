"use client";

import { useState } from "react";
import { softDeleteArchive, hardDeleteArchive } from "@/app/actions/archives";

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
    <div className="mt-8 space-y-3 rounded-md border border-red-200 bg-red-50 p-4">
      <h2 className="text-sm font-medium text-red-800">Danger zone</h2>

      {canDelete && (
        <button
          onClick={() => softDeleteArchive(archiveId)}
          className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm text-red-700"
        >
          Delete (recoverable)
        </button>
      )}

      {canHardDelete && !confirmingHardDelete && (
        <button
          onClick={() => setConfirmingHardDelete(true)}
          className="ml-2 rounded-md bg-red-700 px-3 py-1.5 text-sm text-white"
        >
          Permanently delete
        </button>
      )}

      {canHardDelete && confirmingHardDelete && (
        <form action={hardDeleteArchive} className="mt-2 space-y-2">
          <input type="hidden" name="archiveId" value={archiveId} />
          <label className="block text-xs font-medium text-red-800">
            Reason for permanent deletion (required, logged in the audit trail)
          </label>
          <input
            name="reason"
            required
            className="w-full rounded-md border border-red-300 px-2 py-1 text-sm"
            placeholder="e.g. duplicate created by mistake"
          />
          <div className="flex gap-2">
            <button type="submit" className="rounded-md bg-red-700 px-3 py-1.5 text-sm text-white">
              Confirm permanent delete
            </button>
            <button
              type="button"
              onClick={() => setConfirmingHardDelete(false)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
