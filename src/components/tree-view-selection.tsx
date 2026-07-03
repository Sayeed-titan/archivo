"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

// Selection state for bulk download: a flat Set of selected file ids is
// the source of truth (folders/archive don't have their own storage —
// their checked/indeterminate state is derived by looking at which of
// their descendant file ids are in the set). Provided once at the tree
// root so the archive-level "select all" checkbox and the bulk-selection
// action bar (which needs the full picture, not just one folder's files)
// can all read/write the same state.

type TreeSelectionContextValue = {
  selectedFileIds: Set<string>;
  toggleFile: (fileId: string) => void;
  toggleMany: (fileIds: string[], select: boolean) => void;
  clear: () => void;
};

const TreeSelectionContext = createContext<TreeSelectionContextValue | null>(null);

export function useTreeSelection() {
  const ctx = useContext(TreeSelectionContext);
  if (!ctx) throw new Error("useTreeSelection must be used inside <TreeSelectionProvider>");
  return ctx;
}

export function TreeSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  const toggleFile = useCallback((fileId: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  }, []);

  const toggleMany = useCallback((fileIds: string[], select: boolean) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      for (const id of fileIds) {
        if (select) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelectedFileIds(new Set()), []);

  const value = useMemo(() => ({ selectedFileIds, toggleFile, toggleMany, clear }), [selectedFileIds, toggleFile, toggleMany, clear]);

  return <TreeSelectionContext.Provider value={value}>{children}</TreeSelectionContext.Provider>;
}

/** Derives checked/indeterminate for a group of file ids from the shared selection set. */
export function useGroupCheckState(fileIds: string[]): { checked: boolean; indeterminate: boolean } {
  const { selectedFileIds } = useTreeSelection();
  if (fileIds.length === 0) return { checked: false, indeterminate: false };
  const selectedCount = fileIds.filter((id) => selectedFileIds.has(id)).length;
  return {
    checked: selectedCount === fileIds.length,
    indeterminate: selectedCount > 0 && selectedCount < fileIds.length,
  };
}
