"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui";
import { ViewToggle, type ExplorerView } from "./view-toggle";
import { FolderTile } from "./folder-tile";
import { FileTile } from "./file-tile";
import { FolderUpload } from "@/app/archives/[id]/folder-upload";
import { FileRow } from "@/app/archives/[id]/file-row";
import { TreeSelectionProvider, useTreeSelection, useGroupCheckState } from "@/components/tree-view-selection";
import { TriStateCheckbox } from "@/components/tri-state-checkbox";
import { BulkSelectionBar } from "@/components/bulk-selection-bar";
import type { ExplorerFolder } from "./types";

const VIEW_STORAGE_KEY = "archivo:explorer-view";

function readStoredView(): ExplorerView {
  if (typeof window === "undefined") return "grid";
  const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
  return stored === "grid" || stored === "list" || stored === "details" ? stored : "grid";
}

export function FileExplorer({
  archiveId,
  archiveName,
  folders,
  canDownload,
  canEditMetadata,
  canManageAccess,
  docEditorProvider,
}: {
  archiveId: string;
  archiveName: string;
  folders: ExplorerFolder[];
  canDownload: boolean;
  canEditMetadata: boolean;
  canManageAccess: boolean;
  docEditorProvider: string | null;
}) {
  // Lazy initializer (not an effect) reads localStorage once on mount —
  // same pattern as use-data-table.ts's column persistence. This does
  // cause a client-only render to briefly diverge from the server's
  // default "grid" on first paint if a user has a saved non-grid
  // preference, but that's an acceptable tradeoff for a pure display
  // preference (unlike the DndContext id / command-palette hint cases in
  // CLAUDE.md, there's no server-rendered content here that could mismatch
  // and trigger a hydration error — this whole tree only ever renders
  // client-side content for the explorer body).
  const [view, setView] = useState<ExplorerView>(readStoredView);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  }, [view]);

  const visibleFolders = folders.filter((f) => f.canView);
  const openFolder = visibleFolders.find((f) => f.id === openFolderId) ?? null;

  const allFileIds = visibleFolders.flatMap((f) => f.files.filter((file) => !file.isExternalLink).map((file) => file.id));

  return (
    <TreeSelectionProvider>
      <div className="rounded-md border border-outline-variant bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/60 bg-surface-container-low px-4 py-2.5">
          <nav className="flex min-w-0 flex-1 items-center gap-1.5 type-title-medium text-on-surface">
            <button
              type="button"
              onClick={() => setOpenFolderId(null)}
              className={
                openFolder
                  ? "flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface"
                  : "flex items-center gap-1.5"
              }
            >
              <Icon name="folder_open" size={20} className={openFolder ? "text-on-surface-variant" : "text-primary"} />
              <span className="truncate">{archiveName}</span>
            </button>
            {openFolder && (
              <>
                <Icon name="chevron_right" size={18} className="shrink-0 text-on-surface-variant" />
                <span className="truncate">{openFolder.name}</span>
              </>
            )}
          </nav>
          <ViewToggle view={view} onChange={setView} />
        </div>

        <div className="p-3">
          {!openFolder ? (
            visibleFolders.length === 0 ? (
              <p className="p-4 type-body-medium text-on-surface-variant">No folders visible to you in this archive.</p>
            ) : view === "grid" ? (
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {visibleFolders.map((folder) => (
                  <FolderTile
                    key={folder.id}
                    folder={folder}
                    view="grid"
                    canEditMetadata={canEditMetadata}
                    canManageAccess={canManageAccess}
                    archiveId={archiveId}
                    onOpen={() => setOpenFolderId(folder.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/50">
                {visibleFolders.map((folder) => (
                  <FolderTile
                    key={folder.id}
                    folder={folder}
                    view={view}
                    canEditMetadata={canEditMetadata}
                    canManageAccess={canManageAccess}
                    archiveId={archiveId}
                    onOpen={() => setOpenFolderId(folder.id)}
                  />
                ))}
              </div>
            )
          ) : (
            <FolderContents
              folder={openFolder}
              archiveId={archiveId}
              view={view}
              canUpload={openFolder.canUpload}
              canDownload={canDownload}
              canEditMetadata={canEditMetadata}
              docEditorProvider={docEditorProvider}
            />
          )}
        </div>
      </div>
      {canDownload && allFileIds.length > 0 && <BulkSelectionBar />}
    </TreeSelectionProvider>
  );
}

function FolderContents({
  folder,
  archiveId,
  view,
  canUpload,
  canDownload,
  canEditMetadata,
  docEditorProvider,
}: {
  folder: ExplorerFolder;
  archiveId: string;
  view: ExplorerView;
  canUpload: boolean;
  canDownload: boolean;
  canEditMetadata: boolean;
  docEditorProvider: string | null;
}) {
  const isEmpty = folder.files.length === 0;
  const selectableFileIds = folder.files.filter((f) => !f.isExternalLink).map((f) => f.id);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {canDownload && selectableFileIds.length > 0 && <SelectAllInFolder fileIds={selectableFileIds} folderName={folder.name} />}
        {folder.isMandatory && (
          <Badge tone="warning" pill={false}>
            required folder
          </Badge>
        )}
      </div>

      {isEmpty ? (
        <p className="type-body-medium text-on-surface-variant">No files in this folder yet.</p>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {folder.files.map((file) => (
            <FileTile
              key={file.id}
              file={file}
              canDownload={canDownload}
              canRename={canEditMetadata || canUpload}
              docEditorProvider={docEditorProvider}
            />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-outline-variant/50 rounded-sm border border-outline-variant/60">
          {folder.files.map((file) => (
            <FileRow key={file.id} file={file} history={file.history} canDownload={canDownload} docEditorProvider={docEditorProvider} />
          ))}
        </ul>
      )}

      {canUpload && <FolderUpload archiveId={archiveId} folderId={folder.id} rules={folder.rules} />}
    </div>
  );
}

function SelectAllInFolder({ fileIds, folderName }: { fileIds: string[]; folderName: string }) {
  const { toggleMany } = useTreeSelection();
  const { checked, indeterminate } = useGroupCheckState(fileIds);

  return (
    <label className="flex items-center gap-1.5 type-body-small text-on-surface-variant">
      <TriStateCheckbox
        checked={checked}
        indeterminate={indeterminate}
        onChange={(next) => toggleMany(fileIds, next)}
        label={`Select all files in ${folderName}`}
      />
      Select all
    </label>
  );
}
