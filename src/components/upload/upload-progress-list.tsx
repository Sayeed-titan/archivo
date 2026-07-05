"use client";

import { useState } from "react";
import { LinearProgress, TextField, Button } from "@/components/ui";
import { Icon } from "@/components/icon";
import { fileTypeIcon } from "@/lib/file-icon";
import { classifyFileType } from "@/lib/file-type";
import type { UploadItem } from "./use-file-upload";

function formatEta(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return "";
  if (seconds < 1) return "almost done";
  if (seconds < 60) return `${Math.ceil(seconds)}s left`;
  return `${Math.ceil(seconds / 60)}m left`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ExternalLinkPrompt({ onSubmit }: { onSubmit: (url: string) => void }) {
  const [url, setUrl] = useState("");
  return (
    <div className="mt-2 flex items-center gap-2">
      <TextField
        placeholder="Paste an external link (Google Drive, etc.)"
        compact
        className="flex-1"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <Button
        variant="tonal"
        size="sm"
        type="button"
        disabled={!url.trim()}
        onClick={() => onSubmit(url.trim())}
      >
        Use link
      </Button>
    </div>
  );
}

export function UploadProgressList({
  items,
  onDismiss,
  onSubmitExternalLink,
}: {
  items: UploadItem[];
  onDismiss: (id: string) => void;
  onSubmitExternalLink?: (item: UploadItem, url: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-sm border border-outline-variant bg-surface px-3 py-2">
          <div className="flex items-center gap-2">
            <Icon
              name={item.status === "done" ? "check_circle" : item.status === "error" ? "error" : fileTypeIcon(classifyFileType(item.file.name))}
              size={18}
              className={item.status === "done" ? "text-success" : item.status === "error" ? "text-error" : "text-on-surface-variant"}
            />
            <span className="min-w-0 flex-1 truncate type-body-medium text-on-surface">{item.file.name}</span>
            <span className="shrink-0 type-body-small text-on-surface-variant">{formatSize(item.file.size)}</span>
            {item.status !== "uploading" && (
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => onDismiss(item.id)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-on-surface-variant hover:bg-on-surface-8"
              >
                <Icon name="close" size={16} />
              </button>
            )}
          </div>
          {item.status === "uploading" && (
            <div className="mt-1.5 flex items-center gap-2">
              <LinearProgress value={item.progress} dangerAt={2} className="flex-1" />
              <span className="w-20 shrink-0 text-right type-body-small text-on-surface-variant">
                {Math.round(item.progress * 100)}% · {formatEta(item.etaSeconds)}
              </span>
            </div>
          )}
          {item.status === "error" && <p className="mt-1 type-body-small text-error">{item.error}</p>}
          {item.status === "error" && item.offerExternalLink && onSubmitExternalLink && (
            <ExternalLinkPrompt onSubmit={(url) => onSubmitExternalLink(item, url)} />
          )}
        </div>
      ))}
    </div>
  );
}
