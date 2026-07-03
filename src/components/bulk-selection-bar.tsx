"use client";

import { useState } from "react";
import { useTreeSelection } from "@/components/tree-view-selection";
import { Button, useSnackbar } from "@/components/ui";
import { Icon } from "@/components/icon";

// Floating action bar shown whenever the tree selection is non-empty.
// Downloads the selection as a single zip via the bulk-download route —
// server-side re-validates every file id against the current user's org
// scoping rather than trusting this client-side list blindly.
export function BulkSelectionBar() {
  const { selectedFileIds, clear } = useTreeSelection();
  const { showSnackbar } = useSnackbar();
  const [downloading, setDownloading] = useState(false);

  if (selectedFileIds.size === 0) return null;

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch("/api/files/bulk-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds: [...selectedFileIds] }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        showSnackbar(body.message ?? "Bulk download failed.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "archive-files.zip";
      a.click();
      URL.revokeObjectURL(url);
      clear();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="fixed inset-x-4 bottom-4 z-40 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-3 rounded-full bg-inverse-surface py-2 pl-4 pr-2 text-inverse-on-surface shadow-elevation-3">
      <Icon name="check_circle" size={18} />
      <span className="type-body-medium">
        {selectedFileIds.size} {selectedFileIds.size === 1 ? "file" : "files"} selected
      </span>
      <Button variant="text" size="sm" onClick={clear} className="text-inverse-on-surface hover:bg-inverse-on-surface/10">
        Clear
      </Button>
      <Button
        variant="filled"
        size="sm"
        icon="folder_zip"
        loading={downloading}
        loadingText="Zipping…"
        onClick={handleDownload}
      >
        Download .zip
      </Button>
    </div>
  );
}
