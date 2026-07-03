"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useFileUpload } from "@/components/upload/use-file-upload";
import { UploadProgressList } from "@/components/upload/upload-progress-list";
import { Icon } from "@/components/icon";

export function InboxUploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { items, uploadFiles, dismiss } = useFileUpload({ onUploaded: () => router.refresh() });

  return (
    <div className="mt-6 rounded-lg border-2 border-dashed border-outline bg-surface-container-low p-6 text-center">
      <Icon name="cloud_upload" size={32} className="text-on-surface-variant" />
      <p className="mt-1 type-body-medium text-on-surface-variant">Select files to add to the inbox</p>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="mx-auto mt-3 block type-body-medium text-on-surface"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            uploadFiles(e.target.files, { isInbox: true });
            e.target.value = "";
          }
        }}
      />
      <UploadProgressList items={items} onDismiss={dismiss} />
    </div>
  );
}
