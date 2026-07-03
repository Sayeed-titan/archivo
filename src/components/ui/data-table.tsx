"use client";

import { Table, TableHead, Th, Td, TableRow, TableEmptyState } from "./table";
import { Menu, MenuItem } from "./menu";
import { IconButton } from "./icon-button";
import { DataTablePager } from "./data-table-pager";
import { DataTableColumnPicker } from "./data-table-column-picker";
import { useDataTable, type DataTableColumn } from "@/hooks/use-data-table";

// Paginated, column-configurable table built on top of the existing
// Table/TableHead/Th/Td/TableRow/TableEmptyState primitives — those stay
// untouched for pages that don't need this. Pagination is client-side
// over the full `rows` array passed in (see use-data-table.ts for why).
//
// Export is intentionally NOT built into this component: exporting must
// run server-side (buildExcelReport/buildPdfReport are server-only), and
// each page's underlying query differs, so each consuming page wires its
// own small export route and passes an `onExport` handler here instead
// of this component trying to be a single generic "export anything" path.

export function DataTable<TRow>({
  rows,
  columns,
  emptyMessage,
  storageKey,
  initialPageSize,
  getRowKey,
  onExport,
}: {
  rows: TRow[];
  columns: DataTableColumn<TRow>[];
  emptyMessage: string;
  storageKey?: string;
  initialPageSize?: number;
  getRowKey: (row: TRow) => string;
  onExport?: (format: "excel" | "pdf", visibleColumns: DataTableColumn<TRow>[]) => void;
}) {
  const table = useDataTable({ rows, columns, initialPageSize, storageKey });
  const { visibleColumns, pageRows } = table;

  return (
    <div className="overflow-hidden rounded-md border border-outline-variant bg-surface">
      <div className="no-print flex items-center justify-end gap-1 border-b border-outline-variant px-2 py-1.5">
        {onExport && (
          <Menu
            trigger={({ toggle }) => <IconButton icon="download" label="Export" variant="standard" onClick={toggle} />}
          >
            <MenuItem icon="table_chart" onClick={() => onExport("excel", visibleColumns)}>
              Export Excel
            </MenuItem>
            <MenuItem icon="picture_as_pdf" onClick={() => onExport("pdf", visibleColumns)}>
              Export PDF
            </MenuItem>
          </Menu>
        )}
        <DataTableColumnPicker
          columns={columns}
          columnOrder={table.columnOrder}
          hiddenKeys={table.hiddenKeys}
          onOrderChange={table.setColumnOrder}
          onToggle={table.toggleColumn}
          dndContextId={storageKey ? `${storageKey}-columns` : undefined}
        />
      </div>

      <Table>
        <TableHead>
          {visibleColumns.map((col) => (
            <Th key={col.key}>{col.label}</Th>
          ))}
        </TableHead>
        <tbody>
          {pageRows.map((row) => (
            <TableRow key={getRowKey(row)}>
              {visibleColumns.map((col) => (
                <Td key={col.key}>
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "—")}
                </Td>
              ))}
            </TableRow>
          ))}
          {pageRows.length === 0 && <TableEmptyState colSpan={visibleColumns.length || 1} message={emptyMessage} />}
        </tbody>
      </Table>

      <div className="no-print">
        <DataTablePager table={table} />
      </div>
    </div>
  );
}
