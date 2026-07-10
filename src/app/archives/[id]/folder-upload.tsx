"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFileUpload, type UploadItem } from "@/components/upload/use-file-upload";
import { UploadProgressList } from "@/components/upload/upload-progress-list";
import { submitExternalFileLink } from "@/app/actions/archives";
import type { FolderRules } from "@/lib/folder-rules";

export function FolderUpload({ archiveId, folderId, rules }: { archiveId: string; folderId: string; rules?: FolderRules }) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { items, uploadFiles, dismiss } = useFileUpload({ onUploaded: () => router.refresh() });
  const [alternateOptionLabel, setAlternateOptionLabel] = useState("");

  const target = { isInbox: false as const, archiveId, folderId };
  const altOptions = rules?.alternateOptions?.enabled ? rules.alternateOptions.options : [];

  async function handleExternalLink(item: UploadItem, url: string) {
    const result = await submitExternalFileLink(archiveId, folderId, url, alternateOptionLabel || undefined);
    if (!result?.message) {
      dismiss(item.id);
      router.refresh();
    }
  }

  return (
    <div
      tabIndex={0}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) uploadFiles(e.dataTransfer.files, target, alternateOptionLabel || undefined);
      }}
      onPaste={(e) => {
        // Files copied in the OS file explorer (Windows Explorer, Finder)
        // land in e.clipboardData.files on Ctrl/Cmd+V, same as a real
        // <input type="file"> selection — not e.clipboardData.items, which
        // is for pasted text/image data, not copied filesystem files.
        if (e.clipboardData.files.length > 0) {
          e.preventDefault();
          uploadFiles(e.clipboardData.files, target, alternateOptionLabel || undefined);
        }
      }}
      className={`rounded-sm border border-dashed px-3 py-2 type-body-small transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${
        isDragging ? "border-primary bg-primary-8" : "border-outline"
      }`}
    >
      {altOptions.length > 0 && (
        <select
          value={alternateOptionLabel}
          onChange={(e) => setAlternateOptionLabel(e.target.value)}
          className="mb-1.5 rounded-xs border border-outline bg-surface px-2 py-1 type-body-small text-on-surface"
        >
          <option value="">Which document is this?</option>
          {altOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            uploadFiles(e.target.files, target, alternateOptionLabel || undefined);
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
      <span className="text-on-surface-variant/70"> — or click here and press Ctrl+V (⌘V on Mac) to paste files copied from your file explorer</span>
      <UploadProgressList items={items} onDismiss={dismiss} onSubmitExternalLink={handleExternalLink} />
    </div>
  );
}
