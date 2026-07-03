"use client";

import { useState } from "react";
import { Dialog, Button, IconButton } from "@/components/ui";
import { Icon } from "@/components/icon";
import { fileTypeIcon } from "@/lib/file-icon";

const OPENABLE_KINDS = new Set(["word", "excel", "powerpoint"]);

export function FilePreviewButton({
  fileId,
  filename,
  fileType,
  canOpenInEditor,
  openInEditorSlot,
}: {
  fileId: string;
  filename: string;
  fileType: string;
  /** Whether an "Open in editor" action is available for this file (Office kinds + connector configured). */
  canOpenInEditor: boolean;
  /** Rendered inside the dialog for office-kind files when canOpenInEditor is true. */
  openInEditorSlot?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const previewUrl = `/api/files/${fileId}/preview`;

  return (
    <>
      <IconButton icon="visibility" label={`Preview ${filename}`} variant="standard" onClick={() => setOpen(true)} />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        headline={filename}
        className="w-[min(calc(100vw-3rem),48rem)]"
        actions={
          <>
            <Button variant="text" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button href={`/api/files/${fileId}/download`} icon="download">
              Download
            </Button>
          </>
        }
      >
        <PreviewBody
          fileType={fileType}
          previewUrl={previewUrl}
          filename={filename}
          canOpenInEditor={canOpenInEditor}
          openInEditorSlot={openInEditorSlot}
        />
      </Dialog>
    </>
  );
}

function PreviewBody({
  fileType,
  previewUrl,
  filename,
  canOpenInEditor,
  openInEditorSlot,
}: {
  fileType: string;
  previewUrl: string;
  filename: string;
  canOpenInEditor: boolean;
  openInEditorSlot?: React.ReactNode;
}) {
  if (fileType === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary uploaded file, not a next/image-optimizable static asset
      <img src={previewUrl} alt={filename} className="max-h-[70vh] w-full rounded-sm object-contain" />
    );
  }

  if (fileType === "video") {
    return <video controls src={previewUrl} className="max-h-[70vh] w-full rounded-sm" />;
  }

  if (fileType === "audio") {
    return <audio controls src={previewUrl} className="w-full" />;
  }

  if (fileType === "pdf") {
    return (
      <div>
        <iframe src={previewUrl} title={filename} className="h-[70vh] w-full rounded-sm border border-outline-variant" />
        <p className="mt-2 type-body-small text-on-surface-variant">
          If the PDF doesn&apos;t display, your browser may not support inline PDF viewing —{" "}
          <a href={previewUrl} className="text-primary underline">
            open it directly
          </a>
          .
        </p>
      </div>
    );
  }

  // word / excel / powerpoint / zip / other: no in-browser embed capability.
  // Office kinds get "Open in editor" when the org's connector supports it;
  // everything else is download-only.
  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-outline-variant bg-surface-container-low px-6 py-10 text-center">
      <Icon name={fileTypeIcon(fileType)} size={40} className="text-on-surface-variant" />
      <p className="type-body-medium text-on-surface-variant">
        {OPENABLE_KINDS.has(fileType)
          ? "This file type can't be previewed inline."
          : "This file type can't be previewed inline — download it to view the contents."}
      </p>
      {canOpenInEditor && openInEditorSlot}
    </div>
  );
}
