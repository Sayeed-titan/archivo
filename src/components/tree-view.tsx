"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui";
import { cn } from "@/lib/cn";
import { TriStateCheckbox } from "@/components/tri-state-checkbox";
import { useTreeSelection, useGroupCheckState } from "@/components/tree-view-selection";

// Two-level tree: Archive (root) -> Folders -> Files. Deliberately not a
// generic n-depth tree component — Folder has no parentFolderId in the
// schema, so this models exactly the shape the data actually has.
// Defaults to fully expanded so it's additive over the previous
// always-open flat folder list, not a visibility regression.
//
// Selection (for bulk download) is optional per tree: pass allFileIds to
// TreeRoot to show a "select all" checkbox, and fileIds to each
// TreeFolderNode for its own select-all. Omit both to render a
// selection-free tree (e.g. read-only contexts).

export function TreeRoot({
  label,
  icon = "folder_open",
  allFileIds,
  children,
}: {
  label: string;
  icon?: string;
  /** Every file id under this tree — enables an archive-level "select all" checkbox. */
  allFileIds?: string[];
  children: ReactNode;
}) {
  const selectable = allFileIds !== undefined;

  return (
    <div className="rounded-md border border-outline-variant bg-surface">
      <div className="flex items-center gap-2 border-b border-outline-variant/60 bg-surface-container-low px-4 py-2.5 type-title-medium text-on-surface">
        {selectable && <ArchiveCheckbox fileIds={allFileIds} label={label} />}
        <Icon name={icon} size={20} className="text-primary" />
        {label}
      </div>
      <div className="p-2">{children}</div>
    </div>
  );
}

function ArchiveCheckbox({ fileIds, label }: { fileIds: string[]; label: string }) {
  const { toggleMany } = useTreeSelection();
  const { checked, indeterminate } = useGroupCheckState(fileIds);
  return (
    <TriStateCheckbox
      checked={checked}
      indeterminate={indeterminate}
      onChange={(next) => toggleMany(fileIds, next)}
      label={`Select all files in ${label}`}
    />
  );
}

export function TreeFolderNode({
  id,
  name,
  isMandatory,
  fileCount,
  fileIds,
  defaultExpanded = true,
  headerActions,
  children,
}: {
  id: string;
  name: string;
  isMandatory: boolean;
  fileCount: number;
  /** File ids directly in this folder — enables a folder-level "select all" checkbox. */
  fileIds?: string[];
  defaultExpanded?: boolean;
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const isEmpty = fileCount === 0;
  const selectable = fileIds !== undefined && fileIds.length > 0;

  return (
    <div className="mb-1.5 rounded-sm border border-outline-variant/60 last:mb-0">
      <div className="flex w-full items-center gap-2 rounded-t-sm px-3 py-2 hover:bg-on-surface-8">
        {selectable && <FolderCheckbox fileIds={fileIds} label={name} />}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls={`tree-folder-${id}`}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <Icon
            name="chevron_right"
            size={18}
            className={cn("shrink-0 text-on-surface-variant transition-transform", expanded && "rotate-90")}
          />
          <Icon
            name={isEmpty ? "folder_open" : "folder"}
            size={18}
            className={cn("shrink-0", isMandatory && isEmpty ? "text-warning" : "text-on-surface-variant")}
          />
          <span className="min-w-0 flex-1 truncate type-title-small text-on-surface">{name}</span>
          {isMandatory && (
            <Badge tone="warning" pill={false}>
              required
            </Badge>
          )}
          <span className="shrink-0 type-body-small text-on-surface-variant">
            {fileCount} {fileCount === 1 ? "file" : "files"}
          </span>
        </button>
      </div>
      {expanded && (
        <div id={`tree-folder-${id}`}>
          {children}
          {headerActions && <div className="border-t border-outline-variant/50 p-2">{headerActions}</div>}
        </div>
      )}
    </div>
  );
}

function FolderCheckbox({ fileIds, label }: { fileIds: string[]; label: string }) {
  const { toggleMany } = useTreeSelection();
  const { checked, indeterminate } = useGroupCheckState(fileIds);
  return (
    <TriStateCheckbox
      checked={checked}
      indeterminate={indeterminate}
      onChange={(next) => toggleMany(fileIds, next)}
      label={`Select all files in ${label}`}
    />
  );
}

export function TreeFileCheckbox({ fileId, filename }: { fileId: string; filename: string }) {
  const { selectedFileIds, toggleFile } = useTreeSelection();
  return (
    <TriStateCheckbox
      checked={selectedFileIds.has(fileId)}
      indeterminate={false}
      onChange={() => toggleFile(fileId)}
      label={`Select ${filename}`}
    />
  );
}
