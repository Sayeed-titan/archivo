"use client";

import { useActionState } from "react";
import { uploadToInbox, type UploadFilesState } from "@/app/actions/files";
import { Button } from "@/components/ui";

export function InboxUploadForm() {
  const [state, action, pending] = useActionState<UploadFilesState, FormData>(uploadToInbox, undefined);

  return (
    <form action={action} className="mt-6 rounded-md border border-dashed border-slate-300 p-6 text-center">
      <input type="file" name="files" multiple className="mx-auto block text-sm" />
      {state?.message && <p className="mt-2 text-sm text-red-600">{state.message}</p>}
      <Button type="submit" loading={pending} loadingText="Uploading..." size="lg" className="mt-4">
        Upload to inbox
      </Button>
    </form>
  );
}
