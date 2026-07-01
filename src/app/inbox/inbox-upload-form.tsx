"use client";

import { useActionState } from "react";
import { uploadToInbox, type UploadFilesState } from "@/app/actions/files";

export function InboxUploadForm() {
  const [state, action, pending] = useActionState<UploadFilesState, FormData>(uploadToInbox, undefined);

  return (
    <form action={action} className="mt-6 rounded-md border border-dashed border-slate-300 p-6 text-center">
      <input type="file" name="files" multiple className="mx-auto block text-sm" />
      {state?.message && <p className="mt-2 text-sm text-red-600">{state.message}</p>}
      <button
        disabled={pending}
        type="submit"
        className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Uploading..." : "Upload to inbox"}
      </button>
    </form>
  );
}
