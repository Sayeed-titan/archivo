"use client";

import { useActionState } from "react";
import { uploadToInbox, type UploadFilesState } from "@/app/actions/files";
import { Button } from "@/components/ui";
import { Icon } from "@/components/icon";

export function InboxUploadForm() {
  const [state, action, pending] = useActionState<UploadFilesState, FormData>(uploadToInbox, undefined);

  return (
    <form
      action={action}
      className="mt-6 rounded-lg border-2 border-dashed border-outline bg-surface-container-low p-6 text-center"
    >
      <Icon name="cloud_upload" size={32} className="text-on-surface-variant" />
      <p className="mt-1 type-body-medium text-on-surface-variant">Select files to add to the inbox</p>
      <input type="file" name="files" multiple className="mx-auto mt-3 block type-body-medium text-on-surface" />
      {state?.message && (
        <p className="mt-2 inline-flex items-center gap-2 rounded-sm bg-error-container px-3 py-1.5 type-body-medium text-on-error-container">
          <Icon name="error" size={16} />
          {state.message}
        </p>
      )}
      <div className="mt-4">
        <Button type="submit" loading={pending} loadingText="Uploading…" icon="upload">
          Upload to inbox
        </Button>
      </div>
    </form>
  );
}
