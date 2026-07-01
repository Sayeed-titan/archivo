"use client";

import { useActionState, useRef, useState } from "react";
import { uploadToFolder, type UploadFilesState } from "@/app/actions/files";

export function FolderUpload({ archiveId, folderId }: { archiveId: string; folderId: string }) {
  const [state, action, pending] = useActionState<UploadFilesState, FormData>(uploadToFolder, undefined);
  const [isDragging, setIsDragging] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function submitFiles(fileList: FileList) {
    if (!formRef.current || !inputRef.current) return;
    const dataTransfer = new DataTransfer();
    Array.from(fileList).forEach((f) => dataTransfer.items.add(f));
    inputRef.current.files = dataTransfer.files;
    formRef.current.requestSubmit();
  }

  return (
    <form
      ref={formRef}
      action={action}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) submitFiles(e.dataTransfer.files);
      }}
      className={`rounded-md border border-dashed px-3 py-2 text-xs ${
        isDragging ? "border-slate-500 bg-slate-50" : "border-slate-300"
      }`}
    >
      <input type="hidden" name="archiveId" value={archiveId} />
      <input type="hidden" name="folderId" value={folderId} />
      <input
        ref={inputRef}
        type="file"
        name="files"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && e.target.files.length > 0 && formRef.current?.requestSubmit()}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        className="text-slate-500 underline disabled:opacity-50"
      >
        {pending ? "Uploading..." : "Drag files here or click to upload"}
      </button>
      {state?.message && <p className="mt-1 text-red-600">{state.message}</p>}
    </form>
  );
}
