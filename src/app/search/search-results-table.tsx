"use client";

import Link from "next/link";
import { DataTable, Badge, type DataTableColumn } from "@/components/ui";
import { Icon } from "@/components/icon";
import { useSnackbar } from "@/components/ui/snackbar";

export type SearchResultRow = {
  id: string;
  name: string;
  archiveNumber: string;
  category: string;
  donor: string;
  status: string;
  createdAt: string;
};

const STATUS_TONE: Record<string, "success" | "warning" | "neutral"> = {
  Archived: "success",
  "Pending Review": "warning",
  Draft: "neutral",
};

const COLUMNS: DataTableColumn<SearchResultRow>[] = [
  {
    key: "name",
    label: "Archive",
    render: (row) => (
      <Link href={`/archives/${row.id}`} className="flex items-center gap-2 text-on-surface hover:text-primary hover:underline">
        <Icon name="folder_open" size={18} className="shrink-0 text-on-surface-variant" />
        <span className="truncate">{row.name}</span>
      </Link>
    ),
  },
  { key: "archiveNumber", label: "Archive #" },
  { key: "category", label: "Category" },
  { key: "donor", label: "Donor" },
  {
    key: "status",
    label: "Status",
    render: (row) => <Badge tone={STATUS_TONE[row.status] ?? "neutral"}>{row.status}</Badge>,
  },
  { key: "createdAt", label: "Created" },
];

export function SearchResultsTable({ rows, exportQuery }: { rows: SearchResultRow[]; exportQuery: string }) {
  const { showSnackbar } = useSnackbar();

  async function handleExport(format: "excel" | "pdf") {
    const res = await fetch(`/search/export?format=${format}&${exportQuery}`, { method: "POST" });
    if (!res.ok) {
      showSnackbar("Export failed.");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = format === "excel" ? "search-results.xlsx" : "search-results.pdf";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DataTable
      rows={rows}
      columns={COLUMNS}
      getRowKey={(row) => row.id}
      emptyMessage="No matching archives."
      storageKey="search-results-table"
      onExport={handleExport}
    />
  );
}
