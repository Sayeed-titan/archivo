"use client";

import { DataTable, type DataTableColumn } from "@/components/ui";

export type ReportRunRow = Record<string, string | number | null> & { __rowId: string };

export function ReportRunTable({
  rows,
  fields,
  fieldLabels,
  storageKey,
}: {
  rows: ReportRunRow[];
  fields: string[];
  fieldLabels: Record<string, string>;
  storageKey: string;
}) {
  const columns: DataTableColumn<ReportRunRow>[] = fields.map((key) => ({
    key,
    label: fieldLabels[key] ?? key,
    render: (row) => (row[key] === null || row[key] === undefined ? "—" : String(row[key])),
  }));

  return (
    <DataTable
      rows={rows}
      columns={columns}
      getRowKey={(row) => row.__rowId}
      emptyMessage="No matching archives."
      storageKey={storageKey}
    />
  );
}
