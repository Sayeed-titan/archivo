"use client";

import { useState } from "react";
import { IconButton, Combobox } from "@/components/ui";
import type { UseDataTableResult } from "@/hooks/use-data-table";

export function DataTablePager<TRow>({ table }: { table: UseDataTableResult<TRow> }) {
  const { page, pageCount, pageSize, pageSizeOptions, setPageSize, goToPage, nextPage, prevPage, totalRows } = table;
  const [jumpValue, setJumpValue] = useState("");

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant px-3 py-2">
      <div className="flex items-center gap-2 type-body-small text-on-surface-variant">
        <span>Rows per page</span>
        <Combobox
          compact
          clearable={false}
          className="w-20"
          value={String(pageSize)}
          onValueChange={(v) => setPageSize(Number(v))}
          options={pageSizeOptions.map((n) => ({ value: String(n), label: String(n) }))}
        />
        <span>· {totalRows} total</span>
      </div>

      <div className="flex items-center gap-1">
        <IconButton icon="first_page" label="First page" variant="standard" disabled={page <= 1} onClick={() => goToPage(1)} />
        <IconButton icon="chevron_left" label="Previous page" variant="standard" disabled={page <= 1} onClick={prevPage} />
        <span className="px-2 type-body-medium text-on-surface">
          Page {page} of {pageCount}
        </span>
        <IconButton icon="chevron_right" label="Next page" variant="standard" disabled={page >= pageCount} onClick={nextPage} />
        <IconButton icon="last_page" label="Last page" variant="standard" disabled={page >= pageCount} onClick={() => goToPage(pageCount)} />

        <form
          className="ml-2 flex items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            const n = Number(jumpValue);
            if (Number.isFinite(n) && n > 0) goToPage(n);
            setJumpValue("");
          }}
        >
          <input
            type="number"
            min={1}
            max={pageCount}
            placeholder="Go to…"
            value={jumpValue}
            onChange={(e) => setJumpValue(e.target.value)}
            className="w-20 rounded-xs border border-outline bg-surface px-2 py-1 type-body-medium text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </form>
      </div>
    </div>
  );
}
