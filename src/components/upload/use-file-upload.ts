"use client";

import { useCallback, useRef, useState } from "react";

// Per-file upload tracking via XMLHttpRequest (not fetch — fetch has no
// reliable cross-browser upload-progress event; xhr.upload.onprogress
// gives real bytes-sent/bytes-total for both the progress bar and a
// time-remaining estimate). One XHR per file, not one combined request
// for a multi-file batch, so each file gets an independent progress bar
// and its own "completed" checkmark rather than one aggregate bar.

export type UploadItem = {
  id: string;
  file: File;
  progress: number; // 0..1
  status: "uploading" | "done" | "error";
  error?: string;
  etaSeconds: number | null;
};

type UploadTarget = { isInbox: true } | { isInbox: false; archiveId: string; folderId: string };

export function useFileUpload({ onUploaded }: { onUploaded?: () => void } = {}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const startTimes = useRef<Map<string, number>>(new Map());

  const patchItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const uploadOne = useCallback(
    (file: File, target: UploadTarget) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      startTimes.current.set(id, Date.now());
      setItems((prev) => [...prev, { id, file, progress: 0, status: "uploading", etaSeconds: null }]);

      const formData = new FormData();
      formData.set("file", file);
      if (target.isInbox) {
        formData.set("isInbox", "true");
      } else {
        formData.set("archiveId", target.archiveId);
        formData.set("folderId", target.folderId);
      }

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/upload");

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable) return;
        const progress = event.loaded / event.total;
        const elapsedSeconds = (Date.now() - (startTimes.current.get(id) ?? Date.now())) / 1000;
        const bytesPerSecond = event.loaded / Math.max(elapsedSeconds, 0.001);
        const remainingBytes = event.total - event.loaded;
        const etaSeconds = bytesPerSecond > 0 ? remainingBytes / bytesPerSecond : null;
        patchItem(id, { progress, etaSeconds });
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          patchItem(id, { progress: 1, status: "done", etaSeconds: 0 });
          onUploaded?.();
        } else {
          let message = "Upload failed.";
          try {
            message = JSON.parse(xhr.responseText).message ?? message;
          } catch {
            // non-JSON error body — keep the generic message
          }
          patchItem(id, { status: "error", error: message });
        }
      };

      xhr.onerror = () => patchItem(id, { status: "error", error: "Network error during upload." });

      xhr.send(formData);
    },
    [patchItem, onUploaded]
  );

  const uploadFiles = useCallback(
    (files: FileList | File[], target: UploadTarget) => {
      Array.from(files)
        .filter((f) => f.size > 0)
        .forEach((f) => uploadOne(f, target));
    },
    [uploadOne]
  );

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    startTimes.current.delete(id);
  }, []);

  const clearCompleted = useCallback(() => {
    setItems((prev) => prev.filter((it) => it.status === "uploading"));
  }, []);

  return { items, uploadFiles, dismiss, clearCompleted };
}
