"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { Menu, MenuItem } from "@/components/ui";
import { fileTypeIcon } from "@/lib/file-icon";
import { FilePreviewButton } from "@/components/file-preview/file-preview-dialog";
import { FileShareButton } from "@/components/file-share/file-share-dialog";
import { OpenInEditorButton } from "@/app/archives/[id]/open-in-editor-button";
import { RenameDialog } from "./rename-dialog";
import { renameFile } from "@/app/actions/explorer";
import type { ExplorerFile } from "./types";

const OPENABLE_KINDS = new Set(["word", "excel", "powerpoint"]);

// Large-icon grid tile — the "desktop file explorer" view. List/details
// views reuse the existing FileRow instead (version history, per-row
// metadata line already built there; duplicating that here isn't worth it).
export function FileTile({
  file,
  canDownload,
  canRename,
  docEditorProvider,
}: {
  file: ExplorerFile;
  canDownload: boolean;
  canRename: boolean;
  docEditorProvider: string | null;
}) {
  const [renaming, setRenaming] = useState(false);
  const canOpenInEditor = docEditorProvider !== null && OPENABLE_KINDS.has(file.fileType);

  return (
    <div className="group relative flex flex-col items-center gap-2 rounded-md border border-transparent p-3 text-center transition-colors hover:border-outline-variant hover:bg-on-surface-8">
      {(canRename || canDownload) && (
        <div className="absolute right-1.5 top-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Menu
            trigger={({ toggle }) => (
              <button
                type="button"
                onClick={toggle}
                aria-label={`Options for ${file.filename}`}
                className="flex h-7 w-7 items-center justify-center rounded-full text-on-surface-variant hover:bg-on-surface-8"
              >
                <Icon name="more_vert" size={18} />
              </button>
            )}
          >
            {canRename && (
              <MenuItem icon="edit" onClick={() => setRenaming(true)}>
                Rename
              </MenuItem>
            )}
            {canDownload && !file.isExternalLink && (
              <MenuItem icon="download" href={`/api/files/${file.id}/download`}>
                Download
              </MenuItem>
            )}
          </Menu>
        </div>
      )}

      {file.isExternalLink ? (
        <Icon name="link" size={48} className="text-on-surface-variant" />
      ) : file.fileType === "video" && file.thumbnailPath ? (
        // eslint-disable-next-line @next/next/no-img-element -- server-generated preview, not worth next/image's optimization pipeline
        <img src={`/api/files/${file.id}/thumbnail`} alt="" className="h-14 w-20 rounded-xs object-cover" />
      ) : (
        <Icon name={fileTypeIcon(file.fileType)} size={48} className="text-on-surface-variant" />
      )}

      <span className="line-clamp-2 w-full wrap-break-word type-label-large text-on-surface">{file.filename}</span>
      {file.version > 1 && <span className="type-label-small text-on-surface-variant">v{file.version}</span>}

      {file.isExternalLink && (
        <a
          href={file.externalUrl ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="type-label-small text-primary underline hover:text-primary-hover"
        >
          Open link
        </a>
      )}

      {canDownload && !file.isExternalLink && (
        <div className="flex items-center gap-0.5">
          <FilePreviewButton
            fileId={file.id}
            filename={file.filename}
            fileType={file.fileType}
            canOpenInEditor={canOpenInEditor}
            openInEditorSlot={canOpenInEditor && <OpenInEditorButton fileId={file.id} provider={docEditorProvider} mode="embed" />}
          />
          <FileShareButton fileId={file.id} filename={file.filename} />
        </div>
      )}

      {renaming && (
        <RenameDialog
          open={renaming}
          onClose={() => setRenaming(false)}
          title="Rename file"
          currentName={file.filename}
          hiddenFieldName="fileId"
          hiddenFieldValue={file.id}
          action={renameFile}
        />
      )}
    </div>
  );
}
