"use client";

import { useTreeSelection } from "@/components/tree-view-selection";
import { TriStateCheckbox } from "@/components/tri-state-checkbox";

// Per-file selection checkbox for bulk download — used inside FileRow.
// The archive/folder-level tree navigation this used to live alongside
// (TreeRoot/TreeFolderNode) was replaced by the file-explorer components
// under src/components/explorer/ (point 8's file-explorer UX); this piece
// survives because bulk-select is still driven by the same flat
// TreeSelectionProvider context regardless of how folders are navigated.
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
