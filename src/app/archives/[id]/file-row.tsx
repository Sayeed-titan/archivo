import { prisma } from "@/lib/prisma";
import type { File as PrismaFile, User } from "@/generated/prisma/client";
import { OpenInEditorButton } from "./open-in-editor-button";

type FileWithUploader = PrismaFile & { uploadedBy: User };

const OPENABLE_KINDS = new Set(["word", "excel", "powerpoint"]);

async function getVersionHistory(fileId: string): Promise<FileWithUploader[]> {
  const history: FileWithUploader[] = [];
  let currentId: string | null = fileId;

  while (currentId) {
    const file: FileWithUploader | null = await prisma.file.findUnique({
      where: { id: currentId },
      include: { uploadedBy: true },
    });
    if (!file) break;
    history.push(file);
    currentId = file.previousVersionId;
  }

  return history;
}

export async function FileRow({
  file,
  canDownload,
  docEditorProvider,
}: {
  file: FileWithUploader;
  canDownload: boolean;
  docEditorProvider: string | null;
}) {
  const history = file.version > 1 ? await getVersionHistory(file.id) : [file];
  const canOpenInEditor = docEditorProvider !== null && OPENABLE_KINDS.has(file.fileType);

  return (
    <li className="px-4 py-1.5 text-sm">
      <div className="flex items-center justify-between">
        <span>
          {file.filename}
          {file.version > 1 && <span className="ml-2 text-xs text-slate-400">v{file.version}</span>}
        </span>
        <span className="flex items-center gap-3 text-xs text-slate-400">
          {file.fileType} · {(file.sizeBytes / 1024).toFixed(0)} KB · {file.uploadedBy.name} ·{" "}
          {file.uploadedAt.toLocaleDateString()}
          {canOpenInEditor && <OpenInEditorButton fileId={file.id} provider={docEditorProvider} />}
          {canDownload && (
            <a href={`/api/files/${file.id}/download`} className="underline">
              download
            </a>
          )}
        </span>
      </div>

      {history.length > 1 && (
        <details className="mt-1">
          <summary className="cursor-pointer text-xs text-slate-400">
            {history.length} versions — view history
          </summary>
          <ul className="mt-1 space-y-1 border-l border-slate-200 pl-3">
            {history.map((v) => (
              <li key={v.id} className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  v{v.version} · {v.uploadedBy.name} · {v.uploadedAt.toLocaleString()}
                </span>
                {canDownload && (
                  <a href={`/api/files/${v.id}/download`} className="underline">
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
