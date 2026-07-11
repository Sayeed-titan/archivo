"use client";

import { useState } from "react";
import { Dialog, Button, IconButton } from "@/components/ui";
import { Icon } from "@/components/icon";
import { fileTypeIcon } from "@/lib/file-icon";
import { OpenInEditorButton } from "@/app/archives/[id]/open-in-editor-button";

export function FilePreviewButton({
  fileId,
  filename,
  fileType,
  canOpenInEditor,
  docEditorProvider,
}: {
  fileId: string;
  filename: string;
  fileType: string;
  /** Whether an "Open in editor" action is available for this file (Office kinds + connector configured). */
  canOpenInEditor: boolean;
  /** Passed straight to OpenInEditorButton, which this dialog renders
   * itself (rather than receiving it pre-built as a prop) so it can hook
   * its own onEmbedStart/onEmbedEnd callbacks in — the caller, file-row.tsx,
   * is a Server Component and can't hand this dialog a function prop
   * directly (see CLAUDE.md's Combobox/Server-Component gotcha). */
  docEditorProvider?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [embedding, setEmbedding] = useState(false);
  const previewUrl = `/api/files/${fileId}/preview`;
  // Office files opened in Google's own editor need real screen space to be
  // usable — the small ~48rem preview dialog was fine for images/PDFs but
  // made the embedded Docs/Sheets/Slides UI unusably cramped. Only widen to
  // near-fullscreen once the embed is actually showing (via
  // OpenInEditorButton's onEmbedStart/onEmbedEnd below), so every other
  // preview kind keeps its normal compact size.
  const dialogClassName = embedding
    ? "w-[calc(100vw-2rem)] max-w-none h-[calc(100vh-2rem)] max-h-none flex flex-col"
    : "w-[min(calc(100vw-3rem),48rem)]";

  return (
    <>
      <IconButton icon="visibility" label={`Preview ${filename}`} variant="standard" onClick={() => setOpen(true)} />
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setEmbedding(false);
        }}
        headline={filename}
        className={dialogClassName}
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
          fileId={fileId}
          fileType={fileType}
          previewUrl={previewUrl}
          filename={filename}
          canOpenInEditor={canOpenInEditor}
          docEditorProvider={docEditorProvider}
          onEmbedStart={() => setEmbedding(true)}
          onEmbedEnd={() => setEmbedding(false)}
        />
      </Dialog>
    </>
  );
}

function PreviewBody({
  fileId,
  fileType,
  previewUrl,
  filename,
  canOpenInEditor,
  docEditorProvider,
  onEmbedStart,
  onEmbedEnd,
}: {
  fileId: string;
  fileType: string;
  previewUrl: string;
  filename: string;
  canOpenInEditor: boolean;
  docEditorProvider?: string | null;
  onEmbedStart: () => void;
  onEmbedEnd: () => void;
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

  // word / excel / powerpoint / zip / other: no in-browser embed capability
  // of our own — but Office kinds can hand off to the connector's real
  // editor (Google Docs/Sheets/Slides) when configured. OpenInEditorButton
  // owns whether that's showing yet: before the user clicks it, it's just a
  // link, so the placeholder message/icon still make sense alongside it;
  // once clicked, it replaces itself with the editor iframe, which needs
  // the full flex area rather than being squeezed inside the centered
  // placeholder box.
  if (canOpenInEditor && docEditorProvider) {
    return (
      <div className="flex h-full flex-1 flex-col">
        <OpenInEditorButton
          fileId={fileId}
          provider={docEditorProvider}
          mode="embed"
          onEmbedStart={onEmbedStart}
          onEmbedEnd={onEmbedEnd}
          placeholder={
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-md border border-outline-variant bg-surface-container-low px-6 py-10 text-center">
              <Icon name={fileTypeIcon(fileType)} size={40} className="text-on-surface-variant" />
              <p className="type-body-medium text-on-surface-variant">This file type can&apos;t be previewed inline.</p>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 rounded-md border border-outline-variant bg-surface-container-low px-6 py-10 text-center">
      <Icon name={fileTypeIcon(fileType)} size={40} className="text-on-surface-variant" />
      <p className="type-body-medium text-on-surface-variant">
        This file type can&apos;t be previewed inline — download it to view the contents.
      </p>
    </div>
  );
}
