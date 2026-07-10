"use client";

import { useCallback, useMemo, useState } from "react";

// Browser-style back/forward history over folder navigation. `null` means
// "at the archive root." Jumping to a new folder (via the sidebar,
// breadcrumb, or opening a tile) truncates any forward entries past the
// current position, same as clicking a link after going back in a real
// browser — the abandoned forward branch isn't kept around.
export function useFolderNavigation() {
  const [history, setHistory] = useState<(string | null)[]>([null]);
  const [index, setIndex] = useState(0);

  const currentFolderId = history[index];

  const navigate = useCallback(
    (folderId: string | null) => {
      setHistory((prev) => {
        if (prev[index] === folderId) return prev; // no-op: already there
        const truncated = prev.slice(0, index + 1);
        return [...truncated, folderId];
      });
      setIndex((prev) => prev + 1);
    },
    [index]
  );

  const back = useCallback(() => {
    setIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const forward = useCallback(() => {
    setIndex((prev) => Math.min(prev + 1, history.length - 1));
  }, [history.length]);

  const canGoBack = index > 0;
  const canGoForward = index < history.length - 1;

  return useMemo(
    () => ({ currentFolderId, navigate, back, forward, canGoBack, canGoForward }),
    [currentFolderId, navigate, back, forward, canGoBack, canGoForward]
  );
}
