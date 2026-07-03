"use client";

import { useEffect, useMemo, useState } from "react";

// Client-side pagination + column visibility/order over an already-
// fetched result set. Matches current data volumes across the app
// (audit-log take:100, reports up to 1000 rows) — true server-side
// LIMIT/OFFSET pagination is a bigger contract change and isn't needed
// at this scale. Revisit if an organization's row counts grow much
// larger than that.

export type DataTableColumn<TRow> = {
  key: string;
  label: string;
  /** Cell renderer; defaults to String(row[key]) if omitted. */
  render?: (row: TRow) => React.ReactNode;
  /** Plain-text value used for Excel/PDF export (falls back to render's text via toExportValue). */
  toExportValue?: (row: TRow) => string | number | null;
  defaultHidden?: boolean;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export function useDataTable<TRow>({
  rows,
  columns,
  initialPageSize = 25,
  storageKey,
}: {
  rows: TRow[];
  columns: DataTableColumn<TRow>[];
  initialPageSize?: number;
  /** When set, column order/visibility persists in localStorage across visits. */
  storageKey?: string;
}) {
  const allKeys = useMemo(() => columns.map((c) => c.key), [columns]);

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (storageKey && typeof window !== "undefined") {
      const saved = window.localStorage.getItem(`${storageKey}:order`);
      if (saved) {
        const parsed: string[] = JSON.parse(saved);
        // Guard against a stale saved order missing/adding columns since
        // the page's column set can change between app versions.
        if (parsed.every((k) => allKeys.includes(k)) && parsed.length === allKeys.length) return parsed;
      }
    }
    return allKeys;
  });

  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(() => {
    if (storageKey && typeof window !== "undefined") {
      const saved = window.localStorage.getItem(`${storageKey}:hidden`);
      if (saved) return new Set(JSON.parse(saved) as string[]);
    }
    return new Set(columns.filter((c) => c.defaultHidden).map((c) => c.key));
  });

  useEffect(() => {
    if (!storageKey) return;
    window.localStorage.setItem(`${storageKey}:order`, JSON.stringify(columnOrder));
  }, [storageKey, columnOrder]);

  useEffect(() => {
    if (!storageKey) return;
    window.localStorage.setItem(`${storageKey}:hidden`, JSON.stringify([...hiddenKeys]));
  }, [storageKey, hiddenKeys]);

  const orderedColumns = useMemo(() => {
    const byKey = new Map(columns.map((c) => [c.key, c]));
    return columnOrder.map((k) => byKey.get(k)).filter((c): c is DataTableColumn<TRow> => c !== undefined);
  }, [columns, columnOrder]);

  const visibleColumns = useMemo(() => orderedColumns.filter((c) => !hiddenKeys.has(c.key)), [orderedColumns, hiddenKeys]);

  function toggleColumn(key: string) {
    setHiddenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const clampedPage = Math.min(page, pageCount);

  const pageRows = useMemo(() => {
    const start = (clampedPage - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, clampedPage, pageSize]);

  function setPageSize(size: number) {
    setPageSizeState(size);
    setPage(1);
  }

  function goToPage(target: number) {
    setPage(Math.min(Math.max(1, target), pageCount));
  }

  return {
    // pagination
    page: clampedPage,
    pageCount,
    pageSize,
    pageSizeOptions: PAGE_SIZE_OPTIONS,
    setPageSize,
    goToPage,
    nextPage: () => goToPage(clampedPage + 1),
    prevPage: () => goToPage(clampedPage - 1),
    pageRows,
    totalRows: rows.length,
    // columns
    orderedColumns,
    visibleColumns,
    columnOrder,
    setColumnOrder,
    hiddenKeys,
    toggleColumn,
  };
}

export type UseDataTableResult<TRow> = ReturnType<typeof useDataTable<TRow>>;
