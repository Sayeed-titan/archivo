import type { File as PrismaFile, User } from "@/generated/prisma/client";
import { OpenInEditorButton } from "./open-in-editor-button";
import { Icon } from "@/components/icon";
import { fileTypeIcon } from "@/lib/file-icon";
import { FilePreviewButton } from "@/components/file-preview/file-preview-dialog";
import { FileShareButton } from "@/components/file-share/file-share-dialog";
import { TreeFileCheckbox } from "@/components/tree-view";

export type FileWithUploader = PrismaFile & { uploadedBy: User };

const OPENABLE_KINDS = new Set(["word", "excel", "powerpoint"]);

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// Deliberately not a Server Component (and this module imports no
// server-only code) so it can be rendered both from server pages and from
// the client-side file-explorer tree — version history is pre-fetched by
// the caller (see getVersionHistory in file-version-history.ts) rather
// than fetched inside this component.
export function FileRow({
  file,
  history,
  canDownload,
  docEditorProvider,
}: {
  file: FileWithUploader;
  history: FileWithUploader[];
  canDownload: boolean;
  docEditorProvider: string | null;
}) {
  const canOpenInEditor = docEditorProvider !== null && OPENABLE_KINDS.has(file.fileType);

  return (
    <li className="px-4 py-2">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="flex min-w-0 items-center gap-2">
          {canDownload && !file.isExternalLink && <TreeFileCheckbox fileId={file.id} filename={file.filename} />}
          {file.isExternalLink ? (
            <Icon name="link" size={18} className="shrink-0 text-on-surface-variant" />
          ) : file.fileType === "video" && file.thumbnailPath ? (
            // eslint-disable-next-line @next/next/no-img-element -- server-generated preview, not worth next/image's optimization pipeline
            <img
              src={`/api/files/${file.id}/thumbnail`}
              alt=""
              className="h-10 w-16 shrink-0 rounded-xs object-cover"
            />
          ) : (
            <Icon name={fileTypeIcon(file.fileType)} size={18} className="shrink-0 text-on-surface-variant" />
          )}
          <span className="break-all type-body-medium text-on-surface">{file.filename}</span>
          {file.alternateOptionLabel && (
            <span className="type-label-small text-on-surface-variant">({file.alternateOptionLabel})</span>
          )}
          {file.version > 1 && <span className="ml-2 type-label-small text-on-surface-variant">v{file.version}</span>}
          {file.fileType === "video" && file.durationSeconds !== null && (
            <span className="type-label-small text-on-surface-variant">{formatDuration(file.durationSeconds)}</span>
          )}
        </span>
        <span className="flex flex-wrap items-center gap-3 type-body-small text-on-surface-variant">
          {file.isExternalLink ? "external link" : `${file.fileType} · ${(file.sizeBytes / 1024).toFixed(0)} KB`} ·{" "}
          {file.uploadedBy.name} · {file.uploadedAt.toLocaleDateString()}
          {canOpenInEditor && <OpenInEditorButton fileId={file.id} provider={docEditorProvider} />}
          {file.isExternalLink ? (
            <a href={file.externalUrl ?? "#"} target="_blank" rel="noreferrer" className="text-primary underline hover:text-primary-hover">
              open link
            </a>
          ) : (
            canDownload && (
              <a href={`/api/files/${file.id}/download`} className="text-primary underline hover:text-primary-hover">
                download
              </a>
            )
          )}
        </span>
        {canDownload && !file.isExternalLink && (
          <span className="flex items-center gap-0.5">
            <FilePreviewButton
              fileId={file.id}
              filename={file.filename}
              fileType={file.fileType}
              canOpenInEditor={canOpenInEditor}
              docEditorProvider={docEditorProvider}
            />
            <FileShareButton fileId={file.id} filename={file.filename} />
          </span>
        )}
      </div>

      {history.length > 1 && (
        <details className="mt-1">
          <summary className="cursor-pointer type-body-small text-on-surface-variant hover:text-on-surface">
            {history.length} versions — view history
          </summary>
          <ul className="mt-1 space-y-1 border-l border-outline-variant pl-3">
            {history.map((v) => (
              <li key={v.id} className="flex items-center justify-between type-body-small text-on-surface-variant">
                <span>
                  v{v.version} · {v.uploadedBy.name} · {v.uploadedAt.toLocaleString()}
                </span>
                {canDownload && (
                  <a href={`/api/files/${v.id}/download`} className="text-primary underline">
                    download
                  </a>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}
