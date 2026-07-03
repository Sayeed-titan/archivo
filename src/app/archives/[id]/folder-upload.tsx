"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFileUpload } from "@/components/upload/use-file-upload";
import { UploadProgressList } from "@/components/upload/upload-progress-list";

export function FolderUpload({ archiveId, folderId }: { archiveId: string; folderId: string }) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { items, uploadFiles, dismiss } = useFileUpload({ onUploaded: () => router.refresh() });

  const target = { isInbox: false as const, archiveId, folderId };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files, target);
      }}
      className={`rounded-sm border border-dashed px-3 py-2 type-body-small transition-colors ${
        isDragging ? "border-primary bg-primary-8" : "border-outline"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            uploadFiles(e.target.files, target);
            e.target.value = "";
          }
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="text-on-surface-variant underline hover:text-primary"
      >
        Drag files here or click to upload
      </button>
      <UploadProgressList items={items} onDismiss={dismiss} />
    </div>
  );
}
